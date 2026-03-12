import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==========================================
// 1. ADVANCED GITHUB FORENSICS
// ==========================================
async function fetchDeepForensicGitHub(username: string) {
  console.log(`\n[FORENSIC: GITHUB] Initializing Deep Scan for: ${username}`);
  try {
    // Stage 1: Profile and Repo Ingestion (Up to 40 repos for better data density)
    const repoRes = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&direction=desc&per_page=40`);
    if (!repoRes.ok) return { error: "Profile Not Found", signalScore: 0 };
    
    const repos = await repoRes.json();
    const originalRepos = repos.filter((r: any) => !r.fork);

    // Stage 2: Intelligence Extraction
    let totalSize = 0;
    const langStats: Record<string, number> = {};
    const repoSignals = originalRepos.map((repo: any) => {
      totalSize += repo.size;
      if (repo.language) langStats[repo.language] = (langStats[repo.language] || 0) + 1;
      
      return {
        id: repo.id,
        name: repo.name,
        description: repo.description,
        primary_lang: repo.language,
        stars: repo.stargazers_count,
        created: repo.created_at,
        last_push: repo.pushed_at,
        has_readme: !!repo.has_pages,
        size_kb: repo.size,
        // Heuristic for project complexity
        complexity_estimate: repo.size > 5000 ? "High" : repo.size > 1000 ? "Medium" : "Low"
      };
    });

    // Stage 3: Skill Density Calculation
    const dominantLangs = Object.entries(langStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang]) => lang);

    console.log(`[FORENSIC: GITHUB] Scan Complete. Found ${repoSignals.length} original projects.`);
    console.log(`[FORENSIC: GITHUB] Tech Stack Evidence: ${dominantLangs.join(", ")}`);

    return {
      metadata: {
        username,
        account_age: repos.length > 0 ? repos[repos.length -1].created_at : "Unknown",
        total_original_repos: repoSignals.length,
        total_kb: totalSize,
        skill_density: langStats,
        top_languages: dominantLangs
      },
      projects: repoSignals,
      activity_signal: repoSignals.length > 5 ? "Active Developer" : "Casual/Student Developer"
    };
  } catch (e) {
    console.error(`[FORENSIC: GITHUB] Critical Error:`, e);
    return null;
  }
}

// ==========================================
// 2. ENHANCED DOCUMENT INGESTION (PDF)
// ==========================================
async function extractDeepResumeText(pdfUrl: string) {
  console.log(`[FORENSIC: PDF] Ingesting Document Stream...`);
  let downloadUrl = pdfUrl;

  // Cloud Link Sanitization (Drive/Dropbox/Box)
  if (downloadUrl.includes("drive.google.com")) {
    const id = downloadUrl.match(/\/d\/(.*?)\//)?.[1];
    if (id) downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  } else if (downloadUrl.includes("dropbox.com")) {
    downloadUrl = downloadUrl.replace("dl=0", "dl=1");
  }

  try {
    const response = await fetch(downloadUrl);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      console.warn(`[FORENSIC: PDF] Non-PDF detected. Aborting parser.`);
      return "ALERT: The link provided returned a website/HTML instead of a document. Ignore resume scoring and focus on GitHub.";
    }

    const arrayBuffer = await response.arrayBuffer();
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    
    // Multi-page concatenation
    const { text } = await extractText(pdf, { mergePages: true });
    
    // Contextual Limiting (Save tokens, keep most relevant data)
    const cleaned = text?.replace(/\s\s+/g, ' ').trim().substring(0, 12000); 
    console.log(`[FORENSIC: PDF] Extraction Successful. Bytes processed: ${arrayBuffer.byteLength}`);
    return cleaned || "Empty Document Content.";
  } catch (error) {
    console.error(`[FORENSIC: PDF] Parser Crash:`, error);
    return "SYSTEM ERROR: Document was unreadable or encrypted.";
  }
}

// ==========================================
// 3. THE "TALENT SCOUT" NEURAL LOGIC
// ==========================================
const DEEP_AUDIT_PROMPT = `
You are the "EleWin Forensic Recruiter," a high-level AI designed to identify top-tier engineering talent by cross-referencing claims (Resume) with evidence (GitHub).

### STEP 1: CROSS-EXAMINATION (The "Truth" Test)
- Compare the [RESUME] tech stack with [GITHUB] language density. 
- If a candidate claims "Fullstack Developer" but has 0% Backend code on GitHub, flag it.
- Look for "Tutorial Hell": Are the repos just copies of popular YouTube tutorials? (Common names: "todo-app", "netflix-clone", "weather-app").

### STEP 2: MEASURING LEARNING POTENTIAL (Velocity)
- Analyze repo creation dates. 
- High Velocity: Moving from basic syntax to complex frameworks (e.g., Next.js, Docker, Kubernetes) within 6-12 months.
- Low Velocity: Same level of project complexity over several years.

### STEP 3: IDENTIFYING THE "HIDDEN GEM"
- Flag "isHiddenGem" as TRUE if:
  1. The candidate is from a Tier-3 or unknown college.
  2. The candidate has NO professional internship experience.
  3. BUT their GitHub shows "High Complexity" projects, high commit consistency, and deep architectural understanding.

### STEP 4: SOFTWARE MATURITY SCORE
- Evaluate README quality, folder structure description, and tech stack choice.
- Do they use environment variables? Do they use TypeScript? Do they have tests?

### OUTPUT SPECIFICATIONS (STRICT JSON ONLY):
{
  "audit_trail": [
    "A detailed, logical step-by-step audit of your findings.",
    "Observation on Resume vs GitHub discrepancy.",
    "Observation on Engineering Maturity (use of CI/CD, TS, etc.).",
    "Observation on Learning Velocity based on timestamps."
  ],
  "overallMatchScore": 0-100,
  "authenticityScore": 0-100, 
  "weightedBreakdown": {
    "proofOfWork": 0-100 (Code complexity/Originality),
    "professionalExperience": 0-100 (Internships/Roles),
    "academicRigor": 0-100 (College/Coursework),
    "learningVelocity": 0-100 (Speed of growth)
  },
  "skillGraph": {
    "frontend": 0-100,
    "backend": 0-100,
    "database": 0-100,
    "devops": 0-100,
    "architecture": 0-100
  },
  "isHiddenGem": boolean,
  "learningVelocityStatus": "High" | "Average" | "Low",
  "verifiedSkills": ["Skill A", "Skill B"],
  "fraudAlerts": ["Tutorial Clone Found", "Inflated Experience", "Skill Discrepancy"],
  "aiSummary": "A brutal, 2-sentence truth-only summary."
}
`;

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const { applicationId } = await req.json();
    console.log(`\n===========================================`);
    console.log(`[PIPELINE START] App ID: ${applicationId}`);

    // Data Hydration from Firestore
    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) throw new Error("Application data missing from DB.");
    const appData = appSnap.data() as any;

    const jobRef = doc(db, "jobs", appData.jobId);
    const jobSnap = await getDoc(jobRef);
    const jobData = jobSnap.data() as any;

    console.log(`[PIPELINE: JOB] Requirements: ${jobData.title}`);

    // Parallel Forensic Acquisition
    const [githubSignals, resumeText] = await Promise.all([
      fetchDeepForensicGitHub(appData.githubUsername),
      extractDeepResumeText(appData.resumeUrl)
    ]);

    // Construct Hyper-Context for AI
    const forensicContext = {
      target_role: {
        title: jobData.title,
        skills_required: jobData.requiredSkills,
        seniority: jobData.experienceLevel
      },
      candidate_evidence: {
        resume_claims: resumeText,
        github_evidence: githubSignals
      },
      system_rules: {
        penalize_clones: true,
        reward_architectural_depth: true,
        detect_growth_speed: true
      }
    };

    console.log(`[PIPELINE: AI] Invoking Forensic Auditor...`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DEEP_AUDIT_PROMPT },
        { role: "user", content: JSON.stringify(forensicContext) }
      ],
      temperature: 0, // Deterministic forensic mode
    });

    const finalAnalysis = JSON.parse(completion.choices[0].message.content || "{}");
    
    console.log(`[PIPELINE: SUCCESS] Analysis Complete.`);
    console.log(`[RESULT] Match: ${finalAnalysis.overallMatchScore}% | Gem: ${finalAnalysis.isHiddenGem}`);
    console.log(`[AUDIT] ${finalAnalysis.audit_trail[0]}`);

    // Perspective Update
    await updateDoc(appRef, {
      status: "analyzed",
      analysis: finalAnalysis,
      forensicLog: {
        processedAt: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        model: "gpt-4-turbo-forensic-v1"
      }
    });

    console.log(`[PIPELINE END] Total Process Time: ${(Date.now() - startTime) / 1000}s`);
    console.log(`===========================================\n`);

    return NextResponse.json({ 
      success: true, 
      metadata: { 
        match: finalAnalysis.overallMatchScore,
        isGem: finalAnalysis.isHiddenGem 
      } 
    });

  } catch (error: any) {
    console.error(`[CRITICAL FAILURE] Pipeline Halted:`, error.message);
    return NextResponse.json({ 
      error: "Analysis Failed", 
      reason: error.message 
    }, { status: 500 });
  }
}