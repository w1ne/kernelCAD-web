#!/usr/bin/env python3
"""Promote the existing recycling-facility models with semantic materials.

The source parts are already named by their job in the machine. This script
uses those names to separate painted shells, exposed metal, rubber, glass,
concrete, warning lights and recovered material. It refuses generic or
already-promoted input rather than repeating a bulk color rename.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/recycling-facility"


def asset_id(path: Path) -> str:
    return path.name.removesuffix(".kcad.ts")

PALETTE = {
    "paintedSteel": ("Painted steel", "#4f7080"),
    "stainlessSteel": ("Stainless steel", "#a8b4b6"),
    "rubber": ("Rubber", "#303638"),
    "glass": ("Glass", "#4f9ca8"),
    "concrete": ("Concrete", "#898b83"),
    "safetyAmber": ("Safety amber", "#f0ae32"),
    "polymer": ("Polymer", "#9cbab0"),
    "recoveredMaterial": ("Recovered material", "#ae8a55"),
}

ROLE_PRIORITY = {
    "safetyAmber": 100,
    "glass": 90,
    "rubber": 80,
    "recoveredMaterial": 75,
    "polymer": 70,
    "concrete": 65,
    "stainlessSteel": 60,
}

PATTERNS: list[tuple[str, tuple[str, ...]]] = [
    ("safetyAmber", ("beacon", "warning-light", "boom-tip", "indicator")),
    ("glass", ("window", "display-face", "screen-face", "camera-pod", "view-port", "lens")),
    ("rubber", ("belt-surface", "wheel", "tyre", "tire", "grip", "liner-roll", "seal", "tread")),
    ("concrete", ("foundation", "plinth", "basin-floor", "berm", "wash-pad", "ground-anchor")),
    ("recoveredMaterial", ("bale-", "cardboard-load", "cullet-fill", "recovered-material")),
    ("polymer", ("inner-tank", "tote-body", "plastic-flake", "polymer-liner")),
    ("stainlessSteel", (
        "shaft", "roller", "drum", "pipe", "nozzle", "manifold", "valve", "ladder",
        "wire", "mesh", "pivot", "hinge", "handle", "rim", "rib", "rail", "post",
        "beam", "brace", "collar", "neck", "ring", "gauge", "cable", "rod", "foot",
        "skid", "anchor", "fork-pocket", "binding-band", "corner-cap", "screen-bed",
    )),
]

FEATURE_RULES: list[tuple[tuple[str, ...], str]] = [
    (("sensor-arch-left", "sensor-bridge"), "an overhead sensor arch and paired camera pods above the conveyor belt"),
    (("screen-drum",), "a faceted rotating screen drum, feed hopper and opposed discharge chute"),
    (("cutting-shaft-a", "cutting-shaft-b"), "twin cutting shafts between the feed hopper and discharge chute"),
    (("press-chamber",), "a press chamber, ram, upper gantry and clear discharge floor"),
    (("filter-canister-1",), "four upright filter canisters connected to a low ducted cabinet"),
    (("vessel-shell",), "a cylindrical digester with a roof vent, external ladder, and low process outlet"),
    (("spill-pallet",), "a raised-rim containment pallet beneath a cylindrical drum with twin bung fittings"),
    (("belt-surface", "head-roller"), "a long belt deck with side guides, terminal rollers and a feed chute"),
    (("screen-bed",), "a guarded screening bed with a feed hopper, discharge lip and support rollers"),
    (("boom-arm",), "a counterweighted barrier boom with a hinge drum and visible signal beacon"),
    (("roof-slab",), "a broad canopy roof carried by four open corner posts"),
    (("spray-manifold",), "an overhead wash arch with a cross-manifold and spaced spray nozzles"),
    (("rotating-weigh-deck",), "a raised vehicle deck, approach ramps and a separate scale display"),
    (("floor-pan", "side-rib-left"), "an open-top steel body with a rolled rim and side reinforcing ribs"),
    (("tipping-base",), "a deep receiving hopper with fork pockets and exposed pivot points"),
    (("bale-1",), "a compact stack of rectangular recovered-material bales held by narrow binding bands"),
    (("window-header",), "a small weighbridge kiosk with front counter, glazing and roof overhang"),
    (("support-roller-1",), "a wide screening bed on multiple rollers with a raised feed hopper"),
    (("equipment-head",), "a tall site pedestal with a hooded instrument head, antenna and service door"),
    (("platform-deck",), "an elevated inspection deck with apron, rear rail and cross-braced posts"),
    (("ramp-surface",), "a sloped approach plate with side curbs, transition plate and ground anchors"),
    (("mesh-bar-1", "top-rail"), "powder-coated corner posts framing narrow mesh bars between top and bottom rails"),
    (("front-wall", "front-rim"), "an open-top container with a broad floor pan, raised walls and perimeter rails"),
]

GENERIC_PART_WORDS = {
    "base", "body", "frame", "panel", "part", "left", "right", "front", "back",
    "a", "b", "1", "2", "3", "4",
}


def title_of(src: str, path: Path) -> str:
    match = re.search(r"title:\s*(['\"])(.*?)\1", src)
    return match.group(2) if match else path.stem.replace("-", " ").title()


def part_names(src: str) -> list[str]:
    return re.findall(r"\.part\(\s*['\"]([^'\"]+)['\"]", src)


def material_for(part: str) -> str:
    low = part.lower()
    for role, needles in PATTERNS:
        if any(needle in low for needle in needles):
            return role
    return "paintedSteel"


def choose_roles(parts: list[str]) -> dict[str, str]:
    assignments = {part: material_for(part) for part in parts}
    roles = set(assignments.values())
    if roles == {"stainlessSteel"}:
        painted_component = next((
            part for part in parts
            if any(token in part.lower() for token in ("post", "frame", "body", "base", "support", "cabinet"))
        ), parts[0] if parts else "")
        if painted_component:
            assignments[painted_component] = "paintedSteel"
            roles.add("paintedSteel")
    if len(roles) < 2 and parts:
        detail = next((
            part for part in parts
            if any(token in part.lower() for token in ("rim", "rail", "post", "foot", "handle", "cap", "hinge", "door", "band", "rib", "valve", "grip"))
        ), parts[-1])
        assignments[detail] = "stainlessSteel"
        roles.add("stainlessSteel")
    keep = {"paintedSteel"} | set(sorted(
        roles - {"paintedSteel"},
        key=lambda role: (-ROLE_PRIORITY[role], role),
    )[:3])
    return {part: role if role in keep else "paintedSteel" for part, role in assignments.items()}


def mix_hex(value: str, target: tuple[int, int, int], amount: float) -> str:
    channels = tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
    mixed = tuple(round(a * (1 - amount) + b * amount) for a, b in zip(channels, target))
    return "#" + "".join(f"{c:02x}" for c in mixed)


def distinctive_phrase(title: str, parts: list[str]) -> str:
    names = set(parts)
    for required, phrase in FEATURE_RULES:
        if all(part in names for part in required):
            return phrase
    detail = []
    for part in parts:
        words = [word for word in re.split(r"[-_]+", part) if word not in GENERIC_PART_WORDS]
        phrase = " ".join(words)
        if phrase and phrase not in detail:
            detail.append(phrase)
        if len(detail) == 3:
            break
    if not detail:
        return "separately named structural components arranged for a readable scene silhouette"
    joined = ", ".join(detail[:-1]) + (f" and {detail[-1]}" if len(detail) > 1 else detail[0])
    return f"its {joined}"


def promoted_text(path: Path, src: str) -> str | None:
    if "const color = param('color'" not in src and "presets({" in src:
        return None
    if "const color = param('color'" not in src:
        raise ValueError(f"expected the original single color knob: {path.name}")
    if "presets({" in src or "paintedSteel" in src:
        raise ValueError(f"already promoted or manually changed: {path.name}")

    old_color = re.search(r"const color = param\('color',\s*['\"](#[0-9a-fA-F]{6})['\"]", src)
    if not old_color:
        raise ValueError(f"could not read original material color: {path.name}")
    base_color = old_color.group(1).lower()
    parts = part_names(src)
    if not parts:
        raise ValueError(f"no named assembly parts: {path.name}")
    assignments = choose_roles(parts)
    used_roles = list(dict.fromkeys(assignments.values()))
    title = title_of(src, path)
    features = distinctive_phrase(title, parts)

    defaults = {role: (base_color if role == "paintedSteel" else PALETTE[role][1]) for role in used_roles}
    weathered = {
        role: mix_hex(value, (112, 107, 89), 0.32 if role == "paintedSteel" else 0.18)
        for role, value in defaults.items()
    }
    high_visibility = {}
    if "paintedSteel" in defaults:
        high_visibility["paintedSteel"] = "#d77632"
    if "safetyAmber" in defaults:
        high_visibility["safetyAmber"] = "#ffd044"
    if not high_visibility:
        role = next(role for role in used_roles if role != "paintedSteel")
        high_visibility[role] = mix_hex(defaults[role], (223, 137, 47), 0.22)

    knob_lines = [
        f"const {role} = param('{role}', '{defaults[role]}', {{ label: '{PALETTE[role][0]}' }});"
        for role in used_roles
    ]
    presets_block = "presets({\n  weathered: { " + ", ".join(f"{role}: '{value}'" for role, value in weathered.items()) + " },\n  highVisibility: { " + ", ".join(f"{role}: '{value}'" for role, value in high_visibility.items()) + " },\n});"
    description = (
        f"{title}: {features}. Low-poly visualization prop. "
        f"Material controls: {', '.join(PALETTE[role][0].lower() for role in used_roles)}."
    )

    # Give every source a comment tied to its actual silhouette and components.
    src = re.sub(
        r"^// Original low-poly recycling-facility scene prop, millimetres, Z up\.$",
        f"// {title}: {features}. Low-poly visualization geometry in millimetres, Z up.",
        src,
        count=1,
        flags=re.M,
    )
    src, description_count = re.subn(
        r"description:\s*['\"][^\n]*?['\"],",
        "description: " + json.dumps(description) + ",",
        src,
        count=1,
    )
    if description_count != 1:
        raise ValueError(f"could not update asset description: {path.name}")

    src = re.sub(
        r"^const color = param\('color',\s*['\"]#[0-9a-fA-F]{6}['\"],\s*\{ label: 'Asset color' \}\);\s*$",
        "\n".join(knob_lines) + "\n" + presets_block,
        src,
        count=1,
        flags=re.M,
    )
    for part, role in assignments.items():
        line_re = re.compile(rf"(\.part\(\s*['\"]{re.escape(part)}['\"].*?)\.color\(color\)(\))")
        src, changed = line_re.subn(rf"\1.color({role})\2", src, count=1)
        if changed != 1:
            raise ValueError(f"could not assign {part} to {role} in {path.name}")

    if re.search(r"\.part\([^\n]*\.color\(color\)", src):
        raise ValueError(f"left generic color assignments behind: {path.name}")

    # Existing cylinders identify drums, rollers, valves, gauges and other
    # fittings. Make their shoulders visible with a four-ring ruled loft.
    if re.search(r"\.part\([^\n]*\b(?:c|cy)\(", src):
        support = """const ngon = (r:number,s:number) => {
  let p = path().moveTo(r * Math.cos(Math.PI / 2), r * Math.sin(Math.PI / 2));
  for (let k = 1; k < s; k++) {
    const a = Math.PI / 2 + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const loftCylinder = (h:number,r:number,s:number) => {
  const levels = [0, h * 0.06, h * 0.94, h];
  const radii = [r * 0.9, r, r, r * 0.9];
  const profiles = levels.map((_, i) => ngon(radii[i], s));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
"""
        c_re = re.compile(r"^const c = .*;$", re.M)
        cy_re = re.compile(r"^const cy = .*;$", re.M)
        src, has_c = c_re.subn(
            "const c = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).translate(x,y,z).scale(scale);",
            src,
            count=1,
        )
        src, has_cy = cy_re.subn(
            "const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);",
            src,
            count=1,
        )
        if not (has_c or has_cy):
            raise ValueError(f"cylinder call has no c/cy helper to detail: {path.name}")
        helper = re.search(r"^const (?:c|cy) = ", src, re.M)
        if not helper:
            raise ValueError(f"could not locate cylinder helper after rewrite: {path.name}")
        src = src[:helper.start()] + support + src[helper.start():]

    return src


def enhance_model(path: Path, src: str) -> str | None:
    """Align faceted profiles and refine the cart and digester silhouettes."""
    original = src
    src, move_count = re.subn(
        r"let p = path\(\)\.moveTo\(r, 0\);",
        "let p = path().moveTo(r * Math.cos(Math.PI / 2), r * Math.sin(Math.PI / 2));",
        src,
    )
    src, angle_count = re.subn(
        r"const a = \(2 \* Math\.PI \* k\) / s;",
        "const a = Math.PI / 2 + (2 * Math.PI * k) / s;",
        src,
    )

    if asset_id(path) == "front-load-dumpster-lid":
        src = src.replace(
            "// Front-load container lid: its cart, lip and push handle. Low-poly visualization geometry in millimetres, Z up.",
            "// Front-load wheeled container: raised lid, exposed push handle, front ribs and four ground-contact wheels. Low-poly visualization geometry in millimetres, Z up.",
        )
        src = src.replace('title: "Front-load container lid",', 'title: "Front-load wheeled container",')
        src = src.replace(
            "Front-load container lid: its cart, lip and push handle.",
            "Front-load wheeled container: a tall cart body with a separate raised lid, visible rear push handle and four ground-contact wheels.",
        )
        part_replacements = {
            "top-lid": 'p.part("top-lid", b(0,0,894,1205,800,62).color(paintedSteel));',
            "lid-hinge": 'p.part("lid-hinge", b(0,365,884,1180,38,34).color(stainlessSteel));',
            "front-rib-left": 'p.part("front-rib-left", b(-398,-378,185,28,24,560).color(stainlessSteel));',
            "front-rib-right": 'p.part("front-rib-right", b(398,-378,185,28,24,560).color(stainlessSteel));',
            "push-handle-left": 'p.part("push-handle-left", b(-493,370,894,65,65,420).color(stainlessSteel));',
            "push-handle-right": 'p.part("push-handle-right", b(493,370,894,65,65,420).color(stainlessSteel));',
            "handle-grip": 'p.part("handle-grip", b(0,370,1255,1058,70,65).color(rubber));',
        }
        for name, replacement in part_replacements.items():
            pattern = re.compile(rf"^p\.part\(\"{re.escape(name)}\", .*?\);$", re.M)
            if name in {"top-lid", "lid-hinge", "front-rib-left", "front-rib-right"}:
                if f'"{name}"' in src:
                    continue
                anchor = 'p.part("cart-body",'
                if anchor not in src:
                    raise ValueError("could not add lid and front ribs to the front-load container")
                src = src.replace(anchor, replacement + "\n" + anchor, 1)
            else:
                src, changed = pattern.subn(replacement, src, count=1)
                if changed != 1:
                    raise ValueError(f"could not expose {name} on the front-load container")

    if asset_id(path) != "anaerobic-digester-tank" or "access-ladder-left-rail" in src:
        return src if src != original else None
    ladder = re.compile(r'^p\.part\("access-ladder", .*\);\n', re.M)
    src, removed = ladder.subn("", src, count=1)
    if removed != 1:
        raise ValueError("could not replace the digester's hidden side ladder")
    cy_helper = re.search(r"^const cy = .*;$", src, re.M)
    if not cy_helper:
        raise ValueError("digester has no horizontal-cylinder helper for ladder rungs")
    src = src[:cy_helper.end()] + "\nconst rung = (x:number,y:number,z:number,len:number,r:number,s:number) => loftCylinder(len,r,s).rotateY(90).translate(x,y,z).scale(scale);" + src[cy_helper.end():]
    ladder_parts = """p.part("access-ladder-left-rail", b(-140,-445,300,36,46,1050).color(stainlessSteel));
p.part("access-ladder-right-rail", b(140,-445,300,36,46,1050).color(stainlessSteel));
for (let i = 0; i < 6; i++) {
  p.part(`access-ladder-rung-${i + 1}`, rung(-140,-480,420 + i * 150,280,16,8).color(stainlessSteel));
}
"""
    insertion = 'p.part("outlet-pipe",'
    if insertion not in src:
        raise ValueError("could not find a visible insertion point for digester ladder")
    src = src.replace(insertion, ladder_parts + insertion, 1)
    src = src.replace(
        "cylindrical process vessel with roof fittings, access hardware and a low outlet",
        "cylindrical digester with a roof vent, external ladder, and low process outlet",
    )
    src = src.replace(
        "a cylindrical process vessel with roof fittings, access hardware and a low outlet",
        "a cylindrical digester with a roof vent, external ladder, and low process outlet",
    )
    return src if src != original else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", nargs="*", help="promote only these asset ids")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    paths = sorted(KIT.glob("*.kcad.ts"))
    if args.ids:
        wanted = set(args.ids)
        paths = [path for path in paths if asset_id(path) in wanted]
        if {asset_id(path) for path in paths} != wanted:
            raise SystemExit(f"unknown asset id(s): {', '.join(sorted(wanted - {asset_id(p) for p in paths}))}")
    if len(paths) != 153 and not args.ids:
        raise SystemExit(f"expected 153 existing assets, found {len(paths)}")

    changed = []
    for path in paths:
        source = path.read_text()
        output = promoted_text(path, source)
        if output is None:
            output = enhance_model(path, source)
        else:
            output = enhance_model(path, output)
        if output is None:
            print(f"already promoted {path.name}")
            continue
        if args.dry_run:
            print(f"would promote {path.name}")
        else:
            path.write_text(output)
            changed.append(asset_id(path))
    if not args.dry_run:
        print(f"promoted {len(changed)} existing assets: {', '.join(changed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
