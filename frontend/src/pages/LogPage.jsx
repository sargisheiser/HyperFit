import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import PageTabs from '../components/PageTabs'
import MealAnalyzer from './MealAnalyzer'
import WeightInput from '../components/Nutrition/WeightInput'

const TABS = [
  { id: 'scanner', label: 'Foto & Barcode' },
  { id: 'gewicht', label: 'Gewicht' },
]

export default function LogPage() {
  const [activeTab, setActiveTab] = useState('scanner')
  const [pendingAction, setPendingAction] = useState(null)
  const analyzerRef = useRef(null)

  const handleActionHandled = useCallback(() => {
    setPendingAction(null)
  }, [])

  return (
    <div className="space-y-6">
      <SectionTitle title="Log" subtitle="Mahlzeiten & Daten erfassen" />

      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'scanner' && (
        <motion.div
          ref={analyzerRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <MealAnalyzer
            action={pendingAction}
            onActionHandled={handleActionHandled}
          />
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
