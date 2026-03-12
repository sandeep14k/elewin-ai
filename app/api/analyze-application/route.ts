import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER: GITHUB SCRAPER ---
// In a production app, you'd use a GitHub Personal Access Token to avoid rate limits.
async function fetchGitHubData(username: string) {
  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=5`);
    if (!res.ok) return null;
    const repos = await res.json();
    
    // Simplify the data so we don't blow up OpenAI's token limit
    const simplifiedRepos = repos.map((repo: any) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      size: repo.size,
      fork: repo.fork, // Critical for detecting copied work
      created_at: repo.created_at,
      pushed_at: repo.pushed_at,
    }));
    return simplifiedRepos;
  } catch (e) {
    console.error("GitHub fetch failed", e);
    return null;
  }
}

// --- OPENAI SYSTEM PROMPT ---
const SYSTEM_PROMPT = `
You are an elite Technical Recruiter AI for an Authenticity-First hiring platform.
Your job is to analyze a candidate's GitHub data and compare it against the Employer's Required Skills.

We heavily penalize "Copy-Pasted" or "One-Click Cloned" portfolios. We reward iterative, consistent coding.

**YOUR TASKS:**
1. Check if the candidate's GitHub repos actually use the "Required Skills".
2. Check the 'fork' status and dates. If a repo is a fork, or if massive repos were created and pushed on the exact same day, flag it as potential plagiarism or low authenticity.
3. Calculate an 'authenticityScore' (0-100). High scores mean original, iterative work.
4. Calculate an 'overallMatchScore' (0-100) comparing their GitHub languages/descriptions to the Required Skills.
5. Determine 'commitVelocity' (Low, Medium, High) based on how active they are.

**OUTPUT FORMAT (STRICT JSON):**
{
  "overallMatchScore": number,
  "authenticityScore": number,
  "verifiedSkills": ["string", "string"],
  "plagiarismFlags": ["string"],
  "commitVelocity": "Low" | "Medium" | "High",
  "aiSummary": "A strict 2-sentence summary of your findings."
}
`;

export async function POST(req: Request) {
  try {
    const { applicationId } = await req.json();
    if (!applicationId) return NextResponse.json({ error: "No Application ID provided" }, { status: 400 });

    // 1. Fetch the Application from Firebase
    const appRef = doc(db, "applications", applicationId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) throw new Error("Application not found");
    const appData = appSnap.data();

    // 2. Fetch the Job to get the Required Skills
    const jobRef = doc(db, "jobs", appData.jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");
    const jobData = jobSnap.data();

    // 3. Scrape GitHub
    const githubData = await fetchGitHubData(appData.githubUsername);
    if (!githubData) {
        // Handle case where GitHub is invalid or rate-limited
        await updateDoc(appRef, { status: "rejected", "analysis.aiSummary": "Failed to fetch GitHub profile." });
        return NextResponse.json({ error: "GitHub profile invalid" }, { status: 400 });
    }

    // 4. Send to OpenAI for Verification
    const promptData = `
      EMPLOYER REQUIRED SKILLS: ${jobData.requiredSkills.join(", ")}
      CANDIDATE GITHUB REPOS (Recent 5): ${JSON.stringify(githubData, null, 2)}
      
      Analyze this candidate's authenticity and skill match.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Needs a smart model for reasoning
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: promptData }
      ],
      temperature: 0.1,
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) throw new Error("AI failed to respond");
    
    const analysisResults = JSON.parse(aiResponse);

    // 5. Update the Application in Firebase with the AI Results
    await updateDoc(appRef, {
      status: "analyzed", // Move it out of pending!
      analysis: analysisResults
    });

    return NextResponse.json({ success: true, analysis: analysisResults });

  } catch (error: any) {
    console.error("[Analysis API Error]", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}