import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FREE_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com"];

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
        error: "Personal email providers are not allowed for corporate verification. Use your official work email." 
      }, { status: 403 });
    }

    // 2. AI DOMAIN AFFINITY CHECK
    console.log(`[VERIFY] AI checking if domain '@${domain}' belongs to '${companyName}'...`);
    const affinityCheck = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are a strict corporate domain auditor. Determine if an email domain belongs to a specific company." 
        },
        { 
          role: "user", 
          content: `Company Name: "${companyName}" | Email Domain: "${domain}". Is it highly probable that this domain belongs to this company? Respond strictly with JSON: { "belongs": boolean, "reason": "short explanation" }` 
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
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await setDoc(doc(db, "verifications", email), {
      otp,
      expiresAt,
      companyName
    });

    // 4. DUMMY TRANSMISSION (Console Log for testing)
    console.log(`\n===========================================`);
    console.log(`[SECURE TRANSMISSION] To: ${email}`);
    console.log(`[VERIFIED ORG]: ${companyName}`);
    console.log(`[CODE]: ${otp}`);
    console.log(`===========================================\n`);

    return NextResponse.json({ success: true, message: "OTP verified by AI and sent to console." });

  } catch (error: any) {
    console.error("[OTP FATAL]", error);
    return NextResponse.json({ error: "Validation service offline", details: error.message }, { status: 500 });
  }
}