#!/usr/bin/env python3
"""Check this promotion changes reusable catalog/docs/evidence paths only."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
tracked_changes = subprocess.check_output(["git", "diff", "--name-only"], text=True).splitlines()
untracked = subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard"], text=True).splitlines()
paths = sorted(set(filter(None, tracked_changes + untracked)))
allowed = (
    "catalog/kits/ev-charging-infrastructure/",
    "artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/",
)
allowed_exact = {"catalog/index.json", "docs/catalog-assets.md"}
unexpected = [path for path in paths if path not in allowed_exact and not path.startswith(allowed)]
private_prefixes = ("site/", "src/server/", "src/web/", "src/billing/", "src/checkout/", "src/supplier-routing/", "src/commissions/", "src/manufacturing-policy/")
private_paths = [path for path in paths if path.startswith(private_prefixes)]
result = {
    "command": "git diff --name-only + git ls-files --others --exclude-standard + source boundary allowlist",
    "changedPathCount": len(paths),
    "unexpectedPaths": unexpected,
    "privateProductPaths": private_paths,
    "passed": not unexpected and not private_paths,
}
(BUNDLE / "source-boundary-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
