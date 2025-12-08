#!/bin/bash
# ============================================================================
# MAGNUM OPUS v2.0 — Deployment Script
# Run this on your VPS to deploy the new version
# ============================================================================

set -e  # Exit on error

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   MAGNUM OPUS v2.0 Deployment                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Configuration
PROJECT_DIR="/var/www/magnum-opus"
BACKUP_DIR="/var/www/magnum-opus-backup-$(date +%Y%m%d_%H%M%S)"

# 1. Backup existing installation
echo "[1/6] Creating backup..."
if [ -d "$PROJECT_DIR" ]; then
    cp -r "$PROJECT_DIR" "$BACKUP_DIR"
    echo "      Backup created: $BACKUP_DIR"
else
    echo "      No existing installation found, skipping backup"
fi

# 2. Copy new files
echo "[2/6] Copying new files..."
mkdir -p "$PROJECT_DIR"
cp -r /home/claude/magnum-opus-v2/* "$PROJECT_DIR/"
echo "      Files copied to $PROJECT_DIR"

# 3. Preserve database if exists
if [ -f "$BACKUP_DIR/database.json" ]; then
    echo "[3/6] Preserving existing database..."
    cp "$BACKUP_DIR/database.json" "$PROJECT_DIR/database.json"
    echo "      Database preserved"
else
    echo "[3/6] No existing database found, starting fresh"
fi

# 4. Install dependencies
echo "[4/6] Installing dependencies..."
cd "$PROJECT_DIR"
npm install
echo "      Dependencies installed"

# 5. Build for production
echo "[5/6] Building for production..."
npm run build
echo "      Build complete"

# 6. Restart backend server
echo "[6/6] Restarting backend server..."
# Kill existing server if running
pkill -f "node.*server.cjs" 2>/dev/null || true
# Start new server
nohup node server.cjs > /var/log/magnum-opus.log 2>&1 &
echo "      Server restarted"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Deployment Complete!                           ║"
echo "║                                                  ║"
echo "║   Frontend: https://snt-gornyak.ru               ║"
echo "║   Backend:  http://localhost:3001                ║"
echo "║                                                  ║"
echo "║   Logs: /var/log/magnum-opus.log                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
