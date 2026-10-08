from datetime import datetime, timezone


def normalize_telemetry(telemetry):
    """
    Wrap collected endpoint telemetry in a consistent agent payload.
    """

    return {
        "agent": {
            "name": "CyberTwin Linux Agent",
            "version": "1.0.0",
            "platform": "linux"
        },

        "timestamp": datetime.now(timezone.utc).isoformat(),

        "telemetry": telemetry
    }
