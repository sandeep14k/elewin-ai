import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Job, Application } from "@/types/platform";

export const getJobWithApplications = async (jobId: string) => {
  try {
    // 1. Fetch the Job
    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");
    const job = { id: jobSnap.id, ...jobSnap.data() } as Job;

    // 2. Fetch all Applications for this Job
    const appsRef = collection(db, "applications");
    const q = query(appsRef, where("jobId", "==", jobId));
    const querySnapshot = await getDocs(q);
    
    let applications: Application[] = [];
    querySnapshot.forEach((doc) => {
      applications.push({ id: doc.id, ...doc.data() } as Application);
    });

    // 3. Sort by Authenticity and Match Score (Highest first)
    applications.sort((a, b) => {
      const scoreA = (a.analysis?.authenticityScore || 0) + (a.analysis?.overallMatchScore || 0);
      const scoreB = (b.analysis?.authenticityScore || 0) + (b.analysis?.overallMatchScore || 0);
      return scoreB - scoreA;
    });

    return { job, applications };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw new Error("Failed to load dashboard");
  }
};