import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Edit2, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchMealHistory } from '../../services/nutritionService'
import AnalysisCorrection from '../Nutrition/AnalysisCorrection'
import api from '../../services/api'
import logger from '../../utils/logger'

export default function HistorieTab() {
  const { user } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadMeals = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const entries = await fetchMealHistory(user.id, { limit: 50 })
      setMeals(entries)
    } catch (err) {
      logger.error('[HistorieTab] Load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadMeals()
  }, [loadMeals])

  const grouped = useMemo(() => {
    const groups = {}
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    meals.forEach((meal) => {
      const date = new Date(meal.created_at).toISOString().split('T')[0]
      let label = new Date(meal.created_at).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      if (date === today) label = 'Heute'
      else if (date === yesterday) label = 'Gestern'

      if (!groups[date]) groups[date] = { label, meals: [] }
      groups[date].meals.push(meal)
    })

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [meals])

  const handleDelete = useCallback(
    async (mealId) => {
      setDeletingId(mealId)
      try {
        await api.delete(`/api/nutrition/meals/${mealId}`)
        setMeals((prev) => prev.filter((m) => m.id !== mealId))
      } catch (err) {
        logger.error('[HistorieTab] Delete failed:', err)
      } finally {
        setDeletingId(null)
      }
    },
    [],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#00FF7F]/50" />
      </div>
    )
  }

  if (meals.length === 0) {
    return (
      <div className="rounded-2xl border border-white/6 bg-white/2 py-12 text-center">
        <p className="text-sm text-white/30">Noch keine Mahlzeiten erfasst</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {grouped.map(([dateKey, { label, meals: dayMeals }]) => (
        <div key={dateKey}>
          {/* Day header */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-medium text-white/40">{label}</span>
            <span className="text-sm text-white/20">· {dayMeals.length} Mahlzeiten</span>
          </div>

          {/* Timeline */}
          <div className="relative pl-5">
            {/* Vertical line */}
            <div className="absolute bottom-2 left-[5px] top-2 w-0.5 bg-white/6" />

            <div className="space-y-3">
              {dayMeals.map((meal, idx) => {
                const isFirst = idx === 0 && dateKey === grouped[0]?.[0]
                const isExpanded = expandedId === meal.id
                const calories = meal.total_calories ?? meal.calories ?? 0
                const time = new Date(meal.created_at).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const itemCount = meal.food_items?.length ?? 0
                const confidence = meal.confidence_score
                  ? Math.round(meal.confidence_score * 100)
                  : null
                const name =
                  meal.food_items?.[0]?.name || meal.note || 'Mahlzeit'

                return (
                  <div key={meal.id} className="relative">
                    {/* Dot */}
                    <div
                      className={`absolute -left-5 top-4 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0f] ${
                        isFirst ? 'bg-[#00FF7F]' : 'bg-white/20'
                      }`}
                    />

                    {/* Card */}
                    <div className="rounded-xl border border-white/6 bg-white/2 transition hover:bg-white/3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : meal.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-white">{name}</span>
                            <span className="flex-shrink-0 text-sm font-medium text-[#00FF7F]/60">
                              {Math.round(calories)} kcal
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-white/30">
                            {time}
                            {itemCount > 0 && ` · ${itemCount} Lebensmittel`}
                            {confidence && ` · ${confidence}%`}
                          </div>
                        </div>
                        <ChevronRight
                          className={`ml-2 h-4 w-4 flex-shrink-0 text-white/15 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-white/4 px-4 py-3 space-y-3">
                              {/* Food items */}
                              {meal.food_items?.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-white/60">{item.name}</span>
                                  <span className="text-white/30">
                                    {item.quantity || '—'} · {Math.round(item.calories || 0)} kcal
                                  </span>
                                </div>
                              ))}

                              {/* Macros */}
                              <div className="flex gap-4 text-sm text-white/30">
                                <span>P {Math.round(meal.macronutrients?.protein_grams || meal.protein || 0)}g</span>
                                <span>C {Math.round(meal.macronutrients?.carbs_grams || meal.carbs || 0)}g</span>
                                <span>F {Math.round(meal.macronutrients?.fat_grams || meal.fat || 0)}g</span>
                              </div>

                              {meal.note && (
                                <p className="text-sm text-white/20 italic">„{meal.note}"</p>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingMeal(meal)
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/40 transition hover:text-white/60"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(meal.id)
                                  }}
                                  disabled={deletingId === meal.id}
                                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-red-400/60 transition hover:text-red-400"
                                >
                                  {deletingId === meal.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  Löschen
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Edit modal */}
      <AnimatePresence>
        {editingMeal && (
          <AnalysisCorrection
            foodLog={editingMeal}
            onClose={() => {
              setEditingMeal(null)
              loadMeals()
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
