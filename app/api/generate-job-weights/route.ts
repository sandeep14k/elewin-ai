import { NextResponse } from "next/server";
import OpenAI from "openai";

const groqClient = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY, // Ensure this is in your .env
  baseURL: "https://api.groq.com/openai/v1" 
});

export async function POST(req: Request) {
  try {
    const { title, description, experienceLevel, requiredSkills } = await req.json();

    const prompt = `
    You are an elite Technical Recruiting AI. 
    Analyze the following Job Description and determine the optimal scoring weights for evaluating candidates.
    Distribute exactly 100 points across these 6 categories based on what matters most for this specific role:
    
    1. "skills": Direct match of required technical skills.
    2. "github": Complexity of GitHub architecture, CI/CD, and code hygiene. (High for core engineering)
    3. "projects": Completed projects and portfolio. (High for Frontend/Fullstack)
    4. "algorithmic": LeetCode/Codeforces stats. (High for Backend, Data, Crypto, or Quant roles)
    5. "experience": Verified years of work history. (High for Lead/Manager roles, low for Junior)
    6. "velocity": Learning Potential Index / speed of adopting new tech. (Always keep between 5-10)

    Job Title: ${title}
    Experience Level: ${experienceLevel}
    Skills: ${requiredSkills.join(", ")}
    Description: ${description.substring(0, 1000)}

    Output STRICTLY as a JSON object with the keys: skills, github, projects, algorithmic, experience, velocity. 
    The values must be integers that sum exactly to 100.
    `;

    // 🔥 Using Groq's Llama 3.1 for instant JSON generation 🔥
    const completion = await groqClient.chat.completions.create({
      model: "llama-3.1-70b-versatile", 
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const weights = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Fallback safeguard if AI math fails
    const total = Object.values(weights).reduce((a: any, b: any) => a + b, 0);
    if (total !== 100) throw new Error("AI failed to sum to 100");

    return NextResponse.json({ success: true, weights });

  } catch (error: any) {
    console.error("[WEIGHT GEN ERROR]", error);
    // Fallback standard weights
    return NextResponse.json({ 
      success: true, 
      weights: { skills: 30, github: 25, projects: 20, algorithmic: 10, experience: 10, velocity: 5 } 
    });
  }
}