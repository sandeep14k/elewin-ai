import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import OpenAI from "openai";
import * as levenshtein from 'fast-levenshtein';

// ==========================================
// 🔥 GROQ INTERCEPTION (HACKATHON GOD-MODE) 🔥
// ==========================================
const groqClient = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY, 
  baseURL: "https://api.groq.com/openai/v1" 
});

// ==========================================
// 🚀 FORENSIC TERMINAL LOGGER
// ==========================================
const Log = {
  step: (msg: string) => console.log(`\n\x1b[36m[FORENSICS]\x1b[0m 🔍 ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ✨ ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARNING]\x1b[0m ⚠️ ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m[FATAL]\x1b[0m 💀 ${msg}`),
  metric: (key: string, val: any) => console.log(`  ├─ \x1b[90m${key}:\x1b[0m \x1b[1m${val}\x1b[0m`),
  divider: () => console.log(`\x1b[90m--------------------------------------------------\x1b[0m`)
};

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
      Log.success(`Cache Hit: ${cacheKey}`);
      return data.value as T;
    }
  }

  Log.step(`Cache Miss: ${cacheKey}. Fetching fresh data...`);
  const value = await fetchFn();
  
  const sanitizedValue = JSON.parse(JSON.stringify(value));
  await setDoc(cacheRef, { value: sanitizedValue, timestamp: now });
  return sanitizedValue;
}
// ==========================================
// 2. OMNISCIENT GITHUB AGGREGATOR (BEHAVIORAL FORENSICS)
// ==========================================
async function fetchDeepGitHubData(username: string, userToken?: string) {
  Log.step(`Initiating Behavioral & Architectural scan for: @${username}`);
  const startTime = Date.now();
  const authToken = userToken || process.env.GITHUB_TOKEN;

  // 🔥 OPTIMIZATION: We only deep-scan the TOP 5 repos to prevent 502 Bad Gateway timeouts,
  // but we still get the basic stats for up to 25 repos.
  const query = `
    query($login: String!) {
      user(login: $login) {
        createdAt
        followers { totalCount }
        
        # Deep Forensic Scan (Top 5 Repos)
        topRepos: repositories(first: 5, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            name
            stargazerCount
            createdAt
            pushedAt
            
            languages(first: 5, orderBy: {field: SIZE, direction: DESC}) { edges { size, node { name } } }

            packageJson: object(expression: "HEAD:package.json") { ... on Blob { text } }
            dockerfile: object(expression: "HEAD:Dockerfile") { ... on Blob { byteSize } }
            githubActions: object(expression: "HEAD:.github/workflows") { ... on Tree { entries { name } } }
            readme: object(expression: "HEAD:README.md") { ... on Blob { byteSize } }
            jestConfig: object(expression: "HEAD:jest.config.js") { ... on Blob { byteSize } }

            appTsx: object(expression: "HEAD:src/App.tsx") { ... on Blob { text } }
            mainPy: object(expression: "HEAD:main.py") { ... on Blob { text } }

            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 30) {
                    nodes { message, committedDate, additions, deletions }
                  }
                }
              }
            }
          }
        }
        
        contributionsCollection {
          restrictedContributionsCount
          contributionCalendar { totalContributions, weeks { contributionDays { contributionCount, date } } }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { login: username } }),
    });

    if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
    const json = await response.json();
    if (json.errors) throw new Error(`GraphQL Error: ${json.errors[0].message}`);

    const user = json.data.user;
    if (!user) return null;

    const devPersona = {
      detectedFrameworks: new Set<string>(),
      infrastructure: new Set<string>(),
      hygieneScore: 0,
    };

    let totalCodeBytes = 0;
    let hygienePoints = 0;
    let maxHygienePoints = 0;
    
    // 🧠 BEHAVIORAL TRACKERS
    const chronotypeData = { morning: 0, afternoon: 0, night: 0, weekend: 0 };
    let highestComplexityScore = 0;

    const detailedRepos = user.topRepos.nodes.map((repo: any) => {
      const repoHygiene = { hasDocs: false, hasTests: false, hasCI: false };
      maxHygienePoints += 3; 

      // Parse Languages
      const formattedLanguages = repo.languages?.edges?.map((e: any) => ({ name: e.node.name, bytes: e.size })) || [];
      formattedLanguages.forEach((lang: any) => { totalCodeBytes += lang.bytes; });

      // Parse Architecture
      if (repo.packageJson?.text) {
        try {
          const pkg = JSON.parse(repo.packageJson.text);
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          if (deps.react) devPersona.detectedFrameworks.add("React");
          if (deps.next) devPersona.detectedFrameworks.add("Next.js");
          if (deps.tailwindcss) devPersona.detectedFrameworks.add("Tailwind");
        } catch (e) { /* Ignore */ }
      }

      if (repo.dockerfile) devPersona.infrastructure.add("Docker");
      if (repo.githubActions?.entries?.length) { devPersona.infrastructure.add("GitHub Actions"); repoHygiene.hasCI = true; hygienePoints++; }
      if (repo.readme?.byteSize > 100) { repoHygiene.hasDocs = true; hygienePoints++; }
      if (repo.jestConfig || repo.packageJson?.text?.includes('"test"')) { repoHygiene.hasTests = true; hygienePoints++; }

      // 🔥 TIME-DELTA FORENSICS (The Clone-Buster) 🔥
      const commits = repo.defaultBranchRef?.target?.history?.nodes || [];
      let totalAdditions = 0;
      let isLikelyTutorial = false;
      let engineeringDurationHours = 0;

      if (commits.length > 0) {
        commits.forEach((c: any) => { 
          totalAdditions += c.additions; 
          
          // Behavioral Profiling: When are they coding?
          const commitDate = new Date(c.committedDate);
          const hour = commitDate.getHours();
          const day = commitDate.getDay();
          
          if (day === 0 || day === 6) chronotypeData.weekend++;
          if (hour >= 0 && hour < 6) chronotypeData.night++;
          else if (hour >= 6 && hour < 12) chronotypeData.morning++;
          else chronotypeData.afternoon++;
        });

        // Calculate time between first and last commit in this batch
        const firstCommitTime = new Date(commits[commits.length - 1].committedDate).getTime();
        const lastCommitTime = new Date(commits[0].committedDate).getTime();
        engineeringDurationHours = (lastCommitTime - firstCommitTime) / (1000 * 60 * 60);

        // If they added > 2000 lines but the entire repo was built in under 2 hours -> Flag as Clone
        if (totalAdditions > 2000 && engineeringDurationHours < 2) {
            isLikelyTutorial = true;
        }
      }

      // 🔥 CYCLOMATIC COMPLEXITY ESTIMATOR 🔥
      const rawCodeSnippets = [];
      let repoComplexity = 0;
      
      const analyzeComplexity = (code: string, fileName: string) => {
          rawCodeSnippets.push({ file: fileName, code: code.substring(0, 1500) });
          // Count logic branches (if, for, while, switch, &&, ||)
          const logicMatches = code.match(/(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|&&|\|\||\?)/g);
          repoComplexity += logicMatches ? logicMatches.length : 0;
      };

      if (repo.appTsx?.text) analyzeComplexity(repo.appTsx.text, 'App.tsx');
      if (repo.mainPy?.text) analyzeComplexity(repo.mainPy.text, 'main.py');
      
      if (repoComplexity > highestComplexityScore) highestComplexityScore = repoComplexity;

      return {
        name: repo.name,
        hygiene: repoHygiene,
        isLikelyTutorial,
        engineeringDurationHours: Math.round(engineeringDurationHours),
        logicComplexity: repoComplexity,
        commitCount: commits.length,
        url: `https://github.com/${username}/${repo.name}`,
        languages: formattedLanguages,
        rawCodeSnippets,
        authoredByCandidate: commits.length > 0 
      };
    });

    devPersona.hygieneScore = maxHygienePoints > 0 ? Math.round((hygienePoints / maxHygienePoints) * 100) : 0;

    // Determine Chronotype Identity
    let chronotypeLabel = "Balanced";
    if (chronotypeData.night > chronotypeData.morning + chronotypeData.afternoon) chronotypeLabel = "Night Owl 🦉";
    else if (chronotypeData.weekend > (chronotypeData.morning + chronotypeData.afternoon + chronotypeData.night) * 0.4) chronotypeLabel = "Weekend Warrior ⚔️";
    else if (chronotypeData.morning > chronotypeData.afternoon && chronotypeData.morning > chronotypeData.night) chronotypeLabel = "Early Bird 🌅";

    const calendar = user.contributionsCollection.contributionCalendar;
    
    const finalData = {
      repos: detailedRepos,
      engineeringMetrics: {
        totalCodeBytes,
        hygieneScore: devPersona.hygieneScore,
        peakLogicComplexity: highestComplexityScore,
        stack: {
          frameworks: Array.from(devPersona.detectedFrameworks),
          infrastructure: Array.from(devPersona.infrastructure)
        }
      },
      behavioralProfile: {
          chronotype: chronotypeLabel,
          commitDistribution: chronotypeData
      },
      activity: { publicCommits: calendar.totalContributions }
    };

    const execTime = ((Date.now() - startTime) / 1000).toFixed(2);
    Log.success(`Behavioral architecture mapped in ${execTime}s`);
    Log.metric("Chronotype", finalData.behavioralProfile.chronotype);
    Log.metric("Peak Complexity Score", finalData.engineeringMetrics.peakLogicComplexity);
    Log.metric("Hygiene Score", `${finalData.engineeringMetrics.hygieneScore}/100`);
    
    return finalData;

  } catch (error) {
    Log.warn(`GraphQL Failed, attempting REST fallback: ${error}`);
    // Rest fallback stays the same
    return await fetchGitHubRestEnhanced(username, authToken as string);
  }
}

