import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==========================================
// 1. CACHING UTILITY (Firestore-based)
// ==========================================
async function getCachedOrFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days
): Promise<T> {
  const cacheRef = doc(db, "cache", cacheKey);
  const cacheSnap = await getDoc(cacheRef);
  const now = Date.now();

  if (cacheSnap.exists()) {
    const data = cacheSnap.data();
    if (now - data.timestamp < ttlSeconds * 1000) {
      console.log(`[CACHE] Hit for ${cacheKey}`);
      return data.value as T;
    }
  }

  console.log(`[CACHE] Miss for ${cacheKey}, fetching fresh data`);
  const value = await fetchFn();
  await setDoc(cacheRef, { value, timestamp: now });
  return value;
}

// ==========================================
// 2. DEEP GITHUB AGGREGATOR (GraphQL)
// ==========================================
async function fetchDeepGitHubData(username: string) {
  console.log(`[GITHUB] Fetching deep profile for: ${username}`);

  const query = `
    query($login: String!) {
      user(login: $login) {
        bio
        company
        location
        email
        websiteUrl
        twitterUsername
        createdAt
        followers { totalCount }
        following { totalCount }
        repositories(first: 50, orderBy: {field: PUSHED_AT, direction: DESC}) {
          nodes {
            name
            description
            createdAt
            pushedAt
            isFork
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node { name }
              }
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 100) {
                    nodes {
                      committedDate
                      message
                      additions
                      deletions
                    }
                  }
                }
              }
            }
            issues { totalCount }
            pullRequests { totalCount }
          }
        }
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { login: username } }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub GraphQL error: ${response.status} ${error}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    const user = json.data.user;
    if (!user) return null;

    // Process repositories
    const repos = user.repositories.nodes.filter((r: any) => !r.isFork);
    const languageMap: Record<string, number> = {};
    let totalCodeBytes = 0;
    const detailedRepos = repos.map((repo: any) => {
      const languages = repo.languages.edges.map((edge: any) => ({
        name: edge.node.name,
        bytes: edge.size,
      }));
      languages.forEach((lang: any) => {
        languageMap[lang.name] = (languageMap[lang.name] || 0) + lang.bytes;
        totalCodeBytes += lang.bytes;
      });

      // Get commits from history
      const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
      const commitMessages = commits.map((c: any) => c.message);

      return {
        name: repo.name,
        description: repo.description,
        createdAt: repo.createdAt,
        pushedAt: repo.pushedAt,
        languages,
        commitCount: commits.length,
        commitMessages: commitMessages.slice(0, 20), // keep only recent 20 for brevity
        hasTests: commitMessages.some((msg: string) =>
          /test|spec|jest|mocha|cypress/i.test(msg)
        ),
        hasReadme: true, // we can't easily check from GraphQL; assume true if repo has description maybe
        issues: repo.issues.totalCount,
        prs: repo.pullRequests.totalCount,
      };
    });

    // Contributions calendar
    const calendar = user.contributionsCollection.contributionCalendar;
    const contributionDays = calendar.weeks.flatMap((w: any) => w.contributionDays);
    const totalCommitsPastYear = calendar.totalContributions;
    const longestStreak = calculateLongestStreak(contributionDays);

    return {
      profile: {
        bio: user.bio,
        company: user.company,
        location: user.location,
        email: user.email,
        website: user.websiteUrl,
        twitter: user.twitterUsername,
        createdAt: user.createdAt,
        followers: user.followers.totalCount,
        following: user.following.totalCount,
      },
      repos: detailedRepos,
      languageBreakdown: languageMap,
      totalCodeBytes,
      contributions: {
        totalCommitsPastYear,
        longestStreak,
        contributionDays,
      },
    };
  } catch (error) {
    console.error(`[GITHUB] Error:`, error);
    return null;
  }
}

// Helper: calculate longest streak of consecutive days with contributions
function calculateLongestStreak(days: { contributionCount: number; date: string }[]): number {
  let maxStreak = 0;
  let currentStreak = 0;
  for (const day of days) {
    if (day.contributionCount > 0) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  return maxStreak;
}

// ==========================================
// 3. STRUCTURED RESUME EXTRACTION (via GPT)
// ==========================================
async function extractStructuredResume(pdfUrl: string) {
  console.log(`[RESUME] Extracting structured data from: ${pdfUrl}`);

  // First, get raw text (using existing function)
  const rawText = await extractResumeText(pdfUrl);

  if (rawText.startsWith("Candidate provided a website") || rawText.includes("Could not extract")) {
    return { raw: rawText, structured: null };
  }

  const prompt = `
Extract the following information from the resume text into a JSON object. Be thorough and accurate.

- fullName: string
- email: string
- phone: string
- location: string
- summary: string (brief professional summary if available)
- education: array of { institution: string, degree: string, field: string, startDate: string, endDate: string, gpa: number? }
- workExperience: array of { company: string, title: string, startDate: string, endDate: string, description: string, skillsUsed: string[] }
- projects: array of { name: string, description: string, technologies: string[], url: string? }
- skills: array of string (both technical and soft)
- certifications: array of string
- languages: array of { language: string, proficiency: string }
- urls: { github?: string, linkedin?: string, portfolio?: string }

If a field is not found, set it to null or empty array.

Resume text:
${rawText.slice(0, 6000)} // limit to avoid token overflow

Respond with JSON only.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a resume parser. Extract structured data." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const structured = JSON.parse(completion.choices[0].message.content || "{}");
    return { raw: rawText, structured };
  } catch (error) {
    console.error(`[RESUME] Structured extraction failed:`, error);
    return { raw: rawText, structured: null };
  }
}

