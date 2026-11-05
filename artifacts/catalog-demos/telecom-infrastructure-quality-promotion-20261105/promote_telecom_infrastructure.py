#!/usr/bin/env python3
"""Promote existing telecom infrastructure sources in place.

Adds material-specific controls and named appearance presets to every source,
then repairs several high-value silhouettes: reflector dishes, a tapered mast,
guy wires, a triangulated tower section, a reel, and a hollow equipment shelter.
No catalog IDs are added.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/telecom-infrastructure"
ASSET_RE = re.compile(r"p\.part\(([\"'])([^\"']+)\1, (.+)\.color\(color\)\);$")
DESCRIPTION_RE = re.compile(r"description: (\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')")
TITLE_RE = re.compile(r"title: (\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')")
DESCRIPTION_OVERRIDES = {
    "fiber-coil-reel": "Compact fiber slack reel with twin flanges, a projecting center hub and a jacketed cable bundle.",
    "fiber-service-loop-rack": "Wall rack with two open fiber service hoops and four narrow retaining fingers.",
}

MATERIALS = {
    "galvanizedSteel": {
        "label": "Galvanized steel",
        "default": "#77868d",
        "fieldSite": "#8f9b9b",
        "highVisibility": "#3a4b51",
    },
    "powderCoat": {
        "label": "Powder-coated steel",
        "default": "#318b96",
        "fieldSite": "#52756b",
        "highVisibility": "#e0aa18",
    },
    "stainlessSteel": {
        "label": "Stainless steel",
        "default": "#d2dbdc",
        "fieldSite": "#d0d9d6",
        "highVisibility": "#e4e9e6",
    },
    "polymer": {
        "label": "Engineering polymer and cable jacket",
        "default": "#315267",
        "fieldSite": "#263a37",
        "highVisibility": "#27363c",
    },
    "rubber": {
        "label": "Elastomer seals and pads",
        "default": "#282d30",
        "fieldSite": "#292e2d",
        "highVisibility": "#252a2c",
    },
    "copper": {
        "label": "Copper conductor",
        "default": "#c27836",
        "fieldSite": "#a96d37",
        "highVisibility": "#c4823c",
    },
    "aluminum": {
        "label": "Aluminum reflector",
        "default": "#c2cacc",
        "fieldSite": "#aeb9b9",
        "highVisibility": "#d4dada",
    },
    "concrete": {
        "label": "Concrete foundation",
        "default": "#a29a8d",
        "fieldSite": "#8e8b83",
        "highVisibility": "#a7a59d",
    },
}


def role_for(name: str) -> str:
    n = name.lower()
    if any(word in n for word in ("seal", "gasket", "pad", "boot", "bumper")):
        return "rubber"
    if any(word in n for word in ("ground", "bonding", "busbar", "rod-", "terminal-")):
        return "copper"
    if any(word in n for word in ("radome", "connector", "port-", "insulator", "puck", "whip", "gland", "dome", "intake")):
        return "polymer"
    if any(word in n for word in ("bolt", "screw", "lock", "latch", "clamp", "collar", "sleeve", "fastener")):
        return "stainlessSteel"
    if any(word in n for word in ("body", "box", "cabinet", "case", "shell", "door", "lid", "roof", "hood", "top", "panel", "inset", "cap", "face", "floor", "rear", "left", "right", "curb", "base", "skirt", "cover", "plate", "rim", "dome")):
        return "powderCoat"
    return "galvanizedSteel"


def quoted_value(match: re.Match[str]) -> str:
    value = match.group(1)
    return json.loads(value) if value.startswith('"') else value[1:-1]


def span_helper() -> list[str]:
    return [
        "const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, r: number) => {",
        "  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;",
        "  const length = Math.hypot(dx, dy, dz);",
        "  return cylinder(length, r, 8)",
        "    .rotateY(Math.atan2(dx, dz) * 180 / Math.PI)",
        "    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)",
        "    .translate(x0, y0, z0).scale(scale);",
        "};",
    ]


def polygon_helper() -> list[str]:
    return [
        "const ngon = (r: number, s: number) => {",
        "  let profile = path().moveTo(r, 0);",
        "  for (let i = 1; i < s; i++) {",
        "    const a = 2 * Math.PI * i / s;",
        "    profile = profile.lineTo(r * Math.cos(a), r * Math.sin(a));",
        "  }",
        "  return profile.close();",
        "};",
    ]


def enhancements(asset_id: str) -> tuple[set[str], dict[str, list[str]], list[str]]:
    """Return extra material roles, replacements, and appended source lines."""
    roles: set[str] = set()
    replacements: dict[str, list[str]] = {}
    appended: list[str] = []

    if asset_id in {"microwave-dish-antenna", "rooftop-microwave-dish"}:
        roles.add("aluminum")
        radius, center_z = (360, 830) if asset_id == "microwave-dish-antenna" else (310, 1100)
        replacements["dish-rim"] = []
        old_face = "dish-face" if asset_id == "microwave-dish-antenna" else "dish"
        replacements[old_face] = []
        appended = polygon_helper() + [
            f"p.part('reflector', ngon({radius}, 16).loft([ngon({radius - 36}, 16)], {{ spacing: 22, ruled: true }})",
            f"  .rotateX(90).translate(0, -20, {center_z}).scale(scale).color(aluminum));",
        ]

    elif asset_id == "monopole-mast":
        replacements["shaft-lower"] = []
        replacements["shaft-upper"] = []
        appended = polygon_helper() + [
            "p.part('tapered-shaft', ngon(46, 12).loft([ngon(34, 12)], {",
            "  planes: [",
            "    { plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },",
            "    { plane: 'XY' as const, origin: [0, 0, 1950] as [number, number, number] },",
            "  ],",
            "  ruled: true,",
            "}).translate(0, 0, 50).scale(scale).color(galvanizedSteel));",
        ]

    elif asset_id == "guy-wire-mast-anchor":
        for part in ("guy-a", "guy-b", "guy-c"):
            replacements[part] = []
        appended = span_helper() + [
            "p.part('guy-a', span(-330, -190, 30, 0, 0, 820, 10).color(galvanizedSteel));",
            "p.part('guy-b', span(330, -190, 30, 0, 0, 820, 10).color(galvanizedSteel));",
            "p.part('guy-c', span(0, 380, 30, 0, 0, 820, 10).color(galvanizedSteel));",
        ]

    elif asset_id == "lattice-mast-section":
        replacements["brace-a"] = []
        appended = span_helper() + [
            "p.part('brace-front-a', span(-200, -220, 90, 200, -220, 1080, 15).color(galvanizedSteel));",
            "p.part('brace-front-b', span(200, -220, 90, -200, -220, 1080, 15).color(galvanizedSteel));",
            "p.part('brace-rear-a', span(-200, 220, 90, 200, 220, 1080, 15).color(galvanizedSteel));",
            "p.part('brace-rear-b', span(200, 220, 90, -200, 220, 1080, 15).color(galvanizedSteel));",
        ]

    elif asset_id == "rooftop-tripod-mast":
        replacements.update({"leg-front": [], "leg-left": [], "leg-right": []})
        appended = span_helper() + [
            "p.part('leg-front', span(0, -330, 30, 0, 0, 805, 18).color(galvanizedSteel));",
            "p.part('leg-left', span(-286, 165, 30, 0, 0, 805, 18).color(galvanizedSteel));",
            "p.part('leg-right', span(286, 165, 30, 0, 0, 805, 18).color(galvanizedSteel));",
        ]

    elif asset_id == "fiber-coil-reel":
        roles.update({"galvanizedSteel", "polymer"})
        replacements["flange-front"] = [
            "p.part('flange-front', annulus(24, 250, 160).rotateX(90).translate(0, 140, 350).scale(scale).color(powderCoat));"
        ]
        replacements["flange-back"] = [
            "p.part('flange-back', annulus(24, 250, 160).rotateX(90).translate(0, -116, 350).scale(scale).color(powderCoat));"
        ]
        replacements["hub"] = [
            "p.part('hub', cylinder(300, 78, 10).rotateX(90).translate(0, 150, 350).scale(scale).color(stainlessSteel));"
        ]
        for i in range(4):
            replacements[f"spoke-{i}"] = []
        appended = [
            f"p.part('spoke-{i}', box(380, 18, 20, true).rotateY({i * 45}).translate(0, 148, 350).scale(scale).color(galvanizedSteel));"
            for i in range(4)
        ]
        appended += [
            "p.part('fiber-bundle', annulus(180, 185, 155).rotateX(90).translate(0, 90, 350).scale(scale).color(polymer));"
        ]

    elif asset_id == "fiber-service-loop-rack":
        replacements["loop-left"] = [
            "p.part('loop-left', annulus(40, 190, 174).rotateX(90).translate(0, -150, 300).scale(scale).color(polymer));"
        ]
        replacements["loop-right"] = [
            "p.part('loop-right', annulus(40, 190, 174).rotateX(-90).translate(0, 150, 300).scale(scale).color(polymer));"
        ]
        for i, y in enumerate((-220, -75, 70, 215)):
            replacements[f"finger-{i}"] = [
                f"p.part('finger-{i}', b(0, {y}, 240, 42, 30, 440).color(galvanizedSteel));"
            ]

    elif asset_id == "microwave-backhaul-shelter":
        replacements["shell"] = [
            "p.part('rear-wall', b(0, 550, 90, 1500, 50, 2100).color(powderCoat));",
            "p.part('left-wall', b(-725, 0, 90, 50, 1100, 2100).color(powderCoat));",
            "p.part('right-wall', b(725, 0, 90, 50, 1100, 2100).color(powderCoat));",
        ]

    elif asset_id == "cable-ladder-section":
        roles.add("polymer")
        appended = [
            f"p.part('cable-jacket-{name}', b(0, {y}, 85, 1450, 22, 22).color(polymer));"
            for name, y in (("a", -100), ("b", 0), ("c", 100))
        ]

    elif asset_id == "cable-tray-elbow":
        roles.add("polymer")
        appended = [
            "p.part('cable-run-a', b(-280, -70, 82, 900, 18, 18).color(polymer));",
            "p.part('cable-run-a-2', b(-280, 70, 82, 900, 18, 18).color(polymer));",
            "p.part('cable-run-b', b(150, 280, 82, 18, 900, 18).color(polymer));",
            "p.part('cable-run-b-2', b(410, 280, 82, 18, 900, 18).color(polymer));",
        ]

    elif asset_id == "conduit-riser-frame":
        roles.add("polymer")
        appended = [
            f"p.part('cable-band-{i}', cylinder(12, 45, 8).translate({x}, 0, 480).scale(scale).color(polymer));"
            for i, x in enumerate((-210, 0, 210))
        ]

    elif asset_id == "waveguide-bridge":
        roles.add("polymer")
        appended = [
            f"p.part('waveguide-jacket-{i}', b(0, {y}, 615, 1750, 42, 24).color(polymer));"
            for i, y in enumerate((-125, 0, 125))
        ]

    return roles, replacements, appended


def material_declarations(roles: list[str]) -> list[str]:
    lines = []
    for role in roles:
        spec = MATERIALS[role]
        lines.append(
            f"const {role} = param('{role}', '{spec['default']}', {{ label: '{spec['label']}' }});"
        )
    lines += ["presets({", "  fieldSite: {"]
    lines += [f"    {role}: '{MATERIALS[role]['fieldSite']}'," for role in roles]
    lines += ["  },", "  highVisibility: {"]
    lines += [f"    {role}: '{MATERIALS[role]['highVisibility']}'," for role in roles]
    lines += ["  },", "});"]
    return lines


def promote(path: Path) -> tuple[list[str], dict[str, int]]:
    text = path.read_text()
    asset_id = path.stem.removesuffix(".kcad")
    title_match = TITLE_RE.search(text)
    desc_match = DESCRIPTION_RE.search(text)
    if not title_match or not desc_match:
        raise ValueError(f"{path}: missing metadata title or description")
    title, description = quoted_value(title_match), quoted_value(desc_match)
    description = description.replace(" Knobs: overall scale and asset color.", "")
    description = DESCRIPTION_OVERRIDES.get(asset_id, description)
    extra_roles, replacements, appended = enhancements(asset_id)

    lines = text.splitlines()
    header = f"// {title}: {description.rstrip('.')}"
    lines[1] = header

    out: list[str] = []
    used: set[str] = set(extra_roles)
    part_roles: dict[str, str] = {}
    found_parts: set[str] = set()
    for line in lines:
        if "const color = param('color'" in line:
            continue
        match = ASSET_RE.search(line)
        if match:
            part_name = match.group(2)
            found_parts.add(part_name)
            if part_name in replacements:
                out.extend(replacements[part_name])
                for replacement in replacements[part_name]:
                    role_match = re.search(r"\.color\(([A-Za-z_][A-Za-z0-9_]*)\)", replacement)
                    if role_match:
                        used.add(role_match.group(1))
                continue
            role = role_for(part_name)
            part_roles[part_name] = role
            used.add(role)
            quote, shape = match.group(1), match.group(3)
            out.append(f"p.part({quote}{part_name}{quote}, {shape}.color({role}));")
            continue
        out.append(line)

    missing = set(replacements) - found_parts
    if missing:
        raise ValueError(f"{path}: replacement parts not found: {sorted(missing)}")

    # These all-metal structures still need two useful surface controls. Split
    # contrasting weather finish from the load-bearing stock by component role.
    if len(used) < 2:
        candidates = ("rung-0", "rung-1", "backplate", "tray", "base", "panel")
        candidate = next((name for name in candidates if name in part_roles), None)
        if candidate is None:
            candidate = next(iter(part_roles))
        old_role = part_roles[candidate]
        alternate = "powderCoat" if old_role != "powderCoat" else "galvanizedSteel"
        used.add(alternate)
        part_roles[candidate] = alternate
        for i, line in enumerate(out):
            if f"'{candidate}'" in line or f'"{candidate}"' in line:
                out[i] = line.replace(f".color({old_role})", f".color({alternate})")
                break

    if not 2 <= len(used) <= 4:
        raise ValueError(f"{path}: material roles outside 2–4: {sorted(used)}")

    # Rewrite the user-facing parameter summary from the controls actually used.
    material_text = ", ".join(MATERIALS[role]["label"].lower() for role in sorted(used))
    description = f"{description} Knobs: overall scale; {material_text}."
    lines = [line for line in out]
    for i, line in enumerate(lines):
        if line.lstrip().startswith("description:"):
            indent = line[: len(line) - len(line.lstrip())]
            lines[i] = f"{indent}description: {json.dumps(description)},"
            break

    # Tighten the upper bound to leave honest headroom for the enhanced shapes.
    lines = [line.replace("triangleBudget: 2200", "triangleBudget: 900") for line in lines]

    # Insert controls/presets after the existing scale knob.
    for i, line in enumerate(lines):
        if "const scale = param(" in line:
            lines[i + 1:i + 1] = [""] + material_declarations(sorted(used)) + [""]
            break
    else:
        raise ValueError(f"{path}: scale parameter not found")

    # Geometry helpers must appear before p.part calls that use them.
    helper_lines: list[str] = []
    if "const span =" in "\n".join(appended):
        helper_lines = span_helper() + [""]
    if "const ngon =" in "\n".join(appended):
        helper_lines = polygon_helper() + [""]
    if "annulus(" in "\n".join(appended) or any("annulus(" in line for lineset in replacements.values() for line in lineset):
        helper_lines = [
            "const annulus = (depth: number, outer: number, inner: number) =>",
            "  cylinder(depth, outer, 12).subtract(cylinder(depth + 2, inner, 12).translate(0, 0, -1));",
            "",
        ]
    if helper_lines:
        for i, line in enumerate(lines):
            if line.startswith("const p = assembly("):
                lines[i:i] = helper_lines
                break

    # Place additions after all original and replacement parts, before return.
    if appended:
        if helper_lines:
            appended = [line for line in appended if line not in helper_lines]
        for i, line in enumerate(lines):
            if line == "return p.model();":
                lines[i:i] = [""] + appended + [""]
                break

    for helper in ("b", "c"):
        has_call = any(
            re.search(rf"\b{helper}\(", line) and not line.lstrip().startswith(f"const {helper} =")
            for line in lines
        )
        if not has_call:
            lines = [line for line in lines if not line.lstrip().startswith(f"const {helper} =")]

    final_text = "\n".join(lines).rstrip() + "\n"
    stats = {
        "materials": len(used),
        "presetEntries": len(used) * 2,
        "parts": len(re.findall(r"\bp\.part\(", final_text)),
    }
    path.write_text(final_text)
    return sorted(used), stats


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="only report the scope without editing")
    parser.add_argument("--recolor-existing", action="store_true", help="apply the current material palette to already-promoted sources")
    args = parser.parse_args()
    paths = sorted(KIT.glob("*.kcad.ts"))
    if len(paths) != 56:
        raise SystemExit(f"expected 56 existing sources, found {len(paths)}")
    if args.check:
        print(f"{len(paths)} existing telecom sources would be promoted in place")
        return 0

    if args.recolor_existing:
        palette = {
            "#75848a": MATERIALS["galvanizedSteel"]["default"],
            "#647d84": MATERIALS["powderCoat"]["default"],
            "#bbc5c7": MATERIALS["stainlessSteel"]["default"],
            "#263a42": MATERIALS["polymer"]["default"],
            "#343738": MATERIALS["rubber"]["default"],
            "#b2783e": MATERIALS["copper"]["default"],
            "#c0c9ca": MATERIALS["aluminum"]["default"],
            "#96938a": MATERIALS["concrete"]["default"],
            "#85918e": MATERIALS["galvanizedSteel"]["fieldSite"],
            "#c5cecd": MATERIALS["stainlessSteel"]["fieldSite"],
            "#a96d37": MATERIALS["copper"]["fieldSite"],
            "#aeb9b9": MATERIALS["aluminum"]["fieldSite"],
            "#8e8b83": MATERIALS["concrete"]["fieldSite"],
            "#dce2e1": MATERIALS["stainlessSteel"]["highVisibility"],
            "#c4823c": MATERIALS["copper"]["highVisibility"],
            "#d4dada": MATERIALS["aluminum"]["highVisibility"],
            "#a7a59d": MATERIALS["concrete"]["highVisibility"],
        }
        for path in paths:
            text = path.read_text()
            for old, new in palette.items():
                text = text.replace(old, new)
            path.write_text(text)
        print(f"recolored {len(paths)} already-promoted sources with the current palette")
        return 0

    audit: dict[str, object] = {"assetsPromoted": len(paths), "assets": {}}
    for path in paths:
        roles, stats = promote(path)
        audit["assets"][path.stem.removesuffix(".kcad")] = {"materials": roles, **stats}  # type: ignore[index]
    print(json.dumps(audit, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
