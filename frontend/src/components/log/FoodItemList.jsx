import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Edit2, CheckCircle2 } from 'lucide-react'

export default function FoodItemList({ items, onUpdateQuantity }) {
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = (index, currentQuantity) => {
    setEditingIndex(index)
    setEditValue(currentQuantity || '100g')
  }

  const confirmEdit = (index) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(index, editValue)
    }
    setEditingIndex(null)
  }

  if (!items?.length) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6">
      {items.map((item, index) => (
        <div key={`${item.name}-${index}`}>
          <button
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/3"
            style={{ borderTop: index > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-white">{item.name || 'Unbekannt'}</div>
              <div className="mt-0.5 text-sm text-white/30">
                {item.quantity || '100g'} · {Math.round(item.calories || 0)} kcal
              </div>
            </div>
            <ChevronRight
              className={`h-4 w-4 flex-shrink-0 text-white/20 transition-transform ${
                expandedIndex === index ? 'rotate-90' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {expandedIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/4 bg-white/2 px-4 py-3">
                  {/* Macros */}
                  <div className="mb-3 flex gap-4 text-sm text-white/40">
                    {item.protein_grams != null && <span>P {Math.round(item.protein_grams)}g</span>}
                    {item.carbs_grams != null && <span>C {Math.round(item.carbs_grams)}g</span>}
                    {item.fat_grams != null && <span>F {Math.round(item.fat_grams)}g</span>}
                    {typeof item.confidence === 'number' && (
                      <span className="text-[#00FF7F]/50">{Math.round(item.confidence * 100)}%</span>
                    )}
                  </div>

                  {/* Quantity edit */}
                  {editingIndex === index ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit(index)
                        }}
                        placeholder="z.B. 150g"
                        className="w-24 rounded-lg border border-[#00FF7F]/30 bg-[#07110c]/80 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/60 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => confirmEdit(index)}
                        className="rounded-lg bg-[#00FF7F]/10 p-1.5 text-[#00FF7F] transition hover:bg-[#00FF7F]/20"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(index, item.quantity)}
                      className="flex items-center gap-1.5 text-sm text-[#00FF7F]/60 transition hover:text-[#00FF7F]"
                    >
                      <Edit2 className="h-3 w-3" />
                      Menge bearbeiten
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
