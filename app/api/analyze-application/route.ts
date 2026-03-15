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
  
  // FIX: Sanitize the value before saving to Firebase Cache
  const sanitizedValue = JSON.parse(JSON.stringify(value));
  await setDoc(cacheRef, { value: sanitizedValue, timestamp: now });
  return sanitizedValue;
}

// ==========================================
// 2. OPTIMIZED GITHUB AGGREGATOR (OAuth GraphQL)
// ==========================================
async function fetchDeepGitHubData(username: string, userToken?: string) {
  console.log(`[GITHUB] Fetching optimized forensic profile for: ${username}`);

  const authToken = userToken || process.env.GITHUB_TOKEN;

  // Reduced 'first' counts to prevent GitHub 502 timeouts on deep blobs
  const query = `
    query($login: String!) {
      user(login: $login) {
        createdAt
        followers { totalCount }
        
        pullRequests(first: 1) { totalCount }
        issues(first: 1) { totalCount }
        issueComments(first: 1) { totalCount }
        repositoriesContributedTo(first: 5, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
          totalCount
        }

        # Optimized to 20 repos / 10 commits to stay under GitHub's 10s timeout
        repositories(first: 20, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            name
            description
            stargazerCount
            forkCount
            primaryLanguage { name }
            languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
              edges { size, node { name } }
            }
            
            # Forensic Checks
            packageJson: object(expression: "HEAD:package.json") {
              ... on Blob { text }
            }
            
            githubActions: object(expression: "HEAD:.github/workflows") {
              ... on Tree { entries { name } }
            }

            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 10) {
                    nodes {
                      message
                      committedDate
                      additions
                      deletions
                    }
                  }
                }
              }
            }
          }
        }
        
        contributionsCollection {
          hasAnyContributions
          restrictedContributionsCount
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
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { login: username } }),
    });

    if (!response.ok) throw new Error(`GitHub GraphQL error: ${response.status}`);
    const json = await response.json();
    if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);

    const user = json.data.user;
    if (!user) return null;

    const detectedFrameworks = new Set<string>();
    let totalStars = 0;
    const languageMap: Record<string, number> = {};
    let totalCodeBytes = 0;
    
    const detailedRepos = user.repositories.nodes.map((repo: any) => {
      totalStars += repo.stargazerCount;
      
      // Framework Detection from package.json
      if (repo.packageJson?.text) {
        const text = repo.packageJson.text.toLowerCase();
        if (text.includes('"react"')) detectedFrameworks.add("React");
        if (text.includes('"next"')) detectedFrameworks.add("Next.js");
        if (text.includes('"express"')) detectedFrameworks.add("Express");
        if (text.includes('"tailwindcss"')) detectedFrameworks.add("Tailwind");
        if (text.includes('"jest"')) detectedFrameworks.add("Jest/Testing");
      }

      repo.languages?.edges?.forEach((lang: any) => {
        languageMap[lang.node.name] = (languageMap[lang.node.name] || 0) + lang.size;
        totalCodeBytes += lang.size;
      });

      const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
      
      return {
        name: repo.name,
        primaryLanguage: repo.primaryLanguage?.name,
        stars: repo.stargazerCount,
        hasCICD: !!repo.githubActions?.entries?.length,
        commitCount: commits.length,
        url: `https://github.com/${username}/${repo.name}`,
        createdAt: repo.createdAt,
        languages: repo.languages?.edges?.map((e: any) => ({ name: e.node.name, bytes: e.size })) || [],
        commitMessages: commits.map((c: any) => c.message),
        authoredByCandidate: true 
      };
    });

    const calendar = user.contributionsCollection.contributionCalendar;
    const contributionDays = calendar.weeks.flatMap((w: any) => w.contributionDays);
    const longestStreak = calculateLongestStreak(contributionDays);

    return {
      profile: {
        createdAt: user.createdAt,
        followers: user.followers.totalCount,
      },
      repos: detailedRepos,
      languageBreakdown: languageMap,
      totalCodeBytes,
      collaboration: {
        prs: user.pullRequests.totalCount,
        issues: user.issues.totalCount,
        comments: user.issueComments.totalCount,
        contributedToOthers: user.repositoriesContributedTo.totalCount,
      },
      engineering: {
        totalStars,
        frameworksUsed: Array.from(detectedFrameworks),
        totalRepos: detailedRepos.length,
      },
      activity: {
        totalPublicCommitsPastYear: calendar.totalContributions,
        privateCommitsPastYear: user.contributionsCollection.restrictedContributionsCount,
        longestStreak,
        contributionDays
      },
      contributions: {
        totalCommitsPastYear: calendar.totalContributions,
        longestStreak,
        contributionDays
      }
    };
  } catch (error) {
    console.error(`[GITHUB] GraphQL Failed, attempting REST fallback:`, error);
    return await fetchGitHubRestEnhanced(username, authToken as string);
  }
}
// Enhanced REST fallback that accepts the OAuth token
async function fetchGitHubRestEnhanced(username: string, authToken: string) {
  try {
    const headers = { Authorization: `token ${authToken}` };
    
    const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
    if (!userRes.ok) return null;
    const userData = await userRes.json();

    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=50&sort=pushed`, { headers });
    if (!reposRes.ok) return null;
    const reposData = await reposRes.json();

    const repoDetails = await Promise.all(
      reposData.map(async (repo: any) => {
        const [langRes, commitsRes] = await Promise.all([
          fetch(repo.languages_url, { headers }),
          fetch(`https://api.github.com/repos/${username}/${repo.name}/commits?author=${username}&per_page=10`, { headers }).catch(() => null)
        ]);

        let languages: { name: string; bytes: number }[] = [];
        if (langRes && langRes.ok) {
          const langData = await langRes.json();
          languages = Object.entries(langData).map(([name, bytes]) => ({ name, bytes: bytes as number }));
        }

        let authoredByCandidate = false;
        let commitMessages: string[] = [];
        let commitCount = 0;

        if (commitsRes && commitsRes.ok) {
          const commits = await commitsRes.json();
          authoredByCandidate = commits.length > 0;
          commitMessages = commits.map((c: any) => c.commit.message);
          commitCount = commits.length;
        }

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

    return processGitHubUser(userData, repoDetails, username);
  } catch (error) {
    console.error(`[GITHUB REST ENHANCED ERROR]`, error);
    return null;
  }
}

