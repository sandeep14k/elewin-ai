import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  updateDoc // Added this for shortlisting later
} from "firebase/firestore";
import { Job, Application } from "@/types/platform";

/**
 * 1. Fetch all applications for a SPECIFIC job (Leaderboard View)
 */
export const getJobWithApplications = async (jobId: string) => {
  try {
    // Fetch the Job details
    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");
    const job = { id: jobSnap.id, ...jobSnap.data() } as Job;

    // Fetch all applications for this job
    const appsRef = collection(db, "applications");
    const q = query(appsRef, where("jobId", "==", jobId));
    const querySnapshot = await getDocs(q);
    
    let applications: Application[] = [];
    querySnapshot.forEach((doc) => {
      applications.push({ id: doc.id, ...doc.data() } as Application);
    });

    // Sort by AI Scores (Match + Authenticity)
    applications.sort((a, b) => {
      const scoreA = (a.analysis?.authenticityScore || 0) + (a.analysis?.overallMatchScore || 0);
      const scoreB = (b.analysis?.authenticityScore || 0) + (b.analysis?.overallMatchScore || 0);
      return scoreB - scoreA;
    });

    return { job, applications };
  } catch (error) {
    console.error("Error fetching job applications:", error);
    throw error;
  }
};

/**
 * 2. Fetch the Employer Dashboard (List of all jobs + applicant counts)
 */
export const getEmployerDashboard = async (companyId: string) => {
  try {
    const jobsRef = collection(db, "jobs");
    const jobsQuery = query(jobsRef, where("companyId", "==", companyId));
    const jobsSnap = await getDocs(jobsQuery);
    
    let jobs: any[] = [];
    
    for (const jobDoc of jobsSnap.docs) {
      const jobData = jobDoc.data();
      
      const appsRef = collection(db, "applications");
      const appsQuery = query(appsRef, where("jobId", "==", jobDoc.id));
      const appsSnap = await getDocs(appsQuery);
      
      jobs.push({
        id: jobDoc.id,
        ...jobData,
        applicantCount: appsSnap.size 
      });
    }

    // Sort by newest created
    return jobs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (error) {
    console.error("Error fetching employer dashboard:", error);
    throw new Error("Failed to load dashboard data");
  }
};

/**
 * 3. Update application status (Shortlist/Reject)
 */
export const updateApplicationStatus = async (applicationId: string, status: string) => {
  try {
    const docRef = doc(db, "applications", applicationId);
    await updateDoc(docRef, { status });
    return true;
  } catch (error) {
    console.error("Error updating status:", error);
    return false;
  }
};