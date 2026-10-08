import time
from core.controller import collect_all_telemetry


def run_scheduler(interval=10):
    """
    Run telemetry collection at a fixed interval.
    """

    while True:
        telemetry = collect_all_telemetry()

        print("Telemetry collected successfully.")
        print(
            f"Timestamp: "
            f"{telemetry['system']['timestamp']}"
        )

        time.sleep(interval)
