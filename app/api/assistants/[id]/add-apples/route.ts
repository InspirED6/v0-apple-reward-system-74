import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/db"

const BASE_SESSION_VALUE = 150
const SESSION_INCREMENT = 20
const SESSIONS_PER_MILESTONE = 20

function calculateSessionValue(completedSessions: number): number {
  const milestones = Math.floor(completedSessions / SESSIONS_PER_MILESTONE)
  return BASE_SESSION_VALUE + (milestones * SESSION_INCREMENT)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { apples, adminId, isSessionAttendance } = await request.json()
    const assistantId = params.id

    if (apples === undefined || apples === null) {
      return NextResponse.json({ message: "Invalid apple amount" }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { data: assistant, error } = await supabase
      .from("users")
      .select("id, name, apples, sessions_attended")
      .eq("id", assistantId)
      .eq("role", "assistant")
      .single()

    if (error || !assistant) {
      return NextResponse.json({ message: "Assistant not found" }, { status: 404 })
    }

    const currentApples = assistant.apples || 0
    const currentSessionsAttended = assistant.sessions_attended || 0
    
    let finalApples = currentApples
    let actualApplesAdded = apples
    let newSessionsAttended = currentSessionsAttended
    let sessionValueInfo = ""

    if (isSessionAttendance && apples > 0) {
      const sessionValue = calculateSessionValue(currentSessionsAttended)
      actualApplesAdded = sessionValue
      finalApples = currentApples + sessionValue
      newSessionsAttended = currentSessionsAttended + 1
      
      const nextMilestone = Math.ceil(newSessionsAttended / SESSIONS_PER_MILESTONE) * SESSIONS_PER_MILESTONE
      const sessionsUntilNext = nextMilestone - newSessionsAttended
      const nextSessionValue = calculateSessionValue(newSessionsAttended)
      
      sessionValueInfo = ` (Session value: ${sessionValue} apples)`
      if (sessionsUntilNext > 0 && sessionsUntilNext < SESSIONS_PER_MILESTONE) {
        sessionValueInfo += ` - ${sessionsUntilNext} more session${sessionsUntilNext > 1 ? 's' : ''} until value increases to ${nextSessionValue + SESSION_INCREMENT}!`
      } else if (sessionsUntilNext === 0) {
        sessionValueInfo += ` - Value increased! Next session worth ${nextSessionValue} apples!`
      }
    } else {
      finalApples = Math.max(0, currentApples + apples)
    }

    const updateData: { apples: number; sessions_attended?: number } = { apples: finalApples }
    if (isSessionAttendance && apples > 0) {
      updateData.sessions_attended = newSessionsAttended
    }

    const { data: updatedAssistant } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", assistantId)
      .select()
      .single()

    await supabase.from("apple_transactions").insert({
      user_id: assistantId,
      admin_id: adminId,
      apples_added: actualApplesAdded,
      reason: apples > 0 ? "Attendance bonus" : "Apple deduction",
    })

    const currentSessionValue = calculateSessionValue(newSessionsAttended)

    return NextResponse.json({
      success: true,
      name: updatedAssistant?.name,
      apples: updatedAssistant?.apples,
      applesAdded: actualApplesAdded,
      sessionsAttended: newSessionsAttended,
      currentSessionValue: currentSessionValue,
      message: `${apples > 0 ? "Added" : "Subtracted"} ${Math.abs(actualApplesAdded)} apples${sessionValueInfo}`,
    })
  } catch (error) {
    console.error("[v0] Add assistant apples error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
