import { useState, useRef, useEffect } from 'react'
import { Camera, X, Upload, CheckCircle } from 'lucide-react'

export default function CameraCapture({ onCapture, onClose }) {
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError('')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }
      })
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions or use upload instead.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || video.clientWidth
    canvas.height = video.videoHeight || video.clientHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob)
        setCapturedImage({
          blob,
          url: imageUrl
        })
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    URL.revokeObjectURL(capturedImage?.url)
    startCamera()
  }

  const usePhoto = () => {
    if (capturedImage && onCapture) {
      // Create a File object from the blob
      const file = new File(
        [capturedImage.blob],
        `camera-capture-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )
      onCapture(file)
      URL.revokeObjectURL(capturedImage.url)
      onClose()
    }
  }

  const handleClose = () => {
    stopCamera()
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.url)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none"></div>
      
      {/* Scan lines */}
      <div className="absolute inset-0 scan-line pointer-events-none"></div>

      <div className="relative bg-cyber-dark border-4 border-cyber-primary w-full max-w-2xl max-h-[90vh] overflow-hidden z-10">
        {/* Header */}
        <div className="border-b-4 border-cyber-primary bg-cyber-dark p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Camera className="w-8 h-8 text-cyber-primary animate-pulse-neon" />
              <div className="absolute inset-0 w-8 h-8 bg-cyber-primary blur-xl opacity-50"></div>
            </div>
            <h2 className="text-3xl font-display font-black text-neon uppercase tracking-wider">
              CAMERA CAPTURE
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="border-4 border-cyber-primary bg-cyber-dark text-cyber-primary hover:bg-cyber-primary hover:text-cyber-darker p-2 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 border-4 border-cyber-secondary bg-cyber-dark p-4">
              <span className="text-cyber-secondary font-mono uppercase tracking-wider">{error}</span>
            </div>
          )}

          {!capturedImage ? (
            <>
              {/* Video Preview */}
              <div className="relative mb-6 bg-black border-4 border-cyber-gray-light overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[60vh]"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-cyber-darker">
                    <div className="text-center">
                      <Camera className="w-20 h-20 text-cyber-gray-light mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-mono text-cyber-gray-light uppercase mb-2">CAMERA INITIALIZING</p>
                      <p className="text-sm font-mono text-cyber-gray-light uppercase tracking-widest">
                        REQUESTING PERMISSION...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Capture Button */}
              <div className="flex justify-center">
                <button
                  onClick={capturePhoto}
                  disabled={!stream}
                  className="btn-cyber flex items-center space-x-2 px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-6 h-6" />
                  <span>CAPTURE PHOTO</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Captured Image Preview */}
              <div className="relative mb-6 bg-black border-4 border-cyber-primary overflow-hidden">
                <img
                  src={capturedImage.url}
                  alt="Captured"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={retakePhoto}
                  className="btn-cyber flex items-center space-x-2 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-cyber-darker"
                >
                  <X className="w-5 h-5" />
                  <span>RETAKE</span>
                </button>
                <button
                  onClick={usePhoto}
                  className="btn-cyber flex items-center space-x-2 border-cyber-accent text-cyber-accent hover:bg-cyber-accent hover:text-cyber-darker"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>USE PHOTO</span>
                </button>
              </div>
            </>
          )}

          {/* Instructions */}
          <div className="mt-6 border-4 border-cyber-gray-light bg-cyber-dark p-4">
            <p className="font-mono font-bold text-cyber-primary uppercase mb-3 text-sm tracking-wider">
              INSTRUCTIONS:
            </p>
            <ul className="text-xs font-mono text-cyber-gray-light space-y-1 uppercase tracking-wider">
              <li>• POSITION FOOD ITEMS IN CENTER OF FRAME</li>
              <li>• ENSURE GOOD LIGHTING FOR BEST RESULTS</li>
              <li>• CAPTURE PHOTO WHEN READY</li>
              <li>• REVIEW AND USE OR RETAKE</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


