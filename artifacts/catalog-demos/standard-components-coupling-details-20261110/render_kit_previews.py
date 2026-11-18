#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Render exactly the standard-components preview IDs recorded in settings."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent


def main() -> None:
    settings = json.loads((OUT / "demo-settings.json").read_text(encoding="utf-8"))
    ids = settings["previewAssetIDs"]
    if len(ids) != 50 or len(set(ids)) != 50:
        raise SystemExit(f"expected 50 unique preview IDs, got {len(ids)}")
    command = ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    output = result.stdout + result.stderr
    (OUT / "preview-render-output.txt").write_text(output, encoding="utf-8")
    print(output[-5000:])
    if result.returncode != 0:
        raise SystemExit(result.returncode)
    rendered = [line for line in result.stdout.splitlines() if line.startswith("standard-components/")]
    if len(rendered) != 50:
        raise SystemExit(f"expected 50 rendered preview rows, got {len(rendered)}")


if __name__ == "__main__":
    main()
