"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/authcontext"
import { db, auth } from "@/lib/firebase" // Ensure auth is imported
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { signInWithPopup, GithubAuthProvider, getAdditionalUserInfo, linkWithPopup, signInWithCredential } from "firebase/auth"
import { addToPassportLibrary, removeFromPassportLibrary, updatePassportBlock } from "@/lib/passport"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Fingerprint, Loader2, Github, RefreshCw, 
  Target, Zap, Trophy, Briefcase, ChevronRight, 
  CheckCircle2, Clock, Code2, ShieldCheck, AlertTriangle, 
  Trash2, Plus, X, UploadCloud, EyeOff, Link as LinkIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts'
import { Application } from "@/types/platform"
import { useToast } from "@/components/ui/use-toast"

export default function CandidatePassportPage() {
  const { user,  loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [profile, setProfile] = useState<any>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSyncingResume, setIsSyncingResume] = useState(false)
  
  const [activeTab, setActiveTab] = useState<"overview" | "proof-of-work" | "applications">("overview")

  // Modal States
  const [isAddingExp, setIsAddingExp] = useState(false)
  const [isAddingProj, setIsAddingProj] = useState(false)
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false)

  // In-Passport Verification States
  const [activeOtpId, setActiveOtpId] = useState<string | null>(null)
  const [corpEmail, setCorpEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request")
  const [isProcessingOtp, setIsProcessingOtp] = useState(false)
  const [isVerifyingDoc, setIsVerifyingDoc] = useState<string | null>(null)

  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({})
  const [platformInput, setPlatformInput] = useState({ platform: "leetcode", handle: "" })
  const [isLinkingPlatform, setIsLinkingPlatform] = useState(false)
  const [verificationStep, setVerificationStep] = useState<1 | 2>(1);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) router.push("/auth/login")
    }
  }, [user, loading, router])

  const fetchPassportData = async () => {
    if (!user) return
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) setProfile(userDoc.data())

      const appsSnap = await getDocs(query(collection(db, "applications"), where("candidateId", "==", user.uid)))
      const appsList: Application[] = []
      appsSnap.forEach(d => appsList.push({ id: d.id, ...d.data() } as Application))
      setApplications(appsList.sort((a: any, b: any) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0)))
    } catch (error) { console.error(error) } 
    finally { setIsLoadingData(false) }
  }

  useEffect(() => { 
    if (user) fetchPassportData() 
  }, [user])

  // --- CONNECT GITHUB TO PASSPORT ---
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
             if (credential) result = await signInWithCredential(auth, credential);
             else throw linkError; 
          } else {
             throw linkError;
          }
        }
      } else {
         result = await signInWithPopup(auth, provider);
      }
      
      const credential = GithubAuthProvider.credentialFromResult(result!);
      const token = credential?.accessToken;
      const details = getAdditionalUserInfo(result!)
      const verifiedUsername = details?.username

      if (verifiedUsername && token && user) {
        await setDoc(doc(db, "users", user.uid), {
          githubUsername: verifiedUsername,
          githubToken: token
        }, { merge: true })
        
        setProfile((prev: any) => ({
           ...prev,
           githubUsername: verifiedUsername,
           githubToken: token
        }))

        fetchPassportData()
        toast({ title: "Identity Verified!", description: `Passport linked to @${verifiedUsername}` })
      }
    } catch (error: any) {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" })
    }
  }

  // --- LIBRARY CRUD HANDLERS ---
  const handleDeleteBlock = async (type: 'experienceLibrary' | 'projectsLibrary', blockId: string) => {
    if (!confirm("Remove this verified block from your Passport?")) return
    try {
      await removeFromPassportLibrary(user!.uid, type, blockId)
      toast({ title: "Block Removed" })
      fetchPassportData()
    } catch (e) { toast({ title: "Error", variant: "destructive" }) }
  }

  const handleAddExperience = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmittingBlock(true)
    const formData = new FormData(e.currentTarget)
    const block = {
      title: formData.get("title"), 
      company: formData.get("company"),
      startDate: formData.get("startDate"), 
      endDate: formData.get("endDate"),
      description: formData.get("description"), 
      verificationBadge: null 
    }
    try {
      await addToPassportLibrary(user!.uid, 'experienceLibrary', block)
      setIsAddingExp(false); fetchPassportData(); toast({ title: "Experience Added" })
    } catch (e) { toast({ title: "Error", variant: "destructive" }) }
    finally { setIsSubmittingBlock(false) }
  }

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmittingBlock(true)
    const formData = new FormData(e.currentTarget)
    const block = { name: formData.get("name"), url: formData.get("url"), description: formData.get("description") }
    try {
      await addToPassportLibrary(user!.uid, 'projectsLibrary', block)
      setIsAddingProj(false); fetchPassportData(); toast({ title: "Project Added" })
    } catch (e) { toast({ title: "Error", variant: "destructive" }) }
    finally { setIsSubmittingBlock(false) }
  }

  const handleUpdateProjectUrl = async (blockId: string) => {
    const url = editingUrls[blockId];
    if (!url) return;
    try {
      await updatePassportBlock(user!.uid, 'projectsLibrary', blockId, { url });
      toast({ title: "Link Saved", description: "Project is now verifiable." });
      setEditingUrls(prev => { const next = {...prev}; delete next[blockId]; return next; });
      fetchPassportData();
    } catch (e) {
      toast({ title: "Error saving link", variant: "destructive" });
    }
  }

  // --- SYNC FROM RESUME WITH DEDUPLICATION ---
  const handleSyncResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;
    
    console.log("🛠️ [DEBUG 1] Starting Sync. Current Profile from DB:", profile);
    setIsSyncingResume(true);
    toast({ title: "Scanning Resume", description: "Filtering unique blocks..." });

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      
      console.log("🛠️ [DEBUG 2] Sending PDF to OpenAI...");
      const res = await fetch("/api/parse-resume", { method: "POST", body: uploadData });
      const data = await res.json();

      console.log("🛠️ [DEBUG 3] OpenAI Extracted Data:", data.structured);

      if (data.structured) {
         let expCount = 0; 
         let projCount = 0;

         // 1. DEDUPLICATE EXPERIENCE
         const existingExpKeys = new Set(
           (profile.experienceLibrary || []).map((e: any) => 
             `${e.company}-${e.title}`.toLowerCase().trim()
           )
         );
         console.log("🛠️ [DEBUG 4] Existing Experience Keys in Passport:", Array.from(existingExpKeys));

         if (data.structured.workExperience) {
           for (const exp of data.structured.workExperience) {
             const key = `${exp.company}-${exp.title}`.toLowerCase().trim();
             
             if (!existingExpKeys.has(key)) {
               console.log(`✅ [DEBUG 5a] ADDING New Experience: ${key}`);
               await addToPassportLibrary(user.uid, 'experienceLibrary', exp);
               expCount++;
               existingExpKeys.add(key);
             } else {
               console.log(`❌ [DEBUG 5b] SKIPPING Duplicate Experience: ${key}`);
             }
           }
         }

         // 2. DEDUPLICATE PROJECTS
         const existingProjNames = new Set(
           (profile.projectsLibrary || []).map((p: any) => 
             (p.name || "").toLowerCase().trim()
           )
         );
         console.log("🛠️ [DEBUG 6] Existing Project Keys in Passport:", Array.from(existingProjNames));

         if (data.structured.projects) {
           for (const proj of data.structured.projects) {
             const nameKey = (proj.name || "").toLowerCase().trim();
             
             if (nameKey && !existingProjNames.has(nameKey)) {
               console.log(`✅ [DEBUG 7a] ADDING New Project: ${nameKey}`);
               await addToPassportLibrary(user.uid, 'projectsLibrary', proj);
               projCount++;
               existingProjNames.add(nameKey);
             } else {
               console.log(`❌ [DEBUG 7b] SKIPPING Duplicate Project: ${nameKey}`);
             }
           }
         }

         console.log(`🛠️ [DEBUG 8] Sync Complete. Added ${expCount} Exp and ${projCount} Proj. Fetching fresh data...`);
         await fetchPassportData(); // Refresh the UI
         
         if (expCount === 0 && projCount === 0) {
            toast({ title: "Sync Finished", description: "No new unique blocks found. Everything is up to date." });
         } else {
            toast({ title: "Sync Complete", description: `Added ${expCount} new Experiences and ${projCount} new Projects.` });
         }
      }
    } catch (err) { 
      console.error("🚨 [DEBUG ERROR]", err);
      toast({ title: "Sync Failed", variant: "destructive" }); 
    }
    finally { setIsSyncingResume(false); }
  }

  // --- IN-PASSPORT VERIFICATION (Options A, B, C) ---
  const handleRequestOTP = async (blockId: string, companyName: string) => {
    if (!corpEmail) return toast({ title: "Work Email required", variant: "destructive" });
    setIsProcessingOtp(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: corpEmail, companyName, aiValidation: true })
      });
      const data = await res.json();
      if (res.ok) { setOtpStep("verify"); toast({ title: "Domain Validated", description: "OTP sent." }); } 
      else { toast({ title: "Domain Rejected", description: data.error, variant: "destructive" }); }
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    finally { setIsProcessingOtp(false); }
  };

  const handleVerifyOTP = async (blockId: string) => {
    if (!otpCode) return;
    setIsProcessingOtp(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: corpEmail, otp: otpCode })
      });
      if (res.ok) {
        await updatePassportBlock(user!.uid, 'experienceLibrary', blockId, { verificationBadge: "Verified — Active Employee" });
        setActiveOtpId(null); setCorpEmail(""); setOtpCode(""); setOtpStep("request");
        fetchPassportData();
        toast({ title: "Verified", description: "Corporate identity confirmed." });
      } else { toast({ title: "Invalid OTP", variant: "destructive" }); }
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    finally { setIsProcessingOtp(false); }
  };

  const handleDocumentVerification = async (blockId: string, companyName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsVerifyingDoc(blockId);
    toast({ title: "Secure Vault Active", description: "Scanning document..." });
    const uploadData = new FormData();
    uploadData.append("file", file); uploadData.append("companyName", companyName);
    try {
      await fetch("/api/verify-document", { method: "POST", body: uploadData });
      await updatePassportBlock(user!.uid, 'experienceLibrary', blockId, { verificationBadge: "Staged for Forensic Audit" });
      fetchPassportData();
      toast({ title: "Document Staged", description: "Saved for background audit." });
    } catch (error) { toast({ title: "Upload Failed", variant: "destructive" }); } 
    finally { setIsVerifyingDoc(null); }
  };

  const handleUseProxy = async (blockId: string) => {
    await updatePassportBlock(user!.uid, 'experienceLibrary', blockId, { verificationBadge: "Public Proxy Weighting" });
    fetchPassportData();
    toast({ title: "Proxy Selected", description: "AI will use GitHub timeline for this role." });
  };

  // --- DYNAMIC FORENSIC GRAPH ---
  const latestAnalyzedApp = applications.find(a => a.analysis?.forensic_skill_graph);
  const fGraph = latestAnalyzedApp?.analysis?.forensic_skill_graph;

  const globalChartData = fGraph ? [
    { subject: 'Lang', A: fGraph.language_mastery || 0 },
    { subject: 'Hygiene', A: fGraph.code_hygiene_and_testing || 0 },
    { subject: 'Arch', A: fGraph.system_architecture || 0 },
    { subject: 'DevOps', A: fGraph.devops_and_infra || 0 },
    { subject: 'Data', A: fGraph.data_and_state || 0 },
    { subject: 'Git', A: fGraph.version_control_habits || 0 },
  ] : [
    { subject: 'Lang', A: 0 }, { subject: 'Hygiene', A: 0 }, { subject: 'Arch', A: 0 },
    { subject: 'DevOps', A: 0 }, { subject: 'Data', A: 0 }, { subject: 'Git', A: 0 },
  ];

 if (loading || isLoadingData) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
      <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Decrypting Passport...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* --- HEADER --- */}
        <div className="bg-[#050A15] p-8 md:p-12 rounded-[40px] shadow-2xl text-white relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-6 text-[10px] font-black uppercase tracking-widest border border-white/10">
                        <Fingerprint className="w-3 h-3 text-orange-400" /> EleWin Passport
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">{profile?.name}</h1>
                    <p className="text-slate-400 font-medium">{profile?.email} <CheckCircle2 className="w-4 h-4 inline text-green-500" /></p>
                </div>
                
                {/* DYNAMIC GITHUB UI */}
                {profile?.githubUsername ? (
                  <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm flex items-center gap-4">
                      <Github className="w-8 h-8 text-green-400" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">GitHub Sync Active</p>
                        <p className="font-bold text-sm">@{profile.githubUsername}</p>
                      </div>
                  </div>
                ) : (
                  <Button 
                    onClick={handleConnectGithub}
                    className="bg-[#24292e] hover:bg-[#1b1f23] text-white p-6 rounded-3xl border border-white/10 shadow-xl flex items-center gap-3 transition-all h-auto"
                  >
                    <Github className="w-6 h-6" />
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-slate-400">Connect Profile</p>
                      <p className="font-bold text-sm">Verify Identity</p>
                    </div>
                  </Button>
                )}
            </div>
        </div>

        {/* --- TABS --- */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          <Button variant={activeTab === "overview" ? "default" : "outline"} onClick={() => setActiveTab("overview")} className="rounded-xl font-bold h-12">Overview</Button>
          <Button variant={activeTab === "proof-of-work" ? "default" : "outline"} onClick={() => setActiveTab("proof-of-work")} className="rounded-xl font-bold h-12"><ShieldCheck className="w-4 h-4 mr-2" /> Proof of Work Library</Button>
          <Button variant={activeTab === "applications" ? "default" : "outline"} onClick={() => setActiveTab("applications")} className="rounded-xl font-bold h-12"><Briefcase className="w-4 h-4 mr-2" /> Applications</Button>
        </div>
        
        {/* Algorithmic & Problem Solving Library */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm mt-8">
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
                    className="p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-emerald-500 bg-white"
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
                    className="flex-grow p-4 rounded-xl border border-slate-200 font-medium outline-none focus:border-emerald-500"
                  />
                  <Button 
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
                        <Button variant="outline" size="sm" className="h-10" onClick={() => {
                          navigator.clipboard.writeText(verificationCode);
                          toast({ title: "Copied to clipboard" });
                        }}>Copy Code</Button>
                      </div>

                      <div className="flex gap-3">
                        <Button 
                        onClick={async () => {
  setIsLinkingPlatform(true);
  try {
    const res = await fetch("/api/coding-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...platformInput, verificationCode }) 
    });
    
    // 1. Safely parse JSON without throwing a JS error
    const data = await res.json().catch(() => ({ error: "Invalid server response." }));
    
    // 2. IF FAILED: Trigger the Toast immediately and STOP execution
    if (!res.ok) {
      console.log("Backend rejected verification:", data);
      toast({ 
        title: "Verification Failed", 
        description: data.error || "Could not find the verification code on your profile.", 
        variant: "destructive" 
      });
      setIsLinkingPlatform(false);
      return; // <-- EXITS THE FUNCTION HERE
    }

    // 3. IF SUCCESSFUL: Update data using 'profile' (since we are in Passport)
    const newProfiles = {
      ...(profile?.codingProfiles || {}), 
      [platformInput.platform]: { handle: platformInput.handle, stats: data.data, verifiedAt: new Date().toISOString() }
    };
    
    if (user) {
      await setDoc(doc(db, "users", user.uid), {
        codingProfiles: newProfiles
      }, { merge: true });
    }
    
    // Refresh the passport data to show the new card
    fetchPassportData(); 
    
    setPlatformInput({ platform: "leetcode", handle: "" });
    setVerificationStep(1);
    toast({ title: "Profile Verified & Linked!", description: "You can now remove the code from your profile." });
    
  } catch (e: any) {
    // 4. This only catches complete network failures now
    console.error("[CRITICAL NETWORK ERROR]", e);
    toast({ 
      title: "Connection Error", 
      description: "Could not reach the verification server.", 
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
                        <Button variant="ghost" onClick={() => setVerificationStep(1)} className="text-slate-500 font-bold hover:text-slate-900">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
           </div>

           {/* Display Linked Profiles */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile?.codingProfiles?.leetcode && (
                <div className="p-6 rounded-3xl border-2 border-emerald-100 bg-emerald-50/30 shadow-sm flex flex-col relative group">
                   <button onClick={async () => {
                      const updated = {...profile.codingProfiles};
                      delete updated.leetcode;
                      await setDoc(doc(db, "users", user!.uid), { codingProfiles: updated }, { merge: true });
                      fetchPassportData();
                   }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                   
                   <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">LeetCode</p>
                   <h4 className="font-black text-xl text-slate-900 mb-4">@{profile.codingProfiles.leetcode.handle}</h4>
                   <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Problems Solved</p>
                        <p className="text-2xl font-black text-emerald-600">{profile.codingProfiles.leetcode.stats.totalSolved}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Contest Rating</p>
                        <p className="text-2xl font-black text-slate-900">{profile.codingProfiles.leetcode.stats.contestRating || "N/A"}</p>
                      </div>
                   </div>
                   <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                     <ShieldCheck className="w-3 h-3" /> Verified
                   </span>
                </div>
              )}

              {profile?.codingProfiles?.codeforces && (
                <div className="p-6 rounded-3xl border-2 border-blue-100 bg-blue-50/30 shadow-sm flex flex-col relative group">
                   <button onClick={async () => {
                      const updated = {...profile.codingProfiles};
                      delete updated.codeforces;
                      await setDoc(doc(db, "users", user!.uid), { codingProfiles: updated }, { merge: true });
                      fetchPassportData();
                   }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                   
                   <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Codeforces</p>
                   <h4 className="font-black text-xl text-slate-900 mb-4">@{profile.codingProfiles.codeforces.handle}</h4>
                   <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Current Rating</p>
                        <p className="text-2xl font-black text-blue-600">{profile.codingProfiles.codeforces.stats.rating}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Rank</p>
                        <p className="text-lg font-black text-slate-900 capitalize">{profile.codingProfiles.codeforces.stats.rank}</p>
                      </div>
                   </div>
                   <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                     <ShieldCheck className="w-3 h-3" /> Verified
                   </span>
                </div>
              )}
              {profile?.codingProfiles?.codechef && (
                <div className="p-6 rounded-3xl border-2 border-amber-100 bg-amber-50/30 shadow-sm flex flex-col relative group">
                   <button onClick={async () => {
                      const updated = {...profile.codingProfiles};
                      delete updated.codechef;
                      await setDoc(doc(db, "users", user!.uid), { codingProfiles: updated }, { merge: true });
                      fetchPassportData();
                   }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                   
                   <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">CodeChef</p>
                   <h4 className="font-black text-xl text-slate-900 mb-4">@{profile.codingProfiles.codechef.handle}</h4>
                   <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Current Rating</p>
                        <p className="text-2xl font-black text-amber-600">{profile.codingProfiles.codechef.stats.rating}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Division</p>
                        <p className="text-xl font-black text-slate-900">{profile.codingProfiles.codechef.stats.stars}</p>
                      </div>
                   </div>
                   <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                     <ShieldCheck className="w-3 h-3" /> Verified
                   </span>
                </div>
              )}

              {profile?.codingProfiles?.hackerrank && (
                <div className="p-6 rounded-3xl border-2 border-green-100 bg-green-50/30 shadow-sm flex flex-col relative group">
                   <button onClick={async () => {
                      const updated = {...profile.codingProfiles};
                      delete updated.hackerrank;
                      await setDoc(doc(db, "users", user!.uid), { codingProfiles: updated }, { merge: true });
                      fetchPassportData();
                   }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                   
                   <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">HackerRank</p>
                   <h4 className="font-black text-xl text-slate-900 mb-4">@{profile.codingProfiles.hackerrank.handle}</h4>
                   <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Level</p>
                        <p className="text-2xl font-black text-green-600">Lvl {profile.codingProfiles.hackerrank.stats.level}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Title</p>
                        <p className="text-lg font-black text-slate-900 capitalize truncate">{profile.codingProfiles.hackerrank.stats.title}</p>
                      </div>
                   </div>
                   <span className="absolute top-4 right-14 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1">
                     <ShieldCheck className="w-3 h-3" /> Verified
                   </span>
                </div>
              )}
           </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col items-center">
                      <h3 className="text-xs font-black text-slate-400 uppercase mb-6 w-full flex justify-between">Global Matrix <span className="text-orange-500">LIVE</span></h3>
                      <div className="w-full h-56"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="75%" data={globalChartData}><PolarGrid stroke="#f1f5f9" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} /><Radar name="Skills" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.4} /></RadarChart></ResponsiveContainer></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center"><Zap className="w-6 h-6 text-blue-500 mx-auto mb-2" /><p className="text-2xl font-black">High</p><p className="text-[10px] font-black uppercase text-slate-400">Velocity</p></div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center"><Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" /><p className="text-2xl font-black">{applications.filter(a=>a.status==='shortlisted').length}</p><p className="text-[10px] font-black uppercase text-slate-400">Shortlists</p></div>
                  </div>
              </div>
              <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200">
                 <h3 className="text-2xl font-black mb-4">Intelligence Record</h3>
                 <p className="text-slate-600 font-medium leading-relaxed mb-4">Your Passport stores your verified blocks. When applying via "Fast Apply," your verified Experience and Project blocks are automatically injected into the AI Scoring Engine.</p>
                 {!fGraph && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-start gap-3">
                       <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                       <p className="text-sm font-medium text-orange-800">Your Forensic Matrix is currently empty. Apply to a job to generate your first AI verification score.</p>
                    </div>
                 )}
              </div>
          </div>
        )}

        {/* --- PROOF OF WORK LIBRARY TAB --- */}
        {activeTab === "proof-of-work" && (
          <div className="space-y-8 animate-in fade-in">
            
            {/* Experience Library */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                  <h3 className="text-2xl font-black flex items-center gap-2"><Briefcase className="w-6 h-6 text-indigo-500" /> Experience Library</h3>
                  <div className="flex gap-2">
                     <input type="file" accept=".pdf" id="sync-resume" className="hidden" onChange={handleSyncResume} />
                     <Button variant="outline" onClick={() => document.getElementById('sync-resume')?.click()} disabled={isSyncingResume} className="rounded-xl border-slate-200 font-bold">
                        {isSyncingResume ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UploadCloud className="w-4 h-4 mr-2" /> Sync Resume</>}
                     </Button>
                     <Button onClick={() => setIsAddingExp(true)} className="bg-[#050A15] text-white rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add</Button>
                  </div>
               </div>

               <div className="space-y-6">
                  {profile?.experienceLibrary?.length === 0 && <p className="text-center text-slate-400 font-medium">No experience saved.</p>}
                  
                  {profile?.experienceLibrary?.map((exp: any) => (
                    <div key={exp.id} className="p-6 rounded-3xl border-2 border-slate-100 bg-slate-50 relative group">
                       <button onClick={() => handleDeleteBlock('experienceLibrary', exp.id)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                       <div className="flex justify-between items-start mb-6 pr-8">
                          <div className="flex-grow pr-4">
                            <h4 className="font-black text-xl text-slate-900">{exp.title}</h4>
                            <p className="text-sm text-slate-500 font-bold mb-3">{exp.company} • {exp.startDate} - {exp.endDate}</p>
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

                       {/* INLINE VERIFICATION UI */}
                       {!exp.verificationBadge && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                             <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between group hover:border-blue-300">
                                <div><h5 className="text-[10px] font-black uppercase text-blue-600 mb-1">Option A</h5><p className="text-[10px] text-slate-500 mb-4">OTP to @{exp.company.replace(/\s+/g, '').toLowerCase()}.com email.</p></div>
                                {activeOtpId === exp.id ? (
                                  <div className="space-y-2 mt-2">
                                    {otpStep === "request" ? (
                                      <><input type="email" placeholder="work@company.com" value={corpEmail} onChange={(e) => setCorpEmail(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" /><Button size="sm" className="w-full text-xs bg-blue-600 text-white" disabled={isProcessingOtp} onClick={() => handleRequestOTP(exp.id, exp.company)}>{isProcessingOtp ? <Loader2 className="w-4 h-4 animate-spin"/> : "Send OTP"}</Button></>
                                    ) : (
                                      <><input type="text" placeholder="6-digit OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none text-center font-mono" /><Button size="sm" className="w-full text-xs bg-green-600 text-white" disabled={isProcessingOtp} onClick={() => handleVerifyOTP(exp.id)}>Verify</Button></>
                                    )}
                                  </div>
                                ) : (
                                  <Button variant="outline" size="sm" className="w-full text-xs font-bold border-blue-200 text-blue-700" onClick={() => { setActiveOtpId(exp.id); setOtpStep("request"); setCorpEmail(""); }}>Verify Email</Button>
                                )}
                             </div>

                             <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between group hover:border-indigo-300">
                                <div><h5 className="text-[10px] font-black uppercase text-indigo-600 mb-1">Option B</h5><p className="text-[10px] text-slate-500 mb-4">Upload Document (Purged in RAM).</p></div>
                                <input type="file" accept=".pdf, .png, .jpg" id={`vault-${exp.id}`} className="hidden" onChange={(e) => handleDocumentVerification(exp.id, exp.company, e)} />
                                <Button variant="outline" size="sm" className="w-full text-xs font-bold border-indigo-200 text-indigo-700" onClick={() => document.getElementById(`vault-${exp.id}`)?.click()} disabled={isVerifyingDoc === exp.id}>
                                  {isVerifyingDoc === exp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Secure Vault"}
                                </Button>
                             </div>

                             <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
                                <div><h5 className="text-[10px] font-black uppercase text-slate-500 mb-1">Option C</h5><p className="text-[10px] text-slate-500 mb-4">Proxy weight via GitHub.</p></div>
                                <Button variant="ghost" size="sm" className="w-full text-xs font-bold text-slate-500" onClick={() => handleUseProxy(exp.id)}>Use Proxy</Button>
                             </div>
                          </div>
                       )}
                    </div>
                  ))}
               </div>
            </div>

            {/* Projects Library */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black flex items-center gap-2"><Code2 className="w-6 h-6 text-blue-500" /> Projects Library</h3>
                  <Button onClick={() => setIsAddingProj(true)} className="bg-[#050A15] text-white rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add Project</Button>
               </div>
               <div className="space-y-4">
                  {profile?.projectsLibrary?.length === 0 && <p className="text-center text-slate-400 font-medium">No projects saved.</p>}
                  {profile?.projectsLibrary?.map((proj: any) => (
                    <div key={proj.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50 group relative">
                        <button onClick={() => handleDeleteBlock('projectsLibrary', proj.id)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                        <h4 className="font-black text-lg mb-1 pr-8">{proj.name}</h4>
                        <p className="text-sm text-slate-600 font-medium mb-4 leading-relaxed">{proj.description}</p>
                        
                        {proj.url ? (
                          <a href={proj.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline w-max"><LinkIcon className="w-3 h-3"/> {proj.url}</a>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mt-4">
                            <span className="text-xs font-bold text-amber-700 flex items-center gap-1 mb-3">
                              <AlertTriangle className="w-4 h-4"/> 0 Weight: Missing Repository Link
                            </span>
                            <div className="flex gap-2">
                               <div className="relative flex-grow">
                                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input 
                                     type="url" 
                                     placeholder="Paste GitHub or Live URL to verify..." 
                                     value={editingUrls[proj.id] || ""}
                                     onChange={(e) => setEditingUrls(prev => ({ ...prev, [proj.id]: e.target.value }))}
                                     className="w-full p-3 pl-10 bg-white border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-700 shadow-sm"
                                  />
                               </div>
                               <Button 
                                  onClick={() => handleUpdateProjectUrl(proj.id)}
                                  disabled={!editingUrls[proj.id]}
                                  className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 font-bold shadow-md"
                               >
                                  Save Link
                               </Button>
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* --- APPLICATIONS TAB --- */}
        {activeTab === "applications" && (
           <div className="space-y-4 animate-in fade-in">
              {applications.length === 0 && <p className="text-center text-slate-400 p-8">No applications submitted yet.</p>}
              {applications.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                       <h3 className="text-xl font-black flex items-center gap-3">
                          {app.jobTitle} 
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${app.status === 'shortlisted' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
                             {app.status === 'shortlisted' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {app.status}
                          </span>
                       </h3>
                       <p className="text-sm text-slate-500 font-medium">EleWin Pipeline</p>
                    </div>
                    <Link href={`/status/${app.id}`}><Button variant="outline" className="rounded-xl font-bold border-slate-200 text-slate-600 hover:border-orange-500 hover:text-orange-600">View <ChevronRight className="ml-1 w-4 h-4" /></Button></Link>
                </div>
              ))}
           </div>
        )}
      </main>

      {/* --- ADD EXPERIENCE MODAL --- */}
      {isAddingExp && (
        <div className="fixed inset-0 z-[100] bg-[#050A15]/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setIsAddingExp(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X /></button>
              <h2 className="text-3xl font-black mb-2">Add Experience</h2>
              <form onSubmit={handleAddExperience} className="space-y-6 mt-6">
                 <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Job Title</label><input name="title" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" /></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Company</label><input name="company" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Start Date</label><input name="startDate" type="month" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">End Date</label><input name="endDate" type="month" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Description / Impact</label>
                    <textarea name="description" rows={3} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-600" placeholder="What did you build or achieve?" />
                 </div>
                 <Button type="submit" disabled={isSubmittingBlock} className="w-full h-16 bg-orange-500 text-white font-black text-lg rounded-2xl shadow-xl">{isSubmittingBlock ? "Saving..." : "Add to Library"}</Button>
              </form>
           </div>
        </div>
      )}

      {/* --- ADD PROJECT MODAL --- */}
      {isAddingProj && (
        <div className="fixed inset-0 z-[100] bg-[#050A15]/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setIsAddingProj(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X /></button>
              <h2 className="text-3xl font-black mb-2">Add Project</h2>
              <form onSubmit={handleAddProject} className="space-y-6 mt-6">
                 <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Project Name</label><input name="name" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" /></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">GitHub / Live URL</label><input name="url" type="url" required placeholder="https://github.com/..." className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" /></div>
                 <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Description</label><textarea name="description" rows={3} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-medium text-slate-600" /></div>
                 <Button type="submit" disabled={isSubmittingBlock} className="w-full h-16 bg-[#050A15] text-white font-black text-lg rounded-2xl shadow-xl">{isSubmittingBlock ? "Saving..." : "Add Project"}</Button>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}