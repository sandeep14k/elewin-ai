"use client"

import Link from "next/link"
import { useAuth } from "@/context/authcontext"
import { Building2, Plus, LogOut, LayoutDashboard, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="w-full bg-[#050A15] border-b border-white/10 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20">E</div>
          <span className="text-xl font-bold text-white tracking-tight">EleWin <span className="text-orange-500">Recruit</span></span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          {!user ? (
            <>
              {/* Candidate/Guest View */}
              <Link href="/#open-roles" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Find Jobs</Link>
              <div className="h-4 w-[1px] bg-white/10" />
              <Link href="/auth/login">
                <Button variant="ghost" className="text-white hover:bg-white/5 font-bold">Employer Login</Button>
              </Link>
              <Link href="/employer/post-job">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md shadow-orange-500/20">
                  Post a Job
                </Button>
              </Link>
            </>
          ) : (
            <>
              {/* Logged-in Employer View */}
              <Link href="/employer/dashboard" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link href="/employer/post-job" className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                <Plus className="w-4 h-4" /> Post Job
              </Link>
              <Button 
                onClick={() => logout()} 
                variant="ghost" 
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}