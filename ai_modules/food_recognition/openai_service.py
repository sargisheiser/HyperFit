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

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanations. Just the raw JSON object.

Return a JSON object with this exact structure (use numbers, not strings for numeric values):
{
  "food_items": [
    {
      "name": "Food item name",
      "quantity": "Estimated quantity (e.g., '150g', '1 cup', '2 pieces')",
      "confidence": 0.8
    }
  ],
  "total_calories": 250.5,
  "macronutrients": {
    "protein_grams": 20.0,
    "carbs_grams": 30.0,
    "fat_grams": 10.0,
    "fiber_grams": 5.0,
    "sugar_grams": 8.0
  },
  "confidence_score": 0.85,
  "analysis_details": {
    "meal_type": "breakfast",
    "cuisine": "type of cuisine",
    "cooking_method": "grilled",
    "notes": "any additional observations"
  }
}

Be accurate with calorie and macro estimates. Consider portion sizes visible in the image. Ensure all JSON syntax is correct - no trailing commas, proper quotes, etc."""
                
                user_prompt = f"""Analyze this food image and provide detailed nutrition information.{context_prompt}

Provide all nutrition data in the JSON format specified. Be precise with your estimates. Return ONLY valid JSON - no markdown formatting, no code blocks, no explanations before or after the JSON. The response must be a valid JSON object that can be parsed directly."""
                
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
                    max_tokens=1500,
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )
                
                # Parse response
                response_text = response.choices[0].message.content
                logger.debug(f"OpenAI raw response (first 500 chars): {response_text[:500]}")
                
                # Try to extract JSON from response
                # Sometimes the response includes markdown code blocks
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()
                
                # Clean up the response text
                response_text = response_text.strip()
                
                # Parse JSON with better error handling
                analysis_result = None
                json_errors = []
                
                # Try direct parsing first
                try:
                    analysis_result = json.loads(response_text)
                except json.JSONDecodeError as e:
                    json_errors.append(f"Direct parse failed: {str(e)}")
                    logger.debug(f"Direct JSON parse failed: {e}")
                    
                    # Try to extract JSON object using regex (more robust)
                    import re
                    # Match JSON object with balanced braces (handles nested objects)
                    def find_json_objects(text):
                        """Find JSON objects with balanced braces."""
                        matches = []
                        depth = 0
                        start = -1
                        for i, char in enumerate(text):
                            if char == '{':
                                if depth == 0:
                                    start = i
                                depth += 1
                            elif char == '}':
                                depth -= 1
                                if depth == 0 and start != -1:
                                    matches.append(text[start:i+1])
                                    start = -1
                        return matches
                    
                    json_matches = find_json_objects(response_text)
                    
                    if json_matches:
                        # Try each match, starting with the longest
                        json_matches.sort(key=len, reverse=True)
                        for match in json_matches:
                            try:
                                # Clean up the match (remove trailing commas, etc.)
                                cleaned = match.strip()
                                # Remove trailing commas before closing braces/brackets
                                cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)
                                analysis_result = json.loads(cleaned)
                                logger.debug(f"Successfully parsed JSON from regex match")
                                break
                            except json.JSONDecodeError as e2:
                                json_errors.append(f"Regex match failed: {str(e2)}")
                                continue
                    
                    # If still no success, try to find and fix common JSON issues
                    if not analysis_result:
                        try:
                            # Try to fix trailing commas
                            fixed_text = re.sub(r',\s*}', '}', response_text)
                            fixed_text = re.sub(r',\s*]', ']', fixed_text)
                            analysis_result = json.loads(fixed_text)
                            logger.debug(f"Successfully parsed JSON after fixing trailing commas")
                        except json.JSONDecodeError as e3:
                            json_errors.append(f"Trailing comma fix failed: {str(e3)}")
                            # Try more aggressive fixes
                            try:
                                # Fix missing commas between properties
                                # Pattern: }" or ]" or number" or true" or false" or null" followed by "
                                fixed_text = re.sub(r'("\s*")(?=\s*")', r'\1,', response_text)
                                # Fix missing commas: } followed by " (new property)
                                fixed_text = re.sub(r'}\s*"', r'}, "', fixed_text)
                                # Fix missing commas: ] followed by " (new property)
                                fixed_text = re.sub(r']\s*"', r'], "', fixed_text)
                                # Remove trailing commas again
                                fixed_text = re.sub(r',\s*}', '}', fixed_text)
                                fixed_text = re.sub(r',\s*]', ']', fixed_text)
                                analysis_result = json.loads(fixed_text)
                                logger.debug(f"Successfully parsed JSON after aggressive fixes")
                            except json.JSONDecodeError as e4:
                                json_errors.append(f"Aggressive fix failed: {str(e4)}")
                                # Last resort: try to extract and fix the JSON manually
                                try:
                                    # Find the JSON object again after fixes
                                    fixed_matches = find_json_objects(fixed_text)
                                    if fixed_matches:
                                        # Try to fix common issues in the largest match
                                        largest_match = max(fixed_matches, key=len)
                                        # Remove all trailing commas
                                        cleaned_match = re.sub(r',(\s*[}\]])', r'\1', largest_match)
                                        # Add missing commas between properties
                                        cleaned_match = re.sub(r'}\s*"', r'}, "', cleaned_match)
                                        cleaned_match = re.sub(r']\s*"', r'], "', cleaned_match)
                                        analysis_result = json.loads(cleaned_match)
                                        logger.debug(f"Successfully parsed JSON after manual fixes")
                                except json.JSONDecodeError:
                                    pass
                
                if not analysis_result:
                    # Log the full response for debugging
                    logger.error("=" * 80)
                    logger.error("FAILED TO PARSE JSON FROM OPENAI RESPONSE")
                    logger.error(f"Response length: {len(response_text)} chars")
                    logger.error(f"Response text (first 2000 chars):\n{response_text[:2000]}")
                    if len(response_text) > 2000:
                        logger.error(f"Response text (last 500 chars):\n{response_text[-500:]}")
                    logger.error(f"JSON errors encountered: {json_errors}")
                    logger.error("=" * 80)
                    
                    # Try to create a fallback response with basic structure
                    logger.warning("Attempting to create fallback analysis result")
                    try:
                        # Extract any useful information we can find
                        food_items = []
                        if '"food_items"' in response_text or '"foodItems"' in response_text:
                            # Try to extract food items list
                            items_match = re.search(r'"food_items?"\s*:\s*\[(.*?)\]', response_text, re.DOTALL)
                            if items_match:
                                # Try to extract individual items
                                items_text = items_match.group(1)
                                name_matches = re.findall(r'"name"\s*:\s*"([^"]+)"', items_text)
                                for name in name_matches:
                                    food_items.append({"name": name, "quantity": "unknown", "confidence": 0.5})
                        
                        # Create a basic fallback structure
                        analysis_result = {
                            "food_items": food_items if food_items else [{"name": "Unknown food", "quantity": "unknown", "confidence": 0.3}],
                            "total_calories": 0.0,
                            "macronutrients": {
                                "protein_grams": 0.0,
                                "carbs_grams": 0.0,
                                "fat_grams": 0.0,
                                "fiber_grams": 0.0,
                                "sugar_grams": 0.0
                            },
                            "confidence_score": 0.3,
                            "analysis_details": {
                                "meal_type": "unknown",
                                "cuisine": "unknown",
                                "cooking_method": "unknown",
                                "notes": "JSON parsing failed. Please check the raw response in logs."
                            },
                            "parsing_error": True,
                            "raw_response_preview": response_text[:500]
                        }
                        logger.warning("Created fallback analysis result due to JSON parsing failure")
                    except Exception as fallback_error:
                        logger.error(f"Failed to create fallback: {fallback_error}")
                        raise ValueError(f"Could not parse JSON from OpenAI response. Last error: {json_errors[-1] if json_errors else 'Unknown error'}")
                
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
