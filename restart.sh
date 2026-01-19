#!/bin/bash

echo "Stopping all services..."
docker compose down

echo "Rebuilding and starting all services..."
docker compose up --build -d

echo "Waiting for services to be ready..."
sleep 5

echo "Service status:"
docker compose ps

echo ""
echo "Done! View logs with: docker compose logs -f"
