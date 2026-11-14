#!/usr/bin/env bash
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
rm -f "$HERE/catalog-index-build.exit"
cd "$ROOT"
npx tsx scripts/buildAssetCatalog.ts
BUILD_RESULT=$?
echo "$BUILD_RESULT" > "$HERE/catalog-index-build.exit"
exit "$BUILD_RESULT"
