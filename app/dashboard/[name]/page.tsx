"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

interface AssistantData {
  id: string
  name: string
  barcode: string
  apples: number
  role: string
  sessions: number
  currentSessionValue: number
  milestonesReached: number
  bonusCount: number
  loyaltyHistory: Array<{ bonus_type: string; bonus_apples: number }>
}

interface StudentData {
  id: string
  name: string
  barcode: string
  apples: number
}

interface DashboardData {
  name: string
  barcode: string
  apples: number
  sessions: number
  currentSessionValue: number
  milestonesReached: number
  loyaltyHistory: Array<{ bonus_type: string; bonus_apples: number; created_at: string }>
}

export default function Dashboard({ params }: { params: { name: string } }) {
  const [data, setData] = useState<DashboardData | AssistantData[] | StudentData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [viewType, setViewType] = useState<"assistants" | "students">("assistants")
  const [totalApples, setTotalApples] = useState(0)
  const [paying, setPaying] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const userRole = sessionStorage.getItem("userRole") || "assistant"
  const decodedName = decodeURIComponent(params.name)

  useEffect(() => {
    const userId = sessionStorage.getItem("userId")
    if (!userId) {
      router.push("/login")
      return
    }

    fetchData()
  }, [decodedName, userRole, viewType, router])

  const fetchData = async () => {
    try {
      const response = await fetch(
        `/api/dashboard/${encodeURIComponent(decodedName)}?role=${userRole}&viewType=${viewType}`,
      )
      const result = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.message || "Failed to load data",
          variant: "destructive",
        })
        return
      }

      if (result.isAdmin) {
        setIsAdmin(true)
        setTotalApples(result.totalApples || 0)
        if (result.viewType === "students") {
          setData(result.students)
        } else {
          setData(result.assistants)
        }
      } else {
        setIsAdmin(false)
        setData(result)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePayRewards = async () => {
    if (!window.confirm("Are you sure you want to reset all assistant scores to zero? This action cannot be undone.")) {
      return
    }

    setPaying(true)
    try {
      const userId = sessionStorage.getItem("userId")
      const response = await fetch("/api/assistants/pay-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.message || "Failed to pay rewards",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "All assistant scores have been reset to zero",
      })

      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pay rewards",
        variant: "destructive",
      })
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <p className="text-center text-slate-300">Loading...</p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardContent className="pt-6">
              <p className="text-center text-slate-300 mb-4">Data not found</p>
              <Link href="/scanner" className="block">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                  Back to Scanner
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (isAdmin && Array.isArray(data)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-6xl mx-auto pt-4">
          <div className="text-center mb-6">
            <div className="flex justify-center gap-2 mb-2">
              <span className="text-3xl">🍎</span>
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-1">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-300">
              {viewType === "assistants" ? "All Assistants Overview" : "All Students Overview"}
            </p>
          </div>

          <div className="flex gap-2 mb-6 justify-center">
            <Button
              onClick={() => setViewType("assistants")}
              className={`${
                viewType === "assistants"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Assistants
            </Button>
            <Button
              onClick={() => setViewType("students")}
              className={`${
                viewType === "students"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Students
            </Button>
          </div>

          <Card className="mb-6 border-emerald-500/50 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-emerald-400">
                Total {viewType === "assistants" ? "Assistant" : "Student"} Apples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-emerald-400">{totalApples}</p>
            </CardContent>
          </Card>

          {viewType === "assistants" && (
            <div className="mb-6">
              <Button
                onClick={handlePayRewards}
                disabled={paying}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold"
              >
                {paying ? "Processing..." : "Pay Rewards (Reset All Scores)"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {data.map((item) => (
              <Card
                key={item.id}
                className="border-slate-700 bg-slate-800/50 hover:border-emerald-500/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-emerald-400 text-lg">{item.name}</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">ID: {item.barcode}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Total Apples:</span>
                    <span className="text-emerald-400 font-bold text-lg">{item.apples}</span>
                  </div>
                  {viewType === "assistants" && "sessions" in item && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-700/50 p-2 rounded">
                          <p className="text-xs text-slate-400">Sessions</p>
                          <p className="text-lg font-bold text-blue-400">{item.sessions}</p>
                        </div>
                        <div className="bg-slate-700/50 p-2 rounded">
                          <p className="text-xs text-slate-400">Session Value</p>
                          <p className="text-lg font-bold text-orange-400">{item.currentSessionValue}</p>
                        </div>
                      </div>
                      <div className="bg-slate-700/30 p-2 rounded text-xs text-slate-300">
                        <p className="font-semibold">Next session: {item.currentSessionValue} apples</p>
                        <p className="text-slate-400">Milestones reached: {item.milestonesReached}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {data.length === 0 && (
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-6">
                <p className="text-center text-slate-300">
                  No {viewType === "assistants" ? "assistants" : "students"} found
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Link href="/scanner" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold">
                Go to Scanner
              </Button>
            </Link>
            <Button
              onClick={() => {
                sessionStorage.clear()
                window.location.href = "/login"
              }}
              variant="outline"
              className="flex-1 border-red-600 text-red-400 hover:bg-red-500/10"
            >
              Logout
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const userData = data as DashboardData
  const sessions = userData.sessions
  const bonusCount = userData.loyaltyHistory.length

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="text-center mb-6">
          <div className="flex justify-center gap-2 mb-2">
            <span className="text-3xl">🍎</span>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-1">
            Dashboard
          </h1>
          <p className="text-sm text-slate-300">Welcome, {userData.name}!</p>
        </div>

        {/* Score Card */}
        <Card className="mb-6 border-emerald-500/50 bg-slate-800/50 backdrop-blur">
          <CardHeader className="bg-slate-800/30">
            <CardTitle className="text-emerald-400">Your Score</CardTitle>
            <CardDescription className="text-slate-400">Total apples earned</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="text-center">
              <p className="text-6xl font-bold text-emerald-400 mb-2">{userData.apples}</p>
              <p className="text-slate-300">Keep scanning to earn more apples!</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-400">{sessions}</p>
              <p className="text-xs text-slate-400 mt-1">sessions attended</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Bonuses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-400">{bonusCount}</p>
              <p className="text-xs text-slate-400 mt-1">bonuses earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Session Value Info */}
        <Card className="mb-6 border-orange-500/50 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-orange-400">Session Value Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            <p className="mb-2 text-lg">Current session value: <span className="text-emerald-400 font-bold">{userData.currentSessionValue || 150}</span> apples</p>
            <p className="mb-2">Every 20 sessions, your session value increases by 20 apples!</p>
            <p className="text-xs text-slate-400">Sessions attended: {sessions} (Milestones: {userData.milestonesReached || 0})</p>
            <div className="mt-3 bg-slate-700/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all"
                style={{ width: `${Math.min(((sessions % 20) / 20) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{20 - (sessions % 20)} more sessions until next milestone (+20 to session value)</p>
          </CardContent>
        </Card>

        {/* Bonus History */}
        {userData.loyaltyHistory.length > 0 && (
          <Card className="mb-6 border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Bonus History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {userData.loyaltyHistory.map((bonus, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 bg-slate-700/50 rounded border border-slate-600"
                  >
                    <span className="text-sm text-slate-300">{bonus.bonus_type}</span>
                    <span className="text-sm font-medium text-orange-400">+{bonus.bonus_apples}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Link href="/scanner" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold">
              Go to Scanner
            </Button>
          </Link>
          <Button
            onClick={() => {
              sessionStorage.clear()
              window.location.href = "/login"
            }}
            variant="outline"
            className="flex-1 border-red-600 text-red-400 hover:bg-red-500/10"
          >
            Logout
          </Button>
        </div>
      </div>
    </main>
  )
}
