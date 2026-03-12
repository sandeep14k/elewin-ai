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
  fetchFn: () => Promise<T | null>,
  ttlSeconds: number = 7 * 24 * 60 * 60 
): Promise<T | null> {
  // SANITIZE KEY
  const safeKey = cacheKey.replace(/[\/.:?]/g, "_");
  
  const cacheRef = doc(db, "cache", safeKey);
  const cacheSnap = await getDoc(cacheRef);
  const now = Date.now();

  if (cacheSnap.exists()) {
    const data = cacheSnap.data();
    if (now - data.timestamp < ttlSeconds * 1000) {
      console.log(`[CACHE] Hit for ${safeKey}`);
      return data.value as T;
    }
  }

  console.log(`[CACHE] Miss for ${safeKey}, fetching fresh data`);
  const value = await fetchFn();
  
  // CRITICAL FIX: Only save to cache if the fetch actually succeeded (not null)
  // This prevents saving 502 errors or empty data for 7 days.
  if (value !== null && value !== undefined) {
    await setDoc(cacheRef, { value, timestamp: now });
  } else {
    console.warn(`[CACHE] Warning: Fetch returned null for ${safeKey}, bypassing cache save.`);
  }
  
  return value;
}

// ==========================================
// 2. DEEP GITHUB AGGREGATOR (GraphQL)
// ==========================================
async function fetchDeepGitHubData(username: string) {
  console.log(`[GITHUB] Fetching deep profile for: ${username}`);

  // OPTIMIZATION FIX: 
  // Removed `defaultBranchRef { history }` completely.
  // Traversing git commit history across multiple repos is the #1 cause of GitHub GraphQL 502 timeouts.
  // We will rely on Languages, Topics, and Descriptions, which are fast and heavily indexed by GitHub.
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
        repositories(first: 20, orderBy: {field: PUSHED_AT, direction: DESC}) {
          nodes {
            name
            description
            createdAt
            pushedAt
            isFork
            repositoryTopics(first: 5) {
              nodes {
                topic {
                  name
                }
              }
            }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node { name }
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
      
      // Extract topics (crucial for semantic matching like "rest-api")
      const topics = repo.repositoryTopics?.nodes.map((n: any) => n.topic.name) || [];

      return {
        name: repo.name,
        description: repo.description,
        topics,
        createdAt: repo.createdAt,
        pushedAt: repo.pushedAt,
        languages,
        hasReadme: true, 
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
    return null; // Return null so the cache function knows NOT to save this
  }
}

// Helper: calculate longest streak
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
- summary: string
- education: array of { institution: string, degree: string, field: string, startDate: string, endDate: string, gpa: number? }
- workExperience: array of { company: string, title: string, startDate: string, endDate: string, description: string, skillsUsed: string[] }
- projects: array of { name: string, description: string, technologies: string[], url: string? }
- skills: array of string (both technical and soft)
- certifications: array of string
- languages: array of { language: string, proficiency: string }
- urls: { github?: string, linkedin?: string, portfolio?: string }

If a field is not found, set it to null or empty array.

Resume text:
${rawText.slice(0, 6000)}

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
// 4. PDF TEXT EXTRACTOR
// ==========================================
async function extractResumeText(pdfUrl: string) {
  console.log(`[PDF] Processing URL: ${pdfUrl}`);
  
  let downloadUrl = pdfUrl;

  if (downloadUrl.includes("drive.google.com/file/d/")) {
    const match = downloadUrl.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }
  
  if (downloadUrl.includes("dropbox.com") && downloadUrl.includes("dl=0")) {
    downloadUrl = downloadUrl.replace("dl=0", "dl=1");
  }

  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.error(`[PDF] 403 ERROR: Google Drive blocked access.`);
        return "ERROR: Access Denied. Ensure the Google Drive link is set to 'Anyone with the link can view'.";
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return "Candidate provided a private link or login page. Evaluate based on GitHub only.";
    }

    const arrayBuffer = await response.arrayBuffer();
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    
    if (!text || text.trim().length === 0) return "No readable text found in PDF.";

    return text.replace(/\s+/g, ' ').substring(0, 5000);
  } catch (error: any) {
    return `Could not extract text: ${error.message}`;
  }
}

