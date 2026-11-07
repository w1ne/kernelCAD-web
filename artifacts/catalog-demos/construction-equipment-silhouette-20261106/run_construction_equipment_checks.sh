#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$bundle_dir/../../.." && pwd)"
cd "$repo_root"
raw_output="$bundle_dir/.command-output.tmp"

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
  rm -f "$raw_output"
  if [[ "$status" -ne 0 ]]; then
    return "$status"
  fi
}

record demo-settings-output.txt python3 "$bundle_dir/generate_demo_settings.py"
for asset_id in towable-light-tower ride-on-power-trowel concrete-batch-plant; do
  record "asset-check-$asset_id.txt" npx tsx scripts/checkCatalogAsset.ts \
    "catalog/kits/construction-equipment/$asset_id.kcad.ts" \
    --png "$bundle_dir/asset-renders/$asset_id.png"
done
record variant-render-output.txt npx tsx \
  "$bundle_dir/render_construction_equipment_variants.ts"
python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["previewAssetIDs"]))' \
  "$bundle_dir/demo-settings.json" > "$bundle_dir/preview-ids.txt"
record catalog-preview-render-output.txt xargs -a "$bundle_dir/preview-ids.txt" -n 200 \
  npx tsx scripts/renderCatalogPreviews.ts
record catalog-build-output.txt npx tsx scripts/buildAssetCatalog.ts
record preview-index-check-output.txt python3 "$bundle_dir/verify_catalog_index.py"

pages_dir="$(mktemp -d /tmp/kernelcad-construction-equipment-silhouette-20261106-pages-XXXXXX)"
printf '%s\n' "$pages_dir" > "$bundle_dir/local-pages-output-dir.txt"
record catalog-pages-build-output.txt npx tsx scripts/buildCatalogPages.ts "$pages_dir"
record local-page-check-output.txt python3 "$bundle_dir/verify_local_pages.py" "$pages_dir"

record quality-kit-output.txt python3 scripts/checkCatalogQuality.py --kit construction-equipment
record quality-global-output.txt python3 scripts/checkCatalogQuality.py
record eslint-output.txt npx eslint catalog/kits/construction-equipment/
record demo-script-eslint-output.txt npx eslint \
  "$bundle_dir/render_construction_equipment_variants.ts"
record catalog-integration-output.txt npx vitest run tests/integration/catalog/
record verification-output.txt python3 "$bundle_dir/record_construction_equipment_verification.py"
