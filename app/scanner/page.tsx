"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from "html5-qrcode"

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
  const [cameraLoading, setCameraLoading] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [autoStarted, setAutoStarted] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
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
  }, [router])

  // Auto-start camera and scanning best-effort on first load
  useEffect(() => {
    if (autoStarted) return
    ;(async () => {
      try {
        await startCamera()
        setAutoStarted(true)
        await startBarcodeScanning()
      } catch {
        // Ignore failures; user can manually start
        setAutoStarted(true)
      }
    })()
  }, [autoStarted])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch {}
      }
    }
  }, [])


  const startCamera = async () => {
    setCameraLoading(true)
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this device")
      }

      // Test camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        },
        audio: false
      })
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      setCameraActive(true)
      setIsScanning(false)
      setCameraLoading(false)

      toast({
        title: "Camera Ready",
        description: "Camera is ready. Click 'Start Scanning' to scan barcodes automatically.",
      })
    } catch (error) {
      console.error("Camera error:", error)
      setCameraLoading(false)
      
      let errorMessage = "Unable to access camera. Please check permissions."
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera permission denied. Please allow camera access and try again."
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No camera found on this device."
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Camera not supported on this device or browser."
        }
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (scannerRef.current) {
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setCameraActive(false)
    setIsScanning(false)
    setVideoReady(false)
  }

  const startBarcodeScanning = async () => {
    setIsScanning(true)
    toast({
      title: "Scanning Started",
      description: "Point the camera at a barcode to scan automatically.",
    })

    try {
      // Ensure container exists (in case state hasn't rendered yet)
      if (!document.getElementById("scanner-container")) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      scannerRef.current = new Html5QrcodeScanner(
        "scanner-container",
        {
          fps: 12,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          // Prefer environment camera and support 1D barcodes
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
          ],
        }
      )

      scannerRef.current.render(
        (decodedText) => {
          console.log('Barcode detected:', decodedText)

          // Validate the scanned barcode format
          if (/^\d{4}$/.test(decodedText)) {
            setBarcode(decodedText)
            setIsScanning(false)
            try { scannerRef.current?.clear() } catch {}
            toast({
              title: "Barcode Scanned!",
              description: `Detected: ${decodedText}. Click "Process Barcode" to continue.`,
            })
            // Automatically process the scanned barcode
            setTimeout(() => {
              handleScan({ preventDefault: () => {} } as React.FormEvent, { auto: true })
            }, 500)
          } else {
            toast({
              title: "Invalid Barcode",
              description: "Scanned code must be 4 digits. Please try again.",
              variant: "destructive",
            })
          }
        },
        (_errorMessage) => {
          // Ignore frequent scan failures/noise
        }
      )
    } catch (error) {
      console.error("Failed to start barcode scanning:", error)
      toast({
        title: "Scanning Error",
        description: "Failed to start barcode scanning. Please try again.",
        variant: "destructive",
      })
      setIsScanning(false)
    }
  }

  const stopBarcodeScanning = () => {
    if (scannerRef.current) {
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const captureFromCamera = () => {
    if (isScanning) {
      stopBarcodeScanning()
    } else {
      startBarcodeScanning()
    }
  }

  const handleScan = async (
    e: React.FormEvent | null,
    options?: { auto?: boolean }
  ) => {
    if (e) e.preventDefault()

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
        // Auto-award apples on successful scan when triggered by camera
        if (options?.auto) {
          if (data?.type === "student" && data?.studentId) {
            await handleAddApples(1, { type: "student", id: data.studentId })
          } else if (data?.type === "assistant" && data?.assistantId) {
            await handleAddApples(150, { type: "assistant", id: data.assistantId })
          }
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

  const handleAddApples = async (
    amount: number,
    target?: { type: "student" | "assistant"; id: string }
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
        {(cameraActive || cameraLoading) && (
          <Card className="mb-6 border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Camera View</CardTitle>
              <CardDescription className="text-slate-400">
                {cameraLoading ? "Starting camera..." : isScanning ? "Point camera at barcode to scan automatically" : "Camera ready - click 'Start Scanning' to scan barcodes"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div id="scanner-container" className="relative bg-black rounded-lg overflow-hidden min-h-[256px] flex items-center justify-center">
                {!cameraLoading && (
                  <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs pointer-events-none">
                    {isScanning ? (
                      <div className="text-green-300">Point camera at a 4-digit barcode</div>
                    ) : (
                      <div className="text-slate-300">Click 'Start Scanning' to scan barcodes</div>
                    )}
                  </div>
                )}
                {cameraLoading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <div className="text-white text-sm">Starting camera...</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={captureFromCamera} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={cameraLoading}
                >
                  {isScanning ? "🛑 Stop Scanning" : "📷 Start Scanning"}
                </Button>
                <Button
                  onClick={() => {
                    stopCamera()
                    setTimeout(() => startCamera(), 100)
                  }}
                  variant="outline"
                  className="flex-1 border-yellow-600 text-yellow-400 hover:bg-yellow-500/10"
                  disabled={cameraLoading}
                >
                  🔄 Refresh Camera
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-100 hover:bg-slate-700 bg-transparent"
                  disabled={cameraLoading}
                >
                  Close Camera
                </Button>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="font-semibold">How to use:</div>
                <div>• Click "Start Scanning" to begin automatic barcode detection</div>
                <div>• Point camera at 4-digit barcodes (1001, 2001, 3001, etc.)</div>
                <div>• Scanned barcodes will be automatically processed</div>
                <div>• You can also manually enter barcodes below</div>
                <div className="font-semibold mt-2">Troubleshooting:</div>
                <div>• If camera shows black screen, try refreshing the page</div>
                <div>• Ensure camera permissions are granted</div>
                <div>• Make sure you're using HTTPS (required for camera access)</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scanner Input */}
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
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Sample barcodes for testing:</div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setBarcode("1001")}
                      className="px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600"
                    >
                      1001 (Student)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcode("2001")}
                      className="px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600"
                    >
                      2001 (Admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcode("3001")}
                      className="px-2 py-1 bg-slate-700 rounded text-slate-300 hover:bg-slate-600"
                    >
                      3001 (Assistant)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                  disabled={loading || barcode.length !== 4}
                >
                  {loading ? "Processing..." : "Process Barcode"}
                </Button>
                {!cameraActive && !cameraLoading ? (
                  <Button
                    type="button"
                    onClick={async () => { await startCamera(); await startBarcodeScanning() }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    📷 Open Camera
                  </Button>
                ) : cameraLoading ? (
                  <Button
                    type="button"
                    disabled
                    className="flex-1 bg-blue-600/50 text-white"
                  >
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting Camera...
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
