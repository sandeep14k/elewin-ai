"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { useAuth } from "@/context/authcontext"
import { Job } from "@/types/platform"
import { 
  Briefcase, ShieldCheck, ArrowRight, Code2, 
  Loader2, Sparkles, Building, Globe, Zap, 
  LayoutDashboard, Search, Star, TrendingUp
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
      } catch (e) { console.error(e) } finally { setIsLoadingJobs(false) }
    }
    fetchJobs()
  }, [])

  return (
    <div className="min-h-screen bg-[#050A15] font-sans selection:bg-orange-500 selection:text-white">
      <Navbar />
      
      {/* --- HERO SECTION --- */}
      <section className="pt-24 pb-40 px-4 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          {authLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>
          ) : user ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-md">
                <Building className="w-4 h-4 text-orange-500" />
                <span className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">Employer Portal Active</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                Verify. Shortlist. <br/><span className="text-orange-500 underline decoration-white/10 underline-offset-8">Hire Talent.</span>
              </h1>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
                Your forensic pipeline is analyzing candidates. Switch to the dashboard to see match scores and hidden gems.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/employer/dashboard">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white h-16 px-12 rounded-2xl font-black text-lg shadow-2xl shadow-orange-500/40 transition-all hover:-translate-y-1">
                    <LayoutDashboard className="w-5 h-5 mr-3" /> Go to Dashboard
                  </Button>
                </Link>
                <Link href="/employer/post-job">
                  <Button variant="outline" className="text-white border-white/10 bg-white/5 hover:bg-white/10 h-16 px-12 rounded-2xl font-black text-lg backdrop-blur-sm">
                    Post New Role
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">Next-Gen Hiring Protocol</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                Hire via <br/><span className="text-orange-500">Proof of Work.</span>
              </h1>
              <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto mb-12 font-medium">
                The world's first forensic recruitment tool that cross-checks resumes against GitHub GraphQL signals to uncover hidden engineering talent.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/employer/post-job">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white h-16 px-12 rounded-2xl font-black text-lg shadow-2xl shadow-orange-500/40 transition-all hover:-translate-y-1">
                    Employer: Post a Job
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="outline" className="text-white border-white/10 bg-white/5 hover:bg-white/10 h-16 px-12 rounded-2xl font-black text-lg backdrop-blur-sm">
                    Create Company Account
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- CONTENT AREA --- */}
      <main className="max-w-6xl mx-auto w-full px-4 -mt-20 pb-40 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic">
                  <Search className="w-8 h-8 text-orange-500 not-italic" /> Open Roles
                </h2>
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{jobs.length} Live Postings</span>
                </div>
              </div>

              <div className="space-y-4">
                {isLoadingJobs ? (
                  <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500 w-10 h-10" /></div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">The board is clear. Check back soon.</p>
                  </div>
                ) : jobs.map(job => (
                  <div key={job.id} className="group p-8 rounded-3xl border border-slate-100 hover:border-orange-500/30 hover:bg-orange-50/20 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">{job.title}</h3>
                      <p className="text-slate-400 font-bold flex items-center justify-center md:justify-start gap-2 mt-1 text-sm uppercase tracking-wide">
                        <Building className="w-4 h-4" /> {job.companyName}
                      </p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-6">
                        {job.requiredSkills.map(s => (
                          <span key={s} className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-slate-200 transition-all group-hover:bg-white">#{s}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="w-full md:w-auto">
                      {!user ? (
                        <Link href={`/jobs/${job.id}/apply`} className="block w-full">
                          <Button className="w-full bg-slate-900 hover:bg-black text-white h-14 px-8 rounded-2xl font-black shadow-lg shadow-slate-900/20 group-hover:bg-orange-500 group-hover:shadow-orange-500/20 transition-all">
                            Apply with PoW <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      ) : user.uid === job.companyId ? (
                        <Link href={`/employer/jobs/${job.id}`} className="block w-full">
                          <Button variant="outline" className="w-full border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 h-14 px-8 rounded-2xl font-black">
                            View Pipeline <LayoutDashboard className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled variant="outline" className="w-full bg-slate-50 text-slate-300 border-slate-100 h-14 px-8 rounded-2xl font-black cursor-not-allowed">
                          Employer Account
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Platform Intelligence UI */}
          <div className="space-y-6">
             <div className="bg-orange-500 p-10 rounded-[40px] text-white shadow-2xl shadow-orange-500/30 relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
                <Zap className="w-12 h-12 mb-6" />
                <h3 className="text-3xl font-black mb-4 leading-tight">Identify Hidden Gems.</h3>
                <p className="text-orange-100 mb-10 text-sm font-medium leading-relaxed">Stop screening for college names. Start screening for code complexity and learning velocity.</p>
                <Link href="/employer/post-job">
                  <Button className="w-full bg-white text-orange-600 hover:bg-slate-50 font-black h-16 rounded-2xl transition-all hover:scale-[1.02]">
                    Recruit with EleWin
                  </Button>
                </Link>
             </div>

             <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 text-white">
                <h4 className="font-black text-xs uppercase tracking-[0.3em] text-orange-500 mb-8">Forensic Signals</h4>
                <div className="space-y-8">
                   <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5"><Star className="w-5 h-5 text-amber-400" /></div>
                      <div>
                        <p className="font-black text-sm">Underdog Detection</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Weighting code output over university rankings to find self-taught masters.</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
                      <div>
                        <p className="font-black text-sm">Learning Velocity</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Measuring technology progression speed across repository timelines.</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5"><ShieldCheck className="w-5 h-5 text-green-400" /></div>
                      <div>
                        <p className="font-black text-sm">Tutorial Anti-Cheat</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Identifying repo clones and one-commit template deployments.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  )
}