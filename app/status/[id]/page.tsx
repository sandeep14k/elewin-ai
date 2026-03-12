"use client"

import { useState, useEffect, use } from "react"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { Application } from "@/types/platform"
import { 
  Loader2, Github, CheckCircle2, Clock, 
  Zap, Star, Trophy, ArrowLeft, Search, TrendingUp, ShieldCheck
} from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, RadarChart as ReRadar, ResponsiveContainer 
} from 'recharts'

export default function CandidateStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // We use onSnapshot for REAL-TIME updates. 
    // This solves the "Calculating" bug by updating the UI the moment the AI finishes.
    const docRef = doc(db, "applications", id)
    
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setApp({ id: snap.id, ...snap.data() } as Application)
      }
      setLoading(false)
    }, (error) => {
      console.error("Status sync error:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050A15]">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing with AI Engine...</p>
    </div>
  )

  if (!app) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
      <Search className="w-16 h-16 text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-800">Application Record Not Found</h1>
      <p className="text-slate-500 mb-6">We couldn't find a record associated with this link.</p>
      <Link href="/"><button className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold">Back to Home</button></Link>
    </div>
  )

  const chartData = [
    { subject: 'Frontend', A: app.analysis?.skillGraph?.frontend || 0 },
    { subject: 'Backend', A: app.analysis?.skillGraph?.backend || 0 },
    { subject: 'Database', A: app.analysis?.skillGraph?.database || 0 },
    { subject: 'DevOps', A: app.analysis?.skillGraph?.devops || 0 },
    { subject: 'Architecture', A: app.analysis?.skillGraph?.architecture || 0 },
  ]

  // Detect if AI is still thinking
  const isPending = app.status === 'pending' || !app.analysis;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Job Board
        </Link>

        {/* --- STATUS HEADER --- */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-orange-600 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Technical Verification</p>
              <h1 className="text-4xl font-black text-slate-900 leading-tight">{app.jobTitle}</h1>
              <div className="flex items-center gap-2 mt-3">
                 <div className="bg-slate-900 p-1.5 rounded-lg">
                    <Github className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-slate-600 font-bold">@{app.githubUsername}</span>
              </div>
            </div>

            <div className={`px-8 py-4 rounded-3xl border-2 flex items-center gap-3 font-black text-sm uppercase tracking-wider shadow-sm transition-all ${
              app.status === 'shortlisted' ? 'bg-green-50 border-green-200 text-green-700' :
              app.status === 'rejected' ? 'bg-slate-50 border-slate-200 text-slate-500' :
              'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : app.status === 'shortlisted' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              {isPending ? 'AI Scoping in Progress' : app.status}
            </div>
          </div>
        </div>

        {/* --- GRID: SKILLS & FEEDBACK --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Skill Graph Card */}
          <div className="md:col-span-2 bg-[#050A15] rounded-[40px] p-10 text-white flex flex-col items-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-20"><Code2 className="w-12 h-12" /></div>
            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-8">Forensic Skill Graph</h3>
            
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
                  <Radar name="Skills" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <p className="text-[10px] text-slate-500 text-center mt-8 leading-relaxed font-medium">
              Calculated via GitHub GraphQL language distribution & commit density.
            </p>
          </div>

          {/* AI Insights Card */}
          <div className="md:col-span-3 space-y-6">
            <div className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-orange-500" /> AI Verification Log
              </h3>
              
              <p className="text-slate-600 leading-relaxed italic mb-10 text-sm">
                "{app.analysis?.aiSummary || "The forensic engine is currently analyzing your commit history and repository architecture. Please wait 10-15 seconds."}"
              </p>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group hover:border-orange-200 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                       <TrendingUp className="w-3 h-3 text-blue-500" /> Learning Velocity
                    </p>
                    {app.analysis?.learningVelocity ? (
                       <p className="text-2xl font-black text-slate-900 animate-in fade-in duration-700">
                          {app.analysis.learningVelocity}
                       </p>
                    ) : (
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                          <p className="text-xs font-bold text-slate-400">Analyzing...</p>
                       </div>
                    )}
                 </div>

                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group hover:border-orange-200 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                       <ShieldCheck className="w-3 h-3 text-green-500" /> Match Score
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                       {app.analysis?.overallMatchScore || 0}%
                    </p>
                 </div>
              </div>
            </div>

            {/* Hidden Gem Badge */}
            {app.analysis?.isHiddenGem && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-600 rounded-[40px] p-10 text-white shadow-2xl shadow-orange-500/30 animate-in slide-in-from-right duration-700">
                 <div className="flex items-start gap-5">
                    <div className="p-4 bg-white/20 rounded-[24px] backdrop-blur-md">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black mb-2 tracking-tight">Hidden Gem Identified</h4>
                      <p className="text-orange-50 text-xs leading-relaxed font-medium opacity-90">
                        Our algorithm flagged your profile as a high-potential engineering asset. Your technical "Proof of Work" significantly exceeds your academic markers.
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

// Small helper for UI icon
function Code2(props: any) {
    return (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
    )
}