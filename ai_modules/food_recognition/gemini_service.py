"""
Google Gemini Food Recognition Service
Uses Gemini Vision API to analyze food images and extract nutrition information.
"""
import contextlib
import json
import logging
import time
from pathlib import Path
from typing import Any

from backend.core.config import settings
from google import genai
from PIL import Image

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
        user_context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
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

                # System instruction (passed via config, not contents)
                system_prompt = """Du bist ein Ernährungsexperte. Analysiere Essensbilder und liefere Nährwertinformationen als JSON.

Antworte NUR mit validem JSON in dieser Struktur:
{"food_items":[{"name":"deutsch","quantity":"150g","confidence":0.9}],"total_calories":0,"macronutrients":{"protein_grams":0,"carbs_grams":0,"fat_grams":0},"confidence_score":0.9}

Sei präzise bei Kalorien und Makros."""

                user_prompt = f"""Analysiere dieses Essensbild.{context_prompt}"""

                # Call Gemini API
                logger.info(f"Calling Gemini {self.model_name} for food analysis")

                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[user_prompt, image],
                    config={
                        "system_instruction": system_prompt,
                        "temperature": 0.3,
                        "max_output_tokens": 2048,
                        "response_mime_type": "application/json",
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
                                    except Exception:
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

                import re as _re

                def _fix_json(text: str) -> str:
                    """Fix common LLM JSON issues: trailing commas, truncated output."""
                    # Remove trailing commas before } or ]
                    text = _re.sub(r',\s*([}\]])', r'\1', text)
                    return text

                def _repair_truncated_json(text: str) -> str:
                    """Attempt to repair truncated JSON by closing open structures."""
                    text = _fix_json(text)
                    # If it already parses, return as-is
                    try:
                        json.loads(text)
                        return text
                    except json.JSONDecodeError:
                        pass

                    # Close unterminated string
                    in_string = False
                    escaped = False
                    for ch in text:
                        if escaped:
                            escaped = False
                            continue
                        if ch == '\\':
                            escaped = True
                            continue
                        if ch == '"':
                            in_string = not in_string
                    if in_string:
                        text += '"'

                    # Remove trailing incomplete key-value (e.g. `"key": "incompl`)
                    # by trimming back to the last comma or opening bracket
                    text = _re.sub(r',\s*"[^"]*"\s*:\s*"[^"]*$', '', text)
                    text = _fix_json(text)

                    # Count and close open brackets
                    opens = 0
                    open_arrays = 0
                    for ch in text:
                        if ch == '{':
                            opens += 1
                        elif ch == '}':
                            opens -= 1
                        elif ch == '[':
                            open_arrays += 1
                        elif ch == ']':
                            open_arrays -= 1
                    text += ']' * max(open_arrays, 0)
                    text += '}' * max(opens, 0)
                    return text

                logger.debug(f"Gemini raw response ({len(response_text)} chars): {response_text[:500]}")

                analysis_result = None
                # Attempt 1: Direct parse with trailing comma fix
                try:
                    analysis_result = json.loads(_fix_json(response_text))
                except json.JSONDecodeError as e:
                    logger.warning(f"Direct JSON parse failed: {e}")

                # Attempt 2: Extract JSON object and fix
                if analysis_result is None:
                    json_match = _re.search(r'\{.*\}', response_text, _re.DOTALL)
                    if json_match:
                        with contextlib.suppress(json.JSONDecodeError):
                            analysis_result = json.loads(_fix_json(json_match.group()))

                # Attempt 3: Repair truncated JSON
                if analysis_result is None:
                    try:
                        repaired = _repair_truncated_json(response_text)
                        analysis_result = json.loads(repaired)
                        logger.info("Parsed Gemini response after JSON repair")
                    except json.JSONDecodeError:
                        pass

                if analysis_result is None:
                    logger.error(f"All JSON parse attempts failed. Raw response: {response_text}")
                    raise ValueError(f"Could not parse JSON from Gemini response: {response_text[:200]}")

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

    def validate_analysis_result(self, result: dict[str, Any]) -> bool:
        """Validate that the analysis result has the required structure."""
        required_keys = ["food_items", "total_calories", "macronutrients", "confidence_score"]

        if not all(key in result for key in required_keys):
            return False

        if not isinstance(result["food_items"], list):
            return False

        if not isinstance(result["macronutrients"], dict):
            return False

        required_macros = ["protein_grams", "carbs_grams", "fat_grams"]
        return all(key in result["macronutrients"] for key in required_macros)

# Global service instance
_gemini_food_service: GeminiFoodRecognitionService | None = None

def get_food_recognition_service() -> GeminiFoodRecognitionService:
    """Get or create the Gemini food recognition service instance."""
    global _gemini_food_service
    if _gemini_food_service is None:
        _gemini_food_service = GeminiFoodRecognitionService()
    return _gemini_food_service

