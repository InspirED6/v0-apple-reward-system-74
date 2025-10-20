"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page
    router.push("/login")
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center gap-2 mb-4">
          <span className="text-5xl animate-bounce" style={{ animationDelay: "0s" }}>
            🍎
          </span>
          <span className="text-5xl animate-bounce" style={{ animationDelay: "0.2s" }}>
            🍎
          </span>
          <span className="text-5xl animate-bounce" style={{ animationDelay: "0.4s" }}>
            🍎
          </span>
        </div>
        <p className="text-slate-300">Loading...</p>
      </div>
    </main>
  )
}
