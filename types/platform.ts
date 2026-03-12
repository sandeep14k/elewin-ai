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
  // THE DEEP ANALYSIS OBJECT
  analysis?: {
    overallMatchScore: number;
    authenticityScore: number;
    weightedBreakdown: {
      proofOfWork: number;
      experience: number;
      academics: number;
      velocity: number;
    };
    isHiddenGem: boolean;
    learningVelocity: "High" | "Average" | "Low";
    skillGraph: {
      frontend: number;
      backend: number;
      database: number;
      devops: number;
      architecture: number;
    };
    verifiedSkills: string[];
    validationFlags: string[]; // Fraud/Discrepancy alerts
    aiSummary: string;
    audit_trail: string[];
    executive_summary?: string;
    code_quality_indicators?: {
      hasTests: boolean;
      commitMessageQuality: string;
      repoOrganization: string;
    };
    collaboration_score?: number;
  };
  // RAW DATA FOR THE DASHBOARD TO RENDER
  enrichedData?: {
    github: any;
    resume: any;
    validation: any;
  };
}