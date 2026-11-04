#!/usr/bin/env python3
"""Promote a thin catalog asset to a material-separated one.

WHY THIS EXISTS
---------------
1,943 of 2,390 catalog assets render as a single flat primitive: one
`param('color')` applied to every part of a stack of `box()` calls. Measured
across all 49 kits, 34 kits are entirely thin. Andrii: "I am not satisfied with
assets, we lost in quality and color."

`scripts/checkCatalogQuality.py` is the gate for that pattern. This is the tool
that clears it, kit by kit.

WHAT IT DOES, AND WHAT IT DELIBERATELY DOES NOT
-----------------------------------------------
It is NOT a bulk search-and-replace. Blindly renaming `color` to three names
would satisfy the checker while producing a striped asset that looks worse than
the flat original, which is the exact failure mode the quality pause was about.

So the promotion is SEMANTIC: the caller supplies a material plan for each
asset, naming which parts are timber, which are metal, which are glass, and one
or two presets. The tool applies the plan, verifies the result against the same
rules the gate uses, and refuses to write an asset it cannot promote honestly.

Usage:
    # what needs work, worst kit first
    python3 scripts/promoteThinAssets.py --list

    # one asset, with an explicit plan (materials keyed by part-name substring)
    python3 scripts/promoteThinAssets.py --asset path/to/x.kcad.ts \
        --plan plans/x.json

    # verify a proposed rewrite without writing it
    python3 scripts/promoteThinAssets.py --asset path --plan p.json --dry-run

Plan format (JSON):
    {
      "knobs": {"timber": "#7e765f", "hardware": "#4a4a4e", "panel": "#8a9a7a"},
      "assign": [["post", "timber"], ["rail", "timber"], ["panel", "panel"]],
      "default": "timber",
      "presets": {"weathered": {"timber": "#6f6852"}, "creosoted": {"timber": "#4f4a3c"}}
    }
The first substring in `assign` that matches a part's name wins; `default`
covers the rest.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from checkCatalogQuality import material_knobs, passes, score  # noqa: E402

PART_RE = re.compile(r'\.part\(\s*["\']([^"\']+)["\']')


def thin_assets(root: str) -> list[str]:
    return sorted(glob.glob(f"{root}/*/*.kcad.ts"))


def apply_plan(src: str, plan: dict) -> str:
    """Rewrite one asset to use the plan's material knobs.

    The original single `color` param is replaced by one param per material. The
    `.color(x)` calls on named parts are re-pointed at the material knob that
    the plan assigns to that part. Parts the plan does not name take `default`.
    """
    knobs: dict[str, str] = plan["knobs"]
    assign: list[list[str]] = plan.get("assign", [])
    default: str = plan.get("default", next(iter(knobs)))
    presets: dict = plan.get("presets", {})

    out = src

    # 1. Replace the single generic colour knob with the material knobs.
    out = re.sub(
        r"^const\s+\w*\s*=?\s*param\(\s*['\"]colou?r['\"][^;]*;\s*$",
        "",
        out, flags=re.M,
    )
    knob_decls = "".join(
        f"const {name} = param('{name}', '{hexv}', {{ label: '{name.capitalize()}' }});\n"
        for name, hexv in knobs.items()
    )

    # 2. Re-point every `.color(<arg>)` to the material for its part.
    #    Parts are declared as `.part("name", <expr>.color(x))`, so walk the
    #    source line by line and swap the argument using the nearest part name.
    lines = out.splitlines()
    for i, line in enumerate(lines):
        m = PART_RE.search(line)
        if not m or ".color(" not in line:
            continue
        part = m.group(1).lower()
        material = default
        for needle, mat in assign:
            if needle.lower() in part:
                material = mat
                break
        lines[i] = re.sub(r"\.color\([^)]*\)", f".color({material})", line)
    out = "\n".join(lines)

    # 3. Insert the knob declarations and the presets block after `meta({...});`.
    meta_end = out.find("});")
    if meta_end == -1:
        raise SystemExit("no meta({...}) block found")
    insert_at = meta_end + len("});") + 1
    block = "\n" + knob_decls
    if presets:
        body = ",\n".join(
            f"  {name}: {{ {', '.join(f'{k}: {v!r}' for k, v in vals.items())} }},"
            for name, vals in presets.items()
        )
        block += f"\npresets({{\n{body}\n}});\n"
    out = out[:insert_at] + block + out[insert_at:]
    return out


def verify(path: str, text: str) -> tuple[bool, str]:
    """Check the rewrite against the gate's own rules before writing it."""
    if not text.strip().endswith("return") and "return" not in text:
        return False, "no return statement"
    with tempfile.NamedTemporaryFile("w", suffix=".kcad.ts", delete=False) as fh:
        fh.write(text)
        tmp = fh.name
    try:
        a = score(tmp)
        if not passes(a, 2):
            return False, f"still thin: {a.colours} colours, {a.presets} presets"
        return True, f"{a.colours} materials, {a.presets} presets"
    finally:
        os.unlink(tmp)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default="catalog/kits")
    ap.add_argument("--list", action="store_true", help="list thin assets by kit")
    ap.add_argument("--kit", help="limit to one kit")
    ap.add_argument("--asset", help="one asset path")
    ap.add_argument("--plan", help="JSON material plan")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.list:
        paths = (sorted(glob.glob(f"{args.root}/{args.kit}/*.kcad.ts"))
                 if args.kit else thin_assets(args.root))
        by_kit: dict[str, int] = {}
        for p in paths:
            if not passes(score(p), 2):
                by_kit[Path(p).parent.name] = by_kit.get(Path(p).parent.name, 0) + 1
        total = sum(by_kit.values())
        for kit, n in sorted(by_kit.items(), key=lambda x: -x[1]):
            print(f"  {n:>4}  {kit}")
        print(f"\n  {total} thin assets across {len(by_kit)} kits")
        return 0

    if not args.asset or not args.plan:
        ap.error("--asset and --plan are required unless --list")

    plan = json.loads(Path(args.plan).read_text())
    src = Path(args.asset).read_text()
    out = apply_plan(src, plan)
    ok, note = verify(args.asset, out)
    print(f"  {args.asset}: {note}")
    if not ok:
        print("  REFUSING to write: the rewrite does not pass the gate", file=sys.stderr)
        return 1
    if args.dry_run:
        print("  dry run, not written")
        return 0
    Path(args.asset).write_text(out)
    print("  written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
