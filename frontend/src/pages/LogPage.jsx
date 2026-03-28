import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import PageTabs from '../components/PageTabs'
import { ModeToggle, PhotoCapture, BarcodeCapture, ResultsView } from '../components/log'
import ManualMealEntry from '../components/Nutrition/ManualMealEntry'
import WeightInput from '../components/Nutrition/WeightInput'
import { useAuth } from '../contexts/AuthContext'
import useNutritionStore from '../store/useNutritionStore'
import useUserStore from '../store/userStore'
import { saveAnalyzedMeal, fetchNutritionSnapshot } from '../services/nutritionService'
import logger from '../utils/logger'

const TABS = [
  { id: 'mahlzeit', label: 'Mahlzeit' },
  { id: 'gewicht', label: 'Gewicht' },
]

export default function LogPage() {
  const { user } = useAuth()
  const { profile } = useUserStore((s) => ({ profile: s.profile }))
  const { setDailySnapshot } = useNutritionStore((s) => ({
    setDailySnapshot: s.setDailySnapshot,
  }))

  const [activeTab, setActiveTab] = useState('mahlzeit')
  const [activeMode, setActiveMode] = useState('foto')
  const [analysis, setAnalysis] = useState(null)
  const [note, setNote] = useState('')

  const handleAnalysisComplete = useCallback((result) => {
    logger.debug('[LogPage] Analysis complete:', result)
    setAnalysis(result)
  }, [])

  const handleSave = useCallback(
    async (mealAnalysis) => {
      if (!mealAnalysis || !user?.id) return

      const macros = mealAnalysis.macronutrients || {}
      const mealCalories = mealAnalysis.total_calories ?? mealAnalysis.calories ?? 0

      const mealResponse = await saveAnalyzedMeal(
        {
          userId: user.id,
          calories: mealCalories,
          protein: macros.protein_grams ?? mealAnalysis.protein ?? 0,
          carbs: macros.carbs_grams ?? mealAnalysis.carbs ?? 0,
          fat: macros.fat_grams ?? mealAnalysis.fat ?? 0,
          note: note || '',
          imageUrl: mealAnalysis.image_url || mealAnalysis.imageUrl || null,
        },
        profile,
      )

      if (mealResponse?.dailySnapshot) {
        setDailySnapshot(mealResponse.dailySnapshot)
      } else {
        try {
          const fresh = await fetchNutritionSnapshot(user.id, profile)
          setDailySnapshot(fresh)
        } catch (err) {
          logger.error('[LogPage] Snapshot refresh failed:', err)
        }
      }
    },
    [user?.id, note, profile, setDailySnapshot],
  )

  const handleDiscard = useCallback(() => {
    setAnalysis(null)
    setNote('')
  }, [])

  const handleManualSaved = useCallback(async () => {
    if (!user?.id) return
    try {
      const fresh = await fetchNutritionSnapshot(user.id, profile)
      setDailySnapshot(fresh)
    } catch (err) {
      logger.error('[LogPage] Snapshot refresh failed:', err)
    }
  }, [user?.id, profile, setDailySnapshot])

  return (
    <div className="space-y-6">
      <SectionTitle title="Log" subtitle="Mahlzeiten & Daten erfassen" />

      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'mahlzeit' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >
          {!analysis ? (
            <>
              <ModeToggle activeMode={activeMode} onModeChange={setActiveMode} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeMode === 'foto' && (
                    <PhotoCapture
                      onAnalysisComplete={handleAnalysisComplete}
                      note={note}
                    />
                  )}

                  {activeMode === 'barcode' && (
                    <BarcodeCapture onAnalysisComplete={handleAnalysisComplete} />
                  )}

                  {activeMode === 'manuell' && (
                    <ManualMealEntry
                      userId={user?.id}
                      onClose={() => setActiveMode('foto')}
                      onSaved={handleManualSaved}
                      inline
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Note input */}
              {activeMode !== 'manuell' && (
                <div className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/3 px-4 py-2.5">
                  <span className="text-white/20">💬</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optionale Notiz hinzufügen..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
              )}
            </>
          ) : (
            <ResultsView
              analysis={analysis}
              onSave={handleSave}
              onDiscard={handleDiscard}
            />
          )}
        </motion.div>
      )}

      {activeTab === 'gewicht' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <WeightInput />
        </motion.div>
      )}
    </div>
  )
}
