"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter email and password",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: `Welcome, ${data.name}!`,
      })

      sessionStorage.setItem("userId", data.id)
      sessionStorage.setItem("userName", data.name)
      sessionStorage.setItem("userRole", data.role)

      // Redirect to dashboard
      router.push(`/dashboard/${data.name}?role=${data.role}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
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
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
            Apple Reward System
          </h1>
          <p className="text-slate-300">Sign in to your account</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-slate-100">Login</CardTitle>
            <CardDescription className="text-slate-400">Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Email</label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-3">Demo Accounts:</p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="bg-slate-700/50 p-2 rounded">
                  <p className="font-semibold text-green-400">Admin Account</p>
                  <p>Email: admin@school.com</p>
                  <p>Password: admin123</p>
                </div>
                <div className="bg-slate-700/50 p-2 rounded">
                  <p className="font-semibold text-blue-400">Assistant Account</p>
                  <p>Email: assistant@school.com</p>
                  <p>Password: assist123</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
