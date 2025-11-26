import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import useNutritionStore from '../../store/useNutritionStore'
import useUserStore from '../../store/userStore'
import { updateWeight } from '../../services/nutritionService'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const clampWeight = (value) => Math.max(35, Math.min(value, 200))

export default function WeightInput() {
  const { user } = useAuth()
  const weight = useNutritionStore((state) => state.weight)
  const setWeight = useNutritionStore((state) => state.setWeight)
  const [pending, setPending] = useState(false)
  const [localWeight, setLocalWeight] = useState(typeof weight === 'number' ? weight : 0)
  const [inputValue, setInputValue] = useState(
    typeof weight === 'number' ? weight.toFixed(1) : '',
  )

  useEffect(() => {
    if (typeof weight === 'number') {
      setLocalWeight(weight)
      setInputValue(weight.toFixed(1))
    } else {
      setInputValue('')
    }
  }, [weight])

  const hasChanged = useMemo(() => {
    if (typeof weight !== 'number') {
      return !!inputValue
    }
    return Math.abs(localWeight - weight) > 0.05
  }, [inputValue, localWeight, weight])

  const applyLocalWeight = (value) => {
    if (Number.isNaN(value)) return
    const clamped = clampWeight(value)
    const rounded = Math.round(clamped * 10) / 10
    setLocalWeight(rounded)
    setInputValue(rounded.toFixed(1))
  }

  const handleInputChange = (event) => {
    const value = event.target.value.replace(',', '.')
    setInputValue(value)
    const parsed = parseFloat(value)
    if (!Number.isNaN(parsed)) {
      setLocalWeight(clampWeight(parsed))
    }
  }

  const handleInputBlur = () => {
    if (!inputValue) {
      if (typeof weight === 'number') {
        setInputValue(weight.toFixed(1))
        setLocalWeight(weight)
      }
      return
    }
    const parsed = parseFloat(inputValue)
    if (Number.isNaN(parsed)) {
      const fallback = typeof weight === 'number' ? weight : localWeight
      setInputValue(fallback.toFixed(1))
      setLocalWeight(fallback)
      return
    }
    applyLocalWeight(parsed)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleInputBlur()
      handleSync()
    }
  }

  const handleChange = (delta) => {
    applyLocalWeight(localWeight + delta)
  }

  const handleSync = useCallback(async () => {
    if (!user?.id) return
    if (!hasChanged) return
    setPending(true)
    try {
      // Update nutrition store
      await setWeight(localWeight, (value) => updateWeight({ userId: user.id, weight: value }))
      
      // Also update user profile weight
      try {
        await api.put('/api/users/me', {
          weight_kg: Math.round(localWeight),
        })
        // Update user store to reflect the change
        useUserStore.getState().fetchProfile()
        console.debug('[WeightInput] Weight synced to profile:', localWeight)
      } catch (profileError) {
        console.warn('[WeightInput] Failed to sync weight to profile:', profileError)
        // Don't fail the whole operation if profile update fails
      }
      
      console.debug('[WeightInput] Weight saved:', localWeight)
    } catch (error) {
      console.error('[WeightInput] Failed to save weight:', error)
    } finally {
      setPending(false)
    }
  }, [user?.id, hasChanged, localWeight, setWeight])
  
  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasChanged || !user?.id) return
    
    const timer = setTimeout(() => {
      handleSync()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [localWeight, hasChanged, user?.id, handleSync])

  return (
    <div className="space-y-4 rounded-2xl bg-[#121315] p-4 shadow-[0_10px_24px_rgba(0,255,127,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Aktuelles Gewicht</p>
        <AnimatePresence mode="wait">
          {pending ? (
            <motion.span
              key="pending"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-[#00FF7F]"
            >
              Syncing…
            </motion.span>
          ) : hasChanged ? (
            <motion.button
              key="save"
              onClick={handleSync}
              className="text-xs font-medium text-[#00FF7F] transition hover:text-white"
            >
              Speichern
            </motion.button>
          ) : (
            <motion.span
              key="synced"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-white/40"
            >
              Synchronisiert
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => handleChange(-0.5)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07110c]/80 text-white shadow-[0_6px_18px_rgba(0,255,127,0.12)] transition hover:shadow-[0_8px_22px_rgba(0,255,127,0.18)]"
          type="button"
        >
          <Minus className="h-4 w-4" />
        </button>

        <motion.div
          key={inputValue}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="35"
            max="200"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-24 rounded-xl bg-[#0f1016] px-3 py-2 text-center text-lg font-semibold text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/50"
            aria-label="Gewicht in Kilogramm"
          />
          <span className="text-sm text-white/50">kg</span>
        </motion.div>

        <button
          onClick={() => handleChange(0.5)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07110c]/80 text-white shadow-[0_6px_18px_rgba(0,255,127,0.12)] transition hover:shadow-[0_8px_22px_rgba(0,255,127,0.18)]"
          type="button"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/30">
        Werte zwischen 35 kg und 200 kg sind erlaubt.
      </p>
    </div>
  )
}

