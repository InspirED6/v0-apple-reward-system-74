import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { apples, adminId } = await request.json()
    const assistantId = params.id

    if (apples === undefined || apples === null) {
      return NextResponse.json({ message: "Invalid apple amount" }, { status: 400 })
    }

    const supabase = getSupabaseClient()
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

    if (newSessions >= 4) {
      const currentBonusCount = Math.floor(currentSessions / 4)
      const newBonusCount = Math.floor(newSessions / 4)

      // Check if we've reached a new bonus milestone
      if (newBonusCount > currentBonusCount) {
        const bonusesToAdd = newBonusCount - currentBonusCount

        for (let i = 0; i < bonusesToAdd; i++) {
          const bonusLevel = currentBonusCount + i + 1
          const bonusType = `session_${bonusLevel * 4}`

          // Check if this specific bonus already exists
          const { data: existingBonus } = await supabase
            .from("loyalty_history")
            .select("id")
            .eq("user_id", assistantId)
            .eq("bonus_type", bonusType)
            .single()

          if (!existingBonus) {
            finalApples += 50
            loyaltyAdded += 50

            await supabase.from("loyalty_history").insert({
              user_id: assistantId,
              bonus_type: bonusType,
              bonus_apples: 50,
              created_at: new Date().toISOString(),
            })
          }
        }
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
