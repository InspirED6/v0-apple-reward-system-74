import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { barcode, userRole, userId } = await request.json()
    const supabase = getSupabaseClient()

    if (!barcode || !userRole || !userId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const barcodeType = barcode.charAt(0)
    const isStudent = barcodeType === "1"
    const isAdmin = barcodeType === "2"
    const isAssistant = barcodeType === "3"

    if (userRole === "admin") {
      if (isAdmin) {
        const { data: user } = await supabase.from("users").select("apples").eq("id", userId).single()

        const currentApples = user?.apples || 0
        const newApples = currentApples + 150
        const currentSessions = Math.floor(currentApples / 150)
        const newSessions = Math.floor(newApples / 150)

        const { data: updatedUser } = await supabase
          .from("users")
          .update({ apples: newApples })
          .eq("id", userId)
          .select("name, apples")
          .single()

        let loyaltyAdded = 0
        if (newSessions >= 4 && currentSessions < 4) {
          const { data: existingBonus } = await supabase
            .from("loyalty_history")
            .select("id")
            .eq("user_id", userId)
            .eq("bonus_type", "session_4")
            .single()

          if (!existingBonus) {
            const applesWithBonus = newApples + 50

            await supabase.from("users").update({ apples: applesWithBonus }).eq("id", userId)

            await supabase.from("loyalty_history").insert({
              user_id: userId,
              bonus_type: "session_4",
              bonus_apples: 50,
              created_at: new Date().toISOString(),
            })
            loyaltyAdded = 50
          }
        }

        const { data: finalUser } = await supabase.from("users").select("name, apples").eq("id", userId).single()

        return NextResponse.json({
          success: true,
          type: "admin",
          name: finalUser?.name,
          apples: finalUser?.apples,
          applesAdded: 150,
          sessions: Math.floor((finalUser?.apples || 0) / 150),
          loyaltyAdded: loyaltyAdded > 0 ? loyaltyAdded : undefined,
          message: `Session recorded! +150 apples (Session ${newSessions})${loyaltyAdded > 0 ? ` + ${loyaltyAdded} loyalty bonus` : ""}`,
        })
      } else if (isStudent) {
        const { data: student } = await supabase
          .from("students")
          .select("id, name, apples")
          .eq("barcode", barcode)
          .single()

        if (!student) {
          return NextResponse.json({ message: "Student not found" }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          type: "student",
          name: student.name,
          apples: student.apples,
          studentId: student.id,
          message: `Student found: ${student.name}`,
        })
      } else if (isAssistant) {
        const { data: assistant } = await supabase
          .from("users")
          .select("id, name, apples")
          .eq("barcode", barcode)
          .eq("role", "assistant")
          .single()

        if (!assistant) {
          return NextResponse.json({ message: "Assistant not found" }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          type: "assistant",
          name: assistant.name,
          apples: assistant.apples,
          assistantId: assistant.id,
          message: `Assistant found: ${assistant.name}`,
        })
      } else {
        return NextResponse.json(
          { message: "Admins can scan their own attendance (2), student barcodes (1), or assistant barcodes (3)" },
          { status: 403 },
        )
      }
    }

    if (userRole === "assistant") {
      if (!isStudent) {
        return NextResponse.json(
          { message: "Assistants can only scan student barcodes (starting with 1)" },
          { status: 403 },
        )
      }

      const { data: student } = await supabase
        .from("students")
        .select("id, name, apples")
        .eq("barcode", barcode)
        .single()

      if (!student) {
        return NextResponse.json({ message: "Student not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        type: "student",
        name: student.name,
        apples: student.apples,
        studentId: student.id,
        message: `Student found: ${student.name}`,
      })
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Scan error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
