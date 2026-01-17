import time
from datetime import datetime, timezone
import traceback

from src.services.db import get_job, update_job_status, update_project_status
from src.services.s3 import upload_graph_json
from src.services.mock_analyzer import generate_mock_graph, calculate_stats


def process_analysis_job(job_id: str) -> None:
    """
    Process an analysis job:
    1. Load job from DB
    2. Update status to 'running'
    3. Generate mock graph (or real analysis in the future)
    4. Upload graph.json to S3
    5. Update job with result URL and stats
    6. Update project status to 'ready'
    """
    print(f"[Worker] Starting job: {job_id}")

    try:
        # Load job from DB
        job = get_job(job_id)
        if not job:
            print(f"[Worker] Job not found: {job_id}")
            return

        project_id = job["project_id"]
        repo_url = job["repo_url"]
        ref = job.get("ref")

        # Update status to running
        update_job_status(
            job_id,
            status="running",
            progress=0.0,
            message="Starting analysis..."
        )

        # Simulate some work with progress updates
        update_job_status(job_id, status="running", progress=0.2, message="Fetching repository...")
        time.sleep(0.5)  # Simulate network delay

        update_job_status(job_id, status="running", progress=0.4, message="Parsing files...")
        time.sleep(0.5)

        # Generate mock graph
        update_job_status(job_id, status="running", progress=0.6, message="Building graph...")
        graph = generate_mock_graph(repo_url, ref)
        graph["metadata"]["analyzedAt"] = datetime.now(timezone.utc).isoformat()

        time.sleep(0.3)

        # Calculate stats
        update_job_status(job_id, status="running", progress=0.8, message="Calculating statistics...")
        stats = calculate_stats(graph)

        # Upload to S3
        update_job_status(job_id, status="running", progress=0.9, message="Uploading results...")
        result_url = upload_graph_json(job_id, graph)

        # Mark job as done
        update_job_status(
            job_id,
            status="done",
            progress=1.0,
            message="Analysis complete",
            result_url=result_url,
            stats_json=stats
        )

        # Update project status to ready
        update_project_status(project_id, "ready")

        print(f"[Worker] Job completed: {job_id}")
        print(f"[Worker] Result URL: {result_url}")
        print(f"[Worker] Stats: {stats}")

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"[Worker] Job failed: {job_id}")
        print(f"[Worker] Error: {error_msg}")
        traceback.print_exc()

        # Mark job as failed
        update_job_status(
            job_id,
            status="failed",
            error_message=error_msg
        )

        # Update project status to error
        try:
            job = get_job(job_id)
            if job:
                update_project_status(job["project_id"], "error")
        except Exception:
            pass
