#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
python3 "$ROOT/artifacts/catalog-demos/recycling-glass-screening-motor-cap-material-review-20261113/make_demo.py"
