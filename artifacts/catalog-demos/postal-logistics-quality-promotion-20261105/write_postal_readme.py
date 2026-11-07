#!/usr/bin/env python3
"""Write the postal-logistics kit README from the generated catalog index."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/postal-logistics"
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == "postal-logistics"]
audit_path = BUNDLE / "promotion-audit.json"
audit = json.loads(audit_path.read_text()) if audit_path.is_file() else {}


def quality_summary(lines: list[str]) -> str:
    text = "\n".join(lines)
    match = re.search(r"(\d+)/(\d+) assets pass", text)
    thin_match = re.search(r"(\d+) thin assets", text)
    if not match or not thin_match:
        return "not recorded"
    passed, total = int(match.group(1)), int(match.group(2))
    thin = int(thin_match.group(1))
    return f"{passed:,}/{total:,} pass ({100 * passed / total:.0f}%), {thin:,} thin ({100 * thin / total:.0f}%)"

rows = [
    "# Postal logistics kit",
    "",
    "[Watch the local quality-promotion workflow demo](../../../artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/postal-logistics-quality-promotion.mp4)",
    "",
    "The 52 existing source models cover parcel induction, scanning, sortation, mail handling, route preparation, and dispatch. Each keeps its existing ID and editable scale control, adds two to four material-named color controls, and offers `weathered` and `highVisibility` finish presets. Lofted chamfer profiles, round conveyor rollers and handling wheels, and the satchel's tapered body, sloped flap, front straps, and metal buckles improve the silhouettes while retaining the existing asset IDs and scale.",
    "",
    "The [promotion bundle](../../../artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/README.md) retains the source transformation, exact commands/settings, before/after previews, preset render, generated preview/index and page evidence, lint and integration results, and inspected MP4. These are local rendered visualization assets; no parcel throughput, machinery safety, postal compliance, production engineering suitability, or physical acceptance is claimed.",
    "",
    "## Assets",
    "",
    "| id | asset | material controls | presets | triangles |",
    "| --- | --- | --- | --- | ---: |",
]
for asset in assets:
    controls = [param["name"] for param in asset["params"] if param["type"] == "color"]
    names = ", ".join(f"`{name}`" for name in controls)
    presets = ", ".join(f"`{name}`" for name in (asset.get("presets") or {}))
    rows.append(f"| `{asset['id']}` | {asset['title']} | {names} | {presets} | {asset['stats']['triangles']} |")
rows.extend([
    "",
    "## Quality progress",
    "",
    f"Before this round: {quality_summary(audit.get('catalogQualityBeforeRoundSummary', []))}. After: {quality_summary(audit.get('catalogQualitySummary', []))}. This round promoted {audit.get('catalogQualityDeltaThisRound', {}).get('assetsPromotedToPass', 0)} existing assets to pass; it added no IDs.",
    "",
    "## Rebuild and verify",
    "",
    "Run from the repository root:",
    "",
    "```sh",
    "# The promotion generator was run once against baselineCommit in settings.json; these source outputs are already present.",
    "mapfile -t asset_ids < artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/preview-asset-ids.txt",
    'npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"',
    "npx tsx scripts/buildAssetCatalog.ts",
    "python3 scripts/checkCatalogQuality.py --kit postal-logistics",
    "npx eslint catalog/kits/postal-logistics/",
    "npx vitest run tests/integration/catalog/",
    "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-postal-logistics-quality-promotion-20261105",
    "python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/verify_postal_pages.py /tmp/kernelcad-postal-logistics-quality-promotion-20261105",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/record_postal_audit.py",
    "npx tsx artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/render_postal_variant.ts",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/write_postal_readme.py",
    "python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/capture_postal_demo.py",
    "python3 artifacts/catalog-demos/postal-logistics-quality-promotion-20261105/inspect_postal_video.py",
    "```",
    "",
])
(KIT / "README.md").write_text("\n".join(rows))
print(f"wrote kit README for {len(assets)} indexed assets")
