import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { MessageCircle, Send, Bot, User, Loader, X, Zap, Terminal } from 'lucide-react'
import logger from '../utils/logger'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchChatHistory()
  }, [])

  const fetchChatHistory = async () => {
    // Chat history endpoint not yet implemented - skip for now
    // TODO: Implement chat history storage and retrieval in backend
    try {
      // Placeholder for future chat history implementation
      // const response = await api.get('/api/assistant/chat/history?limit=10')
      // if (response.data && response.data.length > 0) {
      //   const historyMessages = response.data.flatMap(item => [
      //     { role: 'user', content: item.message, timestamp: item.created_at },
      //     { role: 'assistant', content: item.response, timestamp: item.created_at }
      //   ])
      //   setMessages(historyMessages)
      // }
    } catch (error) {
      logger.error('Error fetching chat history:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setError('')

    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMessage])

    setLoading(true)

    try {
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const response = await api.post('/api/assistant/chat', {
        message: userMessage,
        context: conversationHistory.length > 0 ? { conversation_history: JSON.stringify(conversationHistory) } : undefined
      })

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        tokens: response.data.tokens_used
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to send message. Please try again.')
      logger.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-darker relative overflow-hidden">
      {/* Animated grid background */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none"></div>
      
      {/* Scan line overlay */}
      <div className="fixed inset-0 scan-line pointer-events-none opacity-30"></div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <Bot className="w-12 h-12 text-cyber-accent animate-pulse-neon" />
              <div className="absolute inset-0 w-12 h-12 bg-cyber-accent blur-xl opacity-50"></div>
            </div>
            <div>
              <h1 className="text-5xl font-display font-black text-neon uppercase tracking-wider glitch" data-text="AI ASSISTANT">
                AI ASSISTANT
              </h1>
              <p className="text-cyber-gray-light font-mono text-sm uppercase tracking-widest mt-2">
                FITNESS & NUTRITION CONSULTANT
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 border-4 border-cyber-secondary bg-cyber-dark p-4 flex items-center justify-between">
            <span className="text-cyber-secondary font-mono uppercase tracking-wider">{error}</span>
            <button onClick={() => setError('')} className="text-cyber-secondary hover:text-cyber-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Chat Container */}
        <div className="card-cyber border-4 border-cyber-accent h-[600px] flex flex-col relative">
          {/* Terminal header */}
          <div className="border-b-4 border-cyber-gray-light p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Terminal className="w-5 h-5 text-cyber-accent" />
              <span className="font-mono font-bold text-cyber-accent uppercase text-sm tracking-wider">
                CHAT INTERFACE
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-cyber-primary rounded-full animate-pulse"></div>
              <span className="text-xs font-mono text-cyber-gray-light uppercase">ONLINE</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-20 h-20 text-cyber-gray-light mx-auto mb-4 opacity-50" />
                <p className="text-cyber-gray-light font-mono uppercase mb-2">SYSTEM READY</p>
                <p className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest">
                  INITIATE CONVERSATION
                </p>
              </div>
            ) : (
              messages.map((message, idx) => (
                <MessageBubble key={idx} message={message} />
              ))
            )}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-10 h-10 border-4 border-cyber-accent bg-cyber-dark flex items-center justify-center">
                  <Bot className="w-6 h-6 text-cyber-accent" />
                </div>
                <div className="border-4 border-cyber-gray-light bg-cyber-dark p-4 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-cyber-accent" />
                    <span className="text-sm font-mono text-cyber-accent uppercase tracking-wider">
                      PROCESSING...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t-4 border-cyber-gray-light p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ENTER QUERY..."
                className="flex-1 w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 placeholder:text-cyber-gray-light"
                disabled={loading}
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-cyber border-cyber-accent text-cyber-accent hover:bg-cyber-accent hover:text-cyber-darker"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-mono text-cyber-gray-light mt-2 uppercase tracking-widest">
              {input.length}/2000 CHARACTERS
            </p>
          </form>
        </div>

        {/* Quick Suggestions */}
        <div className="mt-6">
          <p className="text-sm font-mono font-bold text-cyber-gray-light uppercase mb-3 tracking-widest">
            QUICK QUERIES:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "How do I build muscle?",
              "What should I eat before a workout?",
              "How many reps should I do?",
              "Best exercises for abs?",
              "How to improve my squat form?",
              "What's a good meal plan?"
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="px-4 py-2 border-2 border-cyber-gray-light bg-cyber-dark hover:border-cyber-primary hover:text-cyber-primary text-cyber-gray-light font-mono text-xs uppercase tracking-wider transition-all"
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 border-4 border-cyber-accent bg-cyber-dark flex items-center justify-center">
          <Bot className="w-6 h-6 text-cyber-accent" />
        </div>
      )}
      
      <div
        className={`max-w-[80%] border-4 p-4 ${
          isUser
            ? 'border-cyber-primary bg-cyber-dark text-cyber-primary'
            : 'border-cyber-gray-light bg-cyber-dark text-cyber-gray-light'
        }`}
      >
        <p className="text-sm font-mono whitespace-pre-wrap">{message.content}</p>
        {message.tokens && (
          <p className="text-xs font-mono text-cyber-gray-light mt-2 uppercase tracking-widest">
            {message.tokens} TOKENS
          </p>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 border-4 border-cyber-primary bg-cyber-dark flex items-center justify-center">
          <User className="w-6 h-6 text-cyber-primary" />
        </div>
      )}
    </div>
  )
}