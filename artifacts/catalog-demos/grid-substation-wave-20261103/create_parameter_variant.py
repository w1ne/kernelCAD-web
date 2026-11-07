#!/usr/bin/env python3
"""Retain a scale-1.2 copy of one catalog source for the parameter demo."""

from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
source = ROOT / "catalog/kits/grid-substation/substation-main-power-transformer.kcad.ts"
text = source.read_text(encoding="utf-8")
old = 'param("scale", 1, '
if text.count(old) != 1:
    raise SystemExit("expected exactly one default scale parameter in the transformer source")
variant = text.replace(old, 'param("scale", 1.2, ', 1)
target = BUNDLE / "parameter-variant/grid-substation/substation-main-power-transformer.kcad.ts"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(variant, encoding="utf-8")
print(f"wrote {target.relative_to(ROOT)}")
