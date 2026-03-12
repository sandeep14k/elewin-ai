"use client"

import { useState, useEffect, use } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { Application, Job } from "@/types/platform"
import { 
  UserCheck, ArrowLeft, Mail, Github, 
  Trophy, School, Briefcase 
} from "lucide-react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"

export default function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
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
        
        setShortlisted(list.sort((a, b) => (b.analysis?.overallMatchScore || 0) - (a.analysis?.overallMatchScore || 0)))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchShortlist()
  }, [id])

  if (loading) return <div className="p-20 text-center text-slate-500">Loading Shortlist...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        <Link href={`/employer/jobs/${id}`} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to All Applicants
        </Link>

        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Final Shortlist</h1>
            <p className="text-slate-500">{job?.title} • {shortlisted.length} Verified Candidates</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">Export Shortlist (CSV)</Button>
        </div>

        <div className="grid gap-6">
          {shortlisted.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
               No candidates have been shortlisted yet.
             </div>
          ) : (
            shortlisted.map((app) => (
              <div key={app.id} className="bg-white border-2 border-green-100 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  
                  {/* Profile Brief */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{app.candidateName}</h3>
                        <div className="flex gap-4 mt-1">
                          <a href={`mailto:${app.candidateEmail}`} className="text-xs text-slate-500 flex items-center gap-1 hover:text-blue-600">
                            <Mail className="w-3 h-3" /> {app.candidateEmail}
                          </a>
                          <a href={`https://github.com/${app.githubUsername}`} className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-900">
                            <Github className="w-3 h-3" /> {app.githubUsername}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Weighted Insight Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <Trophy className="w-3 h-3 text-orange-500" /> PoW Score
                        </div>
                        <p className="text-lg font-bold text-slate-800">{app.analysis?.weightedBreakdown?.proofOfWork || 0}%</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <Briefcase className="w-3 h-3 text-blue-500" /> Experience
                        </div>
                        <p className="text-lg font-bold text-slate-800">{app.analysis?.weightedBreakdown?.experience || 0}%</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <School className="w-3 h-3 text-purple-500" /> Academics
                        </div>
                        <p className="text-lg font-bold text-slate-800">{app.analysis?.weightedBreakdown?.academics || 0}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="md:w-48 flex flex-col gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-[10px] font-bold text-green-700 uppercase">Match Score</p>
                      <p className="text-2xl font-black text-green-800">{app.analysis?.overallMatchScore}</p>
                    </div>
                    <Button variant="outline" className="w-full text-slate-700">Schedule Interview</Button>
                  </div>

                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-600 italic">
                    <span className="font-bold text-slate-800 not-italic">Verification Note:</span> {app.analysis?.aiSummary}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}