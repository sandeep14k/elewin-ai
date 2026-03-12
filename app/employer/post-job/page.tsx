"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/authcontext"
import { createJob } from "@/lib/jobs"
import { useRouter } from "next/navigation"
import { Briefcase, Loader2, X, Sparkles, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Navbar from "@/components/navbar"

export default function PostJobPage() {
  const { user, loading } = useAuth()
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
    requiredSkills: [] as string[]
  })

  useEffect(() => {
    if (!loading && !user) {
      toast({ title: "Login Required", description: "Please sign in to post a job." })
      router.push("/auth/login")
    }
  }, [user, loading])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required"
    if (!formData.title.trim()) newErrors.title = "Job title is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (formData.requiredSkills.length === 0) newErrors.skills = "Add at least 3 core skills for the AI to verify"
    
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
        description: "Please fill in all required fields.", 
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
        requiredSkills: formData.requiredSkills
      })

      toast({ title: "Live!", description: "Forensic pipeline is now active for this role." })
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
                        : 'bg-white text-slate-500 border-slate-200 hover:border-orange-500'
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
                <Info className="w-3 h-3" /> Press Enter or Comma to add
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

          <div className="pt-6">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white h-16 rounded-2xl text-lg font-black shadow-xl shadow-orange-500/20 w-full transition-all active:scale-95"
            >
              {isLoading ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Verifying System...</> : "Deploy Job Posting"}
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