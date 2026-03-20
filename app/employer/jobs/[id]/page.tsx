"use client"

import { useState, useEffect, useMemo, use } from "react"
import { getJobWithApplications, executeAutonomousShortlist, updateApplicationStatus } from "@/lib/employer"
import { Job, Application } from "@/types/platform"
import { 
  Github, FileText, Loader2, UserCheck, 
  Sparkles, Zap, Star, ChevronDown, ChevronUp, 
  Info, Target, Network, EyeOff, Eye, ShieldAlert, ShieldCheck,
  SlidersHorizontal
} from "lucide-react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
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

  // 🔥 NEW: State for interactive weights
  const [liveWeights, setLiveWeights] = useState({
    skills: 30, github: 25, projects: 20, algorithmic: 10, experience: 10, velocity: 5
  });
  const [isCustomizing, setIsCustomizing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getJobWithApplications(id)
      setJob(data.job)
      setApplications(data.applications)
      
      // Set initial weights from the AI dynamically generated rubric!
      if (data.job.scoringWeights) {
        setLiveWeights(data.job.scoringWeights)
      }
    } catch (error) { console.error(error) } finally { setIsLoading(false) }
  }

  useEffect(() => { loadData() }, [id])

  const handleStatusUpdate = async (appId: string, status: string) => {
    const success = await updateApplicationStatus(appId, status)
    if (success) {
      setApplications(prev => prev.map(app => 
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

  // 🔥 THE LIVE RE-RANKING ENGINE 🔥
  const liveRankedCandidates = useMemo(() => {
    return [...applications].map(app => {
      const breakdown = (app.analysis as any)?.weightedBreakdown || {};
      
      // Reverse-engineer their raw score (out of 100) based on the original AI weights
      const originalWeights = job?.scoringWeights || { skills: 30, github: 25, projects: 20, algorithmic: 10, experience: 10, velocity: 5 };
      
      // Prevent division by zero
      const safeDivide = (val: number, weight: number) => weight > 0 ? (val / weight) * 100 : 0;

      const rawSkills = safeDivide(breakdown.skills, originalWeights.skills);
      const rawGithub = safeDivide(breakdown.github, originalWeights.github);
      const rawProjects = safeDivide(breakdown.projects, originalWeights.projects);
      const rawAlgo = safeDivide(breakdown.algorithmic, originalWeights.algorithmic);
      const rawExp = safeDivide(breakdown.experience, originalWeights.experience);
      const rawVelocity = safeDivide(breakdown.velocity, originalWeights.velocity);

      // Apply new Live Weights to compute re-ranked breakdown
      const newBreakdown = {
        skills: Math.round(rawSkills * (liveWeights.skills / 100)),
        github: Math.round(rawGithub * (liveWeights.github / 100)),
        projects: Math.round(rawProjects * (liveWeights.projects / 100)),
        algorithmic: Math.round(rawAlgo * (liveWeights.algorithmic / 100)),
        experience: Math.round(rawExp * (liveWeights.experience / 100)),
        velocity: Math.round(rawVelocity * (liveWeights.velocity / 100))
      };

      const newTotal = Object.values(newBreakdown).reduce((a, b) => a + b, 0);

      return { ...app, liveScore: newTotal, liveBreakdown: newBreakdown };
    }).sort((a, b) => b.liveScore - a.liveScore); // Re-sort automatically!
  }, [applications, liveWeights, job]);

  // --- PREPARE COMPARATIVE CHART DATA ---
  const comparativeData = liveRankedCandidates.map((app, index) => {
    const breakdown = (app as any).liveBreakdown || {};
    return {
      name: isBlindMode ? `Rank #${index + 1}` : app.candidateName.split(" ")[0],
      Skills: breakdown.skills || 0,
      GitHub: breakdown.github || 0,
      Projects: breakdown.projects || 0,
      Algorithmic: breakdown.algorithmic || 0,
      Experience: breakdown.experience || 0,
      Velocity: breakdown.velocity || 0,
      Total: (app as any).liveScore || 0
    };
  });

  const topScore = liveRankedCandidates.length > 0 ? (liveRankedCandidates[0] as any).liveScore : 0;

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

        {/* --- 🔥 THE "WHAT-IF" CONTROL PANEL 🔥 --- */}
        <div className="bg-[#050A15] rounded-[32px] p-8 mb-8 text-white shadow-2xl relative overflow-hidden">
           <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-2 mb-1">
                  <SlidersHorizontal className="w-6 h-6 text-orange-500" />
                  Live Algorithmic Re-Ranking
                </h3>
                <p className="text-sm text-slate-400 font-medium">Test what-if scenarios by adjusting the rubric. The leaderboard will recalculate in real-time.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold rounded-xl"
              >
                {isCustomizing ? "Lock Weights" : "Adjust Rubric"}
              </Button>
           </div>

           {isCustomizing ? (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10 animate-in fade-in slide-in-from-top-4">
                {Object.entries(liveWeights).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                      <span>{key}</span>
                      <span className="text-orange-400">{value}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={value}
                      onChange={(e) => setLiveWeights({...liveWeights, [key]: parseInt(e.target.value)})}
                      className="w-full accent-orange-500"
                    />
                  </div>
                ))}
                <div className="col-span-full pt-4">
                   <p className="text-xs text-slate-400 italic text-center font-bold">
                     * Total Weight: <span className={Object.values(liveWeights).reduce((a,b)=>a+b,0) !== 100 ? "text-red-400" : "text-green-400"}>{Object.values(liveWeights).reduce((a,b)=>a+b,0)}%</span> (Adjust sliders to balance your ideal candidate profile)
                   </p>
                </div>
             </div>
           ) : (
             <div className="flex flex-wrap gap-3 relative z-10">
               {Object.entries(liveWeights).map(([key, value]) => (
                 <span key={key} className="bg-white/5 border border-white/10 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest">
                   {key}: <span className="text-orange-400">{value}%</span>
                 </span>
               ))}
             </div>
           )}
        </div>

        {/* --- 🔥 THE FORENSIC DELTA DASHBOARD (STACKED CHART) 🔥 --- */}
        {liveRankedCandidates.length > 1 && (
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-200 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-500" /> Head-to-Head Score Breakdown
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Visualizing exactly where candidates gained or lost points against your live rubric.
              </p>
            </div>

            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparativeData}
                  margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                  barSize={60}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }} />
                  
                  <Bar dataKey="Skills" stackId="a" fill="#3b82f6" name="Tech Skills" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="GitHub" stackId="a" fill="#f97316" name="GitHub Code" />
                  <Bar dataKey="Projects" stackId="a" fill="#8b5cf6" name="Projects" />
                  <Bar dataKey="Algorithmic" stackId="a" fill="#10b981" name="DSA / LeetCode" />
                  <Bar dataKey="Experience" stackId="a" fill="#f43f5e" name="Verified Exp" />
                  <Bar dataKey="Velocity" stackId="a" fill="#eab308" name="Learning Velocity" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* --- LEADERBOARD --- */}
        <div className="space-y-6">
          {liveRankedCandidates.map((app, index) => {
            const analysisExt = app.analysis as any;
            const liveScore = (app as any).liveScore;
            const liveBreakdown = (app as any).liveBreakdown;
            const pointDelta = topScore - liveScore;

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
              <div key={app.id} className={`bg-white border-2 rounded-3xl transition-all overflow-hidden ${
                analysisExt?.spam_analysis?.is_likely_spam ? 'border-red-300 bg-red-50/10' : 
                app.status === 'shortlisted' ? 'border-green-400 bg-green-50/5' : 'border-slate-100 shadow-sm hover:shadow-md'
              }`}>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* 1. Skill Graph Section */}
                    <div className="w-full lg:w-48 h-48 flex-shrink-0 bg-slate-50 rounded-2xl border border-slate-100 p-2 relative">
                        <div className="absolute top-2 left-2 bg-slate-800 text-white font-black px-2 py-1 rounded-md text-[10px] z-10 shadow-sm">
                          Rank #{index + 1}
                        </div>
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
                        
                        {analysisExt?.open_source_impact && (
                          <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-purple-200">
                            <Network className="w-3 h-3 fill-current" /> Open Source Contributor
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

                      {/* --- ULTIMATE ANTI-SPAM SHIELD HIGHLIGHT --- */}
                      {analysisExt?.spam_analysis?.is_likely_spam ? (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-4 flex items-start gap-3 shadow-sm">
                           <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                           <div>
                             <h4 className="text-sm font-black text-red-900 tracking-tight flex items-center gap-2">
                               🚨 AI-Spam / Exaggeration Detected 
                               <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px] uppercase font-black">
                                 Authenticity: {analysisExt.spam_analysis.authenticity_score}/100
                               </span>
                             </h4>
                             <p className="text-xs text-red-800 font-medium mt-1 leading-relaxed">
                               {analysisExt.spam_analysis.reasoning}
                             </p>
                           </div>
                        </div>
                      ) : analysisExt?.spam_analysis?.authenticity_score > 80 ? (
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 inline-flex items-center gap-2 shadow-sm">
                           <ShieldCheck className="w-5 h-5 text-emerald-600" />
                           <span className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                             Profile Authenticity Verified
                             <span className="bg-emerald-200/50 text-emerald-700 px-2 py-0.5 rounded text-[10px]">
                               Score: {analysisExt.spam_analysis.authenticity_score}/100
                             </span>
                           </span>
                        </div>
                      ) : null}

                      {/* 🔥 IMPACT AREA 04 - EXPLICIT SCORE REASONING 🔥 */}
                      <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-200 mt-4 mb-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Explicit Score Reasoning
                        </h4>
                        <p className="text-sm text-slate-700 font-bold leading-relaxed">
                          "{analysisExt?.score_reasoning || analysisExt?.aiSummary}"
                        </p>
                      </div>

                      {/* 🔥 IMPACT AREA 04 - BIAS AUDIT BADGE 🔥 */}
                      {analysisExt?.bias_audit && (
                        <div className="mt-2 mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2 shadow-sm">
                          <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-indigo-700 font-medium">
                            <strong>Pedigree-Blind Guarantee:</strong> {analysisExt.bias_audit.audit_statement}
                          </p>
                        </div>
                      )}

                      {/* 🔥 ADAPTIVE MICRO-ASSESSMENT 🔥 */}
                      {analysisExt?.adaptive_assessment && (
                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl mb-4 shadow-sm max-w-2xl">
                           <h4 className="text-sm font-black text-indigo-900 tracking-tight flex items-center gap-2 mb-2">
                             <Target className="w-4 h-4 text-indigo-600" /> Adaptive Interview Generation
                           </h4>
                           <p className="text-xs text-indigo-800 font-bold leading-relaxed mb-2">
                             "{analysisExt.adaptive_assessment.question}"
                           </p>
                           <p className="text-[10px] text-indigo-600/80 font-black uppercase tracking-widest">
                             Context: {analysisExt.adaptive_assessment.context}
                           </p>
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">Live Match Score</p>
                        <span className={`text-6xl font-black mb-1 ${analysisExt?.spam_analysis?.is_likely_spam ? 'text-red-500' : 'text-slate-900'}`}>
                          {liveScore}
                        </span>
                        
                        {/* 🔥 DELTA BADGE 🔥 */}
                        {index > 0 && (
                          <div className="mb-4 inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-black uppercase border border-red-100">
                            -{pointDelta} Pts vs Leader
                          </div>
                        )}
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id!)}
                            className="mt-2 text-orange-600 font-bold text-xs hover:bg-orange-100 w-full"
                        >
                            {expandedApp === app.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                            Deep Audit
                        </Button>
                    </div>
                  </div>

                {/* 4. The Glass-Box Verification Matrix (Expandable) */}
                  {expandedApp === app.id && (
                    <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                        
                        {/* 🔥 NEW: GRANULAR SCORE BREAKDOWN 🔥 */}
                        <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                            <Target className="w-3 h-3" /> Live Mathematical Breakdown
                          </h4>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            <div className="bg-white p-3 rounded-xl text-center border border-slate-100 shadow-sm">
                              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Skills</span>
                              <span className="text-xl font-black text-blue-500">{liveBreakdown.skills}</span>
                              <span className="text-[9px] text-slate-400 block mt-1">/ {liveWeights.skills}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl text-center border border-slate-100 shadow-sm">
                              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">GitHub</span>
                              <span className="text-xl font-black text-orange-500">{liveBreakdown.github}</span>
                              <span className="text-[9px] text-slate-400 block mt-1">/ {liveWeights.github}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl text-center border border-slate-100 shadow-sm">
                              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Projects</span>
                              <span className="text-xl font-black text-purple-500">{liveBreakdown.projects}</span>
                              <span className="text-[9px] text-slate-400 block mt-1">/ {liveWeights.projects}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl text-center border border-slate-100 shadow-sm">
                              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">DSA</span>
                              <span className="text-xl font-black text-emerald-500">{liveBreakdown.algorithmic}</span>
                              <span className="text-[9px] text-slate-400 block mt-1">/ {liveWeights.algorithmic}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl text-center border border-slate-100 shadow-sm">
                              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Experience</span>
                              <span className="text-xl font-black text-rose-500">{liveBreakdown.experience}</span>
                              <span className="text-[9px] text-slate-400 block mt-1">/ {liveWeights.experience}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl text-center border border-slate-100 shadow-sm">
                              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Velocity</span>
                              <span className="text-xl font-black text-yellow-500">{liveBreakdown.velocity}</span>
                              <span className="text-[9px] text-slate-400 block mt-1">/ {liveWeights.velocity}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-6">
                            <ShieldCheck className="w-5 h-5 text-orange-500" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Signal Extraction & Verification Report</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 mb-8">
                            {app.analysis?.skill_verification_matrix?.map((item: any, i: number) => (
                                <div key={i} className={`flex flex-col gap-3 p-5 rounded-2xl border-2 ${
                                    item.status === 'Verified' ? 'bg-green-50/50 border-green-100' : 
                                    item.status === 'Falsified' ? 'bg-red-50/50 border-red-100' : 
                                    'bg-slate-50 border-slate-100'
                                }`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-slate-900">{item.skill}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                                                item.status === 'Verified' ? 'bg-green-100 text-green-700' : 
                                                item.status === 'Falsified' ? 'bg-red-100 text-red-700' : 
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resume Claim</span>
                                            <span className="text-slate-700">{item.resumeClaim || "None"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GitHub Evidence</span>
                                            <span className="text-slate-700">{item.githubEvidence || "No code found"}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-white/50">
                                        <p className="text-sm font-medium text-slate-800 italic flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                            "{item.explanation}"
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Final Status Buttons in Expanded View */}
                        <div className="flex justify-end gap-3 mt-6">
                            <Button onClick={() => handleStatusUpdate(app.id!, 'rejected')} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl px-6">Reject (Fails Verification)</Button>
                            <Button onClick={() => handleStatusUpdate(app.id!, 'shortlisted')} className="bg-slate-900 hover:bg-black text-white rounded-xl px-6">Shortlist Candidate</Button>
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