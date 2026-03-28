import { motion } from 'framer-motion'

export default function PageTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="mb-6 flex gap-6 border-b border-white/5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative pb-3 text-sm transition-colors ${
            activeTab === tab.id
              ? 'text-[#00FF7F]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00FF7F]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