// ==========================================
// 4. CROSS-VALIDATION ENGINE
// ==========================================
function crossValidate(
  resume: any,
  github: any,
  requiredSkills: string[]
) {
  const flags: string[] = [];
  const skillEvidence: Record<string, { found: boolean; source: string }> = {};

  // Initialize skillEvidence for required skills
  requiredSkills.forEach(skill => {
    skillEvidence[skill] = { found: false, source: "" };
  });

  // Check resume skills
  if (resume?.structured?.skills) {
    const resumeSkills = resume.structured.skills.map((s: string) => s.toLowerCase());
    requiredSkills.forEach(skill => {
      if (resumeSkills.includes(skill.toLowerCase())) {
        skillEvidence[skill].found = true;
        skillEvidence[skill].source = "resume";
      }
    });
  }

  // Check GitHub languages + repo descriptions/topics
  if (github) {
    const githubLanguages = Object.keys(github.languageBreakdown || {}).map(l => l.toLowerCase());
    const githubRepos = github.repos || [];

    requiredSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();

      // Match against language breakdown
      if (githubLanguages.includes(skillLower)) {
        skillEvidence[skill].found = true;
        skillEvidence[skill].source = "github_languages";
      }

      // Also search repo names/descriptions for skill mentions (e.g., "react" in description)
      const mentionsInRepos = githubRepos.some((repo: any) =>
        (repo.name.toLowerCase().includes(skillLower) ||
          repo.description?.toLowerCase().includes(skillLower))
      );
      if (mentionsInRepos && !skillEvidence[skill].found) {
        skillEvidence[skill].found = true;
        skillEvidence[skill].source = "github_mentions";
      }
    });
  }

  // Generate flags for missing skills
  requiredSkills.forEach(skill => {
    if (!skillEvidence[skill].found) {
      flags.push(`No evidence of "${skill}" in resume or GitHub`);
    } else if (skillEvidence[skill].source === "resume" && github && !githubLanguages.includes(skill.toLowerCase())) {
      flags.push(`"${skill}" claimed in resume but not visible in GitHub languages`);
    }
  });

  // Experience vs commit history
  if (resume?.structured?.workExperience && github?.contributions) {
    const earliestCommitYear = github.profile?.createdAt
      ? new Date(github.profile.createdAt).getFullYear()
      : null;
    const totalExpYears = resume.structured.workExperience.reduce((acc: number, exp: any) => {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate).getFullYear();
        const end = exp.endDate === "Present" ? new Date().getFullYear() : new Date(exp.endDate).getFullYear();
        return acc + (end - start);
      }
      return acc;
    }, 0);

    if (earliestCommitYear && totalExpYears > 0) {
      const githubYears = new Date().getFullYear() - earliestCommitYear;
      if (totalExpYears > githubYears + 2) {
        flags.push(`Resume claims ${totalExpYears} years of experience, but GitHub activity spans only ${githubYears} years`);
      }
    }
  }

  // Check for potential cloned/tutorial repos
  if (github?.repos) {
    github.repos.forEach((repo: any) => {
      if (repo.commitCount === 1) {
        flags.push(`Repo "${repo.name}" has only one commit – likely a template or tutorial`);
      }
      const messages = repo.commitMessages.join(" ").toLowerCase();
      if (messages.includes("tutorial") || messages.includes("starter") || messages.includes("boilerplate")) {
        flags.push(`Repo "${repo.name}" commit messages suggest tutorial content`);
      }
    });
  }

  return { flags, skillEvidence };
}

