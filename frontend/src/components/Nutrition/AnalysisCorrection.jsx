import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Save, X, Plus, Search, Loader2, Trash2 } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import NeonCard from '../NeonCard'
import logger from '../../utils/logger'

export default function AnalysisCorrection({ foodLog, onCorrected, onCancel, onDeleted }) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [foodItems, setFoodItems] = useState(foodLog?.food_items || [])
  const [totalCalories, setTotalCalories] = useState(foodLog?.total_calories || 0)
  const [macronutrients, setMacronutrients] = useState(
    foodLog?.macronutrients || {
      protein_grams: 0,
      carbs_grams: 0,
      fat_grams: 0,
    },
  )
  const [note, setNote] = useState(foodLog?.note || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const searchProducts = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const { data } = await api.get('/api/food/products/search', {
        params: { query, limit: 10 },
      })
      setSearchResults(data || [])
    } catch (err) {
      logger.error('Product search failed:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = useCallback(
    (e) => {
      const query = e.target.value
      setSearchQuery(query)
      if (query.length >= 2) {
        searchProducts(query)
      } else {
        setSearchResults([])
      }
    },
    [searchProducts],
  )

  const replaceItemWithProduct = useCallback(
    (index, product) => {
      const newItem = {
        name: product.name,
        quantity: '100g',
        calories_per_100g: product.calories_per_100g || 0,
        protein_per_100g: product.protein_per_100g || 0,
        carbs_per_100g: product.carbs_per_100g || 0,
        fat_per_100g: product.fat_per_100g || 0,
        image_url: product.image_url,
        barcode: product.barcode,
      }

      setFoodItems((prev) => prev.map((item, i) => (i === index ? newItem : item)))
      setSearchQuery('')
      setSearchResults([])
      setEditingItemIndex(null)
    },
    [],
  )

  const updateItem = useCallback((index, field, value) => {
    setFoodItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value }
        }
        return item
      }),
    )
  }, [])

  const removeItem = useCallback((index) => {
    setFoodItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addItem = useCallback(() => {
    const newItem = {
      name: '',
      quantity: '100g',
      calories_per_100g: 0,
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fat_per_100g: 0,
    }
    setFoodItems((prev) => [...prev, newItem])
  }, [])

  const calculateTotals = useMemo(() => {
    return foodItems.reduce(
      (acc, item) => {
        const quantity = item.quantity || '100g'
        let multiplier = 1.0

        if (typeof quantity === 'string' && quantity.toLowerCase().includes('g')) {
          try {
            const grams = parseFloat(quantity.toLowerCase().replace('g', '').trim())
            multiplier = grams / 100.0
          } catch {
            multiplier = 1.0
          }
        } else if (typeof quantity === 'number') {
          multiplier = quantity / 100.0
        }

        return {
          calories: acc.calories + (item.calories_per_100g || item.calories || 0) * multiplier,
          protein: acc.protein + (item.protein_per_100g || item.protein_grams || 0) * multiplier,
          carbs: acc.carbs + (item.carbs_per_100g || item.carbs_grams || 0) * multiplier,
          fat: acc.fat + (item.fat_per_100g || item.fat_grams || 0) * multiplier,
        }
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [foodItems])

  const handleDelete = useCallback(async () => {
    if (!foodLog || !foodLog.id) {
      setError('Ungültige Mahlzeit-ID. Bitte versuche es erneut.')
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      await api.delete(`/api/food/${foodLog.id}`)
      setShowDeleteConfirm(false)
      onDeleted?.(foodLog.id)
      onCancel?.()
    } catch (err) {
      logger.error('Failed to delete meal:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Mahlzeit konnte nicht gelöscht werden.'
      logger.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      })
      
      // Handle 404 specifically - entry might have been deleted already
      if (err.response?.status === 404) {
        const detail = err.response?.data?.detail || ''
        if (detail.includes('not found')) {
          setError('Diese Mahlzeit existiert nicht mehr. Sie wurde möglicherweise bereits gelöscht.')
          // Close the modal after a short delay
          setTimeout(() => {
            setShowDeleteConfirm(false)
            onCancel?.()
          }, 2000)
        } else {
          setError(errorMessage)
        }
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsDeleting(false)
    }
  }, [foodLog, onDeleted, onCancel])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    try {
      const payload = {
        food_log_id: foodLog.id,
        food_items: foodItems.map((item) => ({
          name: item.name,
          quantity: item.quantity || '100g',
          calories_per_100g: item.calories_per_100g || item.calories || 0,
          protein_per_100g: item.protein_per_100g || item.protein_grams || 0,
          carbs_per_100g: item.carbs_per_100g || item.carbs_grams || 0,
          fat_per_100g: item.fat_per_100g || item.fat_grams || 0,
          image_url: item.image_url,
          barcode: item.barcode,
        })),
        total_calories: totalCalories || calculateTotals.calories,
        macronutrients: {
          protein_grams: macronutrients.protein_grams || calculateTotals.protein,
          carbs_grams: macronutrients.carbs_grams || calculateTotals.carbs,
          fat_grams: macronutrients.fat_grams || calculateTotals.fat,
        },
        note: note.trim() || null,
      }

      if (!foodLog || !foodLog.id) {
        setError('Ungültige Mahlzeit-ID. Bitte versuche es erneut.')
        return
      }

      if (!foodLog || !foodLog.id) {
        setError('Ungültige Mahlzeit-ID. Bitte versuche es erneut.')
        setIsSaving(false)
        return
      }

      const { data } = await api.put(`/api/food/${foodLog.id}/correct`, payload)
      setIsEditing(false)
      onCorrected?.(data)
    } catch (err) {
      logger.error('Failed to correct meal:', err)
      setError(err.response?.data?.detail || 'Korrektur konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }, [foodLog, foodItems, totalCalories, macronutrients, note, calculateTotals, onCorrected])

  if (!foodLog) {
    return null
  }

  return (
    <NeonCard>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">Analyse korrigieren</p>
            <h2 className="text-2xl font-semibold text-white">Mahlzeit bearbeiten</h2>
            {foodLog.is_corrected && (
              <p className="mt-1 text-xs text-yellow-400">Diese Analyse wurde bereits korrigiert</p>
            )}
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-xl border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-4 py-2 text-sm font-medium text-[#00FF7F] transition hover:bg-[#00FF7F]/20"
                >
                  <Edit2 className="h-4 w-4" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              </>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </motion.div>
        )}

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Mahlzeit löschen?</h3>
                  <p className="text-sm text-white/60">
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl border border-white/10 bg-[#07110c]/60 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-[#07110c]/80 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? (
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
          )}
        </AnimatePresence>

        {!isEditing ? (
          /* View Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kalorien</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {Math.round(foodLog.total_calories || 0)} kcal
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Protein</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {(foodLog.macronutrients?.protein_grams || 0).toFixed(1)} g
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kohlenhydrate</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {(foodLog.macronutrients?.carbs_grams || 0).toFixed(1)} g
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Fett</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {(foodLog.macronutrients?.fat_grams || 0).toFixed(1)} g
                </p>
              </div>
            </div>

            {foodLog.food_items && foodLog.food_items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Erkannte Produkte</p>
                <div className="space-y-2">
                  {foodLog.food_items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-[#0B0D13]/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{item.name || 'Unbekannt'}</span>
                        {item.quantity && (
                          <span className="text-xs text-white/50">{item.quantity}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {foodLog.note && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Notiz</p>
                <p className="mt-2 text-sm text-white/70">{foodLog.note}</p>
              </div>
            )}
          </div>
        ) : (
          /* Edit Mode */
          <div className="space-y-4">
            {/* Product Search for replacing items */}
            {editingItemIndex !== null && (
              <div className="space-y-2 rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Produkt aus Wörterbuch suchen
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Produktname eingeben..."
                    className="w-full rounded-xl border border-white/10 bg-[#0A0B0C]/80 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#00FF7F]" />
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="max-h-48 space-y-1 overflow-y-auto"
                    >
                      {searchResults.map((product, idx) => (
                        <button
                          key={idx}
                          onClick={() => replaceItemWithProduct(editingItemIndex, product)}
                          className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-[#07110c]/60 p-2 text-left text-sm transition hover:border-[#00FF7F]/30"
                        >
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-8 w-8 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-white">{product.name}</p>
                            {product.calories_per_100g && (
                              <p className="text-xs text-white/50">
                                {Math.round(product.calories_per_100g)} kcal/100g
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  onClick={() => {
                    setEditingItemIndex(null)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#07110c]/60 px-4 py-2 text-xs text-white/70 transition hover:bg-[#07110c]/80"
                >
                  Abbrechen
                </button>
              </div>
            )}

            {/* Food Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Produkte</p>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 rounded-lg border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-2 py-1 text-xs text-[#00FF7F] transition hover:bg-[#00FF7F]/20"
                >
                  <Plus className="h-3 w-3" />
                  Hinzufügen
                </button>
              </div>
              <div className="space-y-2">
                {foodItems.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/10 bg-[#0B0D13]/60 p-3"
                  >
                    <div className="flex items-start gap-2">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.name || ''}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            placeholder="Produktname"
                            className="flex-1 rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <button
                            onClick={() => setEditingItemIndex(index)}
                            className="rounded-lg border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-2 py-1 text-xs text-[#00FF7F] transition hover:bg-[#00FF7F]/20"
                          >
                            <Search className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeItem(index)}
                            className="rounded-lg bg-red-500/10 p-1 text-red-400 transition hover:bg-red-500/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          <input
                            type="text"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            placeholder="Menge"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={item.calories_per_100g || item.calories || ''}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'calories_per_100g',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="kcal"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={item.protein_per_100g || item.protein_grams || ''}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'protein_per_100g',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="P"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={item.carbs_per_100g || item.carbs_grams || ''}
                            onChange={(e) =>
                              updateItem(index, 'carbs_per_100g', parseFloat(e.target.value) || 0)
                            }
                            placeholder="K"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={item.fat_per_100g || item.fat_grams || ''}
                            onChange={(e) =>
                              updateItem(index, 'fat_per_100g', parseFloat(e.target.value) || 0)
                            }
                            placeholder="F"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/60 p-4 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kalorien</p>
                <input
                  type="number"
                  value={totalCalories || calculateTotals.calories}
                  onChange={(e) => setTotalCalories(parseFloat(e.target.value) || 0)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A0B0C]/80 px-3 py-2 text-lg font-semibold text-white focus:border-[#00FF7F]/50 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Protein</p>
                <input
                  type="number"
                  value={macronutrients.protein_grams || calculateTotals.protein}
                  onChange={(e) =>
                    setMacronutrients((prev) => ({
                      ...prev,
                      protein_grams: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A0B0C]/80 px-3 py-2 text-lg font-semibold text-white focus:border-[#00FF7F]/50 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kohlenhydrate</p>
                <input
                  type="number"
                  value={macronutrients.carbs_grams || calculateTotals.carbs}
                  onChange={(e) =>
                    setMacronutrients((prev) => ({
                      ...prev,
                      carbs_grams: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A0B0C]/80 px-3 py-2 text-lg font-semibold text-white focus:border-[#00FF7F]/50 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Fett</p>
                <input
                  type="number"
                  value={macronutrients.fat_grams || calculateTotals.fat}
                  onChange={(e) =>
                    setMacronutrients((prev) => ({
                      ...prev,
                      fat_grams: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A0B0C]/80 px-3 py-2 text-lg font-semibold text-white focus:border-[#00FF7F]/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">Notiz</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0A0B0C]/80 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setFoodItems(foodLog.food_items || [])
                  setTotalCalories(foodLog.total_calories || 0)
                  setMacronutrients(foodLog.macronutrients || { protein_grams: 0, carbs_grams: 0, fat_grams: 0 })
                  setNote(foodLog.note || '')
                  setError(null)
                }}
                className="flex-1 rounded-2xl border border-white/10 bg-[#07110c]/60 px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#07110c]/80"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-3 text-sm font-semibold text-[#0A0B0C] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Korrektur speichern
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </NeonCard>
  )
}

