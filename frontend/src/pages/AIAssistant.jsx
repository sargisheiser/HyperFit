import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { Send, Bot, User, Loader, Sparkles, Globe } from 'lucide-react'

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const quickQueries = [
    'What should I eat today?',
    'How many calories do I need?',
    'Best workout for abs?',
    'Protein recommendations?'
  ]

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
    try {
      const response = await api.get('/api/chat/history?limit=10')
      if (response.data && response.data.length > 0) {
        const historyMessages = response.data.flatMap(item => [
          { role: 'user', content: item.message, timestamp: item.created_at },
          { role: 'assistant', content: item.response, timestamp: item.created_at }
        ])
        setMessages(historyMessages)
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
    }
  }

  const sendMessage = async (query) => {
    const messageText = query || input.trim()
    if (!messageText || loading) return

    const userMessage = messageText
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
      // Try the new HyperAI agent endpoint first
      let response
      try {
        response = await api.post('/api/ask_agent', { prompt: userMessage })
        const assistantMessage = {
          role: 'assistant',
          content: response.data.response || 'No response received',
          timestamp: new Date().toISOString(),
          source: response.data.source || 'ai'
        }
        setMessages(prev => [...prev, assistantMessage])
      } catch (agentError) {
        // Fallback to regular chat endpoint if agent endpoint fails
        console.warn('Agent endpoint failed, falling back to chat:', agentError)
        response = await api.post('/api/chat/', { message: userMessage })
        const assistantMessage = {
          role: 'assistant',
          content: response.data.response || 'No response received',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error.response?.data?.detail || 'Failed to send message')
      
      const errorMessage = {
        role: 'assistant',
        content: 'Error: Failed to get response. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  return (
    <div className="min-h-screen bg-black text-white p-4" style={{ fontFamily: "'VT323', monospace" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8" style={{ color: '#00FFFF' }} />
            <h1 className="text-4xl uppercase tracking-wider mb-2" style={{ color: '#00FFFF', textShadow: '0 0 10px rgba(0, 255, 255, 0.5)', fontFamily: "'Orbitron', sans-serif" }}>
              ⚙ HYPERAI ASSISTANT
            </h1>
          </div>
          <div className="border-t border-cyan-500"></div>
        </div>

        {/* Chat Container */}
        <div className="card-cyber card-cyber-cyan mb-6" style={{ height: '60vh', overflowY: 'auto' }}>
          <div className="space-y-4 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Bot className="w-16 h-16 mx-auto mb-4" style={{ color: '#00FFFF' }} />
                <p className="text-xl uppercase">No messages yet</p>
                <p className="text-sm">Enter a query to start chatting</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 border ${
                      msg.role === 'user'
                        ? 'border-green-500 text-green-500'
                        : 'border-cyan-500 text-cyan-500'
                    }`}
                    style={{
                      boxShadow: msg.role === 'user' 
                        ? '0 0 10px rgba(0, 255, 0, 0.5)' 
                        : '0 0 10px rgba(0, 255, 255, 0.5)'
                    }}
                  >
                    <div className="flex items-start space-x-2 mb-2">
                      {msg.role === 'assistant' && (
                        <>
                          {msg.source === 'web' ? (
                            <Globe className="w-5 h-5 flex-shrink-0" style={{ color: '#9D4EDD' }} />
                          ) : (
                            <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: '#00FFFF' }} />
                          )}
                        </>
                      )}
                      {msg.role === 'user' && (
                        <User className="w-5 h-5 flex-shrink-0" style={{ color: '#00FF00' }} />
                      )}
                      <span className="text-xs uppercase">
                        {msg.role === 'user' ? 'USER' : msg.source === 'web' ? '🌐 WEB' : '⚙ HYPERAI'}
                      </span>
                    </div>
                    <p className="text-lg whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex justify-start">
                <div className="border border-cyan-500 p-4 text-cyan-500">
                  <div className="flex items-center space-x-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span className="uppercase">Processing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Queries */}
        <div className="mb-6">
          <h2 className="text-2xl uppercase mb-3" style={{ color: '#00FFFF' }}>QUICK QUERIES</h2>
          <div className="flex flex-wrap gap-3">
            {quickQueries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(query)}
                className="px-4 py-2 border border-cyan-500 text-cyan-500 uppercase hover:bg-cyan-500 hover:text-black transition-all"
                style={{
                  boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
                }}
                disabled={loading}
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="card-cyber card-cyber-cyan">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ENTER QUERY"
              className="flex-1 bg-black border border-cyan-500 p-3 text-white placeholder-gray-500 uppercase focus:outline-none focus:border-cyan-400"
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: '1.25rem',
                boxShadow: 'inset 0 0 10px rgba(0, 255, 255, 0.1)'
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 border border-cyan-500 text-cyan-500 uppercase hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          {error && (
            <div className="mt-3 p-3 border border-red-500 text-red-500 text-sm">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

