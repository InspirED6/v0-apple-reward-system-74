"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
  isActive: boolean
}

export default function BarcodeScanner({ onScanSuccess, isActive }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const html5QrcodeRef = useRef<any>(null)
  const isRunningRef = useRef(false)
  const retryCountRef = useRef(0)

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current && isRunningRef.current) {
      try {
        await html5QrcodeRef.current.stop()
        isRunningRef.current = false
      } catch (e) {
        console.warn("Error stopping scanner:", e)
      }
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (isRunningRef.current || isStarting) return
    
    setIsStarting(true)
    setError(null)

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      
      // Clean up any existing instance
      if (html5QrcodeRef.current && isRunningRef.current) {
        try {
          await html5QrcodeRef.current.stop()
          await html5QrcodeRef.current.clear()
        } catch (e) {
          console.warn("Error clearing previous scanner:", e)
        }
      }
      
      html5QrcodeRef.current = new Html5Qrcode("scanner-reader")

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.5,
        disableFlip: false,
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

      // Try with environment camera first, then fallback to any camera
      let cameraConstraints: any = { facingMode: "environment" }
      
      try {
        await html5QrcodeRef.current.start(
          cameraConstraints,
          config,
          (decodedText: string) => {
            console.log("Scanned:", decodedText)
            onScanSuccess(decodedText)
          },
          () => {}
        )
      } catch (err: any) {
        // If environment mode fails, try without facingMode constraint
        if (err?.toString?.().includes("NotFoundError") || err?.toString?.().includes("ConstraintError")) {
          console.log("Environment camera not available, trying without constraint...")
          cameraConstraints = { deviceId: { ideal: [] } }
          await html5QrcodeRef.current.start(
            cameraConstraints,
            config,
            (decodedText: string) => {
              console.log("Scanned:", decodedText)
              onScanSuccess(decodedText)
            },
            () => {}
          )
        } else {
          throw err
        }
      }
      
      isRunningRef.current = true
      retryCountRef.current = 0
    } catch (err: any) {
      console.error("Scanner error:", err)
      const errorStr = err?.toString?.() || JSON.stringify(err)
      
      if (errorStr.includes("Permission") || errorStr.includes("denied")) {
        setError("Camera permission denied. Please enable camera access in your browser settings and try again.")
      } else if (errorStr.includes("NotFoundError")) {
        setError("No camera found on this device.")
      } else if (errorStr.includes("NotAllowedError")) {
        setError("Camera permission required. Please grant camera access when prompted.")
      } else if (errorStr.includes("NotReadableError")) {
        setError("Camera is in use by another application. Please close it and try again.")
      } else {
        setError(`Failed to start camera: ${err?.message || "Unknown error"}. Please try again.`)
      }
    } finally {
      setIsStarting(false)
    }
  }, [onScanSuccess, isStarting])

  useEffect(() => {
    if (isActive) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isActive, startScanner, stopScanner])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900 rounded-lg">
        <div className="text-center p-4">
          <div className="text-red-400 mb-2">Camera Error</div>
          <div className="text-slate-400 text-sm">{error}</div>
        </div>
      </div>
    )
  }

  if (isStarting) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-sm">Starting camera...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div 
        id="scanner-reader" 
        className="rounded-lg overflow-hidden"
        style={{ minHeight: "300px" }}
      />
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
          Point camera at a 4-digit barcode
        </span>
      </div>
    </div>
  )
}
