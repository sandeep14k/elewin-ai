"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"
import { useAuth } from "@/context/authcontext"
import { 
  ArrowRight, BrainCircuit, ShieldCheck, 
  Code2, Zap, Search, Fingerprint, Trophy, Loader2, LayoutDashboard,
  Briefcase
} from "lucide-react"

export default function Home() {
  const { user, role, loading } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* --- DYNAMIC HERO SECTION --- */}
      <main className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          
          {loading ? (
             // LOADING STATE
             <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
               <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with Forensic Engine...</p>
             </div>
          ) : !user ? (
            // GUEST STATE (Not Logged In)
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full mb-8 text-xs font-black uppercase tracking-widest shadow-sm border border-orange-200">
                <Zap className="w-4 h-4" /> The Applicant Tracking System Killer
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
                Hire the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Truth.</span><br />
                Not the Resume.
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed mb-12">
                EleWin uses AI and deep GitHub GraphQL forensics to verify engineering skills instantly. Eliminate resume inflation, discover hidden gems, and automate your technical hiring pipeline.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <button className="w-full bg-[#050A15] hover:bg-black text-white px-8 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-slate-900/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    Deploy a Role <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <button className="w-full bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 px-8 py-5 rounded-2xl font-black text-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Fingerprint className="w-5 h-5 text-orange-500" /> Create EleWin Passport
                  </button>
                </Link>
              </div>
            </div>
          ) : role === "employer" ? (
            // EMPLOYER LOGGED IN STATE
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-8 text-xs font-black uppercase tracking-widest shadow-sm border border-blue-200">
                <Briefcase className="w-4 h-4" /> Employer Portal Active
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
                Welcome back to the<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Command Center.</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium mb-12">
                Your forensic pipelines are active. Review your AI-verified candidates, manage active roles, or deploy a new technical challenge.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/employer/dashboard">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95">
                    <LayoutDashboard className="w-5 h-5" /> Enter Dashboard
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            // CANDIDATE LOGGED IN STATE
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full mb-8 text-xs font-black uppercase tracking-widest shadow-sm border border-orange-200">
                <Code2 className="w-4 h-4" /> Engineer Profile
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
                Your Code Speaks.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">We Just Listen.</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium mb-12">
                Your EleWin Passport is your verified Proof of Work. Manage your parsed resume blocks, sync your GitHub, and apply to elite roles instantly.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/candidate/passport">
                  <button className="bg-[#050A15] hover:bg-black text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 flex items-center gap-2 transition-all active:scale-95">
                    <Fingerprint className="w-5 h-5 text-orange-500" /> View My Passport
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- DUAL FUNNEL VALUE PROPS (Hidden for logged-in users to save space) --- */}
      {!user && (
        <section className="bg-[#050A15] py-24 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-2 gap-16">
              {/* Employer Value Prop */}
              <div className="space-y-8">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
                  <Search className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">For Engineering Teams</h2>
                <p className="text-slate-400 leading-relaxed font-medium">
                  Stop guessing. Our engine cross-references candidate PDFs against live repository data. 
                  Get actionable Match Scores, Learning Velocity metrics, and Radar Charts before the first interview.
                </p>
                <ul className="space-y-4">
                  {['Autonomous Shortlisting', 'Tutorial-Clone Detection', 'Proprietary Skill Mapping'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                      <ShieldCheck className="w-5 h-5 text-green-400" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Candidate Value Prop */}
              <div className="space-y-8">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
                  <Code2 className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">For Elite Developers</h2>
                <p className="text-slate-400 leading-relaxed font-medium">
                  Your code speaks louder than buzzwords. Create an EleWin Passport to pre-verify your GitHub Proof of Work. 
                  Apply to top roles with one click and let your complex architecture do the talking.
                </p>
                <ul className="space-y-4">
                  {['One-Click Verified Apply', 'Hidden Gem Certification', 'Live Skill Graphing'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                      <Trophy className="w-5 h-5 text-amber-400" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- HOW IT WORKS (Shown to everyone) --- */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-16 tracking-tight">The Verification Architecture</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[40px] bg-slate-50 border border-slate-100 hover:shadow-xl hover:border-orange-200 transition-all group">
               <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <BrainCircuit className="w-8 h-8 text-slate-800" />
               </div>
               <h3 className="text-xl font-black mb-3">1. Smart Ingestion</h3>
               <p className="text-slate-500 text-sm leading-relaxed font-medium">
                 AI breaks down resumes into structured blocks. No more formatting errors or lost data.
               </p>
            </div>
            
            <div className="p-8 rounded-[40px] bg-slate-50 border border-slate-100 hover:shadow-xl hover:border-orange-200 transition-all group">
               <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Fingerprint className="w-8 h-8 text-orange-500" />
               </div>
               <h3 className="text-xl font-black mb-3">2. GraphQL Deep Scrape</h3>
               <p className="text-slate-500 text-sm leading-relaxed font-medium">
                 We fetch raw commit histories, language distributions, and repository metadata in milliseconds.
               </p>
            </div>

            <div className="p-8 rounded-[40px] bg-slate-50 border border-slate-100 hover:shadow-xl hover:border-orange-200 transition-all group">
               <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-8 h-8 text-green-500" />
               </div>
               <h3 className="text-xl font-black mb-3">3. Forensic Audit</h3>
               <p className="text-slate-500 text-sm leading-relaxed font-medium">
                 Our LLM cross-references the resume claims against actual code. Discrepancies are flagged instantly.
               </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}