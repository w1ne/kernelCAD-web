#!/usr/bin/env python3
"""Write the space exploration kit README from its generated index rows."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/space-exploration"
WAVE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = sorted((a for a in index["assets"] if a["kit"] == "space-exploration"), key=lambda a: a["id"])
triangles = [a["stats"]["triangles"] for a in rows]
ids = " ".join(a["id"] for a in rows)

lines = [
    "# Space exploration kit",
    "",
    (
        "Fifty-two original low-poly props for lunar habitats, rover mobility, "
        "spacecraft support and field science. Each source keeps its scale knob, "
        "adds two to four material-specific color controls, and offers `lunarDust` "
        "and `highVisibility` appearance presets. Beveled box profiles, lofted "
        "cylinders and shaped rover wheels clarify the silhouettes while keeping "
        f"meshes within their budgets ({min(triangles)}–{max(triangles)} triangles)."
    ),
    "",
    (
        "The [quality promotion handoff](../../../artifacts/catalog-demos/"
        "space-exploration-quality-promotion-20261105/README.md) records source "
        "changes, refreshed previews, local validation, the capture settings and "
        "an inspected MP4. The [original wave bundle](../../../artifacts/"
        "catalog-demos/space-exploration-wave-20261103/README.md) preserves the "
        "kit's initial generation evidence. Public-site behavior remains pending "
        "deployment."
    ),
    "",
    "| id | asset | description | knobs | triangles |",
    "| --- | --- | --- | --- | ---: |",
]
for row in rows:
    params = " · ".join(param["name"] for param in row["params"])
    lines.append(
        f"| `{row['id']}` | {row['title']} | {row['description']} | "
        f"{params} | {row['stats']['triangles']} |"
    )

lines += [
    "",
    "## Rebuild and verify",
    "",
    "```sh",
    "python3 artifacts/catalog-demos/space-exploration-wave-20261103/generate_space_assets.py",
    "npx tsx scripts/buildAssetCatalog.ts",
    f"npx tsx scripts/renderCatalogPreviews.ts {ids}",
    "npx tsx scripts/buildAssetCatalog.ts",
    "python3 scripts/checkCatalogQuality.py --kit space-exploration",
    "npx eslint catalog/kits/space-exploration/",
    "npx vitest run tests/integration/catalog/",
    "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-space-pages",
    "python3 artifacts/catalog-demos/space-exploration-quality-promotion-20261105/verify_space_pages.py /tmp/kernelcad-space-pages",
    "```",
    "",
    "## License and scope",
    "",
    "Every asset is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are stylized scene props; they do not claim flight readiness, pressure-vessel performance, radiation protection, thermal-vacuum qualification, mobility performance, engineering suitability or physical acceptance.",
    "",
    "See the quality promotion handoff for the deployed-site status and verification limits.",
]

(KIT / "README.md").write_text("\n".join(lines) + "\n")
print("wrote space exploration README")
