// app/api/verify-document/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // 1. Parse the incoming form data (File + expected claims)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const expectedCompany = formData.get("companyName") as string;
    
    if (!file || !expectedCompany) {
      return NextResponse.json({ error: "Missing file or company name" }, { status: 400 });
    }

    console.log(`\n===========================================`);
    console.log(`[SECURE VAULT] Verifying document for: ${expectedCompany}`);
    console.log(`[SECURE VAULT] File size: ${(file.size / 1024).toFixed(2)} KB. Processing in RAM only.`);

    // 2. Extract text from the PDF completely in memory
    const arrayBuffer = await file.arrayBuffer();
    const { extractText, getDocumentProxy } = await import("unpdf");
    
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Could not read text from document. Ensure it is not image-only." }, { status: 400 });
    }

    const cleanedText = text.replace(/\s+/g, ' ').substring(0, 6000); // Prevent token overflow

    // 3. The Forensic AI Prompt
    const prompt = `
You are a strict HR auditor. A candidate has uploaded a confidential employment document (Offer Letter, Payslip, or Experience Letter) to verify they worked at "${expectedCompany}".

Document Text:
"""
${cleanedText}
"""

Task: Verify if this document is a legitimate proof of employment for "${expectedCompany}".
Look for:
- The presence of the company name in official contexts (letterheads, signatory blocks).
- Indications of employment (salary, role, dates, "offer", "payslip").

Output strictly a JSON object with:
- "verified": boolean (true if it convincingly proves employment at ${expectedCompany}, false otherwise)
- "confidenceScore": number (0-100)
- "documentType": string ("Offer Letter", "Payslip", "Experience Letter", or "Unknown")
- "reasoning": string (1-2 sentences explaining why it passed or failed)
    `;

    console.log(`[SECURE VAULT] Sending to OpenAI Auditor...`);

    // 4. Send to GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a secure, unbiased document verification AI. Output JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0, 
    });

    const verificationResult = JSON.parse(completion.choices[0].message.content || "{}");

    const endTime = Date.now();
    console.log(`[SECURE VAULT END] Result: ${verificationResult.verified} | Time: ${(endTime - startTime) / 1000}s`);
    console.log(`===========================================\n`);

    // 5. Return the result (File is garbage-collected by Node.js, leaving no trace)
    return NextResponse.json(verificationResult);

  } catch (error: any) {
    console.error(`[SECURE VAULT FATAL]`, error);
    return NextResponse.json(
      { error: "Verification failed", details: error.message },
      { status: 500 }
    );
  }
}