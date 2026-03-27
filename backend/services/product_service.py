"""Service for searching German food products using Open Food Facts API."""

import logging

import httpx

from backend.models.food import ProductSearchResult

logger = logging.getLogger(__name__)


async def search_products(query: str, limit: int = 20) -> list[ProductSearchResult]:
    """Search for products in Open Food Facts database."""

    if not query or len(query.strip()) < 2:
        return []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Search API endpoint
            url = "https://world.openfoodfacts.org/cgi/search.pl"
            params = {
                "search_terms": query.strip(),
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": limit,
                "countries_tags_en": "germany",  # Focus on German products
            }

            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            products = []
            for product_data in data.get("products", []):
                if not product_data:
                    continue

                nutriments = product_data.get("nutriments", {})

                # Extract nutrition data per 100g
                calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal")
                protein = nutriments.get("proteins_100g") or nutriments.get("proteins")
                carbs = nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates")
                fat = nutriments.get("fat_100g") or nutriments.get("fat")

                # Get product name (prefer German name)
                name = (
                    product_data.get("product_name_de") or
                    product_data.get("product_name") or
                    product_data.get("product_name_en") or
                    "Unbekanntes Produkt"
                )

                # Get image URL
                image_url = None
                if product_data.get("image_url"):
                    image_url = product_data["image_url"]
                elif product_data.get("image_front_url"):
                    image_url = product_data["image_front_url"]

                products.append(ProductSearchResult(
                    name=name,
                    barcode=product_data.get("code"),
                    calories_per_100g=float(calories) if calories else None,
                    protein_per_100g=float(protein) if protein else None,
                    carbs_per_100g=float(carbs) if carbs else None,
                    fat_per_100g=float(fat) if fat else None,
                    image_url=image_url,
                    brand=product_data.get("brands"),
                    quantity=product_data.get("quantity"),
                ))

            return products

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error searching products: {e.response.status_code} - {e}")
        return []
    except httpx.TimeoutException as e:
        logger.error(f"Timeout error searching products: {e}")
        return []
    except httpx.RequestError as e:
        logger.error(f"Request error searching products: {e}")
        return []
    except (ValueError, KeyError, TypeError) as e:
        logger.error(f"Data parsing error searching products: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error searching products: {e}", exc_info=True)
        return []


async def get_product_by_barcode(barcode: str) -> ProductSearchResult | None:
    """Get product information by barcode."""

    if not barcode or len(barcode.strip()) < 8:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode.strip()}.json"
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            if data.get("status") != 1:
                return None

            product_data = data.get("product", {})
            if not product_data:
                return None

            nutriments = product_data.get("nutriments", {})

            calories = nutriments.get("energy-kcal_100g") or nutriments.get("energy-kcal")
            protein = nutriments.get("proteins_100g") or nutriments.get("proteins")
            carbs = nutriments.get("carbohydrates_100g") or nutriments.get("carbohydrates")
            fat = nutriments.get("fat_100g") or nutriments.get("fat")

            name = (
                product_data.get("product_name_de") or
                product_data.get("product_name") or
                product_data.get("product_name_en") or
                "Unbekanntes Produkt"
            )

            image_url = None
            if product_data.get("image_url"):
                image_url = product_data["image_url"]
            elif product_data.get("image_front_url"):
                image_url = product_data["image_front_url"]

            return ProductSearchResult(
                name=name,
                barcode=barcode.strip(),
                calories_per_100g=float(calories) if calories else None,
                protein_per_100g=float(protein) if protein else None,
                carbs_per_100g=float(carbs) if carbs else None,
                fat_per_100g=float(fat) if fat else None,
                image_url=image_url,
                brand=product_data.get("brands"),
                quantity=product_data.get("quantity"),
            )

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching product by barcode {barcode}: {e.response.status_code} - {e}")
        return None
    except httpx.TimeoutException as e:
        logger.error(f"Timeout error fetching product by barcode {barcode}: {e}")
        return None
    except httpx.RequestError as e:
        logger.error(f"Request error fetching product by barcode {barcode}: {e}")
        return None
    except (ValueError, KeyError, TypeError) as e:
        logger.error(f"Data parsing error fetching product by barcode {barcode}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching product by barcode {barcode}: {e}", exc_info=True)
        return None


