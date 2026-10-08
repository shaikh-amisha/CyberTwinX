import os
from datetime import datetime, timezone

MONITORED_DIRECTORY = "/tmp/cybertwin-monitor"
_previous_files = {}
_files_initialized = False


def collect_file_state():
    """
    Collect the current file state and detect activity between cycles.

    The first successful collection establishes a baseline and emits no
    events, so files that existed before the agent started are not treated
    as newly created activity.
    """
    global _previous_files, _files_initialized

    files = []
    events = []
    timestamp = datetime.now(timezone.utc).isoformat()

    if not os.path.exists(MONITORED_DIRECTORY):
        _previous_files = {}
        _files_initialized = False
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

            files.append({
                "name": filename,
                "path": path,
                "size_bytes": stat.st_size,
                "modified_time": datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat()
            })

            current_files[path] = {
                "name": filename,
                "size_bytes": stat.st_size,
                "modified_time": stat.st_mtime
            }

        if not _files_initialized:
            _previous_files = current_files
            _files_initialized = True
            return {
                "timestamp": timestamp,
                "directory": MONITORED_DIRECTORY,
                "file_count": len(files),
                "files": files,
                "events": []
            }

        for path, current in current_files.items():
            if path not in _previous_files:
                events.append({
                    "event": "CREATED",
                    "path": path,
                    "name": current["name"],
                    "timestamp": timestamp
                })
            else:
                previous = _previous_files[path]
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

        for path, previous in _previous_files.items():
            if path not in current_files:
                events.append({
                    "event": "DELETED",
                    "path": path,
                    "name": previous["name"],
                    "timestamp": timestamp
                })

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
