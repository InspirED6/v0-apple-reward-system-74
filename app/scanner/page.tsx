"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch((err) => {
          console.error("[v0] Video play error:", err)
          toast({
            title: "Video Error",
            description: "Failed to play video stream",
            variant: "destructive",
          })
        })
      }
      setCameraActive(true)
      startBarcodeDetection()
    } catch (error) {
      console.error("[v0] Camera access error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unable to access camera. Please check permissions."
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const startBarcodeDetection = () => {
    const detectBarcode = () => {
      if (!videoRef.current || !canvasRef.current || !cameraActive) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Convert to grayscale and detect edges
        let barcodePattern = ""
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
          barcodePattern += brightness < 128 ? "1" : "0"
        }

        // Look for barcode-like patterns (alternating dark/light bars)
        const patterns = barcodePattern.match(/(?:1{2,}0{2,}){3,}/g)
        if (patterns && patterns.length > 0) {
          const detectedCode = patterns[0].substring(0, 30)
          if (detectedCode.length > 10 && detectedCode !== barcode) {
            setBarcode(detectedCode)
            stopCamera()
            return
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectBarcode)
    }

    animationFrameRef.current = requestAnimationFrame(detectBarcode)
  }

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
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
      console.error("[v0] Scan error:", error)
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
      console.error("[v0] Add apples error:", error)
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-red-600">🍎 Barcode Scanner</h1>
          <Link href="/profile">
            <Button variant="outline">Profile</Button>
          </Link>
        </div>
        <p className="text-gray-600 mt-2">
          Scanning as: <span className="font-semibold">{userName}</span> (
          <span className="text-red-600">{userRole}</span>)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Camera View</CardTitle>
              <CardDescription>{cameraActive ? "Camera is active" : "Start camera to scan barcodes"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cameraActive ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <Button onClick={stopCamera} variant="destructive" className="w-full">
                    Stop Camera
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Camera is not active</p>
                  <Button onClick={startCamera} className="w-full bg-red-600 hover:bg-red-700">
                    Start Camera
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Barcode Input Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Barcode Input</CardTitle>
              <CardDescription>Enter or scan a barcode</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScan} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  autoFocus
                />
                <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700">
                  {loading ? "Scanning..." : "Scan"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result Section */}
          {result && (
            <Card className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardHeader>
                <CardTitle className={result.success ? "text-green-700" : "text-red-700"}>
                  {result.success ? "✓ Success" : "✗ Failed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{result.message}</p>

                {result.success && result.type && (
                  <>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">Name:</span> {result.name}
                      </p>
                      <p>
                        <span className="font-semibold">Type:</span> {result.type}
                      </p>
                      <p>
                        <span className="font-semibold">Apples:</span> {result.apples}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleAddApples(1)}
                        disabled={applesLoading}
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        +1 Apple
                      </Button>
                      <Button
                        onClick={() => handleAddApples(-1)}
                        disabled={applesLoading}
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        -1 Apple
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
