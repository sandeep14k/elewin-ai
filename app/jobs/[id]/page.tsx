"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Job } from "@/types/platform"
import { 
  Building, Briefcase, Calendar, ShieldCheck, 
  Code2, Loader2, Sparkles, CheckCircle2, Zap, Target, ArrowRight, TimerOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const docRef = doc(db, "jobs", id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const jobData = { id: docSnap.id, ...docSnap.data() } as Job
          setJob(jobData)

          // --- DEADLINE ENFORCEMENT LOGIC  ---
          if (jobData.applicationDeadline) {
            const deadline = new Date(jobData.applicationDeadline.seconds * 1000);
            const now = new Date();
            if (now > deadline) {
              setIsExpired(true);
            }
          }
          
          // Also check if employer manually closed it
          if (jobData.status === 'closed') {
            setIsExpired(true);
          }

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
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
          <Briefcase className="w-16 h-16 text-slate-300 mb-4" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">Role Not Found</h1>
          <p className="text-slate-500 font-medium mb-6">This position may have been filled or removed by the employer.</p>
          <Link href="/">
            <Button className="bg-[#050A15] text-white h-12 px-8 rounded-xl font-bold">Browse Open Roles</Button>
          </Link>
        </div>
      </div>
    )
  }

  const hasFastTrack = job.automation?.interviewLink && job.automation?.autoShortlistThreshold;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col pb-20">
      <Navbar />
      
      {/* --- HERO HEADER --- */}
      <div className="bg-[#050A15] pt-16 pb-28 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 backdrop-blur-md">
                <Building className="w-6 h-6 text-white" />
             </div>
             <div>
                <span className="text-xl font-black text-white">{job.companyName}</span>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Verified Employer</p>
             </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight tracking-tight">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-300">
             <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <Briefcase className="w-4 h-4 text-blue-400" /> {job.experienceLevel} Level
             </span>
             <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <Calendar className="w-4 h-4 text-orange-400" /> Deadline: {job.applicationDeadline ? new Date(job.applicationDeadline.seconds * 1000).toLocaleDateString() : 'No Deadline'}
             </span>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Target className="w-6 h-6 text-orange-500" /> Role Architecture
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed whitespace-pre-wrap mb-10 text-lg">
                {job.description}
              </div>
              <div className="pt-10 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Verification Tech Stack</h3>
                <div className="flex flex-wrap gap-3">
                  {job.requiredSkills.map(skill => (
                    <span key={skill} className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-sm font-black border border-orange-200/50 flex items-center gap-2">
                      <Code2 className="w-4 h-4" /> {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: APPLY CTA --- DEACTIVATION LOGIC  --- */}
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 sticky top-28">
               
               {isExpired ? (
                 <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center mb-6">
                    <TimerOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-xl font-black text-slate-800 mb-2">Applications Closed</h4>
                    <p className="text-sm text-slate-500 font-medium">The deadline for this mission has passed or the role has been filled.</p>
                    <Link href="/">
                      <Button variant="link" className="text-orange-600 font-bold mt-4">Browse Active Roles</Button>
                    </Link>
                 </div>
               ) : (
                 <>
                   {hasFastTrack && (
                     <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl mb-6 text-white shadow-lg">
                       <div className="flex items-center gap-2 mb-2">
                         <Zap className="w-6 h-6 text-yellow-300 fill-current" />
                         <h4 className="font-black text-lg tracking-tight">Fast-Track Enabled</h4>
                       </div>
                       <p className="text-sm text-green-50 font-medium leading-relaxed">
                         Bypass the recruiter screen. Score an <strong>{job.automation!.autoShortlistThreshold}% Match Score</strong> for an instant interview link.
                       </p>
                     </div>
                   )}
                   
                   <Link href={`/jobs/${id}/apply`} className="block">
                     <Button className="w-full h-16 bg-[#050A15] hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95 group mb-4">
                       Apply with Proof of Work <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                     </Button>
                   </Link>
                   <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest mb-6">Zero-Trust Verification Enabled</p>
                 </>
               )}

               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h4 className="font-black text-slate-900 text-sm mb-4 flex items-center gap-2">
                     <ShieldCheck className="w-5 h-5 text-blue-500" /> EleWin Verification
                  </h4>
                  <ul className="space-y-4 text-xs font-bold text-slate-700">
                     <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span>GraphQL scan of public repositories[cite: 85, 86].</span>
                     </li>
                     <li className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span>Three-path experience verification[cite: 105].</span>
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