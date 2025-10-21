"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { BrowserMultiFormatReader } from "@zxing/library"

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
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [applesLoading, setApplesLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReader = useRef<BrowserMultiFormatReader | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Get user info from session storage
    const userId = sessionStorage.getItem("userId")
    const storedName = sessionStorage.getItem("userName")
    const storedRole = sessionStorage.getItem("userRole")

    if (!userId || !storedName || !storedRole) {
      router.push("/login")
      return
    }

    setUserName(storedName)
    setUserRole(storedRole)

    // Cleanup on unmount
    return () => {
      if (codeReader.current) {
        codeReader.current.reset()
      }
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [router, videoStream])

  const startCamera = async () => {
    try {
      if (!codeReader.current) {
        codeReader.current = new BrowserMultiFormatReader()
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      setVideoStream(stream)
      setCameraActive(true)

      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.play()
      }

      // Start continuous scanning
      startScanning()
    } catch (error) {
      console.error("Camera error:", error)
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop())
      setVideoStream(null)
      setCameraActive(false)
    }
    setIsScanning(false)
    if (codeReader.current) {
      codeReader.current.reset()
    }
  }

  const startScanning = () => {
    if (!codeReader.current || !videoRef.current) return

    setIsScanning(true)
    
    const scan = () => {
      if (!isScanning || !videoRef.current) return

      codeReader.current!.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
        if (result) {
          const scannedCode = result.getText()
          console.log("Scanned barcode:", scannedCode)
          
          // Validate barcode format (should be 4 digits)
          if (/^\d{4}$/.test(scannedCode)) {
            setBarcode(scannedCode)
            setIsScanning(false)
            stopCamera()
            toast({
              title: "Barcode Scanned",
              description: `Found barcode: ${scannedCode}`,
            })
          } else {
            // Continue scanning if format is invalid
            if (isScanning) {
              setTimeout(scan, 100)
            }
          }
        } else if (error && isScanning) {
          // Continue scanning on error
          setTimeout(scan, 100)
        }
      })
    }

    scan()
  }

  const captureFromCamera = () => {
    if (!codeReader.current || !videoRef.current) return

    codeReader.current.decodeFromVideoElement(videoRef.current)
      .then((result) => {
        const scannedCode = result?.getText() || ""
        console.log("Captured barcode:", scannedCode)
        
        if (/^\d{4}$/.test(scannedCode)) {
          setBarcode(scannedCode)
          toast({
            title: "Barcode Captured",
            description: `Found barcode: ${scannedCode}`,
          })
        } else {
          toast({
            title: "Invalid Barcode",
            description: "Please scan a valid 4-digit barcode",
            variant: "destructive",
          })
        }
      })
      .catch((error) => {
        console.error("Capture error:", error)
        toast({
          title: "Scan Failed",
          description: "Could not detect barcode. Please try again.",
          variant: "destructive",
        })
      })
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!barcode.trim()) {
      toast({
        title: "Error",
        description: "Please enter or scan a barcode",
        variant: "destructive",
      })
      return
    }

    // Validate barcode format (should be 4 digits)
    if (!/^\d{4}$/.test(barcode.trim())) {
      toast({
        title: "Invalid Barcode Format",
        description: "Barcode must be exactly 4 digits (e.g., 1001, 2001, 3001)",
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
          barcode: barcode.trim(),
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

  const handleAddApples = async (amount: number) => {
    if (!result) return

    setApplesLoading(true)
    try {
      const endpoint =
        result.type === "student"
          ? `/api/students/${result.studentId}/add-apples`
          : `/api/assistants/${result.assistantId}/add-apples`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apples: amount,
          adminId: sessionStorage.getItem("userId"),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `${amount > 0 ? "Added" : "Subtracted"} ${Math.abs(amount)} apples`,
        })
        setResult({
          ...result,
          apples: data.apples,
        })
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
        {/* Header */}
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

        {/* Camera Section */}
        {cameraActive && (
          <Card className="mb-6 border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Camera View</CardTitle>
              <CardDescription className="text-slate-400">
                {isScanning ? "Point camera at barcode to scan automatically" : "Camera ready"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded border border-slate-600" />
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-lg p-4">
                      <div className="animate-pulse text-white text-sm">Scanning...</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={captureFromCamera} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isScanning}>
                  Manual Capture
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-100 hover:bg-slate-700 bg-transparent"
                >
                  Close Camera
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scanner Input */}
        <Card className="mb-6 border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-slate-100">Scan Barcode</CardTitle>
            <CardDescription className="text-slate-400">
              {userRole === "admin" ? "Scan student or admin barcodes" : "Scan student barcodes only"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Barcode</label>
                <Input
                  type="text"
                  placeholder="Enter 4-digit barcode (e.g., 1001, 2001, 3001)..."
                  value={barcode}
                  onChange={(e) => {
                    // Only allow digits and limit to 4 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setBarcode(value)
                  }}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  disabled={loading}
                  autoFocus
                  maxLength={4}
                />
                <p className="text-xs text-slate-400">
                  Student barcodes start with 1, Admin with 2, Assistant with 3
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                  disabled={loading || barcode.length !== 4}
                >
                  {loading ? "Processing..." : "Process Barcode"}
                </Button>
                {!cameraActive ? (
                  <Button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    📷 Use Camera
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
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
                          onClick={() => handleAddApples(150)}
                          disabled={applesLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          ✓ Attend (+150)
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

        {/* Navigation */}
        <div className="flex gap-2">
          <Link href={`/dashboard/${userName}?role=${userRole}`} className="flex-1">
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-100 hover:bg-slate-700 bg-transparent"
            >
              View Dashboard
            </Button>
          </Link>
          <Button
            onClick={() => {
              sessionStorage.clear()
              router.push("/login")
            }}
            variant="outline"
            className="flex-1 border-red-600 text-red-400 hover:bg-red-500/10"
          >
            Logout
          </Button>
        </div>
      </div>
    </main>
  )
}
