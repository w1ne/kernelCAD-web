#!/usr/bin/env bash
set -euo pipefail

bundle_dir="artifacts/catalog-demos/standard-components-visible-details-20261106"
raw_output="$bundle_dir/.command-output.tmp"
mkdir -p "$bundle_dir/asset-renders"

record() {
  local output_file="$1"
  shift
  local status
  if "$@" > "$raw_output" 2>&1; then
    status=0
  else
    status=$?
  fi
  {
    printf 'EXIT CODE: %s\n' "$status"
    cat "$raw_output"
  } > "$bundle_dir/$output_file"
  python3 - "$bundle_dir/$output_file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
path.write_text(path.read_text().rstrip() + "\n")
PY
  rm -f "$raw_output"
  if [[ "$status" -ne 0 ]]; then
    return "$status"
  fi
}

for asset_id in timing-belt-pulley door-hinge din-rail-terminal-block; do
  record "asset-check-$asset_id.txt" npx tsx scripts/checkCatalogAsset.ts \
    "catalog/kits/standard-components/$asset_id.kcad.ts" \
    --png "$bundle_dir/asset-renders/$asset_id.png"
done

python3 - <<'PY'
import json
import re
from pathlib import Path

bundle = Path("artifacts/catalog-demos/standard-components-visible-details-20261106")
results = {}
for asset_id in ("timing-belt-pulley", "door-hinge", "din-rail-terminal-block"):
    path = bundle / f"asset-check-{asset_id}.txt"
    lines = path.read_text().splitlines()
    if not lines or lines[0] != "EXIT CODE: 0":
        raise SystemExit(f"asset check failed for {asset_id}")
    payload = next((line for line in reversed(lines) if line.startswith("{")), None)
    if payload is None:
        raise SystemExit(f"asset check JSON missing for {asset_id}")
    row = json.loads(payload)
    results[asset_id] = {
        "triangles": row["triangles"],
        "triangleBudget": row["budget"],
        "knobs": row["knobs"],
        "palette": row["palette"],
    }
(bundle / "asset-check-results.json").write_text(json.dumps(results, indent=2) + "\n")
PY

record variant-render-output.txt npx tsx \
  "$bundle_dir/render_visible_details_variants.ts"

mapfile -t preview_ids < <(python3 - <<'PY'
import json
from pathlib import Path
settings = json.loads(Path("artifacts/catalog-demos/standard-components-visible-details-20261106/demo-settings.json").read_text())
print("\n".join(settings["previewAssetIDs"]))
PY
)
record catalog-preview-render-output.txt npx tsx scripts/renderCatalogPreviews.ts "${preview_ids[@]}"
record catalog-build-output.txt npx tsx scripts/buildAssetCatalog.ts
record preview-index-check-output.txt python3 \
  "$bundle_dir/verify_catalog_index.py"
record catalog-pages-build-output.txt npm run catalog:pages
record local-page-check-output.txt python3 \
  "$bundle_dir/verify_visible_details_pages.py"
record catalog-quality-output.txt python3 scripts/checkCatalogQuality.py
record kit-quality-output.txt python3 scripts/checkCatalogQuality.py --kit standard-components
record eslint-output.txt npx eslint catalog/kits/standard-components/
record catalog-integration-output.txt npx vitest run tests/integration/catalog/
python3 "$bundle_dir/record_visible_details_verification.py"
