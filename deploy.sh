#!/bin/bash
set -e

# ============================================
#  Saran Jeans — Remote Deploy Script
#  Usage: bash deploy.sh
# ============================================

SERVER="root@srv1100100.hstgr.cloud"
REMOTE_DIR="/home/web/saleandevent"

echo ""
echo "🚀 Deploying Saran Jeans to ${SERVER}..."
echo "============================================"

ssh "$SERVER" bash -s <<'EOF'
set -e
cd /home/web/saleandevent

echo ""
echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "🐳 Rebuilding Docker image..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "⏳ Waiting for container..."
sleep 5

if docker ps --filter "name=saran-jeans-web" --filter "status=running" -q | grep -q .; then
    echo ""
    echo "✅ Deploy successful!"
    docker logs --tail 5 saran-jeans-web
else
    echo ""
    echo "❌ Container failed!"
    docker logs --tail 20 saran-jeans-web
    exit 1
fi
EOF

echo ""
echo "🎉 Done!"
echo ""
