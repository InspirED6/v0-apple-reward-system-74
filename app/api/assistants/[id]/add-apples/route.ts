import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { apples, adminId } = await request.json()
    const assistantId = params.id

    if (apples === undefined || apples === null) {
      return NextResponse.json({ message: "Invalid apple amount" }, { status: 400 })
    }

    // Update assistant apples
    const { data: assistant, error } = await supabase
      .from("users")
      .select("id, name, apples")
      .eq("id", assistantId)
      .eq("role", "assistant")
      .single()

    if (error || !assistant) {
      return NextResponse.json({ message: "Assistant not found" }, { status: 404 })
    }

    const newApples = Math.max(0, (assistant.apples || 0) + apples)

    const { data: updatedAssistant } = await supabase
      .from("users")
      .update({ apples: newApples })
      .eq("id", assistantId)
      .select()
      .single()

    // Log transaction
    await supabase.from("apple_transactions").insert({
      user_id: assistantId,
      admin_id: adminId,
      apples_added: apples,
      reason: apples > 0 ? "Attendance bonus" : "Apple deduction",
    })

    return NextResponse.json({
      name: updatedAssistant?.name,
      apples: updatedAssistant?.apples,
      applesAdded: apples,
    })
  } catch (error) {
    console.error("[v0] Add assistant apples error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
