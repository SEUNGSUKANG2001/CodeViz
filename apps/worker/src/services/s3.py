import boto3
import json
from typing import Any

from src.config import config


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=config.AWS_REGION,
        aws_access_key_id=config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
    )


def upload_graph_json(job_id: str, graph_data: dict[str, Any]) -> str:
    """Upload graph.json to S3 and return the public URL."""
    s3 = get_s3_client()

    key = f"codeviz/graphs/{job_id}/graph.json"
    body = json.dumps(graph_data, ensure_ascii=False, indent=2)

    s3.put_object(
        Bucket=config.S3_BUCKET,
        Key=key,
        Body=body.encode("utf-8"),
        ContentType="application/json",
    )

    return f"https://{config.S3_BUCKET}.s3.{config.AWS_REGION}.amazonaws.com/{key}"
