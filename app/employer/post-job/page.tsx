"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/authcontext"
import { createJob } from "@/lib/jobs"
import { useRouter } from "next/navigation"
import { Briefcase, Loader2, Plus, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import Navbar from "@/components/navbar" // Assuming you have your shared navbar

export default function PostJobPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [skillInput, setSkillInput] = useState("")
  
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

  // Handle adding skills as tags
  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      if (!formData.requiredSkills.includes(skillInput.trim())) {
        setFormData({
          ...formData,
          requiredSkills: [...formData.requiredSkills, skillInput.trim()]
        })
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
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to post a job.", variant: "destructive" })
      return
    }
    if (formData.requiredSkills.length === 0) {
      toast({ title: "Error", description: "Please add at least one required skill.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const jobId = await createJob({
        companyId: user.uid,
        companyName: formData.companyName,
        title: formData.title,
        description: formData.description,
        experienceLevel: formData.experienceLevel,
        requiredSkills: formData.requiredSkills
      })

      toast({ title: "Success!", description: "Your job has been posted." })
      // Redirect to the employer dashboard or job view (we will build this later)
      router.push(`/employer/dashboard`) 
    } catch (error) {
      toast({ title: "Error", description: "Could not post job.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full mb-4 text-xs font-bold uppercase tracking-wider">
            <Briefcase className="w-4 h-4" /> Employer Portal
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Post a New Role</h1>
          <p className="text-slate-500 mt-2">
            Define your requirements. Our AI will automatically filter out fake resumes and verify candidates' GitHub profiles against these exact skills.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Company Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Acme Corp"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Job Title</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Senior React Developer"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Experience Level</label>
            <select 
              value={formData.experienceLevel}
              onChange={e => setFormData({...formData, experienceLevel: e.target.value as any})}
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all bg-white"
            >
              <option value="Junior">Junior (0-2 years)</option>
              <option value="Mid">Mid-Level (3-5 years)</option>
              <option value="Senior">Senior (5+ years)</option>
              <option value="Lead">Lead / Staff</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
              Target Skills to Verify
              <span className="text-xs text-orange-600 font-normal flex items-center bg-orange-50 px-2 py-1 rounded">
                <Sparkles className="w-3 h-3 mr-1" /> AI will scan GitHub for these
              </span>
            </label>
            <div className="p-3 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-orange-500 transition-all bg-white flex flex-wrap gap-2 items-center">
              {formData.requiredSkills.map(skill => (
                <span key={skill} className="bg-slate-800 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input 
                type="text" 
                placeholder={formData.requiredSkills.length === 0 ? "Type a skill and press Enter (e.g. Next.js)" : "Add another..."}
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                className="flex-1 min-w-[150px] outline-none bg-transparent py-1 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Job Description</label>
            <textarea 
              required
              rows={6}
              placeholder="Describe the role, responsibilities, and what the candidate will be building..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all resize-y"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 rounded-xl text-base font-bold shadow-lg shadow-orange-500/20 w-full md:w-auto"
            >
              {isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Publishing...</> : "Publish Job Posting"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}