// ==========================================
// 5. LEARNING VELOCITY CALCULATION
// ==========================================
function calculateLearningVelocity(github: any): "High" | "Average" | "Low" {
  if (!github || !github.repos || github.repos.length < 2) return "Average";

  const repos = github.repos.sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Simple metric: increase in language diversity over time
  let languageProgression = 0;
  let previousLanguages = new Set<string>();
  for (const repo of repos) {
    const currentLanguages = new Set(repo.languages.map((l: any) => l.name));
    // Count new languages not seen before
    const newLanguages = [...currentLanguages].filter(l => !previousLanguages.has(l)).length;
    languageProgression += newLanguages;
    previousLanguages = new Set([...previousLanguages, ...currentLanguages]);
  }

  // Another metric: commit frequency over time
  const commitActivity = repos.flatMap((r: any) => r.commitMessages.length);
  const commitTrend = commitActivity.length > 1 ? commitActivity[commitActivity.length - 1] / commitActivity[0] : 1;

  // Combine
  const score = languageProgression * 0.5 + commitTrend * 50;
  if (score > 30) return "High";
  if (score > 10) return "Average";
  return "Low";
}

// ==========================================
// 6. ENHANCED AI PROMPT
// ==========================================
const SYSTEM_PROMPT = `
You are a forensic technical investigator. Your task is to analyze a candidate's resume and GitHub data against a job description.

You must produce a JSON with the following fields:
- executive_summary: 3-sentence summary of candidate's fit and red flags.
- skill_verification: an object where each required skill (from job) is evaluated: {skill: string, found_in_resume: boolean, found_in_github: boolean, evidence: string}
- experience_validation: evaluate if claimed experience is backed by GitHub activity. Provide a score 0-100.
- learning_velocity: "High" | "Average" | "Low" (based on provided pre-calculated value).
- code_quality_indicators: { hasTests: boolean, commitMessageQuality: "Good" | "Average" | "Poor", repoOrganization: "Good" | "Average" | "Poor" }
- collaboration_score: 0-100 based on issues, PRs, forks, stars.
- authenticity_score: 0-100 (penalize for plagiarism flags and inconsistencies).
- overall_match_score: 0-100.
- skill_graph: { frontend: 0-100, backend: 0-100, database: 0-100, devops: 0-100, architecture: 0-100 }
- is_hidden_gem: boolean (true if proof of work > 85 and academics < 50).
- audit_trail: array of key observations.

Chain of thought instructions:
1. First, list each resume claim (skills, experiences, projects).
2. Then, search GitHub for evidence supporting each claim.
3. Note any claims without evidence.
4. Then, evaluate GitHub independently: what skills are actually demonstrated through code?
5. Compare the two profiles and synthesize.
`;

