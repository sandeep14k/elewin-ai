Deployed at - https://elewin-ai-i2dw.vercel.app

# 🛡️ EleWin: The Zero-Trust Hiring Matrix

Traditional Applicant Tracking Systems (ATS) rely on blind trust. Candidates exaggerate their resumes, and recruiters waste hours guessing who can actually write code.

**EleWin is an ATS Killer.**

It operates on a strict **Zero-Trust Philosophy**. We do not care what a candidate claims — we only care what they can **mathematically prove**.

By combining **AI-driven document forensics, corporate email validation, and deep GitHub GraphQL scraping**, EleWin forces candidates to submit **verifiable Proof of Work**.

If a claim isn't verified, it carries **0 weight** in the final AI Match Score.

---

# 🧠 Core Philosophy: Proof of Work (PoW)

EleWin breaks down a candidate's profile into structured **Blocks**:

- Experience  
- Projects  
- Academics  
- Skills  

Every professional claim must pass through our **verification gauntlet**.

---

# 🔺 Experience Verification Triangle

Proprietary enterprise experience cannot be scanned directly.  
Candidates must verify roles using **one of three paths**.

### Path A — The Alumni Check
AI validates that the provided **email domain belongs to the claimed company**.

A **6-digit OTP** is dispatched to that corporate inbox.

---

### Path B — Secure Document Vault
Candidate uploads a:

- Offer Letter  
- Payslip  

An **AI Auditor** scans the document **in volatile RAM** to match names and dates.

The file is **instantly purged** after verification.

Recruiters **never see the sensitive document**, only the **verification badge**.

---

### Path C — Public Proxy Weighting
If neither verification option is available, the AI uses the candidate's **open-source timeline**.

Example signals:

- GitHub commits during employment period
- Repo activity
- Language usage

This acts as a **mathematical authenticity proxy**.

---

# 🔎 GitHub Forensic Scraping

When a candidate links a repository, EleWin performs **deep forensic scraping** using the **GitHub GraphQL API**.

It analyzes:

- Last **30 repositories**
- File extensions
- Byte sizes
- Commit frequency
- Language usage

If verified, those skills receive a **1.5× mathematical weight boost**.

---

# 🪪 EleWin Passport

Candidates verify their professional blocks **once**.

These are stored in the **EleWin Passport Library**.

Future job applications allow candidates to:

- Inject pre-verified Proof of Work
- Apply instantly
- Skip re-verification

---

# ⚙️ AI Scoring Engine

EleWin enforces a **strict 100-Point Match Score** based on **deterministic math**, eliminating AI hallucination in candidate ranking.

| Signal | Weight | Logic |
|------|------|------|
| Skills Match | 30% | Exact match with job description. Boosted **1.5×** if backed by GitHub repo data |
| GitHub Quality | 25% | Code complexity, commit streaks, repo volume |
| Verified Experience | 20% | Scored based on verified months. Unverified roles receive **0 multiplier** |
| Verified Projects | 15% | Cross-referenced against GitHub profile |
| Academics | 5% | Institution tier and GPA evaluation |
| Velocity | 5% | Bonus points for strong language progression and commit trends |

---

## 🤖 Auto Shortlisting

Employers can set an **Auto-Shortlist Threshold** (example: **85/100**).

If a candidate reaches this score:

- System automatically sends **interview invite**
- Email delivered via **Calendly link**

---

# 🛠 Tech Stack

| Layer | Technology |
|------|------|
| Framework | Next.js 14 (App Router, React Server Components) |
| Database | Firebase v10 (Firestore) |
| Authentication | Firebase Auth |
| AI Engine | OpenAI API |
| Code Forensics | GitHub GraphQL API |
| PDF Parsing | unpdf |
| Styling | Tailwind CSS |
| UI | shadcn/ui |
| Charts | Recharts |
| Icons | Lucide |
| Email | Resend |

---

# 🚀 Project Setup

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/sandeep14k/elewin-ai
cd elewin
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Environment Variables

Create a `.env.local` file in the root directory.

```env
# --- FIREBASE CLIENT CONFIG ---
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project_id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# --- OPENAI CONFIG ---
OPENAI_API_KEY="sk-proj-your-openai-secret-key"

# --- GITHUB GRAPHQL CONFIG ---
GITHUB_TOKEN="ghp_your_github_personal_access_token"

# --- RESEND CONFIG ---
RESEND_API_KEY="re_your_resend_api_key"
```

---

# ▶ Run Development Server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# 🗺 User Workflows

## 👨‍💼 Employer (HR Admin)

### Create Job Post
Define:

- role
- required skills
- minimum experience

### Automation Rules
Set match score threshold (example **85/100**) and provide a **Calendly link**.

### Share Link
Distribute tracking link:

```
elewin.io/apply/company/job-id
```

### View Matrix
Watch the **Live Leaderboard** populate as candidates are ranked instantly.

---

# 👨‍💻 Candidate Workflow

### Intake
Upload:

- Job-specific PDF resume
- GitHub username

---

### AI Extraction
Engine extracts claims into structured blocks.

---

### Verification Gauntlet

Candidate verifies:

- proprietary experience (OTP or Document Vault)
- public GitHub projects

---

### Passport Sync
Verified blocks saved to **EleWin Passport** for future applications.

---

### Live Tracking
Candidate receives a unique dashboard URL to monitor:

- Match Score
- Shortlist status
- Interview invites

---

# 🔒 Zero-Trust Hiring

EleWin removes resume fraud by enforcing **Proof of Work verification** across all professional claims.

**If it cannot be verified, it does not count.**

---

# ⚡ EleWin

**Trust Nothing.  
Verify Everything.**