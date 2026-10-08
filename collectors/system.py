import platform
import socket
from datetime import datetime, timezone

import psutil


def collect_system_info():
    """
    Collect basic information about the Linux endpoint.
    """

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hostname": socket.gethostname(),
        "operating_system": platform.system(),
        "distribution": platform.platform(),
        "kernel": platform.release(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "boot_time": datetime.fromtimestamp(
            psutil.boot_time(),
            tz=timezone.utc
        ).isoformat()
    }
