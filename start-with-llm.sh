#!/bin/bash
# Starts the Sales Sim server with ANTHROPIC_API_KEY sourced from Claude Code credentials.
# Uses the claudeAiOauth accessToken which is compatible with the Anthropic SDK.

set -e
cd "$(dirname "$0")"

CRED_FILE="$HOME/.claude/.credentials.json"
if [ ! -f "$CRED_FILE" ]; then
  echo "ERROR: $CRED_FILE not found. Run Claude Code and log in first." >&2
  exit 1
fi

TOKEN=$(python3 -c "import json,sys; d=json.load(open('$CRED_FILE')); print(d['claudeAiOauth']['accessToken'])" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not extract OAuth token from credentials. Check $CRED_FILE." >&2
  exit 1
fi

echo "Starting Sales Sim server with LLM enabled..."
exec env ANTHROPIC_API_KEY="$TOKEN" node server.js "$@"
