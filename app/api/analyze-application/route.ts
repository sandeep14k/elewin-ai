import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import OpenAI from "openai";
import * as levenshtein from 'fast-levenshtein';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==========================================
// 1. CACHING UTILITY 
// ==========================================
async function getCachedOrFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 7 * 24 * 60 * 60 
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

  console.log(`[CACHE] Miss for ${cacheKey}, fetching fresh data...`);
  const value = await fetchFn();
  await setDoc(cacheRef, { value, timestamp: now });
  return value;
}

// ==========================================
// 2. DEEP GITHUB AGGREGATOR (GraphQL + REST fallback)
// ==========================================
async function fetchDeepGitHubData(username: string) {
  console.log(`\n--- [GITHUB FORENSIC SCRAPE INITIATED] ---`);
  console.log(`[GITHUB] Target Username: ${username}`);

  // Attempt GraphQL first
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
            url
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
                      author {
                        user { login }
                      }
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
      const errorText = await response.text();
      console.error(`[GITHUB GRAPHQL ERROR] ${response.status}: ${errorText.substring(0, 200)}...`);
      throw new Error(`GraphQL failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      console.error(`[GITHUB GRAPHQL ERRORS]`, json.errors);
      throw new Error('GraphQL returned errors');
    }

    const user = json.data.user;
    if (!user) return null;

    return processGitHubUser(user);
  } catch (graphqlError) {
    console.warn(`[GITHUB] GraphQL failed, falling back to REST API...`);
    return fetchGitHubRestEnhanced(username);
  }
}

// Enhanced REST fallback that fetches languages and commit authorship
async function fetchGitHubRestEnhanced(username: string) {
  try {
    // Fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    });
    if (!userRes.ok) {
      console.error(`[GITHUB REST] User fetch failed: ${userRes.status}`);
      return null;
    }
    const userData = await userRes.json();

    // Fetch repos (up to 50)
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=50&sort=pushed`,
      { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
    );
    if (!reposRes.ok) {
      console.error(`[GITHUB REST] Repos fetch failed: ${reposRes.status}`);
      return null;
    }
    const reposData = await reposRes.json();

    // For each repo, fetch languages and commit authorship in parallel
    const repoDetails = await Promise.all(
      reposData.map(async (repo: any) => {
        const [langRes, commitsRes] = await Promise.all([
          fetch(repo.languages_url, {
            headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` }
          }),
          fetch(
            `https://api.github.com/repos/${username}/${repo.name}/commits?author=${username}&per_page=10`,
            { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
          ).catch(() => null)
        ]);

        let languages: { name: string; bytes: number }[] = [];
        if (langRes && langRes.ok) {
          const langData = await langRes.json();
          languages = Object.entries(langData).map(([name, bytes]) => ({
            name,
            bytes: bytes as number,
          }));
        }

        let authoredByCandidate = false;
        let commitMessages: string[] = [];
        let commitCount = 0;

        // First try with author filter
        if (commitsRes && commitsRes.ok) {
          const commits = await commitsRes.json();
          authoredByCandidate = commits.length > 0;
          commitMessages = commits.map((c: any) => c.commit.message);
          commitCount = commits.length;
        } else {
          // Fallback: fetch commits without author filter and check manually
          const fallbackRes = await fetch(
            `https://api.github.com/repos/${username}/${repo.name}/commits?per_page=10`,
            { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
          );
          if (fallbackRes.ok) {
            const commits = await fallbackRes.json();
            authoredByCandidate = commits.some((c: any) => c.author?.login === username);
            commitMessages = commits.map((c: any) => c.commit.message);
            commitCount = commits.length;
          }
        }

        // Additional ownership check: if repo is under candidate's account and has any commits, consider it authored
        if (!authoredByCandidate && repo.owner?.login === username && commitCount > 0) {
          authoredByCandidate = true;
        }

        return {
          ...repo,
          languages,
          commitMessages,
          commitCount,
          authoredByCandidate,
        };
      })
    );

    // Build structure similar to GraphQL output
    const processed = processGitHubUser({
      bio: userData.bio,
      createdAt: userData.created_at,
      followers: { totalCount: userData.followers },
      repositories: {
        nodes: repoDetails.map((r: any) => ({
          name: r.name,
          description: r.description,
          createdAt: r.created_at,
          pushedAt: r.pushed_at,
          isFork: r.fork,
          url: r.html_url,
          languages: { edges: r.languages.map((l: any) => ({
            size: l.bytes,
            node: { name: l.name }
          })) },
          defaultBranchRef: {
            target: {
              history: {
                nodes: r.commitMessages.map((msg: string) => ({
                  message: msg,
                  author: { user: { login: r.authoredByCandidate ? username : null } }
                }))
              }
            }
          },
          issues: { totalCount: 0 },
          pullRequests: { totalCount: 0 }
        }))
      },
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: 0,
          weeks: []
        }
      }
    });

    return processed;
  } catch (error) {
    console.error(`[GITHUB REST ENHANCED ERROR]`, error);
    return null;
  }
}

function processGitHubUser(user: any) {
  const repos = user.repositories.nodes.filter((r: any) => !r.isFork);
  const languageMap: Record<string, number> = {};
  let totalCodeBytes = 0;
  
  const detailedRepos = repos.map((repo: any) => {
    const languages = repo.languages?.edges?.map((edge: any) => ({
      name: edge.node.name,
      bytes: edge.size,
    })) || [];
    
    languages.forEach((lang: any) => {
      languageMap[lang.name] = (languageMap[lang.name] || 0) + lang.bytes;
      totalCodeBytes += lang.bytes;
    });

    const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
    const commitMessages = commits.map((c: any) => c.message);
    const commitAuthors = commits.map((c: any) => c.author?.user?.login).filter(Boolean);
    // Determine authorship: either commits contain candidate's login OR repo has commits (assumes repo under candidate's account)
    const authoredByCandidate = commitAuthors.includes(user.login) || (commits.length > 0);

    return {
      name: repo.name,
      description: repo.description,
      url: repo.url,
      createdAt: repo.createdAt,
      pushedAt: repo.pushedAt,
      languages,
      commitCount: commits.length,
      commitMessages: commitMessages.slice(0, 20),
      hasTests: commitMessages.some((msg: string) =>
        /test|spec|jest|mocha|cypress/i.test(msg)
      ),
      authoredByCandidate,
      issues: repo.issues?.totalCount || 0,
      prs: repo.pullRequests?.totalCount || 0,
    };
  });

  const calendar = user.contributionsCollection?.contributionCalendar;
  const contributionDays = calendar?.weeks?.flatMap((w: any) => w.contributionDays) || [];
  const totalCommitsPastYear = calendar?.totalContributions || 0;
  const longestStreak = calculateLongestStreak(contributionDays);

  console.log(`[GITHUB DATA] Extracted ${detailedRepos.length} Public Repositories.`);
  console.log(`[GITHUB DATA] Top Languages Detected: ${Object.keys(languageMap).slice(0, 5).join(', ')}`);
  console.log(`[GITHUB DATA] Commits (1yr): ${totalCommitsPastYear} | Longest Streak: ${longestStreak} days`);
  console.log(`------------------------------------------\n`);

  return {
    profile: {
      bio: user.bio,
      createdAt: user.createdAt,
      followers: user.followers?.totalCount || 0,
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
}

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
// 3. STRUCTURED RESUME EXTRACTION
// ==========================================
async function extractStructuredResume(pdfUrl: string) {
  const rawText = await extractResumeText(pdfUrl);
  if (rawText.startsWith("Candidate provided a website") || rawText.includes("Could not extract")) {
    return { raw: rawText, structured: null };
  }
  const prompt = `Extract into JSON: { fullName, email, location, education:[], workExperience:[], projects:[], skills:[] }`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a resume parser. Output strictly valid JSON." },
        { role: "user", content: prompt + `\n\nResume text:\n${rawText.slice(0, 6000)}` },
      ],
      temperature: 0,
    });
    const structured = JSON.parse(completion.choices[0].message.content || "{}");
    return { raw: rawText, structured };
  } catch (error) {
    return { raw: rawText, structured: null };
  }
}

