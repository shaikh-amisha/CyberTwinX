import psutil
from datetime import datetime, timezone


def collect_resource_usage():
    """
    Collect current CPU, memory, disk, and system load information.
    """

    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    load = psutil.getloadavg()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),

        "cpu": {
            "usage_percent": psutil.cpu_percent(interval=1),
            "logical_cores": psutil.cpu_count(logical=True),
            "physical_cores": psutil.cpu_count(logical=False)
        },

        "memory": {
            "total_bytes": memory.total,
            "available_bytes": memory.available,
            "used_bytes": memory.used,
            "usage_percent": memory.percent
        },

        "disk": {
            "total_bytes": disk.total,
            "used_bytes": disk.used,
            "free_bytes": disk.free,
            "usage_percent": disk.percent
        },

        "load_average": {
            "1_minute": load[0],
            "5_minutes": load[1],
            "15_minutes": load[2]
        }
    }
