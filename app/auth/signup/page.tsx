"use client"

import { useState } from "react"
import { auth, db } from "@/lib/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Mail, Lock, User, Zap, Briefcase, 
  Fingerprint, Loader2, ArrowRight 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { getFriendlyAuthError } from "@/lib/errors"

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "candidate" as "employer" | "candidate"
  })

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // 2. Save their profile and role to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString()
      })

      toast({ title: "Welcome to EleWin!", description: "Your account has been created." })
      
      // 3. Route them to their specific portal
      if (formData.role === "employer") {
        router.push("/employer/dashboard")
      } else {
        router.push("/candidate/passport")
      }
    } catch (error: any) {
      // 1. Log it locally
      console.error("Sign Up Failed:", error.code, error.message);
      
      // 2. Show the friendly (or exact) error to the user in the UI
      toast({ 
        title: "Sign Up Failed", 
        description: getFriendlyAuthError(error), 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
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
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create your account</h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">Join the forensic talent network today.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 sm:px-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
          
          {/* ROLE SELECTOR */}
          <div className="flex gap-4 mb-8">
             <button 
                type="button"
                onClick={() => setFormData({...formData, role: "candidate"})}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.role === "candidate" ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
             >
                <Fingerprint className={`w-6 h-6 ${formData.role === "candidate" ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className="text-xs font-black uppercase tracking-wider">Engineer</span>
             </button>
             <button 
                type="button"
                onClick={() => setFormData({...formData, role: "employer"})}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.role === "employer" ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
             >
                <Briefcase className={`w-6 h-6 ${formData.role === "employer" ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className="text-xs font-black uppercase tracking-wider">Company</span>
             </button>
          </div>

          <form className="space-y-6" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium" placeholder="Sandeep Kumar" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium" placeholder="you@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium" placeholder="••••••••" minLength={6} />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-[#050A15] hover:bg-black text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 transition-all active:scale-95 group">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center gap-2">Create Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-bold text-orange-600 hover:text-orange-500 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}