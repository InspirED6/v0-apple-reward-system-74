"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

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
  const role = searchParams.get("role") || "admin"
  const decodedName = decodeURIComponent(params.name)

  useEffect(() => {
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
  }, [decodedName, role, toast])

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground mb-4">Data not found</p>
              <Link href="/" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Back to Home</Button>
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
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {data.name}!</p>
        </div>

        {/* Score Card */}
        <Card className="mb-6 border-primary/50">
          <CardHeader className="bg-card">
            <CardTitle className="text-primary">Your Score</CardTitle>
            <CardDescription>Total apples earned</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="text-center">
              <p className="text-6xl font-bold text-accent mb-2">{data.apples}</p>
              <p className="text-muted-foreground">Keep scanning to earn more apples!</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{attendanceCount}</p>
              <p className="text-xs text-muted-foreground mt-1">days attended</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Bonuses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">{weeklyBonusCount}</p>
              <p className="text-xs text-muted-foreground mt-1">bonuses earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Last 10 check-ins</CardDescription>
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
                      className="flex justify-between items-center p-2 bg-card rounded border border-border"
                    >
                      <span className="text-sm text-muted-foreground">{new Date(att.date).toLocaleDateString()}</span>
                      <span className="text-sm font-medium text-accent">+150</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attendance records yet</p>
            )}
          </CardContent>
        </Card>

        {/* Loyalty Bonus Info */}
        <Card className="mb-6 border-accent/50">
          <CardHeader>
            <CardTitle className="text-accent">Loyalty Bonus Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-2">Attend 3+ times in the same week to earn a 50 apple bonus!</p>
            <p className="text-xs">Bonuses earned: {weeklyBonusCount}</p>
          </CardContent>
        </Card>

        <Link href="/">
          <Button className="w-full bg-transparent" variant="outline">
            Back to Home
          </Button>
        </Link>
      </div>
    </main>
  )
}
