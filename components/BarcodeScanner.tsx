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
      
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode("scanner-reader")
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.5,
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

      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText: string) => {
          console.log("Scanned:", decodedText)
          onScanSuccess(decodedText)
        },
        () => {}
      )
      
      isRunningRef.current = true
    } catch (err: any) {
      console.error("Scanner error:", err)
      if (err?.message?.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access.")
      } else if (err?.message?.includes("NotFoundError")) {
        setError("No camera found on this device.")
      } else {
        setError("Failed to start camera. Please try again.")
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
