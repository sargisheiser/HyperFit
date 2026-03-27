import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, History, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchMealHistory, fetchNutritionSnapshot } from '../../services/nutritionService'
import useUserStore from '../../store/userStore'
import useNutritionStore from '../../store/useNutritionStore'
import api from '../../services/api'
import NeonCard from '../NeonCard'
import LoadingSpinner from '../LoadingSpinner'
import logger from '../../utils/logger'
import AnalysisCorrection from './AnalysisCorrection'
import Calendar from './Calendar'

export default function MealHistory({ onEdit, onDelete }) {
  const { user } = useAuth()
  const { profile } = useUserStore((state) => ({ profile: state.profile }))
  const { setDailySnapshot } = useNutritionStore((state) => ({ setDailySnapshot: state.setDailySnapshot }))
  const userId = user?.id
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingFoodLog, setEditingFoodLog] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const entries = await fetchMealHistory(userId, { limit: 100 })
      setHistory(entries)
    } catch (err) {
      logger.error('Meal history fetch failed:', err)
      setError('Mahlzeitenhistorie konnte nicht geladen werden.')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Filter history by selected date
  const filteredHistory = useMemo(() => {
    if (!selectedDate) return history
    
    const selectedDateStr = selectedDate.toDateString()
    return history.filter((entry) => {
      const entryDate = entry.created_at 
        ? new Date(entry.created_at).toDateString()
        : entry.date 
          ? new Date(entry.date).toDateString()
          : null
      return entryDate === selectedDateStr
    })
  }, [history, selectedDate])

  const handleDateSelect = useCallback((date) => {
    setSelectedDate(date)
  }, [])

  const handleEdit = useCallback(async (entry) => {
    try {
      if (!entry.id) {
        logger.error('Entry has no ID:', entry)
        setError('Mahlzeit-ID fehlt. Bitte versuche es erneut.')
        return
      }
      
      // Fetch full food log data
      const { data } = await api.get(`/api/food/${entry.id}`)
      if (data) {
        setEditingFoodLog(data)
      } else {
        setEditingFoodLog(entry)
      }
    } catch (err) {
      logger.error('Failed to fetch food log:', err)
      if (entry && entry.id) {
        setEditingFoodLog(entry)
      } else {
        setError(err.response?.data?.detail || 'Mahlzeit konnte nicht geladen werden.')
      }
    }
  }, [])

  const handleDelete = useCallback(async (deletedId) => {
    setEditingFoodLog(null)
    await loadHistory()
    
      // Update nutrition snapshot to reflect deleted meal calories and macros
      try {
        const freshSnapshot = await fetchNutritionSnapshot(userId, profile)
        setDailySnapshot(freshSnapshot, { profile, preserveHistory: true })
      } catch (snapshotError) {
        logger.error('[MealHistory] Failed to fetch fresh snapshot after deletion:', snapshotError)
      }
    
    onDelete?.(deletedId)
  }, [loadHistory, onDelete, userId, profile, setDailySnapshot])

  const handleDirectDelete = useCallback(async (entry) => {
    if (!entry || !entry.id) {
      setError('Mahlzeit-ID fehlt. Bitte versuche es erneut.')
      return
    }

    setDeletingId(entry.id)
    setError(null)

    try {
      await api.delete(`/api/food/${entry.id}`)
      
      // Remove from local state immediately
      setHistory((prev) => prev.filter((item) => item.id !== entry.id))
      
      // Update nutrition snapshot to reflect deleted meal calories and macros
      try {
        const freshSnapshot = await fetchNutritionSnapshot(userId, profile)
        setDailySnapshot(freshSnapshot, { profile, preserveHistory: true })
      } catch (snapshotError) {
        logger.error('[MealHistory] Failed to fetch fresh snapshot after deletion:', snapshotError)
      }
      
      setShowDeleteConfirm(null)
      onDelete?.(entry.id)
    } catch (err) {
      logger.error('Failed to delete meal:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Mahlzeit konnte nicht gelöscht werden.'
      
      // Handle 404 specifically
      if (err.response?.status === 404) {
        const detail = err.response?.data?.detail || ''
        if (detail.includes('not found')) {
          setError('Diese Mahlzeit existiert nicht mehr. Sie wurde möglicherweise bereits gelöscht.')
          // Remove from local state if it doesn't exist
          setHistory((prev) => prev.filter((item) => item.id !== entry.id))
        } else {
          setError(errorMessage)
        }
      } else {
        setError(errorMessage)
      }
    } finally {
      setDeletingId(null)
    }
  }, [userId, profile, setDailySnapshot, onDelete])

  const handleCorrected = useCallback(async () => {
    setEditingFoodLog(null)
    await loadHistory()
    onEdit?.()
  }, [loadHistory, onEdit])

  if (loading) {
    return (
      <NeonCard>
        <div className="flex items-center justify-center p-12">
          <LoadingSpinner label="Lade Mahlzeitenhistorie..." />
        </div>
      </NeonCard>
    )
  }

  if (error) {
    return (
      <NeonCard>
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      </NeonCard>
    )
  }

  return (
    <>
      <NeonCard>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-[#00FF7F]" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Mahlzeitenhistorie</p>
                <h2 className="text-lg font-semibold text-white">
                  {selectedDate ? 'Mahlzeiten am ' + selectedDate.toLocaleDateString('de-DE') : 'Alle Mahlzeiten'}
                </h2>
              </div>
            </div>
            <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
          </div>

          {filteredHistory.length === 0 ? (
                  <p className="text-sm text-white/60">
                    {selectedDate 
                      ? `Keine Mahlzeiten am ${selectedDate.toLocaleDateString('de-DE')} gefunden.`
                      : 'Noch keine Mahlzeiten geloggt. Analysiere deine erste Mahlzeit, um eine Historie aufzubauen.'}
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredHistory.map((entry) => (
                <motion.div
                  key={entry.id || entry.created_at}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 p-4 text-sm text-white/70"
                >
                  <div className="flex items-center justify-between text-xs text-white/40 mb-3">
                    <span>
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString('de-DE')
                        : entry.date
                          ? new Date(entry.date).toLocaleDateString('de-DE')
                          : 'Unbekanntes Datum'}
                    </span>
                    <span>
                      {entry.total_calories ?? entry.calories
                        ? `${Math.round(entry.total_calories ?? entry.calories ?? 0)} kcal`
                        : '—'}
                    </span>
                  </div>

                  {entry.image_path && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                      <img 
                        src={entry.image_path.startsWith('http') ? entry.image_path : `http://localhost:8000/${entry.image_path}`} 
                        alt={entry.food_items?.[0]?.name || 'Meal'} 
                        className="h-32 w-full object-cover" 
                      />
                    </div>
                  )}

                  <p className="mt-3 text-sm font-semibold text-white">
                    {entry.food_items?.map((item) => item.name).filter(Boolean).join(', ') || 'Unlabeled meal'}
                  </p>

                  {entry.food_items?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {entry.food_items.slice(0, 3).map((item, idx) => (
                        <div key={`${item.name ?? 'history'}-${idx}`} className="rounded-xl border border-white/10 bg-[#0B0D13]/60 p-2">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-xs text-white/80">{item.name || 'Zutat'}</span>
                            {item.quantity && <span className="text-[10px] text-white/40">{item.quantity}</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
                            {item.calories !== null && item.calories !== undefined && (
                              <span>{Math.round(item.calories)} kcal</span>
                            )}
                            {item.protein_grams !== null && item.protein_grams !== undefined && (
                              <span>P {Math.round(item.protein_grams)}g</span>
                            )}
                            {item.carbs_grams !== null && item.carbs_grams !== undefined && (
                              <span>K {Math.round(item.carbs_grams)}g</span>
                            )}
                            {item.fat_grams !== null && item.fat_grams !== undefined && (
                              <span>F {Math.round(item.fat_grams)}g</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {entry.food_items.length > 3 && (
                        <p className="text-xs text-white/40">+{entry.food_items.length - 3} weitere</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                    <span>
                      Protein {Math.round(entry.macronutrients?.protein_grams ?? entry.protein ?? 0)}g
                    </span>
                    <span>Carbs {Math.round(entry.macronutrients?.carbs_grams ?? entry.carbs ?? 0)}g</span>
                    <span>Fat {Math.round(entry.macronutrients?.fat_grams ?? entry.fat ?? 0)}g</span>
                  </div>

                  {entry.confidence_score && (
                    <p className="mt-2 text-xs text-white/40">
                      Konfidenz {Math.round(entry.confidence_score * 100)}%
                    </p>
                  )}

                  {entry.note && (
                    <p className="mt-2 text-xs text-white/50 italic">"{entry.note}"</p>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      disabled={!entry.id}
                      className="flex items-center gap-1 rounded-lg border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-3 py-1.5 text-xs font-medium text-[#00FF7F] transition hover:bg-[#00FF7F]/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Edit2 className="h-3 w-3" />
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(entry.id)}
                      disabled={!entry.id || deletingId === entry.id}
                      className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === entry.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Löschen...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3" />
                          Löschen
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </NeonCard>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Mahlzeit löschen?</h3>
                  <p className="text-sm text-white/60">
                    Diese Aktion kann nicht rückgängig gemacht werden. Die Kalorien werden von deinem Tagesziel abgezogen.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deletingId !== null}
                  className="flex-1 rounded-xl border border-white/10 bg-[#07110c]/60 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-[#07110c]/80 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    const entry = history.find((e) => e.id === showDeleteConfirm)
                    if (entry) {
                      handleDirectDelete(entry)
                    }
                  }}
                  disabled={deletingId !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird gelöscht...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Endgültig löschen
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Correction Modal */}
      {editingFoodLog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur"
          onClick={() => setEditingFoodLog(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl"
            >
              <AnalysisCorrection
                foodLog={editingFoodLog}
                onCorrected={handleCorrected}
                onDeleted={handleDelete}
                onCancel={() => setEditingFoodLog(null)}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  )
}

