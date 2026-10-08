import psutil
from datetime import datetime, timezone


def collect_network_connections():
    """
    Collect active network connections on the Linux endpoint.
    """

    connections = []

    for connection in psutil.net_connections(kind="inet"):
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

            connections.append({
                "fd": connection.fd,
                "family": str(connection.family),
                "type": str(connection.type),
                "status": connection.status,
                "local_address": local_address,
                "remote_address": remote_address,
                "pid": connection.pid
            })

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "connection_count": len(connections),
        "connections": connections
    }
