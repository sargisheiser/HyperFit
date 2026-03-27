import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Brain,
  Camera,
  CheckCircle2,
  CircleDot,
  History,
  Loader2,
  PenSquare,
  UploadCloud,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import useNutritionStore from '../../store/useNutritionStore'
import {
  analyzeMealVision,
  saveAnalyzedMeal,
  fetchNutritionSnapshot,
} from '../../services/nutritionService'
import logger from '../../utils/logger'

// Helper function to remove markdown formatting (**, __, etc.)
const removeMarkdown = (text) => {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/\*\*/g, '') // Remove ** bold markers
    .replace(/__/g, '') // Remove __ bold markers
    .replace(/\*/g, '') // Remove single * italic markers
    .replace(/_/g, '') // Remove single _ italic markers
    .trim()
}

const STEPS = [
  { id: 'capture', label: 'Capture', hint: 'Upload or snap meal photo' },
  { id: 'scan', label: 'AI Scan', hint: 'Vision pipeline running' },
  { id: 'results', label: 'Results', hint: 'Review macros & calories' },
  { id: 'save', label: 'Save', hint: 'Add to your history' },
]

const statusCopy = {
  idle: 'Upload or capture a meal to begin.',
  capture: 'Meal captured. Ready for AI scanning.',
  scanning: 'Analyzing meal with HyperFit Vision…',
  results: 'Scan complete. Review insights and macros.',
  saving: 'Saving meal to your history…',
  saved: 'Meal saved successfully. Stay consistent!',
  error: 'Analysis failed. Adjust and try again.',
}

