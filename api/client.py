import requests


BACKEND_URL = "http://192.168.116.1:5000/api/telemetry"


def send_telemetry(data):
    try:
        response = requests.post(
            BACKEND_URL,
            json=data,
            timeout=5
        )

        response.raise_for_status()

        return {
            "success": True,
            "response": response.json()
        }

    except requests.RequestException as error:
        return {
            "success": False,
            "error": str(error)
        }
