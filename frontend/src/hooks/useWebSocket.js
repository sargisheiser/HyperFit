import { useCallback, useEffect, useRef, useState } from 'react'

export default function useWebSocket(url, { onMessage, onOpen, onClose, enabled = false } = {}) {
  const socketRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | connecting | open | closed | error

  const send = useCallback(
    (data) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(typeof data === 'string' ? data : JSON.stringify(data))
      }
    },
    [socketRef],
  )

  const close = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const connect = () => {
      try {
        setStatus('connecting')
        const token = localStorage.getItem('token')
        const socketUrl = token ? `${url}?token=${token}` : url
        const ws = new WebSocket(socketUrl)
        socketRef.current = ws

        ws.onopen = (event) => {
          setStatus('open')
          onOpen?.(event)
        }

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data)
            onMessage?.(payload)
          } catch (err) {
            console.error('Unable to parse WebSocket message:', err)
          }
        }

        ws.onerror = (event) => {
          console.error('WebSocket error', event)
          setStatus('error')
        }

        ws.onclose = (event) => {
          setStatus('closed')
          onClose?.(event)
        }
      } catch (err) {
        console.error('Failed to connect WebSocket:', err)
        setStatus('error')
      }
    }

    connect()

    return () => {
      close()
    }
  }, [url, enabled, onMessage, onOpen, onClose, close])

  return {
    status,
    send,
    close,
    socket: socketRef.current,
  }
}




