import { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import { Upload, Sparkles, X, CheckCircle, Utensils, Zap, Activity, Target, Camera, Scan, Edit, Trash2 } from 'lucide-react'
import CameraCapture from '../components/CameraCapture'
import FoodRecognitionCamera from '../components/FoodRecognitionCamera'
import BarcodeScanner from '../components/BarcodeScanner'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function Meals() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null) // Changed from '' to null to distinguish between no error and empty string
  const [showCamera, setShowCamera] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [scanningProduct, setScanningProduct] = useState(false)
  const [scannedProduct, setScannedProduct] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    meal_type: '',
    estimated_calories: '',
    protein_grams: '',
    carbs_grams: '',
    fat_grams: ''
  })

  useEffect(() => {
    fetchMeals()
  }, [])

  const fetchMeals = async () => {
    try {
      setError(null) // Clear any previous errors
      const response = await api.get('/api/meals/')
      setMeals(response.data || [])
      setError(null) // Ensure error is cleared on success
    } catch (error) {
      console.error('Error fetching meals:', error)
      // Only set error if it's not a 401 (unauthorized) - that's handled by auth context
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        // Check if it's a network error
        if (!error.response) {
          setError('Cannot connect to server. Make sure the backend is running on http://localhost:8000')
        } else {
          setError(`Failed to load meals: ${error.response?.data?.detail || error.message}`)
        }
      } else {
        setError(null) // Don't show error for auth issues
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setUploading(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/api/meals/upload-and-analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAnalysisResult(response.data)
      setError(null) // Clear error on success
      await fetchMeals()
    } catch (error) {
      console.error('Error analyzing meal:', error)
      
      // Handle different error types
      let errorMessage = 'Failed to analyze meal'
      
      if (error.response) {
        // Server responded with error
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message
          }
        } else {
          errorMessage = `Server error: ${error.response.status}`
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to server. Make sure the backend is running.'
      } else {
        // Error setting up request
        errorMessage = error.message || 'Failed to analyze meal'
      }
      
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      await handleFileUpload(file)
    }
  }

  const handleCameraCapture = async (file) => {
    await handleFileUpload(file)
  }

  const handleFoodRecognitionSuccess = async (result) => {
    // Meal is already saved by the backend, just refresh the list
    setAnalysisResult(result)
    await fetchMeals()
    setShowCamera(false)
  }

  const handleBarcodeScan = async (barcode) => {
    setScanningProduct(true)
    setError(null)
    setScannedProduct(null)
    
    try {
      // First, lookup the product
      const lookupResponse = await api.get(`/api/meals/barcode/${barcode}`)
      setScannedProduct(lookupResponse.data)
      setShowBarcodeScanner(false)
    } catch (error) {
      console.error('Error looking up product:', error)
      setError(error.response?.data?.detail || 'Product not found. Please try scanning again.')
      setShowBarcodeScanner(false)
    } finally {
      setScanningProduct(false)
    }
  }

  const handleAddScannedProduct = async (quantityGrams = null) => {
    if (!scannedProduct) return

    setScanningProduct(true)
    setError(null)

    try {
      const barcode = scannedProduct.barcode
      const params = quantityGrams ? `?quantity_grams=${quantityGrams}` : ''
      
      await api.post(`/api/meals/barcode/${barcode}/add${params}`)
      setScannedProduct(null)
      await fetchMeals()
    } catch (error) {
      console.error('Error adding product:', error)
      setError(error.response?.data?.detail || 'Failed to add product as meal')
    } finally {
      setScanningProduct(false)
    }
  }

  const handleEditMeal = (meal) => {
    console.log('Edit meal called:', meal)
    setEditingMeal(meal)
    setEditFormData({
      name: meal.name || '',
      description: meal.description || '',
      meal_type: meal.meal_type || '',
      estimated_calories: meal.estimated_calories || '',
      protein_grams: meal.protein_grams || '',
      carbs_grams: meal.carbs_grams || '',
      fat_grams: meal.fat_grams || ''
    })
  }

  const handleUpdateMeal = async (e) => {
    e.preventDefault()
    if (!editingMeal) {
      console.error('No meal selected for editing')
      return
    }

    console.log('Updating meal:', editingMeal.id, editFormData)

    try {
      setError(null)
      const updateData = {
        name: editFormData.name || null,
        description: editFormData.description || null,
        meal_type: editFormData.meal_type || null,
        estimated_calories: editFormData.estimated_calories ? parseFloat(editFormData.estimated_calories) : null,
        protein_grams: editFormData.protein_grams ? parseFloat(editFormData.protein_grams) : null,
        carbs_grams: editFormData.carbs_grams ? parseFloat(editFormData.carbs_grams) : null,
        fat_grams: editFormData.fat_grams ? parseFloat(editFormData.fat_grams) : null
      }
      
      console.log('Making PUT API call to:', `/api/meals/${editingMeal.id}`, 'with data:', updateData)
      const response = await api.put(`/api/meals/${editingMeal.id}`, updateData)
      console.log('Update response:', response)
      
      setEditingMeal(null)
      await fetchMeals()
    } catch (error) {
      console.error('Error updating meal:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to update meal')
    }
  }

  const handleDeleteMeal = async (mealId) => {
    console.log('Delete meal called with ID:', mealId)
    
    if (!window.confirm('Are you sure you want to delete this meal?')) {
      return
    }

    try {
      setError(null)
      console.log('Making DELETE API call to:', `/api/meals/${mealId}`)
      const response = await api.delete(`/api/meals/${mealId}`)
      console.log('Delete response:', response)
      await fetchMeals()
    } catch (error) {
      console.error('Error deleting meal:', error)
      setError(error.response?.data?.detail || 'Failed to delete meal')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyber-primary border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-cyber-secondary border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4" style={{ fontFamily: "'VT323', monospace" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl uppercase tracking-wider mb-4" style={{ color: '#00FF00', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
            NUTRITION LOG
          </h1>
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setShowBarcodeScanner(true)}
              className="px-6 py-3 border-2 uppercase text-xl hover:bg-magenta-500 hover:text-black transition-all"
              style={{ 
                borderColor: '#FF00FF',
                color: '#FF00FF',
                boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)'
              }}
              disabled={uploading || analyzing || scanningProduct}
            >
              <Scan className="w-5 h-5 inline mr-2" />
              SCAN BARCODE
            </button>
            <button
              onClick={() => setShowCamera(true)}
              className="px-6 py-3 border-2 uppercase text-xl hover:bg-cyan-500 hover:text-black transition-all"
              style={{ 
                borderColor: '#00FFFF',
                color: '#00FFFF',
                boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
              }}
              disabled={uploading || analyzing}
            >
              <Camera className="w-5 h-5 inline mr-2" />
              CAPTURE
            </button>
            <label className="px-6 py-3 border-2 uppercase text-xl hover:bg-green-500 hover:text-black transition-all cursor-pointer inline-block">
              <Upload className="w-5 h-5 inline mr-2" />
              UPLOAD
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={uploading || analyzing}
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 border-4 border-cyber-secondary bg-cyber-dark p-4 flex items-center justify-between">
            <span className="text-cyber-secondary font-mono uppercase tracking-wider text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-cyber-secondary hover:text-cyber-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {(uploading || analyzing) && (
          <div className="mb-6 card-cyber border-4 border-cyber-accent">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-cyber-accent border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-cyber-primary border-t-transparent animate-spin" style={{ animationDirection: 'reverse' }}></div>
              </div>
              <div>
                <p className="font-mono font-bold text-cyber-accent uppercase tracking-wider">
                  {uploading ? 'UPLOADING IMAGE...' : 'ANALYZING WITH AI...'}
                </p>
                <p className="text-xs font-mono text-cyber-gray-light uppercase mt-1">
                  PROCESSING...
                </p>
              </div>
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="mb-6 card-cyber border-4 border-cyber-primary holographic">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-8 h-8 text-cyber-primary animate-pulse-neon" />
                <h3 className="text-2xl font-display font-bold text-neon uppercase tracking-wider">
                  ANALYSIS COMPLETE
                </h3>
              </div>
              <button onClick={() => setAnalysisResult(null)} className="text-cyber-gray-light hover:text-cyber-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-mono font-bold text-cyber-primary uppercase tracking-widest mb-4 text-sm">
                  DETECTED FOOD ITEMS
                </h4>
                <div className="space-y-2">
                  {analysisResult.food_items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border-2 border-cyber-gray-light bg-cyber-dark hover:border-cyber-primary transition-all">
                      <span className="font-mono font-bold text-cyber-primary uppercase">{item.name}</span>
                      <span className="text-xs font-mono text-cyber-gray-light">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-mono font-bold text-cyber-accent uppercase tracking-widest mb-4 text-sm">
                  NUTRITION DATA
                </h4>
                <div className="space-y-3">
                  <NutrientRow label="CALORIES" value={Math.round(analysisResult.total_calories)} unit="KCAL" color="cyber-primary" />
                  <NutrientRow label="PROTEIN" value={analysisResult.macronutrients?.protein?.toFixed(1)} unit="G" color="cyber-secondary" />
                  <NutrientRow label="CARBS" value={analysisResult.macronutrients?.carbs?.toFixed(1)} unit="G" color="cyber-accent" />
                  <NutrientRow label="FAT" value={analysisResult.macronutrients?.fat?.toFixed(1)} unit="G" color="cyber-primary" />
                </div>
                <div className="mt-4 pt-4 border-t-2 border-cyber-gray-light">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-cyber-gray-light uppercase">CONFIDENCE:</span>
                    <span className="text-cyber-primary font-bold">
                      {Math.round((analysisResult.confidence_score || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanned Product Result */}
        {scannedProduct && (
          <div className="mb-6 card-cyber border-4 border-cyber-secondary holographic">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-cyber-secondary animate-pulse-neon" />
                <h3 className="text-2xl font-display font-bold text-neon uppercase tracking-wider">
                  PRODUCT FOUND
                </h3>
              </div>
              <button onClick={() => setScannedProduct(null)} className="text-cyber-gray-light hover:text-cyber-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-mono font-bold text-cyber-secondary uppercase tracking-widest mb-4 text-sm">
                  PRODUCT INFO
                </h4>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-cyber-secondary bg-cyber-dark">
                    <p className="text-xs font-mono text-cyber-gray-light uppercase mb-1">NAME</p>
                    <p className="font-mono font-bold text-cyber-secondary text-lg">{scannedProduct.name}</p>
                  </div>
                  {scannedProduct.brand && (
                    <div className="p-3 border-2 border-cyber-gray-light bg-cyber-dark">
                      <p className="text-xs font-mono text-cyber-gray-light uppercase mb-1">BRAND</p>
                      <p className="font-mono text-cyber-primary">{scannedProduct.brand}</p>
                    </div>
                  )}
                  <div className="p-3 border-2 border-cyber-gray-light bg-cyber-dark">
                    <p className="text-xs font-mono text-cyber-gray-light uppercase mb-1">BARCODE</p>
                    <p className="font-mono text-cyber-primary">{scannedProduct.barcode}</p>
                  </div>
                  {scannedProduct.nutrition_grade && (
                    <div className="p-3 border-2 border-cyber-accent bg-cyber-dark">
                      <p className="text-xs font-mono text-cyber-gray-light uppercase mb-1">NUTRITION GRADE</p>
                      <p className="font-display font-bold text-cyber-accent text-xl">{scannedProduct.nutrition_grade}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-mono font-bold text-cyber-accent uppercase tracking-widest mb-4 text-sm">
                  NUTRITION (PER 100G)
                </h4>
                <div className="space-y-3">
                  <NutrientRow label="CALORIES" value={Math.round(scannedProduct.calories_per_100g || 0)} unit="KCAL" color="cyber-primary" />
                  <NutrientRow label="PROTEIN" value={scannedProduct.protein_per_100g?.toFixed(1)} unit="G" color="cyber-secondary" />
                  <NutrientRow label="CARBS" value={scannedProduct.carbs_per_100g?.toFixed(1)} unit="G" color="cyber-accent" />
                  <NutrientRow label="FAT" value={scannedProduct.fat_per_100g?.toFixed(1)} unit="G" color="cyber-primary" />
                  {scannedProduct.fiber_per_100g > 0 && (
                    <NutrientRow label="FIBER" value={scannedProduct.fiber_per_100g?.toFixed(1)} unit="G" color="cyber-secondary" />
                  )}
                  {scannedProduct.sugar_per_100g > 0 && (
                    <NutrientRow label="SUGAR" value={scannedProduct.sugar_per_100g?.toFixed(1)} unit="G" color="cyber-accent" />
                  )}
                </div>
                <div className="mt-4 pt-4 border-t-2 border-cyber-gray-light">
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    QUANTITY (GRAMS)
                  </label>
                  <input
                    type="number"
                    id="quantity-input"
                    defaultValue={scannedProduct.calories_per_serving ? null : 100}
                    placeholder={scannedProduct.serving_size || "100"}
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200 mb-4"
                    min="1"
                    step="1"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('quantity-input')
                      const quantity = input ? parseFloat(input.value) || 100 : 100
                      handleAddScannedProduct(quantity)
                    }}
                    className="btn-cyber w-full flex items-center justify-center space-x-2"
                    disabled={scanningProduct}
                  >
                    {scanningProduct ? (
                      <>
                        <div className="w-5 h-5 border-2 border-cyber-primary border-t-transparent animate-spin"></div>
                        <span>ADDING...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>ADD TO MEALS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Macro Statistics Dashboard */}
        {meals.length > 0 && (
          <MacroDashboard meals={meals} />
        )}

        {/* Meals List */}
        <div className="card-cyber card-cyber-green">
          <h2 className="text-3xl uppercase mb-6" style={{ color: '#00FF00' }}>
            MEAL HISTORY
          </h2>
          {meals.length === 0 ? (
            <div className="text-center py-12">
              <Utensils className="w-20 h-20 text-cyber-gray-light mx-auto mb-4 opacity-50" />
              <p className="text-cyber-gray-light font-mono uppercase mb-2">NO MEALS LOGGED</p>
              <p className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest">
                UPLOAD AN IMAGE TO BEGIN TRACKING
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meals.map((meal) => (
                <MealCard 
                  key={meal.id} 
                  meal={meal} 
                  onEdit={handleEditMeal}
                  onDelete={handleDeleteMeal}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <FoodRecognitionCamera
          onSuccess={handleFoodRecognitionSuccess}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Edit Meal Modal */}
      {editingMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="card-cyber border-4 border-cyber-secondary max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-cyber-secondary uppercase tracking-wider">
                EDIT MEAL
              </h2>
              <button
                onClick={() => setEditingMeal(null)}
                className="text-cyber-gray-light hover:text-cyber-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  MEAL NAME
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="Meal name"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  DESCRIPTION
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                  rows="3"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Description"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                  MEAL TYPE
                </label>
                <select
                  className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                  value={editFormData.meal_type}
                  onChange={(e) => setEditFormData({ ...editFormData, meal_type: e.target.value })}
                >
                  <option value="">SELECT TYPE</option>
                  <option value="breakfast">BREAKFAST</option>
                  <option value="lunch">LUNCH</option>
                  <option value="dinner">DINNER</option>
                  <option value="snack">SNACK</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    CALORIES
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                    value={editFormData.estimated_calories}
                    onChange={(e) => setEditFormData({ ...editFormData, estimated_calories: e.target.value })}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    PROTEIN (G)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                    value={editFormData.protein_grams}
                    onChange={(e) => setEditFormData({ ...editFormData, protein_grams: e.target.value })}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    CARBS (G)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                    value={editFormData.carbs_grams}
                    onChange={(e) => setEditFormData({ ...editFormData, carbs_grams: e.target.value })}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">
                    FAT (G)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-cyber-dark border-2 border-cyber-gray-light text-white font-mono focus:border-cyber-primary focus:outline-none focus:shadow-neon-green transition-all duration-200"
                    value={editFormData.fat_grams}
                    onChange={(e) => setEditFormData({ ...editFormData, fat_grams: e.target.value })}
                    placeholder="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-cyber flex-1 flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>SAVE CHANGES</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMeal(null)}
                  className="btn-cyber border-cyber-gray-light text-cyber-gray-light hover:border-cyber-secondary hover:text-cyber-secondary"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function NutrientRow({ label, value, unit, color }) {
  const colorClasses = {
    'cyber-primary': 'text-cyber-primary border-cyber-primary',
    'cyber-secondary': 'text-cyber-secondary border-cyber-secondary',
    'cyber-accent': 'text-cyber-accent border-cyber-accent',
  }

  return (
    <div className={`flex items-center justify-between p-3 border-2 ${colorClasses[color]} bg-cyber-dark`}>
      <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline space-x-2">
        <span className={`font-display font-black text-2xl ${colorClasses[color].split(' ')[0]}`}>
          {value}
        </span>
        <span className="text-xs font-mono text-cyber-gray-light uppercase">{unit}</span>
      </div>
    </div>
  )
}

function MacroDashboard({ meals }) {
  // Calculate totals and statistics
  const macroStats = useMemo(() => {
    const totals = meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.estimated_calories || 0),
      protein: acc.protein + (meal.protein_grams || 0),
      carbs: acc.carbs + (meal.carbs_grams || 0),
      fat: acc.fat + (meal.fat_grams || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

    const avgPerMeal = {
      calories: totals.calories / meals.length,
      protein: totals.protein / meals.length,
      carbs: totals.carbs / meals.length,
      fat: totals.fat / meals.length,
    }

    // Calculate macro percentages (protein and carbs are 4 cal/g, fat is 9 cal/g)
    const totalMacroCalories = (totals.protein * 4) + (totals.carbs * 4) + (totals.fat * 9)
    const macroPercentages = {
      protein: totalMacroCalories > 0 ? ((totals.protein * 4) / totalMacroCalories * 100) : 0,
      carbs: totalMacroCalories > 0 ? ((totals.carbs * 4) / totalMacroCalories * 100) : 0,
      fat: totalMacroCalories > 0 ? ((totals.fat * 9) / totalMacroCalories * 100) : 0,
    }

    // Prepare data for pie chart
    const pieData = [
      { name: 'Protein', value: totals.protein, calories: totals.protein * 4, color: '#00ff88' },
      { name: 'Carbs', value: totals.carbs, calories: totals.carbs * 4, color: '#ff00ff' },
      { name: 'Fat', value: totals.fat, calories: totals.fat * 9, color: '#00ffff' },
    ]

    // Prepare data for daily breakdown (group by date)
    const dailyData = meals.reduce((acc, meal) => {
      const date = new Date(meal.created_at).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = { date, protein: 0, carbs: 0, fat: 0, calories: 0 }
      }
      acc[date].protein += meal.protein_grams || 0
      acc[date].carbs += meal.carbs_grams || 0
      acc[date].fat += meal.fat_grams || 0
      acc[date].calories += meal.estimated_calories || 0
      return acc
    }, {})

    const dailyChartData = Object.values(dailyData).slice(-7).reverse() // Last 7 days

    return {
      totals,
      avgPerMeal,
      macroPercentages,
      pieData,
      dailyChartData,
    }
  }, [meals])

  const COLORS = ['#00ff88', '#ff00ff', '#00ffff']

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cyber-dark border-2 border-cyber-primary p-3 font-mono">
          <p className="text-cyber-primary uppercase text-sm mb-2">{payload[0].name}</p>
          <p className="text-cyber-secondary text-xs">
            Amount: <span className="text-cyber-primary font-bold">{payload[0].value?.toFixed(1)}g</span>
          </p>
          <p className="text-cyber-secondary text-xs">
            Calories: <span className="text-cyber-primary font-bold">{payload[0].payload.calories?.toFixed(0)} kcal</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="mb-6 space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-cyber border-4 border-cyber-primary">
          <div className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">TOTAL CALORIES</div>
          <div className="text-3xl font-display font-black text-cyber-primary">
            {Math.round(macroStats.totals.calories)}
          </div>
          <div className="text-xs font-mono text-cyber-gray-light mt-1">
            Avg: {Math.round(macroStats.avgPerMeal.calories)} per meal
          </div>
        </div>
        <div className="card-cyber border-4 border-cyber-secondary">
          <div className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">TOTAL PROTEIN</div>
          <div className="text-3xl font-display font-black text-cyber-secondary">
            {macroStats.totals.protein.toFixed(1)}<span className="text-lg">g</span>
          </div>
          <div className="text-xs font-mono text-cyber-gray-light mt-1">
            {macroStats.macroPercentages.protein.toFixed(1)}% of calories
          </div>
        </div>
        <div className="card-cyber border-4 border-cyber-accent">
          <div className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">TOTAL CARBS</div>
          <div className="text-3xl font-display font-black text-cyber-accent">
            {macroStats.totals.carbs.toFixed(1)}<span className="text-lg">g</span>
          </div>
          <div className="text-xs font-mono text-cyber-gray-light mt-1">
            {macroStats.macroPercentages.carbs.toFixed(1)}% of calories
          </div>
        </div>
        <div className="card-cyber border-4 border-cyber-primary">
          <div className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest mb-2">TOTAL FAT</div>
          <div className="text-3xl font-display font-black text-cyber-primary">
            {macroStats.totals.fat.toFixed(1)}<span className="text-lg">g</span>
          </div>
          <div className="text-xs font-mono text-cyber-gray-light mt-1">
            {macroStats.macroPercentages.fat.toFixed(1)}% of calories
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Macro Distribution Pie Chart */}
        <div className="card-cyber border-4 border-cyber-secondary">
          <h3 className="text-xl font-display font-bold text-cyber-secondary uppercase mb-6 tracking-wider">
            MACRO DISTRIBUTION
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={macroStats.pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {macroStats.pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t-2 border-cyber-gray-light">
            {macroStats.pieData.map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-xs font-mono text-cyber-gray-light uppercase mb-1">{item.name}</div>
                <div className="text-lg font-display font-bold" style={{ color: COLORS[index] }}>
                  {item.value.toFixed(1)}g
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Macro Breakdown Bar Chart */}
        <div className="card-cyber border-4 border-cyber-accent">
          <h3 className="text-xl font-display font-bold text-cyber-accent uppercase mb-6 tracking-wider">
            DAILY MACRO BREAKDOWN
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={macroStats.dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis 
                dataKey="date" 
                stroke="#888888"
                style={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
              <YAxis 
                stroke="#888888"
                style={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0f', 
                  border: '2px solid #00ff88',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
              <Bar dataKey="protein" fill="#00ff88" name="Protein (g)" />
              <Bar dataKey="carbs" fill="#ff00ff" name="Carbs (g)" />
              <Bar dataKey="fat" fill="#00ffff" name="Fat (g)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macro Ratio Line Chart */}
      {macroStats.dailyChartData.length > 0 && (
        <div className="card-cyber border-4 border-cyber-primary">
          <h3 className="text-xl font-display font-bold text-cyber-primary uppercase mb-6 tracking-wider">
            CALORIE TREND
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={macroStats.dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis 
                dataKey="date" 
                stroke="#888888"
                style={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
              <YAxis 
                stroke="#888888"
                style={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0a0f', 
                  border: '2px solid #00ff88',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="#00ff88" 
                strokeWidth={3}
                name="Calories"
                dot={{ fill: '#00ff88', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function MealCard({ meal, onEdit, onDelete }) {
  return (
    <div className="border-4 border-cyber-gray-light bg-cyber-dark p-6 hover:border-cyber-primary transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4 flex-1">
          <div className="w-16 h-16 border-4 border-cyber-primary flex items-center justify-center group-hover:shadow-neon-green transition-all">
            <Utensils className="w-8 h-8 text-cyber-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-cyber-primary text-xl uppercase mb-1">
              {meal.name || 'UNNAMED MEAL'}
            </h3>
            <p className="text-xs font-mono text-cyber-gray-light uppercase tracking-widest">
              {new Date(meal.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {meal.confidence_score && (
            <div className="px-4 py-2 border-2 border-cyber-primary bg-cyber-dark">
              <span className="text-xs font-mono font-bold text-cyber-primary uppercase">
                {Math.round(meal.confidence_score * 100)}% CONF
              </span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onEdit) {
                onEdit(meal)
              }
            }}
            className="p-2 border-2 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-cyber-darker transition-all"
            title="Edit meal"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation()
              if (onDelete) {
                await onDelete(meal.id)
              }
            }}
            className="p-2 border-2 border-cyber-accent text-cyber-accent hover:bg-cyber-accent hover:text-cyber-darker transition-all"
            title="Delete meal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t-2 border-cyber-gray-light">
        <div>
          <div className="text-xs font-mono text-cyber-gray-light uppercase mb-1">CALORIES</div>
          <div className="text-lg font-display font-bold text-cyber-primary">
            {Math.round(meal.estimated_calories || 0)}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-cyber-gray-light uppercase mb-1">PROTEIN</div>
          <div className="text-lg font-mono font-bold text-cyber-secondary">
            {meal.protein_grams?.toFixed(1) || 0}G
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-cyber-gray-light uppercase mb-1">CARBS</div>
          <div className="text-lg font-mono font-bold text-cyber-accent">
            {meal.carbs_grams?.toFixed(1) || 0}G
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-cyber-gray-light uppercase mb-1">FAT</div>
          <div className="text-lg font-mono font-bold text-cyber-primary">
            {meal.fat_grams?.toFixed(1) || 0}G
          </div>
        </div>
      </div>
    </div>
  )
}