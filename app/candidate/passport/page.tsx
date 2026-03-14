"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/authcontext"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { addToPassportLibrary, removeFromPassportLibrary, updatePassportBlock } from "@/lib/passport"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Fingerprint, Loader2, Github, RefreshCw, 
  Target, Zap, Trophy, Briefcase, ChevronRight, 
  CheckCircle2, Clock, Code2, ShieldCheck, AlertTriangle, Lock, Mail, Trash2, Plus, Edit3, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "@/components/navbar"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts'
import { Application } from "@/types/platform"
import { useToast } from "@/components/ui/use-toast"

export default function CandidatePassportPage() {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [profile, setProfile] = useState<any>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "proof-of-work" | "applications">("overview")

  // Modal / Form States
  const [isAddingExp, setIsAddingExp] = useState(false)
  const [isAddingProj, setIsAddingProj] = useState(false)
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false)

  // --- THE BOUNCER (ROUTE GUARD) ---
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
      } else if (role !== "candidate") {
        router.push("/employer/dashboard")
      }
    }
  }, [user, role, loading, router])

  const fetchPassportData = async () => {
    if (!user) return
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setProfile(data)
      }

      const appsSnap = await getDocs(query(collection(db, "applications"), where("candidateId", "==", user.uid)))
      const appsList: Application[] = []
      appsSnap.forEach(doc => appsList.push({ id: doc.id, ...doc.data() } as Application))
      setApplications(appsList.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0)))
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => { if (user && role === "candidate") fetchPassportData() }, [user, role])

  // --- CRUD HANDLERS ---
  const handleDeleteBlock = async (type: 'experienceLibrary' | 'projectsLibrary', blockId: string) => {
    if (!confirm("Are you sure? This verified block will be removed from your Passport.")) return
    try {
      await removeFromPassportLibrary(user!.uid, type, blockId)
      toast({ title: "Block Removed" })
      fetchPassportData()
    } catch (e) {
      toast({ title: "Error", variant: "destructive" })
    }
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
      verificationBadge: null // Starts unverified
    }
    try {
      await addToPassportLibrary(user!.uid, 'experienceLibrary', block)
      setIsAddingExp(false)
      fetchPassportData()
      toast({ title: "Experience Added to Library" })
    } catch (e) { toast({ title: "Error", variant: "destructive" }) }
    finally { setIsSubmittingBlock(false) }
  }

  if (loading || role !== "candidate" || isLoadingData) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
      <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Decrypting Passport...</p>
    </div>
  )

  const globalChartData = profile?.skillsGraph || [
    { subject: 'Frontend', A: 85 }, { subject: 'Backend', A: 72 }, { subject: 'Database', A: 68 }, { subject: 'DevOps', A: 45 }, { subject: 'Arch', A: 80 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-12">
        
        {/* --- PASSPORT HEADER --- */}
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
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-sm flex items-center gap-4">
                    <Github className="w-8 h-8 text-white" />
                    <div><p className="text-[10px] font-black uppercase text-slate-400">GitHub Sync</p><p className="font-bold text-sm">Active</p></div>
                    <Button variant="ghost" size="icon" onClick={() => setIsSyncing(true)} disabled={isSyncing}><RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /></Button>
                </div>
            </div>
        </div>

        {/* --- TABS --- */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          <Button variant={activeTab === "overview" ? "default" : "outline"} onClick={() => setActiveTab("overview")} className="rounded-xl font-bold h-12">Overview</Button>
          <Button variant={activeTab === "proof-of-work" ? "default" : "outline"} onClick={() => setActiveTab("proof-of-work")} className="rounded-xl font-bold h-12">Proof of Work Library</Button>
          <Button variant={activeTab === "applications" ? "default" : "outline"} onClick={() => setActiveTab("applications")} className="rounded-xl font-bold h-12">Applications ({applications.length})</Button>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col items-center">
                      <h3 className="text-xs font-black text-slate-400 uppercase mb-6 w-full flex justify-between">Global Matrix <span className="text-orange-500">LIVE</span></h3>
                      <div className="w-full h-56">
                          <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={globalChartData}>
                                  <PolarGrid stroke="#f1f5f9" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                                  <Radar name="Skills" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                              </RadarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center"><Zap className="w-6 h-6 text-blue-500 mx-auto mb-2" /><p className="text-2xl font-black">High</p><p className="text-[10px] font-black uppercase text-slate-400">Velocity</p></div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 text-center"><Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" /><p className="text-2xl font-black">{applications.filter(a=>a.status==='shortlisted').length}</p><p className="text-[10px] font-black uppercase text-slate-400">Shortlists</p></div>
                  </div>
              </div>
              <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200"><h3 className="text-2xl font-black mb-4">Intelligence Record</h3><p className="text-slate-600 font-medium">Your Passport stores pre-verified blocks. Apply once, verified everywhere.</p></div>
          </div>
        )}

        {/* --- PROOF OF WORK LIBRARY TAB --- */}
        {activeTab === "proof-of-work" && (
          <div className="space-y-8 animate-in fade-in">
            {/* EXPERIENCE SECTION */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black flex items-center gap-2"><Briefcase className="w-6 h-6 text-indigo-500" /> Experience Library</h3>
                  <Button onClick={() => setIsAddingExp(true)} className="bg-[#050A15] text-white rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add Record</Button>
               </div>
               <div className="space-y-4">
                  {profile?.experienceLibrary?.map((exp: any) => (
                    <div key={exp.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50 group relative">
                       <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-xl text-slate-900">{exp.title}</h4>
                            <p className="text-sm text-slate-500 font-bold">{exp.company} • {exp.startDate} - {exp.endDate}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             {exp.verificationBadge ? (
                                <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {exp.verificationBadge}</span>
                             ) : (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Unverified</span>
                             )}
                             <button onClick={() => handleDeleteBlock('experienceLibrary', exp.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* PROJECTS SECTION */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black flex items-center gap-2"><Code2 className="w-6 h-6 text-blue-500" /> Projects Library</h3>
                  <Button onClick={() => setIsAddingProj(true)} className="bg-[#050A15] text-white rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add Project</Button>
               </div>
               <div className="space-y-4">
                  {profile?.projectsLibrary?.map((proj: any) => (
                    <div key={proj.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50 group relative flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm"><Github className="w-6 h-6 text-slate-700" /></div>
                           <div><h4 className="font-black text-lg">{proj.name}</h4><p className="text-xs text-slate-500 font-bold">{proj.url || "No link attached"}</p></div>
                        </div>
                        <button onClick={() => handleDeleteBlock('projectsLibrary', proj.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* --- APPLICATIONS TAB --- */}
        {activeTab === "applications" && (
           <div className="space-y-4 animate-in fade-in">
              {applications.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center">
                    <div><h3 className="text-xl font-black">{app.jobTitle}</h3><p className="text-sm text-slate-500">Applied via Forensic Pipeline</p></div>
                    <Link href={`/status/${app.id}`}><Button variant="outline" className="rounded-xl font-bold">View Pipeline <ChevronRight className="ml-2 w-4 h-4" /></Button></Link>
                </div>
              ))}
           </div>
        )}

      </main>

      {/* --- ADD EXPERIENCE MODAL --- */}
      {isAddingExp && (
        <div className="fixed inset-0 z-[100] bg-[#050A15]/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setIsAddingExp(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X /></button>
              <h2 className="text-3xl font-black mb-2">Add Experience</h2>
              <p className="text-slate-500 mb-8 font-medium">Verified experiences increase your global Skill Matrix score.</p>
              <form onSubmit={handleAddExperience} className="space-y-6">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Job Title</label><input name="title" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" placeholder="Senior Backend Engineer" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Company</label><input name="company" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" placeholder="Stripe" /></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label><input name="startDate" type="month" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Date</label><input name="endDate" type="month" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" placeholder="Present" /></div>
                 </div>
                 <Button type="submit" disabled={isSubmittingBlock} className="w-full h-16 bg-orange-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20">{isSubmittingBlock ? "Saving..." : "Add to Passport"}</Button>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}