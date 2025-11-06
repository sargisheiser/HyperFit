import { useState, useRef, useEffect, useCallback } from 'react'
import { Video, Camera, X, RotateCcw, TrendingUp, Activity, Zap, Target } from 'lucide-react'

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
            setTotalReps(result.rep_count || 0)
            
            if (result.confidence > 0.7) {
              setError('')
            }
          } else {
            if (result.exercise) {
              setCurrentExercise(result.exercise)
              setRepCount(result.rep_count || 0)
            }
            
            if (result.message && !result.exercise) {
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
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isActive) {
            connectWebSocket()
          }
        }, 3000)
      }
    }
    
    wsRef.current = ws
  }, [isActive, currentExercise])

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
    }, 100)
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
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none"></div>
      
      {/* Scan lines */}
      <div className="absolute inset-0 scan-line pointer-events-none"></div>

      <div className="relative bg-cyber-dark border-4 border-cyber-primary w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b-4 border-cyber-primary bg-cyber-dark p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Camera className="w-8 h-8 text-cyber-primary animate-pulse-neon" />
              <div className="absolute inset-0 w-8 h-8 bg-cyber-primary blur-xl opacity-50"></div>
            </div>
            <h2 className="text-3xl font-display font-black text-neon uppercase tracking-wider">
              LIVE TRACKING
            </h2>
          </div>
          <button
            onClick={onClose}
            className="border-4 border-cyber-primary bg-cyber-dark text-cyber-primary hover:bg-cyber-primary hover:text-cyber-darker p-2 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 border-4 border-cyber-secondary bg-cyber-dark p-4">
              <span className="text-cyber-secondary font-mono uppercase tracking-wider">{error}</span>
            </div>
          )}

          {/* Video Display */}
          <div className="relative mb-6 bg-black border-4 border-cyber-gray-light overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-cyber-darker">
                <div className="text-center">
                  <Camera className="w-20 h-20 text-cyber-gray-light mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-mono text-cyber-gray-light uppercase mb-2">CAMERA INACTIVE</p>
                  <p className="text-sm font-mono text-cyber-gray-light uppercase tracking-widest">INITIALIZE TRACKING</p>
                </div>
              </div>
            )}

            {/* Overlay Stats */}
            {isActive && (
              <div className="absolute top-4 left-4 bg-cyber-dark border-4 border-cyber-primary p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-5 h-5 text-cyber-primary" />
                  <span className="font-mono font-bold text-cyber-primary uppercase">
                    {currentExercise ? currentExercise.toUpperCase().replace('-', ' ') : 'READY'}
                  </span>
                </div>
                {formScore && (
                  <div className="text-xs font-mono text-cyber-gray-light uppercase">
                    FORM: {formScore.toFixed(1)}/10
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatBox
              label="CURRENT REPS"
              value={repCount}
              color="cyber-primary"
              icon={Target}
            />
            <StatBox
              label="TOTAL REPS"
              value={totalReps}
              color="cyber-secondary"
              icon={TrendingUp}
            />
            <StatBox
              label="FORM SCORE"
              value={formScore ? formScore.toFixed(1) : '--'}
              color="cyber-accent"
              icon={Activity}
              suffix="/10"
            />
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            {!isActive ? (
              <button
                onClick={startCamera}
                className="btn-cyber flex items-center space-x-2 px-8 py-4 text-lg"
              >
                <Camera className="w-6 h-6" />
                <span>INITIALIZE CAMERA</span>
              </button>
            ) : (
              <>
                <button
                  onClick={resetCounters}
                  className="btn-cyber flex items-center space-x-2 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-cyber-darker"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>RESET</span>
                </button>
                <button
                  onClick={stopCamera}
                  className="btn-cyber flex items-center space-x-2 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-cyber-darker"
                >
                  <X className="w-5 h-5" />
                  <span>STOP</span>
                </button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 border-4 border-cyber-gray-light bg-cyber-dark p-4">
            <p className="font-mono font-bold text-cyber-primary uppercase mb-3 text-sm tracking-wider">
              SYSTEM INSTRUCTIONS:
            </p>
            <ul className="text-xs font-mono text-cyber-gray-light space-y-1 uppercase tracking-wider">
              <li>• ENSURE GOOD LIGHTING AND FULL BODY VISIBILITY</li>
              <li>• POSITION YOURSELF IN THE CENTER OF THE FRAME</li>
              <li>• SUPPORTED: PUSH-UPS, SQUATS, PLANKS</li>
              <li>• REPS COUNTED AUTOMATICALLY WHEN FORM IS CORRECT</li>
            </ul>
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-mono text-cyber-gray-light uppercase">
              <div className="w-4 h-4 border-2 border-cyber-primary border-t-transparent animate-spin"></div>
              PROCESSING FRAME...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color, icon: Icon, suffix = '' }) {
  const colorClasses = {
    'cyber-primary': 'border-cyber-primary text-cyber-primary',
    'cyber-secondary': 'border-cyber-secondary text-cyber-secondary',
    'cyber-accent': 'border-cyber-accent text-cyber-accent',
  }

  return (
    <div className={`border-4 ${colorClasses[color]} bg-cyber-dark p-6 text-center`}>
      <Icon className={`w-8 h-8 ${colorClasses[color].split(' ')[1]} mx-auto mb-3`} />
      <div className="font-mono text-xs uppercase tracking-widest mb-2 text-cyber-gray-light">
        {label}
      </div>
      <div className="flex items-baseline justify-center space-x-2">
        <span className={`text-5xl font-display font-black ${colorClasses[color].split(' ')[1]} text-neon`}>
          {value}
        </span>
        {suffix && (
          <span className="text-lg font-mono text-cyber-gray-light uppercase">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}