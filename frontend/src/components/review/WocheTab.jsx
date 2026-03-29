import { useMemo } from 'react'
import { motion } from 'framer-motion'
import useDashboardStats from '../../hooks/useDashboardStats'
import { useNutritionStore } from '../../store/useNutritionStore'
import LoadingSpinner from '../LoadingSpinner'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function WocheTab() {
  const { foodLogs, workouts, loading } = useDashboardStats(true)
  const { calorieGoal } = useNutritionStore()

  const weekData = useMemo(() => {
    const now = new Date()
    const dayOfWeek = (now.getDay() + 6) % 7 // Monday = 0
    const days = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(now)
      date.setDate(now.getDate() - dayOfWeek + i)
      const dateStr = date.toISOString().split('T')[0]

      const dayCalories = foodLogs
        .filter((log) => {
          const logDate = new Date(log.created_at).toISOString().split('T')[0]
          return logDate === dateStr
        })
        .reduce((sum, log) => sum + (log.total_calories || 0), 0)

      days.push({
        label: DAYS[i],
        calories: Math.round(dayCalories),
        isFuture: i > dayOfWeek,
        isToday: i === dayOfWeek,
      })
    }
    return days
  }, [foodLogs])

  const maxCalories = useMemo(() => {
    const maxFromData = Math.max(...weekData.map((d) => d.calories), 1)
    return Math.max(maxFromData, calorieGoal || 2000)
  }, [weekData, calorieGoal])

  const avgCalories = useMemo(() => {
    const activeDays = weekData.filter((d) => !d.isFuture && d.calories > 0)
    if (activeDays.length === 0) return 0
    return Math.round(activeDays.reduce((sum, d) => sum + d.calories, 0) / activeDays.length)
  }, [weekData])

  const avgProtein = useMemo(() => {
    const activeLogs = foodLogs.filter((log) => {
      const logDate = new Date(log.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return logDate >= weekAgo
    })
    if (activeLogs.length === 0) return 0
    const totalProtein = activeLogs.reduce((sum, log) => {
      const macros = log.macronutrients || {}
      return sum + (macros.protein_grams || macros.protein || 0)
    }, 0)
    const days = new Set(activeLogs.map((l) => new Date(l.created_at).toISOString().split('T')[0])).size
    return days > 0 ? Math.round(totalProtein / days) : 0
  }, [foodLogs])

  if (loading) return <LoadingSpinner label="Lade Wochendaten..." />

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div>
        <h3 className="text-base font-medium text-white">Diese Woche</h3>
        <p className="text-sm text-white/30">Kalorien pro Tag</p>
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-white/6 bg-white/2 p-5">
        {/* Goal line label */}
        {calorieGoal > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px flex-1 border-t border-dashed border-[#00FF7F]/20" />
            <span className="text-sm text-[#00FF7F]/40">{Math.round(calorieGoal)} Ziel</span>
          </div>
        )}

        {/* Bars */}
        <div className="flex items-end gap-2" style={{ height: 160 }}>
          {weekData.map((day, i) => {
            const height = day.isFuture ? 0 : (day.calories / maxCalories) * 100
            const isOverGoal = calorieGoal > 0 && day.calories > calorieGoal

            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                {/* Value */}
                {day.calories > 0 && (
                  <span className="text-sm text-white/40">{day.calories}</span>
                )}
                {/* Bar */}
                <div className="flex w-full flex-1 items-end justify-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, day.calories > 0 ? 4 : 0)}%` }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className={`w-full max-w-[32px] rounded-t-lg ${
                      day.isFuture
                        ? 'bg-white/4'
                        : day.isToday
                          ? isOverGoal
                            ? 'bg-red-500/60'
                            : 'bg-[#00FF7F]'
                          : isOverGoal
                            ? 'bg-red-500/30'
                            : 'bg-[#00FF7F]/40'
                    }`}
                  />
                </div>
                {/* Label */}
                <span
                  className={`text-sm ${
                    day.isToday ? 'font-medium text-[#00FF7F]' : 'text-white/30'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Averages */}
      <div className="space-y-2">
        <h4 className="text-sm text-white/40">Durchschnitt</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-white/2 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#00FF7F]" />
              <span className="text-sm text-white">Kalorien</span>
            </div>
            <span className="text-base font-medium text-white">{avgCalories} kcal/Tag</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/2 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-white/20" />
              <span className="text-sm text-white">Protein</span>
            </div>
            <span className="text-base font-medium text-white">{avgProtein}g/Tag</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/2 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-white/20" />
              <span className="text-sm text-white">Workouts</span>
            </div>
            <span className="text-base font-medium text-white">{workouts?.length ?? 0} gesamt</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
