"use client"

import type React from "react"

import { useEffect, useState } from "react"
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
}

export default function ScannerPage() {
  const [barcode, setBarcode] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState("")
  const [cameraActive, setCameraActive] = useState(false)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
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
        video: { facingMode: "environment" },
      })
      setVideoStream(stream)
      setCameraActive(true)

      const video = document.getElementById("camera-video") as HTMLVideoElement
      if (video) {
        video.srcObject = stream
      }
    } catch (error) {
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
  }

  const captureFromCamera = () => {
    const video = document.getElementById("camera-video") as HTMLVideoElement
    const canvas = document.getElementById("camera-canvas") as HTMLCanvasElement

    if (video && canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
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
      }
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
            </CardHeader>
            <CardContent className="space-y-4">
              <video id="camera-video" autoPlay playsInline className="w-full rounded border border-slate-600" />
              <canvas id="camera-canvas" className="hidden" />
              <div className="flex gap-2">
                <Button onClick={captureFromCamera} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Capture
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
                  placeholder="Enter or scan barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? "Scanning..." : "Scan"}
                </Button>
                {!cameraActive ? (
                  <Button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    📷 Camera
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
            <CardContent className="pt-6">
              <p className={`text-center font-semibold ${result.success ? "text-green-400" : "text-red-400"}`}>
                {result.message}
              </p>
              {result.name && (
                <p className="text-center text-slate-300 mt-2">
                  {result.name} {result.type && `(${result.type})`}
                </p>
              )}
              {result.apples && <p className="text-center text-emerald-400 font-bold mt-2">+{result.apples} apples</p>}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          <Link href={`/dashboard/${userName}`} className="flex-1">
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
