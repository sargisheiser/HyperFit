import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Search, Loader2, Edit2, Check } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import NeonCard from '../NeonCard'
import logger from '../../utils/logger'

export default function ManualMealEntry({ onMealSaved, onCancel }) {
  const { user } = useAuth()
  const [foodItems, setFoodItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const searchProducts = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const { data } = await api.get('/api/food/products/search', {
        params: { query, limit: 20 },
      })
      setSearchResults(data || [])
    } catch (err) {
      logger.error('Product search failed:', err)
      setError('Produktsuche fehlgeschlagen. Bitte versuche es erneut.')
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

  const addProductFromSearch = useCallback((product) => {
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

    setFoodItems((prev) => [...prev, newItem])
    setSearchQuery('')
    setSearchResults([])
    setShowProductSearch(false)
  }, [])

  const addManualItem = useCallback(() => {
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
          calories: acc.calories + (item.calories_per_100g || 0) * multiplier,
          protein: acc.protein + (item.protein_per_100g || 0) * multiplier,
          carbs: acc.carbs + (item.carbs_per_100g || 0) * multiplier,
          fat: acc.fat + (item.fat_per_100g || 0) * multiplier,
        }
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [foodItems])

  const handleSave = useCallback(async () => {
    if (foodItems.length === 0) {
      setError('Bitte füge mindestens ein Produkt hinzu.')
      return
    }

    // Validate that all items have names
    const invalidItems = foodItems.filter((item) => !item.name || item.name.trim() === '')
    if (invalidItems.length > 0) {
      setError('Bitte gib für alle Produkte einen Namen ein.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const payload = {
        food_items: foodItems.map((item) => ({
          name: item.name,
          quantity: item.quantity || '100g',
          calories_per_100g: item.calories_per_100g || 0,
          protein_per_100g: item.protein_per_100g || 0,
          carbs_per_100g: item.carbs_per_100g || 0,
          fat_per_100g: item.fat_per_100g || 0,
          image_url: item.image_url,
          barcode: item.barcode,
        })),
        total_calories: calculateTotals.calories,
        macronutrients: {
          protein_grams: calculateTotals.protein,
          carbs_grams: calculateTotals.carbs,
          fat_grams: calculateTotals.fat,
        },
        note: note.trim() || null,
      }

      const { data } = await api.post('/api/food/manual', payload)
      onMealSaved?.(data)
    } catch (err) {
      logger.error('Failed to save manual meal:', err)
      setError(err.response?.data?.detail || 'Mahlzeit konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }, [foodItems, calculateTotals, note, onMealSaved])

  return (
    <NeonCard>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">Manuelle Eingabe</p>
            <h2 className="text-2xl font-semibold text-white">Mahlzeit manuell eintragen</h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
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

        {/* Product Search */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#00FF7F]" />
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Produkt aus Wörterbuch suchen</p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Produktname eingeben (z.B. 'Vollkornbrot', 'Hähnchenbrust')..."
              className="w-full rounded-2xl border border-white/10 bg-[#0A0B0C]/80 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/20"
              onFocus={() => setShowProductSearch(true)}
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#00FF7F]" />
              </div>
            )}
          </div>

          <AnimatePresence>
            {showProductSearch && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-[#0B0D13]/80 p-3"
              >
                {searchResults.map((product, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => addProductFromSearch(product)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#07110c]/60 p-3 text-left transition hover:border-[#00FF7F]/30 hover:bg-[#07110c]/80"
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/50">
                        {product.calories_per_100g && (
                          <span>{Math.round(product.calories_per_100g)} kcal/100g</span>
                        )}
                        {product.protein_per_100g && (
                          <span>Protein: {product.protein_per_100g.toFixed(1)}g</span>
                        )}
                        {product.brand && <span>{product.brand}</span>}
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-[#00FF7F]" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Food Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Produkte</p>
            <button
              onClick={addManualItem}
              className="flex items-center gap-2 rounded-xl border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-3 py-1.5 text-xs font-medium text-[#00FF7F] transition hover:bg-[#00FF7F]/20"
            >
              <Plus className="h-4 w-4" />
              Manuell hinzufügen
            </button>
          </div>

          {foodItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0B0D13]/60 px-4 py-8 text-center text-sm text-white/60">
              Noch keine Produkte hinzugefügt. Suche nach Produkten oder füge manuell hinzu.
            </div>
          ) : (
            <div className="space-y-3">
              {foodItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/10 bg-[#0B0D13]/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder="Produktname"
                        className="w-full rounded-xl border border-white/10 bg-[#07110c]/80 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="Menge (z.B. 150g)"
                          className="rounded-xl border border-white/10 bg-[#07110c]/80 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                        />
                        <div className="grid grid-cols-4 gap-1">
                          <input
                            type="number"
                            value={item.calories_per_100g || ''}
                            onChange={(e) =>
                              updateItem(index, 'calories_per_100g', parseFloat(e.target.value) || 0)
                            }
                            placeholder="kcal"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={item.protein_per_100g || ''}
                            onChange={(e) =>
                              updateItem(index, 'protein_per_100g', parseFloat(e.target.value) || 0)
                            }
                            placeholder="P"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={item.carbs_per_100g || ''}
                            onChange={(e) =>
                              updateItem(index, 'carbs_per_100g', parseFloat(e.target.value) || 0)
                            }
                            placeholder="K"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                          <input
                            type="number"
                            value={item.fat_per_100g || ''}
                            onChange={(e) =>
                              updateItem(index, 'fat_per_100g', parseFloat(e.target.value) || 0)
                            }
                            placeholder="F"
                            className="rounded-lg border border-white/10 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {foodItems.length > 0 && (
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/60 p-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kalorien</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {Math.round(calculateTotals.calories)} kcal
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Protein</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {calculateTotals.protein.toFixed(1)} g
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kohlenhydrate</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {calculateTotals.carbs.toFixed(1)} g
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Fett</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {calculateTotals.fat.toFixed(1)} g
              </p>
            </div>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Notiz (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z.B. Frühstück, Post-Workout..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0A0B0C]/80 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/20"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-white/10 bg-[#07110c]/60 px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#07110c]/80"
            >
              Abbrechen
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || foodItems.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-[#00FF7F] to-[#00C46A] px-4 py-3 text-sm font-semibold text-[#0A0B0C] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Mahlzeit speichern
              </>
            )}
          </button>
        </div>
      </div>
    </NeonCard>
  )
}
