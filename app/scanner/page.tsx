"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
// We'll use a simpler approach without external libraries for now

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
  const [cameraLoading, setCameraLoading] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
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

  // Cleanup video stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [videoStream])

  const startCamera = async () => {
    setCameraLoading(true)
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this device")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        },
        audio: false
      })
      
      setVideoStream(stream)
      setCameraActive(true)
      setIsScanning(false)
      setCameraLoading(false)

      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        video.setAttribute('autoplay', 'true')
        
        // Add event listeners for debugging
        video.addEventListener('loadedmetadata', () => {
          console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight)
          // Force video to play after metadata is loaded
          video.play().catch(console.error)
        })
        
        video.addEventListener('canplay', () => {
          console.log('Video can play')
          setVideoReady(true)
          video.play().catch(console.error)
        })
        
        video.addEventListener('loadeddata', () => {
          console.log('Video data loaded')
          video.play().catch(console.error)
        })
        
        // Ensure video plays immediately
        video.play().catch((playError) => {
          console.error('Video play error:', playError)
          toast({
            title: "Video Playback Error",
            description: "Camera started but video may not be visible. Try refreshing the page.",
            variant: "destructive",
          })
        })

        // Force play after a short delay to ensure video is ready
        setTimeout(() => {
          if (video.paused) {
            video.play().catch(console.error)
          }
        }, 500)
      }

        // Check if video is actually playing
        setTimeout(() => {
          const video = videoRef.current
          if (video) {
            console.log('Video state:', {
              paused: video.paused,
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              srcObject: !!video.srcObject
            })
            
            if (video.paused || video.readyState < 2) {
              console.log('Video not ready, attempting to play again')
              video.play().catch(console.error)
            }
            
            // If video still not ready after 2 seconds, show warning
            if (!videoReady && (video.paused || video.readyState < 2)) {
              toast({
                title: "Camera Display Issue",
                description: "Camera is active but video may not be visible. You can still use manual entry below.",
                variant: "destructive",
              })
            }
          }
        }, 2000)

      toast({
        title: "Camera Ready",
        description: "Camera is ready. You can manually enter barcodes or use the camera for visual reference.",
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
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop())
      setVideoStream(null)
      setCameraActive(false)
      setIsScanning(false)
      setVideoReady(false)
    }
  }

  const captureFromCamera = () => {
    // Simple camera capture - user can manually enter the barcode they see
    setIsScanning(true)
    toast({
      title: "Manual Entry",
      description: "Please manually enter the barcode you see in the camera view.",
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
        {(cameraActive || cameraLoading) && (
          <Card className="mb-6 border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-slate-100">Camera View</CardTitle>
              <CardDescription className="text-slate-400">
                {cameraLoading ? "Starting camera..." : isScanning ? "Point camera at barcode to scan automatically" : "Camera ready"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden min-h-[256px] flex items-center justify-center">
                {cameraLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <div className="text-white text-sm">Starting camera...</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted
                      className="w-full h-64 object-cover"
                      style={{ 
                        transform: 'scaleX(-1)',
                        backgroundColor: '#000',
                        minHeight: '256px'
                      }}
                      onLoadStart={() => console.log('Video load started')}
                      onLoadedData={() => console.log('Video data loaded')}
                      onError={(e) => {
                        console.error('Video error:', e)
                        toast({
                          title: "Video Error",
                          description: "Failed to load camera video. Please try refreshing the camera.",
                          variant: "destructive",
                        })
                      }}
                      onCanPlay={() => {
                        console.log('Video can play')
                        videoRef.current?.play().catch(console.error)
                      }}
                      onPlay={() => {
                        console.log('Video playing')
                        setVideoReady(true)
                      }}
                      onPause={() => console.log('Video paused')}
                      onStalled={() => console.log('Video stalled')}
                    />
                    {/* Camera status indicator */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`rounded-lg p-4 border ${videoReady ? 'bg-green-500/20 border-green-400' : 'bg-black/50 border-white/20'}`}>
                        <div className="text-white text-sm text-center">
                          <div className="mb-2">📷 Camera View</div>
                          <div className="text-xs">Manually enter barcode below</div>
                          {videoReady ? (
                            <div className="text-xs text-green-300 mt-1">
                              ✓ Camera active
                            </div>
                          ) : (
                            <div className="text-xs text-yellow-300 mt-1">
                              Loading camera...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 border-2 border-green-400 rounded-lg pointer-events-none">
                      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-green-400"></div>
                      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-green-400"></div>
                      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-green-400"></div>
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-green-400"></div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={captureFromCamera} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={cameraLoading}
                >
                  📷 Camera Help
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
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    📷 Use Camera
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
