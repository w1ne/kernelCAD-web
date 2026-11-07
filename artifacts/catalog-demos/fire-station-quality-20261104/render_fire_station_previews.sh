#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
asset_ids=()
for source in catalog/kits/fire-station/*.kcad.ts; do
  filename="${source##*/}"
  asset_ids+=("${filename%.kcad.ts}")
done

python3 artifacts/catalog-demos/fire-station-wave-20261103/run_with_occt_cjs_compat.py \
  --output ../fire-station-quality-20261104/previews-render-output.txt \
  -- npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
