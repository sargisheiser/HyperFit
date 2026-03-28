import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Brain,
  Camera,
  CheckCircle2,
  CircleDot,
  History,
  Loader2,
  PenSquare,
  QrCode,
  UploadCloud,
  ArrowRight,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react'
import NeonCard from '../components/NeonCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ManualMealEntry from '../components/Nutrition/ManualMealEntry'
import AnalysisCorrection from '../components/Nutrition/AnalysisCorrection'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingState from '../components/ui/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import useNutritionStore from '../store/useNutritionStore'
import useUserStore from '../store/userStore'
import {
  analyzeMealVision,
  saveAnalyzedMeal,
  fetchMealHistory,
  fetchNutritionSnapshot,
  normalizeMealPayload,
} from '../services/nutritionService'
import api from '../services/api'
import logger from '../utils/logger'

// Helper function to remove markdown formatting (**, __, etc.)
const removeMarkdown = (text) => {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/\*\*/g, '') // Remove ** bold markers
    .replace(/__/g, '') // Remove __ bold markers
    .replace(/\*/g, '') // Remove single * italic markers
    .replace(/_/g, '') // Remove single _ italic markers
    .trim()
}

const STEPS = [
  { id: 'capture', label: 'Aufnahme', hint: 'Füge dein Mahlzeitfoto hinzu' },
  { id: 'scan', label: 'KI-Scan', hint: 'Vision-Pipeline läuft' },
  { id: 'results', label: 'Ergebnisse', hint: 'Makros & Erkenntnisse prüfen' },
  { id: 'save', label: 'Speichern', hint: 'In Mahlzeitenhistorie übernehmen' },
]

const statusCopy = {
  idle: 'Lade oder fotografiere deine Mahlzeit, um zu beginnen.',
  capture: 'Mahlzeit aufgenommen. Bereit für KI-Scan.',
  scanning: 'Analysiere Mahlzeit mit HyperFit Vision…',
  results: 'Scan abgeschlossen. Prüfe deine Erkenntnisse unten.',
  saving: 'Synchronisiere Eintrag mit deiner Historie…',
  saved: 'Eintrag gespeichert! Weiter so mit dem Loggen deiner Mahlzeiten.',
  error: 'Etwas ist schiefgelaufen. Passe an und versuche es erneut.',
}

const analysisVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