function processGitHubUser(userData: any, repoDetails: any[], username: string) {
  const repos = repoDetails.filter((r: any) => !r.fork);
  const languageMap: Record<string, number> = {};
  let totalCodeBytes = 0;
  
  const detailedRepos = repos.map((repo: any) => {
    repo.languages.forEach((lang: any) => {
      languageMap[lang.name] = (languageMap[lang.name] || 0) + lang.bytes;
      totalCodeBytes += lang.bytes;
    });

    return {
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      languages: repo.languages,
      commitCount: repo.commitCount,
      commitMessages: repo.commitMessages,
      authoredByCandidate: repo.authoredByCandidate,
    };
  });

  return {
    profile: {
      createdAt: userData.created_at,
      followers: userData.followers,
    },
    repos: detailedRepos,
    languageBreakdown: languageMap,
    totalCodeBytes,
    contributions: {
      totalCommitsPastYear: 0, // REST API doesn't easily provide 1-year commit totals without massive pagination
      longestStreak: 0,
      contributionDays: [],
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
    return { raw: rawText, structured: JSON.parse(completion.choices[0].message.content || "{}") };
  } catch (error) {
    return { raw: rawText, structured: null };
  }
}

// ==========================================
// 4. CROSS-VALIDATION ENGINE
// ==========================================
function crossValidate(resume: any, github: any, requiredSkills: string[]) {
  const flags: string[] = [];
  const skillEvidence: Record<string, { found: boolean; source: string; boosted: boolean }> = {};

  requiredSkills.forEach(skill => skillEvidence[skill] = { found: false, source: "", boosted: false });

  if (resume?.skills) {
    const resumeSkills = resume.skills.map((s: string) => s.toLowerCase());
    requiredSkills.forEach(skill => {
      if (resumeSkills.includes(skill.toLowerCase())) {
        skillEvidence[skill] = { found: true, source: "resume", boosted: false };
      }
    });
  }

  if (github) {
    const githubLanguages = Object.keys(github.languageBreakdown || {}).map(l => l.toLowerCase());
    const githubRepos = github.repos || [];

    requiredSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (githubLanguages.includes(skillLower)) skillEvidence[skill] = { found: true, source: "github_languages", boosted: true };
      
      const mentionsInRepos = githubRepos.some((repo: any) =>
        (repo.name.toLowerCase().includes(skillLower) || repo.description?.toLowerCase().includes(skillLower))
      );
      if (mentionsInRepos && !skillEvidence[skill].found) skillEvidence[skill] = { found: true, source: "github_mentions", boosted: true };
    });
  }

  const verifiedSkills = Object.entries(skillEvidence).filter(([_, v]) => v.found).map(([k]) => k);

  // 🔥 NEW: Deep Project Audit Trail
  const projectAudits: any[] = [];

 if (resume?.projects && github?.repos) {
    console.log(`\n[PROJECT MATCHING] Starting forensic audit for ${resume.projects.length} claimed projects...`);
    const repoMap = new Map(github.repos.map((r: any) => [r.url?.toLowerCase(), r]));
    
    for (let i = 0; i < resume.projects.length; i++) {
      const project = resume.projects[i];
      if (!project.name) continue;
      
      let matchedRepo = null;
      let matchType = 'none';

      // 1. Exact URL Match
      if (project.url) {
        const urlLower = project.url.toLowerCase();
        matchedRepo = repoMap.get(urlLower) || repoMap.get(urlLower.replace(/\.git$/, '')) || repoMap.get(urlLower + '.git');
        if (matchedRepo) matchType = 'exact_url';
      }
      
      // 2. Fuzzy Name Match
      if (!matchedRepo) {
        let bestMatch = null, highestSimilarity = 0.6;
        for (const repo of github.repos) {
          const projName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const repoName = repo.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const distance = levenshtein.get(projName, repoName);
          const maxLen = Math.max(projName.length, repoName.length);
          const similarity = maxLen > 0 ? 1 - distance / maxLen : 0;
          if (similarity > highestSimilarity) { highestSimilarity = similarity; bestMatch = repo; }
        }
        if (bestMatch) { matchedRepo = bestMatch; matchType = `fuzzy`; }
      }

      // 3. Build the Audit Record
      if (matchedRepo) {
        project.repoVerified = matchedRepo.authoredByCandidate;
        project.matchedRepo = matchedRepo.url;
        project.exactMatch = matchType === 'exact_url';
        
        projectAudits.push({
          claimedName: project.name,
          claimedDescription: project.description || "No description provided",
          actualGithubName: matchedRepo.name,
          actualGithubDescription: matchedRepo.description || "No description",
          actualLanguages: matchedRepo.languages.map((l:any) => l.name).join(", "),
          isAuthoredByCandidate: matchedRepo.authoredByCandidate,
          matchType: matchType
        });
        
        console.log(`[AUDIT] Claimed: "${project.name}" -> Found: "${matchedRepo.name}" (Authored: ${matchedRepo.authoredByCandidate})`);

        if (!matchedRepo.authoredByCandidate) {
          flags.push(`Candidate linked to repo '${matchedRepo.name}' but has 0 authored commits in its default branch history.`);
        }
      } else {
        project.repoVerified = false;
        projectAudits.push({
          claimedName: project.name,
          claimedDescription: project.description,
          status: "NO_MATCHING_REPO_FOUND"
        });
        console.log(`[AUDIT] Claimed: "${project.name}" -> NO GITHUB REPO FOUND`);
      }
    }
    console.log(`[PROJECT MATCHING] Audit complete.\n`);
  }

  requiredSkills.forEach(skill => {
    if (!skillEvidence[skill].found) flags.push(`No evidence of "${skill}" in resume or GitHub`);
  });

  return { flags, skillEvidence, verifiedSkills: Object.keys(skillEvidence).filter(k => skillEvidence[k].found), projectAudits };
}
// ==========================================
// 5. MATH ENGINES
// ==========================================
function calculateLearningVelocity(github: any): "High" | "Average" | "Low" {
  if (!github || !github.repos || github.repos.length < 2) return "Average";
  const repos = github.repos.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  let languageProgression = 0;
  let previousLanguages = new Set<string>();
  
  for (const repo of repos) {
    const currentLanguages = new Set<string>(repo.languages.map((l: any) => l.name as string));
    const newLanguages = [...currentLanguages].filter((l: string) => !previousLanguages.has(l)).length;
    languageProgression += newLanguages;
    previousLanguages = new Set([...previousLanguages, ...currentLanguages]);
  }
  
  const commitActivity = repos.flatMap((r: any) => r.commitMessages?.length || 0);
  const commitTrend = commitActivity.length > 1 ? commitActivity[commitActivity.length - 1] / commitActivity[0] : 1;
  const score = languageProgression * 0.5 + commitTrend * 50;
  return score > 30 ? "High" : (score > 10 ? "Average" : "Low");
}

