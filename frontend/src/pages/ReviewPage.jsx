import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import PageTabs from '../components/PageTabs'
import HeuteTab from '../components/review/HeuteTab'
import WocheTab from '../components/review/WocheTab'
import HistorieTab from '../components/review/HistorieTab'
import CheckInFlow from '../components/Nutrition/CheckInFlow'

const TABS = [
  { id: 'heute', label: 'Heute' },
  { id: 'woche', label: 'Woche' },
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
          {activeTab === 'heute' && <HeuteTab />}
          {activeTab === 'woche' && <WocheTab />}
          {activeTab === 'historie' && <HistorieTab />}
          {activeTab === 'checkin' && <CheckInFlow />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
