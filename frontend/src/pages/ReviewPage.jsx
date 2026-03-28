import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import PageTabs from '../components/PageTabs'
import Dashboard from './Dashboard'
import NutritionDashboard from '../components/Nutrition/NutritionDashboard'
import MealHistory from '../components/Nutrition/MealHistory'
import CheckInFlow from '../components/Nutrition/CheckInFlow'

const TABS = [
  { id: 'heute', label: 'Heute' },
  { id: 'ernaehrung', label: 'Ernährung' },
  { id: 'historie', label: 'Historie' },
  { id: 'checkin', label: 'Check-In' },
]

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState('heute')

  return (
    <div className="space-y-6">
      <SectionTitle title="Review" subtitle="Dein Fortschritt auf einen Blick" />

      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'heute' && <Dashboard />}

          {activeTab === 'ernaehrung' && (
            <div className="space-y-6">
              <NutritionDashboard />
            </div>
          )}

          {activeTab === 'historie' && (
            <div className="space-y-6">
              <MealHistory />
            </div>
          )}

          {activeTab === 'checkin' && (
            <div className="space-y-6">
              <CheckInFlow />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
