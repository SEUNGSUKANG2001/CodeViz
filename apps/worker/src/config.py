import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/codeviz")
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

    AWS_REGION = os.environ.get("AWS_REGION", "ap-northeast-2")
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    S3_BUCKET = os.environ.get("S3_BUCKET", "")

    QUEUE_NAME = "codeviz:jobs"


config = Config()
