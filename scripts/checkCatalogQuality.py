#!/usr/bin/env python3
"""Catalog quality gate: reject single-flat-colour assets.

WHY THIS EXISTS
---------------
The drive to a big asset count produced 1,865 assets that render as one flat
primitive. Measured across the 49 kits on 2026-11-03:

    15 kits / 525 assets  RICH   (>=1.5 material-named colour knobs per asset)
    34 kits / 1,865 assets THIN   (exactly 1 colour, 0 presets)

78% of the catalog was a single `param("color")` applied to every part of a
stack of boxes. The renderer was not at fault - one flat knob can only render
flat. Andrii: "I am not satisfied with assets, we lost in quality and color."

WHAT "RICH" MEANS
-----------------
The automated gate passes an asset when it has both:
  1. >= 2 material-named colour knobs. Material-named means the knob names the
     MATERIAL (`timber`, `bark`, `leaves`, `hardware`), not the part
     (`color`, `color2`). Generic knobs such as `color` do not count toward
     the minimum.
  2. >= 1 `presets(...)` block, so a reviewer can see two intended looks.

The reported geometry count is a review hint, not an automatic threshold. A
human still checks that the preview reads as the intended object: a fence,
crate or panel can be legitimately rectilinear, while a machine, vehicle or
building needs its real silhouette and recognizable details.

HOW TO USE
----------
    python3 scripts/checkCatalogQuality.py              # report, exit 1 if any fail
    python3 scripts/checkCatalogQuality.py --kit apiary # one kit
    python3 scripts/checkCatalogQuality.py --top 20     # worst offenders
    python3 scripts/checkCatalogQuality.py --fix-list   # bare asset paths, for a lane

Exit codes: 0 = all checked assets pass, 1 = at least one thin asset remains.
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import sys
from collections import namedtuple

Asset = namedtuple("Asset", "path kit name colours presets geometry")

# A knob that names the material rather than the part. Generic `color` is
# excluded by the quality threshold below, no matter how often it repeats.
MATERIAL_RE = re.compile(r"\.color\(\s*([A-Za-z_][\w]*)")
PARAM_RE = re.compile(r"param(?:eter)?\(\s*['\"]([^'\"]+)['\"]")
PRESET_RE = re.compile(r"\bpresets?\s*\(")
# Real silhouette work. `box()` alone is the thin pattern, but box-only is
# CORRECT for genuinely rectilinear objects (a gate, a fence panel, a crate), so
# geometry is a SECONDARY signal, not a requirement. The gate's own promoted
# apiary-gate is box-only and still good: three material colours carry it.
GEOMETRY_RE = re.compile(r"\.\b(path|loft|rotate[A-Za-z]*)\(")
# A named part shows the author thought about structure, not just one blob.
PART_RE = re.compile(r"\.part\(\s*['\"]([^'\"]+)['\"]")

GENERIC = {"color", "colour", "base", "basecolor", "main", "fill"}


def material_knobs(src: str) -> set[str]:
    """Colour knobs that name a material, plus any `param` whose name says colour."""
    found = set()
    for name in MATERIAL_RE.findall(src):
        found.add(name.lower())
    for pname in PARAM_RE.findall(src):
        low = pname.lower()
        if "color" in low or "colour" in low:
            # `color` -> generic; `panelColor` -> material-named.
            stripped = re.sub(r"^(color|colour)", "", low)
            stripped = re.sub(r"(color|colour)$", "", stripped)
            found.add(stripped or low)
    return found


def score(path: str) -> Asset:
    src = open(path, encoding="utf-8", errors="ignore").read()
    knobs = material_knobs(src)
    # Only material-named knobs count; generic colour knobs are deliberately ignored.
    named = {k for k in knobs if k not in GENERIC}
    colours = len(named)
    parts = len(set(PART_RE.findall(src)))
    geometry = len(GEOMETRY_RE.findall(src))
    return Asset(
        path=path,
        kit=os.path.basename(os.path.dirname(path)),
        name=os.path.splitext(os.path.basename(path))[0],
        colours=colours,
        presets=len(PRESET_RE.findall(src)),
        geometry=max(geometry, 1 if parts >= 4 else 0),
    )


def passes(a: Asset, min_colours: int) -> bool:
    """An asset passes on two named materials plus an intended look.

    Deliberately NOT requiring `path()`/`loft()`: a gate, crate or fence panel
    is legitimately box-only, and demanding curved geometry would reject good
    rectilinear assets. Generic `color` plus one named control still describes
    only one material choice, so generic controls do not satisfy the threshold.
    """
    return a.colours >= min_colours and a.presets >= 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="catalog/kits")
    ap.add_argument("--kit", help="check one kit only")
    ap.add_argument("--min-colours", type=int, default=2)
    ap.add_argument("--top", type=int, default=0, help="show the N worst assets")
    ap.add_argument("--fix-list", action="store_true", help="print failing paths only")
    args = ap.parse_args()

    if args.kit:
        paths = sorted(glob.glob(f"{args.root}/{args.kit}/*.kcad.ts"))
    else:
        paths = sorted(glob.glob(f"{args.root}/*/*.kcad.ts"))

    if not paths:
        print(f"no assets found under {args.root}", file=sys.stderr)
        return 1

    assets = [score(p) for p in paths]
    bad = [a for a in assets if not passes(a, args.min_colours)]

    if args.fix_list:
        for a in bad:
            print(a.path)
        return 1 if bad else 0

    by_kit: dict[str, list[Asset]] = {}
    for a in assets:
        by_kit.setdefault(a.kit, []).append(a)

    rich_kits = thin_kits = 0
    for kit, items in sorted(by_kit.items()):
        ok = [a for a in items if passes(a, args.min_colours)]
        tag = "RICH" if len(ok) == len(items) else ("THIN" if not ok else "MIXED")
        if tag == "RICH":
            rich_kits += 1
        elif tag == "THIN":
            thin_kits += 1
        if tag != "RICH" or args.top:
            avg = sum(a.colours for a in items) / len(items)
            print(f"  {tag:6} {kit:26} {len(ok):4}/{len(items):<4} "
                  f"material-controls/asset={avg:.2f}")

    total = len(assets)
    passing = len(assets) - len(bad)
    pass_rate = 100 * passing / total
    print(
        f"\n  {passing}/{total} assets pass ({pass_rate:.2f}%; "
        f"{rich_kits} rich kits, {thin_kits} thin kits)"
    )
    if bad:
        thin_rate = 100 * len(bad) / total
        print(f"  {len(bad)} thin assets = {thin_rate:.2f}% of the catalog")

    if args.top:
        print(f"\n  worst {args.top}:")
        for a in sorted(assets, key=lambda a: (a.colours, a.presets, a.geometry))[: args.top]:
            print(f"    {a.colours}c {a.presets}p {a.geometry}g  {a.path}")

    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
