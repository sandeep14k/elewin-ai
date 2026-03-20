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
            
            # Forensic Checks: CI/CD & Packages
            packageJson: object(expression: "HEAD:package.json") { ... on Blob { text } }
            githubActions: object(expression: "HEAD:.github/workflows") { ... on Tree { entries { name } } }

            # Anti-Tutorial Raw Code Fetching
            appTsx: object(expression: "HEAD:src/App.tsx") { ... on Blob { text } }
            indexJs: object(expression: "HEAD:src/index.js") { ... on Blob { text } }
            mainPy: object(expression: "HEAD:main.py") { ... on Blob { text } }

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
      
      if (repo.packageJson?.text) {
        const text = repo.packageJson.text.toLowerCase();
        if (text.includes('"react"')) detectedFrameworks.add("React");
        if (text.includes('"next"')) detectedFrameworks.add("Next.js");
        if (text.includes('"express"')) detectedFrameworks.add("Express");
      }

      repo.languages?.edges?.forEach((lang: any) => {
        languageMap[lang.node.name] = (languageMap[lang.node.name] || 0) + lang.size;
        totalCodeBytes += lang.size;
      });

      const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
      const rawCodeSnippets = [];
      if (repo.appTsx?.text) rawCodeSnippets.push({ file: 'src/App.tsx', code: repo.appTsx.text.substring(0, 1000) });
      if (repo.indexJs?.text) rawCodeSnippets.push({ file: 'src/index.js', code: repo.indexJs.text.substring(0, 1000) });
      if (repo.mainPy?.text) rawCodeSnippets.push({ file: 'main.py', code: repo.mainPy.text.substring(0, 1000) });

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
        rawCodeSnippets,
        authoredByCandidate: true 
      };
    });

    const calendar = user.contributionsCollection.contributionCalendar;
    const contributionDays = calendar.weeks.flatMap((w: any) => w.contributionDays);
    const longestStreak = calculateLongestStreak(contributionDays);

    return {
      profile: { createdAt: user.createdAt, followers: user.followers.totalCount },
      repos: detailedRepos,
      languageBreakdown: languageMap,
      totalCodeBytes,
      collaboration: {
        prs: user.pullRequests.totalCount,
        issues: user.issues.totalCount,
        comments: user.issueComments.totalCount,
        contributedToOthers: user.repositoriesContributedTo.totalCount,
      },
      engineering: { totalStars, frameworksUsed: Array.from(detectedFrameworks), totalRepos: detailedRepos.length },
      activity: { totalPublicCommitsPastYear: calendar.totalContributions, privateCommitsPastYear: user.contributionsCollection.restrictedContributionsCount, longestStreak, contributionDays },
      contributions: { totalCommitsPastYear: calendar.totalContributions, longestStreak, contributionDays }
    };
  } catch (error) {
    console.error(`[GITHUB] GraphQL Failed, attempting REST fallback:`, error);
    return await fetchGitHubRestEnhanced(username, authToken as string);
  }
}

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

        if (!authoredByCandidate && repo.owner?.login === username && commitCount > 0) authoredByCandidate = true;

        return { ...repo, languages, commitMessages, commitCount, authoredByCandidate, rawCodeSnippets: [] };
      })
    );
    return processGitHubUser(userData, repoDetails, username);
  } catch (error) { return null; }
}

function processGitHubUser(userData: any, repoDetails: any[], username: string) {
  const repos = repoDetails.filter((r: any) => !r.fork);
  const languageMap: Record<string, number> = {};
  let totalCodeBytes = 0;
  const detailedRepos = repos.map((repo: any) => {
    repo.languages.forEach((lang: any) => { languageMap[lang.name] = (languageMap[lang.name] || 0) + lang.bytes; totalCodeBytes += lang.bytes; });
    return { name: repo.name, description: repo.description, url: repo.html_url, createdAt: repo.created_at, pushedAt: repo.pushed_at, languages: repo.languages, commitCount: repo.commitCount, commitMessages: repo.commitMessages, authoredByCandidate: repo.authoredByCandidate, rawCodeSnippets: repo.rawCodeSnippets };
  });
  return { profile: { createdAt: userData.created_at, followers: userData.followers }, repos: detailedRepos, languageBreakdown: languageMap, totalCodeBytes, contributions: { totalCommitsPastYear: 0, longestStreak: 0, contributionDays: [] }, collaboration: { prs: 0, issues: 0, comments: 0, contributedToOthers: 0 } };
}