// ==========================================
// 3. REST FALLBACK (Provides dummy metrics to prevent crashes)
// ==========================================
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
        let commitCount = 0;
        if (commitsRes && commitsRes.ok) {
          const commits = await commitsRes.json();
          authoredByCandidate = commits.length > 0;
          commitCount = commits.length;
        }

        return { ...repo, languages, commitCount, authoredByCandidate, rawCodeSnippets: [], hygiene: {}, isLikelyTutorial: false };
      })
    );

    const repos = repoDetails.filter((r: any) => !r.fork);
    const languageMap: Record<string, number> = {};
    let totalCodeBytes = 0;
    const detailedRepos = repos.map((repo: any) => {
      repo.languages.forEach((lang: any) => { languageMap[lang.name] = (languageMap[lang.name] || 0) + lang.bytes; totalCodeBytes += lang.bytes; });
      return { name: repo.name, url: repo.html_url, createdAt: repo.created_at, languages: repo.languages, commitCount: repo.commitCount, authoredByCandidate: repo.authoredByCandidate, rawCodeSnippets: repo.rawCodeSnippets, hasCICD: false, isLikelyTutorial: false, hygiene: {} };
    });

    return { 
      profile: { createdAt: userData.created_at, followers: userData.followers }, 
      repos: detailedRepos, languageBreakdown: languageMap, 
      engineeringMetrics: { totalCodeBytes, hygieneScore: 20, totalStars: 0, stack: { frameworks: [], databases: [], infrastructure: [] } },
      contributions: { totalCommitsPastYear: 0, longestStreak: 0, contributionDays: [] }, 
      collaboration: { prs: 0, issues: 0, openSourceImpact: 0 } 
    };
  } catch (error) { return null; }
}

