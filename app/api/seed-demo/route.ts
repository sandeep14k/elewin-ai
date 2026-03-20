import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";

// 👇 REPLACE THIS WITH YOUR LIVE JOB ID FROM YOUR DASHBOARD 👇
const DEMO_JOB_ID = "LPFLVQaS0nEvGBhFW5Bq"; 

const mockApplications = [
  {
    id: "demo_1_ai_spammer",
    jobId: DEMO_JOB_ID,
    jobTitle: "Senior React Developer",
    candidateId: "anon_spammer",
    candidateName: "Alex Applicant",
    candidateEmail: "alex@example.com",
    resumeUrl: "https://drive.google.com/file/fake1",
    githubUsername: "alex-123",
    status: "analyzed",
    analysis: {
      overallMatchScore: 12,
      isHiddenGem: false,
      learningVelocity: "Static Skillset",
      aiSummary: "CRITICAL WARNING: Candidate claims senior-level experience, but forensic analysis reveals only one repository containing a standard 'create-react-app' boilerplate with 2 commits. High probability of AI-generated synthetic resume.",
      
      spam_analysis: {
        is_likely_spam: true,
        authenticity_score: 15,
        reasoning: "Resume features heavy GPT-4 phrasing claiming 'Architectural Leadership', but public code history shows 0 original commits and no complex system files."
      },
      open_source_impact: false,
      
      skill_verification_matrix: [
        {
          skill: "React",
          status: "Falsified",
          resumeClaim: "5 years of building scalable React applications.",
          githubEvidence: "1 boilerplate repo, 0 custom components.",
          explanation: "We believe this candidate DOES NOT have React skills because their only repository is an unmodified tutorial clone with no original logic."
        },
        {
          skill: "TypeScript",
          status: "Unverified",
          resumeClaim: "Lead migration to TypeScript.",
          githubEvidence: "0 bytes of TypeScript found.",
          explanation: "We cannot verify TypeScript because no .ts or .tsx files exist in their public history."
        }
      ],
      forensic_skill_graph: { language_mastery: 10, code_hygiene_and_testing: 0, system_architecture: 0, devops_and_infra: 0, data_and_state: 0, version_control_habits: 10 }
    }
  },
  {
    id: "demo_2_hidden_gem",
    jobId: DEMO_JOB_ID,
    jobTitle: "Senior React Developer",
    candidateId: "anon_gem",
    candidateName: "Sam 'Hidden Gem' Coder",
    candidateEmail: "sam@example.com",
    resumeUrl: "https://drive.google.com/file/fake2",
    githubUsername: "sam-builds",
    status: "analyzed",
    analysis: {
      overallMatchScore: 94,
      isHiddenGem: true,
      learningVelocity: "Exceptional Learner",
      aiSummary: "EXCEPTIONAL FIND: Candidate has no formal CS degree listed, but GitHub analysis reveals highly complex, production-grade architecture including custom Webpack configs, deep CI/CD pipelines, and 500+ semantic commits. Strong hire.",
      
      spam_analysis: {
        is_likely_spam: false,
        authenticity_score: 98,
        reasoning: "Resume claims match perfectly with cryptographic git signatures. Deep complexity found in source files."
      },
      
      adaptive_assessment: {
        question: "In your 'ecommerce-microservices' repository, you used Redis for caching. How would you handle cache invalidation during a high-traffic flash sale to prevent stale inventory data?",
        context: "Targeting their verified use of Redis and microservices architecture to test system design depth."
      },
      open_source_impact: true,

      skill_verification_matrix: [
        {
          skill: "React",
          status: "Verified",
          resumeClaim: "Self-taught React developer.",
          githubEvidence: "4 massive repos, 120,000+ bytes of React code, custom hooks.",
          explanation: "We believe this candidate has elite React skills because they have authored complex, multi-layered React architectures with extensive state management in 4 active repositories."
        },
        {
          skill: "CI/CD",
          status: "Verified",
          resumeClaim: "Implemented automated testing pipelines.",
          githubEvidence: ".github/workflows found in 3 repositories running Jest.",
          explanation: "We believe this candidate understands DevOps because we detected raw YAML workflow files executing automated test suites on every push."
        }
      ],
      forensic_skill_graph: { language_mastery: 95, code_hygiene_and_testing: 85, system_architecture: 90, devops_and_infra: 80, data_and_state: 88, version_control_habits: 95 }
    }
  }
];

export async function GET() {
  try {
    for (const app of mockApplications) {
      const docRef = doc(collection(db, "applications"), app.id);
      await setDoc(docRef, app);
    }
    return NextResponse.json({ success: true, message: "Hackathon Demo Data Injected!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}