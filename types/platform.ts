import { Timestamp } from "firebase/firestore";

// 1. THE JOB MODEL
export interface Job {
  id?: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  requiredSkills: string[];
  experienceLevel: "Junior" | "Mid" | "Senior" | "Lead";
  status: "open" | "closed";
  createdAt: Timestamp;
}

// 2. THE AI AUTHENTICITY & PROOF OF WORK MODEL
// This is the output of our AI analyzing their GitHub and Resume
export interface AuthenticityMetrics {
  overallMatchScore: number;     // 0-100: How well they fit the JD
  authenticityScore: number;     // 0-100: How likely it is they actually wrote their code
  verifiedSkills: string[];      // Skills proven by actual commits
  plagiarismFlags: string[];     // E.g., "Repo 'Netflix-Clone' has only 1 commit of 10,000 lines"
  commitVelocity: "Low" | "Medium" | "High"; // Iterative coding vs copy-pasting
  aiSummary: string;             // A short brief for the recruiter
}

// 3. THE APPLICATION MODEL
export interface Application {
  id?: string;
  jobId: string;
  jobTitle: string;
  candidateId: string; // Firebase Auth UID
  candidateName: string;
  candidateEmail: string;
  
  // Raw Inputs from Candidate
  resumeUrl: string;
  githubUsername: string;
  linkedinUrl?: string;
  
  // Processing State
  status: "pending_analysis" | "analyzed" | "shortlisted" | "rejected";
  
  // AI Results (Populated after backend processing)
  analysis?: AuthenticityMetrics;
  
  appliedAt: Timestamp;
}