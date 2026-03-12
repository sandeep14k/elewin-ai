export interface Job {
  id?: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  experienceLevel: string;
  requiredSkills: string[];
  status: "open" | "closed";
  createdAt: any;
}

export interface Application {
  id?: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  resumeUrl: string;
  githubUsername: string;
  linkedinUrl?: string;
  status: "pending" | "analyzed" | "shortlisted" | "rejected";
  createdAt?: any;
  analysis?: {
    overallMatchScore: number;
    authenticityScore: number;
    weightedBreakdown: {
      proofOfWork: number;
      experience: number;
      academics: number;
    };
    // --- THE NEW METRICS ---
    isHiddenGem: boolean; 
    learningVelocity: "High" | "Average" | "Low";
    skillGraph: {
      frontend: number;
      backend: number;
      database: number;
      devops: number;
      architecture: number;
    };
    // -----------------------
    verifiedSkills: string[];
    plagiarismFlags: string[];
    aiSummary: string;
    audit_trail: string[];
  };
}