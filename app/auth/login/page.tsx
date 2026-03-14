"use client"

import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, Lock, Zap, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { getFriendlyAuthError } from "@/lib/errors"
export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({ email: "", password: "" })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // 2. Fetch their role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        
        // 3. Smart Routing based on Role
        if (userData.role === "employer") {
          router.push("/employer/dashboard")
        } else {
          router.push("/candidate/passport")
        }
      } else {
        // Fallback if no role is found
        router.push("/") 
      }
      
      toast({ title: "Welcome back!", description: "Successfully signed in." })
    } catch (error: any) {
  toast({ 
    title: "Authentication Failed", 
    description: getFriendlyAuthError(error), 
    variant: "destructive" 
  })
} finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-orange-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 group mb-6">
          <div className="bg-[#050A15] p-2 rounded-xl group-hover:scale-105 transition-transform shadow-lg">
            <Zap className="w-6 h-6 text-orange-500" />
          </div>
          <span className="font-black text-3xl tracking-tight text-slate-900">
            Ele<span className="text-orange-500">Win</span>
          </span>
        </Link>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">Enter your credentials to access your dashboard.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 sm:px-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium" placeholder="you@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Password</label>
                <a href="#" className="text-[10px] font-bold text-orange-600 hover:text-orange-500">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium" placeholder="••••••••" />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-[#050A15] hover:bg-black text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 transition-all active:scale-95 group">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center gap-2">Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="font-bold text-orange-600 hover:text-orange-500 transition-colors">Sign up for free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}