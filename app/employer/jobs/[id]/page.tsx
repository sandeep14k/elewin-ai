"use client"

import { useState, useEffect, use } from "react"
import { getJobWithApplications, executeAutonomousShortlist, updateApplicationStatus } from "@/lib/employer"
import { Job, Application } from "@/types/platform"
import { 
  Github, FileText, Loader2, UserCheck, 
   Sparkles, 
 Zap, Star, ChevronDown, ChevronUp, Info, 
  Target, Network, EyeOff, Eye, ShieldAlert
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
  
  // --- Bias-Masking State ---
  const [isBlindMode, setIsBlindMode] = useState(true)
  
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
        // FIX 1: Safely cast status using the Application interface instead of 'any'
        app.id === appId ? { ...app, status: status as Application["status"] } : app
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
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{job?.title}</h1>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {applications.length} Candidates
              </span>
            </div>
            
            {/* BLIND HIRING TOGGLE */}
            <button 
              onClick={() => setIsBlindMode(!isBlindMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isBlindMode ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {isBlindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isBlindMode ? 'Blind Evaluation Active: PII Masked' : 'Blind Evaluation Disabled: Showing PII'}
            </button>
          </div>
          
          {job?.status === 'open' ? (
            <div className="flex items-center gap-3 bg-orange-50 p-4 rounded-2xl border border-orange-200 w-full md:w-auto">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-orange-800 uppercase">Shortlist Target</span>
                  <input type="number" value={targetCount} onChange={(e) => setTargetCount(Number(e.target.value))} className="w-12 bg-transparent font-bold text-lg outline-none text-orange-900" />
               </div>
               <Button onClick={handleAutoShortlist} disabled={isShortlisting || applications.length === 0} className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 w-full md:w-auto">
                  {isShortlisting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> Auto-Shortlist</>}
               </Button>
            </div>
          ) : (
            <Link href={`/employer/jobs/${id}/shortlist`}>
              <Button className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 py-6 font-bold w-full md:w-auto">
                <UserCheck className="w-4 h-4 mr-2" /> View Final Shortlist
              </Button>
            </Link>
          )}
        </div>

        {/* SECURITY & PRIVACY BANNER */}
        <div className="bg-[#050A15] p-4 rounded-2xl flex items-center justify-between mb-8 shadow-lg text-white">
           <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
              <p className="text-xs font-medium text-slate-300">
                <strong className="text-white">Zero-Trust Vault:</strong> Candidate documents are parsed entirely in volatile RAM. No PDFs or offer letters are permanently stored on our servers.
              </p>
           </div>
        </div>

        {/* --- LEADERBOARD --- */}
        <div className="space-y-6">
          {applications.map((app) => {
            // FIX 2: Create a local "any" typed reference for analysis to bypass strict TS checking for the new hackathon fields
            const analysisExt = app.analysis as any;

            const chartData = [
              { subject: 'Language Mastery', A: analysisExt?.forensic_skill_graph?.language_mastery || 0 },
              { subject: 'Code Hygiene', A: analysisExt?.forensic_skill_graph?.code_hygiene_and_testing || 0 },
              { subject: 'Architecture', A: analysisExt?.forensic_skill_graph?.system_architecture || 0 },
              { subject: 'DevOps & Infra', A: analysisExt?.forensic_skill_graph?.devops_and_infra || 0 },
              { subject: 'Data & State', A: analysisExt?.forensic_skill_graph?.data_and_state || 0 },
              { subject: 'Git Habits', A: analysisExt?.forensic_skill_graph?.version_control_habits || 0 },
            ]

            // BIAS MASKING VARIABLES
            const displayName = isBlindMode ? `Anonymous Engineer #${app.id?.substring(0, 5).toUpperCase()}` : app.candidateName;
            const displayGithub = isBlindMode ? "Hidden for Bias Protection" : `@${app.githubUsername}`;

            return (
              <div key={app.id} className={`bg-white border-2 rounded-3xl transition-all overflow-hidden ${app.status === 'shortlisted' ? 'border-green-400 bg-green-50/5' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
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
                        <h3 className="text-2xl font-black text-slate-900">{displayName}</h3>
                        
                        {analysisExt?.isHiddenGem && (
                          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-amber-200">
                            <Star className="w-3 h-3 fill-current" /> Hidden Talent
                          </div>
                        )}

                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                          analysisExt?.learningVelocity === 'High' || analysisExt?.learningVelocity === 'Exceptional Learner' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Zap className="w-3 h-3 fill-current" /> LPI: {analysisExt?.learningVelocity || "N/A"}
                        </div>
                      </div>

                      <div className="flex gap-4 mb-4 items-center">
                         {!isBlindMode ? (
                           <>
                             <a href={`https://github.com/${app.githubUsername}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 text-sm font-bold"><Github className="w-5 h-5" /> {displayGithub}</a>
                             {app.resumeUrl && <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1 text-sm font-bold"><FileText className="w-5 h-5" /> Original Resume</a>}
                           </>
                         ) : (
                           <div className="flex items-center gap-2 text-slate-400 text-sm font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                              <EyeOff className="w-4 h-4" /> Original links hidden during blind evaluation
                           </div>
                         )}
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed italic max-w-2xl mb-4">
                        "{analysisExt?.aiSummary}"
                      </p>

                      {/* Display Coding Profiles if they exist */}
                      {(app as any).passportBlocks?.codingProfiles && Object.keys((app as any).passportBlocks.codingProfiles).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Object.entries((app as any).passportBlocks.codingProfiles).map(([platform, data]: [string, any]) => (
                            <span key={platform} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
                              <Target className="w-3 h-3" /> {platform} Verified
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {analysisExt?.verifiedSkills?.slice(0, 5).map((skill: string) => (
                            <span key={skill} className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded border border-slate-100">#{skill}</span>
                        ))}
                      </div>
                    </div>

                    {/* 3. Match Score & Accordion Trigger */}
                    <div className="lg:w-48 flex flex-col justify-center items-center bg-slate-50 rounded-2xl border border-slate-100 p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Match Score</p>
                        <span className="text-5xl font-black text-slate-900 mb-4">{analysisExt?.overallMatchScore || 0}</span>
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id!)}
                            className="text-orange-600 font-bold text-xs hover:bg-orange-100 w-full"
                        >
                            {expandedApp === app.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                            Deep Audit
                        </Button>
                    </div>
                  </div>

                  {/* 4. The Forensic Audit Trail (Expandable) */}
                  {expandedApp === app.id && (
                    <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                        
                        {/* SKILLS ONTOLOGY GRAPH (Recruiter View) */}
                        {analysisExt?.skills_ontology && analysisExt.skills_ontology.core_nodes?.length > 0 && (
                          <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Network className="w-4 h-4 text-purple-500" />
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inferred Skills Ontology</h4>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
                               <div className="flex flex-wrap justify-center gap-2 mb-6">
                                 {analysisExt.skills_ontology.core_nodes.map((node: string, i: number) => (
                                    <span key={i} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-black shadow-sm border border-purple-500">
                                      {node}
                                    </span>
                                 ))}
                               </div>
                               <div className="w-px h-6 bg-slate-300 -mt-6 mb-3"></div>
                               <div className="flex flex-wrap justify-center gap-2">
                                 {analysisExt.skills_ontology.inferred_nodes.map((node: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 bg-white text-slate-600 rounded-md text-[10px] font-bold border border-slate-200 shadow-sm flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> {node}
                                    </span>
                                 ))}
                               </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                            <Info className="w-4 h-4 text-blue-500" />
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Forensic Discrepancy Log</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {analysisExt?.audit_trail?.map((log: string, i: number) => (
                                <div key={i} className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-blue-500 font-black text-xs">0{i+1}</span>
                                    {/* Obscure GitHub references in the logs if blind mode is on */}
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                      {isBlindMode ? log.replace(/GitHub/g, "Source Repository").replace(/repo/g, "project") : log}
                                    </p>
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