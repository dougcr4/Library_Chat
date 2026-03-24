#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start-local.sh  —  Start the 3D Designer dev servers on Ubuntu
#
# Usage:  ./start-local.sh
#
# Kills any stale processes on ports 5173 and 8080, then starts:
#   • API server  (port 8080)
#   • Vite frontend (port 5173)
#
# Both servers log to the terminal. Press Ctrl+C to stop both.
# ─────────────────────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/designer}"
API_PORT="${API_PORT:-8080}"
VITE_PORT="${PORT:-5173}"

echo "── Clearing stale processes ──────────────────────────────────────────────"
fuser -k "${API_PORT}/tcp"  2>/dev/null && echo "  Cleared port ${API_PORT}" || true
fuser -k "${VITE_PORT}/tcp" 2>/dev/null && echo "  Cleared port ${VITE_PORT}" || true
sleep 1

echo "── Starting API server on port ${API_PORT} ────────────────────────────────"
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

echo "── Starting Vite frontend on port ${VITE_PORT} ───────────────────────────"
PORT="${VITE_PORT}" API_PORT="${API_PORT}" \
  pnpm --filter @workspace/3d-designer run dev &
VITE_PID=$!

echo ""
echo "  ✓ API server  →  http://localhost:${API_PORT}"
echo "  ✓ 3D Designer →  http://localhost:${VITE_PORT}"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Forward Ctrl+C to both child processes
trap "kill ${API_PID} ${VITE_PID} 2>/dev/null; exit 0" INT TERM
wait
