"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/authcontext"
import { 
  Menu, X, Zap, Fingerprint, Briefcase, 
  LayoutDashboard, LogOut, Plus, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, role, loading, logout } = useAuth()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* --- 1. BRAND LOGO (Always visible) --- */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-[#050A15] p-2 rounded-xl group-hover:scale-105 transition-transform shadow-md">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <span className="font-black text-2xl tracking-tight text-slate-900">
                Ele<span className="text-orange-500">Win</span>
              </span>
            </Link>
          </div>

          {/* --- 2. DESKTOP NAVIGATION (Role-Aware) --- */}
          <div className="hidden md:flex items-center justify-center space-x-8">
            {!loading && !user && (
              // GUEST LINKS
              <>
                <Link href="/candidate/passport" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-600 transition-colors">
                  <Fingerprint className="w-4 h-4" /> For Engineers
                </Link>
                <Link href="/employer/dashboard" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
                  <Briefcase className="w-4 h-4" /> For Companies
                </Link>
              </>
            )}

            {!loading && role === "employer" && (
              // EMPLOYER LINKS
              <>
                <Link href="/employer/dashboard" className={`flex items-center gap-2 text-sm font-bold transition-colors ${isActive('/employer/dashboard') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  <LayoutDashboard className="w-4 h-4" /> Command Center
                </Link>
                <Link href="/employer/post-job" className={`flex items-center gap-2 text-sm font-bold transition-colors ${isActive('/employer/post-job') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  <Plus className="w-4 h-4" /> Deploy Role
                </Link>
              </>
            )}

            {!loading && role === "candidate" && (
              // CANDIDATE LINKS
              <>
                <Link href="/candidate/passport" className={`flex items-center gap-2 text-sm font-bold transition-colors ${isActive('/candidate/passport') ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  <Fingerprint className="w-4 h-4" /> My Passport
                </Link>
                <Link href="/" className={`flex items-center gap-2 text-sm font-bold transition-colors ${isActive('/') ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  <Search className="w-4 h-4" /> Job Board
                </Link>
              </>
            )}
          </div>

          {/* --- 3. AUTH & CTA BUTTONS (Role-Aware) --- */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="w-24 h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : !user ? (
              // GUEST ACTIONS
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" className="font-bold text-slate-600 hover:text-slate-900">Sign In</Button>
                </Link>
                <Link href="/employer/post-job">
                  <Button className="bg-[#050A15] hover:bg-black text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 px-6 transition-all active:scale-95">
                    Post a Role
                  </Button>
                </Link>
              </>
            ) : (
              // LOGGED IN ACTIONS (Both Roles)
              <div className="flex items-center gap-2">
                 <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">
                    {role}
                 </div>
                 <Button onClick={logout} variant="ghost" className="text-slate-400 hover:text-red-600 hover:bg-red-50" size="icon">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>

          {/* --- 4. MOBILE MENU BUTTON --- */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 hover:text-slate-900 focus:outline-none p-2">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* --- MOBILE MENU DROPDOWN (Role-Aware) --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-2xl animate-in slide-in-from-top-2">
          <div className="px-4 pt-4 pb-6 space-y-4">
            
            {/* GUEST MOBILE LINKS */}
            {!user && (
              <>
                <Link href="/candidate/passport" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50/50 text-orange-900 font-bold border border-orange-100">
                  <Fingerprint className="w-5 h-5 text-orange-500" /> Developer Passport
                </Link>
                <Link href="/employer/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/50 text-blue-900 font-bold border border-blue-100">
                  <Briefcase className="w-5 h-5 text-blue-500" /> Company Command Center
                </Link>
              </>
            )}

            {/* EMPLOYER MOBILE LINKS */}
            {role === "employer" && (
              <>
                <Link href="/employer/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/50 text-blue-900 font-bold border border-blue-100">
                  <LayoutDashboard className="w-5 h-5 text-blue-500" /> Command Center
                </Link>
                <Link href="/employer/post-job" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-slate-900 font-bold border border-slate-100">
                  <Plus className="w-5 h-5 text-slate-500" /> Deploy New Role
                </Link>
              </>
            )}

            {/* CANDIDATE MOBILE LINKS */}
            {role === "candidate" && (
              <>
                <Link href="/candidate/passport" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50/50 text-orange-900 font-bold border border-orange-100">
                  <Fingerprint className="w-5 h-5 text-orange-500" /> My Passport
                </Link>
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 text-slate-900 font-bold border border-slate-100">
                  <Search className="w-5 h-5 text-slate-500" /> Browse Jobs
                </Link>
              </>
            )}

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              {!user ? (
                <>
                  <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center font-bold h-12 rounded-xl">Sign In</Button>
                  </Link>
                  <Link href="/employer/post-job" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full justify-center bg-[#050A15] text-white font-bold h-12 rounded-xl">Post a Role</Button>
                  </Link>
                </>
              ) : (
                <Button onClick={() => { logout?.(); setIsMobileMenuOpen(false); }} variant="ghost" className="w-full justify-center text-red-600 hover:bg-red-50 h-12 rounded-xl">
                  <LogOut className="w-5 h-5 mr-2" /> Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}