"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/authcontext"
import { getEmployerDashboard } from "@/lib/employer"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Briefcase, Users, Plus, ArrowRight, Loader2, Building2, Share2, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"

export default function EmployerDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [jobs, setJobs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setIsLoading(false);
        return;
    }

    const fetchDashboard = async () => {
      try {
        const data = await getEmployerDashboard(user.uid)
        setJobs(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [user, authLoading])

  const copyShareLink = (jobId: string) => {
    const url = `${window.location.origin}/jobs/${jobId}/apply`
    navigator.clipboard.writeText(url)
    setCopiedId(jobId)
    setTimeout(() => setCopiedId(null), 2000) // Reset after 2 seconds
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Company Access Required</h1>
        <p className="text-slate-500 mb-6 max-w-md">You must be logged in as an employer to view your dashboard and shortlisted candidates.</p>
        <div className="flex gap-4">
            <Button onClick={() => router.push('/auth/login')} className="bg-slate-800 hover:bg-slate-900 text-white px-8">Sign In</Button>
            <Button onClick={() => router.push('/auth/signup')} variant="outline" className="border-slate-300">Create Account</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Employer Dashboard</h1>
            <p className="text-slate-500 mt-1">
              Welcome back, {user.displayName || "Recruiter"}. Manage your active job postings.
            </p>
          </div>
          <Link href="/employer/post-job">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Post New Job
            </Button>
          </Link>
        </div>

        {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
        ) : jobs.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col items-center">
                <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No active job postings</h3>
                <p className="text-slate-500 mt-2 mb-6 max-w-sm">You haven't posted any roles yet. Create your first job to start receiving AI-verified applications.</p>
                <Link href="/employer/post-job">
                    <Button className="bg-slate-800 hover:bg-slate-900 text-white">Post Your First Job</Button>
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                    <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-2.5 py-1 rounded text-xs font-bold ${job.status === 'open' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                {job.status.toUpperCase()}
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copyShareLink(job.id)}
                                className={`text-xs h-7 px-2 ${copiedId === job.id ? 'text-green-600 bg-green-50' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
                            >
                                {copiedId === job.id ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Copied</> : <><Share2 className="w-3 h-3 mr-1" /> Share Link</>}
                            </Button>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-1">{job.title}</h3>
                        <p className="text-sm text-slate-500 mb-6">{job.experienceLevel} Level</p>

                        <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-700">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold leading-none">{job.applicantCount}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">Applicants</p>
                                </div>
                            </div>

                            <Link href={`/employer/jobs/${job.id}`}>
                                <Button className="bg-slate-900 hover:bg-black text-white font-bold text-sm h-9">
                                    View Pipeline <ArrowRight className="w-4 h-4 ml-2" />
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