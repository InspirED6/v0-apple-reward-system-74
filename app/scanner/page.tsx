"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Quagga from "quagga"

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
  const [quaggaInitialized, setQuaggaInitialized] = useState(false)
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

  // Initialize QuaggaJS
  useEffect(() => {
    return () => {
      if (quaggaInitialized) {
        Quagga.stop()
      }
    }
  }, [quaggaInitialized])

  // Cleanup video stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop())
      }
      if (quaggaInitialized) {
        Quagga.stop()
      }
    }
  }, [videoStream, quaggaInitialized])

  // Add effect to handle video element updates
  useEffect(() => {
    const video = videoRef.current
    if (video && videoStream) {
      video.srcObject = videoStream
      
      const handleLoadedMetadata = () => {
        video.play().catch((error) => {
          console.error("Video play error:", error)
        })
      }
      
      const handleCanPlay = () => {
        video.play().catch((error) => {
          console.error("Video play error:", error)
        })
      }
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('canplay', handleCanPlay)
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('canplay', handleCanPlay)
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
          setVideoReady(true)
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
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop())
      setVideoStream(null)
      setCameraActive(false)
      setIsScanning(false)
      setVideoReady(false)
    }
  }

  const startBarcodeScanning = async () => {
    if (!videoRef.current) return

    setIsScanning(true)
    toast({
      title: "Scanning Started",
      description: "Point the camera at a barcode to scan automatically.",
    })

    try {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: document.querySelector('#scanner-container'),
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          }
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "code_39_vin_reader", "codabar_reader", "upc_reader", "upc_e_reader", "i2of5_reader"]
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true
        }
      }, (err) => {
        if (err) {
          console.error('Quagga initialization error:', err)
          toast({
            title: "Scanning Error",
            description: "Failed to initialize barcode scanner. Please try again.",
            variant: "destructive",
          })
          setIsScanning(false)
          return
        }
        
        setQuaggaInitialized(true)
        Quagga.start()
        
        // Listen for successful scans
        Quagga.onDetected((data) => {
          const scannedCode = data.codeResult.code
          console.log('Barcode detected:', scannedCode)
          
          // Validate the scanned barcode format
          if (/^\d{4}$/.test(scannedCode)) {
            setBarcode(scannedCode)
            setIsScanning(false)
            Quagga.stop()
            toast({
              title: "Barcode Scanned!",
              description: `Detected: ${scannedCode}. Click "Process Barcode" to continue.`,
            })
            // Automatically process the scanned barcode
            setTimeout(() => {
              handleScan({ preventDefault: () => {} } as React.FormEvent)
            }, 500)
          } else {
            toast({
              title: "Invalid Barcode",
              description: "Scanned code must be 4 digits. Please try again.",
              variant: "destructive",
            })
          }
        })
      })
    } catch (error) {
      console.error('Failed to start barcode scanning:', error)
      toast({
        title: "Scanning Error",
        description: "Failed to start barcode scanning. Please try again.",
        variant: "destructive",
      })
      setIsScanning(false)
    }
  }

  const stopBarcodeScanning = () => {
    if (quaggaInitialized) {
      Quagga.stop()
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
                {cameraLoading ? "Starting camera..." : isScanning ? "Point camera at barcode to scan automatically" : "Camera ready - click 'Start Scanning' to scan barcodes"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div id="scanner-container" className="relative bg-black rounded-lg overflow-hidden min-h-[256px] flex items-center justify-center">
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
                          <div className="text-xs">
                            {isScanning ? "Scanning for barcodes..." : "Click 'Start Scanning' to scan barcodes"}
                          </div>
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
                    onClick={startCamera}
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
