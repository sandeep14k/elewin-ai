"use client"

import { useState, useEffect, use } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Application } from "@/types/platform"
import { 
  Loader2, Github, CheckCircle2, Clock, 
  Zap, Star, Trophy, ArrowLeft, Search, 
  CalendarCheck, PartyPopper, ExternalLink,
  Target,
  Bot,
  Network
} from "lucide-react"

import Link from "next/link"
import Navbar from "@/components/navbar"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip
} from 'recharts'

export default function CandidateStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [app, setApp] = useState<any>(null) // Using 'any' here temporarily to bypass strict type checks for the new fastTrack object
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const docRef = doc(db, "applications", id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setApp({ id: snap.id, ...snap.data() })
        }
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    fetchStatus()
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>

  if (!app) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
      <Search className="w-16 h-16 text-slate-300 mb-4" />
      <h1 className="text-2xl font-black text-slate-800">Record Not Found</h1>
      <p className="text-slate-500 font-medium mb-6">We couldn&apos;t find a forensic record associated with this tracking link.</p>
      <Link href="/"><button className="bg-[#050A15] text-white px-8 py-4 rounded-xl font-bold">Back to Job Board</button></Link>
    </div>
  )

  const chartData = [
    { subject: 'Language Mastery', A: app.analysis?.forensic_skill_graph?.language_mastery || 0 },
    { subject: 'Code Hygiene', A: app.analysis?.forensic_skill_graph?.code_hygiene_and_testing || 0 },
    { subject: 'Architecture', A: app.analysis?.forensic_skill_graph?.system_architecture || 0 },
    { subject: 'DevOps & Infra', A: app.analysis?.forensic_skill_graph?.devops_and_infra || 0 },
    { subject: 'Data & State', A: app.analysis?.forensic_skill_graph?.data_and_state || 0 },
    { subject: 'Git Habits', A: app.analysis?.forensic_skill_graph?.version_control_habits || 0 },
  ]
  
  const lpiTimeline = app.analysis?.learningPotential?.timeline?.map((t: any) => ({
    month: t.date,
    // Create an "intensity" curve based on commits + new tech adoption
    intensity: t.commits + (t.newTech?.length || 0) * 15, 
    repo: t.repo,
    tech: t.newTech?.length > 0 ? t.newTech.join(", ") : "Continued mastery",
    hasCI: t.hasCI
  })) || [];

  // Custom Tooltip for the LPI Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#050A15] p-4 rounded-2xl border border-slate-700 shadow-xl text-white max-w-[200px]">
          <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">{label}</p>
          <p className="font-bold text-sm truncate mb-2">{data.repo}</p>
          <div className="space-y-1">
            <p className="text-xs text-slate-300"><span className="font-bold text-white">{data.intensity}</span> Activity Score</p>
            <p className="text-xs text-slate-300 leading-tight"><span className="text-green-400 font-bold">Tech:</span> {data.tech}</p>
            {data.hasCI && <p className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded inline-block mt-1 uppercase font-black">CI/CD Used</p>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Job Board
        </Link>

        {/* --- THE ATS KILLER: FAST-TRACK REWARD UI --- */}
        {app.fastTrack?.triggered && app.fastTrack?.interviewLink && (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-[32px] p-8 md:p-10 text-white shadow-2xl shadow-green-500/30 mb-8 animate-in zoom-in-95 duration-700 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
               <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 rounded-full mb-4 text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-sm">
                     <Zap className="w-4 h-4 text-yellow-300 fill-current" /> Fast-Track Unlocked
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black mb-3 flex items-center justify-center md:justify-start gap-3 tracking-tight">
                    You bypassed the recruiter! <PartyPopper className="w-8 h-8 text-yellow-300" />
                  </h2>
                  <p className="text-green-50 font-medium leading-relaxed md:text-lg max-w-2xl">
                    Your Proof of Work scored an exceptional <strong>{app.analysis?.overallMatchScore}%</strong>, beating the employer's auto-shortlist threshold. Don't wait for an email—book your technical interview right now.
                  </p>
               </div>
               <div className="shrink-0 w-full md:w-auto">
                  <a href={app.fastTrack.interviewLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                    <button className="w-full md:w-auto bg-white hover:bg-slate-50 text-green-700 h-16 px-8 rounded-2xl text-lg font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                      <CalendarCheck className="w-6 h-6" /> Book Interview Now
                    </button>
                  </a>
               </div>
            </div>
          </div>
        )}

        {/* --- STATUS HEADER --- */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-2">Application Status</p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{app.jobTitle}</h1>
              <div className="flex items-center gap-2 mt-2">
                 <Github className="w-5 h-5 text-slate-400" />
                 <span className="text-slate-500 font-bold">@{app.githubUsername}</span>
              </div>
            </div>

            <div className={`px-6 py-4 rounded-2xl border-2 flex items-center gap-3 font-black uppercase tracking-wider text-sm shadow-sm ${
              app.status === 'shortlisted' ? 'bg-green-50 border-green-200 text-green-700' :
              app.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600' :
              app.status === 'analyzed' ? 'bg-blue-50 border-blue-200 text-blue-700' :
              'bg-orange-50 border-orange-200 text-orange-600 animate-pulse'
            }`}>
              {app.status === 'shortlisted' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              {app.status === 'analyzed' ? 'AI Verification Complete' : 
               app.status === 'pending_analysis' ? 'Running Forensics...' :
               app.status}
            </div>
          </div>
        </div>

        {/* --- GRID: SKILLS & FEEDBACK --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Skill Graph (Left 2 Columns) */}
          <div className="md:col-span-2 bg-[#050A15] rounded-[32px] p-8 text-white flex flex-col items-center shadow-xl shadow-slate-900/10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
               <Target className="w-4 h-4 text-orange-500" /> Generated Skill Graph
            </h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} />
                  <Radar name="Skills" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 font-medium text-center mt-6 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
              This graph is generated dynamically by evaluating your commit history, code complexity, and project architecture on GitHub.
            </p>
          </div>

          {/* AI Insights (Right 3 Columns) */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Forensic Output Card */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-500" /> Forensic Output
              </h3>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 relative">
                 <p className="text-slate-600 leading-relaxed font-medium italic relative z-10">
                   &quot;{app.analysis?.aiSummary || "The AI is currently processing your technical profile. Refresh the page in 60 seconds."}&quot;
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Learning Velocity</p>
                    <p className="text-3xl font-black text-slate-900">{app.analysis?.learningVelocity || "..."}</p>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center text-center hover:border-orange-200 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Market Match</p>
                    <p className="text-3xl font-black text-orange-500">{app.analysis?.overallMatchScore || 0}%</p>
                 </div>
              </div>
            </div>

            {/* Learning Potential Index Card */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-500" /> Learning Potential Index
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Tech adoption & repository maturity over time</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LPI Score</p>
                  <p className="text-3xl font-black text-blue-600">{app.analysis?.learningPotential?.score || 0}<span className="text-lg text-slate-300">/100</span></p>
                </div>
              </div>
              
              {lpiTimeline.length > 0 ? (
                <div className="w-full h-48 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lpiTimeline} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="intensity" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIntensity)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                  <p className="text-slate-400 font-medium text-sm">Not enough historical repository data to map learning timeline.</p>
                </div>
              )}
            </div>

            {/* AI CAREER COPILOT CARD */}
            {app.analysis?.career_copilot_roadmap && app.analysis.career_copilot_roadmap.length > 0 && (
              <div className="bg-[#050A15] p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                 <h3 className="text-xl font-black flex items-center gap-2 mb-6 relative z-10">
                   <Bot className="w-6 h-6 text-blue-400" /> AI Career Copilot
                 </h3>
                 <div className="space-y-4 relative z-10">
                   {app.analysis.career_copilot_roadmap.map((step: string, i: number) => (
                     <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex gap-4 items-start">
                       <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black text-xs mt-0.5">
                         {i + 1}
                       </div>
                       <p className="text-sm font-medium text-slate-300 leading-relaxed">{step}</p>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* SKILLS ONTOLOGY GRAPH */}
            {app.analysis?.skills_ontology && app.analysis.skills_ontology.core_nodes?.length > 0 && (
              <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Network className="w-6 h-6 text-purple-500" /> Relational Skills Graph
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Inferred capabilities based on verified core tech</p>
                </div>
                
                <div className="relative p-6 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden flex flex-col items-center">
                   {/* Core Nodes */}
                   <div className="flex flex-wrap justify-center gap-3 mb-8 relative z-10">
                     {app.analysis.skills_ontology.core_nodes.map((node: string, i: number) => (
                        <span key={i} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-black shadow-lg shadow-purple-500/20 border border-purple-500">
                          {node}
                        </span>
                     ))}
                   </div>
                   
                   {/* Connection Lines (CSS UI Trick for Hackathons) */}
                   <div className="w-px h-8 bg-slate-300 -mt-8 mb-4 relative z-0"></div>
                   
                   {/* Inferred Nodes */}
                   <div className="flex flex-wrap justify-center gap-2 relative z-10">
                     {app.analysis.skills_ontology.inferred_nodes.map((node: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200 shadow-sm flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> {node}
                        </span>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {/* HIDDEN GEM CARD */}
            {app.analysis?.isHiddenGem && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[32px] p-8 text-white shadow-lg shadow-orange-500/20">
                 <div className="flex items-start gap-5">
                    <div className="p-4 bg-white/20 rounded-2xl shrink-0 backdrop-blur-sm">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black mb-2 tracking-tight">Hidden Gem Status</h4>
                      <p className="text-orange-50 font-medium leading-relaxed">
                        Our AI has flagged you as high-potential talent. Your Proof of Work on GitHub significantly exceeds typical expectations, showing deep mastery regardless of traditional pedigree.
                      </p>
                    </div>
                 </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  )
}