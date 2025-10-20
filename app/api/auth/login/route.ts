import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, barcode")
      .eq("email", email)
      .eq("password", password)
      .single()

    if (error || !user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    const response = NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      { status: 200 },
    )

    response.cookies.set("auth_user", JSON.stringify({ id: user.id, name: user.name, role: user.role }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ message: "Login failed" }, { status: 500 })
  }
}
