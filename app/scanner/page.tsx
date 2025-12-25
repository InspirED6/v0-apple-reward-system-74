"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-black rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-white text-sm">Loading scanner...</div>
      </div>
    </div>
  ),
})

interface ScanResult {
  success: boolean
  message: string
  type?: string
  name?: string
  apples?: number
  studentId?: string
  assistantId?: string
}

export default function ScannerPage() {
  const [barcode, setBarcode] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState("")
  const [cameraActive, setCameraActive] = useState(false)
  const [applesLoading, setApplesLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const userId = sessionStorage.getItem("userId")
    const storedName = sessionStorage.getItem("userName")
    const storedRole = sessionStorage.getItem("userRole")

    if (!userId || !storedName || !storedRole) {
      router.push("/login")
      return
    }

    setUserName(storedName)
    setUserRole(storedRole)
  }, [router])

  const handleScanSuccess = (decodedText: string) => {
    console.log("Barcode detected in handler:", decodedText)

    const trimmedCode = decodedText.trim()

    if (/^[123]\d{5}$/.test(trimmedCode)) {
      setBarcode(trimmedCode)
      setIsScanning(false)
      setCameraActive(false)
      const prefix = trimmedCode[0]
      const roleLabel = prefix === "3" ? "Student" : prefix === "2" ? "Assistant" : "Admin"
      toast({
        title: "Barcode Scanned!",
        description: `Detected: ${trimmedCode} (${roleLabel}). Processing...`,
      })
      console.log("Valid 6-digit barcode, processing:", trimmedCode)
      setTimeout(() => {
        processBarcode(trimmedCode)
      }, 500)
    } else {
      console.log("Invalid barcode format:", trimmedCode, "Length:", trimmedCode.length)
      toast({
        title: "Invalid Barcode",
        description: `Scanned: ${trimmedCode}. Must be 6 digits starting with 3 (student), 2 (assistant), or 1 (admin). Example: 300001`,
        variant: "destructive",
      })
      // Keep scanner running to try again
      setIsScanning(true)
    }
  }

  const startScanning = () => {
    setCameraActive(true)
    setIsScanning(true)
    toast({
      title: "Scanner Started",
      description: "Point the camera at a barcode to scan automatically.",
    })
  }

  const stopScanning = () => {
    setCameraActive(false)
    setIsScanning(false)
  }

  const processBarcode = async (code: string) => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter or scan a barcode",
        variant: "destructive",
      })
      return
    }

    if (!/^[123]\d{5}$/.test(code.trim())) {
      toast({
        title: "Invalid Barcode Format",
        description: "Barcode must be 6 digits starting with 3 (student), 2 (assistant), or 1 (admin). Example: 300001",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: code.trim(),
          userId: sessionStorage.getItem("userId"),
          userRole: userRole,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        })
        setBarcode("")
        if (data?.type === "student" && data?.studentId) {
          await handleAddApples(1, { type: "student", id: data.studentId })
        } else if (data?.type === "assistant" && data?.assistantId) {
          await handleAddApples(150, { type: "assistant", id: data.assistantId }, true)
        }
      } else {
        toast({
          title: "Scan Failed",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process scan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    await processBarcode(barcode)
  }

  const handleAddApples = async (
    amount: number,
    target?: { type: "student" | "assistant"; id: string },
    isSessionAttendance?: boolean
  ) => {
    if (!result && !target) return

    setApplesLoading(true)
    try {
      const effectiveType = target?.type || (result?.type as "student" | "assistant")
      const effectiveId = target?.id || (result?.type === "student" ? result?.studentId : result?.assistantId)
      if (!effectiveType || !effectiveId) throw new Error("Missing target to update apples")

      const endpoint =
        effectiveType === "student"
          ? `/api/students/${effectiveId}/add-apples`
          : `/api/assistants/${effectiveId}/add-apples`

      const bodyData: { apples: number; adminId: string | null; isSessionAttendance?: boolean } = {
        apples: amount,
        adminId: sessionStorage.getItem("userId"),
      }

      if (effectiveType === "assistant" && isSessionAttendance) {
        bodyData.isSessionAttendance = true
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || `${amount > 0 ? "Added" : "Subtracted"} ${Math.abs(data.applesAdded || amount)} apples`,
        })
        if (result) {
          setResult({
            ...result,
            apples: data.apples,
          })
        }
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update apples",
        variant: "destructive",
      })
    } finally {
      setApplesLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="text-center mb-6">
          <div className="flex justify-center gap-2 mb-4">
            <span className="text-4xl">🍎</span>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-1">
            Barcode Scanner
          </h1>
          <p className="text-slate-300 text-sm">
            Scanning as: {userName} ({userRole})
          </p>
        </div>

        {cameraActive && (
          <Card className="mb-6 border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Camera View</CardTitle>
              <CardDescription className="text-slate-400">
                {isScanning ? "Point camera at barcode to scan automatically" : "Camera ready"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BarcodeScanner
                onScanSuccess={handleScanSuccess}
                isActive={isScanning}
              />
              <div className="flex gap-2">
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-100 hover:bg-slate-700 bg-transparent"
                >
                  Close Scanner
                </Button>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="font-semibold">How to use:</div>
                <div>Point camera at 6-digit barcodes (3xxxxx, 2xxxxx, 1xxxxx)</div>
                <div>Scanned barcodes will be automatically processed</div>
                <div>You can also manually enter barcodes below</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-slate-100">Scan Barcode</CardTitle>
            <CardDescription className="text-slate-400">
              {userRole === "admin" ? "Use camera to scan or manually enter student/admin barcodes" : "Use camera to scan or manually enter student barcodes"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Barcode</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit barcode (e.g., 300001, 200001, 100001)..."
                  value={barcode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setBarcode(value)
                  }}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  disabled={loading}
                  autoFocus
                  maxLength={6}
                />
                <p className="text-xs text-slate-400">
                  Student barcodes start with 3, Assistant with 2, Admin with 1
                </p>
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Sample barcodes for testing:</div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBarcode("300001")}
                      className="px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600"
                    >
                      300001 (Student)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcode("200001")}
                      className="px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600"
                    >
                      200001 (Assistant)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcode("100001")}
                      className="px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600"
                    >
                      100001 (Admin)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                  disabled={loading || barcode.length !== 6}
                >
                  {loading ? "Processing..." : "Process Barcode"}
                </Button>
                {!cameraActive && (
                  <Button
                    type="button"
                    onClick={startScanning}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    📷 Open Camera
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card
            className={`mb-6 border-2 ${
              result.success ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
            }`}
          >
            <CardContent className="pt-6 space-y-4">
              <p className={`text-center font-semibold ${result.success ? "text-green-400" : "text-red-400"}`}>
                {result.message}
              </p>
              {result.name && (
                <p className="text-center text-slate-300">
                  {result.name} {result.type && `(${result.type})`}
                </p>
              )}
              {result.apples !== undefined && (
                <p className="text-center text-emerald-400 font-bold">🍎 {result.apples} apples</p>
              )}

              {(result.type === "student" || result.type === "assistant") && (
                <div className="space-y-3 pt-4 border-t border-slate-600">
                  {result.type === "student" && (
                    <>
                      <p className="text-sm text-slate-300 font-semibold">Add Apples:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleAddApples(1)}
                          disabled={applesLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          +1 Apple
                        </Button>
                        <Button
                          onClick={() => handleAddApples(5)}
                          disabled={applesLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          +5 Apples
                        </Button>
                        <Button
                          onClick={() => handleAddApples(20)}
                          disabled={applesLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          +20 Apples
                        </Button>
                        <Button
                          onClick={() => handleAddApples(-10)}
                          disabled={applesLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          -10 Apples
                        </Button>
                      </div>
                    </>
                  )}

                  {result.type === "assistant" && (
                    <>
                      <p className="text-sm text-slate-300 font-semibold">Manage Apples:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleAddApples(150, undefined, true)}
                          disabled={applesLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          ✓ Attend Session
                        </Button>
                        <Button
                          onClick={() => handleAddApples(-10)}
                          disabled={applesLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          - Subtract
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center gap-4 mt-8">
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm">
            ← Back to Home
          </Link>
          <Link href="/login" className="text-slate-400 hover:text-slate-200 text-sm">
            Login Page
          </Link>
        </div>
      </div>
    </main>
  )
}
