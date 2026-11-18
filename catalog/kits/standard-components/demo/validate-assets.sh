#!/usr/bin/env bash
set -euo pipefail

for asset in catalog/kits/standard-components/*.kcad.ts; do
  npx tsx scripts/checkCatalogAsset.ts "$asset"
done
