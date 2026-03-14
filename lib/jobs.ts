import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { Job } from "@/types/platform";

export const createJob = async (
  jobData: Omit<Job, "id" | "createdAt" | "status">
): Promise<string> => {
  try {
    // We explicitly create the document with all required fields
    const docRef = await addDoc(collection(db, "jobs"), {
      companyId: jobData.companyId,
      companyName: jobData.companyName,
      title: jobData.title,
      description: jobData.description,
      experienceLevel: jobData.experienceLevel,
      requiredSkills: jobData.requiredSkills,
      
      // --- THE ATS KILLER: Forensic Automation Rules ---
      automation: {
        autoShortlistThreshold: jobData.automation?.autoShortlistThreshold || null,
        autoRejectThreshold: jobData.automation?.autoRejectThreshold || null,
        interviewLink: jobData.automation?.interviewLink || "",
      },

      status: "open",
      createdAt: Timestamp.now(), 
    });
    
    console.log("Job created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Firebase Error creating job:", error);
    throw error; 
  }
};