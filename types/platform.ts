export interface Job {
  id?: string;
  companyId: string;
  employerId: string;
  companyName: string;
  title: string;
  department: string;
  location: string;
  type?: string;
  experienceLevel: string;
  minExperience?: number;    // Added for PRD math
  salaryRange?: string;      // Added for PRD UI
  description: string;
  requiredSkills: string[];
  mandatoryBlocks?: any;
  status: string;
  createdAt?: any;
  
  // --- The properties TypeScript was crying about ---
  applicationDeadline?: any; 
  automation?: {
    autoShortlistThreshold: number;
    autoRejectThreshold: number;
    flagHighVelocity: boolean;
    interviewLink: string;
  };
  scoringWeights?: {
    skills: number;
    github: number;
    projects: number;
    algorithmic: number;
    experience: number;
    velocity: number;
  };
}
export interface SkillVerification {
  skill: string;
  status: "Verified" | "Unverified" | "Falsified";
  resumeClaim: string | null;
  githubEvidence: string | null;
  explanation: string;
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
  appliedAt?: any;
  passportBlocks?: any;
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
    forensic_skill_graph?: {
      language_mastery: number;
      code_hygiene_and_testing: number;
      system_architecture: number;
      devops_and_infra: number;
      data_and_state: number;
      version_control_habits: number;
    };
    skillGraph: {
      frontend: number;
      backend: number;
      database: number;
      devops: number;
      architecture: number;
    };
    skill_verification_matrix?: SkillVerification[];
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