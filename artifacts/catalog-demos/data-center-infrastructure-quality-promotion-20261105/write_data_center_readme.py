#!/usr/bin/env python3
"""Refresh the data-center kit README from the generated catalog index."""

import json
from pathlib import Path

root = Path(__file__).resolve().parents[3]
bundle = Path(__file__).resolve().parent
kit = root / "catalog/kits/data-center-infrastructure"
index = json.loads((root / "catalog/index.json").read_text())
rows = sorted(
    (asset for asset in index["assets"] if asset["kit"] == "data-center-infrastructure"),
    key=lambda asset: asset["id"],
)
if len(rows) != 50:
    raise SystemExit(f"expected 50 index rows, found {len(rows)}")
if not all(row.get("preview") for row in rows):
    raise SystemExit("every data-center asset must have an indexed preview path")

counts = [len([param for param in row["params"] if param["name"] != "scale"]) for row in rows]
minimum = min(row["stats"]["triangles"] for row in rows)
maximum = max(row["stats"]["triangles"] for row in rows)
paragraphs = [
    "# Data-center infrastructure kit",
    "",
    "Fifty original, generic low-poly scene props cover IT racks and chassis, raised-floor and containment parts, power distribution, cooling loops, monitoring, and room safety. The promotion preserves all 50 IDs and CC0 scope. Every asset has an overall scale control, two to four material-named color controls, and `facilityStandard` / `highVisibility` presets. Racks, switchgear, cabinets, cooling equipment, pumps, pipes, controls, and facility details keep distinct component geometry and colors.",
    "",
    f"All 50 previews were regenerated and indexed. The current meshes range from {minimum} to {maximum} triangles, within the 2,200-triangle per-asset budget. The [quality promotion bundle](../../../artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/README.md) retains the comparison note, promotion source, named-preset render, local preview review, demo video, and verification evidence. The [original data-center wave bundle](../../../artifacts/catalog-demos/data-center-wave-20261103/README.md) documents the earlier one-color asset creation workflow.",
    "",
    "| id | asset | description | knobs | triangles |",
    "| --- | --- | --- | --- | ---: |",
]
for asset in rows:
    knobs = [param.get("label") or param["name"] for param in asset["params"]]
    paragraphs.append(
        f"| `{asset['id']}` | {asset['title']} | {asset['description']} | {' · '.join(knobs)} | {asset['stats']['triangles']} |"
    )

paragraphs += [
    "",
    "## Rebuild and verify",
    "",
    "```sh",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/data-center-infrastructure-quality-promotion-20261105/promote_data_center_infrastructure.py",
    'mapfile -t asset_ids < <(rg --files catalog/kits/data-center-infrastructure | sed -n \'s#^.*/##; s/\\.kcad\\.ts$//p\')',
    'npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"',
    "npx tsx scripts/buildAssetCatalog.ts",
    "python3 scripts/checkCatalogQuality.py --kit data-center-infrastructure",
    "npx eslint catalog/kits/data-center-infrastructure/",
    "npx vitest run tests/integration/catalog/",
    "```",
    "",
    "## License and scope",
    "",
    "Every source is original geometry dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are stylized visualization assets. They do not claim data-center capacity, electrical or cooling performance, fire-system compliance, rack loading, installation suitability, safety certification, or physical acceptance.",
    "",
    "The current public site already lists these 50 IDs with previews. This work is local to the feature branch and does not verify deployment of the refreshed source or previews.",
    "",
]
(kit / "README.md").write_text("\n".join(paragraphs))
print(f"updated data-center README from {len(rows)} indexed assets; {min(counts)}-{max(counts)} material controls each")
