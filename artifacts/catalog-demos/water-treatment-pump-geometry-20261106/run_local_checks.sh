#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BUNDLE="$ROOT/artifacts/catalog-demos/water-treatment-pump-geometry-20261106"
SITE_OUT="/tmp/kernelcad-water-treatment-pump-geometry-20261106"
cd "$ROOT"

npx eslint catalog/kits/water-treatment/ > "$BUNDLE/eslint-output.txt" 2>&1
npx vitest run tests/integration/catalog/ > "$BUNDLE/catalog-integration-output.txt" 2>&1
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py --kit water-treatment > "$BUNDLE/kit-quality-output.txt" 2>&1
PYTHONDONTWRITEBYTECODE=1 python3 scripts/checkCatalogQuality.py > "$BUNDLE/catalog-quality-output.txt" 2>&1

for id in high-lift-pump-skid horizontal-split-case-pump reverse-osmosis-skid; do
  npx tsx scripts/checkCatalogAsset.ts "catalog/kits/water-treatment/$id.kcad.ts" \
    --png "$BUNDLE/asset-renders/$id.png" > "$BUNDLE/asset-check-$id.txt" 2>&1
done

npx tsx scripts/buildCatalogPages.ts "$SITE_OUT" > "$BUNDLE/catalog-pages-build-output.txt" 2>&1
PYTHONDONTWRITEBYTECODE=1 python3 \
  "$BUNDLE/verify_water_treatment_refinement.py" "$SITE_OUT" \
  > "$BUNDLE/local-verification-output.txt" 2>&1
npx tsx "$BUNDLE/render_water_treatment_variants.ts" \
  > "$BUNDLE/variant-render-output.txt" 2>&1
PYTHONDONTWRITEBYTECODE=1 python3 "$BUNDLE/capture_water_treatment_demo.py" \
  > "$BUNDLE/demo-capture-output.txt" 2>&1
PYTHONDONTWRITEBYTECODE=1 python3 "$BUNDLE/inspect_water_treatment_demo.py" \
  > "$BUNDLE/video-inspection-output.txt" 2>&1
