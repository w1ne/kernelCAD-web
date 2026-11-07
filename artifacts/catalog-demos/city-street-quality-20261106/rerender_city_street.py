#!/usr/bin/env python3
"""Rerender the bounded city-street kit preview set through kernelCAD."""

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/city-street"
ids = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
if len(ids) != 65:
    raise SystemExit(f"expected 65 existing city-street assets, found {len(ids)}")

command = ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids]
result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
output = result.stdout + result.stderr
(BUNDLE / "preview-render-output.txt").write_text(output, encoding="utf-8")
if result.returncode != 0:
    print(output, end="")
    raise SystemExit(result.returncode)
lines = [line for line in result.stdout.splitlines() if line.startswith("city-street/")]
if len(lines) != 65:
    raise SystemExit(f"renderer reported {len(lines)} city-street previews, expected 65")
print("\n".join(lines))
