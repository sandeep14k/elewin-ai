import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==========================================
// 1. DEEP GITHUB AGGREGATOR
// ==========================================
async function fetchDeepGitHubData(username: string) {
  console.log(`[GITHUB] Fetching profile for: ${username}`);
  try {
    // Fetch up to 30 recent repos
    const res = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=30`);
    if (!res.ok) {
      console.warn(`[GITHUB] Failed to fetch data. Status: ${res.status}`);
      return null;
    }
    const repos = await res.json();
    
    // Filter out forks (we only care about original code)
    const originalRepos = repos.filter((r: any) => !r.fork);
    
    // Aggregate languages and total code size
    const languageMap: Record<string, number> = {};
    let totalSize = 0;
    
    const detailedRepos = originalRepos.slice(0, 10).map((repo: any) => {
      if (repo.language) {
        languageMap[repo.language] = (languageMap[repo.language] || 0) + 1;
      }
      totalSize += repo.size;
      return {
        name: repo.name,
        language: repo.language,
        description: repo.description,
        pushed_at: repo.pushed_at,
        size: repo.size
      };
    });

    console.log(`[GITHUB] Found ${originalRepos.length} original repos. Top languages:`, Object.keys(languageMap));

    return {
      totalOriginalRepos: originalRepos.length,
      totalCodeSizeKB: totalSize,
      dominantLanguages: languageMap,
      recentProjects: detailedRepos
    };
  } catch (e) {
    console.error(`[GITHUB] Error:`, e);
    return null;
  }
}

// ==========================================
// 2. ROBUST PDF EXTRACTOR
// ==========================================
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

const SYSTEM_PROMPT = `
You are a ruthless, elite Code Auditor and Technical Recruiter. Your job is to uncover the truth about a candidate's actual abilities.

**FORENSIC DIRECTIVES:**
1. CROSS-EXAMINATION: Compare the [RESUME TEXT] against the [GITHUB DATA]. Look for lies. If the resume claims "Expert in Python" but the GitHub has zero Python repos, penalize them heavily.
2. COMMITMENT & PROOF OF WORK: Are they building real things or just cloning tutorials? Look at the 'totalOriginalRepos' and 'totalCodeSizeKB'.
3. ACADEMICS & EXPERIENCE: Read the resume text closely. Give credit for elite institutions, rigorous degrees, or impressive past roles.

**CHAIN OF THOUGHT REQUIRED:**
You MUST formulate an 'audit_trail' array first. Write down 3-4 specific observations comparing the resume claims to the GitHub reality BEFORE you assign any scores.

**OUTPUT FORMAT (STRICT JSON):**
{
  "audit_trail": [
    "Observation 1 (e.g., Claims 3 years React, GitHub confirms heavy TypeScript/React usage).",
    "Observation 2...",
    "Observation 3..."
  ],
  "overallMatchScore": number (0-100),
  "authenticityScore": number (0-100, low if they seem to be lying or cloning),
  "weightedBreakdown": { 
    "proofOfWork": number (0-100), 
    "experience": number (0-100), 
    "academics": number (0-100) 
  },
  "verifiedSkills": ["string"],
  "plagiarismFlags": ["string", "Empty if none"],
  "aiSummary": "A brutal, honest 2-sentence summary of your findings."
}
`;

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const { applicationId } = await req.json();
    console.log(`\n===========================================`);
    console.log(`[PROCESS START] Analyzing Application: ${applicationId}`);
    
    // Fetch App & Job Data
    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) throw new Error("Application not found");
    const appData = appSnap.data() as any;

    const jobRef = doc(db, "jobs", appData.jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");
    const jobData = jobSnap.data() as any;

    console.log(`[DB] Fetched Job Req: ${jobData.title} | Target Skills: ${jobData.requiredSkills.join(", ")}`);

    // Run deep extraction in parallel to save execution time
    const [githubData, resumeText] = await Promise.all([
      fetchDeepGitHubData(appData.githubUsername),
      extractResumeText(appData.resumeUrl) 
    ]);

    const promptData = `
      --- JOB REQUIREMENTS ---
      SKILLS: ${jobData.requiredSkills.join(", ")}
      LEVEL: ${jobData.experienceLevel}
      
      --- CANDIDATE RESUME TEXT ---
      ${resumeText}

      --- CANDIDATE GITHUB DATA ---
      ${JSON.stringify(githubData, null, 2)}
    `;

    console.log(`[OPENAI] Sending payload to GPT-4-Turbo...`);
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", 
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: promptData }
      ],
      temperature: 0.1, // Keep it cold and analytical
    });

    const responseText = completion.choices[0].message.content || "{}";
    const analysisResults = JSON.parse(responseText);

    console.log(`[OPENAI] Analysis Complete. Match Score: ${analysisResults.overallMatchScore}`);
    console.log(`[OPENAI] Audit Trail:`, analysisResults.audit_trail);

    // Save back to Firestore
    console.log(`[DB] Updating application document...`);
    await updateDoc(appRef, {
      status: "analyzed", 
      analysis: analysisResults
    });

    const endTime = Date.now();
    console.log(`[PROCESS END] Total execution time: ${(endTime - startTime) / 1000}s`);
    console.log(`===========================================\n`);

    return NextResponse.json({ success: true, logs: "Check server terminal for detailed breakdown." });

  } catch (error: any) {
    console.error(`[FATAL ERROR] Pipeline crashed:`, error.message);
    return NextResponse.json({ error: "Analysis failed", details: error.message }, { status: 500 });
  }
}