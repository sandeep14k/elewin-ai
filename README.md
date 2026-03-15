# 🛡️ EleWin: The Zero-Trust Hiring Matrix

**Deployed at:** https://elewin-ai-i2dw.vercel.app

Traditional Applicant Tracking Systems (ATS) rely on blind trust. Candidates exaggerate their resumes, and recruiters waste hours guessing who can actually write code.

**EleWin is an ATS Killer.**

It operates on a strict **Zero-Trust Philosophy**. We do not care what a candidate claims — we only care what they can **mathematically prove**.

By combining **AI-driven document forensics, corporate email validation, and Secure GitHub OAuth**, EleWin forces candidates to submit **verifiable Proof of Work**.

If a claim isn't verified, it carries **0 weight in the final AI Match Score.**

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

Proprietary enterprise experience cannot be scanned directly via public repositories.

Candidates must verify roles using one of three paths.

## Path A — The Corporate Authenticator

AI validates that the provided email domain belongs to the claimed company.

A **6-digit OTP** is dispatched to that corporate inbox to prove active employment.

---

## Path B — Secure Document Vault

Candidate uploads a:

- Offer Letter
- Payslip

An **AI Auditor** scans the document in **volatile RAM** to match names, dates, and companies.

The file is **instantly purged after verification**.

Recruiters **never see the sensitive document**, only the **verification badge**.

---

## Path C — Public Proxy Weighting

If neither verification option is available, the AI uses the candidate's **open-source timeline**.

Example signals:

- GitHub commits during employment period
- Repository activity
- Language usage

This acts as a **mathematical authenticity proxy**.

---

# 🕵️‍♂️ The "Anti-Cheat" Forensic Engine

When a candidate links their profile via **Secure GitHub OAuth**, EleWin performs **deep forensic extraction** bypassing standard API rate limits using the **GitHub GraphQL API**.

---

## 1. Dependency & CI/CD Auditing

We don't just look at GitHub's basic language stats.

Our GraphQL engine extracts **package.json blobs** to prove framework knowledge:

- React
- Next.js
- Jest

It also checks **.github/workflows** to verify real-world **DevOps and CI/CD experience**.

---

## 2. Plagiarism & Authorship Detection

EleWin uses **Levenshtein distance algorithms** to fuzzy-match claimed resume projects to actual GitHub repositories.

The AI checks the **isAuthoredByCandidate flag**.

If a candidate links a popular open-source repo they merely **forked without contributing**, their **Authenticity Score is heavily penalized**.

---

## 3. The 6-Dimensional Skill Graph

Instead of generic frontend/backend scores, EleWin generates an **enterprise-grade radar chart** based on repository data.

Dimensions include:

- Language Mastery
- Code Hygiene & Testing
- System Architecture
- DevOps & Infrastructure
- Data & State Management
- Version Control Habits

---

# 🪪 EleWin Passport

Candidates verify their professional blocks **once**.

These are stored permanently in the **EleWin Passport Library**.

Future job applications allow candidates to:

- Inject **pre-verified Proof of Work**
- Securely attach **GitHub OAuth token** for **1-click apply**
- Skip re-verification

---

# ⚙️ Quality-Weighted AI Scoring

EleWin enforces a strict **100-Point Match Score** based on deterministic math, eliminating AI hallucination in candidate ranking.

Complexity is weighted heavier than sheer quantity.

| Signal | Weight | Logic |
|------|------|------|
| Skills Match | 30% | Exact match with job description. Boosted **1.5×** if backed by deep GitHub repo data |
| GitHub Quality | 25% | AI evaluates architectural complexity, code hygiene, and commit volume |
| Verified Experience | 20% | Scored based on verified months. Unverified roles receive **0 multiplier** |
| Verified Projects | 15% | Capped quantity to prevent spam; **70% driven by AI-graded project complexity** |
| Academics | 5% | Uses **College Tier Normalization Curve** |
| Velocity | 5% | Bonus points for rapid language adoption and positive commit trends |

---

# 🤖 Auto Shortlisting & Pipeline

Employers can set an **Auto-Shortlist Threshold**.

Example: **85/100**

If a candidate reaches this score:

- System automatically sends **interview invite**
- Email delivered via **Calendly link**

---

# 🛠 Tech Stack

| Layer | Technology |
|------|------|
| Framework | Next.js 14 (App Router, React Server Components) |
| Database | Firebase v10 (Firestore) |
| Authentication | Firebase Auth (Email/Password & GitHub OAuth) |
| AI Engine | OpenAI API (GPT-4-Turbo) |
| Code Forensics | GitHub GraphQL API & REST API |
| Math Engine | fast-levenshtein |
| PDF Parsing | unpdf |
| Styling | Tailwind CSS |
| UI | shadcn/ui |
| Charts | Recharts |
| Email | Resend |

---

# 🚀 Project Setup

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/sandeep14k/elewin-ai
cd elewin
2️⃣ Install Dependencies
npm install
3️⃣ Environment Variables
Create a .env.local file in the root directory.
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
▶ Run Development Server
npm run dev
Open:
http://localhost:3000
🗺 User Workflows
👨‍💼 Employer (HR Admin)
Create Job Post
Define:
Role
Required skills
Minimum experience
Automation Rules
Set match score threshold (example 85/100) and provide a Calendly link.
Share Link
Distribute tracking link:
elewin.io/apply/company/job-id
View Matrix
Watch the Live Leaderboard populate as candidates are ranked instantly.
👨‍💻 Candidate Workflow
Intake
Upload:
Job-specific PDF Resume
Securely connect GitHub via OAuth
AI Extraction
Engine extracts claims into structured blocks.
Verification Gauntlet
Candidate verifies:
Proprietary experience (OTP or Document Vault)
Public GitHub projects
Passport Sync
Verified blocks saved to EleWin Passport for future 1-click applications.
Live Tracking
Candidate receives a unique dashboard URL to monitor:
Match Score
Shortlist status
Live Forensic Skill Graph
Interview invites
🔒 Zero-Trust Hiring
EleWin removes resume fraud by enforcing Proof of Work verification across all professional claims.
If it cannot be verified, it does not count.
⚡ EleWin
Trust Nothing.
Verify Everything.