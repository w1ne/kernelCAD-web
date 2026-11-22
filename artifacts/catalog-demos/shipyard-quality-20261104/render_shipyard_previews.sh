#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
asset_ids=()
for source in catalog/kits/shipyard/*.kcad.ts; do
  filename="${source##*/}"
  asset_ids+=("${filename%.kcad.ts}")
done

python3 artifacts/catalog-demos/shipyard-quality-20261104/run_with_occt_cjs_compat.py \
  --output previews-render-output.txt \
  -- npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
