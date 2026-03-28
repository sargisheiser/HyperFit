import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Image, Loader2, UploadCloud } from 'lucide-react'
import CameraModal from './CameraModal'
import { useAuth } from '../../contexts/AuthContext'
import useUserStore from '../../store/userStore'
import { analyzeMealVision } from '../../services/nutritionService'
import logger from '../../utils/logger'

export default function PhotoCapture({ onAnalysisComplete, note }) {
  const { user } = useAuth()
  const { profile } = useUserStore((s) => ({ profile: s.profile }))
  const galleryInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState(null)

  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }, [])

  const handleFileSelected = useCallback((file) => {
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }, [])

  const handleGalleryChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelected(file)
    },
    [handleFileSelected],
  )

  const handleCameraCapture = useCallback(
    (file) => {
      handleFileSelected(file)
      setShowCamera(false)
    },
    [handleFileSelected],
  )

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || !user?.id) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeMealVision(selectedFile, {
        userId: user.id,
        note: note || '',
        profile,
      })
      logger.debug('[PhotoCapture] Analysis result:', result)
      onAnalysisComplete(result)
    } catch (err) {
      logger.error('[PhotoCapture] Analysis failed:', err)
      setError('Analyse fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [selectedFile, user?.id, note, profile, onAnalysisComplete])

  const handleReset = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
  }, [])

  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryChange}
        {...(isMobile ? { capture: 'environment' } : {})}
      />

      {!selectedFile ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-[#00FF7F]/20 bg-[#00FF7F]/2 px-6 py-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00FF7F]/10">
            <UploadCloud className="h-7 w-7 text-[#00FF7F]" />
          </div>
          <p className="text-[15px] text-white">Foto aufnehmen oder hochladen</p>
          <p className="mt-1 text-xs text-white/30">Tippe einen Button oder ziehe ein Bild hierher</p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => (isMobile ? galleryInputRef.current?.click() : setShowCamera(true))}
              className="flex items-center gap-2 rounded-xl border border-[#00FF7F]/30 bg-[#00FF7F]/15 px-5 py-2.5 text-sm font-medium text-[#00FF7F] transition hover:bg-[#00FF7F]/25"
            >
              <Camera className="h-4 w-4" />
              Kamera
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/60 transition hover:bg-white/10"
            >
              <Image className="h-4 w-4" />
              Galerie
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          {/* Image preview */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            <img
              src={previewUrl}
              alt="Mahlzeit"
              className="max-h-64 w-full object-cover"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00FF7F]" />
                  <span className="text-sm text-white/70">KI analysiert...</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#00CC66] px-6 py-3 text-sm font-semibold text-[#0a0a0f] transition disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysiere...
                </>
              ) : (
                'Analyse starten'
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={isAnalyzing}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/50 transition hover:bg-white/5 disabled:opacity-50"
            >
              Anderes Foto
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showCamera && (
          <CameraModal
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
