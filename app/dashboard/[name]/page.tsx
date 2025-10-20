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
  attendanceCount: number
  bonusCount: number
  loyaltyHistory: Array<{ week: string; bonus_apples: number }>
}

interface DashboardData {
  name: string
  barcode: string
  apples: number
  attendance: Array<{ date: string }>
  loyaltyHistory: Array<{ week: string; bonus_apples: number }>
}

export default function Dashboard({ params }: { params: { name: string } }) {
  const [data, setData] = useState<DashboardData | AssistantData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get("role") || "admin"
  const decodedName = decodeURIComponent(params.name)

  useEffect(() => {
    const userId = sessionStorage.getItem("userId")
    if (!userId) {
      router.push("/login")
      return
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/dashboard/${encodeURIComponent(decodedName)}?role=${role}`)
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
          setData(result.assistants)
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

    fetchData()
  }, [decodedName, role, toast, router])

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
            <p className="text-sm text-slate-300">All Assistants Overview</p>
          </div>

          {/* Assistants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {data.map((assistant) => (
              <Card
                key={assistant.id}
                className="border-slate-700 bg-slate-800/50 hover:border-emerald-500/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-emerald-400 text-lg">{assistant.name}</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">ID: {assistant.barcode}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Total Apples:</span>
                    <span className="text-emerald-400 font-bold text-lg">{assistant.apples}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-700/50 p-2 rounded">
                      <p className="text-xs text-slate-400">Attendance</p>
                      <p className="text-lg font-bold text-blue-400">{assistant.attendanceCount}</p>
                    </div>
                    <div className="bg-slate-700/50 p-2 rounded">
                      <p className="text-xs text-slate-400">Bonuses</p>
                      <p className="text-lg font-bold text-orange-400">{assistant.bonusCount}</p>
                    </div>
                  </div>
                  {assistant.loyaltyHistory.length > 0 && (
                    <div className="bg-slate-700/30 p-2 rounded text-xs text-slate-300">
                      <p className="font-semibold mb-1">Recent Bonuses:</p>
                      <div className="space-y-1">
                        {assistant.loyaltyHistory.slice(0, 3).map((history, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>Week {history.week}:</span>
                            <span className="text-orange-400">+{history.bonus_apples}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {data.length === 0 && (
            <Card className="border-slate-700 bg-slate-800/50">
              <CardContent className="pt-6">
                <p className="text-center text-slate-300">No assistants found</p>
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
  const attendanceCount = userData.attendance.length
  const weeklyBonusCount = userData.loyaltyHistory.length

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
              <CardTitle className="text-sm font-medium text-slate-400">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-400">{attendanceCount}</p>
              <p className="text-xs text-slate-400 mt-1">days attended</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Weekly Bonuses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-400">{weeklyBonusCount}</p>
              <p className="text-xs text-slate-400 mt-1">bonuses earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance History */}
        <Card className="mb-6 border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Recent Attendance</CardTitle>
            <CardDescription className="text-slate-400">Last 10 check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            {userData.attendance.length > 0 ? (
              <div className="space-y-2">
                {userData.attendance
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((att, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2 bg-slate-700/50 rounded border border-slate-600"
                    >
                      <span className="text-sm text-slate-300">{new Date(att.date).toLocaleDateString()}</span>
                      <span className="text-sm font-medium text-emerald-400">+150</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No attendance records yet</p>
            )}
          </CardContent>
        </Card>

        {/* Loyalty Bonus Info */}
        <Card className="mb-6 border-orange-500/50 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-orange-400">Loyalty Bonus Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            <p className="mb-2">Attend 3+ times in the same week to earn a 50 apple bonus!</p>
            <p className="text-xs text-slate-400">Bonuses earned: {weeklyBonusCount}</p>
          </CardContent>
        </Card>

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
