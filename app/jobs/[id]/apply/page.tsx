"use client"

import { useState, useEffect, use } from "react"
import { getJobById, submitApplication } from "@/lib/applications"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Job } from "@/types/platform"
import { useRouter } from "next/navigation"
import { 
  Github, FileText, Loader2, Sparkles, CheckCircle2, 
  Copy, ExternalLink, ShieldAlert, Upload, Link as LinkIcon 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Navbar from "@/components/navbar"

export default function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [job, setJob] = useState<Job | null>(null)
  const [isLoadingJob, setIsLoadingJob] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  
  const [resumeMode, setResumeMode] = useState<"upload" | "link">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    resumeUrl: "",
    githubUsername: ""
  })

  useEffect(() => {
    const loadJob = async () => {
      const jobData = await getJobById(id)
      setJob(jobData)
      setIsLoadingJob(false)
    }
    loadJob()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let finalResumeUrl = formData.resumeUrl

      // 1. HANDLE FILE UPLOAD
      if (resumeMode === "upload" && file) {
        const fileRef = ref(storage, `resumes/${Date.now()}_${file.name}`)
        const uploadResult = await uploadBytes(fileRef, file)
        finalResumeUrl = await getDownloadURL(uploadResult.ref)
      } else if (resumeMode === "link" && !finalResumeUrl) {
        throw new Error("Please provide a resume link.")
      }

      // 2. SUBMIT TO FIRESTORE
      const applicationId = await submitApplication({
        jobId: job!.id!,
        jobTitle: job!.title,
        candidateId: "guest_" + Date.now(),
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        resumeUrl: finalResumeUrl,
        githubUsername: formData.githubUsername.replace("@", "").trim(),
      })

      // 3. TRIGGER AI ANALYSIS & ACCESS CHECK
      const res = await fetch("/api/analyze-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId })
      })
      
      const result = await res.json()
      
      // If AI returns error because it can't read the link
      if (result.error) {
        toast({ 
          title: "Forensic Reject", 
          description: "Resume link is private or unreadable. Please check permissions.", 
          variant: "destructive" 
        })
        setIsSubmitting(false)
        return
      }

      setSubmittedId(applicationId)
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const trackingLink = `${baseUrl}/status/${submittedId}`

  if (isLoadingJob) return <div className="min-h-screen flex items-center justify-center bg-[#050A15]"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>

  if (submittedId) {
    return (
      <div className="min-h-screen bg-[#050A15] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Verified.</h2>
          <p className="text-slate-500 mb-8 text-sm">Your profile is now being audited against live GitHub data.</p>
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3 mb-8">
            <div className="flex-grow text-left truncate">
               <p className="text-[10px] font-black text-slate-400 uppercase">Magic Status Link</p>
               <p className="text-xs font-mono text-slate-600 truncate">{trackingLink}</p>
            </div>
            <Button onClick={() => { navigator.clipboard.writeText(trackingLink); toast({ title: "Copied!" }) }} variant="ghost" size="icon">
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <Button onClick={() => router.push(`/status/${submittedId}`)} className="w-full bg-orange-500 h-14 rounded-2xl font-bold text-white">
            Enter Dashboard <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        
        <div className="bg-[#050A15] text-white p-8 rounded-[40px] mb-8 relative overflow-hidden">
            <div className="relative z-10">
                <h1 className="text-3xl font-black mb-2">{job?.title}</h1>
                <p className="text-slate-400 text-sm">{job?.companyName} • Forensic Recruitment Active</p>
            </div>
            <Sparkles className="absolute right-10 top-10 w-20 h-20 text-orange-500/20" />
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-200 space-y-8">
          
          <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Full Name</label>
                  <input required value={formData.candidateName} onChange={e => setFormData({...formData, candidateName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Email</label>
                  <input required type="email" value={formData.candidateEmail} onChange={e => setFormData({...formData, candidateEmail: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
               </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Public GitHub Username</label>
            <div className="relative">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input required placeholder="sandeep14k" value={formData.githubUsername} onChange={e => setFormData({...formData, githubUsername: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono" />
            </div>
          </div>

          {/* RESUME SELECTION */}
          <div className="space-y-4">
            <div className="flex gap-2">
                <Button type="button" onClick={() => setResumeMode("upload")} variant={resumeMode === "upload" ? "default" : "outline"} className="rounded-xl text-[10px] font-black uppercase"><Upload className="w-3 h-3 mr-2" /> Upload PDF</Button>
                <Button type="button" onClick={() => setResumeMode("link")} variant={resumeMode === "link" ? "default" : "outline"} className="rounded-xl text-[10px] font-black uppercase"><LinkIcon className="w-3 h-3 mr-2" /> Paste Link</Button>
            </div>

            {resumeMode === "upload" ? (
                <div className="border-2 border-dashed border-slate-200 p-10 rounded-3xl text-center hover:border-orange-500 transition-all">
                    <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="resume-file" />
                    <label htmlFor="resume-file" className="cursor-pointer">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-600">{file ? file.name : "Click to upload Resume (PDF/DOC)"}</p>
                    </label>
                </div>
            ) : (
                <div className="space-y-2">
                    <input required placeholder="https://drive.google.com/..." value={formData.resumeUrl} onChange={e => setFormData({...formData, resumeUrl: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                    <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <p className="text-[10px] font-bold text-amber-700 uppercase">Warning: Link must be PUBLIC (Open to view for anyone)</p>
                    </div>
                </div>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#050A15] hover:bg-black text-white h-16 rounded-2xl font-black text-lg shadow-2xl transition-all">
            {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying Accessibility...</> : "Submit Forensic Application"}
          </Button>
        </form>
      </main>
    </div>
  )
}