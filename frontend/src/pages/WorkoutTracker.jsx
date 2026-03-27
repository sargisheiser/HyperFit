import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  CheckCircle2,
  Dumbbell,
  Flame,
  History,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  StopCircle,
  Target,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import NeonCard from '../components/NeonCard'
import LoadingSpinner from '../components/LoadingSpinner'
import useWebSocket from '../hooks/useWebSocket'
import { fetchWorkoutHistory, saveWorkoutSession } from '../services/workoutService'
import { useAuth } from '../contexts/AuthContext'
import { useSteps } from '../hooks/useSteps'
import logger from '../utils/logger'

const PROGRESS_STEPS = [
  { id: 'ready', label: 'Ready', description: 'Prep your space' },
  { id: 'tracking', label: 'Tracking', description: 'Live AI tracking' },
  { id: 'analyzing', label: 'Analyzing', description: 'Summarizing session' },
  { id: 'summary', label: 'Summary', description: 'Review & save' },
]

const WS_FALLBACK = 'ws://localhost:8000/ws/workout-live'

const phaseCopy = {
  idle: 'Ready to launch the HyperFit tracker.',
  initializing: 'Initializing camera and AI pipeline…',
  tracking: 'Live tracking in progress. Keep your form aligned with the guide.',
  analyzing: 'Analyzing reps and generating session insights…',
  finished: 'Session wrapped. Review your stats below.',
  error: 'Connection interrupted. Adjust and relaunch the tracker.',
}

const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

function determineStepState(stepId, phase) {
  switch (stepId) {
    case 'ready':
      return phase === 'idle' ? 'active' : 'done'
    case 'tracking':
      return ['initializing', 'tracking'].includes(phase) ? 'active' : phase === 'idle' ? 'upcoming' : 'done'
    case 'analyzing':
      return phase === 'analyzing' ? 'active' : ['finished'].includes(phase) ? 'done' : 'upcoming'
    case 'summary':
      return phase === 'finished' ? 'active' : 'upcoming'
    default:
      return 'upcoming'
  }
}

