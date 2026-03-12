"use client"

import { useState, useEffect } from "react"
import { 
  Search, Code2, Github, Globe, MapPin, 
  CheckCircle2, Filter, Loader2, Sparkles, X
} from "lucide-react"
import { getCandidates, CandidateFilters } from "@/lib/candidates"
import { CandidateProfile } from "@/types/candidate"

export default function RecruiterDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [candidates, setCandidates] = useState<CandidateProfile[]>([])
  const [activeFilters, setActiveFilters] = useState<CandidateFilters | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load all actively looking candidates on initial render
  useEffect(() => {
    loadCandidates({})
  }, [])

  const loadCandidates = async (filters: CandidateFilters) => {
    try {
      // In a completely fresh project, your Firestore might be empty.
      // This calls the real DB function we wrote in lib/candidates.ts
      const results = await getCandidates(filters)
      setCandidates(results)
    } catch (err: any) {
        console.error(err)
        setError("Could not load candidates. Ensure your Firebase database has user_profiles.")
    }
  }

  const handleAISearch = async () => {
    if (!searchQuery.trim()) {
        setActiveFilters(null)
        loadCandidates({}) // Reset to all
        return
    }

    setIsSearching(true)
    setError(null)

    try {
      // 1. Send natural language to our AI API
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: searchQuery })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // 2. The AI returns perfectly structured database filters
      const filters: CandidateFilters = data.filters
      setActiveFilters(filters)

      // 3. Query the database with these exact filters
      await loadCandidates(filters)

    } catch (err: any) {
      setError(err.message || "Search failed. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearch = () => {
      setSearchQuery("")
      setActiveFilters(null)
      loadCandidates({})
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      <header className="bg-[#050A15] text-white py-4 px-6 md:px-10 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center font-bold text-white">E</div>
          <span className="text-xl font-bold tracking-tight">EleWin <span className="text-orange-500">Recruit</span></span>
        </div>
        <div className="flex gap-4">
            <button className="text-sm text-slate-300 hover:text-white transition-colors">Talent Pool</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Discover Hidden Talent</h1>
                <p className="text-slate-500 text-sm mt-1">Sourcing candidates based on verified Proof of Work, not just resumes.</p>
            </div>
            <button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-all flex items-center gap-2">
                <Filter className="w-4 h-4" /> Manual Filters
            </button>
        </div>

        {/* AI Search Bar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center mb-4 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-3" />
            <input 
                type="text"
                placeholder="e.g., 'Find me a fast-learning React dev with clean code'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                className="w-full px-4 py-3 outline-none text-slate-700 bg-transparent placeholder:text-slate-400"
            />
            {searchQuery && (
                <button onClick={clearSearch} className="p-2 text-slate-400 hover:text-slate-600 mr-2">
                    <X className="w-4 h-4" />
                </button>
            )}
            <button 
                onClick={handleAISearch}
                disabled={isSearching}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
                {isSearching ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> AI Match</>}
            </button>
        </div>

        {/* AI Interpretation (Transparency Layer) */}
       {activeFilters && (
            <div className="mb-8 flex flex-wrap items-center gap-2 animate-in fade-in">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">AI Filtered By:</span>
                
                {activeFilters.role && <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">Role: {activeFilters.role}</span>}
                
                {/* Fixed the > symbol to &gt; */}
                {activeFilters.minVelocity && <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-medium">Fast Learner (Velocity &gt; {activeFilters.minVelocity})</span>}
                
                {/* Fixed the > symbol to &gt; */}
                {activeFilters.minCodeQuality && <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">Clean Code (Quality &gt; {activeFilters.minCodeQuality})</span>}
                
                {activeFilters.requiredSkills?.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-medium">Skill: {skill}</span>
                ))}
            </div>
        )}

        {error && <div className="p-4 mb-8 bg-red-50 text-red-600 rounded-lg border border-red-200 text-sm">{error}</div>}

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {candidates.length === 0 && !isSearching && !error ? (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                    No candidates match this exact criteria. Try broadening your search or ensure your database is populated.
                </div>
            ) : (
                candidates.map((candidate) => (
                    <div key={candidate.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    {candidate.personalInfo?.fullName || "Anonymous Candidate"}
                                    <CheckCircle2 className="w-4 h-4 text-blue-500" title="Verified Proof of Work" />
                                </h3>
                                <p className="text-sm text-slate-600 font-medium">{candidate.personalInfo?.currentRole}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" /> {candidate.personalInfo?.location || "Remote"}
                                </p>
                            </div>

                            <div className="flex gap-3 text-center">
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-purple-400 flex items-center justify-center text-sm font-bold text-slate-800">
                                        {candidate.aiTalentGraph?.codeQualityScore || 0}
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 tracking-wider">Quality</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full border-4 border-orange-400 flex items-center justify-center text-sm font-bold text-slate-800">
                                        {candidate.aiTalentGraph?.learningVelocity || 0}
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 tracking-wider">Velocity</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Verified Technical Graph</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {candidate.skillGraph?.map(evidence => (
                                    <span key={evidence.skillName} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                                        {evidence.skillName}
                                    </span>
                                ))}
                            </div>
                            
                            <div className="flex gap-3">
                                {candidate.metrics?.github && <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded"><Github className="w-3.5 h-3.5" /> GitHub</div>}
                                {candidate.metrics?.leetcode && <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded"><Code2 className="w-3.5 h-3.5" /> LeetCode</div>}
                                {candidate.metrics?.portfolio && <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded"><Globe className="w-3.5 h-3.5" /> Portfolio</div>}
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-slate-700 italic leading-relaxed">
                                    <span className="font-bold text-orange-600 not-italic mr-1">AI Insight:</span>
                                    &quot;{candidate.aiTalentGraph?.aiSummary || "Strong technical foundation with verified project experience."}&quot;
                                </p>
                            </div>
                            <button className="bg-white border border-slate-300 hover:border-slate-800 hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap shadow-sm w-full sm:w-auto">
                                View Profile
                            </button>
                        </div>

                    </div>
                ))
            )}
        </div>

      </main>
    </div>
  )
}