function calculateExperienceScore(workExperience: any[], aiRawExperienceQuality: number): number {
  if (!workExperience || workExperience.length === 0) return 0;
  
  let totalWeightedYears = 0;
  for (const exp of workExperience) {
    const start = new Date(exp.startDate);
    const end = exp.endDate?.toLowerCase().includes('present') ? new Date() : new Date(exp.endDate);
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    let multiplier = 0.1; // Default low trust
    if (exp.verificationBadge?.includes("Active Employee")) multiplier = 1.0;
    else if (exp.verificationBadge?.includes("Document")) multiplier = 0.9;
    else if (exp.verificationBadge?.includes("Public Repo")) multiplier = 1.0;
    
    totalWeightedYears += years * multiplier;
  }
  
  // Cap raw time at 8 years. 
  const rawYearsScore = Math.min((totalWeightedYears / 8) * 100, 100);
  
  // 🔥 FIX: Quality of experience (AI) is worth 70%, duration is only 30%
  return (rawYearsScore * 0.3 + aiRawExperienceQuality * 0.7) * 0.20; 
}

function calculateProjectsScore(projects: any[], aiRawProjectsQuality: number): number {
  if (!projects || projects.length === 0) return 0;
  
  let verifiedCount = 0;
  for (const proj of projects) {
    if (proj.repoVerified) verifiedCount += proj.exactMatch ? 1 : 0.5;
  }
  
  // Cap quantity at 3 verified projects (33.3 points each). Prevents spamming.
  const quantityScore = Math.min(verifiedCount * 33.33, 100);
  
  // 🔥 FIX: Project Complexity (AI) is worth 70%, quantity is only 30%
  return (quantityScore * 0.3 + aiRawProjectsQuality * 0.7) * 0.15;
}

