import psutil
from datetime import datetime, timezone


def collect_logged_in_users():
    """
    Collect information about users currently logged into the endpoint.
    """

    users = []

    for user in psutil.users():
        users.append({
            "username": user.name,
            "terminal": user.terminal,
            "host": user.host,
            "started": (
                datetime.fromtimestamp(
                    user.started,
                    tz=timezone.utc
                ).isoformat()
                if user.started
                else None
            ),
            "pid": user.pid
        })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_count": len(users),
        "users": users
    }
