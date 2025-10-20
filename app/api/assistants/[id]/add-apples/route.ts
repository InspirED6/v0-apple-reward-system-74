import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { apples, adminId } = await request.json()
    const assistantId = params.id

    if (apples === undefined || apples === null) {
      return NextResponse.json({ message: "Invalid apple amount" }, { status: 400 })
    }

    const { data: assistant, error } = await supabase
      .from("users")
      .select("id, name, apples")
      .eq("id", assistantId)
      .eq("role", "assistant")
      .single()

    if (error || !assistant) {
      return NextResponse.json({ message: "Assistant not found" }, { status: 404 })
    }

    const currentApples = assistant.apples || 0
    const newApples = Math.max(0, currentApples + apples)

    const currentSessions = Math.floor(currentApples / 150)
    const newSessions = Math.floor(newApples / 150)

    let finalApples = newApples
    let loyaltyAdded = 0

    if (newSessions >= 4 && currentSessions < 4) {
      const { data: existingBonus } = await supabase
        .from("loyalty_history")
        .select("id")
        .eq("user_id", assistantId)
        .eq("bonus_type", "session_4")
        .single()

      if (!existingBonus) {
        finalApples = newApples + 50
        loyaltyAdded = 50

        await supabase.from("loyalty_history").insert({
          user_id: assistantId,
          bonus_type: "session_4",
          bonus_apples: 50,
          created_at: new Date().toISOString(),
        })
      }
    }

    const { data: updatedAssistant } = await supabase
      .from("users")
      .update({ apples: finalApples })
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
      success: true,
      name: updatedAssistant?.name,
      apples: updatedAssistant?.apples,
      applesAdded: apples,
      sessions: Math.floor((updatedAssistant?.apples || 0) / 150),
      loyaltyAdded: loyaltyAdded > 0 ? loyaltyAdded : undefined,
      message: `${apples > 0 ? "Added" : "Subtracted"} ${Math.abs(apples)} apples (Session ${newSessions})${loyaltyAdded > 0 ? ` + ${loyaltyAdded} loyalty bonus!` : ""}`,
    })
  } catch (error) {
    console.error("[v0] Add assistant apples error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