// ==========================================
// 4. CROSS-VALIDATION ENGINE with enhanced project matching
// ==========================================
function crossValidate(resume: any, github: any, requiredSkills: string[]) {
  const flags: string[] = [];
  const skillEvidence: Record<string, { found: boolean; source: string; boosted: boolean }> = {};

  requiredSkills.forEach(skill => {
    skillEvidence[skill] = { found: false, source: "", boosted: false };
  });

  // Skills from resume
  if (resume?.skills) {
    const resumeSkills = resume.skills.map((s: string) => s.toLowerCase());
    requiredSkills.forEach(skill => {
      if (resumeSkills.includes(skill.toLowerCase())) {
        skillEvidence[skill].found = true;
        skillEvidence[skill].source = "resume";
      }
    });
  }

  // Skills from GitHub
  if (github) {
    const githubLanguages = Object.keys(github.languageBreakdown || {}).map(l => l.toLowerCase());
    const githubRepos = github.repos || [];

    requiredSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      
      if (githubLanguages.includes(skillLower)) {
        skillEvidence[skill].found = true;
        skillEvidence[skill].source = "github_languages";
        skillEvidence[skill].boosted = true; 
      }

      const mentionsInRepos = githubRepos.some((repo: any) =>
        (repo.name.toLowerCase().includes(skillLower) || repo.description?.toLowerCase().includes(skillLower))
      );
      if (mentionsInRepos && !skillEvidence[skill].found) {
        skillEvidence[skill].found = true;
        skillEvidence[skill].source = "github_mentions";
        skillEvidence[skill].boosted = true;
      }
    });
  }

  // Collect verified skills for display
  const verifiedSkills = Object.entries(skillEvidence)
    .filter(([_, v]) => v.found)
    .map(([k]) => k);

  // Project-repo matching with detailed logging
  if (resume?.projects && github?.repos) {
    console.log(`\n[PROJECT MATCHING] Starting verification for ${resume.projects.length} projects...`);
    const repoMap = new Map(github.repos.map((r: any) => [r.url.toLowerCase(), r]));
    for (let i = 0; i < resume.projects.length; i++) {
      const project = resume.projects[i];
      if (!project.name) continue;
      
      let matchedRepo = null;
      let matchType = 'none';

      // 1. Try exact URL match if project.url is provided
      if (project.url) {
        const urlLower = project.url.toLowerCase();
        matchedRepo = repoMap.get(urlLower) || 
                      repoMap.get(urlLower.replace(/\.git$/, '')) ||
                      repoMap.get(urlLower + '.git');
        if (matchedRepo) {
          matchType = 'exact_url';
        }
      }
      
      // 2. Fallback to fuzzy name matching
      if (!matchedRepo) {
        let bestMatch = null;
        let highestSimilarity = 0.6; // threshold
        for (const repo of github.repos) {
          const projName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const repoName = repo.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const distance = levenshtein.get(projName, repoName);
          const maxLen = Math.max(projName.length, repoName.length);
          const similarity = maxLen > 0 ? 1 - distance / maxLen : 0;
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = repo;
          }
        }
        if (bestMatch) {
          matchedRepo = bestMatch;
          matchType = `fuzzy (similarity=${highestSimilarity.toFixed(2)})`;
        }
      }

      if (matchedRepo) {
        project.repoVerified = matchedRepo.authoredByCandidate;
        project.matchedRepo = matchedRepo.url;
        project.exactMatch = matchType === 'exact_url';
        console.log(`[PROJECT MATCH] #${i+1} "${project.name}" -> repo "${matchedRepo.name}" (${matchType}, authored: ${matchedRepo.authoredByCandidate})`);
      } else {
        project.repoVerified = false;
        console.log(`[PROJECT MATCH] #${i+1} "${project.name}" -> no match found`);
      }
    }
    console.log(`[PROJECT MATCHING] Completed.\n`);
  }

  requiredSkills.forEach(skill => {
    if (!skillEvidence[skill].found) {
      flags.push(`No evidence of "${skill}" in resume or GitHub`);
    }
  });

  const boostedSkills = Object.keys(skillEvidence).filter(k => skillEvidence[k].boosted);
  if (boostedSkills.length > 0) {
    console.log(`[FORENSICS] AI applied 1.5x weight boost to Repos-Confirmed Skills: [${boostedSkills.join(', ')}]`);
  } else {
    console.log(`[FORENSICS] No skills were confirmed in GitHub repositories. No boosts applied.`);
  }

  return { flags, skillEvidence, verifiedSkills };
}

