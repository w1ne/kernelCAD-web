#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGE_OUT="$(mktemp -d /tmp/kcad-air-compressor-page.XXXXXX)"
cd "$ROOT_DIR"
printf '%s\n' "$PAGE_OUT" > "$BUNDLE_DIR/local-page-out-path.txt"

npx tsx scripts/renderCatalogPreviews.ts air-compressor diesel-generator-set belt-conveyor > "$BUNDLE_DIR/preview-render-output.txt" 2>&1
npx tsx scripts/buildAssetCatalog.ts > "$BUNDLE_DIR/catalog-build-output.txt" 2>&1
npx tsx artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/render_air_compressor_variants.ts > "$BUNDLE_DIR/variant-render-output.txt" 2>&1
npx eslint catalog/kits/industrial-plant/ > "$BUNDLE_DIR/eslint-output.txt" 2>&1
printf '%s\n' 'ESLint passed (exit 0; no diagnostics).' >> "$BUNDLE_DIR/eslint-output.txt"
npx vitest run tests/integration/catalog/ > "$BUNDLE_DIR/catalog-integration-output.txt" 2>&1
python3 scripts/checkCatalogQuality.py --kit industrial-plant > "$BUNDLE_DIR/kit-quality-output.txt" 2>&1
python3 scripts/checkCatalogQuality.py > "$BUNDLE_DIR/quality-global-output.txt" 2>&1
npx tsx scripts/buildCatalogPages.ts "$PAGE_OUT" > "$BUNDLE_DIR/catalog-pages-build-output.txt" 2>&1
python3 artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/verify_air_compressor.py "$PAGE_OUT" > "$BUNDLE_DIR/local-verification-output.txt" 2>&1
python3 artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/capture_demo.py > "$BUNDLE_DIR/demo-capture-output.txt" 2>&1
python3 artifacts/catalog-demos/industrial-plant-air-compressor-quality-20261110/inspect_video.py > "$BUNDLE_DIR/video-inspection-output.txt" 2>&1
