"use client"
import { createContext, useContext, useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, User, signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

interface AuthContextType {
  user: User | null;
  role: "employer" | "candidate" | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<"employer" | "candidate" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // Fetch the role from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            setRole(userDoc.data().role as "employer" | "candidate")
          }
        } catch (error) {
          console.error("Error fetching role:", error)
        }
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)