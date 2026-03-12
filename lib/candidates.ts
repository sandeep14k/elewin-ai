// lib/candidates.ts

import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  DocumentData
} from "firebase/firestore";
import { CandidateProfile } from "@/types/candidate";

/**
 * Filter interface for the Recruiter Dashboard
 */
export interface CandidateFilters {
  role?: string;
  minVelocity?: number;        // e.g., Find fast learners (>80)
  minCodeQuality?: number;     // e.g., Find clean coders (>85)
  requiredSkills?: string[];   // e.g., ["React", "TypeScript"]
  isActivelyLooking?: boolean;
}

/**
 * 1. Fetch Candidates with Advanced B2B Filters
 * We push as much filtering to Firebase as possible to save bandwidth,
 * and handle complex array intersections in code.
 */
export async function getCandidates(filters: CandidateFilters = {}): Promise<CandidateProfile[]> {
  try {
    const candidatesRef = collection(db, "user_profiles");
    
    // Start building the Firestore query
    let q = query(candidatesRef);

    // Filter 1: Only show people actively looking (unless specified otherwise)
    if (filters.isActivelyLooking !== false) {
      q = query(q, where("isActivelyLooking", "==", true));
    }

    // Filter 2: Base Role Match
    if (filters.role) {
      q = query(q, where("personalInfo.currentRole", "==", filters.role));
    }

    // Note: Firestore has limitations with multiple inequality operators (>, <) on different fields.
    // To keep it scalable, we fetch the base query and apply deep AI metrics filtering client/server-side.
    const snapshot = await getDocs(q);
    let candidates: CandidateProfile[] = [];

    snapshot.forEach((doc) => {
      candidates.push({ id: doc.id, ...doc.data() } as CandidateProfile);
    });

    // --- APPLY DEEP METRICS & SKILL FILTERS ---
    if (filters.minVelocity) {
      candidates = candidates.filter(c => 
        c.aiTalentGraph?.learningVelocity >= filters.minVelocity!
      );
    }

    if (filters.minCodeQuality) {
      candidates = candidates.filter(c => 
        c.aiTalentGraph?.codeQualityScore >= filters.minCodeQuality!
      );
    }

    // Complex Skill Intersection: Ensure candidate has ALL required skills
    if (filters.requiredSkills && filters.requiredSkills.length > 0) {
      candidates = candidates.filter(c => {
        const candidateSkillNames = c.skillGraph?.map(s => s.skillName.toLowerCase()) || [];
        // Returns true only if every required skill is found in the candidate's verified skill graph
        return filters.requiredSkills!.every(reqSkill => 
          candidateSkillNames.includes(reqSkill.toLowerCase())
        );
      });
    }

    // Sort by Learning Velocity by default (Putting the best potential at the top)
    candidates.sort((a, b) => 
      (b.aiTalentGraph?.learningVelocity || 0) - (a.aiTalentGraph?.learningVelocity || 0)
    );

    return candidates;

  } catch (error) {
    console.error("[Candidates API] Error fetching candidates:", error);
    throw new Error("Failed to fetch talent pool.");
  }
}

/**
 * 2. Fetch a Single Candidate Profile (Deep Dive)
 * Used when a recruiter clicks "View Deep Profile"
 */
export async function getCandidateById(candidateId: string): Promise<CandidateProfile | null> {
  try {
    const docRef = doc(db, "user_profiles", candidateId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CandidateProfile;
    }
    
    return null;
  } catch (error) {
    console.error(`[Candidates API] Error fetching candidate ${candidateId}:`, error);
    throw new Error("Failed to load candidate profile.");
  }
}