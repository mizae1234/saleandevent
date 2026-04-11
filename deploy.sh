#!/bin/bash
set -e

# ============================================
#  Saran Jeans — Remote Deploy Script
#  Usage: bash deploy.sh [old|new|all]
#  Default: all (deploy to both servers)
# ============================================

SERVER_OLD="root@srv1100100.hstgr.cloud"
SERVER_NEW="root@187.77.134.84"
REMOTE_DIR="/home/web/saleandevent"

TARGET="${1:-all}"

deploy_to() {
    local SERVER=$1
    local LABEL=$2

    echo ""
    echo "🚀 Deploying to ${LABEL} (${SERVER})..."
    echo "============================================"

    ssh "$SERVER" bash -s <<'EOF'
set -e
cd /home/web/saleandevent

echo ""
echo "📥 Pulling latest code..."
git pull origin main

HAS_DB_CHANGES="false"
if git diff --name-only ORIG_HEAD HEAD 2>/dev/null | grep -q "^prisma/"; then
    HAS_DB_CHANGES="true"
fi

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

    if [ "$HAS_DB_CHANGES" = "true" ]; then
        echo ""
        echo "================================================================"
        echo " ⚠️  WARNING: DATABASE CHANGES DETECTED IN THIS DEPLOYMENT! ⚠️"
        echo "================================================================"
        echo " Please verify and apply the database updates manually."
        echo " Recommended command (if using migrations):"
        echo "   docker exec -it saran-jeans-web npx prisma migrate deploy"
        echo " Or for simple prototyping schema sync: "
        echo "   docker exec -it saran-jeans-web npx prisma db push"
        echo "================================================================"
        echo ""
    fi
else
    echo ""
    echo "❌ Container failed!"
    docker logs --tail 20 saran-jeans-web
    exit 1
fi
EOF

    echo ""
    echo "✅ ${LABEL} deployed!"
}

case "$TARGET" in
    old)
        deploy_to "$SERVER_OLD" "OLD Server (saran.popcorn-creator.com)"
        ;;
    new)
        deploy_to "$SERVER_NEW" "NEW Server (saranservices.tech)"
        ;;
    all)
        deploy_to "$SERVER_OLD" "OLD Server (saran.popcorn-creator.com)"
        deploy_to "$SERVER_NEW" "NEW Server (saranservices.tech)"
        ;;
    *)
        echo "Usage: bash deploy.sh [old|new|all]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Done!"
echo ""
