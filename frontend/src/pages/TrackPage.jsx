import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionTitle from '../components/ui/SectionTitle'
import PageTabs from '../components/PageTabs'
import WorkoutTracker from './WorkoutTracker'

const TABS = [
  { id: 'live', label: 'Live-Workout' },
  { id: 'log', label: 'Workout loggen' },
]

export default function TrackPage() {
  const [activeTab, setActiveTab] = useState('live')

  return (
    <div className="space-y-6">
      <SectionTitle title="Track" subtitle="Training starten & loggen" />

      <PageTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'live' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <WorkoutTracker />
        </motion.div>
      )}

      {activeTab === 'log' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 p-6 text-center text-white/40"
        >
          <p>Workout manuell loggen — kommt bald</p>
        </motion.div>
      )}
    </div>
  )
}
