import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Legacy route retained for backwards compatibility.
 * Redirects to the unified Nutrition Hub (Meal Analyzer tab).
 */
export default function FoodRecognizer() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.get('panel')) {
      params.set('panel', 'analyzer')
    }

    navigate(
      {
        pathname: '/nutrition',
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    )
  }, [location.search, navigate])

  return null
}
import { ImagePlus, Info, Sparkle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import NeonCard from '../components/NeonCard'
import api from '../services/api'

const TIMELINE_STEPS = [
  { id: 'capture', label: 'Capture' },
  { id: 'scan', label: 'Scan' },
  { id: 'insights', label: 'Insights' },
  { id: 'actions', label: 'Actions' },
]

export default function FoodRecognizer() {
  const [history, setHistory] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState(null)
  const [preferences, setPreferences] = useState('')
  const [allergies, setAllergies] = useState('')
  const [journeyPhase, setJourneyPhase] = useState('idle')
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const cameraVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [capturingPhoto, setCapturingPhoto] = useState(false)
  const galleryInputRef = useRef(null)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/api/food/history')
        setHistory(res.data || [])
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to fetch meal history')
      } finally {
        setLoadingHistory(false)
      }
    }

    loadHistory()
  }, [])

  useEffect(() => {
    if (!showCamera) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
      }
      return
    }

    let active = true

    const initCamera = async () => {
      setCameraError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        cameraStreamRef.current = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play().catch(() => {})
        }
      } catch (err) {
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera access was denied. Please allow camera permissions to capture photos.'
            : 'Unable to access the camera. Try using the gallery upload instead.'
        )
        setShowCamera(false)
      }
    }

    initCamera()

    return () => {
      active = false
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
      }
    }
  }, [showCamera])

  const processFileUpload = async (file) => {
    if (!file) return

    setUploading(true)
    setError(null)
    setJourneyPhase('scanning')

    try {
      const form = new FormData()
      form.append('file', file)
      if (preferences) form.append('dietary_preferences', preferences)
      if (allergies) form.append('allergies', allergies)

      const res = await api.post('/api/food/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setAnalysis(res.data)
      setHistory((prev) => [res.data.log, ...prev])
      setJourneyPhase('actions')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Unable to analyze image')
      setJourneyPhase('idle')
    } finally {
      setUploading(false)
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFileUpload(file)
    event.target.value = ''
  }

  const capturePhoto = async () => {
    if (!cameraVideoRef.current) return
    setCapturingPhoto(true)

    try {
      const video = cameraVideoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise((resolve) =>
        canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92)
      )

      if (!blob) {
        throw new Error('Unable to capture photo. Please try again.')
      }

      const file = new File([blob], `meal-${Date.now()}.jpg`, { type: blob.type })
      setShowCamera(false)
      await processFileUpload(file)
    } catch (err) {
      setError(err.message || 'Unable to capture photo')
    } finally {
      setCapturingPhoto(false)
    }
  }

  const closeCamera = () => {
    setShowCamera(false)
  }

  const stepStatus = useMemo(() => {
    switch (journeyPhase) {
      case 'scanning':
        return {
          capture: 'completed',
          scan: 'current',
          insights: 'upcoming',
          actions: 'upcoming',
        }
      case 'actions':
        return {
          capture: 'completed',
          scan: 'completed',
          insights: analysis ? 'completed' : 'current',
          actions: 'current',
        }
      default:
        return {
          capture: 'current',
          scan: 'upcoming',
          insights: 'upcoming',
          actions: 'upcoming',
        }
    }
  }, [journeyPhase, analysis])

  const suggestionChips = useMemo(() => {
    if (!analysis) return []

    const chips = [
      {
        label: 'Add to meal plan',
        hint: 'Log this meal into your weekly macro targets.',
      },
      {
        label: 'Flag allergen',
        hint: 'Highlight potential allergy risks for future alerts.',
      },
      {
        label: 'Compare with last scan',
        hint: 'See how this meal stacks against your previous intake.',
      },
      {
        label: 'Share with coach',
        hint: 'Send a snapshot of macros to your accountability partner.',
      },
    ]

    const hasHighProtein = (analysis.macronutrients?.protein_grams || 0) >= 25
    const hasHighCalories = (analysis.total_calories || 0) >= 700

    if (hasHighProtein) {
      chips.unshift({
        label: 'Mark as protein boost',
        hint: 'Track this meal as part of your muscle-building streak.',
      })
    }

    if (hasHighCalories) {
      chips.unshift({
        label: 'Set portion reminder',
        hint: 'Get nudges when similar meals exceed your calorie budget.',
      })
    }

    return chips.slice(0, 4)
  }, [analysis])

  const foodItems = analysis?.food_items || []

  const AnalyzingVisualizer = () => (
    <div className="relative mx-auto h-24 w-24">
      <motion.span
        className="absolute inset-0 rounded-full border border-[#00FF7F]/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.span
        className="absolute inset-3 rounded-full border border-[#ff2e63]/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
      />
      <motion.span
        className="absolute inset-6 rounded-full bg-gradient-to-br from-[#00FF7F]/30 via-transparent to-[#ff2e63]/20"
        animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00FF7F]"
        animate={{ scale: [1, 2, 1], opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )

  const PolaroidIcon = ({ active }) => (
    <motion.span
      aria-hidden="true"
      className="relative flex h-16 w-16 items-center justify-center"
      animate={active ? { rotate: [-1.5, 1.5, -1.5] } : { rotate: 0 }}
      transition={{ duration: 4, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
    >
      <span className="absolute inset-0 rounded-[22px] border border-white/15 bg-[#101324]/90 shadow-[0_18px_40px_rgba(4,8,20,0.55)]" />
      <span className="absolute left-1/2 top-3 h-2 w-8 -translate-x-1/2 rounded-sm bg-[#181d36]" />
      <span className="absolute inset-x-3 bottom-3 h-7 rounded-md bg-gradient-to-br from-[#1b1f33] to-[#0c1022]" />
      <motion.span
        className="absolute bottom-0 left-1/2 h-10 w-12 -translate-x-1/2 rounded-b-[14px] border border-white/10 bg-gradient-to-b from-[#00FF7F]/20 to-[#ff2e63]/15"
        animate={
          active
            ? { y: [8, -4, 8], opacity: [0, 1, 0] }
            : { y: 8, opacity: 0 }
        }
        transition={{ duration: 3, repeat: active ? Infinity : 0, ease: 'easeInOut', delay: 0.5 }}
      />
      <span className="relative h-7 w-7 rounded-full border border-white/12 bg-[#05070f]/90 shadow-inner" />
      <span className="absolute h-2.5 w-2.5 rounded-full bg-[#ff2e63]" />
    </motion.span>
  )

  return (
    <div className="space-y-6">
      <NeonCard>
        <div className="flex flex-col gap-6 rounded-2xl bg-[#10121b]/80 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">OpenAI Vision</p>
            <h2 className="text-2xl font-semibold text-white">Analyze your meals in seconds</h2>
            <p className="text-sm leading-relaxed text-white/60">
              HyperFit uses GPT-4o vision to estimate macros, calories, and meal context. Upload a photo and
              receive structured nutrition data instantly.
            </p>
            <div className="grid gap-3 text-xs text-white/60 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block uppercase tracking-[0.3em] text-white/40">Dietary preferences</span>
                <input
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g. vegan, high protein"
                  className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="block uppercase tracking-[0.3em] text-white/40">Allergies</span>
                <input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. peanuts, lactose"
                  className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#ff2e63] focus:outline-none"
                />
              </label>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:mt-0 md:grid-cols-2">
            <label className="group relative inline-flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-[#00FF7F]/30 bg-[#07110c]/70 px-8 py-6 text-center transition hover:border-[#00FF7F]/60">
              {uploading && (
                <motion.span
                  className="absolute inset-0 z-0 rounded-2xl bg-gradient-to-br from-[#00FF7F]/20 via-[#0c1022] to-[#ff2e63]/10"
                  animate={{ opacity: [0.35, 0.6, 0.35], rotate: [0, 2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <ImagePlus className="relative z-10 h-7 w-7 text-[#00FF7F] transition duration-500 group-hover:scale-105" />
              <span className="relative z-10 text-sm font-medium text-white/80">
                {uploading ? 'Analyzing...' : 'Upload'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
                ref={galleryInputRef}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setShowCamera(true)
              }}
              disabled={uploading}
              className="group relative inline-flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-[#00FF7F]/30 bg-[#07110c]/70 px-8 py-6 text-center transition hover:border-[#ff2e63]/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PolaroidIcon active={uploading} />
              <span className="relative z-10 text-sm font-medium text-white/80">
                {uploading ? 'Processing...' : 'Camera'}
              </span>
            </button>
          </div>
        </div>
      </NeonCard>

      <NeonCard>
        <div className="rounded-2xl bg-[#090b15]/90 p-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
            <span>Journey tracker</span>
            <span>{journeyPhase === 'actions' && analysis ? 'Ready to act' : 'In progress'}</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {TIMELINE_STEPS.map((step) => {
              const status = stepStatus[step.id]
              return (
                <motion.div
                  key={step.id}
                  layout
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111324]/60 p-4"
                  animate={{
                    borderColor:
                      status === 'current'
                        ? 'rgba(0,255,247,0.45)'
                        : status === 'completed'
                        ? 'rgba(255,46,99,0.35)'
                        : 'rgba(255,255,255,0.08)',
                  }}
                  transition={{ duration: 0.4 }}
                >
                  {status === 'current' && (
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-br from-[#00FF7F]/15 via-transparent to-[#ff2e63]/10"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium ${
                        status === 'completed'
                          ? 'border-[#ff2e63]/60 text-[#ff2e63]'
                          : status === 'current'
                          ? 'border-[#00FF7F]/60 text-[#00FF7F]'
                          : 'border-white/15 text-white/40'
                      }`}
                    >
                      {status === 'completed' ? '✓' : `0${TIMELINE_STEPS.indexOf(step) + 1}`}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.label}</p>
                      <p className="text-[0.7rem] uppercase tracking-[0.3em] text-white/40">
                        {status === 'completed'
                          ? 'Completed'
                          : status === 'current'
                          ? 'Active'
                          : 'Queued'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </NeonCard>

      {uploading && (
        <NeonCard>
          <div
            className="relative overflow-hidden rounded-2xl bg-[#090b15]/95 p-6 text-center"
            aria-live="assertive"
          >
            <motion.span
              className="absolute -left-32 -top-36 h-72 w-72 rounded-full bg-[#00FF7F]/20 blur-3xl"
              animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.8, 1.05, 0.8] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="absolute -right-28 -bottom-40 h-72 w-72 rounded-full bg-[#ff2e63]/15 blur-3xl"
              animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.85, 1.1, 0.85] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative space-y-5">
              <AnalyzingVisualizer />
              <motion.p
                className="text-xs uppercase tracking-[0.4em] text-white/40"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                Scanning meal
              </motion.p>
              <motion.h3
                className="text-lg font-semibold text-white"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                Decoding macros and ingredients
              </motion.h3>
              <p className="text-sm text-white/60">
                HyperFit is analyzing your food image to surface nutritional insights, allergens, and macro balance.
              </p>
            </div>
          </div>
        </NeonCard>
      )}

      {error && (
        <NeonCard className="border border-red-500/40">
          <div className="rounded-2xl bg-[#20111a]/80 p-4 text-sm text-red-300">{error}</div>
        </NeonCard>
      )}

      {cameraError && (
        <NeonCard className="border border-red-500/40">
          <div className="rounded-2xl bg-[#20111a]/80 p-4 text-sm text-red-300">{cameraError}</div>
        </NeonCard>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02030a]/90 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#090b15]/95 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Camera capture</p>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                <video
                  ref={cameraVideoRef}
                  playsInline
                  muted
                  autoPlay
                  className="h-64 w-full object-cover"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="flex-1 rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm font-medium text-white/70 transition hover:border-white/35 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={capturingPhoto}
                  className="flex-1 rounded-2xl border border-[#00FF7F]/40 bg-[#00FF7F]/10 px-4 py-3 text-sm font-semibold text-[#00FF7F] transition hover:border-[#00FF7F]/70 hover:bg-[#00FF7F]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {capturingPhoto ? 'Capturing...' : 'Capture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <NeonCard>
          <div className="rounded-2xl bg-[#10121b]/80 p-6 space-y-6">
            <div className="flex items-center gap-3 text-white">
              <Sparkle className="h-5 w-5 text-[#00FF7F]" />
              <h3 className="text-xl font-semibold">AI nutrition breakdown</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Detected items</p>
                <ul className="space-y-2 text-sm text-white/70">
                  {foodItems.length === 0 && (
                    <li className="rounded-2xl border border-[#00FF7F]/20 bg-[#060b08]/80 px-4 py-3 text-[#b6fbd4]">
                      No items detected. Try another angle or brighter lighting.
                    </li>
                  )}
                  {foodItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between rounded-2xl border border-[#00FF7F]/20 bg-[#060b08]/80 px-4 py-3 text-[#d0ffe8]">
                      <span>{item.name}</span>
                      <span className="text-white/50">{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Macros</p>
                <div className="grid gap-3">
                  {[
                    ['Calories', `${Math.round(analysis.total_calories)} kcal`],
                    ['Protein', `${analysis.macronutrients?.protein_grams?.toFixed(1) || '0.0'} g`],
                    ['Carbs', `${analysis.macronutrients?.carbs_grams?.toFixed(1) || '0.0'} g`],
                    ['Fat', `${analysis.macronutrients?.fat_grams?.toFixed(1) || '0.0'} g`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-[#00FF7F]/20 bg-[#060b08]/80 px-4 py-2 text-sm text-[#d0ffe8]">
                      <span>{label}</span>
                      <span className="font-medium text-white">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/40">
                  Confidence: <span className="text-white/70">{Math.round((analysis.confidence_score || 0) * 100)}%</span>
                </p>
              </div>
            </div>

            {suggestionChips.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Next actions</p>
                <div className="flex flex-wrap gap-3">
                  {suggestionChips.map((chip) => (
                    <motion.button
                      key={chip.label}
                      whileHover={{ y: -2, boxShadow: '0px 10px 30px rgba(0,255,247,0.15)' }}
                      whileTap={{ scale: 0.98 }}
                      className="group rounded-full border border-[#00FF7F]/30 bg-[#0b0f1f]/70 px-4 py-2 text-left text-sm text-white transition"
                    >
                      <span className="block font-medium text-white">{chip.label}</span>
                      <span className="text-xs text-white/50">{chip.hint}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </NeonCard>
      )}

      <NeonCard>
        <div className="rounded-2xl bg-[#10121b]/80 p-6">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-[#ff2e63]" />
            <h3 className="text-lg font-semibold text-white">Analysis history</h3>
          </div>
          {loadingHistory ? (
            <LoadingSpinner label="Syncing meal history" />
          ) : history.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">No meals analyzed yet. Upload a photo to get started.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {history.map((log) => (
                <motion.div
                  key={log.id}
                  className="group relative overflow-hidden rounded-2xl border border-[#00FF7F]/20 bg-[#060b08]/80 p-4 text-sm text-[#d0ffe8]"
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                    <span>{Math.round(log.total_calories || 0)} kcal</span>
                  </div>
                  <p className="mt-3 font-medium text-white">
                    {log.food_items?.map((item) => item.name).join(', ') || 'Unknown meal'}
                  </p>
                  <p className="mt-2 text-xs text-white/40">
                    Confidence {Math.round((log.confidence_score || 0) * 100)}%
                  </p>
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-[#0b0f1f]/95 p-4 text-xs text-white/60 transition group-hover:translate-y-0"
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                  >
                    <p className="uppercase tracking-[0.3em] text-white/35">Quick peek</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {[
                        ['Prot', `${(log.macronutrients?.protein_grams || 0).toFixed(0)} g`],
                        ['Carb', `${(log.macronutrients?.carbs_grams || 0).toFixed(0)} g`],
                        ['Fat', `${(log.macronutrients?.fat_grams || 0).toFixed(0)} g`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center">
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/35">{label}</p>
                          <p className="text-sm font-medium text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.3em] text-[#00FF7F]/70">
                      <span>Re-run with updates</span>
                      <span>→</span>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </NeonCard>
    </div>
  )
}