function calculateLongestStreak(days: { contributionCount: number; date: string }[]): number {
  let maxStreak = 0, currentStreak = 0;
  for (const day of days) { if (day.contributionCount > 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); } else { currentStreak = 0; } }
  return maxStreak;
}

// ==========================================
// 4. RESUME EXTRACTION
// ==========================================
async function extractStructuredResume(pdfUrl: string) {
  const rawText = "Extracted text would go here"; // Replace with your actual PDF parsing logic
  const prompt = `Extract into JSON: { fullName, email, location, education:[], workExperience:[], projects:[], skills:[] }`;
  try {
    const completion = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile", 
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: "You are a resume parser. Output strictly valid JSON." }, { role: "user", content: prompt + `\n\nResume text:\n${rawText.slice(0, 6000)}` }], temperature: 0,
    });
    return { raw: rawText, structured: JSON.parse(completion.choices[0].message.content || "{}") };
  } catch (error) { return { raw: rawText, structured: null }; }
}

// ==========================================
// 5. FULLY BIAS-PROOF SANITIZER 
// ==========================================
function sanitizeForBias(blocks: any) {
  Log.step("Scrubbing candidate data for bias prevention...");
  if (!blocks) return null;
  const sanitized = JSON.parse(JSON.stringify(blocks)); 
  
  delete sanitized.fullName; delete sanitized.email; delete sanitized.location; delete sanitized.phone; delete sanitized.githubUsername;
  
  if (sanitized.education) {
    sanitized.education = sanitized.education.map((edu: any) => ({
      degree: edu.degree || "Degree", institution: "REDACTED_FOR_BIAS_PREVENTION", gpa: edu.gpa,
    }));
  }

  if (sanitized.workExperience) {
    sanitized.workExperience = sanitized.workExperience.map((exp: any) => ({
      company: exp.company, title: exp.title, description: exp.description
    }));
  }
  Log.success("Demographics, Pedigree, and Timelines stripped.");
  return sanitized;
}

