Deployed at - https://elewin-ai-i2dw.vercel.app
# 🚀 EleWin: AI-Powered Forensic Talent Pipeline

**EleWin** is a high-fidelity technical recruitment platform designed to solve the "Resume Inflation" crisis. By cross-referencing candidate claims against live **GitHub GraphQL signals** and deep-parsing resumes, EleWin uncovers real skills, calculates learning potential, and identifies "Hidden Gems" that traditional hiring tools miss.

---

## 🛠 Features

### 1. Forensic Analysis Engine
* **Knowledge Mapping:** Automatically translates raw technical signals (e.g., Axios, Express, Dart) into high-level concepts (REST API, Mobile Development) to avoid keyword gaps.
* **Truth Verification:** Cross-examines Resume claims against GitHub evidence, flagging "High Discrepancies" where proof is missing.
* **Engineering Maturity Audit:** Scans commit history for "Tutorial Clones" and boilerplate code to identify original engineering work.

### 2. Intelligent Data Logic
* **Learning Velocity:** A proprietary metric that calculates growth speed by analyzing the technical complexity of projects over time.
* **Hidden Gem Protocol:** Automatically flags candidates from non-tier-1 backgrounds who demonstrate elite-tier coding abilities.
* **Skill Radar Graphs:** Real-time data visualization of a candidate's technical density across Frontend, Backend, DevOps, DB, and Architecture.

### 3. Enterprise-Grade Infrastructure
* **GitHub GraphQL Harvester:** Optimized scraping for deep data (commit messages, language bytes, and contribution trends) in a single request.
* **Firestore Forensic Caching:** A TTL (Time-To-Live) caching system that stores forensic results for 7 days to reduce API latency and OpenAI costs.
* **Color-Coded Terminal Logs:** Deep backend logs for real-time visibility into the data fetching and synthesis process.

---

## ⚙️ Setup & Environment

### 1. Prerequisites
* **Node.js** v18 or higher
* **Firebase Account** (Firestore, Storage, and Authentication)
* **OpenAI API Key** (GPT-4-turbo recommended)
* **GitHub Personal Access Token**

### 2. .env.local Configuration
Create a `.env.local` file in the root directory and add the following keys:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI & Scraper Keys
OPENAI_API_KEY=sk-proj-...
GITHUB_TOKEN=ghp_... # Classic PAT with 'public_repo' and 'read:user'

# Application Settings
NEXT_PUBLIC_BASE_URL=http://localhost:3000