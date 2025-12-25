import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/db"

const BASE_SESSION_VALUE = 150
const SESSION_INCREMENT = 20
const SESSIONS_PER_MILESTONE = 20

function calculateSessionValue(completedSessions: number): number {
  const milestones = Math.floor(completedSessions / SESSIONS_PER_MILESTONE)
  return BASE_SESSION_VALUE + (milestones * SESSION_INCREMENT)
}

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  const supabase = getSupabaseClient()
  try {
    const name = decodeURIComponent(params.name)
    const role = request.nextUrl.searchParams.get("role") || "admin"
    const viewType = request.nextUrl.searchParams.get("viewType") || "assistants"

    if (role === "admin") {
      if (viewType === "students") {
        const { data: students, error } = await supabase
          .from("students")
          .select("id, name, barcode, apples")
          .order("apples", { ascending: false })

        if (error) {
          return NextResponse.json({ message: "Failed to fetch students" }, { status: 500 })
        }

        const totalStudentApples = (students || []).reduce((sum, student) => sum + (student.apples || 0), 0)

        return NextResponse.json({
          isAdmin: true,
          viewType: "students",
          students: students || [],
          totalApples: totalStudentApples,
        })
      } else {
        const { data: assistants, error } = await supabase
          .from("users")
          .select("id, name, barcode, apples, role, sessions_attended")
          .eq("role", "assistant")
          .order("apples", { ascending: false })

        if (error) {
          return NextResponse.json({ message: "Failed to fetch assistants" }, { status: 500 })
        }

        const assistantsWithData = await Promise.all(
          (assistants || []).map(async (assistant) => {
            const { data: loyaltyHistory } = await supabase
              .from("loyalty_history")
              .select("bonus_type, bonus_apples")
              .eq("user_id", assistant.id)

            const sessionsAttended = assistant.sessions_attended || 0
            const currentSessionValue = calculateSessionValue(sessionsAttended)
            const milestonesReached = Math.floor(sessionsAttended / SESSIONS_PER_MILESTONE)

            return {
              id: assistant.id,
              name: assistant.name,
              barcode: assistant.barcode,
              apples: assistant.apples,
              role: assistant.role,
              sessions: sessionsAttended,
              currentSessionValue: currentSessionValue,
              milestonesReached: milestonesReached,
              bonusCount: loyaltyHistory?.length || 0,
              loyaltyHistory: loyaltyHistory || [],
            }
          }),
        )

        const totalAssistantApples = assistantsWithData.reduce((sum, assistant) => sum + (assistant.apples || 0), 0)

        return NextResponse.json({
          isAdmin: true,
          viewType: "assistants",
          assistants: assistantsWithData,
          totalApples: totalAssistantApples,
        })
      }
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, barcode, apples, sessions_attended")
      .eq("role", role)
      .eq("name", name)
      .single()

    if (error || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const sessionsAttended = user.sessions_attended || 0
    const currentSessionValue = calculateSessionValue(sessionsAttended)
    const milestonesReached = Math.floor(sessionsAttended / SESSIONS_PER_MILESTONE)

    const { data: loyaltyHistory } = await supabase
      .from("loyalty_history")
      .select("bonus_type, bonus_apples, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    return NextResponse.json({
      isAdmin: false,
      name: user.name,
      barcode: user.barcode,
      apples: user.apples,
      sessions: sessionsAttended,
      currentSessionValue: currentSessionValue,
      milestonesReached: milestonesReached,
      bonusCount: loyaltyHistory?.length || 0,
      loyaltyHistory: loyaltyHistory || [],
    })
  } catch (error) {
    console.error("[v0] Dashboard error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
