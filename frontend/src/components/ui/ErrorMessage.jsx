import { AlertCircle, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function ErrorMessage({ 
  message, 
  title = 'Fehler',
  onDismiss,
  variant = 'error',
  className = '',
  showIcon = true,
  dismissible = false 
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const variants = {
    error: {
      border: 'border-red-500/40',
      bg: 'bg-red-500/10',
      text: 'text-red-200',
      icon: 'text-red-400',
      title: 'text-red-300',
    },
    warning: {
      border: 'border-yellow-500/40',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-300',
    },
    info: {
      border: 'border-blue-500/40',
      bg: 'bg-blue-500/10',
      text: 'text-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-300',
    },
  }

  const styles = variants[variant] || variants.error

  const handleDismiss = () => {
    setDismissed(true)
    if (onDismiss) onDismiss()
  }

  // Format error message - make it more user-friendly
  const formatMessage = (msg) => {
    if (!msg) return 'Ein unerwarteter Fehler ist aufgetreten.'
    
    // Remove technical error details for user-facing messages
    let formatted = msg
    
    // Common API error patterns
    if (msg.includes('Network Error') || msg.includes('Failed to fetch')) {
      return 'Verbindungsfehler. Bitte überprüfe deine Internetverbindung und versuche es erneut.'
    }
    
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'
    }
    
    if (msg.includes('403') || msg.includes('Forbidden')) {
      return 'Du hast keine Berechtigung für diese Aktion.'
    }
    
    if (msg.includes('404') || msg.includes('Not Found')) {
      return 'Die angeforderte Ressource wurde nicht gefunden.'
    }
    
    if (msg.includes('500') || msg.includes('Internal Server Error')) {
      return 'Ein Serverfehler ist aufgetreten. Bitte versuche es später erneut.'
    }
    
    if (msg.includes('timeout') || msg.includes('Timeout')) {
      return 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.'
    }
    
    // Remove technical prefixes
    formatted = formatted.replace(/^(Error|Fehler|Exception):\s*/i, '')
    formatted = formatted.replace(/^\[.*?\]\s*/, '')
    
    return formatted
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-2xl border ${styles.border} ${styles.bg} p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`text-sm font-semibold mb-1 ${styles.title}`}>
              {title}
            </p>
          )}
          <p className={`text-sm ${styles.text}`}>
            {formatMessage(message)}
          </p>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 ${styles.text} hover:opacity-70 transition-opacity`}
            aria-label="Fehler schließen"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}



