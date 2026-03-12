import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthContextProvider } from "@/context/authcontext" // <-- Import this
import { Toaster } from "@/components/ui/toaster" // Assuming you use shadcn toaster

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EleWin Recruit - Hire Authenticated Talent",
  description: "Stop guessing. Hire developers based on mathematically verified Proof of Work and GitHub analysis.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 antialiased`}>
        {/* Wrap the children inside the Auth Provider */}
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
        
        {/* Add Toaster for UI notifications */}
        <Toaster />
      </body>
    </html>
  )
}