import requests

from app.Core.logger import logger


def get_weather(
    location: str | None,
    openweather_api_key: str | None,
) -> str:
    if not location:
        logger.info("Weather skipped because user location is not set")
        return "Weather information unavailable"

    if not openweather_api_key:
        logger.info("Weather skipped because OpenWeather API key is not set")
        return "Weather information unavailable"

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "q": location,
                "appid": openweather_api_key,
                "units": "metric",
            },
            timeout=10,
        )

        response.raise_for_status()
        data = response.json()

        temperature = data["main"]["temp"]
        description = data["weather"][0]["description"]

        return f"{temperature}°C, {description}"

    except requests.exceptions.Timeout:
        logger.warning(
            "Weather API timed out for location: %s",
            location,
        )
        return "Weather information unavailable"

    except requests.exceptions.RequestException as exc:
        logger.warning(
            "Weather API request failed for %s: %s",
            location,
            exc,
        )
        return "Weather information unavailable"

    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning(
            "Unexpected weather API response for %s: %s",
            location,
            exc,
        )
        return "Weather information unavailable"


def test_openweather_key(api_key: str) -> tuple[bool, str]:
    """Test if an OpenWeather API key is valid."""
    if not api_key or not api_key.strip():
        return False, "OpenWeather API key cannot be empty."

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "q": "London",
                "appid": api_key.strip(),
            },
            timeout=8,
        )

        if response.status_code == 200:
            return True, "OpenWeather API key is working perfectly!"

        if response.status_code == 401:
            return False, "Invalid API key. Please check your OpenWeather key."

        return False, f"OpenWeather returned HTTP status {response.status_code}."

    except requests.exceptions.Timeout:
        return False, "Connection to OpenWeather timed out."

    except requests.exceptions.RequestException as exc:
        return False, f"Could not connect to OpenWeather: {str(exc)[:100]}"
