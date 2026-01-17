import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Any, Optional
import json

from src.config import config


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    conn = psycopg2.connect(config.DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def get_job(job_id: str) -> Optional[dict]:
    """Fetch a job from the database by ID."""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT aj.*, p.repo_url, p.ref
                FROM analysis_jobs aj
                JOIN projects p ON p.id = aj.project_id
                WHERE aj.id = %s
                """,
                (job_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None


def update_job_status(
    job_id: str,
    status: str,
    progress: Optional[float] = None,
    message: Optional[str] = None,
    result_url: Optional[str] = None,
    stats_json: Optional[dict] = None,
    error_message: Optional[str] = None
) -> None:
    """Update job status in the database."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE analysis_jobs
                SET
                    status = %s,
                    progress = COALESCE(%s, progress),
                    message = COALESCE(%s, message),
                    result_url = COALESCE(%s, result_url),
                    stats_json = COALESCE(%s, stats_json),
                    error_message = COALESCE(%s, error_message),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (
                    status,
                    progress,
                    message,
                    result_url,
                    json.dumps(stats_json) if stats_json else None,
                    error_message,
                    job_id
                )
            )
            conn.commit()


def update_project_status(project_id: str, status: str) -> None:
    """Update project status in the database."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE projects
                SET status = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (status, project_id)
            )
            conn.commit()
