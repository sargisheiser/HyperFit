import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Sparkles, Loader, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import api from '../services/api'

/**
 * FoodRecognitionCamera Component
 * Advanced camera component with real-time OpenAI Vision API integration
 * 
 * @param {Object} props
 * @param {Function} props.onSuccess - Callback when meal is successfully analyzed
 * @param {Function} props.onClose - Callback to close the camera
 */
export default function FoodRecognitionCamera({ onSuccess, onClose }) {
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('camera') // 'camera' | 'preview' | 'analyzing' | 'result'
  
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
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
        setStep('preview')
        stopCamera()
      }
    }, 'image/jpeg', 0.95) // High quality for better AI analysis
  }

  const analyzeImage = async () => {
    if (!capturedImage) return

    setStep('analyzing')
    setAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      // Create FormData with the captured image
      const formData = new FormData()
      const file = new File(
        [capturedImage.blob],
        `food-recognition-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )
      formData.append('file', file)

      // Call the upload-and-analyze endpoint
      const response = await api.post('/api/meals/upload-and-analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAnalysisResult(response.data)
      setStep('result')
      
      // Call success callback
      if (onSuccess) {
        onSuccess(response.data)
      }

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose()
      }, 3000)

    } catch (err) {
      console.error('Error analyzing meal:', err)
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Failed to analyze meal. Please try again.'
      )
      setStep('preview') // Go back to preview
    } finally {
      setAnalyzing(false)
    }
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setAnalysisResult(null)
    setError(null)
    setStep('camera')
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    startCamera()
  }

  const handleClose = () => {
    stopCamera()
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    if (onClose) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Scan lines */}
        <div className="absolute inset-0 scan-line pointer-events-none opacity-30" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative bg-black border-4 border-cyan-500 w-full max-w-4xl max-h-[90vh] overflow-hidden z-10"
          style={{
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.6), inset 0 0 40px rgba(0, 255, 255, 0.1)'
          }}
        >
          {/* Header */}
          <div className="border-b-4 border-cyan-500 bg-black p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-cyan-500 animate-pulse" />
                <div 
                  className="absolute inset-0 w-8 h-8 blur-xl"
                  style={{ backgroundColor: '#00FFFF', opacity: 0.5 }}
                />
              </div>
              <div>
                <h2 
                  className="text-3xl font-bold uppercase tracking-wider"
                  style={{
                    color: '#00FFFF',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    fontFamily: "'Orbitron', sans-serif"
                  }}
                >
                  AI FOOD RECOGNITION
                </h2>
                <p className="text-sm text-gray-400 uppercase tracking-wider mt-1">
                  Powered by OpenAI Vision
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="border-2 border-cyan-500 bg-black text-cyan-500 hover:bg-cyan-500 hover:text-black transition-all p-2"
              style={{
                boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 border-2 border-red-500 bg-black p-4"
                style={{
                  boxShadow: '0 0 20px rgba(255, 0, 127, 0.5)'
                }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-500 font-mono uppercase tracking-wider">{error}</span>
                </div>
              </motion.div>
            )}

            {/* Camera View */}
            {step === 'camera' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Video Preview */}
                <div className="relative bg-black border-4 border-cyan-500 overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto max-h-[60vh]"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {!stream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <div className="text-center">
                        <Loader className="w-20 h-20 text-cyan-500 mx-auto mb-4 animate-spin" />
                        <p 
                          className="text-lg font-mono uppercase mb-2"
                          style={{ color: '#00FFFF' }}
                        >
                          CAMERA INITIALIZING
                        </p>
                        <p className="text-sm font-mono text-gray-400 uppercase tracking-widest">
                          REQUESTING PERMISSION...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Capture overlay guides */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div 
                        className="border-2 border-dashed"
                        style={{
                          width: '300px',
                          height: '300px',
                          borderColor: 'rgba(0, 255, 255, 0.5)',
                          boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Capture Button */}
                <div className="flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={capturePhoto}
                    disabled={!stream}
                    className="px-8 py-4 border-4 border-cyan-500 bg-black text-cyan-500 uppercase font-bold tracking-wider text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    style={{
                      boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                      fontFamily: "'Orbitron', sans-serif"
                    }}
                  >
                    <Camera className="w-6 h-6" />
                    <span>CAPTURE FOOD</span>
                  </motion.button>
                </div>

                {/* Instructions */}
                <div className="border-2 border-cyan-500/30 bg-black/50 p-4">
                  <p 
                    className="font-mono font-bold uppercase mb-3 text-sm tracking-wider"
                    style={{ color: '#00FFFF' }}
                  >
                    INSTRUCTIONS:
                  </p>
                  <ul className="text-xs font-mono text-gray-400 space-y-1 uppercase tracking-wider">
                    <li>• Position food items in center of frame</li>
                    <li>• Ensure good lighting for best results</li>
                    <li>• Include entire meal in view</li>
                    <li>• Capture when ready - AI will analyze automatically</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Preview View */}
            {step === 'preview' && capturedImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Captured Image Preview */}
                <div className="relative bg-black border-4 border-cyan-500 overflow-hidden">
                  <img
                    src={capturedImage.url}
                    alt="Captured food"
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-4 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={retakePhoto}
                    className="px-6 py-3 border-2 border-red-500 bg-black text-red-500 uppercase font-bold tracking-wider flex items-center gap-2"
                    style={{
                      boxShadow: '0 0 15px rgba(255, 0, 127, 0.3)',
                      fontFamily: "'Orbitron', sans-serif"
                    }}
                  >
                    <X className="w-5 h-5" />
                    <span>RETAKE</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={analyzeImage}
                    className="px-6 py-3 border-4 border-cyan-500 bg-black text-cyan-500 uppercase font-bold tracking-wider flex items-center gap-2"
                    style={{
                      boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                      fontFamily: "'Orbitron', sans-serif"
                    }}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>ANALYZE WITH AI</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Analyzing View */}
            {step === 'analyzing' && !analysisResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 space-y-6"
              >
                <Loader className="w-16 h-16 text-cyan-500 animate-spin" />
                <div className="text-center">
                  <p 
                    className="text-2xl font-bold uppercase mb-2 tracking-wider"
                    style={{
                      color: '#00FFFF',
                      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                      fontFamily: "'Orbitron', sans-serif"
                    }}
                  >
                    ANALYZING WITH AI
                  </p>
                  <p className="text-sm text-gray-400 uppercase tracking-wider">
                    OpenAI Vision is processing your meal...
                  </p>
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-cyan-500 rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Result View */}
            {step === 'result' && analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="border-4 border-green-500 bg-black p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <h3 
                      className="text-2xl font-bold uppercase tracking-wider"
                      style={{
                        color: '#00FF88',
                        fontFamily: "'Orbitron', sans-serif"
                      }}
                    >
                      ANALYSIS COMPLETE
                    </h3>
                  </div>
                  
                  {analysisResult.analysis && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                          DETECTED FOOD ITEMS:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.analysis.food_items?.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 border border-cyan-500 text-cyan-400 uppercase text-xs"
                            >
                              {item.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                            CALORIES
                          </p>
                          <p 
                            className="text-2xl font-bold"
                            style={{ color: '#00FF88' }}
                          >
                            {Math.round(analysisResult.analysis.total_calories || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                            PROTEIN
                          </p>
                          <p 
                            className="text-2xl font-bold"
                            style={{ color: '#9D4EDD' }}
                          >
                            {Math.round(analysisResult.analysis.macronutrients?.protein_grams || 0)}g
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                            CARBS
                          </p>
                          <p 
                            className="text-2xl font-bold"
                            style={{ color: '#00FFFF' }}
                          >
                            {Math.round(analysisResult.analysis.macronutrients?.carbs_grams || 0)}g
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 uppercase tracking-wider mt-4">
                    Meal saved successfully. Closing...
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

