import { motion, AnimatePresence } from 'framer-motion'
import { Bot, SendHorizonal, Sparkles, Zap, Dumbbell, Apple, Target, MessageSquare, Brain, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import NeonCard from '../components/NeonCard'
import CheckInFlow from '../components/Nutrition/CheckInFlow'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import useUserStore from '../store/userStore'

// Helper function to remove markdown formatting and hashtags
const cleanAIMessage = (text) => {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/\*\*/g, '') // Remove ** bold markers
    .replace(/__/g, '') // Remove __ bold markers
    .replace(/\*/g, '') // Remove single * italic markers
    .replace(/_/g, '') // Remove single _ italic markers
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers (# ## ### etc.)
    .replace(/#\w+/g, '') // Remove hashtags (#hashtag)
    .trim()
}

const quickActions = [
  { icon: Dumbbell, label: 'Workout Plan', query: 'Erstelle mir einen personalisierten Trainingsplan' },
  { icon: Apple, label: 'Ernährung', query: 'Wie sollte ich mich heute ernähren?' },
  { icon: Target, label: 'Ziele', query: 'Wie kann ich meine Fitness-Ziele erreichen?' },
  { icon: TrendingUp, label: 'Fortschritt', query: 'Zeig mir meinen aktuellen Fortschritt' },
]

export default function CoachPage() {
  const { user } = useAuth()
  const { profile } = useUserStore((state) => ({ profile: state.profile }))
  const displayName = profile?.full_name || profile?.username || user?.username || 'Athlete'
  const firstName = displayName.split(' ')[0]
  
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey ${firstName}! 👋\n\nIch bin dein HyperFit AI Fitness Coach. Ich kenne deine Trainingsdaten, deine Mahlzeiten und deine Ziele.\n\nWie kann ich dir heute helfen?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (customText = null) => {
    const text = customText || input.trim()
    if (!text || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const response = await api.post('/api/assistant/chat', { message: text })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: cleanAIMessage(response.data.response || 'Entschuldigung, ich konnte deine Frage nicht verarbeiten.'),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.response?.data?.detail || 'Es tut mir leid, ich bin gerade nicht erreichbar. Versuche es bitte später nochmal.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleSend()
  }

  const handleQuickAction = (query) => {
    handleSend(query)
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <NeonCard>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[32px] border border-[#00FF7F]/30 bg-gradient-to-br from-[#0a140e]/95 via-[#07110c]/95 to-[#060907]/95 p-8 text-[#b6fbd4] shadow-[0_0_60px_rgba(0,255,127,0.15)]"
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,127,0.1),transparent_50%)]" />
            <motion.div
              className="absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(0,255,127,0.05)_50%,transparent_70%)]"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-start gap-4">
              {/* Animated Bot Icon */}
              <motion.div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00FF7F]/20 to-[#00C46A]/20 border border-[#00FF7F]/30"
                animate={{
                  boxShadow: [
                    '0_0_20px_rgba(0,255,127,0.3)',
                    '0_0_30px_rgba(0,255,127,0.5)',
                    '0_0_20px_rgba(0,255,127,0.3)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Brain className="h-8 w-8 text-[#00FF7F]" />
              </motion.div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-white tracking-tight">HyperFit AI Fitness Coach</h2>
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-5 w-5 text-[#00FF7F]" />
                  </motion.div>
                </div>
                <p className="text-sm leading-relaxed text-[#9fffcf]/80">
                  Dein persönlicher AI-Coach für Training, Ernährung und Fortschritt. Ich analysiere deine Daten und gebe dir maßgeschneiderte Empfehlungen.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAction(action.query)}
                  disabled={loading}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-[#00FF7F]/20 bg-[#07110c]/60 p-3 text-center transition hover:border-[#00FF7F]/40 hover:bg-[#07110c]/80 disabled:opacity-50"
                >
                  <action.icon className="h-5 w-5 text-[#00FF7F] transition group-hover:scale-110" />
                  <span className="text-xs font-medium text-white/90">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </NeonCard>

      {/* Modern Chat Interface */}
      <NeonCard>
        <div className="flex h-[32rem] flex-col rounded-[32px] border border-[#00FF7F]/20 bg-gradient-to-br from-[#07110c]/95 via-[#0a140e]/95 to-[#07110c]/95 p-6 shadow-[0_0_40px_rgba(0,255,127,0.1)]">
          {/* Messages Area */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 mb-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={`${message.role}-${index}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[20px] px-5 py-3.5 text-sm leading-relaxed shadow-lg ${
                      message.role === 'user'
                        ? 'border border-[#FF5E8A]/40 bg-gradient-to-br from-[#FF5E8A]/15 to-[#FF5E8A]/5 text-[#ff9cb8]'
                        : 'border border-[#00FF7F]/35 bg-gradient-to-br from-[#00FF7F]/15 to-[#00C46A]/5 text-[#9fffcf]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.role === 'assistant' ? cleanAIMessage(message.content) : message.content}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-[#9fffcf]/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00FF7F]/10 border border-[#00FF7F]/20">
                  <Bot className="h-4 w-4 animate-pulse text-[#00FF7F]" />
                </div>
                <LoadingSpinner label="Analysiere deine Daten..." />
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center gap-3 rounded-[24px] border border-[#00FF7F]/20 bg-[#0a140e]/60 p-2 backdrop-blur-sm transition focus-within:border-[#00FF7F]/40 focus-within:shadow-[0_0_20px_rgba(0,255,127,0.2)]">
              <div className="flex-1">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Frag mich alles über Training, Ernährung, Ziele..."
                  className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
                  disabled={loading}
                />
              </div>
              <motion.button
                type="submit"
                disabled={!input.trim() || loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF7F] to-[#00C46A] text-[#0A0B0C] shadow-[0_4px_20px_rgba(0,255,127,0.3)] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <SendHorizonal className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <SendHorizonal className="h-5 w-5" />
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </NeonCard>

      {/* Weekly Check-In Section */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className="space-y-6"
      >
        <CheckInFlow />
      </motion.section>
    </div>
  )
}