// College Tier Normalization Multipliers
const COLLEGE_TIER: Record<string, number> = {
  'iit': 1.4, 'indian institute of technology': 1.4,
  'nit': 1.25, 'national institute of technology': 1.25,
  'bits': 1.25, 'birla institute of technology': 1.25,
  'iiit': 1.2, 'indian institute of information technology': 1.2,
  'dtu': 1.15, 'delhi technological university': 1.15,
  'nsut': 1.15, 'jadavpur': 1.15, 'thapar': 1.1
};

function calculateAcademicsScore(education: any[], aiRawAcademicsQuality: number): number {
  if (!education || education.length === 0) return aiRawAcademicsQuality * 0.05;
  const edu = education[0];
  
  let cpi = parseFloat(edu.gpa);
  if (isNaN(cpi)) cpi = 6.0; // Default if unparseable
  
  // Check if out of 100 (percentage) and convert to 10-point scale
  if (cpi > 10) cpi = cpi / 10; 

  const institutionLower = (edu.institution || '').toLowerCase();
  let tierMultiplier = 1.0; // Baseline college

  for (const [key, value] of Object.entries(COLLEGE_TIER)) {
    if (institutionLower.includes(key)) {
      tierMultiplier = value;
      break;
    }
  }

  // 🔥 FIX: Normalize the CPI. A 6.0 at IIT (1.4x) becomes an 8.4 effective CPI.
  const effectiveCPI = Math.min(cpi * tierMultiplier, 10);
  const computedScore = (effectiveCPI / 10) * 100;

  // Academics is computed purely by math, AI acts as a minor sanity check
  return (computedScore * 0.8 + aiRawAcademicsQuality * 0.2) * 0.05;
}

