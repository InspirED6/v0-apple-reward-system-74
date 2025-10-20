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
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [applesLoading, setApplesLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.error("[v0] Error playing video:", err)
            toast({
              title: "Camera Error",
              description: "Unable to play camera stream.",
              variant: "destructive",
            })
          })
        }
      }

      setVideoStream(stream)
      setCameraActive(true)
    } catch (error) {
      console.error("[v0] Camera error:", error)
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
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      // Simple barcode detection from canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Look for dark pixels that might indicate a barcode
      let barcodeString = ""
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
        if (brightness < 128) {
          barcodeString += "1"
        } else {
          barcodeString += "0"
        }
      }

      // Extract potential barcode (simplified)
      const match = barcodeString.match(/1{3,}0{3,}1{3,}/)
      if (match) {
        setBarcode(match[0].substring(0, 20))
      }
    } else {
      toast({
        title: "Camera Not Ready",
        description: "Please wait for the camera to fully load.",
        variant: "destructive",
      })
    }
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🍎 Barcode Scanner</h1>
          <p className="text-muted-foreground">
            Scanning as: {userName} ({userRole})
          </p>
        </div>

        {/* Camera Section */}
        {cameraActive && (
          <Card>
            <CardHeader>
              <CardTitle>Camera View</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full bg-black rounded-lg"
                style={{ maxHeight: "400px", objectFit: "cover", display: "block" }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <Button onClick={captureFromCamera} className="flex-1">
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline" className="flex-1 bg-transparent">
                  Close Camera
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Barcode Input</CardTitle>
            <CardDescription>{cameraActive ? "Or enter manually" : "Enter barcode or open camera"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1"
                />
                {!cameraActive && (
                  <Button type="button" onClick={startCamera} variant="outline">
                    📷 Camera
                  </Button>
                )}
              </div>
              <Button type="submit" disabled={loading || !barcode.trim()} className="w-full">
                {loading ? "Scanning..." : "Scan"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result Section */}
        {result && (
          <Card className={result.success ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <CardTitle>{result.success ? "✓ Success" : "✗ Failed"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{result.message}</p>
              {result.type && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Type:</span> {result.type}
                    </div>
                    <div>
                      <span className="font-semibold">Name:</span> {result.name}
                    </div>
                    <div>
                      <span className="font-semibold">Apples:</span> {result.apples}
                    </div>
                  </div>
                  {result.type === "student" && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleAddApples(1)} disabled={applesLoading} className="flex-1">
                        +1 Apple
                      </Button>
                      <Button
                        onClick={() => handleAddApples(-1)}
                        disabled={applesLoading}
                        variant="outline"
                        className="flex-1"
                      >
                        -1 Apple
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-2 justify-center">
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
          <Button
            onClick={() => {
              sessionStorage.clear()
              router.push("/login")
            }}
            variant="destructive"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
