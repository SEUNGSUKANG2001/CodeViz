#!/usr/bin/env python3
"""
CodeViz Worker - Processes analysis jobs from Redis queue
"""

import json
import signal
import sys
from redis import Redis

from src.config import config
from src.jobs.analyze import process_analysis_job


class GracefulShutdown:
    """Handle graceful shutdown on SIGTERM/SIGINT."""

    def __init__(self):
        self.should_stop = False
        signal.signal(signal.SIGTERM, self._handler)
        signal.signal(signal.SIGINT, self._handler)

    def _handler(self, signum, frame):
        print(f"[Worker] Received signal {signum}, shutting down gracefully...")
        self.should_stop = True


def main():
    print("[Worker] Starting CodeViz Worker...")
    print(f"[Worker] Queue: {config.QUEUE_NAME}")
    print(f"[Worker] Redis: {config.REDIS_URL}")

    shutdown = GracefulShutdown()
    redis_client = Redis.from_url(config.REDIS_URL)

    print("[Worker] Waiting for jobs...")

    while not shutdown.should_stop:
        try:
            # BRPOP blocks for up to 5 seconds waiting for a job
            result = redis_client.brpop(config.QUEUE_NAME, timeout=5)

            if result is None:
                # Timeout, no job available
                continue

            _, payload_bytes = result
            payload = json.loads(payload_bytes.decode("utf-8"))
            job_id = payload.get("jobId")

            if not job_id:
                print("[Worker] Invalid job payload, missing jobId")
                continue

            print(f"[Worker] Received job: {job_id}")
            process_analysis_job(job_id)

        except Exception as e:
            print(f"[Worker] Error processing job: {e}")
            import traceback
            traceback.print_exc()

    print("[Worker] Shutdown complete")
    redis_client.close()


if __name__ == "__main__":
    main()
