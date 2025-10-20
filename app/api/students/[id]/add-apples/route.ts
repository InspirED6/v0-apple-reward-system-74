import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { apples, adminId } = await request.json()
    const studentId = params.id

    if (!apples || apples <= 0) {
      return NextResponse.json({ message: "Invalid apple amount" }, { status: 400 })
    }

    const { data: student, error } = await supabase
      .from("students")
      .update({ apples: supabase.rpc("increment_student_apples", { student_id: studentId, amount: apples }) })
      .eq("id", studentId)
      .select()
      .single()

    if (error || !student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 })
    }

    await supabase.from("apple_transactions").insert({
      student_id: studentId,
      admin_id: adminId,
      apples_added: apples,
      reason: "Manual addition by admin",
    })

    return NextResponse.json({
      name: student.name,
      apples: student.apples,
      applesAdded: apples,
    })
  } catch (error) {
    console.error("[v0] Add apples error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
