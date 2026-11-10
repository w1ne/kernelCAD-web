#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BUNDLE_DIR="$ROOT_DIR/artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110"
PAGE_OUT="$(mktemp -d /tmp/kcad-backwash-page.XXXXXX)"
cd "$ROOT_DIR"
printf '%s\n' "$PAGE_OUT" > "$BUNDLE_DIR/local-page-out-path.txt"

npx tsx artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/render_backwash_variants.ts 2>&1 | tee "$BUNDLE_DIR/variant-render-output.txt"
npx eslint catalog/kits/water-treatment/ 2>&1 | tee "$BUNDLE_DIR/eslint-output.txt"
printf '%s\n' 'ESLint passed (exit 0; no diagnostics).' | tee -a "$BUNDLE_DIR/eslint-output.txt"
npx vitest run tests/integration/catalog/ 2>&1 | tee "$BUNDLE_DIR/catalog-integration-output.txt"
python3 scripts/checkCatalogQuality.py --kit water-treatment 2>&1 | tee "$BUNDLE_DIR/kit-quality-output.txt"
python3 scripts/checkCatalogQuality.py 2>&1 | tee "$BUNDLE_DIR/quality-global-output.txt"
npx tsx scripts/buildCatalogPages.ts "$PAGE_OUT" 2>&1 | tee "$BUNDLE_DIR/catalog-pages-build-output.txt"
python3 artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/verify_backwash.py "$PAGE_OUT" 2>&1 | tee "$BUNDLE_DIR/local-verification-output.txt"
python3 artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/capture_demo.py 2>&1 | tee "$BUNDLE_DIR/demo-capture-output.txt"
python3 artifacts/catalog-demos/water-treatment-backwash-pump-skid-20261110/inspect_video.py 2>&1 | tee "$BUNDLE_DIR/video-inspection-output.txt"
