#!/bin/bash
# Cards for new 2050 stories: create, write the copy (v2), paint, resize.
# Each step skips work already done. Needs ANTHROPIC_API_KEY and
# GOOGLE_APPLICATION_CREDENTIALS (see processing/.env.example).

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="${PYTHON:-python3}"
LOG="${LOG_FILE:-$HERE/../output/story_pipeline.log}"
LOCK="${TMPDIR:-/tmp}/relish_story_pipeline.lock"
mkdir -p "$(dirname "$LOG")"

# never let two runs overlap (flock, where available)
exec 9>"$LOCK"
if command -v flock >/dev/null; then
    flock -n 9 || { echo "[$(date)] already running, skipping"; exit 0; }
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "[$(date)] ERROR: ANTHROPIC_API_KEY is not set — aborting" >> "$LOG"
    exit 1
fi

{
    echo "[$(date)] ── pipeline run ──"
    echo "── cards ──"
    "$PYTHON" "$HERE/generate_story_cards.py"
    echo "── card copy (v2) ──"
    "$PYTHON" "$HERE/rewrite_story_cards.py"
    echo "── images ──"
    "$PYTHON" "$HERE/generate_story_images.py"
    echo "── web-optimise (webp + manifest for the deck) ──"
    "$PYTHON" "$HERE/optimize_card_images.py"
    echo "── done ──"
} >> "$LOG" 2>&1

# keep only the last 500 lines of the log
tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
