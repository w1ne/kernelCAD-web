#!/usr/bin/env python3
"""Render only this wave's 80 new previews with the catalog renderer."""

import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
ids = sorted(path.name.removesuffix(".kcad.ts") for path in (ROOT / "catalog/kits/grid-substation").glob("*.kcad.ts"))
if len(ids) != 80:
    raise SystemExit(f"expected 80 new sources, found {len(ids)}")
command = ["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids]
run = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
log = run.stdout + run.stderr
(BUNDLE / "catalog-preview-render-output.txt").write_text(log, encoding="utf-8")
print(f"command: npx tsx scripts/renderCatalogPreviews.ts <80 grid-substation ids>")
print(f"exit code: {run.returncode}")
print(f"rendered rows logged: {sum(1 for line in run.stdout.splitlines() if line.startswith('grid-substation/'))}")
if run.returncode:
    raise SystemExit(f"preview rendering failed; see {BUNDLE / 'catalog-preview-render-output.txt'}")
rendered = [line for line in run.stdout.splitlines() if line.startswith("grid-substation/")]
if len(rendered) != 80:
    raise SystemExit(f"expected 80 rendered previews, logged {len(rendered)}")
