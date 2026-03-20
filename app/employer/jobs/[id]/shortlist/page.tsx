"use client"

import { useState, useEffect, useMemo, use } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { Application, Job } from "@/types/platform"
import { 
  UserCheck, ArrowLeft, Mail, Github, 
  Trophy, School, Briefcase, Star, Zap, 
  ExternalLink, Download, Calendar, MessageSquare,
  FileText, EyeOff, Eye, Target, SlidersHorizontal,
  ChevronDown, ChevronUp, ShieldCheck, Sparkles
} from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

export default function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  
  const [job, setJob] = useState<Job | null>(null)
  const [shortlisted, setShortlisted] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  
  // --- Bias-Masking State ---
  const [isBlindMode, setIsBlindMode] = useState(true)

  // --- Live Ranking State ---
  const [liveWeights, setLiveWeights] = useState({
    skills: 30, github: 25, projects: 20, algorithmic: 10, experience: 10, velocity: 5
  });
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    const fetchShortlist = async () => {
      try {
        const jobRef = doc(db, "jobs", id)
        const jobSnap = await getDoc(jobRef)
        if (jobSnap.exists()) {
          const jobData = { id: jobSnap.id, ...jobSnap.data() } as Job;
          setJob(jobData)
          if (jobData.scoringWeights) {
            setLiveWeights(jobData.scoringWeights);
          }
        }

        const q = query(
          collection(db, "applications"),
          where("jobId", "==", id),
          where("status", "==", "shortlisted")
        )
        const snap = await getDocs(q)
        const list: Application[] = []
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Application))
        
        setShortlisted(list)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchShortlist()
  }, [id])

  // 🔥 THE LIVE RE-RANKING ENGINE 🔥
  const liveRankedCandidates = useMemo(() => {
    return [...shortlisted].map(app => {
      const breakdown = (app.analysis as any)?.weightedBreakdown || {};
      const originalWeights = job?.scoringWeights || { skills: 30, github: 25, projects: 20, algorithmic: 10, experience: 10, velocity: 5 };
      const safeDivide = (val: number, weight: number) => weight > 0 ? (val / weight) * 100 : 0;

      const rawSkills = safeDivide(breakdown.skills, originalWeights.skills);
      const rawGithub = safeDivide(breakdown.github, originalWeights.github);
      const rawProjects = safeDivide(breakdown.projects, originalWeights.projects);
      const rawAlgo = safeDivide(breakdown.algorithmic, originalWeights.algorithmic);
      const rawExp = safeDivide(breakdown.experience, originalWeights.experience);
      const rawVelocity = safeDivide(breakdown.velocity, originalWeights.velocity);

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
    }).sort((a, b) => b.liveScore - a.liveScore);
  }, [shortlisted, liveWeights, job]);

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

  // --- CSV EXPORT FUNCTIONALITY (Updated to use Live Scores) ---
  const handleExportCSV = () => {
    if (liveRankedCandidates.length === 0) return;

    const headers = [
      "Live Rank", "Live Match Score", "Candidate Name", "Email", "GitHub Username", 
      "LPI Score", "Hidden Gem", "Verified Coding Platforms", "AI Summary"
    ];

    const rows = liveRankedCandidates.map((app, index) => {
      const analysisExt = app.analysis as any;
      const codingProfiles = (app as any).passportBlocks?.codingProfiles || {};
      const verifiedPlatforms = Object.keys(codingProfiles).join(" | ") || "None";
      
      return [
        index + 1,
        (app as any).liveScore || 0,
        `"${app.candidateName}"`, 
        app.candidateEmail,
        app.githubUsername,
        analysisExt?.learningPotential?.score || 0,
        analysisExt?.isHiddenGem ? "Yes" : "No",
        `"${verifiedPlatforms}"`,
        `"${(analysisExt?.score_reasoning || analysisExt?.aiSummary || "").replace(/"/g, '""')}"` 
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `EleWin_Shortlist_${job?.title?.replace(/\s+/g, '_') || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Complete", description: "The shortlist roster has been downloaded." });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050A15]">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Assembling Finalists...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-12">
        
        <Link href={`/employer/jobs/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-orange-500 mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Full Pipeline
        </Link>

        {/* --- PAGE HEADER --- */}
        <div className="bg-[#050A15] p-8 md:p-10 rounded-[40px] shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3 mb-2">
              <Trophy className="w-10 h-10 text-amber-400" /> Final Selection
            </h1>
            <p className="text-slate-400 font-medium">
              {job?.title} • {shortlisted.length} AI-Verified Engineers
            </p>
            
            {/* BLIND HIRING TOGGLE */}
            <button 
              onClick={() => setIsBlindMode(!isBlindMode)}
              className={`mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isBlindMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/10 text-slate-300 border border-white/20'
              }`}
            >
              {isBlindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isBlindMode ? 'Blind Evaluation Active' : 'Showing PII'}
            </button>
          </div>

          <Button 
            onClick={handleExportCSV} 
            disabled={shortlisted.length === 0}
            className="bg-white text-[#050A15] hover:bg-slate-100 font-black h-14 px-8 rounded-2xl shadow-xl transition-all relative z-10 w-full md:w-auto"
          >
            <Download className="w-5 h-5 mr-2" /> Export Roster (CSV)
          </Button>
        </div>

        {/* --- 🔥 THE "WHAT-IF" CONTROL PANEL 🔥 --- */}
        {shortlisted.length > 0 && (
          <div className="bg-white rounded-[32px] p-8 mb-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-1">
                    <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                    Live Re-Ranking Engine
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Adjust the scoring rubric to see how your finalists perform under different criteria.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className="font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  {isCustomizing ? "Lock Weights" : "Adjust Rubric"}
                </Button>
            </div>

            {isCustomizing ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10 animate-in fade-in slide-in-from-top-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  {Object.entries(liveWeights).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                        <span>{key}</span>
                        <span className="text-orange-500">{value}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" value={value}
                        onChange={(e) => setLiveWeights({...liveWeights, [key]: parseInt(e.target.value)})}
                        className="w-full accent-orange-500"
                      />
                    </div>
                  ))}
                  <div className="col-span-full pt-2">
                    <p className="text-xs text-slate-500 italic text-center font-bold">
                      Total Weight: <span className={Object.values(liveWeights).reduce((a,b)=>a+b,0) !== 100 ? "text-red-500" : "text-green-500"}>{Object.values(liveWeights).reduce((a,b)=>a+b,0)}%</span>
                    </p>
                  </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 relative z-10">
                {Object.entries(liveWeights).map(([key, value]) => (
                  <span key={key} className="bg-slate-50 border border-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {key}: <span className="text-orange-500">{value}%</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 🔥 FORENSIC DELTA DASHBOARD (STACKED CHART) 🔥 --- */}
        {liveRankedCandidates.length > 1 && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-500" /> Head-to-Head Score Breakdown
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Visualizing exactly where finalists gained or lost points against your live rubric.
              </p>
            </div>

            <div className="w-full h-[350px]">
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
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
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

        {/* --- SHORTLIST GRID --- */}
        <div className="grid gap-8">
          {liveRankedCandidates.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-slate-200 text-slate-400">
               <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
               <p className="font-bold uppercase tracking-widest text-sm">No finalists locked in yet.</p>
             </div>
          ) : (
            liveRankedCandidates.map((app, index) => {
              const analysisExt = app.analysis as any;
              const liveScore = (app as any).liveScore;
              const liveBreakdown = (app as any).liveBreakdown;
              const pointDelta = topScore - liveScore;

              const chartData = [
                { subject: 'Language', A: analysisExt?.forensic_skill_graph?.language_mastery || 0 },
                { subject: 'Hygiene', A: analysisExt?.forensic_skill_graph?.code_hygiene_and_testing || 0 },
                { subject: 'Architecture', A: analysisExt?.forensic_skill_graph?.system_architecture || 0 },
                { subject: 'DevOps', A: analysisExt?.forensic_skill_graph?.devops_and_infra || 0 },
                { subject: 'Data', A: analysisExt?.forensic_skill_graph?.data_and_state || 0 },
                { subject: 'Git Habits', A: analysisExt?.forensic_skill_graph?.version_control_habits || 0 },
              ];

              // BIAS MASKING VARIABLES
              const displayName = isBlindMode ? `Finalist #${index + 1}` : app.candidateName;
              const displayEmail = isBlindMode ? "Hidden for Bias Protection" : app.candidateEmail;
              const displayGithub = isBlindMode ? "Hidden for Bias Protection" : `@${app.githubUsername}`;

              return (
                <div key={app.id} className="bg-white border-2 border-amber-400/30 rounded-[40px] overflow-hidden shadow-lg shadow-amber-500/5 hover:shadow-xl transition-all group relative">
                  
                  {/* Rank Badge */}
                  <div className="absolute top-0 left-0 bg-amber-400 text-amber-950 font-black px-4 py-1 rounded-br-2xl text-sm z-10 shadow-sm border-r border-b border-amber-500/20">
                    Rank #{index + 1}
                  </div>

                  <div className="flex flex-col lg:flex-row items-stretch">
                    
                    {/* Visual Skill Badge (Left Column) */}
                    <div className="lg:w-64 bg-amber-50/30 p-8 pt-12 flex flex-col items-center justify-center border-r border-slate-100">
                        <div className="w-40 h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                              <Radar name="Skills" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 text-center w-full flex flex-col items-center">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Live Match Score</p>
                           <p className="text-5xl font-black text-slate-900 mb-1">{liveScore}</p>
                           
                           {/* 🔥 DELTA BADGE 🔥 */}
                           {index > 0 && (
                             <div className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-black uppercase border border-red-100 mt-1">
                               -{pointDelta} Pts vs Leader
                             </div>
                           )}

                           <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id!)}
                               className="mt-4 text-orange-600 font-bold text-xs hover:bg-orange-100 w-full"
                           >
                               {expandedApp === app.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                               Deep Audit
                           </Button>
                        </div>
                    </div>

                    {/* Candidate Details (Middle Column) */}
                    <div className="flex-1 p-8 md:p-10">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h3 className="text-3xl font-black text-slate-900">{displayName}</h3>
                        
                        {analysisExt?.isHiddenGem && (
                          <div className="bg-amber-400 text-amber-900 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-lg shadow-amber-400/20">
                            <Star className="w-3 h-3 fill-current" /> Hidden Talent
                          </div>
                        )}
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 ${
                          analysisExt?.learningPotential?.score >= 60 ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <Zap className="w-3 h-3 mr-1 inline" /> LPI: {analysisExt?.learningVelocity} ({analysisExt?.learningPotential?.score || 0}/100)
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mb-4">
                        {!isBlindMode ? (
                          <>
                            <a href={`mailto:${displayEmail}`} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-600">
                              <Mail className="w-4 h-4" /> {displayEmail}
                            </a>
                            <a href={`https://github.com/${app.githubUsername}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
                              <Github className="w-4 h-4" /> {displayGithub}
                            </a>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 text-sm font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                              <EyeOff className="w-4 h-4" /> Email & Profile hidden during blind evaluation
                          </div>
                        )}
                      </div>

                      {/* 🔥 NEW: GRANULAR SCORE BREAKDOWN 🔥 */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100 shadow-sm">
                           <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Skills</span>
                           <span className="text-base font-black text-blue-500">{liveBreakdown.skills}</span>
                           <span className="text-[8px] text-slate-400 block">/ {liveWeights.skills}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100 shadow-sm">
                           <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">GitHub</span>
                           <span className="text-base font-black text-orange-500">{liveBreakdown.github}</span>
                           <span className="text-[8px] text-slate-400 block">/ {liveWeights.github}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100 shadow-sm">
                           <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Projects</span>
                           <span className="text-base font-black text-purple-500">{liveBreakdown.projects}</span>
                           <span className="text-[8px] text-slate-400 block">/ {liveWeights.projects}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100 shadow-sm">
                           <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">DSA</span>
                           <span className="text-base font-black text-emerald-500">{liveBreakdown.algorithmic}</span>
                           <span className="text-[8px] text-slate-400 block">/ {liveWeights.algorithmic}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100 shadow-sm">
                           <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Exp</span>
                           <span className="text-base font-black text-rose-500">{liveBreakdown.experience}</span>
                           <span className="text-[8px] text-slate-400 block">/ {liveWeights.experience}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100 shadow-sm">
                           <span className="block text-[9px] text-slate-500 uppercase font-bold mb-1">LPI</span>
                           <span className="text-base font-black text-yellow-500">{liveBreakdown.velocity}</span>
                           <span className="text-[8px] text-slate-400 block">/ {liveWeights.velocity}</span>
                         </div>
                      </div>

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

                      {/* 🔥 EXPLICIT SCORE REASONING 🔥 */}
                      <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100 mt-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                        <p className="text-sm text-slate-700 font-bold leading-relaxed">
                          "{analysisExt?.score_reasoning || analysisExt?.aiSummary}"
                        </p>
                      </div>
                    </div>

                    {/* Action Panel (Right Column) */}
                    <div className="lg:w-72 p-8 bg-slate-50 flex flex-col gap-3 justify-center border-l border-slate-100">
                       <Button disabled={isBlindMode} onClick={() => window.location.href = `mailto:${app.candidateEmail}`} className="w-full bg-[#050A15] hover:bg-black disabled:bg-slate-300 text-white h-14 rounded-2xl font-black shadow-xl">
                         <Calendar className="w-4 h-4 mr-2" /> Schedule Call
                       </Button>
                       <a href={isBlindMode ? "#" : app.resumeUrl} target={isBlindMode ? "_self" : "_blank"} className="w-full">
                         <Button disabled={isBlindMode} variant="outline" className="w-full h-14 rounded-2xl font-black border-slate-200 bg-white disabled:bg-slate-50">
                           <FileText className="w-4 h-4 mr-2" /> View Resume
                         </Button>
                       </a>
                       
                       {isBlindMode ? (
                         <p className="text-center text-[10px] font-black text-slate-400 uppercase mt-2">Unmask to contact candidate</p>
                       ) : (
                         <Link href={`https://github.com/${app.githubUsername}`} target="_blank" className="text-center text-[10px] font-black text-slate-400 uppercase hover:text-orange-500 transition-colors mt-2 flex items-center justify-center gap-1">
                           Review Source Code <ExternalLink className="w-3 h-3" />
                         </Link>
                       )}
                    </div>

                  </div>

                  {/* 4. The Glass-Box Verification Matrix (Expandable) */}
                  {expandedApp === app.id && (
                    <div className="border-t border-slate-200 p-8 bg-slate-50 animate-in fade-in slide-in-from-top-2">
                        
                        <div className="flex items-center gap-2 mb-6">
                            <ShieldCheck className="w-5 h-5 text-orange-500" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Deep Verification Report</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {analysisExt?.skill_verification_matrix?.map((item: any, i: number) => (
                                <div key={i} className={`flex flex-col gap-3 p-5 rounded-2xl border-2 bg-white ${
                                    item.status === 'Verified' ? 'border-green-100' : 
                                    item.status === 'Falsified' ? 'border-red-100' : 
                                    'border-slate-100'
                                }`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-black text-slate-900">{item.skill}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md ${
                                            item.status === 'Verified' ? 'bg-green-100 text-green-700' : 
                                            item.status === 'Falsified' ? 'bg-red-100 text-red-700' : 
                                            'bg-slate-200 text-slate-600'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Resume Claim</span>
                                            <span className="text-slate-700 font-medium">{item.resumeClaim || "None"}</span>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GitHub Evidence</span>
                                            <span className="text-slate-700 font-medium">{item.githubEvidence || "No code found"}</span>
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <p className="text-sm font-medium text-slate-800 italic flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                            "{item.explanation}"
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}