function calculateSkillsScore(requiredSkills: string[], skillEvidence: any): number {
  let skillsSubtotal = 0;
  requiredSkills.forEach((s: string) => {
    // If it's boosted (proven in GitHub), it's worth more than just a resume claim
    if (skillEvidence[s]?.found) skillsSubtotal += skillEvidence[s].boosted ? 1.5 : 0.5;
  });
  
  const maxPossible = requiredSkills.length * 1.5;
  const skillsRatio = requiredSkills.length > 0 ? (skillsSubtotal / maxPossible) : 1; 
  return (skillsRatio * 100) * 0.30;
}
function generateSkillGraph(github: any): Record<string, number> {
  const defaultGraph = { frontend: 0, backend: 0, database: 0, devops: 0, architecture: 0 };
  if (!github || !github.repos) return defaultGraph;

  let fScore = 0, bScore = 0, dScore = 0, doScore = 0, aScore = 0, total = 0;
  for (const repo of github.repos) {
    for (const lang of repo.languages) {
      const name = lang.name.toLowerCase();
      total += lang.bytes;
      if (['javascript', 'typescript', 'html', 'css', 'react'].some(x => name.includes(x))) fScore += lang.bytes;
      else if (['python', 'java', 'go', 'ruby', 'c'].some(x => name.includes(x))) bScore += lang.bytes;
      else if (['sql'].some(x => name.includes(x))) dScore += lang.bytes;
      else if (['docker', 'shell'].some(x => name.includes(x))) doScore += lang.bytes;
    }
  }
  const normalize = (v: number) => Math.min(100, Math.round((v / total) * 100)) || 0;
  return { frontend: normalize(fScore), backend: normalize(bScore), database: normalize(dScore), devops: normalize(doScore), architecture: normalize(aScore) };
}

// ==========================================
// 6. AI PROMPT
// ==========================================
const SYSTEM_PROMPT = `
You are a senior forensic technical recruiter and engineering manager. Your task is to rigorously analyze a candidate's resume and GitHub data against a job description, ignoring fluff and focusing strictly on verifiable Proof of Work.

You will receive a "Project Audit" array. You MUST cross-reference the candidate's "Claimed Description" against the "Actual GitHub Description" and "Actual Languages".
1. If a candidate claims to have built a complex backend architecture, but the actual GitHub repo only contains HTML/CSS, you must heavily penalize 'rawProjectsQuality' and 'authenticityScore'.
2. If 'isAuthoredByCandidate' is false, it means they linked a repo they did not contribute to. Score this as plagiarism (0 for that project).

You must produce a JSON object with the following exact structure:
- executive_summary: A punchy, 3-sentence summary of the candidate's actual capability vs. claimed capability. Note any major exaggerations here.
- skill_verification: { skill: string, found_in_resume: boolean, found_in_github: boolean, evidence: string }[]
- rawExperienceQuality: A score (0-100) evaluating if the claimed years of experience match their GitHub commit history and code complexity.
- rawProjectsQuality: A score (0-100) evaluating the true complexity of their personal projects based ONLY on the Project Audit data.
- rawAcademicsQuality: A score (0-100) evaluating their academic background.
- rawGithubQuality: A score (0-100) evaluating their overall GitHub presence.
- code_quality_indicators: { hasTests: boolean, commitMessageQuality: "Good" | "Average" | "Poor", repoOrganization: "Good" | "Average" | "Poor" }
- collaboration_score: A score (0-100) based on their Issue/PR count, forks, and ability to work with others.
- authenticityScore: A score (0-100). Penalize heavily for exaggerated claims, repos with 1 commit (tutorials), or linking repos they didn't author.
- forensic_skill_graph: {
    language_mastery: number, // 0-100
    code_hygiene_and_testing: number, // 0-100
    system_architecture: number, // 0-100
    devops_and_infra: number, // 0-100
    data_and_state: number, // 0-100
    version_control_habits: number // 0-100
  }
- audit_trail: An array of 3-5 strings detailing specific, concrete observations (e.g., "Candidate claimed to build a React Native app, but the verified repo only contains a basic README.").
`;