function CameraFeed({ phase, videoRef, mirror = true }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#00FF7F]/15 bg-[#07100c] shadow-[0_12px_28px_rgba(0,255,127,0.08)]">
      <video
        ref={videoRef}
        className={`h-full w-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted
      />
      {phase === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050807]/90 text-[#9fffcf]">
          <Camera className="h-10 w-10 text-[#00FF7F]" />
          <p className="text-sm uppercase tracking-[0.3em]">Camera idle</p>
          <p className="text-xs text-[#9bfcd0]/70">Launch the tracker to activate vision.</p>
        </div>
      )}
      {phase === 'initializing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050807]/80 text-[#d0ffe8] backdrop-blur">
          <Loader2 className="h-8 w-8 animate-spin text-[#00FF7F]" />
          <p className="text-sm uppercase tracking-[0.3em]">Preparing sensors</p>
        </div>
      )}
    </div>
  )
}

function WorkoutStats({ session, feedbackLog }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        {
          icon: Target,
          label: 'Exercise',
          value: session.exercise ? session.exercise.replace(/-/g, ' ') : '—',
          helper: 'Current model classification',
        },
        {
          icon: Dumbbell,
          label: 'Reps counted',
          value: session.reps ?? 0,
          helper: 'Valid repetitions detected',
        },
        {
          icon: Flame,
          label: 'Kalorien burned',
          value: session.calories ? `${session.calories.toFixed(1)} kcal` : '0 kcal',
          helper: 'Estimated from motion + cadence',
        },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-[20px] border border-[#00FF7F]/18 bg-gradient-to-br from-[#0d1913]/90 via-[#09110d]/85 to-[#060a08]/90 p-5 text-sm text-[#b6fbd4] shadow-[0_10px_24px_rgba(0,255,127,0.08)]"
        >
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-[#8cffc7]">
            <stat.icon className="h-4 w-4 text-[#00FF7F]" />
            {stat.label}
          </div>
          <p className="mt-3 text-2xl font-semibold text-white drop-shadow-[0_0_12px_rgba(0,255,127,0.25)]">{stat.value}</p>
          <p className="mt-2 text-xs text-[#9bfcd0]/70">{stat.helper}</p>
        </div>
      ))}

      <div className="md:col-span-3">
        <div className="rounded-[20px] border border-[#00FF7F]/15 bg-[#060b08]/85 p-5">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#8cffc7]">
            <Sparkles className="h-4 w-4 text-[#00FF7F]" /> Live feedback
          </p>
          {feedbackLog.length === 0 ? (
            <p className="mt-3 text-sm text-[#b6fbd4]">AI feedback will appear here once the session starts.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-[#d0ffe8]">
              {feedbackLog.slice(-4).map((item, index) => (
                <motion.li
                  key={`${item.message}-${index}`}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-[#00FF7F]/10 bg-[#07110c]/80 px-4 py-3"
                >
                  <span className="text-[#8cffc7]/80">{item.time}</span> · {item.message}
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function SessionSummary({ summary, onRestart, onSave, saving, saved }) {
  if (!summary) return null
  return (
    <NeonCard>
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Session summary</p>
          <h3 className="text-2xl font-semibold text-white">Nice work! HyperFit captured your flow.</h3>
          <div className="grid gap-3 text-sm text-[#b6fbd4] md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Exercise</p>
              <p className="mt-1 text-lg font-medium text-white drop-shadow-[0_0_10px_rgba(0,255,127,0.18)]">
                {summary.exercise ? summary.exercise.replace(/-/g, ' ') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Duration</p>
              <p className="mt-1 text-lg font-medium text-white">{summary.duration ?? 0}s</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Reps</p>
              <p className="mt-1 text-lg font-medium text-white">{summary.reps ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Calories</p>
              <p className="mt-1 text-lg font-medium text-white">{(summary.calories ?? 0).toFixed(1)} kcal</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:w-64">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onSave}
            disabled={saving || saved}
            className="flex items-center justify-center gap-2 rounded-full border border-[#00FF7F]/40 bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-3 text-sm font-semibold text-[#07100b] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? 'Saving…' : saved ? 'Session saved' : 'Save session'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-full border border-[#00FF7F]/25 bg-[#07110c]/80 px-4 py-3 text-sm font-medium text-[#9fffcf] transition hover:border-[#00FF7F]/50"
          >
            <RefreshCw className="h-4 w-4" />
            Restart
          </motion.button>
          <Link
            to="/ai-assistant"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#00FF7F]/30 bg-[#07100b]/80 px-4 py-3 text-sm font-medium text-[#9fffcf] transition hover:border-[#00FF7F]/60"
          >
            <Zap className="h-4 w-4" />
            Get AI form advice
          </Link>
        </div>
      </div>
    </NeonCard>
  )
}

function Stepper({ phase }) {
  return (
    <NeonCard>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-[#00FF7F]" />
          <p className="text-xs uppercase tracking-[0.4em] text-[#8cffc7]">Session progress</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {PROGRESS_STEPS.map((step) => {
            const state = determineStepState(step.id, phase)
            return (
              <div
                key={step.id}
                className={`relative overflow-hidden rounded-[20px] border p-4 transition ${
                  state === 'active'
                    ? 'border-[#00FF7F]/60 shadow-[0_0_22px_rgba(0,255,127,0.22)]'
                    : state === 'done'
                      ? 'border-[#00C46A]/45'
                      : 'border-[#00FF7F]/15'
                }`}
              >
                {state === 'active' && (
                  <motion.span
                    layoutId="progress-highlight"
                    className="absolute inset-0 -z-10 bg-gradient-to-br from-[#00FF7F]/20 via-transparent to-[#00C46A]/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                )}
                <div className="flex items-center justify-between text-[#d0ffe8]">
                  <div>
                    <p className="text-sm font-semibold">{step.label}</p>
                    <p className="text-xs text-[#9bfcd0]/70">{step.description}</p>
                  </div>
                  {state === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-[#00FF7F]" />
                  ) : state === 'active' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#00FF7F]" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-white/20" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </NeonCard>
  )
}

export default function WorkoutTracker() {
  const { user } = useAuth()
  const { refetch: refetchActivity } = useSteps()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const frameIntervalRef = useRef(null)
  const sessionStartRef = useRef(null)
  const finalizeSessionRef = useRef(() => {})

  const [phase, setPhase] = useState('idle') // idle | initializing | tracking | analyzing | finished | error
  const [socketEnabled, setSocketEnabled] = useState(false)
  const [session, setSession] = useState({
    exercise: null,
    reps: 0,
    calories: 0,
    feedback: null,
  })
  const [feedbackLog, setFeedbackLog] = useState([])
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [summary, setSummary] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const wsUrl =
    import.meta.env.VITE_WORKOUT_WS_URL ??
    (typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000/ws/workout-live`
      : WS_FALLBACK)

  const handleSocketMessage = useCallback((payload) => {
    if (!payload) return

    if (payload.type === 'connected') {
      setPhase((prev) => (prev === 'idle' ? 'initializing' : prev))
      return
    }

    const result = payload.type === 'analysis' ? payload.result ?? {} : payload

    if (!result) return

    setPhase((prev) => (prev === 'initializing' ? 'tracking' : prev))

    setSession((prev) => {
      // Support multiple exercise name formats
      const exercise = result.exercise ?? 
                      result.exercise_type ?? 
                      result.detected_exercise ?? 
                      result.exercise_name ?? 
                      prev.exercise
      
      // Normalize exercise name (handle variations like "push-up" vs "push_up" vs "pushup")
      const normalizedExercise = exercise ? exercise.toLowerCase().replace(/[-_\s]/g, '-') : null
      
      // Support multiple rep count formats
      let reps = prev.reps
      if (result.reps !== undefined && result.reps !== null) {
        // Direct reps field
        reps = Number(result.reps) || 0
      } else if (result.rep_count !== undefined && result.rep_count !== null) {
        // rep_count field
        reps = Number(result.rep_count) || 0
      } else if (result.rep_counts) {
        // rep_counts object (exercise-specific)
        const repCounts = result.rep_counts ?? {}
        if (normalizedExercise) {
          // Try exact match first
          if (repCounts[normalizedExercise] !== undefined) {
            reps = Number(repCounts[normalizedExercise]) || 0
          } else {
            // Try variations (push-up, push_up, pushup)
            const exerciseVariations = [
              normalizedExercise,
              normalizedExercise.replace(/-/g, '_'),
              normalizedExercise.replace(/-/g, ''),
              normalizedExercise.replace(/_/g, '-'),
            ]
            for (const variation of exerciseVariations) {
              if (repCounts[variation] !== undefined) {
                reps = Number(repCounts[variation]) || 0
                break
              }
            }
          }
        }
        // If still no reps found, try to get the first non-zero rep count
        if (reps === prev.reps) {
          const firstRepCount = Object.values(repCounts).find((count) => count > 0)
          if (firstRepCount !== undefined) {
            reps = Number(firstRepCount) || 0
          }
        }
      } else if (result.total_reps !== undefined && result.total_reps !== null) {
        // total_reps field
        reps = Number(result.total_reps) || 0
      }
      
      // Support multiple calories formats
      let calories = prev.calories
      if (result.calories_burned !== undefined && result.calories_burned !== null) {
        calories = Number(result.calories_burned) || 0
      } else if (result.calories !== undefined && result.calories !== null) {
        calories = Number(result.calories) || 0
      } else if (result.calories_burned_total !== undefined && result.calories_burned_total !== null) {
        calories = Number(result.calories_burned_total) || 0
      } else if (result.estimated_calories !== undefined && result.estimated_calories !== null) {
        calories = Number(result.estimated_calories) || 0
      } else if (reps > prev.reps && normalizedExercise) {
        // Fallback: Estimate calories based on reps and exercise type if backend doesn't provide it
        // Only update if reps increased (to avoid overwriting with 0)
        const caloriesPerRep = {
          'push-up': 0.5,
          'pushup': 0.5,
          'squat': 0.8,
          'lunge': 0.6,
          'plank': 0.1, // per second
          'burpee': 1.2,
          'bicep-curl': 0.3,
          'bicepcurl': 0.3,
        }
        const baseCalories = caloriesPerRep[normalizedExercise] || 0.5
        calories = Math.max(prev.calories, reps * baseCalories)
      }
      
      const feedbackMessage = result.message ?? result.feedback ?? prev.feedback

      // Debug logging
      if (reps !== prev.reps || calories !== prev.calories || exercise !== prev.exercise) {
        logger.debug('[WorkoutTracker] Session update:', {
          exercise,
          reps,
          calories,
          prevReps: prev.reps,
          prevCalories: prev.calories,
          rawResult: result,
        })
      }

      return {
        exercise: normalizedExercise || exercise,
        reps,
        calories,
        feedback: feedbackMessage,
      }
    })

    const logMessage = result.message ?? result.feedback
    if (logMessage && logMessage !== 'Pose not detected') {
      const timeStamp = new Date().toLocaleTimeString()
      setFeedbackLog((prev) => [...prev.slice(-3), { message: logMessage, time: timeStamp }])
    }

    if (result.status && ['finished', 'summary', 'completed'].includes(result.status)) {
      finalizeSessionRef.current(result)
    }
  }, [])

  const finalizeSession = useCallback(
    (payload) => {
      stopFrameStreaming()
      setSocketEnabled(false)
      const duration = sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : 0
      
      // Support multiple rep count formats in final payload
      let finalReps = session.reps
      if (payload.reps !== undefined && payload.reps !== null) {
        finalReps = Number(payload.reps) || 0
      } else if (payload.rep_count !== undefined && payload.rep_count !== null) {
        finalReps = Number(payload.rep_count) || 0
      } else if (payload.rep_counts && payload.exercise) {
        const repCounts = payload.rep_counts ?? {}
        finalReps = Number(repCounts[payload.exercise]) || session.reps
      } else if (payload.total_reps !== undefined && payload.total_reps !== null) {
        finalReps = Number(payload.total_reps) || 0
      }
      
      // Support multiple calories formats in final payload
      let finalCalories = session.calories
      if (payload.calories_burned !== undefined && payload.calories_burned !== null) {
        finalCalories = Number(payload.calories_burned) || 0
      } else if (payload.calories !== undefined && payload.calories !== null) {
        finalCalories = Number(payload.calories) || 0
      } else if (payload.calories_burned_total !== undefined && payload.calories_burned_total !== null) {
        finalCalories = Number(payload.calories_burned_total) || 0
      } else if (payload.estimated_calories !== undefined && payload.estimated_calories !== null) {
        finalCalories = Number(payload.estimated_calories) || 0
      }
      
      const exercise = payload.exercise ?? payload.exercise_type ?? session.exercise
      
      logger.debug('[WorkoutTracker] Finalizing session:', {
        exercise,
        reps: finalReps,
        calories: finalCalories,
        duration,
        payload,
      })
      
      setSummary({
        exercise,
        reps: finalReps,
        calories: finalCalories,
        duration,
      })
      setPhase('finished')
    },
    [session],
  )

  useEffect(() => {
    finalizeSessionRef.current = finalizeSession
  }, [finalizeSession])

  const { status: socketStatus, send, close } = useWebSocket(wsUrl, {
    enabled: socketEnabled,
    onMessage: handleSocketMessage,
  })

  const startFrameStreaming = useCallback(() => {
    if (frameIntervalRef.current) return
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    frameIntervalRef.current = setInterval(() => {
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = canvas.toDataURL('image/jpeg', 0.8)
      send({ type: 'frame', frame })
    }, 200)
  }, [send])

  const stopFrameStreaming = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (socketStatus === 'open') {
      setError(null)
      startFrameStreaming()
    }

    if (socketStatus === 'closed' || socketStatus === 'error') {
      stopFrameStreaming()
    }
  }, [socketStatus, startFrameStreaming, stopFrameStreaming])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const loadHistory = useCallback(async () => {
    if (!user?.id) return
    try {
      setLoadingHistory(true)
      const data = await fetchWorkoutHistory()
      setHistory(data)
    } catch (err) {
      logger.error('Failed to load workout history', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const resetSession = useCallback(() => {
    stopFrameStreaming()
    stopCamera()
    close()
    setSocketEnabled(false)
    setPhase('idle')
    setSession({
      exercise: null,
      reps: 0,
      calories: 0,
      feedback: null,
    })
    setFeedbackLog([])
    setSummary(null)
    setSaved(false)
    setSaving(false)
    setError(null)
  }, [close, stopCamera, stopFrameStreaming])

  const startSession = async () => {
    try {
      resetSession()
      setPhase('initializing')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      sessionStartRef.current = Date.now()
      setSocketEnabled(true)
    } catch (err) {
      logger.error('Unable to access camera', err)
      setPhase('error')
      setError('Camera permissions denied. Please allow access and try again.')
      stopCamera()
    }
  }

  const stopSession = useCallback(() => {
    setPhase('analyzing')
    stopFrameStreaming()
    send({ type: 'stop' })
    stopCamera()
    setTimeout(() => {
      finalizeSessionRef.current({
        exercise: session.exercise,
        reps: session.reps,
        calories_burned: session.calories,
      })
    }, 500)
  }, [finalizeSessionRef, send, session, stopCamera, stopFrameStreaming])

  const saveSession = useCallback(async () => {
    if (!summary || !user?.id) return
    try {
      setSaving(true)
      await saveWorkoutSession({
        exercise: summary.exercise,
        reps: summary.reps,
        calories_burned: summary.calories,
        duration_seconds: summary.duration,
        feedback: feedbackLog.map((item) => item.message),
      })
      setSaved(true)
      await loadHistory()
      // Refresh activity stats to update calories burned
      await refetchActivity()
    } catch (err) {
      logger.error('Unable to save workout session', err)
      setError('Session could not be saved. Please try again later.')
    } finally {
      setSaving(false)
    }
  }, [feedbackLog, loadHistory, summary, user?.id, refetchActivity])

  useEffect(() => {
    return () => {
      resetSession()
    }
  }, [resetSession])

  return (
    <div className="space-y-6">
      <NeonCard>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00FF7F]/40 bg-[#00FF7F1a] px-3 py-1 text-[10px] uppercase tracking-[0.4em] text-[#9fffcf]">
              HyperFit AI Fitness Coach
            </span>
            <h1 className="text-3xl font-semibold text-white">Real-time movement intelligence</h1>
            <p className="text-sm leading-relaxed text-[#b6fbd4]">
              HyperFit AI Fitness Coach streams your camera feed to our vision lab. Rep counts, calorie burn, and postural
              coaching flash back in milliseconds so every rep stays on script.
            </p>
            <ul className="space-y-2 text-sm text-[#9bfcd0]">
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#00FF7F]" /> Halte den gesamten Koerper im Frame fuer praezise Erkennung.
              </li>
              <li className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#FF5E8A]" /> Aktiv: Push-ups, Squats, Planks, Lunges.
              </li>
              <li className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#FF5E8A]" /> Jetzt neu: Bicep Curls mit gerader oder SZ-Stange.
              </li>
            </ul>
          </div>

          <div className="relative flex flex-col gap-3 lg:w-72">
            <div className="pointer-events-none absolute -inset-2 rounded-[26px] border border-[#00FF7F]/30 blur-sm" />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={startSession}
              disabled={['initializing', 'tracking', 'analyzing'].includes(phase)}
              className="relative flex items-center justify-center gap-2 rounded-full border border-transparent bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-5 py-3 text-sm font-semibold text-[#07100b] transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              Launch live tracker
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={stopSession}
              disabled={!['tracking'].includes(phase)}
              className="relative flex items-center justify-center gap-2 rounded-full border border-white/10 bg-[#101b15]/90 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#FF5E8A]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <StopCircle className="h-4 w-4 text-[#FF5E8A]" />
              Stop session
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={resetSession}
              disabled={phase === 'idle'}
              className="relative flex items-center justify-center gap-2 rounded-full border border-[#00FF7F]/30 bg-[#07100b]/80 px-5 py-3 text-sm font-semibold text-[#9fffcf] transition hover:border-[#00FF7F]/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4 text-[#00FF7F]" />
              Reset
            </motion.button>
          </div>
        </div>
      </NeonCard>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <NeonCard>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between text-white/70">
              <p className="text-sm font-medium uppercase tracking-[0.3em]">Live camera</p>
              <span className="text-xs text-white/40">
                {socketStatus === 'open' ? 'Connected to AI analyzer' : 'Awaiting connection'}
              </span>
            </div>
            <CameraFeed phase={phase} videoRef={videoRef} />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </NeonCard>

        <NeonCard>
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-3 text-white">
              <Target className="h-5 w-5 text-[#00FF7F]" />
              <h3 className="text-lg font-semibold">Tracker status</h3>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-white/10 bg-[#0A0B0C]/80 p-4 text-sm text-white/70"
              >
                {phaseCopy[phase]}
              </motion.div>
            </AnimatePresence>
            {error && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
            )}
          </div>
        </NeonCard>
      </div>

      <Stepper phase={phase} />

      <NeonCard>
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-3 text-[#d0ffe8]">
            <Flame className="h-5 w-5 text-[#00FF7F]" />
            <h3 className="text-lg font-semibold">Live session metrics</h3>
          </div>
          <WorkoutStats session={session} feedbackLog={feedbackLog} />
        </div>
      </NeonCard>

      <SessionSummary
        summary={summary}
        onRestart={startSession}
        onSave={saveSession}
        saving={saving}
        saved={saved}
      />

      <NeonCard>
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-3 text-[#d0ffe8]">
            <History className="h-5 w-5 text-[#00FF7F]" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Workout archive</p>
              <h3 className="text-lg font-semibold text-white">Recent sessions</h3>
            </div>
          </div>
          {loadingHistory ? (
            <LoadingSpinner label="Syncing workout archive" />
          ) : history.length === 0 ? (
            <p className="text-sm text-[#b6fbd4]">
              No tracked workouts yet. Launch the live tracker to log your first AI-assisted session.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {history.slice(0, 6).map((item) => (
                <div
                  key={item.id ?? `${item.exercise}-${item.created_at}`}
                  className="rounded-[20px] border border-[#00FF7F]/12 bg-[#060b08]/85 p-4 text-sm text-[#d0ffe8]"
                >
                  <div className="flex items-center justify-between text-xs text-[#8cffc7]/80">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span>{Math.round(item.calories_burned ?? 0)} kcal</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold capitalize text-white">
                    {(item.exercise || 'Workout').replace(/-/g, ' ')}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[#9bfcd0]/70">
                    <span>{item.reps ?? 0} reps</span>
                    <span>•</span>
                    <span>{item.duration_seconds ? `${item.duration_seconds}s` : '--'}</span>
                  </div>
                  {item.feedback?.length ? (
                    <p className="mt-2 text-xs text-[#9bfcd0]/70">Feedback: {item.feedback.join(' · ')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </NeonCard>
    </div>
  )
}