"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/context/authcontext"
import { getJobById, submitApplication } from "@/lib/applications"
import { Job } from "@/types/platform"
import { useRouter } from "next/navigation"
import { 
  Briefcase, Github, Linkedin, FileText, Loader2, 
  Sparkles, CheckCircle2, Copy, ExternalLink, Share2 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Navbar from "@/components/navbar"

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [job, setJob] = useState<Job | null>(null)
  const [isLoadingJob, setIsLoadingJob] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    resumeUrl: "",
    githubUsername: "",
    linkedinUrl: ""
  })

  useEffect(() => {
    const loadJob = async () => {
      const jobData = await getJobById(id)
      setJob(jobData)
      setIsLoadingJob(false)
      if (user) {
        setFormData(prev => ({
          ...prev,
          candidateName: user.displayName || "",
          candidateEmail: user.email || ""
        }))
      }
    }
    loadJob()
  }, [id, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return

    setIsSubmitting(true)
    try {
      // 1. Submit to Firestore and get the generated ID
      const applicationId = await submitApplication({
        jobId: job.id!,
        jobTitle: job.title,
        candidateId: user?.uid || "anonymous_guest",
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        resumeUrl: formData.resumeUrl,
        githubUsername: formData.githubUsername.replace("@", ""),
        linkedinUrl: formData.linkedinUrl
      })

      // 2. Trigger AI Analysis
      fetch("/api/analyze-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId })
      }).catch(err => console.error("AI Trigger failed:", err))

      setSubmittedId(applicationId)
      toast({ title: "Application Sent!", description: "Your unique tracking link is ready." })
    } catch (error) {
      toast({ title: "Error", description: "Could not submit application.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyLink = () => {
    const link = `${window.location.origin}/status/${submittedId}`
    navigator.clipboard.writeText(link)
    toast({ title: "Link Copied!", description: "You can now save this link to track your status." })
  }

  if (isLoadingJob) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>

  // --- SUCCESS STATE: THE MAGIC LINK CARD ---
  if (submittedId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl max-w-xl w-full text-center border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">You're in the Pipeline!</h2>
            <p className="text-slate-500 mb-10 leading-relaxed">
              Our AI is now scanning your GitHub to generate your <b>Skill Graph</b>. Save this private link to track your verification and hiring status.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3 mb-8 group">
               <div className="flex-grow text-left overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase ml-1">Your Tracking Link</p>
                  <p className="text-sm font-mono text-slate-600 truncate">elewin.com/status/{submittedId}</p>
               </div>
               <Button onClick={copyLink} variant="ghost" size="icon" className="shrink-0 hover:bg-white hover:text-orange-500 transition-all">
                  <Copy className="w-4 h-4" />
               </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
               <Button onClick={() => router.push(`/status/${submittedId}`)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-14 rounded-2xl font-bold shadow-lg shadow-orange-500/20">
                  View My Skill Graph <ExternalLink className="w-4 h-4 ml-2" />
               </Button>
               <Button onClick={() => router.push('/')} variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-slate-200">
                  Return Home
               </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Form UI remains the same as before */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">{job?.title}</h1>
                    <p className="text-lg text-slate-500 font-medium">{job?.companyName}</p>
                </div>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">{job?.description}</p>
            <div className="flex flex-wrap gap-2">
                {job?.requiredSkills.map(s => (
                    <span key={s} className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100">#{s}</span>
                ))}
            </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Submit Technical Profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
              <input required type="text" value={formData.candidateName} onChange={e => setFormData({...formData, candidateName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
              <input required type="email" value={formData.candidateEmail} onChange={e => setFormData({...formData, candidateEmail: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex justify-between">
              <span>GitHub Username</span>
              <span className="text-orange-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Verification Required</span>
            </label>
            <div className="relative">
                <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input required type="text" placeholder="e.g. sandeep14k" value={formData.githubUsername} onChange={e => setFormData({...formData, githubUsername: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Resume Link (Google Drive / Dropbox)</label>
            <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input required type="url" placeholder="Paste direct link here..." value={formData.resumeUrl} onChange={e => setFormData({...formData, resumeUrl: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white h-16 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/20 transition-all">
            {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying Profile...</> : "Apply with Proof of Work"}
          </Button>
        </form>
      </main>
    </div>
  )
}