#!/usr/bin/env python3
"""Write the catalog handoff from the generated index and retained audit."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "postal-logistics"]
audit_path = BUNDLE / "asset-check-results.json"
if not audit_path.is_file():
    raise SystemExit("run catalog integration and record_postal_checks.py before writing the handoff")
audit = json.loads(audit_path.read_text())
lo, hi = audit["triangleRange"]

lines = [
    "# Postal logistics kit",
    "",
    f"{len(rows)} original low-poly parcel-processing scene props cover induction, scanning, sortation, parcel handling, route preparation, and dispatch. All sources use millimetres, Z up, a base origin at z = 0, and editable `scale` and `color` controls. Audited exports range from {lo} to {hi} triangles, use one material, and stay within their per-asset 1,800-triangle budget.",
    "",
    "The [postal logistics wave demo bundle](../../../artifacts/catalog-demos/postal-logistics-wave-20261103/README.md) retains the source generator, preview and page checks, integration and lint evidence, capture settings, and visually inspected MP4. Local page generation is checked separately from deployed behavior.",
    "",
    "| id | asset | description | knobs | triangles |",
    "| --- | --- | --- | --- | ---: |",
]
for asset in rows:
    knobs = " · ".join(param["name"] for param in asset["params"])
    lines.append(
        f"| `{asset['id']}` | {asset['title']} | {asset['description']} | {knobs} | {asset['stats']['triangles']} |"
    )
lines.extend(
    [
        "",
        "## Rebuild and verify",
        "",
        "```sh",
        "python3 artifacts/catalog-demos/postal-logistics-wave-20261103/generate_postal_assets.py",
        "npx eslint catalog/ --fix",
        "npx tsx scripts/buildAssetCatalog.ts",
        "npx tsx scripts/renderCatalogPreviews.ts",
        "npx tsx scripts/buildAssetCatalog.ts",
        "npx vitest run tests/integration/catalog/",
        "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-postal-pages-wave-20261103",
        "python3 artifacts/catalog-demos/postal-logistics-wave-20261103/capture_postal_demo.py",
        "```",
        "",
        "## License and scope",
        "",
        "Every asset is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are stylized visualization props; they make no claims about throughput, machinery safety, process suitability, postal compliance, production engineering suitability, or physical acceptance.",
        "",
        "See the demo README for current production visibility and the limits of the local audit.",
        "",
    ]
)
(ROOT / "catalog" / "kits" / "postal-logistics" / "README.md").write_text("\n".join(lines))
print(f"wrote postal-logistics README for {len(rows)} indexed assets")
