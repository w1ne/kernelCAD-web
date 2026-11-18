#!/usr/bin/env bash
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../../.." && pwd)"
rm -f "$HERE/catalog-integration.exit"
cd "$ROOT"
NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/integration/catalog/
TEST_RESULT=$?
echo "$TEST_RESULT" > "$HERE/catalog-integration.exit"
exit "$TEST_RESULT"
