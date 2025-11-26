import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import NutritionDashboard from '../components/Nutrition/NutritionDashboard'
import MealAnalyzer from './MealAnalyzer'

export default function Nutrition({ focusSection }) {
  const analyzerRef = useRef(null)
  const location = useLocation()
  const [pendingAction, setPendingAction] = useState(null)

  const targetPanel = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const panelParam = focusSection ?? params.get('panel')
    return panelParam ?? location.hash.replace('#', '')
  }, [focusSection, location])

  const scrollToAnalyzer = useCallback(() => {
    if (analyzerRef.current) {
      requestAnimationFrame(() => analyzerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }, [])

  useEffect(() => {
    if (targetPanel === 'analyzer') {
      scrollToAnalyzer()
    }
  }, [scrollToAnalyzer, targetPanel])

  const handleOpenAnalyzer = useCallback(
    (mode) => {
      setPendingAction(mode)
      scrollToAnalyzer()
    },
    [scrollToAnalyzer],
  )

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-6"
      >
        <NutritionDashboard onOpenAnalyzer={handleOpenAnalyzer} />
      </motion.section>

      <motion.section
        ref={analyzerRef}
        id="analyzer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
        className="space-y-6"
      >
        <MealAnalyzer action={pendingAction} onActionHandled={() => setPendingAction(null)} />
      </motion.section>

    </div>
  )
}

