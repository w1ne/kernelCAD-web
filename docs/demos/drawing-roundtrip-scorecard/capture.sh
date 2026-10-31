#!/usr/bin/env bash
# Reproduce the drawing round-trip scorecard demo. Run from the repository root.
# Needs pdftoppm (poppler), Python 3 with Pillow, and ffmpeg.
# verification/before.* was produced the same way with the view/blind-hole
# fixes reverted (src/agent/drawing/views.ts, reconstructPhases.ts at c6bdd59).
set -euo pipefail
D=docs/demos/drawing-roundtrip-scorecard
npx tsx scripts/drawingRoundTripScorecard.ts --out "$D/verification/after.md"
npx tsx src/agent/cli/index.ts export pdf-drawing assets/reference-parts/scorecard/revolve-stepped-shaft.kcad.ts -o "$D/stepped-shaft.pdf"
pdftoppm -r 110 -png -singlefile "$D/stepped-shaft.pdf" "$D/verification/stepped-shaft-sheet"
python3 "$D/render_demo.py"
