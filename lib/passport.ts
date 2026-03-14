// lib/passport.ts
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";

/**
 * Adds a new verified block (Experience or Project) to the candidate's persistent Passport.
 */
export const addToPassportLibrary = async (
  userId: string, 
  type: 'experienceLibrary' | 'projectsLibrary', 
  blockData: any
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [type]: arrayUnion({
        ...blockData,
        addedAt: new Date().toISOString(),
        id: crypto.randomUUID() // Ensure each block has a unique ID for editing/removal
      })
    });
    return { success: true };
  } catch (error) {
    console.error(`Error adding to ${type}:`, error);
    throw error;
  }
};

/**
 * Removes a specific block from the Passport library.
 */
export const removeFromPassportLibrary = async (
  userId: string,
  type: 'experienceLibrary' | 'projectsLibrary',
  blockId: string
) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentLibrary = userSnap.data()[type] || [];
      const updatedLibrary = currentLibrary.filter((block: any) => block.id !== blockId);
      
      await updateDoc(userRef, {
        [type]: updatedLibrary
      });
    }
    return { success: true };
  } catch (error) {
    console.error(`Error removing from ${type}:`, error);
    throw error;
  }
};

/**
 * Updates an existing block in the Passport library.
 */
export const updatePassportBlock = async (
  userId: string,
  type: 'experienceLibrary' | 'projectsLibrary',
  blockId: string,
  updatedData: any
) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentLibrary = userSnap.data()[type] || [];
      const updatedLibrary = currentLibrary.map((block: any) => 
        block.id === blockId ? { ...block, ...updatedData, updatedAt: new Date().toISOString() } : block
      );
      
      await updateDoc(userRef, {
        [type]: updatedLibrary
      });
    }
    return { success: true };
  } catch (error) {
    console.error(`Error updating ${type}:`, error);
    throw error;
  }
};