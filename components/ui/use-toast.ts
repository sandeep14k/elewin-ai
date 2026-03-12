// components/ui/use-toast.ts
import { useState, useEffect } from "react"

export function useToast() {
  const [active, setActive] = useState(false)

  const toast = ({ title, description, variant }: any) => {
    console.log(`Toast: ${title} - ${description} [${variant || 'default'}]`)
    // You can implement a simple window.alert here temporarily if you want
  }

  return { toast }
}