#!/usr/bin/env python3
"""Generate the local catalog hub/details and verify all grid-substation pages."""

import json
import shutil
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
OUTPUT = Path("/tmp/kernelcad-grid-substation-pages-20261103")
shutil.rmtree(OUTPUT, ignore_errors=True)
run = subprocess.run(
    ["npx", "tsx", "scripts/buildCatalogPages.ts", str(OUTPUT)],
    cwd=ROOT, capture_output=True, text=True, check=False,
)
(BUNDLE / "catalog-pages-build-output.txt").write_text(run.stdout + run.stderr, encoding="utf-8")
if run.returncode:
    raise SystemExit(f"catalog page generation failed; see {BUNDLE / 'catalog-pages-build-output.txt'}")
shutil.copyfile(BUNDLE / "public-site-style.css", OUTPUT / "style.css")
shutil.copyfile(BUNDLE / "public-site-favicon.svg", OUTPUT / "favicon.svg")

index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
assets = [row for row in index["assets"] if row["kit"] == "grid-substation"]
kit_pages = OUTPUT / "catalog/grid-substation"
pages = list(kit_pages.glob("*/index.html"))
previews = list(kit_pages.glob("*/preview.png"))
hub = OUTPUT / "catalog/index.html"
detail_dir = kit_pages / "substation-main-power-transformer"
detail = (detail_dir / "index.html").read_text(encoding="utf-8") if (detail_dir / "index.html").is_file() else ""
hub_text = hub.read_text(encoding="utf-8") if hub.is_file() else ""

variant = BUNDLE / "substation-main-power-transformer-scale-1.2.png"
copied_variant = OUTPUT / "catalog/grid-substation/scale-variant.png"
if variant.is_file():
    copied_variant.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(variant, copied_variant)
    audit = json.loads((BUNDLE / "parameter-variant-audit.json").read_text(encoding="utf-8"))
    default = next(row for row in assets if row["id"] == "substation-main-power-transformer")
    comparison = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Scale variant · local catalog evidence</title>
<style>*{{box-sizing:border-box}}body{{margin:0;background:#e9ece9;color:#1b2827;font:15px/1.45 Arial,sans-serif}}header{{background:#18312f;color:#eef2ed;padding:18px 30px}}h1{{font:500 24px Georgia,serif;margin:4px 0}}main{{max-width:1160px;margin:0 auto;padding:22px 30px}}.eyebrow{{font:11px monospace;letter-spacing:.1em;text-transform:uppercase;color:#d2b071}}.pair{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}figure{{margin:0;background:#fff;border:1px solid #d2dbd5;padding:12px;border-radius:5px}}img{{width:100%;height:430px;object-fit:contain;background:#e4e9e7}}figcaption{{font:13px monospace;padding:9px 0 2px}}.facts{{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0}}.chip{{background:#fff;border:1px solid #d2dbd5;border-radius:4px;padding:7px 10px;font:12px monospace}}footer{{margin-top:22px;color:#54635c;font:12px monospace}}</style></head>
<body><header><div class="eyebrow">Generated parameter variant · local software evidence</div><h1>Transformer scale parameter</h1></header><main>
<p>Both meshes come from the same `.kcad.ts` source. The second source copy changes only the declared scale default from 1.00 to 1.20.</p>
<section class="pair"><figure><img src="/catalog/grid-substation/substation-main-power-transformer/preview.png" alt="Main transformer default scale preview"><figcaption>Default model · scale 1.00 · {default['stats']['triangles']} triangles</figcaption></figure>
<figure><img src="/catalog/grid-substation/scale-variant.png" alt="Main transformer scale 1.2 generated preview"><figcaption>Generated model · scale 1.20 · {audit['variantTriangles']} triangles</figcaption></figure></section>
<div class="facts"><span class="chip">Bounds scale ratio: {' × '.join(f'{ratio:.2f}' for ratio in audit['boundsRatios'])}</span><span class="chip">1 material in each mesh</span><span class="chip">Triangle budget: {audit['triangleBudget']}</span></div>
<footer>Local source and renderer check · branch page not deployed · no electrical or field acceptance claim</footer></main></body></html>'''
    (OUTPUT / "catalog/grid-substation-scale-comparison.html").write_text(comparison, encoding="utf-8")

checks = {
    "assetCount": len(assets),
    "detailPageCount": len(pages),
    "previewCopyCount": len(previews),
    "hubExists": hub.is_file(),
    "hubListsGridSubstationKit": "Grid Substation" in hub_text,
    "hubSearchFieldExists": 'id="catalog-q"' in hub_text,
    "samplePageHasPreview": 'src="preview.png"' in detail,
    "samplePageHasScaleParam": "Overall scale" in detail,
    "samplePageHasColorParam": "Asset color" in detail,
    "variantComparisonExists": (OUTPUT / "catalog/grid-substation-scale-comparison.html").is_file(),
    "allPreviewsCopied": len(previews) == len(assets) == 80,
}
checks["passed"] = all(value for key, value in checks.items() if isinstance(value, bool))
target = BUNDLE / "catalog-pages-check.json"
target.write_text(json.dumps(checks, indent=2) + "\n", encoding="utf-8")
print(json.dumps(checks, indent=2))
if not checks["passed"]:
    raise SystemExit(f"local catalog page checks failed; see {target}")