// ==========================================
// 5. ENHANCED SEMANTIC AI PROMPT
// ==========================================
const SYSTEM_PROMPT = `
You are an elite forensic technical auditor and technical recruiter. Your goal is to prove or disprove a candidate's skill claims by cross-referencing their Resume against their GitHub Proof of Work.

CRITICAL RULE: SEMANTIC SKILL INFERENCE (DO NOT USE EXACT KEYWORD MATCHING)
You must bridge the gap between "Required Skills" and the candidate's actual technologies.
- If Job Requires "Mobile Development": Candidate having "Flutter", "Dart", "React Native", "Swift", or "Kotlin" means they POSSESS the skill.
- If Job Requires "REST API": Candidate having "Express", "Node.js", "Django", "FastAPI", "Spring Boot", OR network packages like "axios", "dio", "http", OR commit messages about "endpoints/apis" means they POSSESS the skill.
- If Job Requires "Frontend": "React", "Next.js", "Vue", "HTML/CSS", "Tailwind" counts as full evidence.

INSTRUCTIONS:
1. Cross-reference the required skills with the resume and GitHub data.
2. If a skill is semantically proven (even if not explicitly named), mark it as VERIFIED.
3. If a skill is in GitHub but not the resume, it's a "Hidden Strength."
4. If a skill is in the resume but not GitHub, note the discrepancy.

CRITICAL: YOU MUST RETURN ONLY A JSON OBJECT WITH THESE EXACT camelCase KEYS:
{
  "overallMatchScore": number (0-100),
  "authenticityScore": number (0-100),
  "weightedBreakdown": { "proofOfWork": number, "experience": number, "academics": number, "velocity": number },
  "isHiddenGem": boolean,
  "learningVelocity": "High" | "Average" | "Low",
  "skillGraph": { "frontend": number, "backend": number, "database": number, "devops": number, "architecture": number },
  "verifiedSkills": [array of string],
  "skillVerification": [
     { "skill": "REST API", "status": "Found", "evidence": "Used 'dio' and 'express' in 3 GitHub repositories." },
     { "skill": "Mobile Development", "status": "Found", "evidence": "Built cross-platform apps using Flutter/Dart." }
  ],
  "audit_trail": [array of strings tracking your logic],
  "aiSummary": "Brief 2 sentence summary."
}
`;

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const { applicationId } = await req.json();
    console.log(`\n>>> [AUDIT START] ${applicationId}`);

    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) throw new Error("App not found");
    const appData = appSnap.data() as any;

    const jobSnap = await getDoc(doc(db, "jobs", appData.jobId));
    const jobData = jobSnap.data() as any;

    // We changed the cache key to v4 to guarantee a fresh pull with our safe, history-free query
    const [githubData, resumeData] = await Promise.all([
      getCachedOrFetch(`github_v4_${appData.githubUsername}`, () => fetchDeepGitHubData(appData.githubUsername)),
      getCachedOrFetch(`resume_${appData.resumeUrl}`, () => extractStructuredResume(appData.resumeUrl))
    ]);

    // ==========================================
    // LOGGING CHECKPOINTS (To verify data fetched properly)
    // ==========================================
    console.log(`\n--- [LOG_CHECKPOINT: RESUME] ---`);
    console.log(`Summary Found: ${!!resumeData?.structured?.summary}`);
    console.log(`Skills Extracted:`, resumeData?.structured?.skills || "None");
    console.log(`Experience Entries: ${resumeData?.structured?.workExperience?.length || 0}`);

    console.log(`\n--- [LOG_CHECKPOINT: GITHUB] ---`);
    console.log(`Repos Fetched: ${githubData?.repos?.length || 0}`);
    console.log(`Top Languages:`, Object.keys(githubData?.languageBreakdown || {}));
    
    // PRE-PROCESSING: Create a rich, semantic summary for the AI
    const githubSummary = {
      languages: githubData?.languageBreakdown || {},
      topRepos: githubData?.repos?.slice(0, 10).map((r: any) => ({
        name: r.name,
        desc: r.description,
        tech: r.languages.map((l: any) => l.name),
        topics: r.topics, // INCLUDES TOPICS NOW!
      }))
    };

    const promptData = `
      JOB REQUIREMENTS: ${jobData.requiredSkills.join(", ")}
      
      CANDIDATE ACADEMICS/RESUME: 
      ${JSON.stringify(resumeData?.structured || {})}
      
      GITHUB PROOF OF WORK: 
      ${JSON.stringify(githubSummary)}
    `;

    console.log(`\n[AI_ENGINE] Prompting LLM for Semantic Match...`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", 
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: promptData },
      ],
      temperature: 0.1, 
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");

    // Map the response safely to ensure frontend compatibility
    const analysisResults = {
      overallMatchScore: aiResponse.overallMatchScore || aiResponse.overall_match_score || 0,
      authenticityScore: aiResponse.authenticityScore || aiResponse.authenticity_score || 0,
      weightedBreakdown: aiResponse.weightedBreakdown || aiResponse.weighted_breakdown || { proofOfWork: 0, experience: 0, academics: 0, velocity: 0 },
      isHiddenGem: aiResponse.isHiddenGem ?? aiResponse.is_hidden_gem ?? false,
      learningVelocity: aiResponse.learningVelocity || aiResponse.learning_velocity || "Average",
      skillGraph: aiResponse.skillGraph || aiResponse.skill_graph || { frontend: 0, backend: 0, database: 0, devops: 0, architecture: 0 },
      verifiedSkills: aiResponse.verifiedSkills || aiResponse.verified_skills || [],
      skillVerification: aiResponse.skillVerification || aiResponse.skill_verification || [],
      audit_trail: aiResponse.audit_trail || aiResponse.audit_trail || [],
      aiSummary: aiResponse.aiSummary || aiResponse.ai_summary || "Analysis failed to generate summary."
    };

    console.log(`[RESULT] Match: ${analysisResults.overallMatchScore}% | Verified Skills: ${analysisResults.verifiedSkills.length}`);

    await updateDoc(appRef, {
      status: "analyzed",
      analysis: analysisResults, 
      enrichedData: {
        github: githubData || null,
        resume: resumeData?.structured || null,
      },
      analyzedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, analysisResults });

  } catch (error: any) {
    console.error(`[FATAL]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}