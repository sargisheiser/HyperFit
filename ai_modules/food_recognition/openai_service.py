"""
OpenAI Food Recognition Service
Uses GPT-4 Vision to analyze food images and extract nutrition information.
"""

import base64
import json
import time
from typing import Dict, List, Optional, Any
from pathlib import Path
import logging

from openai import OpenAI
from PIL import Image
import io

from backend.core.config import settings

logger = logging.getLogger(__name__)

class FoodRecognitionService:
    """Service for analyzing food images using OpenAI GPT-4 Vision."""
    
    def __init__(self):
        """Initialize the OpenAI client."""
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY in .env")
        
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
    
    def _encode_image(self, image_path: str) -> str:
        """Encode image to base64 string."""
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Error encoding image {image_path}: {e}")
            raise
    
    def _resize_image_if_needed(self, image_path: str) -> str:
        """Resize image if it exceeds maximum dimensions."""
        try:
            with Image.open(image_path) as img:
                max_dim = settings.max_image_dimension
                if img.width > max_dim or img.height > max_dim:
                    # Calculate new size maintaining aspect ratio
                    ratio = min(max_dim / img.width, max_dim / img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                    
                    # Save resized image temporarily
                    temp_path = image_path.replace('.', '_resized.')
                    img.save(temp_path, format=img.format or 'JPEG')
                    return temp_path
            return image_path
        except Exception as e:
            logger.warning(f"Error resizing image: {e}, using original")
            return image_path
    
    def _get_image_mime_type(self, image_path: str) -> str:
        """Get MIME type from image extension."""
        ext = Path(image_path).suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif'
        }
        return mime_types.get(ext, 'image/jpeg')
    
    async def analyze_food_image(
        self,
        image_path: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a food image and extract nutrition information.
        
        Args:
            image_path: Path to the food image
            user_context: Optional user context (dietary preferences, goals, etc.)
        
        Returns:
            Dictionary with food items, nutrition data, and analysis details
        """
        start_time = time.time()
        
        try:
            # Resize image if needed
            processed_image_path = self._resize_image_if_needed(image_path)
            is_temp = processed_image_path != image_path
            
            try:
                # Encode image
                base64_image = self._encode_image(processed_image_path)
                mime_type = self._get_image_mime_type(processed_image_path)
                
                # Build user context prompt
                context_prompt = ""
                if user_context:
                    if user_context.get("dietary_preferences"):
                        context_prompt += f"\nDietary preferences: {user_context['dietary_preferences']}"
                    if user_context.get("allergies"):
                        context_prompt += f"\nAllergies to avoid: {user_context['allergies']}"
                    if user_context.get("fitness_goals"):
                        context_prompt += f"\nFitness goals: {user_context['fitness_goals']}"
                
                # Create the prompt for structured output
                system_prompt = """You are a nutrition analysis expert. Analyze the food image and provide detailed nutrition information.

Return a JSON object with this exact structure:
{
  "food_items": [
    {
      "name": "Food item name",
      "quantity": "Estimated quantity (e.g., '150g', '1 cup', '2 pieces')",
      "confidence": 0.0-1.0
    }
  ],
  "total_calories": 0.0,
  "macronutrients": {
    "protein_grams": 0.0,
    "carbs_grams": 0.0,
    "fat_grams": 0.0,
    "fiber_grams": 0.0,
    "sugar_grams": 0.0
  },
  "confidence_score": 0.0-1.0,
  "analysis_details": {
    "meal_type": "breakfast/lunch/dinner/snack",
    "cuisine": "type of cuisine",
    "cooking_method": "grilled/steamed/fried/etc",
    "notes": "any additional observations"
  }
}

Be accurate with calorie and macro estimates. Consider portion sizes visible in the image."""
                
                user_prompt = f"""Analyze this food image and provide detailed nutrition information.{context_prompt}

Provide all nutrition data in the JSON format specified. Be precise with your estimates."""
                
                # Call OpenAI API
                logger.info(f"Calling OpenAI {self.model} for food analysis")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": user_prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=1000,
                    temperature=0.3
                )
                
                # Parse response
                response_text = response.choices[0].message.content
                
                # Try to extract JSON from response
                # Sometimes the response includes markdown code blocks
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()
                
                # Parse JSON
                try:
                    analysis_result = json.loads(response_text)
                except json.JSONDecodeError:
                    # If JSON parsing fails, try to extract just the JSON part
                    import re
                    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if json_match:
                        analysis_result = json.loads(json_match.group())
                    else:
                        raise ValueError("Could not parse JSON from OpenAI response")
                
                # Calculate processing time
                processing_time = time.time() - start_time
                
                # Add metadata
                analysis_result["processing_time_seconds"] = round(processing_time, 2)
                analysis_result["model_used"] = self.model
                analysis_result["tokens_used"] = response.usage.total_tokens if hasattr(response, 'usage') else None
                
                logger.info(f"Food analysis completed in {processing_time:.2f}s")
                
                return analysis_result
                
            finally:
                # Clean up temporary resized image if created
                if is_temp and Path(processed_image_path).exists():
                    Path(processed_image_path).unlink()
                    logger.debug(f"Cleaned up temporary image: {processed_image_path}")
        
        except Exception as e:
            logger.error(f"Error analyzing food image: {e}", exc_info=True)
            raise
    
    def validate_analysis_result(self, result: Dict[str, Any]) -> bool:
        """Validate that the analysis result has the required structure."""
        required_keys = ["food_items", "total_calories", "macronutrients", "confidence_score"]
        
        if not all(key in result for key in required_keys):
            return False
        
        if not isinstance(result["food_items"], list):
            return False
        
        if not isinstance(result["macronutrients"], dict):
            return False
        
        required_macros = ["protein_grams", "carbs_grams", "fat_grams"]
        if not all(key in result["macronutrients"] for key in required_macros):
            return False
        
        return True

# Global service instance
_food_recognition_service: Optional[FoodRecognitionService] = None

def get_food_recognition_service() -> FoodRecognitionService:
    """Get or create the food recognition service instance."""
    global _food_recognition_service
    if _food_recognition_service is None:
        _food_recognition_service = FoodRecognitionService()
    return _food_recognition_service
