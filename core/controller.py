from collectors.system import collect_system_info
from collectors.resources import collect_resource_usage
from collectors.processes import collect_processes
from collectors.network import collect_network_connections
from collectors.users import collect_logged_in_users
from collectors.authentication import collect_authentication_events
from collectors.services import collect_services
from collectors.files import collect_file_state
from collectors.logs import collect_recent_logs


def collect_all_telemetry():
    """
    Run all endpoint collectors and combine their results.
    """

    telemetry = {
        "system": collect_system_info(),
        "resources": collect_resource_usage(),
        "processes": collect_processes(),
        "network": collect_network_connections(),
        "users": collect_logged_in_users(),
        "authentication": collect_authentication_events(),
        "services": collect_services(),
        "files": collect_file_state(),
        "logs": collect_recent_logs()
    }

    return telemetry


