import { NextResponse } from "next/server";
import OpenAI from "openai";

// ==========================================
// 🔥 GROQ INTERCEPTION 🔥
// Blazing fast resume parsing with Llama 3.1 70B
// ==========================================
const groqClient = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1" 
});

// --- Helper: Extract text directly from an uploaded File Buffer in RAM ---
async function extractTextFromBuffer(arrayBuffer: ArrayBuffer) {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });

    if (!text || text.trim().length === 0) return "No readable text found in PDF.";
    return text.replace(/\s+/g, ' ').substring(0, 6000); // Prevent token overflow
  } catch (error) {
    console.error(`[LIVE PARSE] Buffer Extraction error:`, error);
    return "Could not extract text due to document encryption or formatting.";
  }
}

// --- Helper: Extract text from a URL ---
async function extractTextFromUrl(pdfUrl: string) {
  console.log(`[LIVE PARSE] Processing URL: ${pdfUrl}`);
  let downloadUrl = pdfUrl;

  if (downloadUrl.includes("drive.google.com/file/d/")) {
    const match = downloadUrl.match(/\/d\/(.*?)\//);
    if (match && match[1]) downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  if (downloadUrl.includes("dropbox.com") && downloadUrl.includes("dl=0")) {
    downloadUrl = downloadUrl.replace("dl=0", "dl=1");
  }

  try {
    const response = await fetch(downloadUrl);
    if (response.headers.get("content-type")?.includes("text/html")) {
      return "Candidate provided a website or restricted link instead of a readable PDF.";
    }
    const arrayBuffer = await response.arrayBuffer();
    return await extractTextFromBuffer(arrayBuffer);
  } catch (error) {
    return "Could not fetch document from URL.";
  }
}

// --- MAIN HANDLER ---
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    let rawText = "";
    const contentType = req.headers.get("content-type") || "";

    // 1. Handle FormData (File Uploads or URLs)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const resumeUrl = formData.get("resumeUrl") as string | null;

      if (file && file.size > 0) {
        console.log(`\n===========================================`);
        console.log(`[LIVE PARSE START] Extracting Uploaded File: ${file.name}`);
        const buffer = await file.arrayBuffer();
        rawText = await extractTextFromBuffer(buffer);
      } else if (resumeUrl) {
        console.log(`\n===========================================`);
        console.log(`[LIVE PARSE START] Extracting URL`);
        rawText = await extractTextFromUrl(resumeUrl);
      } else {
        return NextResponse.json({ error: "No file or URL provided" }, { status: 400 });
      }
    } else {
      // 2. Fallback for pure JSON (Legacy URL input)
      const body = await req.json();
      if (!body.resumeUrl) return NextResponse.json({ error: "Missing input" }, { status: 400 });
      console.log(`\n===========================================`);
      console.log(`[LIVE PARSE START] Extracting JSON URL`);
      rawText = await extractTextFromUrl(body.resumeUrl);
    }

    if (rawText.startsWith("Candidate provided") || rawText.includes("Could not extract") || rawText.includes("No readable text")) {
      console.log(`[LIVE PARSE] Extraction failed or blocked.`);
      return NextResponse.json({ raw: rawText, structured: null });
    }

    // 3. Send raw text to Groq for structured conversion
    const prompt = `
    Extract the following information from the resume text into a strictly formatted JSON object.
    - fullName: string
    - email: string
    - phone: string
    - location: string
    - summary: string
    - education: array of { institution: string, degree: string, field: string, startDate: string, endDate: string, gpa: string }
    - workExperience: array of { company: string, title: string, startDate: string, endDate: string, description: string }
    - projects: array of { name: string, description: string, url: string | null }
    - skills: array of string

    CRITICAL: If a project does NOT have an explicit GitHub or live link, you MUST set 'url' to null.
    Resume text:
    ${rawText}
    `;

    console.log(`[LIVE PARSE] Sending to Groq/Llama for structuring...`);

    const completion = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an elite technical recruitment parser. Output strictly in JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const structured = JSON.parse(completion.choices[0].message.content || "{}");

    const endTime = Date.now();
    console.log(`[LIVE PARSE END] Time: ${(endTime - startTime) / 1000}s`);
    console.log(`===========================================\n`);

    return NextResponse.json({ raw: rawText, structured });

  } catch (error: any) {
    console.error(`[LIVE PARSE FATAL]`, error);
    return NextResponse.json({ error: "Live parsing failed", details: error.message }, { status: 500 });
  }
}