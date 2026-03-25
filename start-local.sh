#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start-local.sh  —  Start the 3D Designer Node.js dev servers on Ubuntu
#
# Usage:  ./start-local.sh
#
# Manages ONLY:
#   • PostgreSQL system service  (checks + starts if stopped)
#   • API server                 (port 8080)
#   • Vite frontend              (port 5173)
#
# These Docker services must already be running via docker compose:
#   • Open-WebUI      → http://localhost:3001
#   • CadQuery Server → http://localhost:5000
#   • JupyterLab      → http://localhost:8888
#
# To stop:  Ctrl+C  (or if the prompt returned early:
#           fuser -k 8080/tcp && fuser -k 5173/tcp )
# ─────────────────────────────────────────────────────────────────────────────

# No set -e — we handle errors explicitly so orphan processes are avoided

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/designer}"
API_PORT="${API_PORT:-8080}"
VITE_PORT="${PORT:-5173}"

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
echo "── Checking PostgreSQL ───────────────────────────────────────────────────"
if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  echo "  PostgreSQL is running. ✓"
else
  echo "  PostgreSQL not running — starting..."
  sudo service postgresql start
  sleep 3
  if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    echo "  PostgreSQL started. ✓"
  else
    echo "  ERROR: PostgreSQL failed to start."
    echo "  Run:  sudo service postgresql status"
    exit 1
  fi
fi

# ── 2. Clear stale Node.js processes ─────────────────────────────────────────
echo "── Clearing stale processes on ports ${API_PORT} and ${VITE_PORT} ────────"
fuser -k "${API_PORT}/tcp"  2>/dev/null && echo "  Cleared port ${API_PORT}" || true
fuser -k "${VITE_PORT}/tcp" 2>/dev/null && echo "  Cleared port ${VITE_PORT}" || true
sleep 1

# ── 3. Apply DB schema changes ────────────────────────────────────────────────
echo "── Applying database schema changes ─────────────────────────────────────"
DATABASE_URL="${DB_URL}" pnpm --filter @workspace/db run push 2>&1 | tail -3

# ── 4. Start API server ───────────────────────────────────────────────────────
echo "── Starting API server (port ${API_PORT}) ────────────────────────────────"
DATABASE_URL="${DB_URL}" PORT="${API_PORT}" \
  pnpm --filter @workspace/api-server run dev &
API_PID=$!

echo "── Waiting for API server ────────────────────────────────────────────────"
for i in $(seq 1 30); do
  if curl -s "http://localhost:${API_PORT}/api/health" >/dev/null 2>&1; then
    echo "  API server ready. ✓"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  WARNING: API server did not respond — check output above."
  fi
  sleep 0.5
done

# ── 5. Start Vite ─────────────────────────────────────────────────────────────
echo "── Starting Vite frontend (port ${VITE_PORT}) ────────────────────────────"
PORT="${VITE_PORT}" API_PORT="${API_PORT}" \
  pnpm --filter @workspace/3d-designer run dev &
VITE_PID=$!

echo "── Waiting for Vite ──────────────────────────────────────────────────────"
for i in $(seq 1 30); do
  if curl -s "http://localhost:${VITE_PORT}" >/dev/null 2>&1; then
    echo "  Vite ready. ✓"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  WARNING: Vite did not respond — check output above."
  fi
  sleep 0.5
done

# ── 6. Status ─────────────────────────────────────────────────────────────────
echo ""
echo "  API server  → http://localhost:${API_PORT}"
echo "  3D Designer → http://localhost:${VITE_PORT}"
echo ""
echo "  Press Ctrl+C to stop.  (If prompt returned early: fuser -k 8080/tcp && fuser -k 5173/tcp)"
echo ""

trap "echo ''; echo 'Stopping...'; kill ${API_PID} ${VITE_PID} 2>/dev/null; exit 0" INT TERM
wait ${API_PID} ${VITE_PID}
