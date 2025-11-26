import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Send, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import useUserStore from '../store/userStore'
import api from '../services/api'

export default function AIAssistantChat() {
  const { user } = useAuth()
  const { profile } = useUserStore((state) => ({ profile: state.profile }))
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const displayName = profile?.full_name || profile?.username || user?.username || 'Athlete'
  const firstName = displayName.split(' ')[0]

  // Initialize with a personalized greeting when first expanded
  useEffect(() => {
    if (isExpanded && messages.length === 0) {
      const greeting = `Hey ${firstName}! 👋 

Ich bin dein persönlicher HyperFit Helfer. Ich kenne deine Trainingsdaten, deine Mahlzeiten und deine Ziele.

Ich kann dir helfen mit:
• Check-Ins durchführen und deine Ziele anpassen
• Trainingsdaten analysieren
• Ernährungsfragen beantworten
• Personalisierte Tipps geben

Wie kann ich dir heute helfen?`

      setMessages([{ role: 'assistant', content: greeting }])
    }
  }, [isExpanded, firstName])

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Add comprehensive user context to make responses more personal
      const context = {
        user_name: displayName,
        first_name: firstName,
        weight: profile?.weight_kg,
        height: profile?.height_cm,
        activity_level: profile?.activity_level,
        fitness_goals: profile?.fitness_goals,
        dietary_preferences: profile?.dietary_preferences,
        allergies: profile?.allergies,
        gender: profile?.gender,
      }

      const response = await api.post('/api/assistant/chat', {
        message: text,
        context,
      })

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response || 'Entschuldigung, ich konnte deine Frage nicht verarbeiten.',
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: err.response?.data?.detail || 'Es tut mir leid, ich bin gerade nicht erreichbar. Versuche es bitte später nochmal.',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [input, loading, displayName, firstName, profile])

  const handleSubmit = (e) => {
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded Chat Window */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex h-[600px] w-[420px] max-h-[85vh] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[24px] border border-[#00FF7F]/30 bg-gradient-to-br from-[#0a140e]/98 via-[#07110c]/98 to-[#060907]/98 shadow-[0_20px_60px_rgba(0,255,127,0.15)] backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#00FF7F]/20 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF7F]/30 to-[#00C46A]/30 shadow-[0_0_15px_rgba(0,255,127,0.4)]">
                  <div className="h-3 w-3 rounded-full bg-[#00FF7F] animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Dein HyperFit Helfer</p>
                  <p className="text-xs text-white/50">Immer für dich da</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Chat schließen"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[18px] px-4 py-2.5 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-[#00FF7F]/20 to-[#00C46A]/20 text-white border border-[#00FF7F]/30'
                        : 'bg-[#07110c]/80 text-[#b6fbd4] border border-white/10'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-white/50"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-[#00FF7F]" />
                  <span>Denke nach...</span>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSubmit} className="border-t border-[#00FF7F]/20 p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Frag mich alles..."
                  className="flex-1 rounded-[16px] border border-white/10 bg-[#07110c]/80 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F]/50 focus:outline-none focus:ring-2 focus:ring-[#00FF7F]/20"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF7F] to-[#00C46A] text-[#0A0B0C] transition hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,255,127,0.3)]"
                  aria-label="Nachricht senden"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button - Always Visible */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#00FF7F] to-[#00C46A] shadow-[0_8px_24px_rgba(0,255,127,0.4)] transition hover:shadow-[0_12px_32px_rgba(0,255,127,0.5)]"
        aria-label={isExpanded ? 'Chat minimieren' : 'Chat öffnen'}
      >
        {isExpanded ? (
          <ChevronDown className="h-6 w-6 text-[#0A0B0C]" />
        ) : (
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#00FF7F] opacity-75 animate-ping" />
              <div className="relative h-6 w-6 rounded-full bg-[#0A0B0C]" />
            </div>
          </motion.div>
        )}
      </motion.button>
    </div>
  )
}
