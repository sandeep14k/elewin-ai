"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { useAuth } from "@/context/authcontext"
import { Job } from "@/types/platform"
import { 
  Briefcase, ShieldCheck, ArrowRight, Code2, 
  Loader2, Sparkles, Building, Globe, Zap, LayoutDashboard 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"

export default function PlatformHome() {
  const { user, loading: authLoading } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const q = query(collection(db, "jobs"), where("status", "==", "open"), orderBy("createdAt", "desc"))
        const snapshot = await getDocs(q)
        const list: Job[] = []
        snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Job))
        setJobs(list)
      } catch (e) { 
        console.error(e) 
      } finally { 
        setIsLoadingJobs(false) 
      }
    }
    fetchJobs()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      {/* DYNAMIC HERO SECTION */}
      <section className="bg-[#050A15] pt-24 pb-32 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          
          {authLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>
          ) : user ? (
            // LOGGED IN COMPANY VIEW
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full mb-8">
                <Building className="w-4 h-4 text-green-500" />
                <span className="text-green-200 text-xs font-bold uppercase tracking-widest">Company Portal</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                Welcome back, <br/><span className="text-orange-500">{user.displayName || "Recruiter"}</span>.
              </h1>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12">
                Your AI-verified talent pipelines are ready. Manage your open roles and review shortlisted candidates based on actual Proof of Work.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/employer/dashboard">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white h-14 px-10 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/20">
                    <LayoutDashboard className="w-5 h-5 mr-2" /> Go to Dashboard
                  </Button>
                </Link>
                <Link href="/employer/post-job">
                  <Button variant="outline" className="text-white border-white/20 hover:bg-white/5 h-14 px-10 rounded-2xl font-bold text-lg">
                    Post a New Job
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // GUEST / CANDIDATE VIEW
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-orange-200 text-xs font-bold uppercase tracking-widest">Next-Gen Recruitment</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                Hire via <span className="text-orange-500">Proof of Work.</span>
              </h1>
              <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto mb-12">
                The first platform that verifies GitHub commits, detects fake projects, and weights candidates by actual code, experience, and academics.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/employer/post-job">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white h-14 px-10 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/20">
                    For Employers: Post a Job
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="outline" className="text-white border-white/20 hover:bg-white/5 h-14 px-10 rounded-2xl font-bold text-lg">
                    Create Company Account
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Main Content: Job Feed */}
      <main className="max-w-6xl mx-auto w-full px-4 -mt-16 pb-20 z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Job List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Globe className="w-6 h-6 text-orange-500" /> Public Job Board
                </h2>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{jobs.length} Open Roles</span>
              </div>

              <div className="space-y-4">
                {isLoadingJobs ? (
                  <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No public roles available right now.</p>
                  </div>
                ) : jobs.map(job => (
                  <div key={job.id} className="group p-6 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{job.title}</h3>
                      <p className="text-slate-500 font-medium flex items-center gap-1.5 mt-1 text-sm">
                        <Building className="w-4 h-4" /> {job.companyName}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {job.requiredSkills.map(s => (
                          <span key={s} className="bg-white text-slate-600 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200">#{s}</span>
                        ))}
                      </div>
                    </div>
                    
                    {/* DYNAMIC BUTTON LOGIC */}
                    <div className="w-full md:w-auto">
                      {!user ? (
                        <Link href={`/jobs/${job.id}/apply`}>
                          <Button className="w-full bg-slate-900 hover:bg-black text-white rounded-xl">
                            Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      ) : user.uid === job.companyId ? (
                        <Link href={`/employer/jobs/${job.id}`}>
                          <Button variant="outline" className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl">
                            View Pipeline <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled variant="outline" className="w-full bg-slate-50 text-slate-400 border-slate-200 rounded-xl cursor-not-allowed">
                          Employer Account
                        </Button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Info Card */}
          <div className="space-y-6">
             {!user && (
               <div className="bg-orange-500 p-8 rounded-3xl text-white shadow-lg shadow-orange-500/20">
                  <Zap className="w-10 h-10 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Hiring?</h3>
                  <p className="text-orange-100 mb-6 text-sm">Share a link, verify code, and shortlist in minutes. No more manual resume screening.</p>
                  <Link href="/employer/post-job">
                    <Button className="w-full bg-white text-orange-600 hover:bg-orange-50 font-bold py-6 rounded-xl">
                      Post a Role Today
                    </Button>
                  </Link>
               </div>
             )}

             <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4">Why EleWin Recruit?</h4>
                <div className="space-y-4">
                   <div className="flex gap-3">
                      <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-xs text-slate-500 italic"><span className="font-bold text-slate-700 not-italic">Plagiarism Detection:</span> We flag tutorial clones and forked repos.</p>
                   </div>
                   <div className="flex gap-3">
                      <Code2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <p className="text-xs text-slate-500 italic"><span className="font-bold text-slate-700 not-italic">Skill Weighting:</span> 40% PoW, 30% Exp, 20% Academics.</p>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  )
}