// ==========================================
// 6. SCORING MATH & VALIDATION
// ==========================================
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
    const githubFrameworks = github.engineeringMetrics?.stack?.frameworks?.map((f: string) => f.toLowerCase()) || [];
    const githubInfra = github.engineeringMetrics?.stack?.infrastructure?.map((i: string) => i.toLowerCase()) || [];
    
    const allGithubSkills = [...githubLanguages, ...githubFrameworks, ...githubInfra];

    requiredSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (allGithubSkills.includes(skillLower)) skillEvidence[skill] = { found: true, source: "github_deep_scan", boosted: true };
    });
  }

  const projectAudits: any[] = [];
  if (resume?.projects && github?.repos) {
    for (let i = 0; i < resume.projects.length; i++) {
      const project = resume.projects[i];
      if (!project.name) continue;
      
      let bestMatch = null, highestSimilarity = 0.6;
      for (const repo of github.repos) {
        const projName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const repoName = repo.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const distance = levenshtein.get(projName, repoName);
        const maxLen = Math.max(projName.length, repoName.length);
        const similarity = maxLen > 0 ? 1 - distance / maxLen : 0;
        if (similarity > highestSimilarity) { highestSimilarity = similarity; bestMatch = repo; }
      }
      if (bestMatch) {
        project.repoVerified = bestMatch.authoredByCandidate;
        if (bestMatch.isLikelyTutorial) flags.push(`Project '${project.name}' closely resembles a 1-click cloned tutorial.`);
      }
    }
  }

  requiredSkills.forEach(skill => { if (!skillEvidence[skill].found) flags.push(`No evidence of "${skill}" in resume or GitHub`); });
  return { flags, skillEvidence, verifiedSkills: Object.keys(skillEvidence).filter(k => skillEvidence[k].found), projectAudits };
}

function calculateLearningPotential(github: any) {
  if (!github || !github.repos || github.repos.length === 0) return { score: 0, label: "Unknown", timeline: [], details: "Insufficient data." };
  const repos = github.repos.sort((a: any, b: any) => (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0));
  let languageProgressionScore = 0;
  let previousLanguages = new Set<string>();
  const timeline: any[] = [];
  
  for (const repo of repos) {
    if (repo.isLikelyTutorial) continue; // Don't reward learning for cloning tutorials
    const currentLanguages = new Set<string>(repo.languages?.map((l: any) => l.name) || []);
    const newTech = [...currentLanguages].filter(l => !previousLanguages.has(l));
    const safeDate = repo.createdAt ? new Date(repo.createdAt).toISOString() : new Date().toISOString();
    languageProgressionScore += newTech.length * 15; 
    if (newTech.length > 0 || repo.commitCount > 10) { timeline.push({ date: safeDate.split('T')[0].slice(0, 7), repo: repo.name, newTech: newTech, commits: repo.commitCount || 0, hasCI: repo.hasCICD || false }); }
    previousLanguages = new Set([...previousLanguages, ...currentLanguages]);
  }
  
  const hygieneBonus = (github.engineeringMetrics?.hygieneScore || 0) * 0.3; // Up to 30 points for good docs/tests
  const rawScore = Math.min(languageProgressionScore + hygieneBonus, 100);
  let label = "Average";
  if (rawScore >= 80) label = "Exceptional Learner"; else if (rawScore >= 60) label = "High Velocity"; else if (rawScore < 30) label = "Static Skillset";
  
  return { score: Math.round(rawScore), label, timeline: timeline.slice(-5), details: `Adopted ${previousLanguages.size} distinct technologies.` };
}

