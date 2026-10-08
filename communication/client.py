import requests

from config.settings import (
    TELEMETRY_ENDPOINT,
    AGENT_ID,
    REQUEST_TIMEOUT
)


def send_telemetry(payload):
    """
    Send normalized telemetry to the CyberTwin backend.
    """

    data = {
        "agent_id": AGENT_ID,
        "payload": payload
    }

    try:
        response = requests.post(
            TELEMETRY_ENDPOINT,
            json=data,
            timeout=REQUEST_TIMEOUT
        )

        response.raise_for_status()

        return {
            "success": True,
            "status_code": response.status_code,
            "response": response.json()
        }

    except requests.exceptions.RequestException as error:
        return {
            "success": False,
            "status_code": None,
            "error": str(error)
        }
