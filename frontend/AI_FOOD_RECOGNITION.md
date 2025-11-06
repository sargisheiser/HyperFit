# AI Food Recognition with OpenAI Vision API

## Overview

The HyperFit app now includes advanced AI-powered food recognition using OpenAI's GPT-4 Vision API. This feature allows users to capture food images using their device camera and automatically analyze the nutritional content.

## Features

### 🎯 Real-Time Camera Capture
- Live camera preview with overlay guides
- High-quality image capture (1920x1080)
- Automatic camera initialization
- Back camera preferred on mobile devices

### 🤖 AI Analysis
- Powered by OpenAI GPT-4 Vision API
- Automatic food item detection
- Nutritional breakdown (calories, protein, carbs, fat, fiber, sugar)
- Meal type and cuisine identification
- Confidence scoring

### 📊 Results Display
- Visual breakdown of detected food items
- Macro nutrient display
- Automatic meal saving
- Real-time feedback during analysis

## Component: `FoodRecognitionCamera`

### Usage

```jsx
import FoodRecognitionCamera from '../components/FoodRecognitionCamera'

function MealsPage() {
  const handleSuccess = (result) => {
    // Meal is automatically saved
    console.log('Analysis result:', result)
    // Refresh meal list
  }

  return (
    <FoodRecognitionCamera
      onSuccess={handleSuccess}
      onClose={() => setShowCamera(false)}
    />
  )
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSuccess` | `Function` | Yes | Callback when meal is successfully analyzed. Receives analysis result object. |
| `onClose` | `Function` | Yes | Callback to close the camera modal |

### Analysis Result Structure

```javascript
{
  meal_id: 123,
  analysis: {
    food_items: [
      {
        name: "Grilled Chicken Breast",
        quantity: "150g",
        confidence: 0.95
      },
      {
        name: "Brown Rice",
        quantity: "100g",
        confidence: 0.88
      }
    ],
    total_calories: 450.5,
    macronutrients: {
      protein_grams: 45.2,
      carbs_grams: 35.8,
      fat_grams: 12.5,
      fiber_grams: 3.2,
      sugar_grams: 2.1
    },
    confidence_score: 0.91,
    analysis_details: {
      meal_type: "lunch",
      cuisine: "american",
      cooking_method: "grilled",
      notes: "Well-balanced meal with lean protein and complex carbs"
    },
    model_used: "gpt-4o-mini",
    processing_time_seconds: 2.3
  },
  nutrition: {
    estimated_calories: 450.5,
    protein_grams: 45.2,
    carbs_grams: 35.8,
    fat_grams: 12.5,
    fiber_grams: 3.2,
    sugar_grams: 2.1
  }
}
```

## User Flow

1. **Capture**: User clicks "CAPTURE" button on Meals page
2. **Camera Opens**: Real-time camera preview with overlay guides
3. **Capture Photo**: User positions food and captures image
4. **Preview**: User reviews captured image
5. **Analyze**: User clicks "ANALYZE WITH AI" button
6. **Processing**: OpenAI Vision API analyzes the image
7. **Results**: Analysis results displayed with nutritional breakdown
8. **Auto-Save**: Meal is automatically saved to database
9. **Auto-Close**: Modal closes after 3 seconds

## Backend Integration

### Endpoint

**POST** `/api/meals/upload-and-analyze`

Uploads an image and analyzes it in one step using OpenAI Vision API.

**Request:**
- `Content-Type: multipart/form-data`
- `file`: Image file (jpg, jpeg, png, webp)

**Response:**
- `MealAnalysisResponse` with analysis results and meal ID

### OpenAI Vision API

The backend uses the `ai_modules.food_recognition.openai_service` module which:
- Resizes images if needed (max 1024px)
- Sends image to GPT-4 Vision API
- Parses JSON response with structured nutrition data
- Handles errors and provides fallback results

### Configuration

Ensure your `.env` file has:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

## Error Handling

The component handles various error scenarios:

1. **Camera Access Denied**: Shows error message with instructions
2. **API Errors**: Displays user-friendly error messages
3. **Network Issues**: Shows connection error
4. **Invalid Images**: Validates file type before upload

## Styling

The component uses the cyberpunk theme:
- **Primary Color**: Cyan (#00FFFF) for borders and highlights
- **Success Color**: Green (#00FF88) for success states
- **Error Color**: Red (#FF007F) for errors
- **Font**: Orbitron for headers, VT323 for body text

## Performance

- High-quality image capture (0.95 JPEG quality)
- Optimized image upload
- Efficient canvas rendering
- Automatic cleanup of blob URLs

## Future Enhancements

1. **Batch Analysis**: Analyze multiple meals in one session
2. **Meal Suggestions**: AI-powered meal recommendations
3. **Portion Size Estimation**: More accurate portion detection
4. **Allergen Detection**: Identify allergens in food
5. **Dietary Preferences**: Consider user's dietary restrictions
6. **Offline Mode**: Cache analysis results for offline viewing

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure HTTPS (required for camera access)
- Try different browser
- Check if camera is available

### Analysis Failing
- Check OpenAI API key in backend `.env`
- Verify image file size (max 10MB)
- Check backend logs for errors
- Ensure OpenAI API has available credits

### Slow Analysis
- Large images may take longer
- Network latency affects response time
- Consider reducing image quality if needed

## Support

For issues or questions:
1. Check backend logs: `tail -f backend.log`
2. Verify API keys are set correctly
3. Check browser console for frontend errors
4. Review OpenAI API status and usage


