import os
import re
import subprocess
from datetime import datetime, timezone


AUTH_LOG = "/var/log/auth.log"


def parse_log_timestamp(line):
    """
    Extract timestamp from a Linux syslog-style line.

    Example:
    Oct 07 14:13:41 kali sshd-session[3345]:
    """

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

        return parsed.replace(
            tzinfo=timezone.utc
        ).isoformat()

    except ValueError:
        return None


def collect_auth_log_events(lines=50):
    """
    Collect authentication events from /var/log/auth.log.
    """

    events = []

    if not os.path.exists(AUTH_LOG):
        return events

    try:

        with open(
            AUTH_LOG,
            "r",
            errors="replace"
        ) as file:

            recent_lines = file.readlines()[-lines:]

        for line in recent_lines:

            line = line.strip()

            if not line:
                continue

            events.append({
                "timestamp": parse_log_timestamp(line),
                "raw_message": line
            })

    except PermissionError:
        pass

    return events


def collect_ssh_journal_events(lines=50):
    """
    Collect recent SSH authentication events from systemd journal.

    This is important for Kali systems where SSH events may be available
    through journald even when /var/log/auth.log does not contain them.
    """

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

            if not line:
                continue

            events.append({
                "timestamp": parse_log_timestamp(line),
                "raw_message": line
            })

    except (
        subprocess.SubprocessError,
        FileNotFoundError,
        PermissionError
    ):
        pass

    return events


def collect_authentication_events(lines=50):
    """
    Collect authentication activity from both:

    1. /var/log/auth.log
    2. systemd SSH journal

    Duplicate messages are removed.
    """

    auth_events = collect_auth_log_events(lines)

    ssh_events = collect_ssh_journal_events(lines)

    combined = auth_events + ssh_events

    unique_events = []
    seen = set()

    for event in combined:

        message = event.get("raw_message", "").strip()

        if not message:
            continue

        if message in seen:
            continue

        seen.add(message)

        unique_events.append(event)

    return {

        "timestamp":
            datetime.now(timezone.utc).isoformat(),

        "source":
            "auth.log+journalctl",

        "event_count":
            len(unique_events),

        "events":
            unique_events

    }
