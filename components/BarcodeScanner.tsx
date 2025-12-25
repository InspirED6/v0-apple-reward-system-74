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
  const html5QrcodeRef = useRef<any>(null)
  const isRunningRef = useRef(false)
  const scannedRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    const startCamera = async () => {
      if (!isMounted || isRunningRef.current || isStarting) return

      setIsStarting(true)
      setError(null)

      try {
        // Dynamic import to ensure client-side only
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")

        // Check if scanner element exists
        const scannerElement = document.getElementById("scanner-reader")
        if (!scannerElement) {
          throw new Error("Scanner container not found")
        }

        // Clean up previous instance if it exists
        if (html5QrcodeRef.current) {
          try {
            if (isRunningRef.current) {
              await html5QrcodeRef.current.stop()
            }
            html5QrcodeRef.current.clear()
          } catch (e) {
            console.warn("Error cleaning up previous scanner:", e)
          }
        }

        // Create new scanner instance
        html5QrcodeRef.current = new Html5Qrcode("scanner-reader")

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          disableFlip: false,
        }

        // Start with rear camera
        const cameraConstraints = { facingMode: "environment" }

        await html5QrcodeRef.current.start(
          cameraConstraints,
          config,
          (decodedText: string) => {
            if (!scannedRef.current) {
              scannedRef.current = true
              console.log("Barcode detected:", decodedText)
              onScanSuccess(decodedText)
            }
          },
          () => {} // No error handler for scanning errors
        )

        if (isMounted) {
          isRunningRef.current = true
          setIsStarting(false)
        }
      } catch (err: any) {
        console.error("Scanner error:", err)
        
        if (!isMounted) return

        const errorMsg = err?.message || err?.toString?.() || "Unknown error"
        let userMessage = "Failed to start camera. Please try again."

        if (errorMsg.includes("Permission") || errorMsg.includes("denied")) {
          userMessage = "Camera permission denied. Please grant camera access."
        } else if (errorMsg.includes("NotFoundError")) {
          userMessage = "No camera found on this device."
        } else if (errorMsg.includes("NotAllowedError")) {
          userMessage = "Camera access not allowed. Please check your browser permissions."
        } else if (errorMsg.includes("NotReadableError")) {
          userMessage = "Camera is in use. Please close other apps using the camera."
        } else if (errorMsg.includes("not found")) {
          userMessage = "Scanner element not found. Please refresh the page."
        }

        setError(userMessage)
        setIsStarting(false)
      }
    }

    const stopCamera = async () => {
      if (html5QrcodeRef.current && isRunningRef.current) {
        try {
          await html5QrcodeRef.current.stop()
          isRunningRef.current = false
          scannedRef.current = false
        } catch (e) {
          console.warn("Error stopping scanner:", e)
        }
      }
    }

    if (isActive) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      isMounted = false
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
          <div className="text-white text-sm">Starting camera...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div
        id="scanner-reader"
        className="rounded-lg overflow-hidden bg-black w-full"
        style={{ minHeight: "300px" }}
      />
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
          Point camera at barcode
        </span>
      </div>
    </div>
  )
}
