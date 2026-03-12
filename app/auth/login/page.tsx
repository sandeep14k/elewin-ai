"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/context/authcontext"
import { Building2, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EmployerLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const { user, loading } = useAuth()

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push("/employer/dashboard")
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // The useEffect will automatically catch the user state change and redirect
    } catch (err: any) {
      console.error(err)
      setError("Invalid email or password. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">EleWin Recruit</h1>
          <p className="text-slate-500 mt-2">Sign in to manage your hiring pipeline.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 transition-all bg-slate-50 focus:bg-white"
                placeholder="recruiter@company.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-bold text-slate-700">Password</label>
                <Link href="#" className="text-xs text-blue-600 hover:underline font-medium">Forgot password?</Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 transition-all bg-slate-50 focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In securely"}
            </Button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Don't have a company account?{" "}
            <Link href="/auth/signup" className="text-slate-900 hover:underline font-bold flex items-center justify-center gap-1 mt-1">
              Create one now <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}