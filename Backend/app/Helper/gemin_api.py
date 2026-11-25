import asyncio
from typing import List

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.Core.logger import logger

CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
]


class OutfitRecommendation(BaseModel):
    clothe_ids: List[int] = Field(
        description="Only the IDs of the clothing items selected from the wardrobe."
    )
    explanation: str = Field(
        default="",
        description="A short, clear 1-2 sentence explanation of why this outfit was chosen for the occasion and weather."
    )


async def test_gemini_key(api_key: str) -> tuple[bool, str]:
    """Test if a Gemini API key is valid by sending a minimal ping request."""
    if not api_key or not api_key.strip():
        return False, "Gemini API key cannot be empty."

    last_error = ""
    for model_name in CANDIDATE_MODELS:
        try:
            client = genai.Client(api_key=api_key.strip())
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents="Say 'OK'",
                ),
                timeout=10.0,
            )

            if response and response.text:
                return True, "Gemini API key is working perfectly!"

        except Exception as exc:
            err = str(exc)
            last_error = err
            logger.warning("Gemini key test with %s failed: %s", model_name, err)

            if "API_KEY_INVALID" in err or "400" in err or "API key not valid" in err:
                return False, "Invalid API key. Please check your Gemini key."

    if "503" in last_error or "high demand" in last_error.lower():
        # The key is valid, but Google servers are reporting temporary peak load
        return True, "Gemini key is valid (Google servers currently report high load)."

    return False, f"Gemini test failed: {last_error[:120]}"


async def generate_response(
    api_key: str,
    clothes: List[str],
    prompt: str,
) -> OutfitRecommendation | None:
    client = genai.Client(api_key=api_key)
    formatted_clothes = "\n".join(clothes)

    custom_prompt = f"""
    You are a professional fashion consultant.

    Here is the user's available wardrobe:
    {formatted_clothes}

    User request:
    {prompt}

    Choose ONE complete, cohesive outfit from the available wardrobe.

    OUTFIT RULES:
    - Select exactly ONE top.
    - Select exactly ONE bottom.
    - Select exactly ONE pair of shoes.
    - If the wardrobe contains a suitable one-piece outfit
      (such as a dress or jumpsuit), select that instead of a top and bottom.
    - Never select two tops.
    - Never select two bottoms.
    - Never select two pairs of shoes.
    - Do not combine a one-piece outfit with a separate top or bottom.
    - Only select items that actually exist in the provided wardrobe.
    - Prefer the most appropriate outfit for the user's occasion,
      weather, season, and formality.
    - If a category is unavailable, choose the best complete outfit
      possible from the available items.
    - Do not select extra items just because they match.

    IMPORTANT OUTPUT RULES:
    - Return ONLY the IDs of the selected clothing items in clothe_ids.
    - Return each selected ID only once.
    - In the explanation field, write a simple 1-2 sentence explanation of why these clothes suit the occasion and current weather.
    - Do not invent IDs.
    """

    for model_name in CANDIDATE_MODELS:
        try:
            logger.info("Requesting outfit recommendation with model: %s", model_name)
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=custom_prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                        response_mime_type="application/json",
                        response_schema=OutfitRecommendation,
                    ),
                ),
                timeout=25.0,
            )

            if response and response.parsed:
                return response.parsed

        except Exception as exc:
            logger.warning(
                "Gemini model %s failed: %s. Trying fallback model...",
                model_name,
                exc,
            )

    logger.error("All Gemini candidate models failed to generate recommendation.")
    return None
