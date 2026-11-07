#!/usr/bin/env python3
"""Compare the rendered scale-1.2 mesh to its indexed default asset."""

import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
default = next(row for row in index["assets"] if row["kit"] == "grid-substation" and row["id"] == "substation-main-power-transformer")
log = (BUNDLE / "parameter-variant-render-output.txt").read_text(encoding="utf-8").splitlines()
variant = next(json.loads(line) for line in log if line.startswith("{"))
default_bounds = default["stats"]["sizeM"]
variant_bounds = variant["sizeM"]
ratios = [round(new / old, 4) for old, new in zip(default_bounds, variant_bounds)]
audit = {
    "asset": variant["id"],
    "defaultScale": 1.0,
    "variantScale": variant["scale"],
    "defaultTriangles": default["stats"]["triangles"],
    "variantTriangles": variant["triangles"],
    "triangleBudget": variant["budget"],
    "defaultMaterials": default["stats"]["materials"],
    "variantMaterials": variant["materials"],
    "defaultBoundsM": default_bounds,
    "variantBoundsM": variant_bounds,
    "boundsRatios": ratios,
    "variantKnobs": variant["knobs"],
}
audit["variantWithinBudget"] = 0 < variant["triangles"] <= variant["budget"] <= 1800
audit["oneMaterial"] = variant["materials"] == 1
audit["scaleChangesBounds"] = all(1.15 <= ratio <= 1.25 for ratio in ratios)
audit["passed"] = audit["variantWithinBudget"] and audit["oneMaterial"] and audit["scaleChangesBounds"]
target = BUNDLE / "parameter-variant-audit.json"
target.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
print(json.dumps(audit, indent=2))
if not audit["passed"]:
    raise SystemExit(f"parameter variant audit failed; see {target}")