function calculateLongestStreak(days: { contributionCount: number; date: string }[]): number {
  let maxStreak = 0, currentStreak = 0;
  for (const day of days) { if (day.contributionCount > 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); } else { currentStreak = 0; } }
  return maxStreak;
}

async function extractStructuredResume(pdfUrl: string) {
  const rawText = await extractResumeText(pdfUrl);
  if (rawText.startsWith("Candidate provided a website") || rawText.includes("Could not extract")) return { raw: rawText, structured: null };
  const prompt = `Extract into JSON: { fullName, email, location, education:[], workExperience:[], projects:[], skills:[] }`;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", response_format: { type: "json_object" },
      messages: [{ role: "system", content: "You are a resume parser. Output strictly valid JSON." }, { role: "user", content: prompt + `\n\nResume text:\n${rawText.slice(0, 6000)}` }], temperature: 0,
    });
    return { raw: rawText, structured: JSON.parse(completion.choices[0].message.content || "{}") };
  } catch (error) { return { raw: rawText, structured: null }; }
}

// ==========================================
// 🔥 NEW: PII SANITIZER FOR GLASS-BOX BIAS PREVENTION 🔥
// ==========================================
function sanitizeForBias(blocks: any) {
  if (!blocks) return null;
  const sanitized = JSON.parse(JSON.stringify(blocks)); // Deep copy
  
  // 1. Strip Demographics & Identity
  delete sanitized.fullName;
  delete sanitized.email;
  delete sanitized.location;
  delete sanitized.phone;
  delete sanitized.githubUsername;
  
  // 2. Strip Pedigree Bias (College Names)
  if (sanitized.education) {
    sanitized.education = sanitized.education.map((edu: any) => ({
      degree: edu.degree || "Degree",
      institution: "REDACTED_FOR_BIAS_PREVENTION", // Hide IIT, MIT, Bootcamps, etc.
      gpa: edu.gpa, 
      endDate: edu.endDate
    }));
  }
  return sanitized;
}

function crossValidate(resume: any, github: any, requiredSkills: string[]) {
  const flags: string[] = [];
  const skillEvidence: Record<string, { found: boolean; source: string; boosted: boolean }> = {};
  requiredSkills.forEach(skill => skillEvidence[skill] = { found: false, source: "", boosted: false });

  if (resume?.skills) {
    const resumeSkills = resume.skills.map((s: string) => s.toLowerCase());
    requiredSkills.forEach(skill => { if (resumeSkills.includes(skill.toLowerCase())) skillEvidence[skill] = { found: true, source: "resume", boosted: false }; });
  }

  if (github) {
    const githubLanguages = Object.keys(github.languageBreakdown || {}).map(l => l.toLowerCase());
    const githubRepos = github.repos || [];
    requiredSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (githubLanguages.includes(skillLower)) skillEvidence[skill] = { found: true, source: "github_languages", boosted: true };
      const mentionsInRepos = githubRepos.some((repo: any) => (repo.name.toLowerCase().includes(skillLower) || repo.description?.toLowerCase().includes(skillLower)));
      if (mentionsInRepos && !skillEvidence[skill].found) skillEvidence[skill] = { found: true, source: "github_mentions", boosted: true };
    });
  }

  const projectAudits: any[] = [];
  if (resume?.projects && github?.repos) {
    const repoMap = new Map(github.repos.map((r: any) => [r.url?.toLowerCase(), r]));
    for (let i = 0; i < resume.projects.length; i++) {
      const project = resume.projects[i];
      if (!project.name) continue;
      let matchedRepo = null, matchType = 'none';
      if (project.url) {
        const urlLower = project.url.toLowerCase();
        matchedRepo = repoMap.get(urlLower) || repoMap.get(urlLower.replace(/\.git$/, '')) || repoMap.get(urlLower + '.git');
        if (matchedRepo) matchType = 'exact_url';
      }
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
      if (matchedRepo) {
        project.repoVerified = matchedRepo.authoredByCandidate;
        project.matchedRepo = matchedRepo.url;
        project.exactMatch = matchType === 'exact_url';
        projectAudits.push({ claimedName: project.name, actualGithubName: matchedRepo.name, isAuthoredByCandidate: matchedRepo.authoredByCandidate, matchType });
        if (!matchedRepo.authoredByCandidate) flags.push(`Candidate linked to repo '${matchedRepo.name}' but has 0 authored commits in its default branch history.`);
      } else {
        project.repoVerified = false;
        projectAudits.push({ claimedName: project.name, status: "NO_MATCHING_REPO_FOUND" });
      }
    }
  }

  requiredSkills.forEach(skill => { if (!skillEvidence[skill].found) flags.push(`No evidence of "${skill}" in resume or GitHub`); });
  return { flags, skillEvidence, verifiedSkills: Object.keys(skillEvidence).filter(k => skillEvidence[k].found), projectAudits };
}

