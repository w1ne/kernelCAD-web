#!/bin/sh
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
set -eu

bundle_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$bundle_dir/../../.." && pwd)
cd "$repo_root"
npx tsx "$bundle_dir/capture-demo.mts"
python3 "$bundle_dir/render-demo.py"
