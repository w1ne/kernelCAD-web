#!/usr/bin/env bash
# Reproduce the step-to-features demo bundle. Run from the repository root.
# Rendering needs the headless player (npm run build:player) and Chromium;
# set PW_CDP_URL to attach to an already running Chrome instead of launching one.
set -euo pipefail
D=docs/demos/step-to-features
R=${1:-/tmp/step-to-features-renders}
mkdir -p "$R" "$D/verification"
cli() { npx tsx src/agent/cli/index.ts "$@"; }

cli export step "$D/original.kcad.ts" -o "$D/source.step"
cli reconstruct "$D/source.step" -o "$D/rebuilt.kcad.ts" --json | sed -n '/^{/,$p' | sed "s|$PWD/||g" > "$D/verification/reconstruct.json"
# edited.kcad.ts is rebuilt.kcad.ts with three param defaults changed (see its first line).
cli render "$D/source-view.kcad.ts" --preset publish -o "$R/source.png"
cli render "$D/rebuilt.kcad.ts" --preset publish -o "$R/rebuilt.png"
cli render "$D/edited.kcad.ts" --preset publish -o "$R/edited.png"
python3 "$D/render_demo.py" "$R"
