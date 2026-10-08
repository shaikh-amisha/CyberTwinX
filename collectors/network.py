import psutil
import time
from datetime import datetime, timezone


# Network connections used for detection are short-lived, especially during
# TCP connect scans. Sample several times during each collection cycle so
# transient connections are not lost between snapshots.
NETWORK_SAMPLE_DURATION = 2.0
NETWORK_SAMPLE_INTERVAL = 0.1


def collect_network_connections():
    """
    Collect network connections with short-interval sampling.

    The previous implementation took one instantaneous psutil snapshot.
    Short-lived TCP connections could therefore disappear before the agent
    observed them. We now sample repeatedly for a short window and merge
    unique connections into one telemetry record.
    """

    connections_by_key = {}
    start_time = time.monotonic()

    while time.monotonic() - start_time < NETWORK_SAMPLE_DURATION:
        try:
            current_connections = psutil.net_connections(kind="inet")
        except (psutil.Error, OSError):
            current_connections = []

        for connection in current_connections:
            try:
                local_address = None
                remote_address = None

                if connection.laddr:
                    local_address = {
                        "ip": connection.laddr.ip,
                        "port": connection.laddr.port
                    }

                if connection.raddr:
                    remote_address = {
                        "ip": connection.raddr.ip,
                        "port": connection.raddr.port
                    }

                # Include the connection state in the key so the same socket
                # can be retained if it transitions through different states.
                key = (
                    local_address["ip"] if local_address else None,
                    local_address["port"] if local_address else None,
                    remote_address["ip"] if remote_address else None,
                    remote_address["port"] if remote_address else None,
                    connection.pid,
                    connection.status
                )

                connections_by_key[key] = {
                    "fd": connection.fd,
                    "family": str(connection.family),
                    "type": str(connection.type),
                    "status": connection.status,
                    "local_address": local_address,
                    "remote_address": remote_address,
                    "pid": connection.pid
                }

            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        time.sleep(NETWORK_SAMPLE_INTERVAL)

    connections = list(connections_by_key.values())

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "connection_count": len(connections),
        "connections": connections
    }
