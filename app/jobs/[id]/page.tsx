"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Job } from "@/types/platform"
import { 
  Building, MapPin, Briefcase, Calendar, 
  ArrowRight, ShieldCheck, Code2, Loader2, Sparkles, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise for Next.js 15
  const { id } = use(params)
  
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const docRef = doc(db, "jobs", id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setJob({ id: docSnap.id, ...docSnap.data() } as Job)
        }
      } catch (error) {
        console.error("Error fetching job:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchJob()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
          <Briefcase className="w-16 h-16 text-slate-300 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Job Not Found</h1>
          <p className="text-slate-500 mb-6">This position may have been filled or removed.</p>
          <Link href="/"><Button className="bg-slate-900 text-white">Browse Open Roles</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar />
      
      {/* Job Header */}
      <div className="bg-[#050A15] pt-12 pb-24 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-6">
             <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
             </div>
             <span className="text-xl font-bold text-slate-300">{job.companyName}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-300">
             <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                <Briefcase className="w-4 h-4" /> {job.experienceLevel} Level
             </span>
             <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                <Calendar className="w-4 h-4" /> Posted {new Date(job.createdAt.seconds * 1000).toLocaleDateString()}
             </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 -mt-12 pb-20 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: JD & Skills */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
              
              <h2 className="text-xl font-bold text-slate-900 mb-4">About the Role</h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap mb-8">
                {job.description}
              </div>

              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Target Technologies</h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map(skill => (
                    <span key={skill} className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-orange-200 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4" /> {skill}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Apply CTA & Platform Explainer */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 sticky top-24">
               <Link href={`/jobs/${id}/apply`}>
                 <Button className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/20 mb-4">
                   Apply with GitHub
                 </Button>
               </Link>
               <p className="text-xs text-center text-slate-500 mb-6">No account required to apply.</p>

               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                     <Sparkles className="w-4 h-4 text-orange-500" /> EleWin Verification
                  </h4>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                     This company uses EleWin Recruit to hire based on actual Proof of Work. 
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600">
                     <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Your public repositories will be scanned for the required skills.</span>
                     </li>
                     <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Consistent, original commits are scored highly.</span>
                     </li>
                     <li className="flex items-start gap-2">
                        <ShieldCheck className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>Fair, unbiased ranking based on your code, not just keywords.</span>
                     </li>
                  </ul>
               </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}