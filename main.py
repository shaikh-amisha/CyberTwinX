import time

from core.controller import collect_all_telemetry
from core.normalizer import normalize_telemetry
from api.client import send_telemetry


COLLECTION_INTERVAL = 10


def main():
    print("===================================")
    print("      CyberTwin Linux Agent")
    print("===================================")

    print("\nAgent started.")
    print(f"Collection interval: {COLLECTION_INTERVAL} seconds")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            # 1. Collect telemetry
            telemetry = collect_all_telemetry()

            # 2. Normalize telemetry
            payload = normalize_telemetry(telemetry)
            import  json
            print( json.dumps( payload, indent=2,default=str))
            # 3. Send telemetry to CyberTwinX backend
            result = send_telemetry(payload)

            # 4. Extract values for local status display
            process_count = (
                payload["telemetry"]["processes"]["process_count"]
            )

            connection_count = (
                payload["telemetry"]["network"]["connection_count"]
            )

            log_count = (
                payload["telemetry"]["logs"]["log_count"]
            )

            user_count = (
                payload["telemetry"]["users"]["user_count"]
            )

            # 5. Display collection status
            print(
                f"[{payload['timestamp']}] "
                f"Telemetry collected | "
                f"Processes: {process_count} | "
                f"Connections: {connection_count} | "
                f"Users: {user_count} | "
                f"Logs: {log_count}"
            )

            # 6. Display backend transmission status
            if result["success"]:
                print("Telemetry sent to backend successfully.")
            else:
                print(
                    f"Failed to send telemetry: {result['error']}"
                )

            print()

            # 7. Wait before next collection
            time.sleep(COLLECTION_INTERVAL)

    except KeyboardInterrupt:
        print("\nCyberTwin Linux Agent stopped.")


if __name__ == "__main__":
    main()