// ==========================================
// 7. MAIN HANDLER
// ==========================================
export async function POST(req: Request) {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    // 👇 WE NOW EXTRACT THE GITHUB TOKEN PASSED FROM THE FRONTEND 👇
    const { applicationId, parsedBlocks, githubToken } = await req.json();
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

    let githubData = null;
    try {
      // 👇 PASS THE TOKEN INTO THE FETCHER 👇
      const cacheKey = `github_${appData.githubUsername}_${githubToken ? 'auth' : 'public'}`;
      githubData = await getCachedOrFetch(cacheKey, () => fetchDeepGitHubData(appData.githubUsername, githubToken));
      if (!githubData) warnings.push("GitHub data could not be fetched. Score may be incomplete.");
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
   
    console.log(`\n--- [SENDING TO AI: PROJECT AUDIT PAYLOAD] ---`);
    console.log(JSON.stringify(validation.projectAudits, null, 2));
    console.log(`-----------------------------------------------\n`);

   const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `JD Required Skills: ${jobData.requiredSkills.join(", ")}\n\nProject Audits (Claim vs Reality): ${JSON.stringify(validation.projectAudits, null, 2)}\n\nCandidate Data: ${JSON.stringify({ blocks: candidateBlocks, github: githubData || "No GitHub Data", validation: validation.skillEvidence }, null, 2)}` },
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
      finalSkillsScore + finalGithubScore + finalExperienceScore + 
      finalProjectsScore + finalAcademicsScore + velocityPoints
    );
     console.log(`\n--- [DETAILED FORENSIC SCORECARD] ---`);
    console.log(`Target Role: ${jobData.title}`);
    console.log(`Candidate: ${appData.candidateName}`);
    console.log(`-------------------------------------`);
    console.log(`✅ Skills Match (30%):    ${finalSkillsScore.toFixed(2)}/30`);
    console.log(`💻 GitHub Quality (25%): ${finalGithubScore.toFixed(2)}/25 (AI Rating: ${aiRaw.rawGithubQuality})`);
    console.log(`💼 Experience (20%):     ${finalExperienceScore.toFixed(2)}/20`);
    console.log(`🚀 Project Proof (15%):  ${finalProjectsScore.toFixed(2)}/15`);
    console.log(`🎓 Academics (5%):       ${finalAcademicsScore.toFixed(2)}/5`);
    console.log(`⚡ Learning Velocity:    ${velocityPoints}/5 (${learningVelocity})`);
    console.log(`-------------------------------------`);
    console.log(`🏆 TOTAL SCORE:           ${finalMatchScore}/100`);
    console.log(`-------------------------------------\n`);
    const skillGraph = generateSkillGraph(githubData);
    const isHiddenGem = finalMatchScore >= 80;

    // 👇 THE FIX: SANITIZE 'UNDEFINED' VALUES FOR FIREBASE 👇
    const sanitizedAnalysisData = JSON.parse(JSON.stringify({
      overallMatchScore: finalMatchScore,
      authenticityScore: aiRaw.authenticityScore || 0,
      learningVelocity,
      // Map 'executive_summary' from AI to 'aiSummary' expected by your UI
      aiSummary: aiRaw.executive_summary || aiRaw.aiSummary || "Forensic analysis complete.",
      weightedBreakdown: {
         skills: Math.round(finalSkillsScore),
         github: Math.round(finalGithubScore),
         experience: Math.round(finalExperienceScore),
         projects: Math.round(finalProjectsScore),
         academics: Math.round(finalAcademicsScore),
         velocity: velocityPoints
      },
      // Safely pass the forensic graph to the UI Radar chart!
      forensic_skill_graph: aiRaw.forensic_skill_graph || {
        language_mastery: 0, code_hygiene_and_testing: 0, system_architecture: 0,
        devops_and_infra: 0, data_and_state: 0, version_control_habits: 0
      },
      skillGraph, // legacy fallback
      audit_trail: aiRaw.audit_trail || validation.flags,
      verifiedSkills: validation.verifiedSkills,
      isHiddenGem,
      warnings
    }));

    let finalStatus = "analyzed"; 
    let fastTrackDetails = null;

    if (jobData.automation) {
      if (jobData.automation.autoShortlistThreshold && finalMatchScore >= jobData.automation.autoShortlistThreshold) {
        finalStatus = "shortlisted";
        if (jobData.automation.interviewLink) fastTrackDetails = { triggered: true, interviewLink: jobData.automation.interviewLink, timestamp: new Date().toISOString() };
      } else if (jobData.automation.autoRejectThreshold && finalMatchScore <= jobData.automation.autoRejectThreshold) {
        finalStatus = "rejected";
      }
    }

    // Save strictly sanitized data
    await updateDoc(appRef, {
      status: finalStatus,
      fastTrack: fastTrackDetails, 
      analysis: sanitizedAnalysisData,
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

// ... extractResumeText unchanged
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