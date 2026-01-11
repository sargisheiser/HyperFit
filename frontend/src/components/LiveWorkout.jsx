import { useState, useRef, useEffect, useCallback } from 'react'
import { Video, Camera, X, RotateCcw, TrendingUp, Activity, Target } from 'lucide-react'

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
          // Connected to workout analyzer
        } else if (data.type === 'reset_complete') {
          // Counters reset
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040705]/95 backdrop-blur-xl">
      <div className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-[36px] border border-[#00FF7F]/25 bg-gradient-to-br from-[#121b14]/88 via-[#0a140e]/88 to-[#060907]/92 text-[#b6fbd4] shadow-[0_0_90px_rgba(0,255,127,0.18)]">
        <div className="flex items-center justify-between border-b border-[#00FF7F]/15 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <Camera className="h-6 w-6 text-[#00FF7F]" />
            <h2 className="text-lg font-semibold">Live workout tracking</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[#00FF7F]/25 bg-[#07110c]/80 p-2 text-[#9fffcf] transition hover:border-[#00FF7F]/45 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {error && (
            <div className="rounded-2xl border border-[#ff2e63]/40 bg-[#ff2e63]/10 p-4 text-sm text-[#ff8aa8]">
              {error}
            </div>
          )}

          <div className="relative overflow-hidden rounded-[24px] border border-[#00FF7F]/18 bg-[#030504]/80">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl" />
            <canvas ref={canvasRef} className="hidden" />
            {!isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#040705]/80 text-[#9fffcf]">
                <Camera className="h-12 w-12" />
                <p className="text-sm uppercase tracking-[0.3em]">Camera inactive</p>
              </div>
            )}
            {isActive && (
              <div className="absolute left-4 top-4 rounded-[20px] border border-[#00FF7F]/20 bg-[#070f0a]/80 px-4 py-2 text-sm text-[#d0ffe8]">
                <div className="flex items-center gap-2 text-white">
                  <Activity className="h-4 w-4 text-[#00FF7F]" />
                  <span>{currentExercise ? currentExercise.replace('-', ' ') : 'Ready'}</span>
                </div>
                {formScore && <p className="mt-1 text-xs text-[#9bfcd0]/70">Form score {formScore.toFixed(1)}/10</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatBox label="Current reps" value={repCount} icon={Target} />
            <StatBox label="Total reps" value={totalReps} icon={TrendingUp} />
            <StatBox label="Form score" value={formScore ? `${formScore.toFixed(1)}/10` : '--'} icon={Activity} />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {!isActive ? (
              <button
                onClick={startCamera}
                className="rounded-full bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-6 py-3 text-sm font-semibold text-[#07100b] transition hover:opacity-90"
              >
                Initialize camera
              </button>
            ) : (
              <>
                <button
                  onClick={resetCounters}
                  className="rounded-full border border-[#00FF7F]/25 px-5 py-3 text-sm text-[#9fffcf] transition hover:border-[#00FF7F]/45 hover:text-white"
                >
                  Reset counters
                </button>
                <button
                  onClick={stopCamera}
                  className="rounded-full border border-[#00FF7F]/25 px-5 py-3 text-sm text-[#9fffcf] transition hover:border-[#00FF7F]/45 hover:text-white"
                >
                  Stop session
                </button>
              </>
            )}
          </div>

          <div className="rounded-[24px] border border-[#00FF7F]/18 bg-[#060b08]/85 p-4 text-sm text-[#b6fbd4]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Guidelines</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Frame your full body and ensure consistent lighting.</li>
              <li>The tracker currently supports push-ups, squats, and planks.</li>
              <li>Rep counts increment when your form resets to the start position.</li>
            </ul>
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-[#8cffc7]">
              <span className="h-3 w-3 animate-ping rounded-full bg-[#00FF7F]" /> Processing frame
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[20px] border border-[#00FF7F]/18 bg-[#060b08]/85 p-4 text-[#d0ffe8]">
      <div className="flex items-center gap-3 text-sm text-[#8cffc7]">
        <Icon className="h-4 w-4 text-[#00FF7F]" />
        <span className="uppercase tracking-[0.3em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white drop-shadow-[0_0_10px_rgba(0,255,127,0.2)]">{value}</p>
    </div>
  )
}