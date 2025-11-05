import { useState, useRef, useEffect, useCallback } from 'react'
import { Video, Camera, X, RotateCcw, TrendingUp, Activity } from 'lucide-react'

export default function LiveWorkout({ onClose }) {
  const [isActive, setIsActive] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [currentExercise, setCurrentExercise] = useState(null)
  const [formScore, setFormScore] = useState(null)
  const [totalReps, setTotalReps] = useState(0)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const wsRef = useRef(null)
  const frameIntervalRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/workout-live`
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      setError('')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'analysis' && data.result) {
          const result = data.result
          setIsProcessing(false)
          
          if (result.detected) {
            setCurrentExercise(result.exercise)
            setRepCount(result.rep_count || 0)
            setFormScore(result.form_score)
            
            // Update total reps - use the actual rep count from the result
            setTotalReps(result.rep_count || 0)
            
            // Clear error if detection successful
            if (result.confidence > 0.7) {
              setError('')
            }
          } else {
            // Keep last exercise visible if we had one
            if (result.exercise) {
              setCurrentExercise(result.exercise)
              setRepCount(result.rep_count || 0)
            }
            
            // Show helpful message if provided
            if (result.message && !result.exercise) {
              // Only show error if we don't have a previous exercise
              if (!currentExercise) {
                setError(result.message)
              }
            }
          }
        } else if (data.type === 'error') {
          setError(data.message || 'Error processing frame')
        } else if (data.type === 'connected') {
          console.log('Connected to workout analyzer')
        } else if (data.type === 'reset_complete') {
          console.log('Counters reset')
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setError('Connection error. Make sure backend is running.')
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      if (isActive) {
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isActive) {
            connectWebSocket()
          }
        }, 3000)
      }
    }
    
    wsRef.current = ws
  }, [isActive])

  const startCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      
      setIsActive(true)
      connectWebSocket()
      
      // Start sending frames
      startFrameCapture()
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsActive(false)
    setRepCount(0)
    setCurrentExercise(null)
    setFormScore(null)
  }

  const startFrameCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    frameIntervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const frameData = canvas.toDataURL('image/jpeg', 0.8)
          
          setIsProcessing(true)
          wsRef.current.send(JSON.stringify({
            type: 'frame',
            frame: frameData
          }))
        } catch (err) {
          console.error('Error capturing frame:', err)
        }
      }
    }, 100) // 10 FPS
  }

  const resetCounters = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reset' }))
    }
    setRepCount(0)
    setTotalReps(0)
    setCurrentExercise(null)
    setFormScore(null)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6" />
            <h2 className="text-xl font-bold">Live Workout Tracker</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Video Display */}
          <div className="relative mb-6 bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Camera not active</p>
                  <p className="text-sm opacity-75">Click Start to begin tracking</p>
                </div>
              </div>
            )}

            {/* Overlay Stats */}
            {isActive && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <span className="font-semibold">
                    {currentExercise ? currentExercise.charAt(0).toUpperCase() + currentExercise.slice(1).replace('-', ' ') : 'Ready'}
                  </span>
                </div>
                {formScore && (
                  <div className="text-sm text-gray-300">
                    Form: {formScore.toFixed(1)}/10
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border-2 border-blue-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">{repCount}</div>
              <div className="text-sm font-medium text-blue-700">Current Reps</div>
              {currentExercise && (
                <div className="text-xs text-blue-600 mt-1 capitalize">
                  {currentExercise.replace('-', ' ')}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border-2 border-green-200">
              <div className="text-4xl font-bold text-green-600 mb-2">{totalReps}</div>
              <div className="text-sm font-medium text-green-700">Total Reps</div>
              <div className="text-xs text-green-600 mt-1">This Session</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border-2 border-purple-200">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {formScore ? formScore.toFixed(1) : '--'}
              </div>
              <div className="text-sm font-medium text-purple-700">Form Score</div>
              <div className="text-xs text-purple-600 mt-1">/ 10</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            {!isActive ? (
              <button
                onClick={startCamera}
                className="btn btn-primary flex items-center gap-2 px-8 py-3 text-lg"
              >
                <Camera className="w-5 h-5" />
                Start Camera
              </button>
            ) : (
              <>
                <button
                  onClick={resetCounters}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
                <button
                  onClick={stopCamera}
                  className="btn btn-danger flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Stop
                </button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-semibold mb-2">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure good lighting and full body visibility</li>
              <li>Position yourself in the center of the frame</li>
              <li>Supported exercises: Push-ups, Squats, Planks</li>
              <li>Reps are counted automatically when form is correct</li>
            </ul>
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              Processing frame...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
