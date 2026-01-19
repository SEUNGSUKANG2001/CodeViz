FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (git for cloning repos)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Run worker
CMD ["python", "-m", "src.worker"]
