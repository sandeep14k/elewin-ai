import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are an elite Technical Recruiter AI. Your job is to analyze a candidate's public GitHub repositories and extract their "True Skill Graph".

Look at the repository names, descriptions, languages, and topics provided.

**RETURN A STRICT JSON OBJECT:**
{
  "verifiedSkills": ["Array of 5-8 specific technologies or architectural concepts demonstrated (e.g., 'Next.js', 'Microservices', 'REST APIs', 'PostgreSQL')"],
  "topLanguages": ["Top 3 programming languages"],
  "learningVelocity": number, // Score 0-100. High (80-100) if they have many diverse, complex projects. Medium (50-79) if projects are basic tutorials.
  "aiInsight": "A sharp, 1-2 sentence summary of what this candidate actually builds and where their strengths lie based on their code."
}
`;

export async function POST(req: Request) {
  try {
    const { userId, githubUsername } = await req.json();

    if (!userId || !githubUsername) {
      return NextResponse.json({ error: "Missing userId or GitHub username" }, { status: 400 });
    }

    // 1. Fetch data from GitHub API
    // Note: In production, add a GITHUB_TOKEN to headers to avoid rate limits
    const githubRes = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=15`);
    
    if (!githubRes.ok) {
        if (githubRes.status === 404) throw new Error("GitHub user not found");
        throw new Error("Failed to fetch from GitHub");
    }

    const repos = await githubRes.json();
    
    if (!repos || repos.length === 0) {
        return NextResponse.json({ error: "No public repositories found for this user." }, { status: 400 });
    }

    // 2. Clean and format the repo data for OpenAI
    // We only send the essential data to save tokens
    const repoSummary = repos.filter((r: any) => !r.fork).map((r: any) => ({
      name: r.name,
      description: r.description || "No description",
      language: r.language,
      topics: r.topics || [],
      updated_at: r.updated_at
    }));

    // 3. Send to OpenAI for Analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // or gpt-4o-mini
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze these repositories for user ${githubUsername}:\n\n${JSON.stringify(repoSummary)}` }
      ],
      temperature: 0.2,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) throw new Error("AI returned empty analysis");
    
    const analysisData = JSON.parse(responseContent);

    // 4. Save to Firebase User Profile
    const profileRef = doc(db, "user_profiles", userId);
    
    const updatedMetrics = {
        verifiedSkills: analysisData.verifiedSkills,
        topLanguages: analysisData.topLanguages,
        learningVelocity: analysisData.learningVelocity,
        aiInsight: analysisData.aiInsight,
        totalCommitsScanned: repos.length, // Rough metric for now
        graphGeneratedAt: Timestamp.now()
    };

    await updateDoc(profileRef, updatedMetrics);

    // 5. Return success to the UI
    return NextResponse.json({ success: true, data: updatedMetrics });

  } catch (error: any) {
    console.error("GitHub Analysis Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate identity graph" }, { status: 500 });
  }
}