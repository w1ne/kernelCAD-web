#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
demo_dir="$repo_root/docs/demos/step-to-kernelcad"
bundle_dir="$demo_dir/bundle"

cd "$repo_root"
mkdir -p "$demo_dir/verification"
python3 - "$bundle_dir" "$demo_dir" <<'PY'
from pathlib import Path
import shutil
import sys

bundle = Path(sys.argv[1]).resolve()
demo = Path(sys.argv[2]).resolve()
if bundle.parent != demo or bundle.name != "bundle" or bundle.is_symlink():
    raise SystemExit("Refusing to clear an unexpected demo output path")
if bundle.exists():
    shutil.rmtree(bundle)
PY
node dist/cli/index.js import-step "$demo_dir/source.step" \
  --name "Smoke Box" --out "$bundle_dir" --json \
  | tee "$demo_dir/verification/import-cli.json"
node dist/cli/index.js parts "$bundle_dir/Smoke Box.kcad.ts" --json \
  | tee "$demo_dir/verification/parts-cli.json"

external_fixture="$repo_root/node_modules/occt-import-js/test/testfiles/cax-if/s1-c5-214/s1-c5-214.stp"
if [[ ! -f "$external_fixture" ]]; then
  echo "Missing pinned AP214 fixture: $external_fixture" >&2
  exit 1
fi
external_temp="$(mktemp -d /tmp/kernelcad-step-to-kernelcad.XXXXXX)"
trap 'rm -rf "$external_temp"' EXIT
node dist/cli/index.js import-step "$external_fixture" \
  --out "$external_temp/bundle" --json \
  | tee "$demo_dir/verification/external-import.json"
node dist/cli/index.js parts "$external_temp/bundle/s1-c5-214.kcad.ts" --json \
  | tee "$demo_dir/verification/external-parts.json"
cp "$external_temp/bundle/manifest.json" "$demo_dir/verification/external-manifest.json"
