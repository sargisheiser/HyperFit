"""
Google Gemini Food Recognition Service
Uses Gemini Vision API to analyze food images and extract nutrition information.
"""
import base64
import json
import time
from typing import Dict, List, Optional, Any
from pathlib import Path
import logging

from google import genai
from PIL import Image
import io

from backend.core.config import settings

logger = logging.getLogger(__name__)

class GeminiFoodRecognitionService:
    """Service for analyzing food images using Google Gemini Vision."""

    def __init__(self):
        """Initialize the Gemini client."""
        if not settings.gemini_api_key:
            raise ValueError("Gemini API key not configured. Set GEMINI_API_KEY in .env")

        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model_name = settings.gemini_model
    
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
                # Load image
                image = Image.open(processed_image_path)
                
                # Build user context prompt (German)
                context_prompt = ""
                if user_context:
                    if user_context.get("dietary_preferences"):
                        context_prompt += f"\nErnährungspräferenzen: {user_context['dietary_preferences']}"
                    if user_context.get("allergies"):
                        context_prompt += f"\nAllergien: {user_context['allergies']}"
                    if user_context.get("fitness_goals"):
                        context_prompt += f"\nFitness-Ziele: {user_context['fitness_goals']}"

                # Create the prompt for structured output (German food names, English JSON keys)
                system_prompt = """Du bist ein Ernährungsexperte. Analysiere das Bild und liefere Nährwertinformationen.

Gib NUR valides JSON zurück mit dieser Struktur:
{
  "food_items": [
    {
      "name": "Lebensmittel auf Deutsch",
      "quantity": "Geschätzte Menge (z.B. '150g', '1 Portion')",
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
    "meal_type": "Frühstück/Mittagessen/Abendessen/Snack",
    "cuisine": "Küche",
    "cooking_method": "Zubereitungsart",
    "notes": "Beobachtungen auf Deutsch"
  }
}

Sei präzise bei Kalorien und Makros. NUR JSON, kein Markdown."""

                user_prompt = f"""Analysiere dieses Essensbild.{context_prompt}

Gib Nährwertdaten im JSON-Format zurück. NUR valides JSON."""
                
                # Call Gemini API
                logger.info(f"Calling Gemini {self.model_name} for food analysis")

                # Pass image directly as PIL Image object (Gemini API accepts this format)
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[system_prompt, user_prompt, image],
                    config={
                        "temperature": 0.3,
                        "max_output_tokens": 1000,
                    }
                )
                
                # Parse response - handle multi-part responses
                # When images are included, response.text throws an error, so we extract from parts
                response_text = None
                
                # Method 1: Extract from response.parts (direct access - most reliable)
                try:
                    if hasattr(response, 'parts') and response.parts and len(response.parts) > 0:
                        parts = []
                        for part in response.parts:
                            if hasattr(part, 'text'):
                                text_value = part.text
                                if text_value and text_value.strip():
                                    parts.append(str(text_value).strip())
                        if parts:
                            response_text = ' '.join(parts)
                            logger.debug(f"Extracted {len(response_text)} chars from response.parts")
                except Exception as e:
                    logger.warning(f"Error extracting from response.parts: {e}")
                
                # Method 2: Extract from candidates[].content.parts[] (fallback)
                # This is the primary method when images are included
                if not response_text:
                    try:
                        if hasattr(response, 'candidates') and response.candidates:
                            parts = []
                            # Iterate candidates directly (protobuf repeated field)
                            for candidate in response.candidates:
                                # Check if candidate was blocked
                                if hasattr(candidate, 'finish_reason'):
                                    finish_reason = candidate.finish_reason
                                    if finish_reason and finish_reason != 1:  # 1 = STOP (success)
                                        logger.warning(f"Candidate finish reason: {finish_reason} (not STOP)")
                                        if hasattr(candidate, 'safety_ratings'):
                                            logger.warning(f"Safety ratings: {candidate.safety_ratings}")
                                
                                if hasattr(candidate, 'content'):
                                    content = candidate.content
                                    if hasattr(content, 'parts'):
                                        # Iterate parts directly (protobuf repeated field)
                                        # Don't check length, just iterate
                                        part_count = 0
                                        for part in content.parts:
                                            part_count += 1
                                            if hasattr(part, 'text'):
                                                text_value = part.text
                                                if text_value and text_value.strip():
                                                    parts.append(str(text_value).strip())
                                            else:
                                                logger.debug(f"Part {part_count} has no text attribute")
                                        logger.debug(f"Iterated {part_count} parts from candidate")
                            if parts:
                                response_text = ' '.join(parts)
                                logger.debug(f"Extracted {len(response_text)} chars from candidates")
                            else:
                                logger.warning("No text parts found in candidates after iteration")
                    except Exception as e:
                        logger.warning(f"Error extracting from candidates: {e}", exc_info=True)
                
                # Method 3: Try the text property (only works for simple text-only responses)
                if not response_text:
                    try:
                        response_text = response.text
                        logger.debug("Extracted text using response.text property")
                    except Exception as e:
                        logger.debug(f"Direct text access failed (expected for image responses): {e}")
                
                if not response_text:
                    # Enhanced error logging
                    logger.error("=" * 50)
                    logger.error("FAILED TO EXTRACT TEXT FROM GEMINI RESPONSE")
                    logger.error(f"Response type: {type(response)}")
                    logger.error(f"Has parts: {hasattr(response, 'parts')}")
                    if hasattr(response, 'parts'):
                        logger.error(f"Parts count: {len(response.parts) if response.parts else 0}")
                        if response.parts:
                            for i, part in enumerate(response.parts):
                                logger.error(f"  Part {i}: type={type(part)}")
                                logger.error(f"  Part {i} has text attr: {hasattr(part, 'text')}")
                                if hasattr(part, 'text'):
                                    try:
                                        logger.error(f"  Part {i} text value: {repr(part.text)}")
                                    except:
                                        logger.error(f"  Part {i} text access failed")
                                logger.error(f"  Part {i} attributes: {[a for a in dir(part) if not a.startswith('_') and not callable(getattr(part, a, None))][:10]}")
                    logger.error(f"Has candidates: {hasattr(response, 'candidates')}")
                    if hasattr(response, 'candidates') and response.candidates:
                        logger.error(f"Candidates count: {len(response.candidates)}")
                        for i, candidate in enumerate(response.candidates):
                            logger.error(f"  Candidate {i}: type={type(candidate)}")
                            if hasattr(candidate, 'content'):
                                logger.error(f"  Candidate {i} has content: {type(candidate.content)}")
                                if hasattr(candidate.content, 'parts'):
                                    logger.error(f"  Candidate {i} content parts count: {len(candidate.content.parts) if candidate.content.parts else 0}")
                    logger.error("=" * 50)
                    raise ValueError("Could not extract text from Gemini response. Check logs above for detailed response structure.")
                
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
                        raise ValueError("Could not parse JSON from Gemini response")
                
                # Calculate processing time
                processing_time = time.time() - start_time
                
                # Add metadata
                analysis_result["processing_time_seconds"] = round(processing_time, 2)
                analysis_result["model_used"] = self.model_name
                analysis_result["tokens_used"] = None  # Gemini doesn't always provide token usage
                
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
_gemini_food_service: Optional[GeminiFoodRecognitionService] = None

def get_food_recognition_service() -> GeminiFoodRecognitionService:
    """Get or create the Gemini food recognition service instance."""
    global _gemini_food_service
    if _gemini_food_service is None:
        _gemini_food_service = GeminiFoodRecognitionService()
    return _gemini_food_service

