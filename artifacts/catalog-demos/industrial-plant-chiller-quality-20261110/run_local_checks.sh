#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
BUNDLE="$ROOT/artifacts/catalog-demos/industrial-plant-chiller-quality-20261110"
PAGE_OUT="/tmp/kernelcad-chiller-pages-20261110"
cd "$ROOT"

npx tsx scripts/renderCatalogPreviews.ts centrifugal-chiller > "$BUNDLE/preview-render-output.txt" 2>&1
npx tsx scripts/buildAssetCatalog.ts > "$BUNDLE/catalog-build-output.txt" 2>&1
python3 scripts/checkCatalogQuality.py --kit industrial-plant > "$BUNDLE/kit-quality-output.txt" 2>&1
python3 scripts/checkCatalogQuality.py > "$BUNDLE/quality-global-output.txt" 2>&1
npx tsx "$BUNDLE/render_chiller_variants.ts" > "$BUNDLE/variant-render-output.txt" 2>&1
npx eslint catalog/kits/industrial-plant/ > "$BUNDLE/eslint-output.txt" 2>&1
printf '\nESLint passed.\n' >> "$BUNDLE/eslint-output.txt"
npx vitest run tests/integration/catalog/ > "$BUNDLE/catalog-integration-output.txt" 2>&1
npx tsx scripts/buildCatalogPages.ts "$PAGE_OUT" > "$BUNDLE/catalog-pages-build-output.txt" 2>&1
printf '%s\n' "$PAGE_OUT" > "$BUNDLE/local-page-out-path.txt"
python3 "$BUNDLE/verify_chiller.py" "$PAGE_OUT" > "$BUNDLE/local-verification-output.txt" 2>&1
mkdir -p "$BUNDLE/local-page/catalog/industrial-plant/centrifugal-chiller"
cp "$PAGE_OUT/catalog/industrial-plant/centrifugal-chiller/index.html" "$BUNDLE/local-page/catalog/industrial-plant/centrifugal-chiller/index.html"
cp "$PAGE_OUT/catalog/industrial-plant/centrifugal-chiller/preview.png" "$BUNDLE/local-page/catalog/industrial-plant/centrifugal-chiller/preview.png"
python3 "$BUNDLE/capture_demo.py" > "$BUNDLE/demo-capture-output.txt" 2>&1
python3 "$BUNDLE/inspect_demo.py" > "$BUNDLE/video-inspection-output.txt" 2>&1
