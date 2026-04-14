import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Flame, Heart, Play, Zap } from 'lucide-react'
import SectionTitle from '../components/ui/SectionTitle'
import WorkoutTracker from './WorkoutTracker'
import { useAuth } from '../contexts/AuthContext'
import { fetchWorkoutHistory, saveWorkoutSession } from '../services/workoutService'
import logger from '../utils/logger'

const WORKOUT_TYPES = [
  { id: 'strength', label: 'Krafttraining', icon: Dumbbell, emoji: '💪' },
  { id: 'cardio', label: 'Cardio', icon: Flame, emoji: '🏃' },
  { id: 'yoga', label: 'Yoga', icon: Heart, emoji: '🧘' },
  { id: 'hiit', label: 'HIIT', icon: Zap, emoji: '⚡' },
]

export default function TrackPage() {
  const { user } = useAuth()
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [lastWorkout, setLastWorkout] = useState(null)
  const [loggingType, setLoggingType] = useState(null)
  const [logForm, setLogForm] = useState({ duration: '', calories: '', notes: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadLast() {
      if (!user?.id) return
      try {
        const history = await fetchWorkoutHistory(user.id)
        if (history?.length > 0) setLastWorkout(history[0])
      } catch (err) {
        logger.debug('[TrackPage] No workout history:', err)
      }
    }
    loadLast()
  }, [user?.id])

  const handleQuickLog = useCallback(
    async (type) => {
      if (loggingType === type) {
        // Submit the form
        if (!logForm.duration) return
        setIsSaving(true)
        try {
          await saveWorkoutSession({
            user_id: user.id,
            name: WORKOUT_TYPES.find((t) => t.id === type)?.label || type,
            workout_type: type,
            duration_minutes: parseInt(logForm.duration) || 0,
            calories_burned: parseInt(logForm.calories) || 0,
            intensity_level: 'moderate',
          })
          setLoggingType(null)
          setLogForm({ duration: '', calories: '', notes: '' })
          const history = await fetchWorkoutHistory(user.id)
          if (history?.length > 0) setLastWorkout(history[0])
        } catch (err) {
          logger.error('[TrackPage] Save failed:', err)
        } finally {
          setIsSaving(false)
        }
      } else {
        setLoggingType(type)
      }
    },
    [loggingType, logForm, user?.id],
  )

  if (isLiveMode) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setIsLiveMode(false)}
          className="text-sm text-white/40 transition hover:text-white/60"
        >
          ← Zurück
        </button>
        <WorkoutTracker />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Track" subtitle="Training starten & loggen" />

      {/* Hero start button */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsLiveMode(true)}
        className="w-full rounded-2xl border-2 border-dashed border-[#00FF7F]/15 bg-[#00FF7F]/2 px-6 py-10 text-center transition hover:border-[#00FF7F]/30 hover:bg-[#00FF7F]/5"
      >
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#00FF7F]/30 bg-[#00FF7F]/10">
          <Play className="h-8 w-8 text-[#00FF7F]" />
        </div>
        <div className="text-base font-medium text-white">Live-Workout starten</div>
        <div className="mt-1 text-sm text-white/30">KI-gestütztes Pose-Tracking</div>
      </motion.button>

      {/* Quick log */}
      <div>
        <h3 className="mb-3 text-sm text-white/40">Schnell loggen</h3>
        <div className="grid grid-cols-2 gap-3">
          {WORKOUT_TYPES.map(({ id, label, emoji }) => (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleQuickLog(id)}
              className={`rounded-2xl border p-4 text-center transition ${
                loggingType === id
                  ? 'border-[#00FF7F]/30 bg-[#00FF7F]/5'
                  : 'border-white/6 bg-white/2 hover:bg-white/4'
              }`}
            >
              <div className="mb-2 text-2xl">{emoji}</div>
              <div className="text-sm text-white">{label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick log form (expands when type selected) */}
      <AnimatePresence>
        {loggingType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-[#00FF7F]/10 bg-[#00FF7F]/2 p-4">
              <h4 className="text-sm font-medium text-[#00FF7F]">
                {WORKOUT_TYPES.find((t) => t.id === loggingType)?.label} loggen
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-white/40">Dauer (Min)</label>
                  <input
                    type="number"
                    value={logForm.duration}
                    onChange={(e) => setLogForm((f) => ({ ...f, duration: e.target.value }))}
                    placeholder="45"
                    className="w-full rounded-xl border border-white/10 bg-white/3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#00FF7F]/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/40">Kalorien</label>
                  <input
                    type="number"
                    value={logForm.calories}
                    onChange={(e) => setLogForm((f) => ({ ...f, calories: e.target.value }))}
                    placeholder="320"
                    className="w-full rounded-xl border border-white/10 bg-white/3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#00FF7F]/30 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleQuickLog(loggingType)}
                  disabled={!logForm.duration || isSaving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#00CC66] py-2.5 text-sm font-semibold text-[#0a0a0f] transition disabled:opacity-50"
                >
                  {isSaving ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  onClick={() => setLoggingType(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/40 transition hover:bg-white/5"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last workout */}
      {lastWorkout && (
        <div className="flex items-center gap-3 rounded-xl bg-white/2 p-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#00FF7F]/10 text-base">
            💪
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white">{lastWorkout.name || 'Letztes Training'}</div>
            <div className="text-sm text-white/30">
              {lastWorkout.duration_minutes ? `${lastWorkout.duration_minutes} Min` : ''}
              {lastWorkout.calories_burned ? ` · ${Math.round(lastWorkout.calories_burned)} kcal` : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
