import json
import os
from datetime import datetime, timezone


BUFFER_FILE = "storage/telemetry_buffer.jsonl"


def save_telemetry(payload):
    """
    Store one telemetry payload locally.

    JSON Lines format:
    One complete telemetry object per line.
    """

    os.makedirs(os.path.dirname(BUFFER_FILE), exist_ok=True)

    with open(BUFFER_FILE, "a", encoding="utf-8") as file:
        file.write(json.dumps(payload) + "\n")


def read_buffer():
    """
    Read all locally buffered telemetry.
    """

    if not os.path.exists(BUFFER_FILE):
        return []

    telemetry = []

    with open(BUFFER_FILE, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            if not line:
                continue

            try:
                telemetry.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    return telemetry


def clear_buffer():
    """
    Remove successfully processed telemetry from the local buffer.
    """

    if os.path.exists(BUFFER_FILE):
        os.remove(BUFFER_FILE)


def buffer_status():
    """
    Return basic information about the local buffer.
    """

    if not os.path.exists(BUFFER_FILE):
        return {
            "exists": False,
            "records": 0,
            "size_bytes": 0
        }

    records = len(read_buffer())
    size = os.path.getsize(BUFFER_FILE)

    return {
        "exists": True,
        "records": records,
        "size_bytes": size,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
