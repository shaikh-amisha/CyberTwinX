import os
from datetime import datetime, timezone


MONITORED_DIRECTORY = "/tmp/cybertwin-monitor"

_previous_files = {}


def collect_file_state():
    """
    Collect the current state of files in the monitored directory
    and detect basic file activity between collection cycles.
    """

    global _previous_files

    files = []
    events = []

    timestamp = datetime.now(timezone.utc).isoformat()

    if not os.path.exists(MONITORED_DIRECTORY):
        _previous_files = {}

        return {
            "timestamp": timestamp,
            "directory": MONITORED_DIRECTORY,
            "file_count": 0,
            "files": [],
            "events": [],
            "error": "Monitored directory does not exist"
        }

    try:
        current_files = {}

        for filename in os.listdir(MONITORED_DIRECTORY):
            path = os.path.join(MONITORED_DIRECTORY, filename)

            if not os.path.isfile(path):
                continue

            stat = os.stat(path)

            file_info = {
                "name": filename,
                "path": path,
                "size_bytes": stat.st_size,
                "modified_time": datetime.fromtimestamp(
                    stat.st_mtime,
                    tz=timezone.utc
                ).isoformat()
            }

            files.append(file_info)

            current_files[path] = {
                "name": filename,
                "size_bytes": stat.st_size,
                "modified_time": stat.st_mtime
            }

        # ---------------------------------------------------------
        # Detect newly created or modified files
        # ---------------------------------------------------------

        for path, current in current_files.items():

            # New file
            if path not in _previous_files:

                events.append({
                    "event": "CREATED",
                    "path": path,
                    "name": current["name"],
                    "timestamp": timestamp
                })

            else:
                previous = _previous_files[path]

                # Modified file
                if (
                    current["size_bytes"] != previous["size_bytes"]
                    or current["modified_time"] != previous["modified_time"]
                ):
                    events.append({
                        "event": "MODIFIED",
                        "path": path,
                        "name": current["name"],
                        "timestamp": timestamp
                    })

        # ---------------------------------------------------------
        # Detect deleted files
        # ---------------------------------------------------------

        for path, previous in _previous_files.items():

            if path not in current_files:

                events.append({
                    "event": "DELETED",
                    "path": path,
                    "name": previous["name"],
                    "timestamp": timestamp
                })

        # Save current snapshot for next cycle
        _previous_files = current_files

        return {
            "timestamp": timestamp,
            "directory": MONITORED_DIRECTORY,
            "file_count": len(files),
            "files": files,
            "events": events
        }

    except PermissionError:

        return {
            "timestamp": timestamp,
            "directory": MONITORED_DIRECTORY,
            "file_count": 0,
            "files": [],
            "events": [],
            "error": "Permission denied"
        }

    except Exception as e:

        return {
            "timestamp": timestamp,
            "directory": MONITORED_DIRECTORY,
            "file_count": 0,
            "files": [],
            "events": [],
            "error": str(e)
        }
