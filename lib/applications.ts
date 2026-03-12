// lib/applications.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, getDoc, doc, Timestamp } from "firebase/firestore";
import { Job, Application } from "@/types/platform";

/**
 * Fetches a single job by its ID to display on the application page
 */
export const getJobById = async (jobId: string): Promise<Job | null> => {
  try {
    const docRef = doc(db, "jobs", jobId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Job;
    }
    return null;
  } catch (error) {
    console.error("Error fetching job:", error);
    return null;
  }
};

/**
 * Submits the candidate's application and sets it to 'pending_analysis'
 */
export const submitApplication = async (
  appData: Omit<Application, "id" | "status" | "analysis" | "appliedAt">
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "applications"), {
      ...appData,
      status: "pending_analysis", // Crucial: This triggers the AI later
      appliedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error submitting application:", error);
    throw new Error("Failed to submit application");
  }
};