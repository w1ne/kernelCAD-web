#!/usr/bin/env python3
"""Compare the built scale-1.25 mesh with its indexed default mesh."""
import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
index = json.loads((ROOT / "catalog" / "index.json").read_text(encoding="utf-8"))
default = next(row for row in index["assets"] if row["kit"] == "amusement-park" and row["id"] == "park-observation-wheel")
log = (BUNDLE / "parameter-variant-audit-output.txt").read_text(encoding="utf-8").splitlines()
variant = next(json.loads(line) for line in log if line.startswith("{"))
default_bounds = default["stats"]["sizeM"]
variant_bounds = variant["sizeM"]
ratios = [round(new / old, 4) for old, new in zip(default_bounds, variant_bounds)]
audit = {
    "asset": "park-observation-wheel",
    "defaultScale": 1.0,
    "variantScale": 1.25,
    "defaultTriangles": default["stats"]["triangles"],
    "variantTriangles": variant["triangles"],
    "defaultMaterials": default["stats"]["materials"],
    "variantMaterials": variant["materials"],
    "defaultBoundsM": default_bounds,
    "variantBoundsM": variant_bounds,
    "boundsRatios": ratios,
    "variantKnobs": variant["knobs"],
    "variantWithinBudget": 0 < variant["triangles"] <= variant["budget"] <= 1800,
    "oneMaterial": variant["materials"] == 1,
    "scaleChangesBounds": all(1.2 <= ratio <= 1.3 for ratio in ratios),
}
audit["passed"] = audit["variantWithinBudget"] and audit["oneMaterial"] and audit["scaleChangesBounds"]
target = BUNDLE / "parameter-variant-audit.json"
target.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
print(json.dumps(audit, indent=2))
if not audit["passed"]:
    raise SystemExit(f"parameter variant audit failed; see {target}")
