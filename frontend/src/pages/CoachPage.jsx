import { motion, AnimatePresence } from 'framer-motion'
import { Bot, SendHorizonal, Dumbbell, Apple, Target, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import useUserStore from '../store/userStore'
import logger from '../utils/logger'

const cleanAIMessage = (text) => {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/#\w+/g, '')
    .trim()
}

const quickPrompts = [
  { icon: Dumbbell, label: 'Workout-Plan', query: 'Erstelle mir einen personalisierten Trainingsplan' },
  { icon: Apple, label: 'Ernährung', query: 'Wie sollte ich mich heute ernähren?' },
  { icon: Target, label: 'Ziele', query: 'Wie kann ich meine Fitness-Ziele erreichen?' },
  { icon: TrendingUp, label: 'Fortschritt', query: 'Zeig mir meinen aktuellen Fortschritt' },
]

export default function CoachPage() {
  const { user } = useAuth()
  const { profile } = useUserStore((s) => ({ profile: s.profile }))
  const firstName = profile?.full_name?.split(' ')[0] || user?.username || 'Athlete'

  const [messages, setMessages] = useState([])
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
      logger.error('[CoachPage] Chat error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err.response?.data?.detail || 'Es tut mir leid, ich bin gerade nicht erreichbar. Versuche es später.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSend()
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Welcome or Chat */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* Welcome screen */
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#00FF7F]/20 bg-[#00FF7F]/10"
            >
              <Bot className="h-7 w-7 text-[#00FF7F]" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="text-lg font-medium text-white">Dein KI-Coach</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-white/30">
                Hallo {firstName}! Frag mich alles über Ernährung, Training oder deine Fortschritte.
              </p>
            </motion.div>

            {/* Quick prompts */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-wrap justify-center gap-2"
            >
              {quickPrompts.map(({ icon: Icon, label, query }) => (
                <button
                  key={label}
                  onClick={() => handleSend(query)}
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-white/50 transition hover:border-white/15 hover:bg-white/5 hover:text-white/70"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          /* Chat messages */
          <div className="space-y-4 p-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={`${msg.role}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#00FF7F]/10">
                      <Bot className="h-3.5 w-3.5 text-[#00FF7F]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-br-sm border border-[#00FF7F]/20 bg-[#00FF7F]/10 text-white'
                        : 'rounded-bl-sm bg-white/5 text-white/80'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00FF7F]/10">
                  <Bot className="h-3.5 w-3.5 animate-pulse text-[#00FF7F]" />
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-white/5 px-4 py-3 text-sm text-white/40">
                  Denkt nach...
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nachricht an deinen Coach..."
          disabled={loading}
          className="flex-1 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#00FF7F]/30 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#00CC66] text-[#0a0a0f] transition disabled:opacity-30"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
