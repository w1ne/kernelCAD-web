#!/usr/bin/env bash
set -euo pipefail
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
passed=0
total=0
for asset_file in catalog/kits/sports/*.kcad.ts; do
  total=$((total + 1))
  npx tsx scripts/checkCatalogAsset.ts "$asset_file"
  passed=$((passed + 1))
done
printf 'checkCatalogAsset: %s/%s passed\n' "$passed" "$total"
