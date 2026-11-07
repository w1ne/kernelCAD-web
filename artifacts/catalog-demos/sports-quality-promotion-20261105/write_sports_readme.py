#!/usr/bin/env python3
"""Refresh the sports kit README from the generated catalog index."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = sorted((asset for asset in index["assets"] if asset["kit"] == "sports"), key=lambda asset: asset["id"])
if len(assets) != 40:
    raise SystemExit(f"expected the existing 40 sports IDs, found {len(assets)}")

ids = " ".join(asset["id"] for asset in assets)
lines = [
    "# Sports kit",
    "",
    "Forty original low-poly sports props for court, field, racket, skating, fitness and award scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every source retains its editable `scale` parameter and now exposes 2–4 material-named color controls plus the `clubColors` preset. These assets are generic scene props; they do not claim sport ratings, dimensional certification or hardware acceptance.",
    "",
    "The models and rendered previews are native kernelCAD assets dedicated to the public domain under CC0 1.0. The [sports quality-promotion demo bundle](../../../artifacts/catalog-demos/sports-quality-promotion-20261105/README.md) retains the migration source, before/after previews, preset renders, checks and inspected MP4.",
    "",
    "Basketballs and practice balls show their panel seams; rackets separate frame, string and grip materials; goals and nets use open cord grids; fitness equipment distinguishes grip surfaces, rubber weights, frame metal and upholstery. Controls change material colors while preserving each object's shape.",
    "",
    "| id | asset | material controls | triangles / budget |",
    "| --- | --- | --- | ---: |",
]
for asset in assets:
    controls = [param["label"] for param in asset["params"] if param["type"] == "color"]
    lines.append(
        f"| `{asset['id']}` | {asset['title']} | {' · '.join(controls)} | {asset['stats']['triangles']} / {asset['triangleBudget']} |"
    )

lines.extend(
    [
        "",
        "## Rebuild and verify",
        "",
        "The first command below restores the original, single-color wave sources. Use this sequence only when replaying the promotion from that baseline.",
        "",
        "```sh",
        "python3 artifacts/catalog-demos/sports-wave-20261102/generate_sports_assets.py",
        "python3 artifacts/catalog-demos/sports-quality-promotion-20261105/promote_sports_quality.py --apply",
        f"npx tsx scripts/renderCatalogPreviews.ts {ids}",
        "npx tsx scripts/buildAssetCatalog.ts",
        "python3 scripts/checkCatalogQuality.py --kit sports",
        "npx eslint catalog/kits/sports/",
        "npx vitest run tests/integration/catalog/",
        "```",
        "",
        "## Licence and provenance",
        "",
        "Every asset and export is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is authored from scratch in kernelCAD. The private design comparison is retained in `kernelCAD-private`; it contributes no copied geometry, textures, logos or product-specific dimensions.",
        "",
    ]
)

(ROOT / "catalog/kits/sports/README.md").write_text("\n".join(lines), encoding="utf-8")
print(f"wrote catalog/kits/sports/README.md from {len(assets)} generated index rows")
