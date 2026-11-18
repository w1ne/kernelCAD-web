#!/usr/bin/env bash
set -euo pipefail

bundle_dir="$(cd "$(dirname "$0")/.." && pwd)"
repo_root="$(cd "$bundle_dir/../../.." && pwd)"
cd "$repo_root"

python3 "$bundle_dir/demo/make_demo.py"
python3 "$bundle_dir/demo/encode_demo.py"
