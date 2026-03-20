import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { Job } from "@/types/platform";

export const createJob = async (
  jobData: Omit<Job, "id" | "createdAt" | "status">
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "jobs"), {
      companyId: jobData.companyId,
      companyName: jobData.companyName,
      title: jobData.title,
      description: jobData.description,
      experienceLevel: jobData.experienceLevel,
      requiredSkills: jobData.requiredSkills,
      
      automation: {
        autoShortlistThreshold: jobData.automation?.autoShortlistThreshold || null,
        autoRejectThreshold: jobData.automation?.autoRejectThreshold || null,
        interviewLink: jobData.automation?.interviewLink || "",
      },
      
      // Now TypeScript knows this is perfectly legal!
      scoringWeights: jobData.scoringWeights || { skills: 30, github: 25, projects: 20, algorithmic: 10, experience: 10, velocity: 5 },
      
      status: "open",
      createdAt: Timestamp.now(), 
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Firebase Error creating job:", error);
    throw error; 
  }
};