#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
python3 "$ROOT/artifacts/catalog-demos/wind-converter-cabinet-material-review-20261113/make_demo.py"
