# 🛡️ EleWin: The Zero-Trust Hiring Matrix

**Deployed at:** https://elewin-ai-i2dw.vercel.app  

---

## 🚨 Problem

Traditional Applicant Tracking Systems (ATS) rely on **blind trust**.  
Candidates exaggerate resumes, and recruiters waste hours guessing who can *actually* write code.

---

## 💥 Solution

**EleWin is an ATS Killer.**

It operates on a strict **Zero-Trust Philosophy**:

> We do not care what a candidate claims — we only care what they can **mathematically prove**.

By combining:
- ⚡ Llama 3.3 AI document forensics  
- 🔐 Corporate email validation  
- 🧩 Secure GitHub OAuth  

EleWin forces candidates to submit **verifiable Proof of Work (PoW)**.

> ❌ If a claim isn't verified → it carries **0 weight** in the final AI Match Score.

---

## 🧠 Core Philosophy: Proof of Work (PoW)

EleWin breaks down every candidate into structured **Blocks**:

- Experience  
- Projects  
- Academics  
- Skills  
- Algorithms  

Each claim must pass a **verification gauntlet**.

---

## 🔺 The Verification Triangle

### 🅰️ Path A — Corporate Authenticator
- Validates email domain belongs to the company  
- Sends a **6-digit OTP** to corporate inbox  
- Prevents free-email spoofing  

---

### 🅱️ Path B — Secure Document Vault + Deepfake Detection
- Upload: Offer Letter / Payslip  

**Zero-Trust Processing:**
- Scanned in RAM  
- Instantly deleted  
- No recruiter access to sensitive PII  

**Deepfake Detection:**
- Llama 3.3 analyzes stylometry  
- Detects “robotic narrative stability” of AI-generated docs  
- Triggers **hard rejection** if suspicious  

---

### 🅲 Path C — Public Proxy Weighting
- Uses GitHub activity as authenticity proof  
- Checks:
  - Commit history  
  - Repo activity during employment  

---

### 🅳 Path D — Algorithmic Proof
- Links:
  - LeetCode  
  - Codeforces  
  - CodeChef  
  - HackerRank  

**Anti-impersonation:**
- Bio-verification handshake  
- Paste cryptographic hex code into profile  

---

## 🕵️‍♂️ Anti-Cheat Forensic Engine

### 🔍 GitHub Deep Analysis
- Uses GitHub GraphQL API  

**Checks include:**
- `package.json` → Framework validation (React, Next.js)  
- `.github/workflows` → CI/CD proof  

---

### 🧬 Plagiarism & Authorship Detection
- Uses **Levenshtein Distance**  
- Matches resume projects to GitHub repos  

Flags:
- Forked repos  
- Non-authored code  

---

### 🧠 Semantic Skill Adjacency
- No keyword matching  

Example:
- PostgreSQL requirement  
- MySQL expertise → **85% transferable score**

---

## 💎 Glass-Box AI & Bias-Free Hiring

### ⚖️ Live "What-If" Re-Ranking Engine
- Recruiters adjust sliders in real time:
  - Algorithms ↑  
  - Experience ↓  

✔ Instant leaderboard update  
✔ Visual explanation via stacked bar charts  

---

### 🎯 Dynamic JD-Adaptive Rubrics
- AI reads Job Description  
- Distributes **100 points across categories**:
  - Skills  
  - GitHub  
  - Projects  
  - DSA  
  - Experience  
  - Velocity  

---

### 🛡️ Pedigree-Blind Sanitizer
Before scoring, EleWin **removes bias at system level**:

- Name ❌  
- Email ❌  
- Gender ❌  
- Dates ❌  
- University → `REDACTED_FOR_BIAS_PREVENTION`  

> Bias is not reduced — it is **architecturally eliminated**.

---

## 📈 Learning Potential Index (LPI)

Tracks:
- Tech adoption timeline  
- Commit momentum  

Identifies:
> 🌟 **Hidden Gems** — low pedigree, high Proof of Work, high growth velocity  

---

## ⚙️ Tech Stack

| Layer            | Technology |
|------------------|-----------|
| Framework        | Next.js 14 (App Router, RSC) |
| Database         | Firebase v10 (Firestore) |
| Auth             | Firebase Auth + GitHub OAuth |
| AI               | Groq (Llama 3.3 70B) |
| Code Forensics   | GitHub GraphQL + REST API |
| Math Engine      | fast-levenshtein |
| PDF Parsing      | unpdf (in-memory) |
| Styling          | Tailwind CSS |
| Charts           | Recharts |

---

## 🚀 Project Setup

### 1️⃣ Clone Repository
```bash
git clone https://github.com/sandeep14k/elewin-ai.git
cd elewin-ai
```
## 3️⃣ Environment Variables

Create a `.env.local` file in the root directory:

```env
# --- FIREBASE ---
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project_id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# --- GROQ ---
GROQ_API_KEY="gsk_your_groq_api_key"

# --- GITHUB ---
GITHUB_TOKEN="ghp_your_github_token"

# --- SYSTEM ---
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

Open in browser:

    http://localhost:3000

------------------------------------------------------------------------

## 🗺 User Workflows

### 👨‍💼 Employer (Command Center)

- **Deploy Role:** Paste JD → AI generates scoring rubric  
- **Set Automation:** Auto-shortlist threshold + Calendly  
- **Evaluate:** Head-to-head forensic dashboard  

---

### 👨‍💻 Candidate (EleWin Passport)

- **Identity:** Upload resume + connect GitHub  
- **Verify:** Pass verification gauntlet  
- **Apply:** 1-click apply with Proof of Work  

---

## ⚡ Final Philosophy

> **Trust Nothing. Verify Everything.**