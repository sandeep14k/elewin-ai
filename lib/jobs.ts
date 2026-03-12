import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { Job } from "@/types/platform";

/**
 * Creates a new job posting in Firestore
 */
export const createJob = async (
  jobData: Omit<Job, "id" | "createdAt" | "status">
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "jobs"), {
      ...jobData,
      status: "open",
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating job:", error);
    throw new Error("Failed to post job");
  }
};