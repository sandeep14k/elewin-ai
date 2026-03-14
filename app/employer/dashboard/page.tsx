"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/authcontext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Plus, Copy, Users, Briefcase, Zap, Loader2, Activity, CheckCircle2 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import { useToast } from "@/components/ui/use-toast"
import { Job } from "@/types/platform"

export default function EmployerDashboard() {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // --- THE BOUNCER (ROUTE GUARD) ---
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
      } else if (role !== "employer") {
        router.push("/candidate/passport") // Kick candidates out
      }
    }
  }, [user, role, loading, router])

  // --- FETCH COMPANY JOBS ---
  useEffect(() => {
    const fetchJobs = async () => {
      if (!user) return
      try {
        const q = query(
          collection(db, "jobs"), 
          where("companyId", "==", user.uid)
        )
        const snap = await getDocs(q)
        const jobList: Job[] = []
        snap.forEach(doc => jobList.push({ id: doc.id, ...doc.data() } as Job))
        
        // Sort newest first
        setJobs(jobList.sort((a, b) => b.createdAt - a.createdAt))
      } catch (error) {
        console.error("Error fetching jobs:", error)
        toast({ title: "Error", description: "Failed to load jobs.", variant: "destructive" })
      } finally {
        setIsLoadingJobs(false)
      }
    }

    if (user && role === "employer") {
      fetchJobs()
    }
  }, [user, role, toast])

  // Block rendering until auth is verified
  if (loading || role !== "employer") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Verifying Credentials...</p>
      </div>
    )
  }

  const copyShareLink = (jobId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const url = `${baseUrl}/jobs/${jobId}/apply`
    navigator.clipboard.writeText(url)
    setCopiedId(jobId)
    toast({ title: "Link Copied!", description: "Share this link to accept forensic applications." })
    setTimeout(() => setCopiedId(null), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#050A15] text-white rounded-full mb-4 text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3 text-orange-500" /> Command Center
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Active Pipelines</h1>
          </div>
          
          <Link href="/employer/post-job">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-black h-14 px-8 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95">
              <Plus className="w-5 h-5 mr-2" /> Deploy New Role
            </Button>
          </Link>
        </div>

        {/* Jobs Grid */}
        {isLoadingJobs ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
        ) : jobs.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center flex flex-col items-center">
             <Briefcase className="w-16 h-16 text-slate-200 mb-6" />
             <h3 className="text-2xl font-black text-slate-900 mb-2">No active roles</h3>
             <p className="text-slate-500 font-medium mb-8 max-w-md">You haven't deployed any forensic pipelines yet. Create your first role to start verifying candidates.</p>
             <Link href="/employer/post-job">
               <Button className="bg-[#050A15] text-white rounded-xl h-12 px-8 font-bold">Deploy Role</Button>
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {job.status === 'open' ? 'Active' : 'Closed'}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyShareLink(job.id!)}
                      className={`h-8 rounded-xl text-xs font-bold transition-colors ${copiedId === job.id ? 'bg-green-50 text-green-700 border-green-200' : 'text-slate-500 border-slate-200 hover:border-orange-500 hover:text-orange-600'}`}
                    >
                      {copiedId === job.id ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                      {copiedId === job.id ? 'Copied' : 'Share Link'}
                    </Button>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight group-hover:text-orange-600 transition-colors">{job.title}</h3>
                  <p className="text-slate-500 text-sm font-medium mb-6 line-clamp-2">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-8">
                    {job.requiredSkills.slice(0, 3).map(skill => (
                      <span key={skill} className="bg-slate-50 text-slate-600 border border-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase">{skill}</span>
                    ))}
                    {job.requiredSkills.length > 3 && (
                      <span className="bg-slate-50 text-slate-400 border border-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase">+{job.requiredSkills.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-auto">
                  <Link href={`/employer/jobs/${job.id}`}>
                    <Button className="w-full bg-slate-50 hover:bg-[#050A15] text-slate-700 hover:text-white h-14 rounded-2xl font-black transition-all group-hover:shadow-lg">
                      <Activity className="w-5 h-5 mr-2" /> View Forensic Pipeline
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}