export default function MealAnalyzer({ action, onActionHandled }) {
  const { user } = useAuth()
  const userId = user?.id
  const { profile } = useUserStore((state) => ({ profile: state.profile }))
  const { setDailySnapshot } = useNutritionStore((state) => ({
    setDailySnapshot: state.setDailySnapshot,
  }))
  const galleryInputRef = useRef(null)
  const cameraFileInputRef = useRef(null)
  const cameraVideoRef = useRef(null)
  const barcodeVideoRef = useRef(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [note, setNote] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentStep, setCurrentStep] = useState('capture')
  const [completedSteps, setCompletedSteps] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [barcodeError, setBarcodeError] = useState(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [isFetchingBarcode, setIsFetchingBarcode] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [editingFoodLog, setEditingFoodLog] = useState(null)
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [editQuantityValue, setEditQuantityValue] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const cameraStreamRef = useRef(null)
  const barcodeStreamRef = useRef(null)
  const barcodeAnimationRef = useRef(null)
  const autoAnalyzePendingRef = useRef(false)
  const isMobileCapture = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }, [])

  const isMobileDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
  }, [])

  const supportsMediaStream = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return !!navigator.mediaDevices?.getUserMedia
  }, [])

  const markCompleted = (stepId) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]))
  }

  const resetWorkflow = () => {
    setAnalysis(null)
    setCompletedSteps([])
    setCurrentStep('capture')
    setStatus('idle')
  }

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
  }

  const stopBarcodeScanner = () => {
    if (barcodeAnimationRef.current) {
      cancelAnimationFrame(barcodeAnimationRef.current)
      barcodeAnimationRef.current = null
    }
    if (barcodeStreamRef.current) {
      barcodeStreamRef.current.getTracks().forEach((track) => track.stop())
      barcodeStreamRef.current = null
    }
  }

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setHistory([])
      setLoadingHistory(false)
      return
    }

    setLoadingHistory(true)
    try {
      const entries = await fetchMealHistory(userId, { limit: 24 })
      logger.debug('[MealAnalyzer] Loaded history entries:', { 
        count: entries.length, 
        entries: entries.slice(0, 2),
        userId 
      })
      setHistory(entries)
    } catch (err) {
      logger.error('[MealAnalyzer] Meal history fetch failed:', err)
      logger.error('[MealAnalyzer] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        userId
      })
      setHistory([])
      setError((prev) => prev ?? 'Meal history konnte nicht geladen werden.')
    } finally {
      setLoadingHistory(false)
    }
  }, [userId])

  const saveMealToHistory = useCallback(
    async (mealAnalysis) => {
      if (!mealAnalysis) return false
      if (!userId) {
        setError('Bitte melde dich erneut an, bevor du speicherst.')
        return false
      }

      setStatus('saving')
      setCurrentStep('save')
      markCompleted('results')

      try {
        const macros = mealAnalysis.macronutrients || {}
        // Ensure calories are correctly extracted - check multiple sources
        const mealCalories = mealAnalysis.total_calories ?? mealAnalysis.calories ?? 0
        logger.debug('[MealAnalyzer] Saving meal with calories:', {
          total_calories: mealAnalysis.total_calories,
          calories: mealAnalysis.calories,
          final: mealCalories,
          protein: macros.protein_grams ?? macros.protein ?? mealAnalysis.protein ?? 0,
        })
        
        const mealResponse = await saveAnalyzedMeal({
          userId,
          calories: mealCalories,
          protein: macros.protein_grams ?? macros.protein ?? mealAnalysis.protein ?? 0,
          carbs: macros.carbs_grams ?? macros.carbs ?? mealAnalysis.carbs ?? 0,
          fat: macros.fat_grams ?? macros.fat ?? mealAnalysis.fat ?? 0,
          note: note || mealAnalysis.note || '',
          imageUrl: mealAnalysis.image_url || mealAnalysis.imageUrl || null,
        }, profile)

        if (mealResponse?.dailySnapshot) {
          logger.debug('[MealAnalyzer] Updating daily snapshot:', mealResponse.dailySnapshot)
          setDailySnapshot(mealResponse.dailySnapshot)
        } else {
          logger.warn('[MealAnalyzer] No dailySnapshot in response, fetching fresh data...')
          // Fallback: Fetch fresh snapshot if backend didn't return it
          try {
            const freshSnapshot = await fetchNutritionSnapshot(userId, profile)
            logger.debug('[MealAnalyzer] Fetched fresh snapshot:', freshSnapshot)
            setDailySnapshot(freshSnapshot)
          } catch (snapshotError) {
            logger.error('[MealAnalyzer] Failed to fetch fresh snapshot:', snapshotError)
          }
        }
        if (mealResponse?.meal) {
          setAnalysis((prev) => ({
            ...(prev ?? {}),
            ...mealResponse.meal,
            food_items: prev?.food_items?.length ? prev.food_items : mealResponse.meal.food_items,
            insights: prev?.insights?.length ? prev.insights : mealResponse.meal.insights,
            recommendations: prev?.recommendations?.length ? prev.recommendations : mealResponse.meal.recommendations,
            confidence_score: prev?.confidence_score ?? mealResponse.meal.confidence_score,
          }))
        }

        await loadHistory()
        markCompleted('save')
        setStatus('saved')
        setError(null)
        return true
      } catch (err) {
        logger.error('Meal history refresh failed:', err)
        setStatus('error')
        if (err.response?.status === 401) {
          setError('Deine Session ist abgelaufen. Bitte melde dich erneut an, bevor du speicherst.')
        } else {
          setError(err.response?.data?.detail || err.message || 'Meal konnte nicht gespeichert werden.')
        }
        return false
      }
    },
    [userId, note, profile, setDailySnapshot, loadHistory, markCompleted],
  )

  const handleCameraCapture = async () => {
    if (!cameraVideoRef.current) return
    try {
      const canvas = document.createElement('canvas')
      const video = cameraVideoRef.current
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result)
          else reject(new Error('Snapshot failed'))
        }, 'image/jpeg', 0.92)
      })

      const file = new File([blob], `meal-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setShowCameraModal(false)
      stopCameraStream()
      handleFileSelection(file, { autoAnalyze: true })
    } catch (captureError) {
      logger.error('Unable to capture photo', captureError)
      setCameraError('Foto konnte nicht aufgenommen werden. Bitte erneut versuchen.')
    }
  }

  const closeCameraModal = () => {
    setShowCameraModal(false)
    setCameraError(null)
    stopCameraStream()
  }

  const handleBarcodeDetected = useCallback(async (rawCode) => {
    const code = String(rawCode || '').trim()
    if (!code) {
      setBarcodeError('Ungültiger Barcode. Bitte erneut versuchen.')
      return
    }

    stopBarcodeScanner()
    setShowQRScanner(false)
    setBarcodeError(null)
    onActionHandled?.()

    resetWorkflow()
    setIsAnalyzing(true)
    setIsFetchingBarcode(true)
    setStatus('scanning')
    setCurrentStep('scan')
    markCompleted('capture')

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await response.json()
      if (data.status !== 1) {
        setError(`Kein Produkt mit dem Barcode ${code} gefunden.`)
        setStatus('error')
        return
      }

      const product = data.product || {}
      const nutriments = product.nutriments || {}

      const normalized = normalizeMealPayload({
        analysis: {
          total_calories: Number(nutriments['energy-kcal_100g']) || 0,
          macronutrients: {
            protein_grams: Number(nutriments.proteins_100g) || 0,
            carbs_grams: Number(nutriments.carbohydrates_100g) || 0,
            fat_grams: Number(nutriments.fat_100g) || 0,
          },
          food_items: [
            {
              name: product.product_name || product.generic_name || 'Produkt',
              quantity: product.quantity || '100 g',
            },
          ],
          confidence_score: 0.85,
          insights: (product.labels_tags || []).map((label) => label.replace(/^[a-z]{2}:/, '')),
          recommendations: (product.allergens_imported || product.allergens || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => `Allergenhinweis: ${entry}`),
          note: product.product_name || product.generic_name || 'Barcode Scan',
          source: 'barcode',
          image_url: product.image_url || null,
        },
      })

      setAnalysis(normalized)
      setError(null)
      markCompleted('scan')
      setCurrentStep('results')
      markCompleted('results')
      setStatus('results')
      
      // Automatisch speichern nach erfolgreichem QR-Code-Scan
      await saveMealToHistory(normalized)
    } catch (err) {
      logger.error('Produktinformationen konnten nicht geladen werden:', err)
      setError('Produktinformationen konnten nicht geladen werden. Bitte versuche es erneut.')
      setStatus('error')
    } finally {
      setIsAnalyzing(false)
      setIsFetchingBarcode(false)
    }
  }, [saveMealToHistory, markCompleted, onActionHandled])

  const handleManualBarcodeSubmit = async (event) => {
    event.preventDefault()
    if (!manualBarcode.trim()) {
      setBarcodeError('Bitte gib einen Barcode ein.')
      return
    }
    await handleBarcodeDetected(manualBarcode.trim())
  }

  const closeBarcodeScanner = () => {
    setShowQRScanner(false)
    setBarcodeError(null)
    setManualBarcode('')
    stopBarcodeScanner()
  }

  const triggerCameraCapture = useCallback(() => {
    if (supportsMediaStream && !isMobileDevice) {
      setShowCameraModal(true)
    } else if (cameraFileInputRef.current) {
      cameraFileInputRef.current.click()
    } else {
      setShowCameraModal(true)
    }
  }, [isMobileDevice, supportsMediaStream])

  useEffect(() => {
    if (!action) return
    if (action === 'camera') {
      triggerCameraCapture()
      onActionHandled?.()
    } else if (action === 'qr') {
      setShowQRScanner(true)
      onActionHandled?.()
    }
  }, [action, onActionHandled, triggerCameraCapture])

  useEffect(() => {
    if (!showCameraModal) {
      stopCameraStream()
      return
    }

    let cancelled = false

    const startCamera = async () => {
      setCameraError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        cameraStreamRef.current = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play().catch(() => {})
        }
      } catch (err) {
        logger.error('Camera init failed', err)
        setCameraError('Kamera konnte nicht gestartet werden. Bitte erlaube den Zugriff oder nutze den Upload.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stopCameraStream()
    }
  }, [showCameraModal])

  useEffect(() => {
    if (!showQRScanner) {
      stopBarcodeScanner()
      return
    }

    let cancelled = false

    const startScanner = async () => {
      setBarcodeError(null)
      setManualBarcode('')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        barcodeStreamRef.current = stream
        if (barcodeVideoRef.current) {
          barcodeVideoRef.current.srcObject = stream
          await barcodeVideoRef.current.play().catch(() => {})
        }

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'] })
          const detectLoop = async () => {
            if (cancelled || !barcodeVideoRef.current) return
            try {
              const codes = await detector.detect(barcodeVideoRef.current)
              if (codes.length > 0) {
                handleBarcodeDetected(codes[0].rawValue)
                return
              }
            } catch (err) {
              logger.error('Barcode detection error', err)
              setBarcodeError('Barcode-Erkennung fehlgeschlagen. Halte den Code ruhig oder gib ihn manuell ein.')
            }
            barcodeAnimationRef.current = requestAnimationFrame(detectLoop)
          }
          barcodeAnimationRef.current = requestAnimationFrame(detectLoop)
        } else {
          setBarcodeError('Dieser Browser unterstützt keine Barcode-Erkennung. Bitte gib den Code manuell ein.')
        }
      } catch (err) {
        logger.error('Barcode scanner error', err)
        setBarcodeError('Kamera konnte nicht gestartet werden. Erlaube den Zugriff oder gib den Code manuell ein.')
      }
    }

    startScanner()

    return () => {
      cancelled = true
      stopBarcodeScanner()
    }
  }, [showQRScanner])

  useEffect(() => {
    if (!selectedFile) return
    const fileUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(fileUrl)

    return () => {
      URL.revokeObjectURL(fileUrl)
    }
  }, [selectedFile])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleManualMealSaved = useCallback(
    async (mealData) => {
      setShowManualEntry(false)
      await loadHistory()
      if (mealData?.dailySnapshot) {
        setDailySnapshot(mealData.dailySnapshot)
      } else {
        try {
          const freshSnapshot = await fetchNutritionSnapshot(userId, profile)
          setDailySnapshot(freshSnapshot)
        } catch (snapshotError) {
          logger.error('[MealAnalyzer] Failed to fetch fresh snapshot:', snapshotError)
        }
      }
    },
    [loadHistory, setDailySnapshot, userId, profile],
  )

  const handleAnalysisCorrected = useCallback(
    async (correctedData) => {
      setEditingFoodLog(null)
      await loadHistory()
      if (correctedData?.dailySnapshot) {
        setDailySnapshot(correctedData.dailySnapshot)
      } else {
        try {
          const freshSnapshot = await fetchNutritionSnapshot(userId, profile)
          setDailySnapshot(freshSnapshot)
        } catch (snapshotError) {
          logger.error('[MealAnalyzer] Failed to fetch fresh snapshot:', snapshotError)
        }
      }
    },
    [loadHistory, setDailySnapshot, userId, profile],
  )

  const handleAnalysisDeleted = useCallback(
    async (deletedId) => {
      setEditingFoodLog(null)
      await loadHistory()
      try {
        const freshSnapshot = await fetchNutritionSnapshot(userId, profile)
        setDailySnapshot(freshSnapshot)
      } catch (snapshotError) {
        logger.error('[MealAnalyzer] Failed to fetch fresh snapshot after deletion:', snapshotError)
      }
    },
    [loadHistory, setDailySnapshot, userId, profile],
  )

  const handleDeleteMeal = useCallback(async (entry) => {
    if (!entry || !entry.id) {
      setError('Mahlzeit-ID fehlt. Bitte versuche es erneut.')
      return
    }

    setDeletingId(entry.id)
    setError(null)

    try {
      // Use the new endpoint for meals table
      await api.delete(`/api/nutrition/meals/${entry.id}`)
      
      // Remove from local state immediately
      setHistory((prev) => prev.filter((item) => item.id !== entry.id))
      
      // Update nutrition snapshot to reflect deleted meal calories and macros
      try {
        const freshSnapshot = await fetchNutritionSnapshot(userId, profile)
        setDailySnapshot(freshSnapshot, { profile, preserveHistory: true })
      } catch (snapshotError) {
        logger.error('[MealAnalyzer] Failed to fetch fresh snapshot after deletion:', snapshotError)
      }
      
      setShowDeleteConfirm(null)
    } catch (err) {
      logger.error('[MealAnalyzer] Failed to delete meal:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Mahlzeit konnte nicht gelöscht werden.'
      
      // Handle 404 specifically
      if (err.response?.status === 404) {
        const detail = err.response?.data?.detail || ''
        if (detail.includes('not found')) {
          setError('Diese Mahlzeit existiert nicht mehr. Sie wurde möglicherweise bereits gelöscht.')
          // Remove from local state if it doesn't exist
          setHistory((prev) => prev.filter((item) => item.id !== entry.id))
        } else {
          setError(errorMessage)
        }
      } else {
        setError(errorMessage)
      }
    } finally {
      setDeletingId(null)
    }
  }, [userId, profile, setDailySnapshot])

  const handleEditFoodLog = useCallback(async (entry) => {
    try {
      // Check if entry has an ID
      if (!entry.id) {
        logger.error('Entry has no ID:', entry)
        setError('Mahlzeit-ID fehlt. Bitte versuche es erneut.')
        return
      }
      
      // For meals from meals table, we can use the entry directly
      // No need to fetch from /api/food since meals are stored differently
      setEditingFoodLog(entry)
    } catch (err) {
      logger.error('Failed to load food log:', err)
      if (entry && entry.id) {
        setEditingFoodLog(entry)
      } else {
        setError(err.response?.data?.detail || 'Mahlzeit konnte nicht geladen werden.')
      }
    }
  }, [])

  const handleFileSelection = (file, { autoAnalyze = false } = {}) => {
    if (!file) return
    resetWorkflow()
    setSelectedFile(file)
    setStatus('capture')
    markCompleted('capture')
    setCurrentStep('scan')
    setError(null)
    autoAnalyzePendingRef.current = autoAnalyze
  }

  const handleGalleryUpload = (event) => {
    const file = event.target.files?.[0]
    handleFileSelection(file, { autoAnalyze: true })
    event.target.value = ''
  }

  const handleNativeCameraUpload = (event) => {
    const file = event.target.files?.[0]
    handleFileSelection(file, { autoAnalyze: true })
    event.target.value = ''
  }

  const runAnalysis = useCallback(
    async (file) => {
      if (!file) {
        setError('Bitte wähle zuerst ein Bild aus oder nutze die Kamera.')
        return
      }
      if (!userId) {
        setError('Bitte melde dich an, bevor du die Analyse startest.')
        return
      }

      setIsAnalyzing(true)
      setError(null)
      setStatus('scanning')
      setCurrentStep('scan')

      try {
        const analysisResult = await analyzeMealVision({ userId, file, note: note.trim() })
        logger.debug('[Vision] normalized analysis result', analysisResult)
        setAnalysis(analysisResult)
        markCompleted('scan')
        markCompleted('results')
        setCurrentStep('results')
        setStatus('results')
        setError(null)
        
        // Automatisch speichern nach erfolgreicher Analyse
        await saveMealToHistory(analysisResult)
      } catch (err) {
        logger.error('Meal analysis failed:', err)
        if (err.response?.status === 401) {
          setError('Deine Session ist abgelaufen. Bitte melde dich erneut an, bevor du die Analyse startest.')
        } else if (err.response?.status === 503 || err.code === 'ERR_NETWORK' || err.message?.includes('503')) {
          setError('Der Vision-Service ist derzeit nicht verfügbar. Bitte versuche es später erneut oder starte den Backend-Server neu.')
        } else {
          setError(err.response?.data?.detail || err.message || 'Analyse fehlgeschlagen. Bitte erneut versuchen.')
        }
        setStatus('error')
        markCompleted('scan') // Reset scan step on error
      } finally {
        setIsAnalyzing(false)
      }
    },
    [analyzeMealVision, markCompleted, note, userId, saveMealToHistory],
  )

  const handleAnalyze = useCallback(() => {
    if (!selectedFile) {
      setError('Bitte wähle zuerst ein Bild aus oder nutze die Kamera.')
      return
    }
    runAnalysis(selectedFile)
  }, [runAnalysis, selectedFile])

  useEffect(() => {
    if (autoAnalyzePendingRef.current && selectedFile) {
      autoAnalyzePendingRef.current = false
      handleAnalyze()
    }
  }, [handleAnalyze, selectedFile])

  const handleSave = async () => {
    await saveMealToHistory(analysis)
  }

  const updateFoodItemQuantity = useCallback((index, newQuantity) => {
    if (!analysis?.food_items) return

    const updatedItems = [...analysis.food_items]
    const item = updatedItems[index]
    
    // Parse the current quantity to get the original grams
    const currentQuantity = item.quantity || '100g'
    let currentGrams = 100.0
    if (typeof currentQuantity === 'string' && currentQuantity.toLowerCase().includes('g')) {
      try {
        currentGrams = parseFloat(currentQuantity.toLowerCase().replace('g', '').trim()) || 100.0
      } catch {
        currentGrams = 100.0
      }
    } else if (typeof currentQuantity === 'number') {
      currentGrams = currentQuantity
    }

    // Parse the new quantity to get the new grams
    let newGrams = 100.0
    if (typeof newQuantity === 'string' && newQuantity.toLowerCase().includes('g')) {
      try {
        newGrams = parseFloat(newQuantity.toLowerCase().replace('g', '').trim()) || 100.0
      } catch {
        newGrams = currentGrams
      }
    } else if (typeof newQuantity === 'number') {
      newGrams = newQuantity
    }

    // Calculate the ratio (how much the quantity changed)
    const ratio = currentGrams > 0 ? newGrams / currentGrams : 1.0

    // Get current values (use absolute values, not per_100g)
    const currentCalories = item.calories || item.calories_per_100g || 0
    const currentProtein = item.protein_grams || item.protein_per_100g || 0
    const currentCarbs = item.carbs_grams || item.carbs_per_100g || 0
    const currentFat = item.fat_grams || item.fat_per_100g || 0

    // Use stored per_100g values if available, otherwise derive from current values
    const caloriesPer100g = item.calories_per_100g || (currentGrams > 0 ? (currentCalories / currentGrams) * 100 : currentCalories)
    const proteinPer100g = item.protein_per_100g || (currentGrams > 0 ? (currentProtein / currentGrams) * 100 : currentProtein)
    const carbsPer100g = item.carbs_per_100g || (currentGrams > 0 ? (currentCarbs / currentGrams) * 100 : currentCarbs)
    const fatPer100g = item.fat_per_100g || (currentGrams > 0 ? (currentFat / currentGrams) * 100 : currentFat)

    // Calculate new values based on new quantity
    const newCalories = (caloriesPer100g * newGrams) / 100
    const newProtein = (proteinPer100g * newGrams) / 100
    const newCarbs = (carbsPer100g * newGrams) / 100
    const newFat = (fatPer100g * newGrams) / 100

    // Update item with new quantity and recalculated values
    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      calories: newCalories,
      protein_grams: newProtein,
      carbs_grams: newCarbs,
      fat_grams: newFat,
      // Store per_100g values for future calculations
      calories_per_100g: caloriesPer100g,
      protein_per_100g: proteinPer100g,
      carbs_per_100g: carbsPer100g,
      fat_per_100g: fatPer100g,
    }

    // Recalculate totals from all items
    const totals = updatedItems.reduce(
      (acc, itm) => ({
        calories: acc.calories + (itm.calories || 0),
        protein: acc.protein + (itm.protein_grams || 0),
        carbs: acc.carbs + (itm.carbs_grams || 0),
        fat: acc.fat + (itm.fat_grams || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )

    // Update analysis with new items and totals
    setAnalysis((prev) => ({
      ...prev,
      food_items: updatedItems,
      calories: totals.calories,
      total_calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      macronutrients: {
        ...prev?.macronutrients,
        protein_grams: totals.protein,
        carbs_grams: totals.carbs,
        fat_grams: totals.fat,
      },
    }))
  }, [analysis])

  const stepState = useMemo(() => {
    const map = {}
    STEPS.forEach((step) => {
      if (completedSteps.includes(step.id)) {
        map[step.id] = 'done'
      } else if (step.id === currentStep) {
        map[step.id] = 'active'
      } else {
        map[step.id] = 'upcoming'
      }
    })
    return map
  }, [completedSteps, currentStep])

  const activeStatusCopy = statusCopy[status] || statusCopy.idle

  const dashboardMock = analysis ?? null
  const previewSource = analysis?.image_url || analysis?.imageUrl || previewUrl

  return (
    <div className="space-y-6">
      <NeonCard>
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-[#00FF7F]/70">HyperFit Vision</p>
              <h1 className="text-2xl font-semibold text-white md:text-3xl">Analyse your meals in seconds</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/60">
                Upload or capture a meal photo and let our AI lab decode calories, macros, and nutritional signals with
                GPT-4o vision precision.
              </p>
            </div>

            <label className="block">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/40">
                <PenSquare className="h-4 w-4 text-[#00FF7F]" />
                Optional note
              </span>
              <input
                type="text"
                placeholder="e.g. Post-workout meal, extra carbs today…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0A0B0C]/80 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#00FF7F] focus:outline-none"
              />
            </label>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[360px]">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => setShowManualEntry(true)}
              disabled={isAnalyzing}
              className="flex items-center justify-between rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/75 px-4 py-4 text-left text-white transition hover:border-[#00FF7F]/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-sm font-medium text-white">Manuelle Eingabe</p>
                <p className="text-xs text-white/50">Produkte aus Wörterbuch wählen</p>
              </div>
              <Plus className="h-5 w-5 text-[#00FF7F]" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isAnalyzing}
              className="flex items-center justify-between rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/75 px-4 py-4 text-left text-white transition hover:border-[#00FF7F]/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-sm font-medium text-white">Mahlzeitfoto hochladen</p>
                <p className="text-xs text-white/50">PNG, JPG up to 10MB</p>
              </div>
              <UploadCloud className="h-5 w-5 text-[#00FF7F]" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={() => {
                if (isMobileCapture) {
                  cameraFileInputRef.current?.click()
                } else {
                  setShowCameraModal(true)
                }
              }}
              disabled={isAnalyzing}
              className="flex items-center justify-between rounded-2xl border border-[#00FF7F]/20 bg-[#07110c]/75 px-4 py-4 text-left text-white transition hover:border-[#00C46A]/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-sm font-medium text-white">Kamera verwenden</p>
                <p className="text-xs text-white/50">Capture directly with your device</p>
              </div>
              <Camera className="h-5 w-5 text-[#00C46A]" />
            </motion.button>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryUpload}
            />
            <input
              ref={cameraFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleNativeCameraUpload}
            />

            {previewSource && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#08090c]"
              >
                <img src={previewSource} alt="Meal preview" className="h-40 w-full object-cover" />
              </motion.div>
            )}
          </div>
        </div>
      </NeonCard>

      <NeonCard>
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center gap-3">
            <CircleDot className="h-4 w-4 text-[#00FF7F]" />
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Fortschritt</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const state = stepState[step.id]
              return (
                <motion.div
                  key={step.id}
                  layout
                  transition={{ duration: 0.3 }}
                  className={`relative overflow-hidden rounded-2xl border bg-[#0F1018]/80 p-4 ${
                    state === 'active'
                      ? 'border-[#00FF7F]/60 shadow-[0_0_20px_rgba(0,255,127,0.25)]'
                      : state === 'done'
                        ? 'border-[#00C46A]/50'
                        : 'border-white/10'
                  }`}
                >
                  {state === 'active' && (
                    <motion.span
                      layoutId="step-glow"
                      className="absolute inset-0 -z-10 bg-gradient-to-br from-[#00FF7F]/20 via-transparent to-[#00C46A]/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <p className="text-sm font-semibold">{step.label}</p>
                      <p className="text-xs text-white/50">{step.hint}</p>
                    </div>
                    {state === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00FF7F]" />
                    ) : state === 'active' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#00FF7F]" />
                    ) : (
                      <History className="h-5 w-5 text-white/20" />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 px-4 py-3 text-sm text-white/70"
            >
              {activeStatusCopy}
            </motion.div>
          </AnimatePresence>

          {error && (
            <ErrorMessage
              message={error}
              title="Fehler bei der Mahlzeit-Analyse"
              variant="error"
              dismissible={true}
              onDismiss={() => setError(null)}
            />
          )}
        </div>
      </NeonCard>

      <AnimatePresence>
        {dashboardMock && (
          <motion.section
            variants={analysisVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-6"
          >
            <NeonCard>
              <div className="space-y-6 p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">KI-Nährstoffaufschlüsselung</p>
                    <h2 className="text-2xl font-semibold text-white">Ergebnisübersicht</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSave}
                    className="flex items-center gap-2 rounded-full border border-[#00FF7F]/40 px-4 py-2 text-sm font-medium text-[#00FF7F] transition hover:border-[#00FF7F]/70 hover:text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    In Historie speichern
                  </motion.button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: 'Calories',
                      value:
                        typeof dashboardMock?.calories === 'number'
                          ? `${Math.round(dashboardMock.calories)} kcal`
                          : '—',
                    },
                    {
                      label: 'Protein',
                      value:
                        typeof dashboardMock?.protein === 'number'
                          ? `${dashboardMock.protein.toFixed(1)} g`
                          : '—',
                    },
                    {
                      label: 'Carbs',
                      value:
                        typeof dashboardMock?.carbs === 'number'
                          ? `${dashboardMock.carbs.toFixed(1)} g`
                          : '—',
                    },
                    {
                      label: 'Fats',
                      value:
                        typeof dashboardMock?.fat === 'number'
                          ? `${dashboardMock.fat.toFixed(1)} g`
                          : '—',
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F1018] via-[#10131f] to-[#0a0b0e] p-4 text-sm text-white/70"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">{metric.label}</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">Erkannte Lebensmittel</p>
                    {analysis?.food_items?.length ? (
                      <ul className="space-y-2 text-sm text-white/70">
                        {analysis.food_items.map((item, index) => (
                          <li
                            key={`${item.name ?? 'item'}-${index}`}
                            className="rounded-2xl border border-white/10 bg-[#0B0D13]/60 px-4 py-3"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="font-semibold text-white">{item.name || 'Unbekanntes Produkt'}</span>
                              {editingItemIndex === index ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editQuantityValue}
                                    onChange={(e) => setEditQuantityValue(e.target.value)}
                                    onBlur={() => {
                                      updateFoodItemQuantity(index, editQuantityValue)
                                      setEditingItemIndex(null)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateFoodItemQuantity(index, editQuantityValue)
                                        setEditingItemIndex(null)
                                      }
                                    }}
                                    placeholder="z.B. 150g"
                                    className="w-20 rounded-lg border border-[#00FF7F]/30 bg-[#07110c]/80 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-[#00FF7F]/60 focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => setEditingItemIndex(null)}
                                    className="rounded-lg bg-white/5 p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {item.quantity && <span className="text-xs text-white/40">{item.quantity}</span>}
                                  <button
                                    onClick={() => {
                                      setEditingItemIndex(index)
                                      setEditQuantityValue(item.quantity || '100g')
                                    }}
                                    className="rounded-lg bg-[#00FF7F]/10 p-1 text-[#00FF7F] transition hover:bg-[#00FF7F]/20"
                                    title="Menge bearbeiten"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.25em] text-white/40">
                              {item.calories !== null && item.calories !== undefined && (
                                <span>{Math.round(item.calories)} kcal</span>
                              )}
                              {item.protein_grams !== null && item.protein_grams !== undefined && (
                                <span>Protein {Math.round(item.protein_grams)} g</span>
                              )}
                              {item.carbs_grams !== null && item.carbs_grams !== undefined && (
                                <span>Carbs {Math.round(item.carbs_grams)} g</span>
                              )}
                              {item.fat_grams !== null && item.fat_grams !== undefined && (
                                <span>Fat {Math.round(item.fat_grams)} g</span>
                              )}
                              {typeof item.confidence === 'number' && (
                                <span>Konfidenz {Math.round(item.confidence * 100)}%</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 px-4 py-3 text-sm text-white/60">
                        Keine Lebensmittel erkannt. Versuche ein klareres Foto.
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">Konfidenz</p>
                      <p className="mt-3 text-2xl font-semibold text-white">
                        {dashboardMock?.confidence_score
                          ? `${Math.round(dashboardMock.confidence_score * 100)}%`
                          : '—'}
                      </p>
                    </div>
                        {dashboardMock?.insights?.length && (
                      <div className="space-y-2 text-sm text-white/70">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Wichtige Erkenntnisse</p>
                        <ul className="space-y-2">
                          {dashboardMock.insights.map((insight, idx) => (
                            <li key={idx} className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 px-4 py-3">
                              {removeMarkdown(insight)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                        {dashboardMock?.recommendations?.length && (
                      <div className="space-y-2 text-sm text-white/70">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Empfehlungen</p>
                        <ul className="space-y-2">
                          {dashboardMock.recommendations.map((item, idx) => (
                            <li key={idx} className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 px-4 py-3">
                              {removeMarkdown(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </NeonCard>
          </motion.section>
        )}
      </AnimatePresence>

      <NeonCard>
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-[#00FF7F]" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Mahlzeitenhistorie</p>
              <h2 className="text-lg font-semibold text-white">Letzte Analysen</h2>
            </div>
          </div>

          {loadingHistory ? (
            <LoadingSpinner label="Syncing meal archive" />
          ) : history.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-white/60">Noch keine Mahlzeiten geloggt. Analysiere deine erste Mahlzeit, um eine Historie aufzubauen.</p>
              {error && (
                <p className="text-xs text-red-400/80">Fehler: {error}</p>
              )}
              <button
                onClick={() => loadHistory()}
                className="text-xs text-[#00FF7F]/80 hover:text-[#00FF7F] underline"
              >
                Erneut laden
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {history.slice(0, 3).map((entry) => (
                <motion.div
                  key={entry.id || entry.created_at}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-white/10 bg-[#0B0D13]/80 p-4 text-sm text-white/70"
                >
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString()
                        : entry.date
                          ? new Date(entry.date).toLocaleDateString('de-DE')
                          : 'Unbekanntes Datum'}
                    </span>
                    <span>
                      {entry.total_calories ?? entry.calories
                        ? `${Math.round(entry.total_calories ?? entry.calories ?? 0)} kcal`
                        : '—'}
                    </span>
                  </div>
                  {(entry.image_url || entry.image_path) && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                      <img 
                        src={
                          entry.image_url 
                            ? (entry.image_url.startsWith('http') ? entry.image_url : `http://localhost:8000${entry.image_url}`)
                            : entry.image_path
                              ? (entry.image_path.startsWith('http') ? entry.image_path : `http://localhost:8000/${entry.image_path.replace(/^\/?uploads\//, 'uploads/')}`)
                              : ''
                        } 
                        alt={entry.food_items?.[0]?.name || 'Meal'} 
                        className="h-32 w-full object-cover" 
                        onError={(e) => {
                          logger.warn('[MealAnalyzer] Image load failed:', entry.image_url || entry.image_path)
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-white">
                    {entry.food_items?.map((item) => item.name).filter(Boolean).join(', ') || 'Unlabeled meal'}
                  </p>
                  {entry.food_items?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {entry.food_items.map((item, idx) => (
                        <div key={`${item.name ?? 'history'}-${idx}`} className="rounded-xl border border-white/10 bg-[#0B0D13]/60 p-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm text-white/80">{item.name || 'Zutat'}</span>
                            {item.quantity && <span className="text-xs text-white/40">{item.quantity}</span>}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
                            {item.calories !== null && item.calories !== undefined && (
                              <span>{Math.round(item.calories)} kcal</span>
                            )}
                            {item.protein_grams !== null && item.protein_grams !== undefined && (
                              <span>Protein {Math.round(item.protein_grams)} g</span>
                            )}
                            {item.carbs_grams !== null && item.carbs_grams !== undefined && (
                              <span>Carbs {Math.round(item.carbs_grams)} g</span>
                            )}
                            {item.fat_grams !== null && item.fat_grams !== undefined && (
                              <span>Fat {Math.round(item.fat_grams)} g</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.confidence_score && (
                    <p className="mt-2 text-xs text-white/40">
                      Konfidenz {Math.round(entry.confidence_score * 100)}%
                    </p>
                  )}
                  {entry.note && (
                    <p className="mt-2 text-xs text-white/50 italic">“{entry.note}”</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                    <span>
                      Protein {Math.round(entry.macronutrients?.protein_grams ?? entry.protein ?? 0)}g
                    </span>
                    <span>Carbs {Math.round(entry.macronutrients?.carbs_grams ?? entry.carbs ?? 0)}g</span>
                    <span>Fat {Math.round(entry.macronutrients?.fat_grams ?? entry.fat ?? 0)}g</span>
                  </div>
                  {entry.insights?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-white/30">
                      {entry.insights.map((insight, index) => (
                        <span key={`${insight}-${index}`} className="rounded-full border border-white/10 px-2 py-1">
                          {removeMarkdown(insight)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        if (!entry.id) {
                          logger.error('Entry has no ID:', entry)
                          setError('Mahlzeit-ID fehlt. Bitte versuche es später erneut.')
                          return
                        }
                        handleEditFoodLog(entry)
                      }}
                      disabled={!entry.id}
                      className="flex items-center gap-1 rounded-lg border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-3 py-1.5 text-xs font-medium text-[#00FF7F] transition hover:bg-[#00FF7F]/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Edit2 className="h-3 w-3" />
                      Korrigieren
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(entry.id)}
                      disabled={!entry.id || deletingId === entry.id}
                      className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === entry.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Löschen...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3" />
                          Löschen
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
                ))}
              </div>
              {history.length > 3 && (
                <div className="mt-6 flex justify-center">
                  <Link
                    to="/nutrition?view=history"
                    className="group flex items-center gap-2 rounded-xl border border-[#00FF7F]/30 bg-[#00FF7F]/10 px-6 py-3 text-sm font-semibold text-[#00FF7F] transition hover:bg-[#00FF7F]/20 hover:border-[#00FF7F]/50"
                  >
                    <span>Mehr ansehen</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </NeonCard>

      <AnimatePresence>
        {showCameraModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-xl space-y-6 rounded-3xl border border-white/10 bg-[#101012] p-6 text-white"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                type="button"
                onClick={closeCameraModal}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70 transition hover:text-white"
              >
                Abbrechen
              </button>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Foto aufnehmen</h3>
                <p className="text-sm text-white/60">
                  Richte dein Gericht vor die Kamera. Wir speichern nur das Foto, um Makros und Kalorien zu analysieren.
                </p>
              </div>
              <div className="relative mx-auto h-[320px] w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <video
                  ref={cameraVideoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <div className="pointer-events-none absolute inset-8 rounded-3xl border border-white/20" />
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-4 text-center text-sm text-red-200">
                    {cameraError}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  Schließen
                </button>
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00FF7F]/40 bg-[#00FF7F]/10 px-4 py-2 text-xs font-semibold text-[#00FF7F] transition hover:border-[#00FF7F]/70 hover:bg-[#00FF7F]/20"
                >
                  <Camera className="h-4 w-4" />
                  Foto aufnehmen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQRScanner && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-xl space-y-6 rounded-3xl border border-white/10 bg-[#101012] p-6 text-white"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                type="button"
                onClick={closeBarcodeScanner}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70 transition hover:text-white"
              >
                Schließen
              </button>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Produkt scannen</h3>
                <p className="text-sm text-white/60">
                  Halte den Barcode eines Lebensmittels vor die Kamera. Wir nutzen Open Food Facts, um Kalorien- und Makrodaten zu laden.
                </p>
              </div>
              <div className="relative mx-auto h-[320px] w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <video
                  ref={barcodeVideoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <div className="pointer-events-none absolute inset-8 rounded-3xl border border-white/20" />
                {isFetchingBarcode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 text-sm text-white/80">
                    <Loader2 className="h-5 w-5 animate-spin text-[#00FF7F]" />
                    Produkt wird geladen …
                  </div>
                )}
              </div>
              {barcodeError && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {barcodeError}
                </div>
              )}
              <form
                onSubmit={handleManualBarcodeSubmit}
                className="space-y-3 rounded-2xl border border-[#00FF7F]/20 bg-[#060b08]/80 p-4 text-sm text-[#d0ffe8]"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Barcode manuell eingeben</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={manualBarcode}
                    onChange={(event) => setManualBarcode(event.target.value)}
                    type="text"
                    inputMode="numeric"
                    placeholder="z. B. 4001724812345"
                    className="flex-1 rounded-xl border border-white/10 bg-[#0b0d13] px-3 py-2 text-white focus:border-[#00FF7F]/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isFetchingBarcode}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00FF7F]/40 bg-[#00FF7F]/10 px-4 py-2 text-xs font-semibold text-[#00FF7F] transition hover:border-[#00FF7F]/70 hover:bg-[#00FF7F]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isFetchingBarcode ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Prüfe Code…
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4" />
                        Barcode übernehmen
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-white/40">
                  Tipp: Die meisten Produkte in Deutschland verwenden 13-stellige EAN-Codes.
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Meal Entry Modal */}
      <AnimatePresence>
        {showManualEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur"
            onClick={() => setShowManualEntry(false)}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl"
              >
                <ManualMealEntry
                  onMealSaved={handleManualMealSaved}
                  onCancel={() => setShowManualEntry(false)}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Mahlzeit löschen?</h3>
                  <p className="text-sm text-white/60">
                    Diese Aktion kann nicht rückgängig gemacht werden. Die Kalorien werden von deinem Tagesziel abgezogen.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deletingId !== null}
                  className="flex-1 rounded-xl border border-white/10 bg-[#07110c]/60 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-[#07110c]/80 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    const entry = history.find((e) => e.id === showDeleteConfirm)
                    if (entry) {
                      handleDeleteMeal(entry)
                    }
                  }}
                  disabled={deletingId !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird gelöscht...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Endgültig löschen
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Correction Modal */}
      <AnimatePresence>
        {editingFoodLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur"
            onClick={() => setEditingFoodLog(null)}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl"
              >
                <AnalysisCorrection
                  foodLog={editingFoodLog}
                  onCorrected={handleAnalysisCorrected}
                  onDeleted={handleAnalysisDeleted}
                  onCancel={() => setEditingFoodLog(null)}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
