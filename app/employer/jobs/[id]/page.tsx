"use client"

import { useState, useEffect } from "react"
import { getJobWithApplications } from "@/lib/employer"
import { Job, Application } from "@/types/platform"
import { 
  ShieldCheck, AlertTriangle, Github, FileText, 
  Linkedin, Loader2, UserCheck, Activity, Search
} from "lucide-react"
import Navbar from "@/components/navbar"

export default function EmployerJobDashboard({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await getJobWithApplications(params.id)
        setJob(data.job)
        setApplications(data.applications)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [params.id])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
  }

  if (!job) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-xl">Job Not Found</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{job.title}</h1>
            <p className="text-slate-500 mt-1">
              Posted by {job.companyName} • {applications.length} Applicants
            </p>
            <div className="flex gap-2 mt-4">
              <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                {job.experienceLevel}
              </span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 flex items-center gap-1">
                <Search className="w-3 h-3" /> Tracking {job.requiredSkills.length} Skills
              </span>
            </div>
          </div>
          <button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md whitespace-nowrap">
            Edit Job
          </button>
        </div>

        {/* Applicants Leaderboard */}
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-slate-400" /> Candidate Leaderboard
        </h2>

        <div className="space-y-6">
          {applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
              No candidates have applied yet.
            </div>
          ) : (
            applications.map((app, index) => (
              <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                
                {/* Status Badge */}
                <div className="absolute top-0 right-0">
                  {app.status === "pending_analysis" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-4 py-1.5 rounded-bl-lg flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Analyzing Code...
                    </span>
                  ) : app.analysis?.authenticityScore && app.analysis.authenticityScore > 85 ? (
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-4 py-1.5 rounded-bl-lg flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Highly Authentic
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                  
                  {/* Left Column: Info & Links */}
                  <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{app.candidateName}</h3>
                        <a href={`mailto:${app.candidateEmail}`} className="text-sm text-blue-600 hover:underline">{app.candidateEmail}</a>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <a href={`https://github.com/${app.githubUsername}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded border border-slate-200 transition-colors">
                        <Github className="w-4 h-4" /> GitHub
                      </a>
                      {app.resumeUrl && (
                        <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded border border-orange-200 transition-colors">
                          <FileText className="w-4 h-4" /> Resume
                        </a>
                      )}
                      {app.linkedinUrl && (
                        <a href={app.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded border border-blue-200 transition-colors">
                          <Linkedin className="w-4 h-4" /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right Column: AI Analysis */}
                  <div className="w-full lg:w-2/3 flex flex-col justify-center">
                    {app.status === "pending_analysis" ? (
                      <div className="text-center py-6 text-slate-500 flex flex-col items-center">
                        <Activity className="w-8 h-8 text-slate-300 animate-pulse mb-2" />
                        <p className="text-sm">EleWin AI is currently scanning repositories and commit history...</p>
                      </div>
                    ) : app.analysis ? (
                      <div>
                        {/* Scores */}
                        <div className="flex gap-6 mb-4">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Authenticity Score</p>
                            <div className="text-3xl font-black text-slate-800 flex items-baseline gap-1">
                              {app.analysis.authenticityScore} <span className="text-sm font-medium text-slate-500">/ 100</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Job Fit Match</p>
                            <div className="text-3xl font-black text-slate-800 flex items-baseline gap-1">
                              {app.analysis.overallMatchScore} <span className="text-sm font-medium text-slate-500">/ 100</span>
                            </div>
                          </div>
                        </div>

                        {/* Verified Skills */}
                        <div className="mb-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Verified Skills (Found in Code)</p>
                          <div className="flex flex-wrap gap-2">
                            {app.analysis.verifiedSkills?.length > 0 ? app.analysis.verifiedSkills.map(skill => (
                              <span key={skill} className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">
                                ✓ {skill}
                              </span>
                            )) : <span className="text-sm text-slate-500 italic">No required skills verified in public repositories.</span>}
                          </div>
                        </div>

                        {/* Plagiarism Flags */}
                        {app.analysis.plagiarismFlags && app.analysis.plagiarismFlags.length > 0 && (
                          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" /> AI Red Flags
                            </p>
                            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                              {app.analysis.plagiarismFlags.map((flag, i) => (
                                <li key={i}>{flag}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* AI Summary */}
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                          <p className="text-sm text-slate-700 italic leading-relaxed">
                            <span className="font-bold text-orange-600 not-italic mr-1">AI Verdict:</span>
                            "{app.analysis.aiSummary}"
                          </p>
                        </div>

                      </div>
                    ) : (
                      <div className="text-sm text-red-500">Analysis failed to generate.</div>
                    )}
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}