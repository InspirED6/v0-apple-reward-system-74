import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { apples, adminId } = await request.json()
    const studentId = params.id

    if (apples === undefined || apples === null) {
      return NextResponse.json({ message: "Invalid apple amount" }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { data: student, error } = await supabase
      .from("students")
      .select("id, name, apples")
      .eq("id", studentId)
      .single()

    if (error || !student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 })
    }

    const newApples = Math.max(0, (student.apples || 0) + apples)

    const { data: updatedStudent } = await supabase
      .from("students")
      .update({ apples: newApples })
      .eq("id", studentId)
      .select()
      .single()

    // Log transaction
    await supabase.from("apple_transactions").insert({
      student_id: studentId,
      admin_id: adminId,
      apples_added: apples,
      reason: apples > 0 ? "Manual addition" : "Apple deduction",
    })

    return NextResponse.json({
      success: true,
      name: updatedStudent?.name,
      apples: updatedStudent?.apples,
      applesAdded: apples,
      message: `${apples > 0 ? "Added" : "Subtracted"} ${Math.abs(apples)} apples`,
    })
  } catch (error) {
    console.error("[v0] Add student apples error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
