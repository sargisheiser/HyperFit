import { useState, useMemo } from 'react'
import { Camera, ImagePlus, QrCode, ScrollText } from 'lucide-react'
import MacrosSummary from './MacrosSummary'
import CalorieOptimizerModal from './CalorieOptimizerModal'
import HyperFitVisionModal from './HyperFitVisionModal'
import Calendar from './Calendar'
import useNutritionStore from '../../store/useNutritionStore'
import useUserStore from '../../store/userStore'
import useNutritionData from '../../hooks/useNutritionData'
import { requestCalorieOptimization, calculateCaloriesFromMacros, fetchNutritionSnapshot } from '../../services/nutritionService'

export default function NutritionDashboard({ onOpenAnalyzer }) {
  const { isLoading, calorieGoal, calorieIntake, macros, userId, lastError } = useNutritionData()
  const { setCalorieGoal, checkInData, compliance } = useNutritionStore((state) => ({
    setCalorieGoal: state.setCalorieGoal,
    checkInData: state.checkInData,
    compliance: state.compliance,
  }))
  const [optimizerOpen, setOptimizerOpen] = useState(false)
  const [optimizerSuggestion, setOptimizerSuggestion] = useState(null)
  const [isVisionOpen, setIsVisionOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)

  // Calculate calories from macros and use the higher value
  const caloriesFromMacros = useMemo(() => calculateCaloriesFromMacros(macros), [macros])
  const displayCalorieIntake = useMemo(() => {
    // Use calories from macros if available and higher, otherwise use calorieIntake
    return caloriesFromMacros > 0 && caloriesFromMacros >= (calorieIntake ?? 0) 
      ? caloriesFromMacros 
      : (calorieIntake ?? 0)
  }, [caloriesFromMacros, calorieIntake])
  
  const remainingCalories = Math.max((calorieGoal ?? 0) - displayCalorieIntake, 0)

  const openOptimizer = async () => {
    if (!userId) return
    try {
      const suggestion = await requestCalorieOptimization(userId)
      setOptimizerSuggestion(suggestion)
      setOptimizerOpen(true)
    } catch (error) {
      console.error('Failed to fetch calorie optimization', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-3xl bg-[#101112] p-6 text-sm text-white/60 shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
        Daten werden geladen…
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="space-y-4 rounded-3xl bg-[#101112] p-6 text-sm text-white/70 shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
        <p>Bitte melde dich an, um deine Ernährungsdaten zu sehen.</p>
      </div>
    )
  }

  const handleDateSelect = async (date) => {
    setSelectedDate(date)
    // If date is selected, fetch nutrition snapshot for that date
    if (date && userId) {
      try {
        const { fetchNutritionSnapshot } = await import('../../services/nutritionService')
        const { profile } = useUserStore.getState()
        const snapshot = await fetchNutritionSnapshot(userId, profile, date)
        const { setDailySnapshot } = useNutritionStore.getState()
        setDailySnapshot(snapshot, { profile, preserveHistory: true })
      } catch (error) {
        console.error('Failed to fetch nutrition for date:', error)
      }
    } else if (!date && userId) {
      // If date is cleared, fetch today's snapshot
      try {
        const { fetchNutritionSnapshot } = await import('../../services/nutritionService')
        const { profile } = useUserStore.getState()
        const snapshot = await fetchNutritionSnapshot(userId, profile, null)
        const { setDailySnapshot } = useNutritionStore.getState()
        setDailySnapshot(snapshot, { profile, preserveHistory: true })
      } catch (error) {
        console.error('Failed to fetch nutrition for today:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendar for date selection */}
      <div className="flex justify-end">
        <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
      </div>
      {lastError && (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {lastError?.response?.data?.detail || lastError?.message || 'Ernährungsdaten konnten nicht geladen werden.'}
        </div>
      )}
      <section className="rounded-[36px] bg-gradient-to-br from-[#121b14]/88 via-[#0a140e]/85 to-[#060907]/88 p-6 text-[#b6fbd4] shadow-[0_0_48px_rgba(0,255,127,0.12)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">Ernährungsübersicht</p>
              <p className="text-[10px] text-white/30">
                {selectedDate 
                  ? selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
            <h2 className="text-2xl font-semibold text-white">HyperFit Ernährungs-Dashboard</h2>
            <p className="max-w-xl text-sm text-white/60">
              Steuere deine Kalorien und Makros mit präzisen HyperFit-Berechnungen. Synchronisiere Check-Ins und optimiere deine Ernährung.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onOpenAnalyzer?.('camera')}
              className="hidden flex h-12 w-12 items-center justify-center rounded-xl bg-[#121315] text-white shadow-[0_6px_20px_rgba(0,255,127,0.1)] transition hover:shadow-[0_8px_24px_rgba(0,255,127,0.16)]"
              aria-label="Kamera öffnen"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenAnalyzer?.('qr')}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#121315] text-white shadow-[0_6px_20px_rgba(0,255,127,0.1)] transition hover:shadow-[0_8px_24px_rgba(0,255,127,0.16)]"
              aria-label="QR-Code scannen"
            >
              <QrCode className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsVisionOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#121315] text-white shadow-[0_6px_20px_rgba(0,255,127,0.1)] transition hover:shadow-[0_8px_24px_rgba(0,255,127,0.16)]"
              title="Upload meal photo for AI analysis"
              aria-label="Upload meal photo"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[24px] bg-[#07110c]/80 p-4 text-sm text-[#d0ffe8] shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Kalorienziel</p>
            <p className="mt-2 text-2xl font-semibold text-white">{Math.round(calorieGoal ?? 0)} kcal</p>
            <p className="mt-2 text-xs text-[#9bfcd0]/70">Tagesziel</p>
          </div>
          <div className="rounded-[24px] bg-[#07110c]/80 p-4 text-sm text-[#d0ffe8] shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Aufgenommen</p>
            <p className="mt-2 text-2xl font-semibold text-white">{Math.round(displayCalorieIntake)} kcal</p>
            <p className="mt-2 text-xs text-[#9bfcd0]/70">
              {caloriesFromMacros > 0 && caloriesFromMacros !== displayCalorieIntake 
                ? `Aus Makros: ${Math.round(caloriesFromMacros)} kcal`
                : 'Heute geloggt'}
            </p>
          </div>
          <div className="rounded-[24px] bg-[#07110c]/80 p-4 text-sm text-[#d0ffe8] shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Verbleibend</p>
            <p className="mt-2 text-2xl font-semibold text-[#00FF7F]">
              {Math.round(remainingCalories)} kcal
            </p>
            <p className="mt-2 text-xs text-[#9bfcd0]/70">Bis zum Ziel</p>
          </div>
          <div className="rounded-[24px] bg-[#07110c]/80 p-4 text-sm text-[#d0ffe8] shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8cffc7]">Fortschritt</p>
            <p className={`mt-2 text-2xl font-semibold ${
              calorieGoal && displayCalorieIntake > calorieGoal + 100 
                ? 'text-red-400' 
                : calorieGoal && displayCalorieIntake > calorieGoal 
                  ? 'text-yellow-400' 
                  : 'text-white'
            }`}>
              {calorieGoal ? Math.round((displayCalorieIntake / calorieGoal) * 100) : 0}%
            </p>
            <p className="mt-2 text-xs text-[#9bfcd0]/70">
              {calorieGoal && displayCalorieIntake > calorieGoal 
                ? `+${Math.round(displayCalorieIntake - calorieGoal)} kcal über Ziel` 
                : 'Erreicht'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <MacrosSummary macros={macros} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            onClick={openOptimizer}
            className="flex items-center justify-between rounded-[24px] bg-gradient-to-r from-[#00FF7F1a] to-[#00C46A1a] px-5 py-4 text-left text-[#d0ffe8] shadow-[0_10px_24px_rgba(0,255,127,0.08)] transition hover:shadow-[0_14px_30px_rgba(0,255,127,0.12)]"
          >
            <div>
              <p className="text-sm font-semibold text-white">Kalorienberechnung optimieren</p>
              <p className="text-xs text-[#9bfcd0]/70">HyperFit analysiert deine Woche und schlägt präzise Targets vor.</p>
            </div>
            <ScrollText className="h-5 w-5 text-[#00FF7F]" />
          </button>
          <div className="flex h-full flex-col justify-between rounded-[24px] bg-[#07110c]/85 px-5 py-4 text-left text-[#d0ffe8] shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#07150d] p-2 text-[#00FF7F] shadow-[0_6px_18px_rgba(0,255,127,0.12)]">
                <ScrollText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Letztes Check-In</p>
                <p className="text-xs text-[#9bfcd0]/80">
                  {checkInData.lastCheckInDate
                    ? new Date(checkInData.lastCheckInDate).toLocaleDateString('de-DE')
                    : 'Noch kein Check-In durchgeführt'}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#b6fbd4]">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8cffc7]">Empfehlung</p>
                <p className="mt-1 text-sm text-white">
                  {checkInData.recommendation ?? 'Starte ein Check-In, um personalisierte Tipps zu erhalten.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-[#9bfcd0]/80">
                <span className="rounded-full bg-[#091a13]/80 px-3 py-1 shadow-[0_4px_12px_rgba(0,255,127,0.1)]">
                  Ziel: {checkInData.goal ?? '—'}
                </span>
                <span className="rounded-full bg-[#091a13]/80 px-3 py-1 shadow-[0_4px_12px_rgba(0,255,127,0.1)]">
                  Vorschlag:{' '}
                  {checkInData.suggestedCalories ? `${Math.round(checkInData.suggestedCalories)} kcal` : '—'}
                </span>
                <span className="rounded-full bg-[#091a13]/80 px-3 py-1 shadow-[0_4px_12px_rgba(0,255,127,0.1)]">
                  Compliance: {compliance ? `${Math.round(compliance)}%` : 'n/a'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </section>

      <CalorieOptimizerModal
        open={optimizerOpen}
        onClose={() => setOptimizerOpen(false)}
        onAccept={() => {
          if (optimizerSuggestion?.suggested) {
            setCalorieGoal(optimizerSuggestion.suggested)
          }
          setOptimizerOpen(false)
        }}
        onDecline={() => setOptimizerOpen(false)}
        suggestion={
          optimizerSuggestion ?? {
            previous: calorieGoal ?? 0,
            suggested: calorieGoal ?? 0,
            difference: 0,
            explanation: 'Sammle ein paar Tage Daten, um eine Empfehlung zu erhalten.',
          }
        }
      />
      <HyperFitVisionModal open={isVisionOpen} onClose={() => setIsVisionOpen(false)} />
    </div>
  )
}