function calculateLearningPotential(github: any) {
  if (!github || !github.repos || github.repos.length === 0) return { score: 0, label: "Unknown", timeline: [], details: "Not enough GitHub data to calculate potential." };
  const repos = github.repos.sort((a: any, b: any) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
  let languageProgressionScore = 0;
  let previousLanguages = new Set<string>();
  const timeline: any[] = [];
  for (const repo of repos) {
    const currentLanguages = new Set<string>(repo.languages?.map((l: any) => l.name) || []);
    const newTech = [...currentLanguages].filter(l => !previousLanguages.has(l));
    const safeDate = repo.createdAt ? new Date(repo.createdAt).toISOString() : new Date().toISOString();
    languageProgressionScore += newTech.length * 15; 
    if (newTech.length > 0 || repo.commitCount > 10) { timeline.push({ date: safeDate.split('T')[0].slice(0, 7), repo: repo.name, newTech: newTech, commits: repo.commitCount || 0, hasCI: repo.hasCICD || false }); }
    previousLanguages = new Set([...previousLanguages, ...currentLanguages]);
  }
  const commitActivity = repos.flatMap((r: any) => r.commitMessages?.length || 0);
  const commitTrend = commitActivity.length > 1 ? commitActivity[commitActivity.length - 1] / (commitActivity[0] || 1) : 1;
  const trendBonus = Math.min(commitTrend * 10, 30); 
  const ciBonus = repos.some((r:any) => r.hasCICD) ? 15 : 0;
  const rawScore = Math.min(languageProgressionScore + trendBonus + ciBonus, 100);
  let label = "Average";
  if (rawScore >= 80) label = "Exceptional Learner"; else if (rawScore >= 60) label = "High Velocity"; else if (rawScore < 30) label = "Static Skillset";
  return { score: Math.round(rawScore), label, timeline: timeline.slice(-5), details: `Adopted ${previousLanguages.size} distinct technologies.` };
}

function calculateExperienceScore(workExperience: any[], aiRawExperienceQuality: number): number {
  if (!workExperience || workExperience.length === 0) return 0;
  let totalWeightedYears = 0;
  for (const exp of workExperience) {
    const start = new Date(exp.startDate);
    const end = exp.endDate?.toLowerCase().includes('present') ? new Date() : new Date(exp.endDate);
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    let multiplier = exp.verificationBadge ? 1.0 : 0.2; // Penalize unverified experience
    totalWeightedYears += years * multiplier;
  }
  const rawYearsScore = Math.min((totalWeightedYears / 6) * 100, 100);
  return (rawYearsScore * 0.4 + aiRawExperienceQuality * 0.6) * 0.10; // Reduced to 10%
}

function calculateProjectsScore(projects: any[], aiRawProjectsQuality: number): number {
  if (!projects || projects.length === 0) return 0;
  let verifiedCount = 0;
  for (const proj of projects) { if (proj.repoVerified) verifiedCount += proj.exactMatch ? 1 : 0.5; }
  const quantityScore = Math.min(verifiedCount * 33.33, 100);
  return (quantityScore * 0.4 + aiRawProjectsQuality * 0.6) * 0.20; // Increased to 20%
}

function calculateSkillsScore(requiredSkills: string[], skillEvidence: any): number {
  let skillsSubtotal = 0;
  requiredSkills.forEach((s: string) => { if (skillEvidence[s]?.found) skillsSubtotal += skillEvidence[s].boosted ? 1.5 : 0.5; });
  const maxPossible = requiredSkills.length * 1.5;
  const skillsRatio = requiredSkills.length > 0 ? (skillsSubtotal / maxPossible) : 1; 
  return (skillsRatio * 100) * 0.30; // Increased to 30%
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

function calculateAlgorithmicScore(codingProfiles: any, aiRawAlgorithmicQuality: number): number {
  if (!codingProfiles || Object.keys(codingProfiles).length === 0) return 0;
  let mathScore = 0;
  if (codingProfiles.leetcode) mathScore += Math.min(((codingProfiles.leetcode.stats?.totalSolved || 0) / 400) * 100, 100); 
  if (codingProfiles.codeforces) mathScore += Math.min((Math.max((codingProfiles.codeforces.stats?.rating || 0) - 800, 0) / 1000) * 100, 100); 
  if (codingProfiles.codechef) mathScore += Math.min((Math.max((codingProfiles.codechef.stats?.rating || 0) - 1000, 0) / 1000) * 100, 100);
  if (codingProfiles.hackerrank) mathScore += Math.min(((codingProfiles.hackerrank.stats?.level || 0) / 6) * 100, 100);
  return (Math.min(mathScore, 100) * 0.7 + aiRawAlgorithmicQuality * 0.3) * 0.10; 
}

// ==========================================
// 6. ENHANCED AI PROMPT (IMPACT AREA 04 MASTER)
// ==========================================
const SYSTEM_PROMPT = `
You are an elite, forensic Technical Recruiter AI. Your absolute highest priority is EXPLAINABILITY and REMOVING BIAS.
You have been provided with SANITIZED candidate data. All names, genders, locations, and university names have been removed to prevent bias.
You must score this candidate purely on cryptographic Proof of Work (GitHub), matched skills, and code structure.

You must produce a JSON object with the following exact structure:
{
  "executive_summary": "A punchy, 2-sentence summary of the candidate's true capability based ONLY on verified code.",
  "overall_match_score": number (0-100),
  
  "score_reasoning": "You MUST write a strict, comparative explanation. E.g., 'This candidate scored an 82/100 because 6/8 required skills were verified in GitHub, they possess strong CI/CD adoption, but they lack AWS deployment experience.'",
  
  "bias_audit": {
    "is_pedigree_blind": true,
    "audit_statement": "Confirmed: Candidate evaluated purely on structural code complexity and skill matrices. All demographic and university markers were scrubbed prior to analysis."
  },

  "spam_analysis": {
    "is_likely_spam": boolean,
    "authenticity_score": number (0-100, where 100 is highly authentic and 0 is entirely fake),
    "reasoning": "Explain if the resume is highly exaggerated compared to the GitHub reality (e.g., 'Claims Senior Architect but only has 1 tutorial repo')."
  },

  "skill_verification_matrix": [
    {
      "skill": "String (the required skill from the job description)",
      "status": "Verified" | "Unverified" | "Falsified",
      "resumeClaim": "String (Briefly what the resume claims, e.g., '5 years experience')",
      "githubEvidence": "String (Briefly what the code shows, e.g., 'Found in 3 repos, deep CI/CD usage', or 'No evidence found')",
      "explanation": "String. MUST strictly follow this format: 'We believe this candidate has [Skill] because [Evidence]'. If they lack it, write: 'We cannot verify [Skill] because [Reason]'."
    }
  ],

  "adaptive_assessment": {
    "question": "A highly specific, technical interview question based EXACTLY on one of the candidate's verified GitHub repositories.",
    "context": "Why you are asking this (e.g., 'Since you used WebSockets in your chat-app repo, how would you handle...')"
  },
  
  "open_source_impact": boolean,

  "forensic_skill_graph": { "language_mastery": number, "code_hygiene_and_testing": number, "system_architecture": number, "devops_and_infra": number, "data_and_state": number, "version_control_habits": number }
}

Chain of thought instructions:
1. BIAS PREVENTION: You are evaluating an anonymous entity. Judge them strictly on the bytes of code and verified skills.
2. SPAM DETECTION: Does the resume read like GPT-4 buzzwords but the GitHub is empty, or does the raw code look like a basic tutorial? If yes, flag is_likely_spam as true.
3. PROJECT COMPLEXITY & RAW CODE: You have been given raw code snippets (app.tsx, index.js, main.py). Read them to judge ACTUAL code quality. Do not just look at commit messages.
4. OPEN SOURCE IMPACT: If 'contributedToOthers' is high, set open_source_impact to true.
5. ADAPTIVE ASSESSMENT: Look at the candidate's most complex repository. Generate a hard, architectural interview question specific to the tech stack used in that repo.
`;

// ==========================================
// 7. MAIN HANDLER
// ==========================================
export async function POST(req: Request) {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
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

    // 🔥 CRITICAL BIAS FIX: SANITIZE DATA BEFORE MATH OR AI SEES IT 🔥
    const sanitizedBlocks = sanitizeForBias(candidateBlocks);

    const validation = crossValidate(sanitizedBlocks, githubData, jobData.requiredSkills);
    const learningPotential = calculateLearningPotential(githubData);   

   const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `JD Required Skills: ${jobData.requiredSkills.join(", ")}\n\nSANITIZED Candidate Data: ${JSON.stringify({ blocks: sanitizedBlocks, github: githubData || "No GitHub Data", validation: validation.skillEvidence, codingProfiles: sanitizedBlocks?.codingProfiles || "No Profiles" }, null, 2)}` },
      ],
      temperature: 0.1,
    });

    const aiRaw = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Redistributed Weights for Bias-Free Proof of Work
    const finalSkillsScore = calculateSkillsScore(jobData.requiredSkills, validation.skillEvidence); // 30%
    const finalGithubScore = (aiRaw.rawGithubQuality || 0) * 0.25; // 25%
    const finalProjectsScore = calculateProjectsScore(sanitizedBlocks?.projects, aiRaw.rawProjectsQuality || 0); // 20%
    const finalExperienceScore = calculateExperienceScore(sanitizedBlocks?.workExperience, aiRaw.rawExperienceQuality || 0); // 10%
    const finalAlgorithmicScore = calculateAlgorithmicScore(sanitizedBlocks?.codingProfiles, aiRaw.rawAlgorithmicQuality || 0); // 10%
    const velocityPoints = Math.round((learningPotential.score / 100) * 5); // 5%
    
    const finalMatchScore = Math.round(
      finalSkillsScore + finalGithubScore + finalExperienceScore + 
      finalProjectsScore + finalAlgorithmicScore + velocityPoints
    );
    
    const skillGraph = generateSkillGraph(githubData);
    const lacksTraditionalPedigree = finalExperienceScore < 5; 
    const hasEliteProofOfWork = (finalGithubScore >= 20) || (finalAlgorithmicScore >= 8) || (learningPotential.score >= 85);
    const isHiddenGem = lacksTraditionalPedigree && hasEliteProofOfWork;

    const sanitizedAnalysisData = JSON.parse(JSON.stringify({
      overallMatchScore: finalMatchScore,
      authenticityScore: aiRaw.authenticityScore || aiRaw.spam_analysis?.authenticity_score || 0,
      spam_analysis: aiRaw.spam_analysis || { is_likely_spam: false, authenticity_score: 100, reasoning: "Authentic" }, 
      
      score_reasoning: aiRaw.score_reasoning, // 🔥 NEW FOR IMPACT AREA 04 🔥
      bias_audit: aiRaw.bias_audit,           // 🔥 NEW FOR IMPACT AREA 04 🔥
      
      learningPotential, 
      learningVelocity: learningPotential.label,
      aiSummary: aiRaw.executive_summary || "Forensic analysis complete.",
      weightedBreakdown: {
         skills: Math.round(finalSkillsScore),
         github: Math.round(finalGithubScore),
         experience: Math.round(finalExperienceScore),
         projects: Math.round(finalProjectsScore),
         algorithmic: Math.round(finalAlgorithmicScore),
         velocity: velocityPoints
      },
      forensic_skill_graph: aiRaw.forensic_skill_graph || {
        language_mastery: 0, code_hygiene_and_testing: 0, system_architecture: 0,
        devops_and_infra: 0, data_and_state: 0, version_control_habits: 0
      },
      skill_verification_matrix: aiRaw.skill_verification_matrix || [],
      adaptive_assessment: aiRaw.adaptive_assessment || null, 
      open_source_impact: aiRaw.open_source_impact || false,  
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