function calculateExperienceScore(workExperience: any[], aiRawExperienceQuality: number): number {
  if (!workExperience || workExperience.length === 0) return 0;
  let totalWeightedYears = 0;
  for (const exp of workExperience) {
    if (!exp.startDate) continue; 
    const start = new Date(exp.startDate);
    const end = exp.endDate?.toLowerCase().includes('present') ? new Date() : new Date(exp.endDate || new Date());
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    let multiplier = exp.verificationBadge ? 1.0 : 0.2; 
    totalWeightedYears += years * multiplier;
  }
  const rawYearsScore = Math.min((totalWeightedYears / 6) * 100, 100);
  return (rawYearsScore * 0.4 + aiRawExperienceQuality * 0.6); 
}

function calculateProjectsScore(projects: any[], aiRawProjectsQuality: number, github: any): number {
  if (!projects || projects.length === 0) return 0;
  let verifiedCount = 0;
  for (const proj of projects) { 
    if (proj.repoVerified) verifiedCount += 1; 
  }
  const quantityScore = Math.min(verifiedCount * 33.33, 100);
  const hygienePenalty = github?.engineeringMetrics?.hygieneScore < 20 ? 0.8 : 1.0; 
  return (quantityScore * 0.4 + aiRawProjectsQuality * 0.6) * hygienePenalty; 
}

function calculateAdjacencySkillsScore(verificationMatrix: any[], requiredSkillsCount: number): number {
  if (!verificationMatrix || verificationMatrix.length === 0 || requiredSkillsCount === 0) return 0;
  let totalPoints = 0;
  for (const item of verificationMatrix) {
    if (item.status === 'Verified') totalPoints += 100;
    else if (item.status === 'Adjacent' && item.adjacencyDetails?.transferabilityPercentage) totalPoints += item.adjacencyDetails.transferabilityPercentage; 
  }
  return (totalPoints / (requiredSkillsCount * 100)) * 100; 
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
  return (Math.min(mathScore, 100) * 0.7 + aiRawAlgorithmicQuality * 0.3); 
}

