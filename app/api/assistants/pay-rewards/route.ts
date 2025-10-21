import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const supabase = getSupabaseClient()

    if (!userId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 })
    }

    // Verify user is admin
    const { data: user } = await supabase.from("users").select("role").eq("id", userId).single()

    if (!user || user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Reset all assistant scores to zero
    const { error } = await supabase.from("users").update({ apples: 0 }).eq("role", "assistant")

    if (error) {
      return NextResponse.json({ message: "Failed to reset scores" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "All assistant scores have been reset to zero",
    })
  } catch (error) {
    console.error("[v0] Pay rewards error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
