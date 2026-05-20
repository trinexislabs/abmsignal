#!/bin/bash
# ABMSignal OpenClaw Gateway - Separate instance for ABM agents
export OPENCLAW_STATE_DIR=/home/trinexis-dgx-spark/.openclaw-abmsignal
export OPENCLAW_CONFIG_PATH=/home/trinexis-dgx-spark/.openclaw-abmsignal/openclaw.json
# Cancel tasks queued but never started from dead sessions — prevents restart hangs
sqlite3 "$OPENCLAW_STATE_DIR/tasks/runs.sqlite" \
  "UPDATE task_runs SET status='cancelled' WHERE status='queued' AND started_at IS NULL;" 2>/dev/null || true

exec /home/trinexis-dgx-spark/.openclaw/bin/openclaw gateway --port 18790 --force
