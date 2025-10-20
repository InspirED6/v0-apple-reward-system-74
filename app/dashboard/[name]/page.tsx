"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

interface DashboardData {
  name: string
  barcode: string
  apples: number
  attendance: Array<{ date: string }>
  loyaltyHistory: Array<{ week: string; added: boolean }>
}

export default function Dashboard({ params }: { params: { name: string } }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
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

        setData(result)
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
        <div className="max-w-2xl mx-auto pt-8">
          <p className="text-center text-slate-300">Loading...</p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-2xl mx-auto pt-8">
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

  const attendanceCount = data.attendance.length
  const weeklyBonusCount = data.loyaltyHistory.filter((l) => l.added).length

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
          <p className="text-sm text-slate-300">Welcome, {data.name}!</p>
        </div>

        {/* Score Card */}
        <Card className="mb-6 border-emerald-500/50 bg-slate-800/50 backdrop-blur">
          <CardHeader className="bg-slate-800/30">
            <CardTitle className="text-emerald-400">Your Score</CardTitle>
            <CardDescription className="text-slate-400">Total apples earned</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="text-center">
              <p className="text-6xl font-bold text-emerald-400 mb-2">{data.apples}</p>
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
            {data.attendance.length > 0 ? (
              <div className="space-y-2">
                {data.attendance
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
