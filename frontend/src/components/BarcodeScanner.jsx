import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Scan, CheckCircle, AlertCircle } from 'lucide-react'

export default function BarcodeScanner({ onScan, onClose }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [lastScannedCode, setLastScannedCode] = useState(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)
  const lastScannedCodeRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
        html5QrCodeRef.current.clear().catch(() => {})
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setLastScannedCode(null)
      lastScannedCodeRef.current = null
      
      if (!scannerRef.current) {
        setError('Scanner element not found')
        return
      }

      const scannerElementId = scannerRef.current.id

      // Ensure container is ready
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if scanner already exists
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop()
          html5QrCodeRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      const html5QrCode = new Html5Qrcode(scannerElementId)
      html5QrCodeRef.current = html5QrCode

      // Get available cameras
      const devices = await Html5Qrcode.getCameras()
      
      if (devices && devices.length === 0) {
        throw new Error('No cameras found. Please check camera permissions.')
      }

      // Use back camera if available, otherwise use first camera
      const cameraId = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      )?.id || devices[0].id

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false
        },
        (decodedText, decodedResult) => {
          // Success callback - use ref to avoid stale closure
          if (decodedText && decodedText !== lastScannedCodeRef.current) {
            lastScannedCodeRef.current = decodedText
            setLastScannedCode(decodedText)
            handleScanSuccess(decodedText)
          }
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
          // Only log if it's not a common "not found" error
          if (!errorMessage.includes('No QR code found') && !errorMessage.includes('NotFoundException')) {
            console.debug('Scanning:', errorMessage)
          }
        }
      )
      
      // Set scanning state after successful start
      setScanning(true)
      
      // Force video to play if it exists
      setTimeout(() => {
        const scannerElement = document.getElementById('barcode-scanner')
        if (scannerElement) {
          const video = scannerElement.querySelector('video')
          // Force video to play if it exists
          if (video && video.paused) {
            video.play().catch(err => console.error('Error playing video:', err))
          }
        }
      }, 1000)
    } catch (err) {
      console.error('Error starting scanner:', err)
      let errorMsg = err.message || 'Failed to start camera'
      
      if (err.message && err.message.includes('Permission')) {
        errorMsg = 'Camera permission denied. Please allow camera access and try again.'
      } else if (err.message && err.message.includes('NotFoundError')) {
        errorMsg = 'No camera found. Please connect a camera and try again.'
      } else if (err.message && err.message.includes('NotAllowedError')) {
        errorMsg = 'Camera access denied. Please enable camera permissions in your browser settings.'
      }
      
      setError(errorMsg)
      setScanning(false)
      
      // Clean up on error
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop()
          html5QrCodeRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        html5QrCodeRef.current = null
      }
    }
  }

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
        html5QrCodeRef.current = null
      }
      setScanning(false)
      setLastScannedCode(null)
      lastScannedCodeRef.current = null
    } catch (err) {
      console.error('Error stopping scanner:', err)
      // Force cleanup even if stop fails
      html5QrCodeRef.current = null
      setScanning(false)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const barcode = manualBarcode.trim()
    if (barcode) {
      handleScanSuccess(barcode)
      setManualBarcode('')
    }
  }

  const handleScanSuccess = async (barcode) => {
    await stopScanning()
    if (onScan) {
      onScan(barcode)
    }
  }

  const handleClose = async () => {
    await stopScanning()
    if (onClose) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div 
        className="card-cyber border-4 border-cyber-primary max-w-2xl w-full relative"
        style={{ 
          pointerEvents: 'auto', 
          zIndex: 51,
          isolation: 'isolate'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold text-cyber-primary uppercase tracking-wider">
            SCAN BARCODE
          </h2>
          <button
            onClick={handleClose}
            className="text-cyber-gray-light hover:text-cyber-primary transition-colors relative z-10"
            style={{ pointerEvents: 'auto' }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 border-2 border-cyber-secondary bg-cyber-dark flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-cyber-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-cyber-secondary font-mono text-sm font-bold uppercase mb-1">ERROR</p>
              <p className="text-cyber-secondary font-mono text-xs">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-6 relative z-10" style={{ pointerEvents: 'auto' }}>
          <div
            id="barcode-scanner"
            ref={scannerRef}
            style={{ 
              width: '100%',
              aspectRatio: '1 / 1',
              minHeight: '300px',
              position: 'relative',
              backgroundColor: scanning ? '#000000' : '#0a0a0a',
              border: '4px solid #00ff41',
              borderRadius: '8px',
              overflow: 'visible'
            }}
          >
            {!scanning && (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '8px',
                  zIndex: 1
                }}
              >
                <div className="text-center">
                  <Scan className="w-16 h-16 text-cyber-gray-light mx-auto mb-4 opacity-50" />
                  <p className="text-cyber-gray-light font-mono text-sm uppercase">Camera preview will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 relative z-10" style={{ pointerEvents: 'auto' }}>
          {!scanning ? (
            <button
              onClick={startScanning}
              className="btn-cyber flex-1 flex items-center justify-center space-x-2 border-cyber-primary text-cyber-primary hover:bg-cyber-primary hover:text-cyber-darker relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <Scan className="w-5 h-5" />
              <span>START SCANNING</span>
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="btn-cyber flex-1 flex items-center justify-center space-x-2 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-cyber-darker relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <X className="w-5 h-5" />
              <span>STOP SCANNING</span>
            </button>
          )}
          <button
            onClick={handleClose}
            className="btn-cyber border-cyber-gray-light text-cyber-gray-light hover:border-cyber-secondary hover:text-cyber-secondary relative z-10"
            style={{ pointerEvents: 'auto' }}
          >
            CANCEL
          </button>
        </div>

        {lastScannedCode && (
          <div className="mt-4 p-4 border-2 border-cyber-primary bg-cyber-dark flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-cyber-primary" />
            <div>
              <p className="text-xs font-mono text-cyber-gray-light uppercase mb-1">SCANNED CODE</p>
              <p className="font-mono font-bold text-cyber-primary">{lastScannedCode}</p>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t-2 border-cyber-gray-light relative z-10" style={{ pointerEvents: 'auto' }}>
          <p className="text-xs font-mono text-cyber-gray-light uppercase mb-2">OR ENTER MANUALLY</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Enter barcode number"
              className="flex-1 px-4 py-2 bg-cyber-dark border-2 border-cyber-gray-light text-cyber-primary font-mono focus:outline-none focus:border-cyber-primary transition-colors relative z-10"
              style={{ pointerEvents: 'auto' }}
            />
            <button
              type="submit"
              disabled={!manualBarcode.trim()}
              className="btn-cyber border-cyber-primary text-cyber-primary hover:bg-cyber-primary hover:text-cyber-darker disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              SUBMIT
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

