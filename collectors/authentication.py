import os
import re
import subprocess
from datetime import datetime, timezone

AUTH_LOG = "/var/log/auth.log"

_seen_auth_events = set()
_MAX_SEEN_AUTH_EVENTS = 5000


def parse_log_timestamp(line):
    match = re.match(
        r"^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})",
        line
    )

    if not match:
        return None

    timestamp_text = match.group(1)
    current_year = datetime.now(timezone.utc).year

    try:
        parsed = datetime.strptime(
            f"{current_year} {timestamp_text}",
            "%Y %b %d %H:%M:%S"
        )
        return parsed.replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        return None


def extract_username(message):
    """
    Extract usernames from common SSH/PAM failure messages.
    """
    patterns = [
        r"Failed password for (?:invalid user )?([^\s]+) from ",
        r"Invalid user ([^\s]+) from ",
        r"authentication failure.*?\buser=([^\s]+)",
        r"authentication failure.*?\bruser=([^\s]+)"
    ]

    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return None


def build_auth_event(line):
    event = {
        "timestamp": parse_log_timestamp(line),
        "raw_message": line
    }

    username = extract_username(line)

    if username:
        event["username"] = username

    return event


def collect_auth_log_events(lines=50):
    events = []

    if not os.path.exists(AUTH_LOG):
        return events

    try:
        with open(AUTH_LOG, "r", errors="replace") as file:
            recent_lines = file.readlines()[-lines:]

        for line in recent_lines:
            line = line.strip()
            if line:
                events.append(build_auth_event(line))

    except PermissionError:
        pass

    return events


def collect_ssh_journal_events(lines=50):
    events = []

    try:
        result = subprocess.run(
            [
                "journalctl",
                "-u",
                "ssh",
                "-n",
                str(lines),
                "--no-pager",
                "-o",
                "short"
            ],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return events

        for line in result.stdout.splitlines():
            line = line.strip()
            if line:
                events.append(build_auth_event(line))

    except (
        subprocess.SubprocessError,
        FileNotFoundError,
        PermissionError
    ):
        pass

    return events


def deduplicate_auth_events(events):
    """
    Prevent the same authentication log entry from being sent again
    on every 10-second collection cycle.
    """
    global _seen_auth_events

    unique_events = []

    for event in events:
        message = event.get("raw_message", "").strip()
        if not message:
            continue

        timestamp = event.get("timestamp") or ""
        fingerprint = f"{timestamp}|{message}"

        if fingerprint in _seen_auth_events:
            continue

        _seen_auth_events.add(fingerprint)
        unique_events.append(event)

    if len(_seen_auth_events) > _MAX_SEEN_AUTH_EVENTS:
        _seen_auth_events = set(
            list(_seen_auth_events)[-_MAX_SEEN_AUTH_EVENTS:]
        )

    return unique_events


def collect_authentication_events(lines=50):
    auth_events = collect_auth_log_events(lines)
    ssh_events = collect_ssh_journal_events(lines)

    unique_events = deduplicate_auth_events(
        auth_events + ssh_events
    )

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "auth.log+journalctl",
        "event_count": len(unique_events),
        "events": unique_events
    }
