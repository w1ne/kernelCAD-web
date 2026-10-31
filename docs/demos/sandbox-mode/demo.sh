#!/usr/bin/env bash
# Sandbox-mode demo session. Runs the real CLI bundle built from this branch
# (`npm run build:cli` → dist/cli/index.js) as `kernelcad` in a fresh
# workspace, and writes the transcript (commands + their real output) to
# transcript.txt. Filtered from the transcript: OCCT's STEP-writer banner
# lines (`*******…`), blank lines, and the one-line larger-heap re-exec notice.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
CLI="$REPO/dist/cli/index.js"
WS=/tmp/cad-ws
rm -rf "$WS" && mkdir -p "$WS/out"
cp "$HERE/nema17-plate.kcad.ts" "$WS/"
cd "$WS"
kernelcad() { node "$CLI" "$@"; }
OUT="$HERE/transcript.txt"
: > "$OUT"
run() {
  printf '$ %s\n' "$*" >> "$OUT"
  eval "$@" 2>&1 | grep -v -e '^\*\*' -e '^$' -e 're-executing with --max-old-space-size' >> "$OUT"
  printf '[exit %s]\n\n' "${PIPESTATUS[0]}" >> "$OUT"
}
run "kernelcad --sandbox sandbox status"
run "kernelcad --sandbox export step nema17-plate.kcad.ts -o out/nema17-plate.step"
run "kernelcad --sandbox inspect step out/nema17-plate.step"
run "kernelcad --sandbox export step nema17-plate.kcad.ts -o ../leak.step"
run "ln -s /etc escape && kernelcad --sandbox export stl nema17-plate.kcad.ts -o escape/plate.stl"
run "node $HERE/mcp-call.mjs $CLI '[{\"name\":\"import_step\",\"arguments\":{\"url\":\"https://example.com/nema17.step\"}},{\"name\":\"fetch_part\",\"arguments\":{\"id\":\"nema-17\",\"partsBaseUrl\":\"https://parts.example.com\"}}]'"
sed -i "s#node $HERE/mcp-call.mjs $CLI#mcp-call.mjs   \# drives: kernelcad mcp --sandbox#" "$OUT"
echo "wrote $OUT"
