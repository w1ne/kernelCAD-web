#!/usr/bin/env python3
"""Promote the existing farm-machinery assets with semantic materials and forms.

This is a source transformation with explicit component-name rules. It preserves
all existing IDs, scales, and triangle budgets. The two grain-handling machines
with visibly separated source sections receive purpose-built connected layouts.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/farm-machinery"

MATERIALS = {
    "paintedSteel": ("Painted steel", "#397747"),
    "steel": ("Exposed steel", "#929b9b"),
    "rubber": ("Rubber", "#292e2d"),
    "glass": ("Cab glass", "#6d9ca4"),
    "cropMaterial": ("Crop material", "#b59a54"),
    "polymer": ("Polymer", "#c4c4ad"),
    "fabric": ("Upholstery", "#544b43"),
    "safetyMarking": ("Safety marking", "#e4b13e"),
}

DEFAULTS = {name: spec[1] for name, spec in MATERIALS.items()}
WEATHERED = {
    "paintedSteel": "#53694d", "steel": "#737d7b", "rubber": "#252927",
    "glass": "#54757b", "cropMaterial": "#947d49", "polymer": "#aaa995",
    "fabric": "#49433c", "safetyMarking": "#bd8d36",
}
HIGH_VISIBILITY = {
    "paintedSteel": "#db762c", "steel": "#abb2ad", "rubber": "#292e2d",
    "glass": "#79aeb4", "cropMaterial": "#d0ae4f", "polymer": "#e2dfc2",
    "fabric": "#665846", "safetyMarking": "#ffd13f",
}

ROLE_PATTERNS: list[tuple[str, tuple[str, ...]]] = [
    ("rubber", ("tire", "tyre", "wheel", "track", "tread", "belt-surface", "hose")),
    ("glass", ("glazing", "window", "windscreen", "cab-glass", "lens", "display")),
    ("cropMaterial", ("grain-feed", "grain-load", "grain-fill", "bale-load", "crop-load", "cotton-load", "silage-load")),
    ("polymer", ("plastic", "polymer", "film", "tank-liner", "hose-reel")),
    ("fabric", ("seat", "cushion", "upholstery", "canopy-fabric")),
    ("safetyMarking", ("beacon", "reflector", "warning", "safety", "marker-lamp", "indicator")),
    ("steel", (
        "axle", "hub", "shaft", "roller", "chain", "rail", "standard", "hitch",
        "blade", "sweep", "share", "moldboard", "tine", "tooth", "spoke", "pin",
        "clevis", "bracket", "spindle", "spear", "fork", "guard", "truss", "web",
        "strut", "ladder", "vent", "beater", "spinner", "nozzle", "valve", "rim",
        "pivot", "weight", "grille", "exhaust", "auger", "cutting-edge", "disc",
        "motor", "crossmember", "support-rail", "support-leg", "seed-tube", "row-unit",
    )),
]

PAINTED_PARTS = (
    "frame", "chassis", "toolbar", "drawbar", "fender", "hood", "bonnet", "cowling",
    "cab-roof", "cab-floor", "platform", "hopper", "bucket", "scoop", "grain-body",
    "spreader-bin", "tank", "bunker", "wagon-side", "wagon-floor", "wagon-front",
    "wagon-rear", "body", "shell", "deck", "mast", "loader-arm", "wing", "panel",
    "compartment", "hopper-lid", "support-base", "crossbar", "water-main", "feed-chute",
)

ROLE_PRIORITY = ["rubber", "glass", "steel", "cropMaterial", "polymer", "fabric", "safetyMarking"]

PROFILE_PARTS = (
    "engine-hood", "bonnet", "engine-cover", "cowling", "hopper", "bucket", "scoop",
    "grain-body", "grain-box", "grain-cover", "seed-hopper", "fertilizer-hopper",
    "chemical-tank", "sprayer-tank", "sprayer-tank", "storage-bunker", "spreader-bin",
    "baler-chamber", "bale-chamber", "wagon-front", "wagon-rear", "back-shell", "bowl-side",
    "moldboard", "row-snout", "snout-", "scraper-bowl", "grain-dryer", "drying-column",
)

ADD_START = re.compile(r"^(\s*add\(\s*)(['\"])([^'\"]+)(['\"]),\s*(.*);\s*$")
META_TITLE = re.compile(r"title:\s*(['\"])(.*?)\1")
META_DESC = re.compile(r"description:\s*(['\"])(.*?)\1,")


def split_top_level(value: str) -> list[str]:
    pieces: list[str] = []
    start = 0
    depth = 0
    quote = ""
    escape = False
    for i, char in enumerate(value):
        if quote:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == quote:
                quote = ""
            continue
        if char in "'\"`":
            quote = char
        elif char in "([{":
            depth += 1
        elif char in ")]}" and depth:
            depth -= 1
        elif char == "," and depth == 0:
            pieces.append(value[start:i].strip())
            start = i + 1
    pieces.append(value[start:].strip())
    return pieces


def part_role(name: str, legacy_finish: str | None) -> str:
    low = name.lower()
    if any(token in low for token in ("hub", "track-frame", "track-roller", "wheel-rim")):
        return "steel"
    if any(token in low for token in PAINTED_PARTS):
        return "paintedSteel"
    for role, needles in ROLE_PATTERNS:
        if any(needle in low for needle in needles):
            return role
    return "paintedSteel"


def title_and_description(src: str, path: Path) -> tuple[str, str]:
    title_match = META_TITLE.search(src)
    description_match = META_DESC.search(src)
    title = title_match.group(2) if title_match else path.stem.replace("-", " ").title()
    description = description_match.group(2) if description_match else title
    description = re.sub(r"\s*Knobs:.*$", "", description).rstrip(". ")
    return title, description


def profile_helper() -> str:
    return """const slopedPrism = (width:number, depth:number, height:number) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const inset = width * 0.16;
  return path().moveTo(-halfWidth, -halfHeight)
    .lineTo(halfWidth, -halfHeight)
    .lineTo(halfWidth - inset, halfHeight)
    .lineTo(-halfWidth + inset, halfHeight)
    .close().extrude(depth).rotate([1, 0, 0], 90).translate(0, depth / 2, 0);
};
"""


def profile_shape(name: str, shape: str) -> tuple[str, bool]:
    low = name.lower()
    if not any(token in low for token in PROFILE_PARTS):
        return shape, False
    box_match = re.search(r"box\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*true\s*\)", shape)
    if not box_match:
        return shape, False
    width, depth, height = box_match.groups()
    return shape[:box_match.start()] + f"slopedPrism({width}, {depth}, {height})" + shape[box_match.end():], True


def attach_front_weight(src: str) -> tuple[str, bool]:
    hood = re.search(
        r"add\(['\"]engine-hood['\"],\s*slopedPrism\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)\.translate\(\s*([\d.]+),\s*[^,]+,\s*([\d.]+)\)",
        src,
    )
    weight = re.search(
        r"(?P<prefix>add\(['\"]front-weight-block['\"],\s*box\()(?P<width>[\d.]+)(?P<comma1>,\s*)(?P<depth>[\d.]+)(?P<comma2>,\s*)(?P<height>[\d.]+)(?P<between>,\s*true\s*\)\.translate\()(?P<x>[\d.]+)(?P<middle>,\s*[^,]+,\s*)(?P<z>[\d.]+)(?P<suffix>\))",
        src,
    )
    if not hood or not weight:
        return src, False
    hood_width = float(hood.group(1))
    hood_height = float(hood.group(3))
    hood_center_x = float(hood.group(4))
    hood_center_z = float(hood.group(5))
    new_width = max(float(weight.group("width")), 250)
    new_height = max(float(weight.group("height")), 150)
    new_center_x = hood_center_x + hood_width / 2 + 80
    new_center_z = hood_center_z - hood_height / 2 + 40
    replacement = (
        weight.group("prefix") + f"{new_width:g}" + weight.group("comma1")
        + weight.group("depth") + weight.group("comma2") + f"{new_height:g}"
        + weight.group("between") + f"{new_center_x:g}" + weight.group("middle")
        + f"{new_center_z:g}" + weight.group("suffix")
    )
    src = src[:weight.start()] + replacement + src[weight.end():]
    return src, True


def attach_rear_hitch(src: str) -> tuple[str, bool]:
    frame = None
    for frame_name in ("rear-frame", "main-chassis"):
        frame = re.search(
            rf"add\(['\"]{frame_name}['\"],\s*box\(\s*([\d.]+),\s*[\d.]+,\s*([\d.]+),\s*true\s*\)\.translate\(\s*(-?[\d.]+),\s*[^,]+,\s*(-?[\d.]+)\)",
            src,
        )
        if frame:
            break
    hitch = re.search(
        r"(?P<prefix>add\(['\"]rear-hitch['\"],\s*box\()(?P<width>[\d.]+)(?P<comma1>,\s*)(?P<depth>[\d.]+)(?P<comma2>,\s*)(?P<height>[\d.]+)(?P<between>,\s*true\s*\)\.translate\()(?P<x>-?[\d.]+)(?P<middle>,\s*[^,]+,\s*)(?P<z>-?[\d.]+)(?P<suffix>\))",
        src,
    )
    if not frame or not hitch:
        return src, False
    frame_width, frame_height, frame_center_x, frame_center_z = map(float, frame.groups())
    hitch_width, hitch_height = float(hitch.group("width")), float(hitch.group("height"))
    new_x = frame_center_x - frame_width / 2 - hitch_width / 2 + 45
    new_z = frame_center_z - frame_height / 2 - hitch_height / 2 + 45
    replacement = (
        hitch.group("prefix") + hitch.group("width") + hitch.group("comma1")
        + hitch.group("depth") + hitch.group("comma2") + hitch.group("height")
        + hitch.group("between") + f"{new_x:g}" + hitch.group("middle")
        + f"{new_z:g}" + hitch.group("suffix")
    )
    src = src[:hitch.start()] + replacement + src[hitch.end():]
    return src, True


def lower_ground_tool_standards(src: str) -> tuple[str, int]:
    pattern = re.compile(
        r"(add\(['\"]standard-[^'\"]+['\"],\s*box\(\s*[\d.]+,\s*[\d.]+,\s*([\d.]+),\s*true\s*\)\.translate\([^,]+,\s*[^,]+,\s*)([\d.]+)(\))"
    )

    def lower(match: re.Match[str]) -> str:
        height = float(match.group(2))
        return match.group(1) + f"{height / 2 + 30:g}" + match.group(4)

    return pattern.subn(lower, src)


def raise_moldboard_standards_to_share(src: str) -> tuple[str, int]:
    pattern = re.compile(
        r"(add\(['\"]standard-[^'\"]+['\"],\s*box\(\s*[\d.]+,\s*[\d.]+,\s*([\d.]+),\s*true\s*\)\.translate\([^,]+,\s*[^,]+,\s*)([\d.]+)(\))"
    )

    def raise_to_share(match: re.Match[str]) -> str:
        center = float(match.group(3))
        return match.group(1) + f"{center + 10:g}" + match.group(4)

    return pattern.subn(raise_to_share, src)


def param_block(roles: list[str]) -> str:
    declarations = [
        f"const {role}Color = param('{role}Color', '{DEFAULTS[role]}', {{ label: '{MATERIALS[role][0]}' }});"
        for role in roles
    ]
    weathered = ", ".join(f"{role}Color: '{WEATHERED[role]}'" for role in roles)
    visible = ", ".join(f"{role}Color: '{HIGH_VISIBILITY[role]}'" for role in roles)
    return "\n".join(declarations) + "\npresets({\n" + f"  weathered: {{ {weathered} }},\n" + f"  highVisibility: {{ {visible} }},\n" + "});\n"


def rewrite_standard_asset(path: Path, src: str) -> tuple[str, dict]:
    title, description = title_and_description(src, path)
    add_records = []
    profile_count = 0
    for line in src.splitlines():
        match = ADD_START.match(line)
        if not match:
            continue
        prefix, quote, name, _, rest = match.groups()
        args = split_top_level(rest[:-1]) if rest.endswith(")") else split_top_level(rest)
        if len(args) not in (1, 2):
            raise ValueError(f"unexpected add() syntax in {path.name}: {line}")
        shape = args[0]
        legacy_finish = args[1] if len(args) == 2 else None
        add_records.append({"line": line, "prefix": prefix, "quote": quote, "name": name, "shape": shape, "legacy": legacy_finish})

    if not add_records:
        raise ValueError(f"no named add() calls in {path.name}")

    roles_by_part = {record["name"]: part_role(record["name"], record["legacy"]) for record in add_records}
    if len(set(roles_by_part.values())) < 2:
        fallback = next((
            r["name"] for r in add_records
            if any(token in r["name"].lower() for token in (
                "frame", "base", "support", "crossbar", "shaft", "bar", "beam", "drawbar", "hitch",
            ))
        ), add_records[-1]["name"])
        roles_by_part[fallback] = "steel"
    selected_roles = {"paintedSteel"}
    candidates = set(roles_by_part.values()) - {"paintedSteel"}
    asset_id = path.name.removesuffix(".kcad.ts")
    if asset_id in {"farm-grain-auger", "portable-grain-conveyor"}:
        candidates.add("cropMaterial")
    for role in ROLE_PRIORITY:
        if role in candidates and len(selected_roles) < 4:
            selected_roles.add(role)
    if len(selected_roles) < 2:
        selected_roles.add("steel")
    ordered_roles = ["paintedSteel"] + [r for r in ROLE_PRIORITY if r in selected_roles]
    if not 2 <= len(ordered_roles) <= 4:
        raise ValueError(f"expected 2–4 material controls for {path.name}, got {ordered_roles}")

    rewritten = []
    profile_used = False
    for line in src.splitlines():
        match = ADD_START.match(line)
        if not match:
            rewritten.append(line)
            continue
        prefix, quote, name, _, _ = match.groups()
        record = next(r for r in add_records if r["line"] == line)
        role = roles_by_part[name]
        if role not in selected_roles:
            role = "paintedSteel"
        shape, used_profile = profile_shape(name, record["shape"])
        profile_used = profile_used or used_profile
        rewritten.append(f"{prefix}{quote}{name}{quote}, {shape}, {role}Color);")

    src = "\n".join(rewritten) + "\n"
    src = re.sub(r"^const body = param\('body',.*?\);\s*$", "", src, flags=re.M)
    src = re.sub(r"^const accent = param\('accent',.*?\);\s*$", "", src, flags=re.M)
    src = src.replace("finish = body", "finish = paintedSteelColor")
    insert_point = src.find("const p = assembly(")
    if insert_point < 0:
        raise ValueError(f"assembly declaration missing in {path.name}")
    declarations = param_block(ordered_roles)
    helper = profile_helper() if profile_used else ""
    src = src[:insert_point] + declarations + helper + src[insert_point:]
    src, weight_attached = attach_front_weight(src)
    src, hitch_attached = attach_rear_hitch(src)
    src, standards_lowered = lower_ground_tool_standards(src)
    standards_grounded = 0
    if path.stem == "moldboard-plow":
        src, standards_grounded = raise_moldboard_standards_to_share(src)

    material_labels = ", ".join(MATERIALS[role][0].lower() for role in ordered_roles)
    new_description = f"{description}. Editable scale and {material_labels} controls with weathered and high-visibility presets."
    src, desc_count = META_DESC.subn("description: " + json.dumps(new_description) + ",", src, count=1)
    if desc_count != 1:
        raise ValueError(f"description metadata missing in {path.name}")
    comment = f"// {description}."
    src, comment_count = re.subn(r"^// Original kernelCAD low-poly .*? scene prop, modeled from scratch\.$", comment, src, count=1, flags=re.M)
    if comment_count != 1:
        src = comment + "\n" + src
    src = re.sub(r"\n{3,}", "\n\n", src)
    info = {
        "roles": ordered_roles, "profile": profile_used, "parts": len(add_records),
        "frontWeightAttached": weight_attached, "rearHitchAttached": hitch_attached,
        "standardsLowered": standards_lowered,
        "standardsRaisedToShare": standards_grounded,
    }
    return src, info


def replace_add_block(src: str, new_lines: list[str]) -> str:
    start = src.find("const add =")
    end = src.find("\nreturn p.model();", start)
    if start < 0 or end < 0:
        raise ValueError("could not find add helper and return boundary")
    helper_end = src.find("\n", start)
    return src[:helper_end + 1] + "\n".join(new_lines) + src[end:]


def grain_auger_parts() -> list[str]:
    return [
        "add('intake-hopper', slopedPrism(620, 420, 360).translate(0, -1050, 300), paintedSteelColor);",
        "add('inclined-auger-tube', cylinder(2500, 78, 16).rotate([1, 0, 0], -38).translate(0, -1050, 420), steelColor);",
        "add('auger-inlet-collar', cylinder(120, 92, 16).rotate([1, 0, 0], -38).translate(0, -1058, 415), paintedSteelColor);",
        "add('discharge-head', box(220, 250, 180, true).rotate([1, 0, 0], -38).translate(0, 895, 1945), paintedSteelColor);",
        "add('support-rail-left', box(55, 2700, 55, true).rotate([1, 0, 0], 38).translate(-128, 14, 1112), steelColor);",
        "add('support-rail-right', box(55, 2700, 55, true).rotate([1, 0, 0], 38).translate(128, 14, 1112), steelColor);",
        "add('wheel-axle', cylinder(680, 34, 12).rotate([0, 1, 0], 90).translate(-340, -850, 140), steelColor);",
        "add('transport-wheel-left', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(-390, -850, 140), rubberColor);",
        "add('transport-wheel-right', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(320, -850, 140), rubberColor);",
        "add('lower-crossmember', box(500, 65, 65, true).translate(0, -850, 500), steelColor);",
        "add('support-leg-left', box(55, 55, 340, true).translate(-128, -850, 330), steelColor);",
        "add('support-leg-right', box(55, 55, 340, true).translate(128, -850, 330), steelColor);",
        "add('grain-feed', box(360, 150, 110, true).translate(0, -980, 475), cropMaterialColor);",
    ]


def grain_conveyor_parts() -> list[str]:
    rollers = []
    for i in range(8):
        t = 180 + i * 305
        y = -1085 + t * 0.788
        z = 410 + t * 0.616
        rollers.append(
            f"add('belt-roller-{i}', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, {y:.1f}, {z:.1f}), steelColor);"
        )
    return [
        "add('intake-hopper', slopedPrism(800, 420, 360).translate(0, -1080, 280), paintedSteelColor);",
        "add('inclined-belt-bed', box(880, 2600, 85, true).rotate([1, 0, 0], 38).translate(0, -100, 1180), paintedSteelColor);",
        "add('rubber-conveyor-belt', box(760, 2500, 26, true).rotate([1, 0, 0], 38).translate(0, -100, 1235), rubberColor);",
        "add('side-rail-left', box(60, 2600, 135, true).rotate([1, 0, 0], 38).translate(-455, -100, 1230), steelColor);",
        "add('side-rail-right', box(60, 2600, 135, true).rotate([1, 0, 0], 38).translate(455, -100, 1230), steelColor);",
        *rollers,
        "add('discharge-chute', slopedPrism(300, 260, 250).rotate([1, 0, 0], 38).translate(0, 940, 1940), paintedSteelColor);",
        "add('transport-axle', cylinder(1080, 34, 12).rotate([0, 1, 0], 90).translate(-540, -850, 140), steelColor);",
        "add('transport-wheel-left', cylinder(75, 145, 12).rotate([0, 1, 0], 90).translate(-590, -850, 145), rubberColor);",
        "add('transport-wheel-right', cylinder(75, 145, 12).rotate([0, 1, 0], 90).translate(515, -850, 145), rubberColor);",
        "add('support-leg-left', box(60, 60, 570, true).translate(-400, -850, 285), steelColor);",
        "add('support-leg-right', box(60, 60, 570, true).translate(400, -850, 285), steelColor);",
        "add('wheel-crossmember', box(850, 70, 70, true).translate(0, -850, 570), steelColor);",
        "add('grain-feed', box(480, 180, 130, true).translate(0, -1050, 510), cropMaterialColor);",
    ]


def apply_signature_repair(path: Path, src: str) -> tuple[str, bool]:
    asset_id = path.name.removesuffix(".kcad.ts")
    if asset_id == "farm-grain-auger":
        src = replace_add_block(src, grain_auger_parts())
        return src.replace("const slopedPrism", "const slopedPrism", 1), True
    if asset_id == "portable-grain-conveyor":
        src = replace_add_block(src, grain_conveyor_parts())
        return src, True
    return src, False


def promote_asset(path: Path, dry_run: bool = False) -> dict:
    original = path.read_text(encoding="utf-8")
    if "presets({" in original:
        raise ValueError(f"refusing already-promoted source: {path.name}")
    promoted, info = rewrite_standard_asset(path, original)
    promoted, signature_repaired = apply_signature_repair(path, promoted)
    info["signatureRepair"] = signature_repaired
    if "presets({" not in promoted or "paintedSteelColor" not in promoted:
        raise ValueError(f"missing color controls or presets in {path.name}")
    if not dry_run:
        path.write_text(promoted, encoding="utf-8")
    return info


def update_readme(dry_run: bool = False) -> None:
    readme = KIT / "README.md"
    src = readme.read_text(encoding="utf-8")
    src = re.sub(
        r"^Sixty original low-poly agricultural scene assets.*?^\| --- \| --- \| --- \| --- \|$",
        "Sixty original low-poly agricultural scene assets spanning tractors, loader attachments, soil preparation, planting, crop care, hay and forage, harvesting, grain handling and irrigation. Sources use millimetres, Z up and base origins at ground level. Each asset exposes a material-specific palette and weathered / high-visibility presets, with its existing 2,200 triangle budget. They are stylized scene props, not equipment fit, safety or performance specifications.\n\nThe [farm machinery wave demo bundle](../../../artifacts/catalog-demos/farm-machinery-wave-20261102/README.md) retains the original source generator, video settings and audit evidence. The [quality-promotion bundle](../../../artifacts/catalog-demos/farm-machinery-quality-promotion-20261105/README.md) records the material and silhouette improvements, rendered previews, checks and inspected walkthrough.\n\n| id | asset | description | knobs |\n| --- | --- | --- | --- |",
        src,
        count=1,
        flags=re.M | re.S,
    )
    rows = []
    for line in src.splitlines():
        if not line.startswith("| `") or line.count("|") < 5:
            rows.append(line)
            continue
        cells = line.split("|")
        asset_id = cells[1].strip().strip("`")
        asset_path = KIT / f"{asset_id}.kcad.ts"
        if not asset_path.is_file():
            rows.append(line)
            continue
        asset_src = asset_path.read_text(encoding="utf-8")
        labels = re.findall(r"label:\s*['\"]([^'\"]+)['\"]", asset_src)
        material_labels = [label for label in labels if label != "Overall scale"]
        if material_labels:
            cells[4] = " " + " · ".join(["scale", *[label.lower() for label in material_labels]]) + " "
        rows.append("|".join(cells))
    src = "\n".join(rows) + "\n"
    if not dry_run:
        readme.write_text(src, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--kit", default="farm-machinery")
    args = parser.parse_args()
    if args.kit != "farm-machinery":
        parser.error("this promotion script is scoped to the farm-machinery kit")
    files = sorted(KIT.glob("*.kcad.ts"))
    if len(files) != 60:
        raise SystemExit(f"expected the existing 60 farm-machinery assets, found {len(files)}")
    roles: Counter[str] = Counter()
    profiles = repairs = weights = hitches = standards = 0
    for path in files:
        info = promote_asset(path, dry_run=args.dry_run)
        roles.update(info["roles"])
        profiles += int(info["profile"])
        repairs += int(info["signatureRepair"])
        weights += int(info["frontWeightAttached"])
        hitches += int(info["rearHitchAttached"])
        standards += info["standardsLowered"]
    update_readme(dry_run=args.dry_run)
    print(f"assets={len(files)} materials={dict(sorted(roles.items()))} profile_shapes={profiles} layout_repairs={repairs} attached_front_weights={weights} attached_rear_hitches={hitches} ground_tools_connected={standards} dry_run={args.dry_run}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
