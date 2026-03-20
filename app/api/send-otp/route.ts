import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import OpenAI from "openai";

// ==========================================
// 🔥 GROQ INTERCEPTION 🔥
// Ultra-fast corporate domain auditing with Llama 3.1 70B
// ==========================================
const groqClient = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1" 
});

const FREE_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com", "me.com", "live.com"];

export async function POST(req: Request) {
  try {
    const { email, companyName } = await req.json();

    if (!email || !companyName) {
      return NextResponse.json({ error: "Missing email or company name" }, { status: 400 });
    }

    const domain = email.split("@")[1]?.toLowerCase();

    // 1. Hard Block Free Domains
    if (FREE_DOMAINS.includes(domain)) {
      return NextResponse.json({ 
        error: "Personal email providers are not allowed for corporate verification. Please use your official company email." 
      }, { status: 403 });
    }

    // 2. AI DOMAIN AFFINITY CHECK (Powered by Groq)
    console.log(`[VERIFY] Groq checking if domain '@${domain}' belongs to '${companyName}'...`);
    const affinityCheck = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { 
          role: "system", 
          content: "You are a strict corporate domain auditor. Determine if an email domain likely belongs to a specific organization. Be accurate with parent companies and subsidiaries." 
        },
        { 
          role: "user", 
          content: `Company Name: "${companyName}" | Email Domain: "${domain}". Does this domain likely belong to this company? Respond strictly with JSON: { "belongs": boolean, "reason": "short explanation" }` 
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(affinityCheck.choices[0].message.content || "{}");

    if (!result.belongs) {
      console.log(`[VERIFY] Rejected: ${result.reason}`);
      return NextResponse.json({ 
        error: `Domain validation failed. '@${domain}' does not appear to be an official domain for ${companyName}.` 
      }, { status: 403 });
    }

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minute expiry

    // Save to Firebase for the verification step
    await setDoc(doc(db, "verifications", email), {
      otp,
      expiresAt,
      companyName
    });

    // 4. SECURE LOGGING (Mocking the actual email send for the Hackathon)
    console.log(`\n===========================================`);
    console.log(`[SECURE TRANSMISSION] To: ${email}`);
    console.log(`[VERIFIED ORG]: ${companyName}`);
    console.log(`[CODE]: ${otp}`);
    console.log(`[STATUS]: Domain Affinity Confirmed by Llama 3.1`);
    console.log(`===========================================\n`);

    return NextResponse.json({ 
      success: true, 
      message: "Company domain verified. OTP has been dispatched to your corporate inbox." 
    });

  } catch (error: any) {
    console.error("[OTP FATAL]", error);
    return NextResponse.json({ error: "Domain validation service offline", details: error.message }, { status: 500 });
  }
}