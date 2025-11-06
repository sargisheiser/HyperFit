"""
Product Service - German product database integration via Open Food Facts
"""

import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class ProductService:
    """Service for looking up products using Open Food Facts API."""
    
    BASE_URL = "https://world.openfoodfacts.org/api/v0"
    
    @staticmethod
    async def lookup_product_by_barcode(barcode: str) -> Optional[Dict[str, Any]]:
        """
        Look up a product by barcode using Open Food Facts API.
        
        Args:
            barcode: Product barcode (EAN-13, UPC, etc.)
        
        Returns:
            Product data dictionary or None if not found
        """
        try:
            url = f"{ProductService.BASE_URL}/product/{barcode}.json"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("status") == 1 and data.get("product"):
                        product = data["product"]
                        
                        # Extract nutrition information (prioritize German data)
                        nutriments = product.get("nutriments", {})
                        
                        # Get product name (prefer German, fallback to English)
                        product_name = (
                            product.get("product_name_de") or
                            product.get("product_name") or
                            product.get("product_name_en") or
                            "Unknown Product"
                        )
                        
                        # Extract nutritional values
                        # Open Food Facts uses per 100g values
                        nutrition_data = {
                            "name": product_name,
                            "brand": product.get("brands", ""),
                            "barcode": barcode,
                            "image_url": product.get("image_url") or product.get("image_front_url"),
                            "nutrition_grade": product.get("nutrition_grade_fr", "").upper(),
                            "calories_per_100g": nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal"),
                            "protein_per_100g": nutriments.get("proteins_100g") or nutriments.get("proteins", 0),
                            "carbs_per_100g": nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates", 0),
                            "fat_per_100g": nutriments.get("fat_100g") or nutriments.get("fat", 0),
                            "fiber_per_100g": nutriments.get("fiber_100g") or nutriments.get("fiber", 0),
                            "sugar_per_100g": nutriments.get("sugars_100g") or nutriments.get("sugars", 0),
                            "sodium_per_100g": nutriments.get("sodium_100g") or nutriments.get("sodium", 0),
                            "serving_size": product.get("serving_size"),
                            "quantity": product.get("quantity", ""),
                        }
                        
                        # Calculate per serving if available
                        serving_size_g = ProductService.parse_serving_size(nutrition_data["serving_size"])
                        if serving_size_g and serving_size_g > 0:
                            serving_multiplier = serving_size_g / 100.0
                            nutrition_data.update({
                                "calories_per_serving": nutrition_data["calories_per_100g"] * serving_multiplier if nutrition_data["calories_per_100g"] else None,
                                "protein_per_serving": nutrition_data["protein_per_100g"] * serving_multiplier,
                                "carbs_per_serving": nutrition_data["carbs_per_100g"] * serving_multiplier,
                                "fat_per_serving": nutrition_data["fat_per_100g"] * serving_multiplier,
                                "fiber_per_serving": nutrition_data["fiber_per_100g"] * serving_multiplier,
                                "sugar_per_serving": nutrition_data["sugar_per_100g"] * serving_multiplier,
                            })
                        
                        logger.info(f"Product found: {product_name} (barcode: {barcode})")
                        return nutrition_data
                    else:
                        logger.warning(f"Product not found for barcode: {barcode}")
                        return None
                elif response.status_code == 404:
                    logger.warning(f"Product not found for barcode: {barcode}")
                    return None
                else:
                    logger.error(f"Error fetching product: HTTP {response.status_code}")
                    return None
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching product data for barcode: {barcode}")
            return None
        except Exception as e:
            logger.error(f"Error looking up product by barcode {barcode}: {e}", exc_info=True)
            return None
    
    @staticmethod
    def parse_serving_size(serving_size_str: Optional[str]) -> Optional[float]:
        """Parse serving size string to grams."""
        if not serving_size_str:
            return None
        
        try:
            # Common formats: "100g", "250ml", "1 piece", etc.
            import re
            # Extract number
            match = re.search(r'(\d+\.?\d*)', serving_size_str)
            if match:
                value = float(match.group(1))
                # If it contains 'g', it's grams; if 'ml', assume ~1g/ml for most foods
                if 'g' in serving_size_str.lower():
                    return value
                elif 'ml' in serving_size_str.lower():
                    return value  # Approximate 1ml = 1g for most liquids
                else:
                    # Default to grams if no unit specified
                    return value
            return None
        except:
            return None