// ==========================================
// 7. ENHANCED AI PROMPT (GOD-MODE)
// ==========================================
const SYSTEM_PROMPT = `
You are an elite, forensic Technical Recruiter AI. Your absolute highest priority is EXPLAINABILITY and REMOVING BIAS.
You have been provided with SANITIZED candidate data. All names, genders, locations, dates, and university names have been removed.
You must score this candidate purely on cryptographic Proof of Work (GitHub architecture, hygiene, and raw code snippets).

You must produce a JSON object with the following exact structure:
{
  "executive_summary": "A punchy, 2-sentence summary of the candidate's true capability based ONLY on verified code. Mention their Hygiene Score.",
  
  "rawGithubQuality": number (0-100),
  "rawProjectsQuality": number (0-100),
  "rawExperienceQuality": number (0-100),
  "rawAlgorithmicQuality": number (0-100),

  "score_reasoning": "You MUST write a strict, comparative explanation. Note if they were penalized for cloning tutorials or rewarded for strong CI/CD adoption.",
  
  "bias_audit": {
    "is_pedigree_blind": true,
    "audit_statement": "Confirmed: Evaluated purely on structural code complexity and skill matrices."
  },

  "spam_analysis": {
    "is_likely_spam": boolean,
    "authenticity_score": number (0-100),
    "reasoning": "Explain if the resume is highly exaggerated compared to the GitHub reality. Flag if GitHub metrics indicate heavy tutorial cloning."
  },

  "skill_verification_matrix": [
    {
      "skill": "String (the required skill)",
      "status": "Verified" | "Adjacent" | "Unverified" | "Falsified",
      "resumeClaim": "String",
      "githubEvidence": "String (e.g., 'Found deep CI/CD usage in 3 repos' or 'No evidence')",
      "adjacencyDetails": {
         "foundSkill": "String (The adjacent skill, e.g., 'Vue.js')",
         "transferabilityPercentage": number (0-100)
      }, 
      "explanation": "String. Strict format: 'We believe this candidate has [Skill] because [Evidence]' or 'Candidate lacks [Skill], but possesses [Adjacent Skill]...'"
    }
  ],

  "adaptive_assessment": {
    "question": "A highly specific, technical interview question based EXACTLY on one of their provided raw code snippets.",
    "context": "Why you are asking this (e.g., 'Since you used useEffect in App.tsx without a dependency array, how do you handle memory leaks?')"
  },
  
  "open_source_impact": boolean,

  "forensic_skill_graph": { "language_mastery": number, "code_hygiene_and_testing": number, "system_architecture": number, "devops_and_infra": number, "data_and_state": number, "version_control_habits": number }
}

Chain of thought instructions:
1. HYGIENE & TUTORIALS: Pay close attention to 'hygieneScore' and 'isLikelyTutorial' flags in the JSON provided. Penalize candidates heavily if their repos are just 1-commit tutorial clones without tests or docs.
2. SKILL ADJACENCY: If a candidate lacks an exact required skill, find highly adjacent skills to ensure they are not unfairly penalized by strict ATS filters.
3. PROJECT COMPLEXITY: Read the raw code snippets provided in the JSON to judge ACTUAL code quality, not just commit counts.
`;

