#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start-local.sh  —  Start the 3D Designer Node.js dev servers on Ubuntu
#
# Usage:  ./start-local.sh
#
# This script ONLY manages the two Node.js processes:
#   • API server  (port 8080)
#   • Vite frontend (port 5173)
#
# These Docker services must already be running via docker compose before
# using this script (they are NOT touched here):
#   • Ollama          → http://localhost:11434
#   • Open-WebUI      → http://localhost:3001
#   • CadQuery Server → http://localhost:5000
#   • JupyterLab      → http://localhost:8888
#
# ─────────────────────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/designer}"
API_PORT="${API_PORT:-8080}"
VITE_PORT="${PORT:-5173}"

echo "── Clearing stale Node.js processes ─────────────────────────────────────"
fuser -k "${API_PORT}/tcp"  2>/dev/null && echo "  Cleared port ${API_PORT}" || true
fuser -k "${VITE_PORT}/tcp" 2>/dev/null && echo "  Cleared port ${VITE_PORT}" || true
sleep 1

echo "── Starting API server (port ${API_PORT}) ────────────────────────────────"
DATABASE_URL="${DB_URL}" PORT="${API_PORT}" \
  pnpm --filter @workspace/api-server run dev &
API_PID=$!

echo "── Waiting for API server to be ready ────────────────────────────────────"
for i in $(seq 1 20); do
  if curl -s "http://localhost:${API_PORT}/api/health" >/dev/null 2>&1; then
    echo "  API server ready."
    break
  fi
  sleep 0.5
done

echo "── Starting Vite frontend (port ${VITE_PORT}) ────────────────────────────"
PORT="${VITE_PORT}" API_PORT="${API_PORT}" \
  pnpm --filter @workspace/3d-designer run dev &
VITE_PID=$!

echo ""
echo "  API server  →  http://localhost:${API_PORT}"
echo "  3D Designer →  http://localhost:${VITE_PORT}"
echo ""
echo "  Docker services expected running:"
echo "    Ollama          →  http://localhost:11434"
echo "    Open-WebUI      →  http://localhost:3001"
echo "    CadQuery Server →  http://localhost:5000"
echo "    JupyterLab      →  http://localhost:8888"
echo ""
echo "  Press Ctrl+C to stop the API server and Vite."
echo ""

trap "kill ${API_PID} ${VITE_PID} 2>/dev/null; exit 0" INT TERM
wait
