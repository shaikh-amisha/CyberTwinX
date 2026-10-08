import subprocess
from datetime import datetime, timezone


def collect_services():
    """
    Collect currently running systemd services.
    """

    services = []

    try:
        result = subprocess.run(
            [
                "systemctl",
                "list-units",
                "--type=service",
                "--state=running",
                "--no-pager",
                "--no-legend"
            ],
            capture_output=True,
            text=True,
            check=False
        )

        for line in result.stdout.splitlines():
            parts = line.split(None, 4)

            if len(parts) >= 4:
                services.append({
                    "unit": parts[0],
                    "load": parts[1],
                    "active": parts[2],
                    "sub": parts[3],
                    "description": parts[4] if len(parts) > 4 else ""
                })

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service_count": len(services),
            "services": services
        }

    except Exception as error:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service_count": 0,
            "services": [],
            "error": str(error)
        }
