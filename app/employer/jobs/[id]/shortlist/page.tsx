"use client"

import { useState, useEffect, use } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { Application, Job } from "@/types/platform"
import { 
  UserCheck, ArrowLeft, Mail, Github, 
  Trophy, School, Briefcase, Star, Zap, 
  ExternalLink, Download, Calendar, MessageSquare,
  FileText, EyeOff, Eye, Target
} from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts'

export default function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  
  const [job, setJob] = useState<Job | null>(null)
  const [shortlisted, setShortlisted] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  
  // --- Bias-Masking State ---
  const [isBlindMode, setIsBlindMode] = useState(true)

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
        setShortlisted(list.sort((a, b) => {
          const scoreA = (a.analysis as any)?.overallMatchScore || 0;
          const scoreB = (b.analysis as any)?.overallMatchScore || 0;
          return scoreB - scoreA;
        }))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchShortlist()
  }, [id])

  // --- CSV EXPORT FUNCTIONALITY ---
  const handleExportCSV = () => {
    if (shortlisted.length === 0) return;

    // Define CSV Headers
    const headers = [
      "Rank", "Match Score", "Candidate Name", "Email", "GitHub Username", 
      "LPI Score", "Hidden Gem", "Verified Coding Platforms", "AI Summary"
    ];

    // Map data to CSV rows
    const rows = shortlisted.map((app, index) => {
      const analysisExt = app.analysis as any;
      const codingProfiles = (app as any).passportBlocks?.codingProfiles || {};
      const verifiedPlatforms = Object.keys(codingProfiles).join(" | ") || "None";
      
      return [
        index + 1,
        analysisExt?.overallMatchScore || 0,
        `"${app.candidateName}"`, // Escape quotes for names with commas
        app.candidateEmail,
        app.githubUsername,
        analysisExt?.learningPotential?.score || 0,
        analysisExt?.isHiddenGem ? "Yes" : "No",
        `"${verifiedPlatforms}"`,
        `"${(analysisExt?.aiSummary || "").replace(/"/g, '""')}"` // Safely escape internal quotes
      ].join(",");
    });

    // Create and download Blob
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
        <div className="bg-[#050A15] p-8 md:p-10 rounded-[40px] shadow-2xl mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-white/5 relative overflow-hidden">
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

        {/* --- SHORTLIST GRID --- */}
        <div className="grid gap-8">
          {shortlisted.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-slate-200 text-slate-400">
               <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
               <p className="font-bold uppercase tracking-widest text-sm">No finalists locked in yet.</p>
             </div>
          ) : (
            shortlisted.map((app, index) => {
              const analysisExt = app.analysis as any;
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
                        <div className="mt-4 text-center">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Match Score</p>
                           <p className="text-4xl font-black text-slate-900">{analysisExt?.overallMatchScore}%</p>
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

                      <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 mt-4">
                        <p className="text-sm text-slate-600 leading-relaxed italic">
                          <MessageSquare className="w-4 h-4 text-slate-300 inline mr-2 mb-1" />
                          "{analysisExt?.aiSummary}"
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
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}