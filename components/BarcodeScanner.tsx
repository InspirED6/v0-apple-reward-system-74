"use client"

import { useEffect, useRef, useState } from "react"

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
  isActive: boolean
}

export default function BarcodeScanner({ onScanSuccess, isActive }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const quaggaRef = useRef<any>(null)
  const isRunningRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const initScanner = async () => {
      if (!isMountedRef.current || isRunningRef.current) return

      setIsStarting(true)
      setError(null)

      try {
        const Quagga = await import("quagga").then((m) => m.default)

        // Stop any existing scanner
        if (isRunningRef.current) {
          try {
            Quagga.stop()
          } catch (e) {
            console.warn("Error stopping previous scanner:", e)
          }
          isRunningRef.current = false
        }

        // Initialize Quagga
        await new Promise<void>((resolve, reject) => {
          Quagga.init(
            {
              inputStream: {
                type: "LiveStream",
                constraints: {
                  width: { min: 640 },
                  height: { min: 480 },
                  facingMode: "environment",
                },
                target: "#scanner-reader",
              },
              decoder: {
                workers: 2,
                debug: false,
              },
              locator: {
                patchSize: "medium",
                halfSample: true,
              },
              numOfWorkers: 2,
              frequency: 10,
            },
            (err: any) => {
              if (err) {
                console.error("Quagga init error:", err)
                reject(new Error(`Failed to initialize scanner: ${err?.message || err}`))
              } else {
                console.log("Quagga initialized successfully")
                resolve()
              }
            }
          )
        })

        // Start the scanner
        Quagga.start()
        console.log("Quagga started")

        // Set up detection handler
        const detectionHandler = (result: any) => {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code
            console.log("Barcode detected:", code)

            // Validate barcode format
            if (/^\d{4}$/.test(code) || code.length > 0) {
              onScanSuccess(code)
              // Stop after detection
              try {
                Quagga.stop()
                isRunningRef.current = false
              } catch (e) {
                console.warn("Error stopping scanner:", e)
              }
            }
          }
        }

        Quagga.onDetected(detectionHandler)
        quaggaRef.current = { Quagga, detectionHandler }
        isRunningRef.current = true

        if (isMountedRef.current) {
          setIsStarting(false)
        }
      } catch (err: any) {
        console.error("Scanner initialization error:", err)

        if (!isMountedRef.current) return

        const errorMsg = err?.message || err?.toString?.() || "Unknown error"
        let userMessage = "Failed to start camera. Please try again."

        if (errorMsg.includes("Permission") || errorMsg.includes("denied")) {
          userMessage = "Camera permission denied. Please grant camera access."
        } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("not find")) {
          userMessage = "No camera found on this device."
        } else if (errorMsg.includes("NotAllowedError")) {
          userMessage = "Camera access not allowed. Please check browser permissions."
        } else if (errorMsg.includes("NotReadableError")) {
          userMessage = "Camera is in use. Close other apps using the camera."
        } else if (errorMsg.includes("video")) {
          userMessage = "Could not access video stream. Check camera permissions."
        }

        setError(userMessage)
        setIsStarting(false)
      }
    }

    const stopScanner = async () => {
      if (isRunningRef.current && quaggaRef.current?.Quagga) {
        try {
          const { Quagga, detectionHandler } = quaggaRef.current
          Quagga.offDetected()
          Quagga.stop()
          isRunningRef.current = false
          console.log("Scanner stopped")
        } catch (e) {
          console.warn("Error stopping scanner:", e)
        }
      }
    }

    if (isActive) {
      initScanner()
    } else {
      stopScanner()
    }

    return () => {
      isMountedRef.current = false
      stopScanner()
    }
  }, [isActive, onScanSuccess])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900 rounded-lg">
        <div className="text-center p-4">
          <div className="text-red-400 mb-2 font-semibold">Camera Error</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    )
  }

  if (isStarting) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-sm">Initializing scanner...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div id="scanner-reader" className="rounded-lg overflow-hidden bg-black w-full" style={{ minHeight: "300px" }} />
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">Point camera at barcode</span>
      </div>
    </div>
  )
}
