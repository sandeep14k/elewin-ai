"use client"

import { useState, useEffect, use } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { Application, Job } from "@/types/platform"
import { 
  UserCheck, ArrowLeft, Mail, Github, 
  Trophy, School, Briefcase, Star, Zap, 
  ExternalLink, Download, Calendar, MessageSquare,
  FileText
} from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts'

export default function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  const [job, setJob] = useState<Job | null>(null)
  const [shortlisted, setShortlisted] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShortlist = async () => {
      try {
        const jobRef = doc(db, "jobs", id)
        const jobSnap = await getDoc(jobRef)
        if (jobSnap.exists()) setJob({ id: jobSnap.id, ...jobSnap.data() } as Job)

        const q = query(
          collection(db, "applications"),
          where("jobId", "==", id),
          where("status", "==", "shortlisted")
        )
        const snap = await getDocs(q)
        const list: Application[] = []
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Application))
        
        // Sort by Match Score descending
        setShortlisted(list.sort((a, b) => (b.analysis?.overallMatchScore || 0) - (a.analysis?.overallMatchScore || 0)))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchShortlist()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050A15]">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Assembling Finalists...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-12">
        
        <Link href={`/employer/jobs/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-orange-500 mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Full Pipeline
        </Link>

        {/* --- PAGE HEADER --- */}
        <div className="bg-[#050A15] p-10 rounded-[40px] shadow-2xl mb-12 flex flex-col md:flex-row justify-between items-center gap-6 border border-white/5">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Trophy className="w-10 h-10 text-amber-400" /> Final Selection
            </h1>
            <p className="text-slate-400 font-medium mt-2">
              {job?.title} • {shortlisted.length} AI-Verified Engineers
            </p>
          </div>
          <Button className="bg-white text-[#050A15] hover:bg-slate-100 font-black h-14 px-8 rounded-2xl shadow-xl transition-all">
            <Download className="w-5 h-5 mr-2" /> Export Roster
          </Button>
        </div>

        {/* --- SHORTLIST GRID --- */}
        <div className="grid gap-8">
          {shortlisted.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-slate-100 text-slate-400">
               <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-10" />
               <p className="font-bold uppercase tracking-widest text-sm">No finalists locked in yet.</p>
             </div>
          ) : (
            shortlisted.map((app) => {
              const chartData = [
    { subject: 'Language Mastery', A: app.analysis?.forensic_skill_graph?.language_mastery || 0 },
    { subject: 'Code Hygiene', A: app.analysis?.forensic_skill_graph?.code_hygiene_and_testing || 0 },
    { subject: 'Architecture', A: app.analysis?.forensic_skill_graph?.system_architecture || 0 },
    { subject: 'DevOps & Infra', A: app.analysis?.forensic_skill_graph?.devops_and_infra || 0 },
    { subject: 'Data & State', A: app.analysis?.forensic_skill_graph?.data_and_state || 0 },
    { subject: 'Git Habits', A: app.analysis?.forensic_skill_graph?.version_control_habits || 0 },
  ]

              return (
                <div key={app.id} className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex flex-col lg:flex-row items-stretch">
                    
                    {/* Visual Skill Badge (Left Column) */}
                    <div className="lg:w-64 bg-slate-50 p-8 flex flex-col items-center justify-center border-r border-slate-100">
                        <div className="w-40 h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                              <Radar name="Skills" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 text-center">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Match Score</p>
                           <p className="text-4xl font-black text-slate-900">{app.analysis?.overallMatchScore}%</p>
                        </div>
                    </div>

                    {/* Candidate Details (Middle Column) */}
                    <div className="flex-1 p-8 md:p-10">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h3 className="text-3xl font-black text-slate-900">{app.candidateName}</h3>
                        {app.analysis?.isHiddenGem && (
                          <div className="bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-lg shadow-amber-400/20">
                            <Star className="w-3 h-3 fill-current" /> Hidden Gem
                          </div>
                        )}
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 ${
                          app.analysis?.learningVelocity === 'High' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <Zap className="w-3 h-3 mr-1 inline" /> Velocity: {app.analysis?.learningVelocity}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mb-8">
                        <a href={`mailto:${app.candidateEmail}`} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-600">
                          <Mail className="w-4 h-4" /> {app.candidateEmail}
                        </a>
                        <a href={`https://github.com/${app.githubUsername}`} target="_blank" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
                          <Github className="w-4 h-4" /> @{app.githubUsername}
                        </a>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                        <p className="text-sm text-slate-600 leading-relaxed italic">
                          <MessageSquare className="w-4 h-4 text-slate-300 inline mr-2 mb-1" />
                          "{app.analysis?.aiSummary}"
                        </p>
                      </div>
                    </div>

                    {/* Action Panel (Right Column) */}
                    <div className="lg:w-72 p-8 bg-slate-50/50 flex flex-col gap-3 justify-center border-l border-slate-100">
                       <Button className="w-full bg-[#050A15] hover:bg-black text-white h-14 rounded-2xl font-black shadow-xl">
                         <Calendar className="w-4 h-4 mr-2" /> Schedule Call
                       </Button>
                       <a href={app.resumeUrl} target="_blank" className="w-full">
                         <Button variant="outline" className="w-full h-14 rounded-2xl font-black border-slate-200 bg-white">
                           <FileText className="w-4 h-4 mr-2" /> View Resume
                         </Button>
                       </a>
                       <Link href={`https://github.com/${app.githubUsername}`} target="_blank" className="text-center text-[10px] font-black text-slate-400 uppercase hover:text-orange-500 transition-colors mt-2 flex items-center justify-center gap-1">
                         Review Source Code <ExternalLink className="w-3 h-3" />
                       </Link>
                    </div>

                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}