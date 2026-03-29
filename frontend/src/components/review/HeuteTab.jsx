import { useEffect } from 'react'
import { motion } from 'framer-motion'
import LoadingSpinner from '../LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'
import { useAuth } from '../../contexts/AuthContext'
import useUserStore from '../../store/userStore'
import { useNutritionStore } from '../../store/useNutritionStore'
import useDashboardStats from '../../hooks/useDashboardStats'
import { useSteps } from '../../hooks/useSteps'

export default function HeuteTab() {
  const { user } = useAuth()
  const { profile, fetchProfile } = useUserStore()
  const { calorieGoal, calorieIntake, macros } = useNutritionStore()
  const { workouts, loading, error } = useDashboardStats(true)
  const { activityStats } = useSteps()

  useEffect(() => {
    if (user && !profile) fetchProfile()
  }, [user, profile, fetchProfile])

  if (loading) return <LoadingSpinner label="Lade Tagesdaten..." />

  const progress = calorieGoal > 0 ? Math.min(Math.round((calorieIntake / calorieGoal) * 100), 100) : 0
  const remaining = Math.max(0, calorieGoal - calorieIntake)

  const proteinCurrent = macros?.protein?.current ?? 0
  const proteinTarget = macros?.protein?.target ?? 150
  const carbsCurrent = macros?.carbs?.current ?? 0
  const carbsTarget = macros?.carbs?.target ?? 250
  const fatCurrent = macros?.fat?.current ?? 0
  const fatTarget = macros?.fat?.target ?? 80

  const weeklyWorkouts = workouts?.filter((w) => {
    const d = new Date(w.created_at)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= weekAgo
  }).length ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {error && <ErrorMessage message={error} />}

      {/* Hero calorie card */}
      <div className="rounded-2xl border border-[#00FF7F]/8 bg-[#00FF7F]/3 px-6 py-8 text-center">
        <div className="text-5xl font-extralight text-white">{Math.round(calorieIntake).toLocaleString()}</div>
        <p className="mt-2 text-sm text-white/30">
          von {Math.round(calorieGoal).toLocaleString()} kcal · {progress}% erreicht
        </p>
        <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#00FF7F] to-[#00CC66]"
          />
        </div>
        {remaining > 0 && (
          <p className="mt-2 text-sm text-white/20">{Math.round(remaining)} kcal verbleibend</p>
        )}
      </div>

      {/* Macro rows */}
      <div className="space-y-2">
        {[
          { label: 'Protein', current: proteinCurrent, target: proteinTarget, active: true },
          { label: 'Carbs', current: carbsCurrent, target: carbsTarget, active: false },
          { label: 'Fett', current: fatCurrent, target: fatTarget, active: false },
        ].map(({ label, current, target, active }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-white/2 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-2 w-2 rounded-full ${active ? 'bg-[#00FF7F]' : 'bg-white/20'}`}
              />
              <span className="text-sm text-white">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-medium text-white">{Math.round(current)}</span>
              <span className="text-sm text-white/30">/ {Math.round(target)}g</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/6 bg-white/2 p-3 text-center">
          <div className="text-base font-medium text-white">
            {profile?.weight_kg ? `${profile.weight_kg} kg` : '—'}
          </div>
          <div className="mt-1 text-sm text-white/30">Gewicht</div>
        </div>
        <div className="rounded-xl border border-white/6 bg-white/2 p-3 text-center">
          <div className="text-base font-medium text-white">{weeklyWorkouts}</div>
          <div className="mt-1 text-sm text-white/30">Workouts</div>
        </div>
        <div className="rounded-xl border border-white/6 bg-white/2 p-3 text-center">
          <div className="text-base font-medium text-white">
            {activityStats?.steps ? activityStats.steps.toLocaleString() : '—'}
          </div>
          <div className="mt-1 text-sm text-white/30">Schritte</div>
        </div>
      </div>
    </motion.div>
  )
}
