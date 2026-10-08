import os
from datetime import datetime, timezone


LOG_FILES = [
    "/var/log/auth.log",
    "/var/log/syslog",
]


def collect_recent_logs(lines_per_file=50):
    """
    Collect recent lines from important Linux log files.
    """

    collected_logs = []

    for log_file in LOG_FILES:

        if not os.path.exists(log_file):
            continue

        try:
            with open(log_file, "r", errors="replace") as file:
                recent_lines = file.readlines()[-lines_per_file:]

            for line in recent_lines:
                line = line.strip()

                if not line:
                    continue

                collected_logs.append({
                    "source": log_file,
                    "message": line
                })

        except PermissionError:
            collected_logs.append({
                "source": log_file,
                "message": None,
                "error": "Permission denied"
            })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "log_count": len(collected_logs),
        "logs": collected_logs
    }
