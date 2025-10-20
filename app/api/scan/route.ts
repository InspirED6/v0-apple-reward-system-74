import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`
}

export async function POST(request: NextRequest) {
  try {
    const { barcode, userRole, userId } = await request.json()

    if (!barcode || !userRole || !userId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const barcodeType = barcode.charAt(0)
    const isStudent = barcodeType === "1"
    const isAdmin = barcodeType === "2"
    const isAssistant = barcodeType === "3"

    if (userRole === "admin") {
      if (isAdmin) {
        // Check if already attended today
        const today = new Date().toDateString()
        const { data: todayAttendance } = await supabase
          .from("attendance")
          .select("id")
          .eq("user_id", userId)
          .gte("attendance_date", new Date(today).toISOString())
          .lt("attendance_date", new Date(new Date(today).getTime() + 86400000).toISOString())
          .single()

        if (todayAttendance) {
          return NextResponse.json({ message: "Already attended today", type: "admin" }, { status: 400 })
        }

        // Add attendance
        await supabase.from("attendance").insert({ user_id: userId })

        // Update apples
        const { data: user } = await supabase
          .from("users")
          .update({ apples: supabase.rpc("increment_apples", { user_id: userId, amount: 150 }) })
          .eq("id", userId)
          .select()
          .single()

        // Check for loyalty bonus
        const currentWeek = getISOWeek(new Date())
        const { data: weekAttendances } = await supabase
          .from("attendance")
          .select("id")
          .eq("user_id", userId)
          .gte("attendance_date", new Date().toISOString().split("T")[0])

        let loyaltyAdded = 0
        if ((weekAttendances?.length || 0) >= 3) {
          const { data: existingBonus } = await supabase
            .from("loyalty_history")
            .select("id")
            .eq("user_id", userId)
            .eq("week", currentWeek)
            .single()

          if (!existingBonus) {
            await supabase.from("loyalty_history").insert({ user_id: userId, week: currentWeek })
            await supabase.rpc("increment_apples", { user_id: userId, amount: 50 })
            loyaltyAdded = 50
          }
        }

        const { data: updatedUser } = await supabase.from("users").select("name, apples").eq("id", userId).single()

        return NextResponse.json({
          type: "admin",
          name: updatedUser?.name,
          apples: updatedUser?.apples,
          applesAdded: 150,
          loyaltyAdded: loyaltyAdded > 0 ? loyaltyAdded : undefined,
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
          type: "student",
          name: student.name,
          apples: student.apples,
          studentId: student.id,
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
          type: "assistant",
          name: assistant.name,
          apples: assistant.apples,
          assistantId: assistant.id,
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
        type: "student",
        name: student.name,
        apples: student.apples,
        studentId: student.id,
      })
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Scan error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
