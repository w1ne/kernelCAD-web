#!/usr/bin/env python3
"""Create a retained source copy with the scale parameter set to 1.2."""
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
source = ROOT / "catalog" / "kits" / "shipyard" / "shipyard-block-transporter.kcad.ts"
text = source.read_text(encoding="utf-8")
old = 'param("scale", 1, '
if text.count(old) != 1:
    raise SystemExit("expected exactly one default scale parameter in shipyard-block-transporter")
variant = text.replace(old, 'param("scale", 1.2, ', 1)
target = BUNDLE / "parameter-variant" / "shipyard" / "shipyard-block-transporter.kcad.ts"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(variant, encoding="utf-8")
print(f"wrote {target.relative_to(ROOT)}")
