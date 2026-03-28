import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Camera, X } from 'lucide-react'
import logger from '../../utils/logger'

export default function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        logger.error('[CameraModal] Camera error:', err)
      }
    }

    startCamera()

    return () => {
      mounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  const handleCapture = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
          onCapture(file)
        }
      },
      'image/jpeg',
      0.85,
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95"
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl">
        <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        {/* Framing guides */}
        <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-[#00FF7F]/20" />
      </div>

      <button
        onClick={handleCapture}
        className="mt-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#00FF7F]/40 bg-[#00FF7F]/20 transition hover:bg-[#00FF7F]/30"
      >
        <Camera className="h-6 w-6 text-[#00FF7F]" />
      </button>
    </motion.div>
  )
}