export default function HyperFitVisionModal({ open, onClose }) {
  const { user } = useAuth()
  const userId = user?.id
  const { setDailySnapshot } = useNutritionStore((state) => ({
    setDailySnapshot: state.setDailySnapshot,
  }))
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [note, setNote] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [currentStep, setCurrentStep] = useState('capture')
  const [completedSteps, setCompletedSteps] = useState([])
  const [status, setStatus] = useState('idle')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const previewSource = analysis?.image_url || analysis?.imageUrl || previewUrl

  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setPreviewUrl(null)
      setNote('')
      setAnalysis(null)
      setCurrentStep('capture')
      setCompletedSteps([])
      setStatus('idle')
      setError(null)
      setSaving(false)
    }
  }, [open])

  useEffect(() => {
    if (!selectedFile) return
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  const markCompleted = (step) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]))
  }

  const stepState = useMemo(() => {
    const state = {}
    STEPS.forEach((step) => {
      if (completedSteps.includes(step.id)) {
        state[step.id] = 'done'
      } else if (step.id === currentStep) {
        state[step.id] = 'active'
      } else {
        state[step.id] = 'upcoming'
      }
    })
    return state
  }, [completedSteps, currentStep])

  const handleFileSelection = (file) => {
    if (!file) return
    setAnalysis(null)
    setSelectedFile(file)
    setStatus('capture')
    setCurrentStep('scan')
    markCompleted('capture')
  }

  const handleGalleryUpload = (event) => {
    const file = event.target.files?.[0]
    handleFileSelection(file)
  }

  const handleCameraCapture = (event) => {
    const file = event.target.files?.[0]
    handleFileSelection(file)
  }

  const saveMealToHistory = async (mealAnalysis) => {
    if (!mealAnalysis) return
    if (!userId) {
      setError('Bitte melde dich erneut an, bevor du speicherst.')
      return false
    }
    setSaving(true)
    setStatus('saving')
    setCurrentStep('save')

    try {
      const macros = mealAnalysis.macronutrients || {}
      // Ensure calories are correctly extracted - check multiple sources
      const mealCalories = mealAnalysis.total_calories ?? mealAnalysis.calories ?? 0
      logger.debug('[HyperFitVisionModal] Saving meal with calories:', {
        total_calories: mealAnalysis.total_calories,
        calories: mealAnalysis.calories,
        final: mealCalories,
        protein: macros.protein_grams ?? macros.protein ?? mealAnalysis.protein ?? 0,
      })
      
      const mealResponse = await saveAnalyzedMeal({
        userId,
        calories: mealCalories,
        protein: macros.protein_grams ?? macros.protein ?? mealAnalysis.protein ?? 0,
        carbs: macros.carbs_grams ?? macros.carbs ?? mealAnalysis.carbs ?? 0,
        fat: macros.fat_grams ?? macros.fat ?? mealAnalysis.fat ?? 0,
        note: note || mealAnalysis.note || '',
        imageUrl: mealAnalysis.image_url || mealAnalysis.imageUrl || null,
      })

      if (mealResponse?.dailySnapshot) {
        setDailySnapshot(mealResponse.dailySnapshot)
      }

      if (mealResponse?.meal) {
        setAnalysis((prev) => ({
          ...(prev ?? {}),
          ...mealResponse.meal,
          food_items: prev?.food_items?.length ? prev.food_items : mealResponse.meal.food_items,
          insights: prev?.insights?.length ? prev.insights : mealResponse.meal.insights,
          recommendations: prev?.recommendations?.length ? prev.recommendations : mealResponse.meal.recommendations,
          confidence_score: prev?.confidence_score ?? mealResponse.meal.confidence_score,
        }))
      }

      setStatus('saved')
      markCompleted('save')
      setTimeout(() => {
        onClose?.()
      }, 900)
      setError(null)
      return true
    } catch (err) {
      logger.error('Saving meal failed', err)
      if (err.response?.status === 401) {
        setError('Deine Session ist abgelaufen. Bitte melde dich erneut an.')
      } else {
        setError(err.response?.data?.detail || err.message || 'Meal konnte nicht gespeichert werden.')
      }
      setStatus('error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      setError('Bitte lade zuerst ein Bild hoch oder nutze die Kamera.')
      return
    }
    if (!userId) {
      setError('Bitte melde dich an, bevor du die Vision-Analyse startest.')
      return
    }

    setIsAnalyzing(true)
    setStatus('scanning')
    setCurrentStep('scan')
    markCompleted('capture')
    setError(null)

    try {
      const result = await analyzeMealVision({ userId, file: selectedFile, note: note.trim() })
      logger.debug('[Vision Modal] normalized analysis result', result)
      setAnalysis(result)
      setStatus('results')
      setCurrentStep('results')
      markCompleted('scan')
      markCompleted('results')
      
      // Automatisch speichern nach erfolgreicher Analyse
      await saveMealToHistory(result)
    } catch (err) {
      logger.error('Vision analysis failed', err)
      if (err.response?.status === 401) {
        setError('Deine Session ist abgelaufen. Bitte melde dich erneut an.')
      } else {
        setError(err.response?.data?.detail || err.message || 'Analyse fehlgeschlagen. Bitte erneut versuchen.')
      }
      setStatus('error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    await saveMealToHistory(analysis)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0f1016] text-white shadow-[0_0_60px_rgba(0,255,127,0.12)]"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:text-white"
            >
              Schließen
            </button>

            <div className="flex h-full flex-col overflow-y-auto px-8 pb-8 pt-16">
              <header className="flex flex-col gap-2 border-b border-white/5 pb-6">
                <span className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">HyperFit Vision</span>
                <h2 className="text-3xl font-semibold">Analyse deine Mahlzeiten in Sekunden</h2>
                <p className="max-w-2xl text-sm text-white/60">
                  Lade ein Foto hoch oder nutze deine Kamera. HyperFit Vision erkennt Lebensmittel, berechnet Kalorien sowie Makros und
                  schlägt automatisch Optimierungen vor.
                </p>
              </header>

              <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[2fr,1.4fr]">
                <section className="space-y-5 rounded-3xl border border-white/10 bg-[#121418] p-6">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">Upload & Capture</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isAnalyzing}
                      className="group flex h-32 items-center justify-center gap-3 rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/80 text-sm font-semibold text-white transition hover:border-[#00FF7F]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UploadCloud className="h-6 w-6 text-[#00FF7F]" />
                      Upload meal photo
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleGalleryUpload}
                        className="hidden"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isAnalyzing}
                      className="group flex h-32 items-center justify-center gap-3 rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/80 text-sm font-semibold text-white transition hover:border-[#00C46A]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Camera className="h-6 w-6 text-[#00C46A]" />
                      Use camera
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                      />
                    </button>
                  </div>

                  <label className="block">
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/40">
                      <PenSquare className="h-4 w-4 text-[#00FF7F]" />
                      Optional note
                    </span>
                    <input
                      type="text"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="e.g. Post-workout meal, extra carbs today…"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0A0B0C]/80 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
                    />
                  </label>

                  {previewSource ? (
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <img src={previewSource} alt="Meal preview" className="h-48 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-sm text-white/40">
                      Ziehe ein Foto hierher oder nutze eine der Optionen oben.
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={!selectedFile || isAnalyzing}
                    className="flex items-center justify-between rounded-2xl border border-transparent bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-4 text-left text-[#0A0B0C] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.3em]">Start AI analysis</p>
                      <p className="text-xs text-[#0A0B0C]/70">Vision + nutrition intelligence</p>
                    </div>
                    {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
                  </motion.button>
                </section>

                <section className="space-y-5 rounded-3xl border border-white/10 bg-[#121418] p-6">
                  <div className="flex items-center gap-3">
                    <CircleDot className="h-4 w-4 text-[#00FF7F]" />
                    <p className="text-xs uppercase tracking-[0.4em] text-white/40">Progress</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {STEPS.map((step) => {
                      const state = stepState[step.id]
                      return (
                        <div
                          key={step.id}
                          className={`rounded-2xl border bg-[#0F1018]/80 p-4 transition ${
                            state === 'active'
                              ? 'border-[#00FF7F]/60 shadow-[0_0_18px_rgba(0,255,127,0.2)]'
                              : state === 'done'
                                ? 'border-[#00C46A]/50'
                                : 'border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between text-white">
                            <div>
                              <p className="text-sm font-semibold">{step.label}</p>
                              <p className="text-xs text-white/50">{step.hint}</p>
                            </div>
                            {state === 'done' ? (
                              <CheckCircle2 className="h-5 w-5 text-[#00FF7F]" />
                            ) : state === 'active' ? (
                              <Loader2 className="h-5 w-5 animate-spin text-[#00FF7F]" />
                            ) : (
                              <History className="h-5 w-5 text-white/20" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <motion.div
                    key={status}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 px-4 py-3 text-sm text-white/70"
                  >
                    {statusCopy[status] || statusCopy.idle}
                  </motion.div>

                  {error && (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  {analysis && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-[#0F111B]/80 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Calories</p>
                        <p className="mt-2 text-3xl font-semibold text-white">
                          {Math.round(analysis.total_calories ?? analysis.calories ?? 0)} kcal
                        </p>
                        {analysis.image_url && (
                          <img
                            src={analysis.image_url}
                            alt="Analyse Ergebnis"
                            className="mt-3 h-36 w-full rounded-2xl object-cover"
                          />
                        )}
                        {analysis.note && (
                          <p className="mt-3 text-xs text-white/60">{analysis.note}</p>
                        )}
                        {typeof analysis.confidence_score === 'number' && (
                          <p className="mt-3 text-xs uppercase tracking-[0.35em] text-white/40">
                            Confidence {Math.round(analysis.confidence_score * 100)}%
                          </p>
                        )}
                        {analysis.source && (
                          <span className="mt-2 inline-flex rounded-full border border-[#00FF7F]/20 bg-[#07110c]/70 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/50">
                            {analysis.source}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-3">
                        {[
                          ['Protein', 'protein_grams'],
                          ['Carbs', 'carbs_grams'],
                          ['Fats', 'fat_grams'],
                        ].map(([label, key]) => {
                          const rawValue = analysis.macronutrients?.[key]
                          const grams = Number.isFinite(Number(rawValue)) ? Number(rawValue) : 0
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-white/50">
                                <span>{label}</span>
                                <span className="font-semibold text-white">{grams.toFixed(1)} g</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#00FF7F] to-[#00C46A]"
                                  style={{ width: `${Math.min(grams * 4, 100)}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {analysis.food_items?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Detected items</p>
                          <ul className="space-y-2 text-sm text-white/70">
                            {analysis.food_items.map((item, index) => (
                              <li
                                key={`${item.name ?? 'item'}-${index}`}
                                className="rounded-2xl border border-white/10 bg-[#0B0D13]/60 px-4 py-3"
                              >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <span className="font-semibold text-white">{item.name || 'Unbekanntes Produkt'}</span>
                                  {item.quantity && <span className="text-xs text-white/40">{item.quantity}</span>}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.25em] text-white/40">
                                  {item.calories !== null && item.calories !== undefined && (
                                    <span>{Math.round(item.calories)} kcal</span>
                                  )}
                                  {item.protein_grams !== null && item.protein_grams !== undefined && (
                                    <span>Protein {Math.round(item.protein_grams)} g</span>
                                  )}
                                  {item.carbs_grams !== null && item.carbs_grams !== undefined && (
                                    <span>Carbs {Math.round(item.carbs_grams)} g</span>
                                  )}
                                  {item.fat_grams !== null && item.fat_grams !== undefined && (
                                    <span>Fat {Math.round(item.fat_grams)} g</span>
                                  )}
                                  {typeof item.confidence === 'number' && (
                                    <span>Confidence {Math.round(item.confidence * 100)}%</span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.insights?.length > 0 && (
                        <div className="space-y-2 text-sm text-white/70">
                          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Insights</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.insights.map((insight, index) => (
                              <span
                                key={`${insight}-${index}`}
                                className="rounded-full border border-[#00FF7F]/20 bg-[#07110c]/70 px-3 py-1 text-xs text-white/60"
                              >
                                {removeMarkdown(insight)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysis.recommendations?.length > 0 && (
                        <div className="space-y-2 text-sm text-white/70">
                          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Recommendations</p>
                          <ul className="space-y-2">
                            {analysis.recommendations.map((recommendation, index) => (
                              <li
                                key={`${recommendation}-${index}`}
                                className="rounded-2xl border border-[#00FF7F]/20 bg-[#00FF7F]/5 px-4 py-2 text-xs text-[#9fffcf]"
                              >
                                {removeMarkdown(recommendation)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#00FF7F]/40 bg-[#00FF7F]/10 px-4 py-3 text-sm font-semibold text-[#00FF7F] transition hover:border-[#00FF7F]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Add to meal history
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
