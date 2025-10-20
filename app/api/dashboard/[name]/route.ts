import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const name = decodeURIComponent(params.name)
    const role = request.nextUrl.searchParams.get("role") || "admin"

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, barcode, apples")
      .eq("role", role)
      .eq("name", name)
      .single()

    if (error || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const { data: attendance } = await supabase
      .from("attendance")
      .select("attendance_date")
      .eq("user_id", user.id)
      .order("attendance_date", { ascending: false })

    const { data: loyaltyHistory } = await supabase
      .from("loyalty_history")
      .select("week, bonus_apples")
      .eq("user_id", user.id)
      .order("week", { ascending: false })

    return NextResponse.json({
      name: user.name,
      barcode: user.barcode,
      apples: user.apples,
      attendance:
        attendance?.map((att) => ({
          date: att.attendance_date,
        })) || [],
      loyaltyHistory: loyaltyHistory || [],
    })
  } catch (error) {
    console.error("[v0] Dashboard error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