// ==========================================
// 7. MAIN HANDLER
// ==========================================
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { applicationId } = await req.json();
    console.log(`\n===========================================`);
    console.log(`[PROCESS START] Analyzing Application: ${applicationId}`);

    // Fetch application and job data
    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) throw new Error("Application not found");
    const appData = appSnap.data() as any;

    const jobRef = doc(db, "jobs", appData.jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");
    const jobData = jobSnap.data() as any;

    console.log(`[DB] Job: ${jobData.title} | Required: ${jobData.requiredSkills.join(", ")}`);

    // Fetch data with caching
    const [githubData, resumeData] = await Promise.all([
      getCachedOrFetch(`github_${appData.githubUsername}`, () =>
        fetchDeepGitHubData(appData.githubUsername)
      ),
      getCachedOrFetch(`resume_${appData.resumeUrl}`, () =>
        extractStructuredResume(appData.resumeUrl)
      ),
    ]);

    // Cross-validation
    const validation = crossValidate(resumeData, githubData, jobData.requiredSkills);

    // Learning velocity
    const learningVelocity = calculateLearningVelocity(githubData);

    // Prepare data for AI
    const promptData = `
      --- JOB REQUIREMENTS ---
      SKILLS: ${jobData.requiredSkills.join(", ")}
      LEVEL: ${jobData.experienceLevel}

      --- RESUME STRUCTURED DATA ---
      ${JSON.stringify(resumeData.structured, null, 2)}

      --- GITHUB DEEP DATA ---
      ${JSON.stringify(githubData, null, 2)}

      --- CROSS-VALIDATION FLAGS ---
      ${JSON.stringify(validation.flags, null, 2)}

      --- PRE-COMPUTED LEARNING VELOCITY ---
      ${learningVelocity}
    `;

    console.log(`[OPENAI] Sending enhanced payload...`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: promptData },
      ],
      temperature: 0.1,
    });

    const analysisResults = JSON.parse(completion.choices[0].message.content || "{}");

    // Merge our pre-computed values
    analysisResults.learningVelocity = learningVelocity;
    analysisResults.validationFlags = validation.flags;
    analysisResults.skillEvidence = validation.skillEvidence;

    console.log(`[ANALYSIS] Match Score: ${analysisResults.overall_match_score}`);
    console.log(`[ANALYSIS] Audit Trail:`, analysisResults.audit_trail);

    // Save to Firestore
    await updateDoc(appRef, {
      status: "analyzed",
      analysis: analysisResults,
      enrichedData: {
        github: githubData,
        resume: resumeData.structured,
        validation,
      },
      analyzedAt: new Date().toISOString(),
    });

    const endTime = Date.now();
    console.log(`[PROCESS END] Time: ${(endTime - startTime) / 1000}s`);
    console.log(`===========================================\n`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`[FATAL]`, error);
    return NextResponse.json(
      { error: "Analysis failed", details: error.message },
      { status: 500 }
    );
  }
}

// Keep existing extractResumeText function (unchanged)
async function extractResumeText(pdfUrl: string) {
  console.log(`[PDF] Processing URL: ${pdfUrl}`);
  
  let downloadUrl = pdfUrl;

  // 1. Auto-Convert Google Drive 'view' links to 'download' links
  if (downloadUrl.includes("drive.google.com/file/d/")) {
    const match = downloadUrl.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      console.log(`[PDF] Converted Google Drive link to direct download.`);
    }
  }
  
  // 2. Auto-Convert Dropbox links
  if (downloadUrl.includes("dropbox.com") && downloadUrl.includes("dl=0")) {
    downloadUrl = downloadUrl.replace("dl=0", "dl=1");
    console.log(`[PDF] Converted Dropbox link to direct download.`);
  }

  try {
    const response = await fetch(downloadUrl);
    const contentType = response.headers.get("content-type") || "";

    // 3. Safety Check: Did we still get a webpage?
    if (contentType.includes("text/html")) {
      console.warn(`[PDF] WARNING: URL returned a webpage (HTML), not a document. Link might be private or a portfolio website.`);
      return "Candidate provided a website or restricted link instead of a readable PDF. Evaluate based on GitHub only.";
    }

    const arrayBuffer = await response.arrayBuffer();
    
    console.log(`[PDF] Extracting text via unpdf...`);
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    
    if (!text || text.trim().length === 0) {
      console.warn(`[PDF] Extraction yielded empty text.`);
      return "No readable text found in PDF.";
    }

    const cleanedText = text.replace(/\s+/g, ' ').substring(0, 5000);
    console.log(`[PDF] Success. Extracted ${cleanedText.length} characters.`);
    return cleanedText;
  } catch (error) {
    console.error(`[PDF] Extraction FATAL error:`, error);
    return "Could not extract text due to document encryption, formatting, or broken link.";
  }
}
