"use client"

import { useEffect, useRef, useState } from "react"
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from "html5-qrcode"

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
  isActive: boolean
}

export default function BarcodeScanner({ onScanSuccess, onScanError, isActive }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isActive) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {
          console.warn("Error clearing scanner:", e)
        }
        scannerRef.current = null
        setIsInitialized(false)
      }
      return
    }

    if (isInitialized) return

    // Small delay to ensure the container is in the DOM
    const initTimer = setTimeout(() => {
      const container = document.getElementById("scanner-container")
      if (!container) {
        console.error("Scanner container not found")
        return
      }

      try {
        scannerRef.current = new Html5QrcodeScanner(
          "scanner-container",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
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
          },
          /* verbose= */ false
        )

        scannerRef.current.render(
          (decodedText: string) => {
            console.log("Barcode detected:", decodedText)
            onScanSuccess(decodedText)
          },
          (errorMessage: string) => {
            // Ignore frequent scan failures/noise
            if (onScanError) {
              onScanError(errorMessage)
            }
          }
        )

        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to initialize scanner:", error)
      }
    }, 200)

    return () => {
      clearTimeout(initTimer)
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {
          console.warn("Error clearing scanner on unmount:", e)
        }
        scannerRef.current = null
      }
    }
  }, [isActive, isInitialized, onScanSuccess, onScanError])

  return (
    <div 
      id="scanner-container" 
      className="relative bg-black rounded-lg overflow-hidden min-h-[300px]"
    />
  )
}