// ==========================================
// 5. LEARNING VELOCITY CALCULATION
// ==========================================
function calculateLearningVelocity(github: any): "High" | "Average" | "Low" {
  if (!github || !github.repos || github.repos.length < 2) return "Average";
  
  const repos = [...github.repos].sort((a: any, b: any) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  let languageProgression = 0;
  let previousLanguages = new Set<string>();
  for (const repo of repos) {
    const currentLanguages = new Set(repo.languages.map((l: any) => l.name));
    const newLanguages = [...currentLanguages].filter(l => !previousLanguages.has(l)).length;
    languageProgression += newLanguages;
    previousLanguages = new Set([...previousLanguages, ...currentLanguages]);
  }
  
  const commitCounts = repos.map((r: any) => r.commitCount || 0);
  const first = commitCounts[0] || 1;
  const last = commitCounts[commitCounts.length - 1] || 1;
  const commitTrend = last / first;
  
  const score = languageProgression * 0.5 + commitTrend * 50;
  
  const result = score > 30 ? "High" : (score > 10 ? "Average" : "Low");
  
  console.log(`[FORENSICS] Learning Velocity Calculated: ${result} (Progression: ${languageProgression} languages, Trend: ${commitTrend.toFixed(2)})`);
  return result;
}

// ==========================================
// 6. PRD MATH ENGINE (updated scoring)
// ==========================================
const COLLEGE_TIER: Record<string, number> = {
  'iit': 1.5,
  'nit': 1.3,
  'bits': 1.3,
  'iiit': 1.2,
  'indian institute of technology': 1.5,
  'national institute of technology': 1.3,
  'birla institute of technology': 1.3,
};

function getCollegeMultiplier(institution: string): number {
  const lower = institution.toLowerCase();
  for (const [key, value] of Object.entries(COLLEGE_TIER)) {
    if (lower.includes(key)) return value;
  }
  return 0.8;
}

function calculateExperienceScore(workExperience: any[], aiRawExperienceQuality: number): number {
  if (!workExperience || workExperience.length === 0) return 0;
  
  let totalWeightedYears = 0;
  for (const exp of workExperience) {
    const start = new Date(exp.startDate);
    const end = exp.endDate?.toLowerCase().includes('present') ? new Date() : new Date(exp.endDate);
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    let multiplier = 0.3; // default for unverified
    if (exp.verificationBadge) {
      if (exp.verificationBadge.includes("Active Employee")) multiplier = 1.0;
      else if (exp.verificationBadge.includes("Document")) multiplier = 0.9;
      else if (exp.verificationBadge.includes("Org Confirmed")) multiplier = 0.9;
      else if (exp.verificationBadge.includes("Public Repo")) multiplier = 1.0;
      else if (exp.verificationBadge.includes("Public Proxy")) multiplier = 0.1;
    }
    totalWeightedYears += years * multiplier;
  }
  
  const maxPossible = 10;
  const rawYearsScore = Math.min((totalWeightedYears / maxPossible) * 100, 100);
  return (rawYearsScore * 0.5 + aiRawExperienceQuality * 0.5) * 0.20;
}

function calculateProjectsScore(projects: any[], aiRawProjectsQuality: number): number {
  if (!projects || projects.length === 0) return 0;
  
  let totalProjectValue = 0;
  for (const proj of projects) {
    const base = 2.5;
    let multiplier = 0.4;
    if (proj.repoVerified) {
      multiplier = proj.exactMatch ? 1.5 : 1.0;
    }
    totalProjectValue += base * multiplier;
  }
  
  const cappedValue = Math.log(totalProjectValue + 1) * 30;
  const normalized = Math.min(cappedValue, 100);
  return (normalized * 0.6 + aiRawProjectsQuality * 0.4) * 0.15;
}

function calculateAcademicsScore(education: any[], aiRawAcademicsQuality: number): number {
  if (!education || education.length === 0) {
    // If no education data, rely entirely on AI's assessment (scaled)
    return aiRawAcademicsQuality * 0.05;
  }
  
  const edu = education[0];
  let cpi = parseFloat(edu.gpa) || 0;
  const tier = getCollegeMultiplier(edu.institution || '');
  
  // If GPA missing, assign default based on college tier
  if (cpi === 0) {
    cpi = tier >= 1.2 ? 7.0 : 5.0;
  }
  
  const maxCpi = 10;
  const normalizedCpi = Math.min(cpi / maxCpi, 1);
  const computedScore = Math.min(normalizedCpi * tier * 100, 100);
  
  // Blend: 80% computed, 20% AI
  const blended = computedScore * 0.8 + aiRawAcademicsQuality * 0.2;
  return blended * 0.05; // 5% weight
}

function calculateSkillsScore(requiredSkills: string[], skillEvidence: any): number {
  let skillsSubtotal = 0;
  requiredSkills.forEach((s: string) => {
    const evidence = skillEvidence[s];
    if (evidence?.found) {
      skillsSubtotal += evidence.boosted ? 1.5 : 1.0;
    }
  });
  const skillsRatio = requiredSkills.length > 0 ? (skillsSubtotal / (requiredSkills.length * 1.5)) : 1; 
  return (skillsRatio * 100) * 0.30;
}

// Generate radar chart data from GitHub languages
function generateSkillGraph(github: any): Record<string, number> {
  const defaultGraph = { frontend: 0, backend: 0, database: 0, devops: 0, architecture: 0 };
  if (!github || !github.repos) return defaultGraph;

  // Simple heuristic: map languages to categories
  const frontend = ['javascript', 'typescript', 'html', 'css', 'react', 'vue', 'angular'];
  const backend = ['python', 'java', 'go', 'ruby', 'php', 'c#', 'c++', 'c', 'rust', 'scala', 'kotlin'];
  const database = ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch'];
  const devops = ['docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab ci'];
  const architecture = ['design', 'pattern', 'microservices', 'serverless', 'ddd', 'event-driven'];

  let frontendScore = 0, backendScore = 0, databaseScore = 0, devopsScore = 0, archScore = 0;
  let totalBytes = 0;

  for (const repo of github.repos) {
    for (const lang of repo.languages) {
      const langName = lang.name.toLowerCase();
      const bytes = lang.bytes;
      totalBytes += bytes;

      if (frontend.some(f => langName.includes(f))) frontendScore += bytes;
      else if (backend.some(b => langName.includes(b))) backendScore += bytes;
      else if (database.some(d => langName.includes(d))) databaseScore += bytes;
      else if (devops.some(d => langName.includes(d))) devopsScore += bytes;
      else if (architecture.some(a => langName.includes(a))) archScore += bytes;
    }
  }

  // Normalize to 0-100 scale
  const normalize = (val: number) => Math.min(100, Math.round((val / totalBytes) * 100)) || 0;

  return {
    frontend: normalize(frontendScore),
    backend: normalize(backendScore),
    database: normalize(databaseScore),
    devops: normalize(devopsScore),
    architecture: normalize(archScore),
  };
}

// ==========================================
// 7. AI PROMPT
// ==========================================
const SYSTEM_PROMPT = `
You are a technical recruiter AI. Evaluate the candidate's raw quality out of 100 for specific categories.
CRITICAL: Do not apply weightings. Just score the RAW quality based on code complexity and relevance.

Provide JSON:
{
  "rawSkillsScore": number,
  "rawGithubQuality": number,
  "rawExperienceQuality": number,
  "rawProjectsQuality": number,
  "rawAcademicsQuality": number,
  "authenticityScore": number (0-100 based on consistency between GitHub timeline and claimed work history),
  "aiSummary": string
}
`;

// ==========================================
// 8. MAIN HANDLER
// ==========================================
export async function POST(req: Request) {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    const { applicationId, parsedBlocks } = await req.json();
    console.log(`\n===========================================`);
    console.log(`[PROCESS START] Forensic Analysis for: ${applicationId}`);

    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) throw new Error("Application not found");
    const appData = appSnap.data() as any;

    const jobRef = doc(db, "jobs", appData.jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");
    const jobData = jobSnap.data() as any;

    // Fetch GitHub data
    let githubData = null;
    try {
      githubData = await getCachedOrFetch(`github_${appData.githubUsername}`, () => fetchDeepGitHubData(appData.githubUsername));
      if (!githubData) {
        warnings.push("GitHub data could not be fetched. Score may be incomplete.");
      }
    } catch (e) {
      console.error(`[GITHUB FATAL]`, e);
      warnings.push("GitHub data fetch failed. Score may be incomplete.");
    }
    
    let candidateBlocks = parsedBlocks || appData.passportBlocks;
    if (!candidateBlocks) {
       const rawResume = await getCachedOrFetch(`resume_${appData.resumeUrl}`, () => extractStructuredResume(appData.resumeUrl));
       candidateBlocks = rawResume.structured;
    }

    const validation = crossValidate(candidateBlocks, githubData, jobData.requiredSkills);

    const learningVelocity = calculateLearningVelocity(githubData);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `JD Required Skills: ${jobData.requiredSkills.join(", ")}\nCandidate Data: ${JSON.stringify({ blocks: candidateBlocks, github: githubData || "No GitHub Data", validation: validation.skillEvidence }, null, 2)}` },
      ],
      temperature: 0.1,
    });

    const aiRaw = JSON.parse(completion.choices[0].message.content || "{}");
    
    const finalSkillsScore = calculateSkillsScore(jobData.requiredSkills, validation.skillEvidence);
    const finalGithubScore = (aiRaw.rawGithubQuality || 0) * 0.25;
    const finalExperienceScore = calculateExperienceScore(candidateBlocks?.workExperience, aiRaw.rawExperienceQuality || 0);
    const finalProjectsScore = calculateProjectsScore(candidateBlocks?.projects, aiRaw.rawProjectsQuality || 0);
    const finalAcademicsScore = calculateAcademicsScore(candidateBlocks?.education, aiRaw.rawAcademicsQuality || 0);
    const velocityPoints = learningVelocity === "High" ? 5 : (learningVelocity === "Average" ? 3 : 1);
    
    const finalMatchScore = Math.round(
      finalSkillsScore + 
      finalGithubScore + 
      finalExperienceScore + 
      finalProjectsScore + 
      finalAcademicsScore + 
      velocityPoints
    );

    // Generate skill graph
    const skillGraph = generateSkillGraph(githubData);

    // Determine if candidate is a hidden gem (e.g., top 10% of applicants)
    const isHiddenGem = finalMatchScore >= 80; // Example threshold, could be dynamic

    console.log(`\n[EVALUATION] Final Math Breakdown for ${applicationId}:`);
    console.log(` - Skills (30% max): ${finalSkillsScore.toFixed(1)}`);
    console.log(` - GitHub (25% max): ${finalGithubScore.toFixed(1)} (AI Raw Quality: ${aiRaw.rawGithubQuality})`);
    console.log(` - Experience (20% max): ${finalExperienceScore.toFixed(1)}`);
    console.log(` - Projects (15% max): ${finalProjectsScore.toFixed(1)}`);
    console.log(` - Academics (5% max): ${finalAcademicsScore.toFixed(1)}`);
    console.log(` - Velocity (5% max): ${velocityPoints.toFixed(1)}`);
    console.log(`===========================================`);
    console.log(`🏆 FINAL OVERALL SCORE: ${finalMatchScore}/100`);
    console.log(`===========================================\n`);

    let finalStatus = "analyzed"; 
    let fastTrackDetails = null;

    if (jobData.automation) {
      if (jobData.automation.autoShortlistThreshold && finalMatchScore >= jobData.automation.autoShortlistThreshold) {
        finalStatus = "shortlisted";
        if (jobData.automation.interviewLink) {
          fastTrackDetails = { triggered: true, interviewLink: jobData.automation.interviewLink, timestamp: new Date().toISOString() };
        }
      } else if (jobData.automation.autoRejectThreshold && finalMatchScore <= jobData.automation.autoRejectThreshold) {
        finalStatus = "rejected";
      }
    }

    await updateDoc(appRef, {
      status: finalStatus,
      fastTrack: fastTrackDetails, 
      analysis: {
        overallMatchScore: finalMatchScore,
        authenticityScore: aiRaw.authenticityScore || 0,
        learningVelocity,
        aiSummary: aiRaw.aiSummary,
        weightedBreakdown: {
           skills: Math.round(finalSkillsScore),
           github: Math.round(finalGithubScore),
           experience: Math.round(finalExperienceScore),
           projects: Math.round(finalProjectsScore),
           academics: Math.round(finalAcademicsScore),
           velocity: velocityPoints
        },
        skillGraph,
        audit_trail: validation.flags,
        verifiedSkills: validation.verifiedSkills,
        isHiddenGem,
        warnings
      },
      analyzedAt: new Date().toISOString(),
    });

    const endTime = Date.now();
    console.log(`[PROCESS END] Status: ${finalStatus} | Time: ${(endTime - startTime) / 1000}s`);
    
    return NextResponse.json({ success: true, finalStatus, score: finalMatchScore, warnings });

  } catch (error: any) {
    console.error(`[FATAL]`, error);
    return NextResponse.json({ error: "Analysis failed", details: error.message }, { status: 500 });
  }
}

// ... (extractResumeText unchanged)
async function extractResumeText(pdfUrl: string) {
  let downloadUrl = pdfUrl;
  if (downloadUrl.includes("drive.google.com/file/d/")) {
    const match = downloadUrl.match(/\/d\/(.*?)\//);
    if (match && match[1]) downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  if (downloadUrl.includes("dropbox.com") && downloadUrl.includes("dl=0")) {
    downloadUrl = downloadUrl.replace("dl=0", "dl=1");
  }
  try {
    const response = await fetch(downloadUrl);
    if (response.headers.get("content-type")?.includes("text/html")) return "Restricted link.";
    const arrayBuffer = await response.arrayBuffer();
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.replace(/\s+/g, ' ').substring(0, 5000) || "No text.";
  } catch (error) {
    return "Extraction error.";
  }
}