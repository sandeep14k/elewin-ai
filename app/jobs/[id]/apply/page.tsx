"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/authcontext"
import { getJobById, submitApplication } from "@/lib/applications"
import { Job } from "@/types/platform"
import { useRouter } from "next/navigation"
import { Briefcase, Github, Linkedin, FileText, Loader2, Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Navbar from "@/components/navbar"

export default function ApplicationPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [job, setJob] = useState<Job | null>(null)
  const [isLoadingJob, setIsLoadingJob] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    resumeUrl: "", // For simplicity, accepting a Google Drive/Dropbox link for now
    githubUsername: "",
    linkedinUrl: ""
  })

  // Fetch the job details when the page loads
  useEffect(() => {
    const loadJob = async () => {
      const jobData = await getJobById(params.id)
      setJob(jobData)
      setIsLoadingJob(false)
      
      // Auto-fill if user is logged in
      if (user) {
        setFormData(prev => ({
          ...prev,
          candidateName: user.displayName || "",
          candidateEmail: user.email || ""
        }))
      }
    }
    loadJob()
  }, [params.id, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return

    setIsSubmitting(true)
    try {
      await submitApplication({
        jobId: job.id!,
        jobTitle: job.title,
        candidateId: user?.uid || "anonymous", // Fallback if applying as guest
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        resumeUrl: formData.resumeUrl,
        githubUsername: formData.githubUsername.replace("@", ""), // Clean input
        linkedinUrl: formData.linkedinUrl
      })

      setIsSuccess(true)
      toast({ title: "Application Sent!", description: "Your profile is being analyzed." })
    } catch (error) {
      toast({ title: "Error", description: "Could not submit application.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingJob) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
  }

  if (!job) {
    return <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Job Not Found</h1>
        <p className="text-slate-500">This position may have been closed.</p>
    </div>
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-4">
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl max-w-lg w-full text-center border border-slate-100 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Received!</h2>
                <p className="text-slate-500 mb-6 leading-relaxed">
                    Our AI is currently analyzing your GitHub profile and resume. We will notify the employer of your verified technical graph shortly.
                </p>
                <Button onClick={() => router.push('/')} className="bg-slate-800 hover:bg-slate-900 text-white px-8">Return Home</Button>
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        
        {/* Job Header */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{job.title}</h1>
                    <p className="text-lg text-slate-600 mt-1">{job.companyName}</p>
                </div>
                <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-bold border border-orange-200">
                    {job.experienceLevel}
                </div>
            </div>
            
            <p className="text-slate-700 mb-6 leading-relaxed text-sm">
                {job.description}
            </p>

            <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Required Technical Verification</p>
                <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map(skill => (
                        <span key={skill} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                            {skill}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
             Submit Your Profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Full Name</label>
              <input required type="text" value={formData.candidateName} onChange={e => setFormData({...formData, candidateName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <input required type="email" value={formData.candidateEmail} onChange={e => setFormData({...formData, candidateEmail: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-800" /> GitHub Username
              <span className="text-xs text-orange-600 font-normal flex items-center bg-orange-50 px-2 py-0.5 rounded ml-auto">
                <Sparkles className="w-3 h-3 mr-1" /> Used for AI Verification
              </span>
            </label>
            <input required type="text" placeholder="e.g. torvalds" value={formData.githubUsername} onChange={e => setFormData({...formData, githubUsername: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm" />
            <p className="text-xs text-slate-500 mt-1">We will analyze your public repositories to verify your skills against the job requirements.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Resume Link</label>
                <input required type="url" placeholder="Google Drive, Dropbox, or Portfolio URL" value={formData.resumeUrl} onChange={e => setFormData({...formData, resumeUrl: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn URL (Optional)</label>
                <input type="url" placeholder="https://linkedin.com/in/..." value={formData.linkedinUrl} onChange={e => setFormData({...formData, linkedinUrl: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <Button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 rounded-xl text-base font-bold shadow-lg shadow-orange-500/20">
              {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting securely...</> : "Submit Application"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}