import psutil
from datetime import datetime, timezone


def collect_processes():
    """
    Collect detailed information about currently running processes.

    The telemetry structure is compatible with the CyberTwinX
    process-based detection engine.
    """

    processes = []

    for process in psutil.process_iter(
        [
            "pid",
            "ppid",
            "name",
            "username",
            "status",
            "create_time",
            "cpu_percent",
            "memory_percent",
            "cmdline",
            "exe",
        ]
    ):
        try:
            info = process.info

            cmdline = info.get("cmdline") or []
            exe = info.get("exe")

            processes.append({
                "pid": info.get("pid"),
                "parent_pid": info.get("ppid"),

                "name": info.get("name"),
                "process_name": info.get("name"),

                "username": info.get("username"),
                "status": info.get("status"),

                "create_time": (
                    datetime.fromtimestamp(
                        info["create_time"],
                        tz=timezone.utc
                    ).isoformat()
                    if info.get("create_time")
                    else None
                ),

                "cpu_percent": info.get("cpu_percent"),
                "memory_percent": info.get("memory_percent"),

                # Full command-line information
                "cmdline": cmdline,

                # Human-readable command
                "command": (
                    " ".join(cmdline)
                    if cmdline
                    else None
                ),

                # Executable path
                "exe": exe,
                "path": exe,
                "executable": exe,
            })

        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess
        ):
            continue

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "process_count": len(processes),
        "processes": processes
    }
