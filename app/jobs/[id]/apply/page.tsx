"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/context/authcontext"
import { getJobById, submitApplication } from "@/lib/applications"
import { Job } from "@/types/platform"
import { useRouter } from "next/navigation"
import { signInWithPopup, GithubAuthProvider, getAdditionalUserInfo, linkWithPopup, signInWithCredential } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { 
  Briefcase, Github, FileText, Loader2, UploadCloud,
  Sparkles, CheckCircle2, Copy, ExternalLink, 
  AlertTriangle, Link as LinkIcon, Lock, ShieldCheck, ChevronRight, Mail, Trash2, Fingerprint,
  School, X, Info, Trophy, LayoutGrid,
  Code2, EyeOff,
  Target
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

  // --- File Upload & GitHub Auth State ---
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isGithubConnected, setIsGithubConnected] = useState(false)

  // Verification States
  const [isVerifyingDoc, setIsVerifyingDoc] = useState<number | null>(null)
  const [activeOtpIndex, setActiveOtpIndex] = useState<number | null>(null)
  const [corpEmail, setCorpEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request")
  const [isProcessingOtp, setIsProcessingOtp] = useState(false)

  // Coding Profile States
  const [platformInput, setPlatformInput] = useState({ platform: "leetcode", handle: "" })
  const [isLinkingPlatform, setIsLinkingPlatform] = useState(false)
  const [verificationStep, setVerificationStep] = useState<1 | 2>(1);
  const [verificationCode, setVerificationCode] = useState("");

  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    resumeUrl: "",
    githubUsername: "",
    githubToken: ""
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
      try {
        const jobData = await getJobById(id)
        if (!jobData) {
          toast({ title: "Error", description: "Job not found or has been removed.", variant: "destructive" });
        }
        setJob(jobData)
        
        if (user) {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
             const uData = userDocSnap.data();
             
             setFormData(prev => ({ 
               ...prev, 
               candidateName: uData.name || "", 
               candidateEmail: uData.email || "", 
               githubUsername: uData.githubUsername || "", 
               githubToken: uData.githubToken || "" 
             }))
             
             if (uData.githubUsername && uData.githubToken) {
               setIsGithubConnected(true)
             }
  
             if (uData.experienceLibrary || uData.projectsLibrary) {
                setPassportData({ 
                  workExperience: uData.experienceLibrary || [], 
                  projects: uData.projectsLibrary || [], 
                  education: uData.academicsLibrary || [], 
                  skills: uData.savedSkills || [] ,
                  codingProfiles: uData.codingProfiles || null
                })
             }
          }
        }
      } catch (error: any) {
        toast({ title: "Failed to load data", description: error.message, variant: "destructive" });
      } finally {
        setIsLoadingJob(false)
      }
    }
    loadJobAndUser()
  }, [id, user, toast])

 const handleConnectGithub = async () => {
    try {
      const provider = new GithubAuthProvider()
      provider.addScope('read:user')
      provider.addScope('public_repo') 
      
      let result;
      
      if (user) {
        try {
          result = await linkWithPopup(auth.currentUser!, provider)
        } catch (linkError: any) {
          if (linkError.code === 'auth/credential-already-in-use') {
             const credential = GithubAuthProvider.credentialFromError(linkError);
             if (credential) {
               result = await signInWithCredential(auth, credential);
             } else {
               throw linkError; 
             }
          } else {
             throw linkError;
          }
        }
      } else {
        result = await signInWithPopup(auth, provider)
      }
      
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      const details = getAdditionalUserInfo(result)
      const verifiedUsername = details?.username

      if (verifiedUsername && token) {
        setFormData(prev => ({ 
           ...prev, 
           githubUsername: verifiedUsername,
           githubToken: token 
        }))
        setIsGithubConnected(true)
        toast({ title: "Identity Verified!", description: `Successfully connected as @${verifiedUsername}` })
      }
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        toast({ 
          title: "Email Conflict", 
          description: "This email is already registered. Please log in first.", 
          variant: "destructive" 
        })
      } else {
        toast({ 
          title: "Connection Failed", 
          description: error.message || "Could not connect to GitHub.", 
          variant: "destructive" 
        })
      }
    }
  }

  const handleLiveParse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job) return toast({ title: "Error", description: "Job details are missing.", variant: "destructive" });

    if (!isGithubConnected) {
      return toast({ title: "Verification Required", description: "Please connect your GitHub account to proceed.", variant: "destructive" });
    }

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
      
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to process document.");
      }
      
      if (data.structured) {
        let finalBlocks = data.structured;

        if (passportData) {
          const existingExp = new Set((passportData.workExperience || []).map((e: any) => `${e.title}-${e.company}`.toLowerCase()));
          const newExp = (data.structured.workExperience || []).filter((e: any) => !existingExp.has(`${e.title}-${e.company}`.toLowerCase()));

          const existingProj = new Set((passportData.projects || []).map((p: any) => (p.name || "").toLowerCase()));
          const newProj = (data.structured.projects || []).filter((p: any) => !existingProj.has((p.name || "").toLowerCase()));

          finalBlocks = {
            ...data.structured,
            workExperience: [...(passportData.workExperience || []), ...newExp],
            projects: [...(passportData.projects || []), ...newProj],
            education: data.structured.education?.length > 0 ? data.structured.education : (passportData.education || []),
            codingProfiles: passportData.codingProfiles || null
          };
          toast({ title: "Data Merged", description: "Verified Passport records appended to job-specific resume." });
        }

        setParsedBlocks(finalBlocks)
        setStep(2)
      } else { 
        throw new Error(data.raw || "Failed to extract structured data from resume.") 
      }
    } catch (error: any) {
      toast({ title: "Extraction Failed", description: error.message || "PDF could not be analyzed.", variant: "destructive" })
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
        throw new Error(data.error || `The email you entered does not appear to be an official work email for ${companyName}.`);
      }
    } catch (e: any) { 
      toast({ title: "OTP Request Failed", description: e.message || "Verification service offline.", variant: "destructive" }); 
    } finally { setIsProcessingOtp(false); }
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
        throw new Error(data.error || "Invalid OTP code.");
      }
    } catch (e: any) { 
      toast({ title: "Verification Failed", description: e.message || "Something went wrong.", variant: "destructive" }); 
    } finally { setIsProcessingOtp(false); }
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
      const res = await fetch("/api/verify-document", { method: "POST", body: uploadData });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to verify document.");

      const updated = [...parsedBlocks.workExperience];
      updated[index].verificationBadge = "Staged for Forensic Audit";
      updated[index].documentType = "Staged Document"; 
      setParsedBlocks({...parsedBlocks, workExperience: updated});
      
      toast({ 
        title: "Document Staged", 
        description: "Your proof of work has been accepted into the vault for forensic analysis. No further action needed." 
      });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message || "File transmission error.", variant: "destructive" });
    } finally { setIsVerifyingDoc(null); }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (!job?.id) throw new Error("Job ID is missing. Please refresh the page.");
      if (!formData.candidateName || !formData.candidateEmail) throw new Error("Candidate name and email are required.");

      const applicationId = await submitApplication({
        jobId: job.id,
        jobTitle: job.title,
        candidateId: user?.uid || "anonymous_guest",
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        resumeUrl: formData.resumeUrl,
        githubUsername: formData.githubUsername.replace("@", ""),
        linkedinUrl: "",
        passportBlocks: parsedBlocks 
      })
      
      // Trigger AI Analysis in the background (fire and forget)
      fetch("/api/analyze-application", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ applicationId, parsedBlocks, githubToken: formData.githubToken })
      }).catch(err => console.error("Background AI analysis failed to trigger:", err));

      setSubmittedId(applicationId); 
      setStep(3);
    } catch (error: any) { 
      toast({ title: "Submission Error", description: error.message || "Failed to submit application to the database.", variant: "destructive" }); 
    } finally { 
      setIsSubmitting(false) 
    }
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
                  <p className="text-sm font-bold text-slate-600 truncate">
                    {process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '')}/status/{submittedId}
                  </p>               
               </div>
               <Button 
                  onClick={() => { 
                    const link = `${process.env.NEXT_PUBLIC_BASE_URL}/status/${submittedId}`;
                    navigator.clipboard.writeText(link); 
                    toast({ title: "Link Copied to Clipboard" }); 
                  }} 
                  variant="ghost" 
                  size="icon"
                >
                  <Copy className="w-4 h-4" />
                </Button>
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
              
              {user ? (
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center justify-between mb-6">
                   <div>
                     <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">EleWin Verified Applicant</p>
                     <p className="font-black text-lg text-slate-900">{formData.candidateName}</p>
                     <p className="text-sm font-medium text-slate-500">{formData.candidateEmail}</p>
                   </div>
                   <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-6 h-6 text-blue-600" />
                   </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input required type="text" value={formData.candidateName} onChange={e => setFormData({...formData, candidateName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input required type="email" value={formData.candidateEmail} onChange={e => setFormData({...formData, candidateEmail: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                  <span>GitHub Profile</span>
                  <span className="text-orange-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Identity Verification
                  </span>
                </label>
                
                {!isGithubConnected ? (
                  <Button 
                    type="button" 
                    onClick={handleConnectGithub}
                    className="w-full bg-[#24292e] hover:bg-[#1b1f23] text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all"
                  >
                    <Github className="w-5 h-5" /> Connect GitHub Account
                  </Button>
                ) : (
                  <div className="w-full p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                      <Github className="w-5 h-5 text-green-700" />
                      <span className="font-mono font-bold text-green-800">
                        @{formData.githubUsername}
                      </span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>

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
                                      <Button type="button" size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white" disabled={isProcessingOtp} onClick={() => handleRequestOTP(index, exp.company)}>
                                         {isProcessingOtp ? <Loader2 className="w-4 h-4 animate-spin"/> : "Validate Domain"}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <input type="text" placeholder="6-digit OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none text-center font-mono" />
                                      <Button type="button" size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700 text-white" disabled={isProcessingOtp} onClick={() => handleVerifyOTP(index)}>Verify Link</Button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <Button type="button" variant="outline" size="sm" className="w-full text-xs font-bold border-blue-200 text-blue-700" onClick={() => { setActiveOtpIndex(index); setOtpStep("request"); setCorpEmail(""); }}>Verify Email</Button>
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
                              <Button type="button" variant="outline" size="sm" className="w-full text-xs font-bold border-indigo-200 text-indigo-700" onClick={() => document.getElementById(`vault-upload-${index}`)?.click()} disabled={isVerifyingDoc === index}>
                                {isVerifyingDoc === index ? <Loader2 className="w-4 h-4 animate-spin" /> : "Secure Vault"}
                              </Button>
                           </div>

                           <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
                              <div><h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Option C</h5><p className="text-[10px] text-slate-500 font-medium mb-4">AI will proxy weight this role based on your public open-source timeline.</p></div>
                              <Button type="button" variant="ghost" size="sm" className="w-full text-xs font-bold text-slate-500" onClick={() => { const updated = [...parsedBlocks.workExperience]; updated[index].verificationBadge = "Public Proxy Weighting"; setParsedBlocks({...parsedBlocks, workExperience: updated}); }}>Use Proxy</Button>
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

            {/* --- ALGORITHMIC PROOF SECTION --- */}
            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-200">
               <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                  <h3 className="text-2xl font-black flex items-center gap-2">
                    <Target className="w-6 h-6 text-emerald-500" /> Algorithmic Proof
                  </h3>
               </div>

               {/* Connection Input & Verification */}
               <div className="flex flex-col gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm">
                  {verificationStep === 1 ? (
                    <div className="flex flex-col md:flex-row gap-3">
                      <select 
                        value={platformInput.platform} 
                        onChange={(e) => setPlatformInput({...platformInput, platform: e.target.value})}
                        className="p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-emerald-500 bg-white text-slate-700"
                      >
                        <option value="leetcode">LeetCode</option>
                        <option value="codeforces">Codeforces</option>
                        <option value="codechef">CodeChef</option>
                        <option value="hackerrank">HackerRank</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Enter Username" 
                        value={platformInput.handle}
                        onChange={(e) => setPlatformInput({...platformInput, handle: e.target.value})}
                        className="flex-grow p-4 rounded-xl border border-slate-200 font-medium outline-none focus:border-emerald-500 text-slate-900"
                      />
                      <Button 
                        type="button"
                        onClick={() => {
                          if (!platformInput.handle) return;
                          // Generate a unique 6-character hex code for this session
                          const code = `EleWin-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                          setVerificationCode(code);
                          setVerificationStep(2);
                        }}
                        disabled={!platformInput.handle}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8 h-[56px]"
                      >
                        Initiate Link
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 border border-emerald-200 p-6 rounded-2xl animate-in fade-in zoom-in-95">
                      <div className="flex items-start gap-4">
                        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm shrink-0">
                          <ShieldCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-lg font-black text-slate-900 mb-1">Verify Ownership of @{platformInput.handle}</h4>
                          <p className="text-sm text-slate-600 font-medium mb-4">
                            To prove this is your account, please paste the code below into your <strong>{platformInput.platform === 'leetcode' ? 'About Me or Name' : platformInput.platform === 'codeforces' ? 'City or Organization' : 'Bio / About section'}</strong> on {platformInput.platform}.
                          </p>
                          
                          <div className="flex items-center gap-3 mb-6">
                            <code className="bg-white px-4 py-2 rounded-lg border border-slate-200 font-mono font-black text-lg text-slate-800 tracking-wider shadow-inner">
                              {verificationCode}
                            </code>
                            <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => {
                              navigator.clipboard.writeText(verificationCode);
                              toast({ title: "Copied to clipboard" });
                            }}>Copy Code</Button>
                          </div>

                          <div className="flex gap-3">
                            <Button 
                              type="button"
                              onClick={async () => {
                                setIsLinkingPlatform(true);
                                try {
                                  const res = await fetch("/api/coding-stats", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ...platformInput, verificationCode }) 
                                  });
                                  
                                  const data = await res.json();
                                  
                                  // EXPLICITLY CHECK res.ok BEFORE PROCEEDING
                                  if (!res.ok) {
                                     throw new Error(data.error || "Verification code not found on profile. Please ensure it is saved publicly and try again.");
                                  }

                                  // Add to the current application data
                                  const newProfiles = {
                                    ...(parsedBlocks.codingProfiles || {}),
                                    [platformInput.platform]: { handle: platformInput.handle, stats: data.data, verifiedAt: new Date().toISOString() }
                                  };
                                  setParsedBlocks({ ...parsedBlocks, codingProfiles: newProfiles });
                                  
                                  // Also save to user profile if they're logged in
                                  if (user) {
                                    await setDoc(doc(db, "users", user.uid), {
                                      codingProfiles: {
                                        ...(passportData?.codingProfiles || {}),
                                        ...newProfiles
                                      }
                                    }, { merge: true });
                                  }

                                  setPlatformInput({ platform: "leetcode", handle: "" });
                                  setVerificationStep(1);
                                  toast({ title: "Profile Verified & Attached!", description: "You can now remove the code from your profile." });
                                  
                                } catch (e: any) {
                                  // NOW PROPERLY DISPLAYS THE 403 ERROR MESSAGE
                                  toast({ 
                                    title: "Verification Failed", 
                                    description: e.message || "Something went wrong.", 
                                    variant: "destructive" 
                                  });
                                } finally { 
                                  setIsLinkingPlatform(false); 
                                }
                              }}
                              disabled={isLinkingPlatform}
                              className="bg-[#050A15] hover:bg-black text-white rounded-xl font-bold px-8"
                            >
                              {isLinkingPlatform ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've added the code. Verify Now."}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setVerificationStep(1)} className="text-slate-500 font-bold hover:text-slate-900">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
               </div>

               {/* Display Linked Profiles */}
               {parsedBlocks.codingProfiles && Object.keys(parsedBlocks.codingProfiles).length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsedBlocks.codingProfiles.leetcode && (
                      <div className="p-6 rounded-3xl border-2 border-emerald-100 bg-emerald-50/30 shadow-sm flex flex-col relative group">
                         <button type="button" onClick={() => {
                            const updated = {...parsedBlocks.codingProfiles};
                            delete updated.leetcode;
                            setParsedBlocks({...parsedBlocks, codingProfiles: updated});
                         }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                         
                         <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">LeetCode</p>
                         <h4 className="font-black text-xl text-slate-900 mb-4">@{parsedBlocks.codingProfiles.leetcode.handle}</h4>
                         <div className="grid grid-cols-2 gap-4 mt-auto">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Problems Solved</p>
                              <p className="text-2xl font-black text-emerald-600">{parsedBlocks.codingProfiles.leetcode.stats.totalSolved}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Contest Rating</p>
                              <p className="text-2xl font-black text-slate-900">{parsedBlocks.codingProfiles.leetcode.stats.contestRating || "N/A"}</p>
                            </div>
                         </div>
                         <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                           <ShieldCheck className="w-3 h-3" /> Attached
                         </span>
                      </div>
                    )}
                    {parsedBlocks.codingProfiles.codeforces && (
                      <div className="p-6 rounded-3xl border-2 border-blue-100 bg-blue-50/30 shadow-sm flex flex-col relative group">
                         <button type="button" onClick={() => {
                            const updated = {...parsedBlocks.codingProfiles};
                            delete updated.codeforces;
                            setParsedBlocks({...parsedBlocks, codingProfiles: updated});
                         }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                         
                         <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Codeforces</p>
                         <h4 className="font-black text-xl text-slate-900 mb-4">@{parsedBlocks.codingProfiles.codeforces.handle}</h4>
                         <div className="grid grid-cols-2 gap-4 mt-auto">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Current Rating</p>
                              <p className="text-2xl font-black text-blue-600">{parsedBlocks.codingProfiles.codeforces.stats.rating}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Rank</p>
                              <p className="text-lg font-black text-slate-900 capitalize">{parsedBlocks.codingProfiles.codeforces.stats.rank}</p>
                            </div>
                         </div>
                         <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                           <ShieldCheck className="w-3 h-3" /> Attached
                         </span>
                      </div>
                    )}
                    {parsedBlocks.codingProfiles.codechef && (
                      <div className="p-6 rounded-3xl border-2 border-amber-100 bg-amber-50/30 shadow-sm flex flex-col relative group">
                         <button type="button" onClick={() => {
                            const updated = {...parsedBlocks.codingProfiles};
                            delete updated.codechef;
                            setParsedBlocks({...parsedBlocks, codingProfiles: updated});
                         }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                         
                         <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">CodeChef</p>
                         <h4 className="font-black text-xl text-slate-900 mb-4">@{parsedBlocks.codingProfiles.codechef.handle}</h4>
                         <div className="grid grid-cols-2 gap-4 mt-auto">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Current Rating</p>
                              <p className="text-2xl font-black text-amber-600">{parsedBlocks.codingProfiles.codechef.stats.rating}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Division</p>
                              <p className="text-xl font-black text-slate-900">{parsedBlocks.codingProfiles.codechef.stats.stars}</p>
                            </div>
                         </div>
                         <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                           <ShieldCheck className="w-3 h-3" /> Attached
                         </span>
                      </div>
                    )}
                    {parsedBlocks.codingProfiles.hackerrank && (
                      <div className="p-6 rounded-3xl border-2 border-green-100 bg-green-50/30 shadow-sm flex flex-col relative group">
                         <button type="button" onClick={() => {
                            const updated = {...parsedBlocks.codingProfiles};
                            delete updated.hackerrank;
                            setParsedBlocks({...parsedBlocks, codingProfiles: updated});
                         }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                         
                         <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">HackerRank</p>
                         <h4 className="font-black text-xl text-slate-900 mb-4">@{parsedBlocks.codingProfiles.hackerrank.handle}</h4>
                         <div className="grid grid-cols-2 gap-4 mt-auto">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Level</p>
                              <p className="text-2xl font-black text-green-600">Lvl {parsedBlocks.codingProfiles.hackerrank.stats.level}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Title</p>
                              <p className="text-lg font-black text-slate-900 capitalize truncate">{parsedBlocks.codingProfiles.hackerrank.stats.title}</p>
                            </div>
                         </div>
                         <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                           <ShieldCheck className="w-3 h-3" /> Attached
                         </span>
                      </div>
                    )}
                 </div>
               )}
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