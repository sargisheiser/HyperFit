import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import FoodItemList from './FoodItemList'

export default function ResultsView({ analysis, onSave, onDiscard }) {
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [localAnalysis, setLocalAnalysis] = useState(analysis)

  const calories = localAnalysis?.total_calories ?? localAnalysis?.calories ?? 0
  const macros = localAnalysis?.macronutrients || {}
  const protein = macros.protein_grams ?? localAnalysis?.protein ?? 0
  const carbs = macros.carbs_grams ?? localAnalysis?.carbs ?? 0
  const fat = macros.fat_grams ?? localAnalysis?.fat ?? 0
  const confidence = localAnalysis?.confidence_score ?? 0
  const items = localAnalysis?.food_items || []

  const handleUpdateQuantity = useCallback(
    (index, newQuantity) => {
      if (!localAnalysis?.food_items) return

      const updatedItems = [...localAnalysis.food_items]
      const item = updatedItems[index]

      // Parse current grams
      const currentQty = item.quantity || '100g'
      let currentGrams = 100
      if (typeof currentQty === 'string' && currentQty.toLowerCase().includes('g')) {
        currentGrams = parseFloat(currentQty.toLowerCase().replace('g', '').trim()) || 100
      } else if (typeof currentQty === 'number') {
        currentGrams = currentQty
      }

      // Parse new grams
      let newGrams = 100
      if (typeof newQuantity === 'string' && newQuantity.toLowerCase().includes('g')) {
        newGrams = parseFloat(newQuantity.toLowerCase().replace('g', '').trim()) || currentGrams
      } else if (typeof newQuantity === 'number') {
        newGrams = newQuantity
      }

      // Use stored per_100g values if available
      const currentCalories = item.calories || item.calories_per_100g || 0
      const currentProtein = item.protein_grams || item.protein_per_100g || 0
      const currentCarbs = item.carbs_grams || item.carbs_per_100g || 0
      const currentFat = item.fat_grams || item.fat_per_100g || 0

      const caloriesPer100g = item.calories_per_100g || (currentGrams > 0 ? (currentCalories / currentGrams) * 100 : currentCalories)
      const proteinPer100g = item.protein_per_100g || (currentGrams > 0 ? (currentProtein / currentGrams) * 100 : currentProtein)
      const carbsPer100g = item.carbs_per_100g || (currentGrams > 0 ? (currentCarbs / currentGrams) * 100 : currentCarbs)
      const fatPer100g = item.fat_per_100g || (currentGrams > 0 ? (currentFat / currentGrams) * 100 : currentFat)

      updatedItems[index] = {
        ...item,
        quantity: newQuantity,
        calories: (caloriesPer100g * newGrams) / 100,
        protein_grams: (proteinPer100g * newGrams) / 100,
        carbs_grams: (carbsPer100g * newGrams) / 100,
        fat_grams: (fatPer100g * newGrams) / 100,
        calories_per_100g: caloriesPer100g,
        protein_per_100g: proteinPer100g,
        carbs_per_100g: carbsPer100g,
        fat_per_100g: fatPer100g,
      }

      const totals = updatedItems.reduce(
        (acc, itm) => ({
          calories: acc.calories + (itm.calories || 0),
          protein: acc.protein + (itm.protein_grams || 0),
          carbs: acc.carbs + (itm.carbs_grams || 0),
          fat: acc.fat + (itm.fat_grams || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )

      setLocalAnalysis((prev) => ({
        ...prev,
        food_items: updatedItems,
        calories: totals.calories,
        total_calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        macronutrients: {
          ...prev?.macronutrients,
          protein_grams: totals.protein,
          carbs_grams: totals.carbs,
          fat_grams: totals.fat,
        },
      }))
    },
    [localAnalysis],
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave(localAnalysis)
      setSaved(true)
      setTimeout(() => onDiscard(), 1500)
    } catch {
      setIsSaving(false)
    }
  }, [localAnalysis, onSave, onDiscard])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Success header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#00FF7F]/30 bg-[#00FF7F]/10"
        >
          <CheckCircle2 className="h-6 w-6 text-[#00FF7F]" />
        </motion.div>
        <h3 className="text-lg text-white">Mahlzeit analysiert</h3>
        <p className="mt-1 text-sm text-white/30">
          Konfidenz {Math.round(confidence * 100)}% · {items.length} Lebensmittel
        </p>
      </div>

      {/* Big calorie number */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-5xl font-extralight text-white">{Math.round(calories)}</div>
          <div className="mt-1 text-sm uppercase tracking-[3px] text-[#00FF7F]/50">Kalorien</div>
        </motion.div>
      </div>

      {/* Macro circles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center gap-6"
      >
        {[
          { value: Math.round(protein), label: 'Protein', active: true },
          { value: Math.round(carbs), label: 'Carbs', active: false },
          { value: Math.round(fat), label: 'Fett', active: false },
        ].map(({ value, label, active }) => (
          <div key={label} className="text-center">
            <div
              className={`mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 ${
                active ? 'border-[#00FF7F]/30' : 'border-white/10'
              }`}
            >
              <span className="text-base font-medium text-white">{value}</span>
            </div>
            <div className="mt-1.5 text-sm uppercase tracking-[1px] text-white/30">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Food items */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <FoodItemList items={items} onUpdateQuantity={handleUpdateQuantity} />
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <button
          onClick={handleSave}
          disabled={isSaving || saved}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00FF7F] to-[#00CC66] py-4 text-[15px] font-semibold text-[#0a0a0f] transition disabled:opacity-60"
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Gespeichert!
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Speichern...
            </>
          ) : (
            'Mahlzeit speichern'
          )}
        </button>
        {!saved && (
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="mx-auto block text-sm text-white/25 transition hover:text-white/50"
          >
            Verwerfen
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
