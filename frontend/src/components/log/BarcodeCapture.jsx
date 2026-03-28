import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, QrCode, Search, X } from 'lucide-react'
import { normalizeMealPayload } from '../../services/nutritionService'
import logger from '../../utils/logger'

export default function BarcodeCapture({ onAnalysisComplete }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const animationRef = useRef(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)

  const supportsDetector = useMemo(() => {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window
  }, [])

  const stopScanner = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScannerActive(false)
  }, [])

  useEffect(() => {
    return () => stopScanner()
  }, [stopScanner])

  const fetchProduct = useCallback(
    async (code) => {
      setIsFetching(true)
      setError(null)
      try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
        const data = await response.json()
        if (data.status !== 1 || !data.product) {
          setError('Produkt nicht gefunden. Versuche manuell eingeben.')
          return
        }
        const product = data.product
        const nutrients = product.nutriments || {}
        const quantity = product.quantity || '100g'

        const analysisData = {
          food_items: [
            {
              name: product.product_name || product.product_name_de || 'Unbekanntes Produkt',
              quantity,
              calories: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0,
              calories_per_100g: nutrients['energy-kcal_100g'] || 0,
              protein_grams: nutrients.proteins_100g || nutrients.proteins || 0,
              protein_per_100g: nutrients.proteins_100g || 0,
              carbs_grams: nutrients.carbohydrates_100g || nutrients.carbohydrates || 0,
              carbs_per_100g: nutrients.carbohydrates_100g || 0,
              fat_grams: nutrients.fat_100g || nutrients.fat || 0,
              fat_per_100g: nutrients.fat_100g || 0,
              confidence: 0.95,
            },
          ],
          total_calories: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0,
          confidence_score: 0.95,
          barcode: code,
          image_url: product.image_front_url || product.image_url || null,
        }

        const normalized = normalizeMealPayload(analysisData)
        logger.debug('[BarcodeCapture] Product found:', normalized)
        stopScanner()
        onAnalysisComplete(normalized)
      } catch (err) {
        logger.error('[BarcodeCapture] Fetch error:', err)
        setError('Fehler beim Abrufen. Bitte versuche es erneut.')
      } finally {
        setIsFetching(false)
      }
    },
    [onAnalysisComplete, stopScanner],
  )

  const startScanner = useCallback(async () => {
    if (!supportsDetector) {
      setError('Barcode-Erkennung wird nicht unterstützt. Bitte Code manuell eingeben.')
      return
    }
    setError(null)
    setScannerActive(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'],
      })

      const detect = async () => {
        if (!videoRef.current || !streamRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue
            logger.debug('[BarcodeCapture] Detected:', code)
            await fetchProduct(code)
            return
          }
        } catch {
          // Detection frame error, continue
        }
        animationRef.current = requestAnimationFrame(detect)
      }
      animationRef.current = requestAnimationFrame(detect)
    } catch (err) {
      logger.error('[BarcodeCapture] Scanner error:', err)
      setError('Kamera konnte nicht gestartet werden.')
      setScannerActive(false)
    }
  }, [supportsDetector, fetchProduct])

  const handleManualSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (manualCode.length >= 8) {
        fetchProduct(manualCode)
      }
    },
    [manualCode, fetchProduct],
  )

  return (
    <div className="space-y-4">
      {!scannerActive ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-white/10 bg-white/2 px-6 py-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <QrCode className="h-7 w-7 text-white/50" />
          </div>
          <p className="text-[15px] text-white">Barcode scannen</p>
          <p className="mt-1 text-sm text-white/30">Scanne den Barcode eines Produkts</p>

          <button
            onClick={startScanner}
            disabled={isFetching}
            className="mx-auto mt-6 flex items-center gap-2 rounded-xl border border-[#00FF7F]/30 bg-[#00FF7F]/15 px-6 py-2.5 text-sm font-medium text-[#00FF7F] transition hover:bg-[#00FF7F]/25"
          >
            <QrCode className="h-4 w-4" />
            Scanner starten
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden rounded-2xl border border-white/10"
        >
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-[#00FF7F]/20" />
          {isFetching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-8 w-8 animate-spin text-[#00FF7F]" />
            </div>
          )}
          <button
            onClick={stopScanner}
            className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Manual input */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="EAN-Code eingeben (z.B. 4015400346353)"
            className="w-full rounded-xl border border-white/10 bg-white/3 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/25 focus:border-[#00FF7F]/30 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={manualCode.length < 8 || isFetching}
          className="rounded-xl bg-[#00FF7F]/15 px-4 text-sm font-medium text-[#00FF7F] transition hover:bg-[#00FF7F]/25 disabled:opacity-30"
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Suchen'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
