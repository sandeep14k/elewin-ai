// app/api/ai-search/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI (Make sure OPENAI_API_KEY is in your .env.local)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are an expert Technical Recruiter AI for EleWin Recruit. 
Your job is to translate a user's natural language search query into a structured JSON filter object to query our database.

Our database ranks candidates on "Proof of Work" using these specific metrics:
- learningVelocity (0-100): How fast they learn. High velocity (>80) means "fast learner", "quick study", "high potential".
- codeQuality (0-100): How clean their code is. High quality (>85) means "clean code", "writes tests", "best practices", "senior level code".

**INSTRUCTIONS:**
1. Extract the primary job 'role' if mentioned (e.g., "Frontend Engineer", "Full-Stack Developer", "Data Scientist").
2. Extract specific technical 'requiredSkills' as an array of strings.
3. If the user asks for a "fast learner", "high potential", or "quick to adapt", set 'minVelocity' to 80 or 85.
4. If the user asks for "clean code", "good architecture", or "senior level quality", set 'minCodeQuality' to 85.
5. You MUST return ONLY a valid JSON object matching the exact structure below. Do not include markdown formatting or extra text.

**EXPECTED JSON OUTPUT FORMAT:**
{
  "role": "string or null",
  "minVelocity": number or null,
  "minCodeQuality": number or null,
  "requiredSkills": ["string", "string"]
}
`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Search prompt is required" }, { status: 400 });
    }

    // Call OpenAI to parse the natural language into structured filters
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // or gpt-3.5-turbo if you want to save costs on parsing
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Convert this search query into filters: "${prompt}"` }
      ],
      temperature: 0.1, // Keep it deterministic and strict
    });

    const responseContent = completion.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error("AI returned empty response");
    }

    const filters = JSON.parse(responseContent);

    // Clean up nulls to avoid passing undefined/null values to Firebase
    const cleanFilters: any = {};
    if (filters.role) cleanFilters.role = filters.role;
    if (filters.minVelocity) cleanFilters.minVelocity = filters.minVelocity;
    if (filters.minCodeQuality) cleanFilters.minCodeQuality = filters.minCodeQuality;
    if (filters.requiredSkills && filters.requiredSkills.length > 0) cleanFilters.requiredSkills = filters.requiredSkills;

    return NextResponse.json({ filters: cleanFilters });

  } catch (error: any) {
    console.error("[AI Search API] Error:", error);
    return NextResponse.json(
      { error: "Failed to parse search query. Please try again." }, 
      { status: 500 }
    );
  }
}