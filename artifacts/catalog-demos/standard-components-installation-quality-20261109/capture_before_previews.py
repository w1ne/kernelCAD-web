#!/usr/bin/env python3
"""Copy exact baseline previews from the recorded source commit."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
settings = json.loads((BUNDLE / "demo-settings.json").read_text())

for source in settings["sources"]:
    asset = Path(source).name.removesuffix(".kcad.ts")
    preview_path = f"catalog/kits/standard-components/previews/{asset}.png"
    result = subprocess.run(
        ["git", "show", f"{settings['baselineCommit']}:{preview_path}"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    (BUNDLE / "before" / f"{asset}.png").write_bytes(result.stdout)
    print(f"{asset}: baseline {settings['baselineCommit']}")
