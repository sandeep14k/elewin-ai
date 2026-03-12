"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Building2, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EmployerSignup() {
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      )

      // 2. Attach the Company Name to their profile
      await updateProfile(userCredential.user, {
        displayName: formData.companyName
      })

      // 3. Redirect to their new dashboard
      router.push("/employer/dashboard")
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to create account. Please try again.")
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Join EleWin Recruit</h1>
          <p className="text-slate-500 mt-2">Start hiring talent based on verified proof of work.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Company Name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 transition-all bg-slate-50 focus:bg-white"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Work Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 transition-all bg-slate-50 focus:bg-white"
                placeholder="recruiter@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-800 transition-all bg-slate-50 focus:bg-white"
                placeholder="At least 6 characters"
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
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Company Account"}
            </Button>
          </form>

          {/* Trust Indicators */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
             <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> AI-verified candidate code
             </div>
             <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Filter by actual learning velocity
             </div>
             <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Eliminate fake resumes instantly
             </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-slate-900 hover:underline font-bold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}