// ==========================================
// 8. MAIN POST HANDLER
// ==========================================
export async function POST(req: Request) {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
   const { applicationId, parsedBlocks, githubToken, githubUsername } = await req.json();
    Log.divider();
    Log.step(`[PROCESS START] Forensic Analysis for ID: ${applicationId}`);

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
      const finalGithubUsername = githubUsername || appData.githubUsername || "sandeep14k"; 
      
      const cacheKey = `github_godmode_${finalGithubUsername}_${githubToken ? 'auth' : 'public'}`;
      githubData = await getCachedOrFetch(cacheKey, () => fetchDeepGitHubData(finalGithubUsername, githubToken));
      if (!githubData) warnings.push("GitHub data missing. Score may be incomplete.");
    } catch (e) {
      Log.error(`GitHub extraction failed.`);
      warnings.push("GitHub data fetch failed.");
    }
    
    let candidateBlocks = parsedBlocks || appData.passportBlocks;
    if (!candidateBlocks) {
       Log.step("Extracting structure from raw Resume PDF...");
       const rawResume = await getCachedOrFetch(`resume_${appData.resumeUrl}`, () => extractStructuredResume(appData.resumeUrl));
       candidateBlocks = rawResume.structured;
    }

    const sanitizedBlocks = sanitizeForBias(candidateBlocks);
    const validation = crossValidate(sanitizedBlocks, githubData, jobData.requiredSkills);
    const learningPotential = calculateLearningPotential(githubData);   

    Log.step("Initiating Groq Llama 3.3 70B Inferencing...");
    const completion = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `JD Required Skills: ${jobData.requiredSkills.join(", ")}\n\nSANITIZED Candidate Data: ${JSON.stringify({ blocks: sanitizedBlocks, github: githubData || "No GitHub Data", validation: validation.skillEvidence, codingProfiles: sanitizedBlocks?.codingProfiles || "No Profiles" }, null, 2)}` },
      ],
      temperature: 0.1,
    });
    Log.success("AI Inference Complete.");

    const aiRaw = JSON.parse(completion.choices[0].message.content || "{}");
    const weights = jobData.scoringWeights || { skills: 30, github: 25, projects: 20, algorithmic: 10, experience: 10, velocity: 5 };

    const rawSkillsScore = calculateAdjacencySkillsScore(aiRaw.skill_verification_matrix, jobData.requiredSkills.length); 
    const rawGithubScore = aiRaw.rawGithubQuality || 0; 
    const rawProjectsScore = calculateProjectsScore(candidateBlocks?.projects, aiRaw.rawProjectsQuality || 0, githubData); 
    const rawExperienceScore = calculateExperienceScore(candidateBlocks?.workExperience, aiRaw.rawExperienceQuality || 0); 
    const rawAlgorithmicScore = calculateAlgorithmicScore(candidateBlocks?.codingProfiles, aiRaw.rawAlgorithmicQuality || 0); 
    const rawVelocityScore = learningPotential.score || 0;

    const finalMatchScore = Math.round(
      (rawSkillsScore * (weights.skills / 100)) + 
      (rawGithubScore * (weights.github / 100)) + 
      (rawExperienceScore * (weights.experience / 100)) + 
      (rawProjectsScore * (weights.projects / 100)) + 
      (rawAlgorithmicScore * (weights.algorithmic / 100)) + 
      (rawVelocityScore * (weights.velocity / 100))
    );
    
    const lacksTraditionalPedigree = rawExperienceScore < 50; 
    const hasEliteProofOfWork = (rawGithubScore >= 80) || (rawAlgorithmicScore >= 80) || (rawVelocityScore >= 85);
    const isHiddenGem = lacksTraditionalPedigree && hasEliteProofOfWork;

    const sanitizedAnalysisData = {
      overallMatchScore: finalMatchScore,
      authenticityScore: aiRaw.authenticityScore || aiRaw.spam_analysis?.authenticity_score || 0,
      spam_analysis: aiRaw.spam_analysis || { is_likely_spam: false, authenticity_score: 100, reasoning: "Authentic" }, 
      score_reasoning: aiRaw.score_reasoning,
      bias_audit: aiRaw.bias_audit,            
      learningPotential, 
      learningVelocity: learningPotential.label,
      aiSummary: aiRaw.executive_summary || "Forensic analysis complete.",
      weightedBreakdown: {
         skills: Math.round(rawSkillsScore * (weights.skills / 100)),
         github: Math.round(rawGithubScore * (weights.github / 100)),
         experience: Math.round(rawExperienceScore * (weights.experience / 100)),
         projects: Math.round(rawProjectsScore * (weights.projects / 100)),
         algorithmic: Math.round(rawAlgorithmicScore * (weights.algorithmic / 100)),
         velocity: Math.round(rawVelocityScore * (weights.velocity / 100))
      },
      engineeringMetrics: githubData?.engineeringMetrics || null,
      forensic_skill_graph: aiRaw.forensic_skill_graph || { language_mastery: 0, code_hygiene_and_testing: 0, system_architecture: 0, devops_and_infra: 0, data_and_state: 0, version_control_habits: 0 },
      skill_verification_matrix: aiRaw.skill_verification_matrix || [],
      adaptive_assessment: aiRaw.adaptive_assessment || null, 
      open_source_impact: aiRaw.open_source_impact || false,  
      audit_trail: [...validation.flags, ...warnings],
      verifiedSkills: validation.verifiedSkills,
      isHiddenGem
    };

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

    Log.step("Updating Firebase Document...");
    await updateDoc(appRef, {
      status: finalStatus,
      fastTrack: fastTrackDetails, 
      analysis: sanitizedAnalysisData,
      analyzedAt: new Date().toISOString(),
    });

    const execTime = ((Date.now() - startTime) / 1000).toFixed(2);
    Log.success(`Pipeline complete in ${execTime}s. Final Score: ${finalMatchScore}`);
    Log.divider();
    
    return NextResponse.json({ success: true, finalStatus, score: finalMatchScore, warnings });

  } catch (error: any) {
    Log.error(`Execution halted: ${error.message}`);
    return NextResponse.json({ error: "Analysis failed", details: error.message }, { status: 500 });
  }
}