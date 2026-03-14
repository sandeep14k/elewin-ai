"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/authcontext"
import { createJob } from "@/lib/jobs"
import { useRouter } from "next/navigation"
import { 
  Briefcase, Loader2, X, Sparkles, AlertCircle, 
  Info, Bot, Link as LinkIcon, Target, ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Navbar from "@/components/navbar"

export default function PostJobPage() {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [skillInput, setSkillInput] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    companyName: "",
    title: "",
    description: "",
    experienceLevel: "Mid" as "Junior" | "Mid" | "Senior" | "Lead",
    requiredSkills: [] as string[],
    // --- NEW: Automation State ---
    automation: {
      autoShortlistThreshold: 85,
      autoRejectThreshold: 40,
      interviewLink: ""
    }
  })

  // --- THE BOUNCER (ROUTE GUARD) ---
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
      } else if (role !== "employer") {
        router.push("/candidate/passport")
      }
    }
  }, [user, role, loading, router])

  if (loading || role !== "employer") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Securing Portal...</p>
      </div>
    )
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required"
    if (!formData.title.trim()) newErrors.title = "Job title is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (formData.requiredSkills.length === 0) newErrors.skills = "Add at least 3 core skills for the AI to verify"
    
    // Validate URL if provided
    if (formData.automation.interviewLink && !formData.automation.interviewLink.startsWith("http")) {
      newErrors.interviewLink = "Please enter a valid URL (starting with http:// or https://)"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const skill = skillInput.trim().replace(',', '')
      if (skill && !formData.requiredSkills.includes(skill)) {
        setFormData({
          ...formData,
          requiredSkills: [...formData.requiredSkills, skill]
        })
        setErrors({ ...errors, skills: "" })
      }
      setSkillInput("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter(s => s !== skillToRemove)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields correctly.", 
        variant: "destructive" 
      })
      return
    }

    setIsLoading(true)
    try {
      await createJob({
        companyId: user!.uid,
        companyName: formData.companyName,
        title: formData.title,
        description: formData.description,
        experienceLevel: formData.experienceLevel,
        requiredSkills: formData.requiredSkills,
        // Pass automation down to Firebase
        automation: formData.automation
      })

      toast({ title: "Live!", description: "Forensic pipeline and auto-triggers are now active." })
      router.push(`/employer/dashboard`) 
    } catch (error) {
      toast({ title: "Error", description: "Could not post job.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#050A15] text-white rounded-full mb-4 text-[10px] font-black uppercase tracking-widest">
            <Briefcase className="w-3 h-3 text-orange-500" /> Hiring Command
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Deploy a New Role</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Candidates will be audited against these requirements using GitHub GraphQL signals.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-200 space-y-8">
          
          {/* Company & Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
              <input 
                type="text" 
                placeholder="e.g. Acme Corp"
                value={formData.companyName}
                onChange={e => {
                    setFormData({...formData, companyName: e.target.value})
                    if (errors.companyName) setErrors({...errors, companyName: ""})
                }}
                className={`w-full p-4 bg-slate-50 border ${errors.companyName ? 'border-red-500' : 'border-slate-100'} rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
              />
              {errors.companyName && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.companyName}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
              <input 
                type="text" 
                placeholder="e.g. Fullstack Engineer"
                value={formData.title}
                onChange={e => {
                    setFormData({...formData, title: e.target.value})
                    if (errors.title) setErrors({...errors, title: ""})
                }}
                className={`w-full p-4 bg-slate-50 border ${errors.title ? 'border-red-500' : 'border-slate-100'} rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
              />
              {errors.title && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.title}</p>}
            </div>
          </div>

          {/* Exp Level */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Experience Expectations</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               {["Junior", "Mid", "Senior", "Lead"].map((level) => (
                 <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({...formData, experienceLevel: level as any})}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        formData.experienceLevel === level 
                        ? 'bg-[#050A15] text-white border-[#050A15] shadow-lg shadow-slate-900/20' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-orange-500 hover:text-orange-600'
                    }`}
                 >
                    {level}
                 </button>
               ))}
            </div>
          </div>

          {/* Skill Entry */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
              Verification Tech Stack
              <span className="text-slate-300 font-normal normal-case flex items-center gap-1">
                <Info className="w-3 h-3" /> Press Enter or Comma
              </span>
            </label>
            <div className={`p-4 bg-slate-50 border ${errors.skills ? 'border-red-500' : 'border-slate-100'} rounded-2xl focus-within:ring-2 focus-within:ring-orange-500 transition-all flex flex-wrap gap-2 items-center`}>
              {formData.requiredSkills.map(skill => (
                <span key={skill} className="bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in zoom-in-95">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="hover:text-black transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input 
                type="text" 
                placeholder={formData.requiredSkills.length === 0 ? "e.g. React, TypeScript, Node.js" : "Add more..."}
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                className="flex-1 min-w-[200px] outline-none bg-transparent py-1 text-sm font-medium"
              />
            </div>
            {errors.skills && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.skills}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Architecture (Description)</label>
            <textarea 
              rows={5}
              placeholder="Describe the technical challenges and what the candidate will be engineering..."
              value={formData.description}
              onChange={e => {
                setFormData({...formData, description: e.target.value})
                if (errors.description) setErrors({...errors, description: ""})
              }}
              className={`w-full p-4 bg-slate-50 border ${errors.description ? 'border-red-500' : 'border-slate-100'} rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-none font-medium text-sm`}
            />
             {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.description}</p>}
          </div>

          {/* --- NEW: ATS KILLER AUTOMATION SECTION --- */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <Bot className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-black text-slate-900">Forensic AI Auto-Triggers</h3>
              <span className="ml-auto bg-blue-50 text-blue-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">ATS Killer Feature</span>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Auto-Shortlist Slider */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 flex justify-between">
                    <span className="flex items-center gap-1"><Target className="w-4 h-4 text-green-500" /> Auto-Shortlist Match Score</span>
                    <span className="text-green-600 font-black">{formData.automation.autoShortlistThreshold}%+</span>
                  </label>
                  <input 
                    type="range" min="50" max="99" 
                    value={formData.automation.autoShortlistThreshold}
                    onChange={(e) => setFormData({
                      ...formData, 
                      automation: { ...formData.automation, autoShortlistThreshold: parseInt(e.target.value) }
                    })}
                    className="w-full accent-green-500"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Candidates scoring above this will bypass manual review.</p>
                </div>

                {/* Auto-Reject Slider */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 flex justify-between">
                    <span className="flex items-center gap-1"><ShieldAlert className="w-4 h-4 text-red-400" /> Auto-Reject Match Score</span>
                    <span className="text-red-500 font-black">Below {formData.automation.autoRejectThreshold}%</span>
                  </label>
                  <input 
                    type="range" min="10" max="60" 
                    value={formData.automation.autoRejectThreshold}
                    onChange={(e) => setFormData({
                      ...formData, 
                      automation: { ...formData.automation, autoRejectThreshold: parseInt(e.target.value) }
                    })}
                    className="w-full accent-red-400"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Instantly decline candidates who fail forensic baseline.</p>
                </div>
              </div>

              {/* Interview Link Drop */}
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" /> Auto-Interview Invite Link (Optional)
                </label>
                <input 
                  type="url" 
                  placeholder="https://calendly.com/your-name/30min"
                  value={formData.automation.interviewLink}
                  onChange={e => {
                    setFormData({
                      ...formData, 
                      automation: { ...formData.automation, interviewLink: e.target.value }
                    })
                    if (errors.interviewLink) setErrors({...errors, interviewLink: ""})
                  }}
                  className={`w-full p-4 bg-white border ${errors.interviewLink ? 'border-red-500' : 'border-slate-200'} rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium`}
                />
                <p className="text-[10px] text-slate-500 font-medium">If a candidate hits the Auto-Shortlist score, the AI will immediately email them this link to book a call.</p>
                {errors.interviewLink && <p className="text-red-500 text-[10px] font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.interviewLink}</p>}
              </div>

            </div>
          </div>

          <div className="pt-6">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#050A15] hover:bg-black text-white h-16 rounded-2xl text-lg font-black shadow-xl shadow-slate-900/20 w-full transition-all active:scale-95"
            >
              {isLoading ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Verifying System...</> : "Deploy Job Posting & Rules"}
            </Button>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6 flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3 text-orange-500" /> AI Forensic Pipeline will be enabled automatically
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}