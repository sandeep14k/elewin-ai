"use client"

import { useState, useEffect, use } from "react"
import { getJobWithApplications, executeAutonomousShortlist, updateApplicationStatus } from "@/lib/employer"
import { Job, Application } from "@/types/platform"
import { 
  AlertTriangle, Github, FileText, Loader2, UserCheck, 
  CheckCircle2, XCircle, Award, School, Briefcase, Sparkles, 
  Users, Zap, Star, ChevronDown, ChevronUp, Info, ExternalLink
} from "lucide-react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts'

export default function EmployerJobDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  
  const [targetCount, setTargetCount] = useState(5)
  const [isShortlisting, setIsShortlisting] = useState(false)

  const loadData = async () => {
    try {
      const data = await getJobWithApplications(id)
      setJob(data.job)
      setApplications(data.applications)
    } catch (error) { console.error(error) } finally { setIsLoading(false) }
  }

  useEffect(() => { loadData() }, [id])

  const handleStatusUpdate = async (appId: string, status: string) => {
    const success = await updateApplicationStatus(appId, status)
    if (success) {
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: status as any } : app
      ))
    }
  }

  const handleAutoShortlist = async () => {
    if (confirm(`AI will now lock in the Top ${targetCount} candidates and close the job. Continue?`)) {
      setIsShortlisting(true)
      const success = await executeAutonomousShortlist(id, targetCount, applications)
      if (success) await loadData()
      setIsShortlisting(false)
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* --- SMART HEADER --- */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{job?.title}</h1>
            <p className="text-slate-500 font-medium">Verified Pipeline • {applications.length} Applicants</p>
          </div>
          
          {job?.status === 'open' ? (
            <div className="flex items-center gap-3 bg-orange-50 p-4 rounded-2xl border border-orange-200">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-orange-800 uppercase">Shortlist Target</span>
                  <input type="number" value={targetCount} onChange={(e) => setTargetCount(Number(e.target.value))} className="w-12 bg-transparent font-bold text-lg outline-none" />
               </div>
               <Button onClick={handleAutoShortlist} disabled={isShortlisting || applications.length === 0} className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20">
                  {isShortlisting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> AI Auto-Shortlist</>}
               </Button>
            </div>
          ) : (
            <Link href={`/employer/jobs/${id}/shortlist`}>
              <Button className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 py-6 font-bold">
                <UserCheck className="w-4 h-4 mr-2" /> View Final Shortlist
              </Button>
            </Link>
          )}
        </div>

        {/* --- LEADERBOARD --- */}
        <div className="space-y-6">
          {applications.map((app) => {
            const chartData = [
              { subject: 'Front', A: app.analysis?.skillGraph?.frontend || 0 },
              { subject: 'Back', A: app.analysis?.skillGraph?.backend || 0 },
              { subject: 'DB', A: app.analysis?.skillGraph?.database || 0 },
              { subject: 'Ops', A: app.analysis?.skillGraph?.devops || 0 },
              { subject: 'Arch', A: app.analysis?.skillGraph?.architecture || 0 },
            ]

            return (
              <div key={app.id} className={`bg-white border-2 rounded-3xl transition-all overflow-hidden ${app.status === 'shortlisted' ? 'border-green-400 bg-green-50/5' : 'border-white shadow-sm hover:shadow-md'}`}>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* 1. Skill Graph Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-slate-50 rounded-2xl border border-slate-100 p-2 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} />
                                <Radar name="Skills" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 2. Bio & Forensic Highlights */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-2xl font-black text-slate-900">{app.candidateName}</h3>
                        
                        {app.analysis?.isHiddenGem && (
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-amber-200">
                            <Star className="w-3 h-3 fill-current" /> Hidden Gem
                          </div>
                        )}

                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                          app.analysis?.learningVelocity === 'High' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Zap className="w-3 h-3 fill-current" /> Velocity: {app.analysis?.learningVelocity || "N/A"}
                        </div>
                      </div>

                      <div className="flex gap-4 mb-4">
                         <a href={`https://github.com/${app.githubUsername}`} target="_blank" className="text-slate-400 hover:text-slate-900 transition-colors"><Github className="w-5 h-5" /></a>
                         <a href={app.resumeUrl} target="_blank" className="text-slate-400 hover:text-orange-500 transition-colors"><FileText className="w-5 h-5" /></a>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed italic max-w-2xl mb-4">
                        "{app.analysis?.aiSummary}"
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {app.analysis?.verifiedSkills?.slice(0, 5).map(skill => (
                            <span key={skill} className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded border border-slate-100">#{skill}</span>
                        ))}
                      </div>
                    </div>

                    {/* 3. Match Score & Accordion Trigger */}
                    <div className="lg:w-48 flex flex-col justify-center items-center bg-slate-50 rounded-2xl border border-slate-100 p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Match Score</p>
                        <span className="text-5xl font-black text-slate-900 mb-4">{app.analysis?.overallMatchScore || 0}</span>
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id!)}
                            className="text-orange-600 font-bold text-xs hover:bg-orange-100 w-full"
                        >
                            {expandedApp === app.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                            Audit Trail
                        </Button>
                    </div>
                  </div>

                  {/* 4. The Forensic Audit Trail (Expandable) */}
                  {expandedApp === app.id && (
                    <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Info className="w-4 h-4 text-blue-500" />
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Forensic Discrepancy Log</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {app.analysis?.audit_trail?.map((log, i) => (
                                <div key={i} className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-blue-500 font-black text-xs">0{i+1}</span>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{log}</p>
                                </div>
                            ))}
                        </div>
                        
                        {/* Final Status Buttons in Expanded View */}
                        <div className="flex justify-end gap-3 mt-6">
                            <Button onClick={() => handleStatusUpdate(app.id!, 'rejected')} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl px-6">Reject</Button>
                            <Button onClick={() => handleStatusUpdate(app.id!, 'shortlisted')} className="bg-slate-900 hover:bg-black text-white rounded-xl px-6">Shortlist</Button>
                        </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}