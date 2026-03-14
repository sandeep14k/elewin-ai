"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/context/authcontext"
import { getJobById, submitApplication } from "@/lib/applications"
import { Job } from "@/types/platform"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { 
  Briefcase, Github, FileText, Loader2, UploadCloud,
  Sparkles, CheckCircle2, Copy, ExternalLink, 
  AlertTriangle, Link as LinkIcon, Lock, ShieldCheck, ChevronRight, Mail, Trash2, Fingerprint,
  School, X, Info, Trophy, LayoutGrid,
  Code2, EyeOff
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
  
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const [parsedBlocks, setParsedBlocks] = useState<any>(null)
  const [passportData, setPassportData] = useState<any>(null)

  // --- NEW: File Upload State ---
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  // Verification States
  const [isVerifyingDoc, setIsVerifyingDoc] = useState<number | null>(null)
  const [activeOtpIndex, setActiveOtpIndex] = useState<number | null>(null)
  const [corpEmail, setCorpEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request")
  const [isProcessingOtp, setIsProcessingOtp] = useState(false)

  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    resumeUrl: "",
    githubUsername: "",
  })

  const calculateDuration = (start: string, end: string) => {
    try {
      const startDate = new Date(start);
      const endDate = end.toLowerCase().includes('present') ? new Date() : new Date(end);
      let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
      months -= startDate.getMonth();
      months += endDate.getMonth();
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      let res = "";
      if (years > 0) res += `${years} yr `;
      if (remainingMonths > 0) res += `${remainingMonths} mo`;
      return res || "Less than a month";
    } catch (e) { return "Duration unknown"; }
  }

  useEffect(() => {
    const loadJobAndUser = async () => {
      const jobData = await getJobById(id)
      setJob(jobData)
      setIsLoadingJob(false)
      if (user) {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
           const uData = userDocSnap.data();
           setFormData(prev => ({ ...prev, candidateName: uData.name || "", candidateEmail: uData.email || "", githubUsername: uData.githubUsername || "" }))
           if (uData.experienceLibrary || uData.projectsLibrary) {
              setPassportData({ workExperience: uData.experienceLibrary || [], projects: uData.projectsLibrary || [], education: uData.academicsLibrary || [], skills: uData.savedSkills || [] })
           }
        }
      }
    }
    loadJobAndUser()
  }, [id, user])

  // --- UPDATED: Merge Job-Specific Parse with Passport Data ---
  const handleLiveParse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return

    if (!resumeFile && !formData.resumeUrl) {
      return toast({ title: "Missing Resume", description: "Please upload a PDF file or provide a public link.", variant: "destructive" });
    }

    setIsParsing(true)
    try {
      const uploadData = new FormData();
      if (resumeFile) uploadData.append("file", resumeFile);
      if (formData.resumeUrl) uploadData.append("resumeUrl", formData.resumeUrl);

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: uploadData
      })
      const data = await response.json()
      
      if (data.structured) {
        let finalBlocks = data.structured;

        // If Passport exists, intelligently merge the arrays to prevent duplicates
        if (passportData) {
          // Track existing items to prevent duplicates from the new parse
          const existingExp = new Set((passportData.workExperience || []).map((e: any) => `${e.title}-${e.company}`.toLowerCase()));
          const newExp = (data.structured.workExperience || []).filter((e: any) => !existingExp.has(`${e.title}-${e.company}`.toLowerCase()));

          const existingProj = new Set((passportData.projects || []).map((p: any) => (p.name || "").toLowerCase()));
          const newProj = (data.structured.projects || []).filter((p: any) => !existingProj.has((p.name || "").toLowerCase()));

          finalBlocks = {
            ...data.structured,
            // Prioritize verified passport data, append new unrecognized parsed data
            workExperience: [...(passportData.workExperience || []), ...newExp],
            projects: [...(passportData.projects || []), ...newProj],
            // Academics must come from the freshly parsed resume or fallback to passport
            education: data.structured.education?.length > 0 ? data.structured.education : (passportData.education || [])
          };
          toast({ title: "Data Merged", description: "Verified Passport records appended to job-specific resume." });
        }

        setParsedBlocks(finalBlocks)
        setStep(2)
      } else { throw new Error("Parse failed") }
    } catch (error) {
      toast({ title: "Extraction Failed", description: "PDF could not be analyzed.", variant: "destructive" })
    } finally { setIsParsing(false) }
  }

  const removeProject = (index: number) => {
    const updated = [...parsedBlocks.projects]
    updated.splice(index, 1)
    setParsedBlocks({ ...parsedBlocks, projects: updated })
  }

  const removeExperience = (index: number) => {
    const updated = [...parsedBlocks.workExperience]
    updated.splice(index, 1)
    setParsedBlocks({ ...parsedBlocks, workExperience: updated })
  }

  const updateProjectUrl = (index: number, url: string) => {
    const updatedProjects = [...parsedBlocks.projects]
    updatedProjects[index].url = url
    setParsedBlocks({ ...parsedBlocks, projects: updatedProjects })
  }

  const handleRequestOTP = async (index: number, companyName: string) => {
    if (!corpEmail) return toast({ title: "Work Email required", variant: "destructive" });
    setIsProcessingOtp(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: corpEmail, companyName })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpStep("verify");
        toast({ title: "Company Identity Validated", description: "OTP sent to verified work domain." });
      } else {
        toast({ 
          title: "Invalid Company Email", 
          description: data.error || `The email you entered does not appear to be an official work email for ${companyName}.`, 
          variant: "destructive" 
        });
      }
    } catch (e) { toast({ title: "Error", description: "Verification service offline.", variant: "destructive" }); }
    finally { setIsProcessingOtp(false); }
  };

  const handleVerifyOTP = async (index: number) => {
    if (!otpCode) return;
    setIsProcessingOtp(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: corpEmail, otp: otpCode })
      });
      const data = await res.json();
      if (res.ok) {
        const updated = [...parsedBlocks.workExperience];
        updated[index].verificationBadge = "Verified — Active Employee";
        setParsedBlocks({...parsedBlocks, workExperience: updated});
        setActiveOtpIndex(null); setCorpEmail(""); setOtpCode(""); setOtpStep("request");
        toast({ title: "Success", description: "Experience verified via corporate link." });
      } else {
        toast({ 
          title: "Verification Failed", 
          description: data.error || "Invalid OTP", 
          variant: "destructive" 
        });
      }
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    finally { setIsProcessingOtp(false); }
  };

  const handleDocumentVerification = async (index: number, companyName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsVerifyingDoc(index);
    toast({ title: "Secure Vault Active", description: "Encrypting & staging document for audit." });

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("companyName", companyName);

    try {
      await fetch("/api/verify-document", { method: "POST", body: uploadData });
      
      const updated = [...parsedBlocks.workExperience];
      updated[index].verificationBadge = "Staged for Forensic Audit";
      updated[index].documentType = "Staged Document"; 
      setParsedBlocks({...parsedBlocks, workExperience: updated});
      
      toast({ 
        title: "Document Staged", 
        description: "Your proof of work has been accepted into the vault for forensic analysis. No further action needed." 
      });
    } catch (error) {
      toast({ title: "Upload Failed", description: "File transmission error.", variant: "destructive" });
    } finally { setIsVerifyingDoc(null); }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    try {
      const applicationId = await submitApplication({
        jobId: job!.id!,
        jobTitle: job!.title,
        candidateId: user?.uid || "anonymous_guest",
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        resumeUrl: formData.resumeUrl,
        githubUsername: formData.githubUsername.replace("@", ""),
        linkedinUrl: "",
        passportBlocks: parsedBlocks 
      })
      fetch("/api/analyze-application", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId, parsedBlocks }) });
      setSubmittedId(applicationId); setStep(3);
    } catch (error) { toast({ title: "Submission Error", variant: "destructive" }); }
    finally { setIsSubmitting(false) }
  }

  const isAcademicsMissing = !parsedBlocks?.education || parsedBlocks?.education?.length === 0;

  if (isLoadingJob) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>

  if (step === 3 && submittedId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl max-w-xl w-full text-center border border-slate-100">
            <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Proof of Work Dispatched</h2>
            <p className="text-slate-500 mb-10 leading-relaxed font-medium">Your forensics and GitHub matrix are being analyzed. Save your tracking link below.</p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3 mb-8">
               <div className="flex-grow text-left overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID</p>
                  <p className="text-sm font-bold text-slate-600 truncate">elewin.io/status/{submittedId}</p>
               </div>
               <Button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/status/${submittedId}`); toast({ title: "Copied" }); }} variant="ghost" size="icon"><Copy className="w-4 h-4" /></Button>
            </div>
            <Button onClick={() => router.push(`/status/${submittedId}`)} className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 rounded-2xl font-black shadow-lg shadow-orange-500/20">View Live Matrix</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        
        <div className="bg-[#050A15] p-8 md:p-10 rounded-[40px] shadow-2xl mb-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-6 text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-orange-400" /> Zero-Trust Forensic Analysis
                </div>
                <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">{job?.title}</h1>
                <p className="text-lg text-slate-400 font-medium flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-400" /> {job?.companyName}</p>
            </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            
            {/* UPDATED PASSPORT BANNER */}
            {passportData && (
               <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 md:p-8 rounded-[40px] text-white shadow-xl shadow-orange-500/20">
                  <h3 className="font-black text-2xl flex items-center gap-2 mb-2"><Fingerprint className="w-6 h-6"/> Passport Active</h3>
                  <p className="text-orange-50 font-medium leading-relaxed">
                    Your verified blocks are ready. Please upload a job-specific resume below to extract your Academics and any new projects or roles. We will merge them automatically.
                  </p>
               </div>
            )}

            <form onSubmit={handleLiveParse} className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl border border-slate-200 space-y-8">
              <h2 className="text-2xl font-black text-slate-900">Identity Record</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input required type="text" value={formData.candidateName} onChange={e => setFormData({...formData, candidateName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input required type="email" value={formData.candidateEmail} onChange={e => setFormData({...formData, candidateEmail: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between"><span>GitHub Username</span><span className="text-orange-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Required for Logic Score</span></label>
                <div className="relative"><Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input required type="text" placeholder="username" value={formData.githubUsername} onChange={e => setFormData({...formData, githubUsername: e.target.value})} className="w-full p-4 pl-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono font-bold text-slate-700" /></div>
              </div>

              {/* NEW FILE UPLOAD COMPONENT */}
              <div className="space-y-2 p-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><UploadCloud className="w-4 h-4 text-blue-500"/> Upload Resume PDF</label>
                 <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)} 
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                 />
                 
                 <div className="text-center w-full my-4 flex items-center gap-2">
                    <div className="h-px bg-slate-200 flex-grow"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OR PASTE URL</span>
                    <div className="h-px bg-slate-200 flex-grow"></div>
                 </div>

                 <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="url" placeholder="Google Drive / Dropbox public link..." value={formData.resumeUrl} onChange={e => setFormData({...formData, resumeUrl: e.target.value})} disabled={!!resumeFile} className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium disabled:opacity-50" />
                 </div>
              </div>

              <Button type="submit" disabled={isParsing} className="w-full bg-[#050A15] hover:bg-black text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 transition-all active:scale-95 group">{isParsing ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Analyzing Document...</> : <span className="flex items-center gap-2">Build Proof of Work <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>}</Button>
            </form>
          </div>
        )}

        {step === 2 && parsedBlocks && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            
            {isAcademicsMissing && (
              <div className="bg-red-50 border border-red-200 p-6 rounded-3xl flex items-start gap-4 shadow-sm animate-pulse">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                <div>
                   <h3 className="text-lg font-black text-red-900 tracking-tight">Academics Block Mandatory</h3>
                   <p className="text-sm text-red-800 font-medium mt-1">EleWin requires an educational record to generate a match score. Submission is blocked.</p>
                </div>
              </div>
            )}

            <div className={`bg-white p-8 rounded-[40px] shadow-xl border ${isAcademicsMissing ? 'border-red-300' : 'border-slate-200'}`}>
               <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2"><School className="w-6 h-6 text-purple-500" /> Education Record</h3>
               <div className="space-y-4">
                 {parsedBlocks.education?.map((edu: any, index: number) => (
                   <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div><h4 className="font-black text-slate-900">{edu.degree}</h4><p className="text-xs text-slate-500 font-bold">{edu.institution} • {edu.endDate}</p></div>
                      <div className="text-right"><span className="text-xs font-black text-slate-400 uppercase tracking-widest">GPA</span><p className="text-sm font-black text-slate-900">{edu.gpa || "N/A"}</p></div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-200">
               <div className="mb-8">
                 <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Briefcase className="w-6 h-6 text-indigo-500" /> Proprietary Verification</h3>
                 <p className="text-sm text-slate-500 font-medium mt-2">Claimed professional experience requires a verification path.</p>
               </div>
               
               <div className="space-y-6">
                 {parsedBlocks.workExperience?.map((exp: any, index: number) => (
                   <div key={index} className="p-6 rounded-3xl border-2 border-slate-100 bg-slate-50 relative group">
                      
                      <button type="button" onClick={() => removeExperience(index)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>

                      <div className="flex justify-between items-start mb-6 pr-8">
                        <div className="flex-grow pr-4">
                          <h4 className="font-black text-xl text-slate-900">{exp.title}</h4>
                          <p className="text-sm text-slate-500 font-bold mb-3">{exp.company} • {exp.startDate} - {exp.endDate} <span className="ml-2 text-blue-600 uppercase text-[10px] bg-blue-50 px-2 py-0.5 rounded">({calculateDuration(exp.startDate, exp.endDate)})</span></p>
                          {exp.description && (
                            <p className="text-sm text-slate-600 font-medium leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
                               {exp.description}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 ${exp.verificationBadge ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                           {exp.verificationBadge ? <><ShieldCheck className="w-4 h-4" /> {exp.verificationBadge}</> : "Unverified"}
                        </span>
                      </div>

                      {!exp.verificationBadge && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between group hover:border-blue-300">
                              <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Option A</h5>
                                <p className="text-[10px] text-slate-500 font-medium mb-4">OTP to your active @{exp.company.replace(/\s+/g, '').toLowerCase()}.com email.</p>
                              </div>
                              {activeOtpIndex === index ? (
                                <div className="space-y-2 mt-2">
                                  {otpStep === "request" ? (
                                    <>
                                      <input type="email" placeholder="work-email@company.com" value={corpEmail} onChange={(e) => setCorpEmail(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
                                      <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white" disabled={isProcessingOtp} onClick={() => handleRequestOTP(index, exp.company)}>
                                         {isProcessingOtp ? <Loader2 className="w-4 h-4 animate-spin"/> : "Validate Domain"}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <input type="text" placeholder="6-digit OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none text-center font-mono" />
                                      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700 text-white" disabled={isProcessingOtp} onClick={() => handleVerifyOTP(index)}>Verify Link</Button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <Button variant="outline" size="sm" className="w-full text-xs font-bold border-blue-200 text-blue-700" onClick={() => { setActiveOtpIndex(index); setOtpStep("request"); setCorpEmail(""); }}>Verify Email</Button>
                              )}
                           </div>

                           <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between group hover:border-indigo-300">
                              <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Option B</h5>
                                <p className="text-[10px] text-slate-500 font-medium mb-4">Upload an Offer Letter or Payslip for forensic scanning.</p>
                              </div>
                              <div className="bg-amber-50 p-2 rounded-lg mb-2 flex items-start gap-2 border border-amber-100">
                                 <EyeOff className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                                 <p className="text-[9px] text-amber-700 leading-tight font-bold">Forensic result is hidden. If scanning fails to match names/dates, score reverts to Option C.</p>
                              </div>
                              <input type="file" accept=".pdf, .png, .jpg, .jpeg" id={`vault-upload-${index}`} className="hidden" onChange={(e) => handleDocumentVerification(index, exp.company, e)} />
                              <Button variant="outline" size="sm" className="w-full text-xs font-bold border-indigo-200 text-indigo-700" onClick={() => document.getElementById(`vault-upload-${index}`)?.click()} disabled={isVerifyingDoc === index}>
                                {isVerifyingDoc === index ? <Loader2 className="w-4 h-4 animate-spin" /> : "Secure Vault"}
                              </Button>
                           </div>

                           <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
                              <div><h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Option C</h5><p className="text-[10px] text-slate-500 font-medium mb-4">AI will proxy weight this role based on your public open-source timeline.</p></div>
                              <Button variant="ghost" size="sm" className="w-full text-xs font-bold text-slate-500" onClick={() => { const updated = [...parsedBlocks.workExperience]; updated[index].verificationBadge = "Public Proxy Weighting"; setParsedBlocks({...parsedBlocks, workExperience: updated}); }}>Use Proxy</Button>
                           </div>
                        </div>
                      )}
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-200">
               <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2"><Code2 className="w-6 h-6 text-blue-500" /> Projects Library</h3>
               <div className="space-y-4">
                 {parsedBlocks.projects?.map((project: any, index: number) => (
                   <div key={index} className={`p-6 rounded-3xl border-2 transition-all relative group ${!project.url ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 bg-slate-50'}`}>
                      <button type="button" onClick={() => removeProject(index)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      <div className="flex justify-between items-start mb-2 pr-8">
                        <h4 className="font-black text-lg text-slate-900">{project.name}</h4>
                        {project.url ? (<span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" /> Linked</span>) : (<span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 shrink-0"><AlertTriangle className="w-3 h-3" /> Missing URL</span>)}
                      </div>
                      {!project.url && (<div className="bg-amber-100 text-amber-800 p-3 rounded-xl mb-4 text-[10px] font-bold leading-tight">⚠ No repository link found. Without verification this project carries 0 weight.</div>)}
                      <p className="text-sm text-slate-500 font-medium mb-4 line-clamp-2 pr-8">{project.description}</p>
                      <div className="relative"><LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="url" placeholder="GitHub Repository URL" value={project.url || ""} onChange={(e) => updateProjectUrl(index, e.target.value)} className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold text-slate-700" /></div>
                   </div>
                 ))}
               </div>
            </div>

            <Button 
                onClick={handleFinalSubmit} 
                disabled={isSubmitting || isAcademicsMissing} 
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 transition-all active:scale-95 group mt-8"
            >
              {isSubmitting ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Dispatched...</> : "Confirm Proof of Work Submission"}
            </Button>
          </div>
        )}

      </main>
    </div>
  )
}