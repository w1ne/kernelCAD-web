#!/usr/bin/env python3
"""Refresh the telecom kit README from the generated catalog index."""

import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
bundle = Path(__file__).resolve().parent
kit = root / "catalog/kits/telecom-infrastructure"
index = json.loads((root / "catalog/index.json").read_text())
rows = sorted(
    (asset for asset in index["assets"] if asset["kit"] == "telecom-infrastructure"),
    key=lambda asset: asset["id"],
)
if len(rows) != 56:
    raise SystemExit(f"expected 56 index rows, found {len(rows)}")

max_triangles = max(asset["stats"]["triangles"] for asset in rows)
min_triangles = min(asset["stats"]["triangles"] for asset in rows)
paragraphs = [
    "# Telecom infrastructure kit",
    "",
    "Fifty-six original low-poly communications-site, rooftop, radio and fiber-network props, authored in millimetres with Z up. This quality promotion preserves all existing IDs and gives every asset an overall scale control, two to four material-named color controls, and `fieldSite` / `highVisibility` presets. Distinct finishes and component colors are carried by separate parts; antennas, masts, cable hardware, cabinets and fiber terminals keep object-specific silhouettes.",
    "",
    f"All 56 previews were regenerated and indexed. Current meshes range from {min_triangles} to {max_triangles} triangles, below the 900-triangle per-asset budget. The [quality promotion bundle](../../../artifacts/catalog-demos/telecom-infrastructure-quality-promotion-20261105/README.md) retains the promotion script, settings, visual review, preset render, local page checks, lint and integration evidence. The [original telecom wave demo](../../../artifacts/catalog-demos/telecom-infrastructure-wave-20261102/README.md) retains the initial source workflow.",
    "",
    "| id | asset | description | knobs | triangles |",
    "| --- | --- | --- | --- | ---: |",
]
for asset in rows:
    knobs = [p.get("label") or p["name"] for p in asset["params"]]
    knobs = ["scale" if p == "Overall scale" else p for p in knobs]
    paragraphs.append(
        f"| `{asset['id']}` | {asset['title']} | {asset['description']} | {' · '.join(knobs)} | {asset['stats']['triangles']} |"
    )

paragraphs += [
    "",
    "## Rebuild and verify",
    "",
    "```sh",
    "mapfile -t asset_ids < <(find catalog/kits/telecom-infrastructure -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\\n' | sed 's/\\.kcad\\.ts$//')",
    'npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"',
    "npx tsx scripts/buildAssetCatalog.ts",
    "python scripts/checkCatalogQuality.py --kit telecom-infrastructure",
    "npx eslint catalog/kits/telecom-infrastructure/",
    "npx vitest run tests/integration/catalog/",
    "npx tsx artifacts/catalog-demos/telecom-infrastructure-quality-promotion-20261105/check_telecom_pages.mts",
    "npx tsx artifacts/catalog-demos/telecom-infrastructure-quality-promotion-20261105/render_telecom_variant.mts",
    "```",
    "",
    "## License and scope",
    "",
    "Every source is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are stylized visualization props. They do not claim RF performance, antenna gain, wind loading, grounding compliance, ingress protection, installation suitability, regulatory compliance or physical acceptance.",
    "",
    "Local build and page checks are not deployed-site verification. See the quality promotion bundle for the exact tested branch state and evidence.",
    "",
]
(kit / "README.md").write_text("\n".join(paragraphs))
print(f"updated telecom README from {len(rows)} indexed assets ({min_triangles}–{max_triangles} tris)")
