"use client"

import { useState, useEffect, use } from "react"
import { getJobWithApplications, updateApplicationStatus } from "@/lib/employer"
import { Job, Application } from "@/types/platform"
import { 
  ShieldCheck, AlertTriangle, Github, FileText, 
  Linkedin, Loader2, UserCheck, Activity, Search,
  CheckCircle2, XCircle, Award, School, Briefcase
} from "lucide-react"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function EmployerJobDashboard({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
  const { id } = use(params)
  
  const [job, setJob] = useState<Job | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      const data = await getJobWithApplications(id)
      setJob(data.job)
      setApplications(data.applications)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleStatusUpdate = async (appId: string, status: string) => {
    const success = await updateApplicationStatus(appId, status)
    if (success) {
      setApplications(prev => prev.map(app => 
        app.id === appId ? { ...app, status: status as any } : app
      ))
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{job?.title}</h1>
            <p className="text-slate-500 mt-1">Hiring Leaderboard • {applications.length} Applicants</p>
          </div>
          <Link href={`/employer/jobs/${id}/shortlist`}>
            <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> View Verified Shortlist
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
              No candidates have applied yet.
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className={`bg-white border-2 rounded-2xl p-6 shadow-sm transition-all ${app.status === 'shortlisted' ? 'border-green-200' : 'border-slate-100'}`}>
                <div className="flex flex-col lg:flex-row gap-8">
                  
                  {/* Profile & Score Column */}
                  <div className="w-full lg:w-1/3">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{app.candidateName}</h3>
                    <div className="flex gap-3 mb-6">
                       <a href={`https://github.com/${app.githubUsername}`} target="_blank" className="text-slate-400 hover:text-slate-900"><Github className="w-5 h-5" /></a>
                       <a href={app.resumeUrl} target="_blank" className="text-slate-400 hover:text-orange-500"><FileText className="w-5 h-5" /></a>
                    </div>

                    {/* Weighted Score Visualization */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weighted Analysis</p>
                      <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 p-2 rounded-lg text-center">
                              <Award className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                              <p className="text-xs font-bold text-slate-700">{app.analysis?.weightedBreakdown?.proofOfWork || 0}%</p>
                              <p className="text-[8px] text-slate-400">PoW</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg text-center">
                              <Briefcase className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                              <p className="text-xs font-bold text-slate-700">{app.analysis?.weightedBreakdown?.experience || 0}%</p>
                              <p className="text-[8px] text-slate-400">EXP</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg text-center">
                              <School className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                              <p className="text-xs font-bold text-slate-700">{app.analysis?.weightedBreakdown?.academics || 0}%</p>
                              <p className="text-[8px] text-slate-400">ACAD</p>
                          </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Verdict Column */}
                  <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Audit Verdict</span>
                          {app.analysis?.authenticityScore && app.analysis.authenticityScore < 40 && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                  <AlertTriangle className="w-3 h-3" /> Potentially Fake PoW
                              </span>
                          )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed italic mb-4">
                          "{app.analysis?.aiSummary || "Analysis pending..."}"
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                          {app.analysis?.verifiedSkills?.map(skill => (
                              <span key={skill} className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">✓ {skill}</span>
                          ))}
                      </div>
                  </div>

                  {/* Action Column */}
                  <div className="w-full lg:w-48 flex flex-col justify-center gap-2">
                      <div className="text-center mb-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Match Score</p>
                          <p className={`text-3xl font-black ${app.status === 'rejected' ? 'text-slate-300' : 'text-slate-800'}`}>
                              {app.analysis?.overallMatchScore || 0}
                          </p>
                      </div>

                      {app.status === 'shortlisted' ? (
                          <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-sm bg-green-50 py-2 rounded-xl">
                              <CheckCircle2 className="w-4 h-4" /> Shortlisted
                          </div>
                      ) : (
                          <Button 
                              onClick={() => handleStatusUpdate(app.id!, "shortlisted")}
                              className="bg-slate-900 hover:bg-black text-white rounded-xl"
                          >
                              Shortlist
                          </Button>
                      )}

                      {app.status === 'rejected' ? (
                          <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-sm bg-red-50 py-2 rounded-xl">
                              <XCircle className="w-4 h-4" /> Rejected
                          </div>
                      ) : (
                          <Button 
                              variant="ghost" 
                              onClick={() => handleStatusUpdate(app.id!, "rejected")}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          >
                              Reject
                          </Button>
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