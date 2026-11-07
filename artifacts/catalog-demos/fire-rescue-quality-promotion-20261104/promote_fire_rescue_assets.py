#!/usr/bin/env python3
"""Promote the existing fire-rescue sources with material palettes and presets."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "fire-rescue"


def material(name: str, label: str, base: str, weathered: str, high_visibility: str):
    return {
        "name": name,
        "label": label,
        "base": base,
        "weathered": weathered,
        "highVisibility": high_visibility,
    }


PALETTES = {
    "vehicle": {
        "primary": material("bodyPaintColor", "Apparatus body paint", "#c93630", "#89534b", "#e77f23"),
        "secondary": material("cabPaintColor", "Cab and locker finish", "#eee7d7", "#cfc4ae", "#f4e7b1"),
        "rubber": material("tireRubberColor", "Tire rubber", "#262b2f", "#3a3b39", "#272c30"),
        "metal": material("metalworkColor", "Ladder and metalwork", "#aab6ba", "#879294", "#c5c7ab"),
    },
    "hose": {
        "primary": material("hoseFabricColor", "Hose fabric", "#c94732", "#965443", "#e17825"),
        "secondary": material("webbingColor", "Webbing and safety trim", "#dfc35b", "#b4a66c", "#f2df62"),
        "rubber": material("rubberColor", "Rubber grip", "#30363a", "#424342", "#30363a"),
        "metal": material("couplingMetalColor", "Coupling metal", "#aeb9bc", "#8c9698", "#c1c2b5"),
    },
    "ladder": {
        "primary": material("aluminumColor", "Aluminum rails", "#aeb8ba", "#899496", "#d4d2bd"),
        "secondary": material("safetyFinishColor", "Safety finish", "#e0ad32", "#ad7730", "#f2d34d"),
        "rubber": material("gripRubberColor", "Rubber feet and grips", "#2d3236", "#414342", "#2d3236"),
        "metal": material("hardwareColor", "Ladder hardware", "#68777c", "#596568", "#aeb9bc"),
    },
    "turnout": {
        "primary": material("turnoutFabricColor", "Turnout fabric", "#bd702f", "#82543b", "#d88727"),
        "secondary": material("reflectiveTapeColor", "Reflective tape", "#e7d65a", "#b9aa55", "#f4eb72"),
        "tertiary": material("sleeveFabricColor", "Sleeve and pocket fabric", "#a95f2d", "#744a34", "#c97827"),
        "metal": material("hardwareColor", "Closures and hardware", "#aeb8ba", "#858e90", "#c7c9b8"),
    },
    "helmet": {
        "primary": material("helmetShellColor", "Helmet shell", "#c73530", "#87534d", "#e38426"),
        "secondary": material("shieldColor", "Shield and visor", "#9dc2c8", "#809ea2", "#d9d4a5"),
        "rubber": material("chinStrapColor", "Chin strap", "#303539", "#424340", "#303539"),
        "metal": material("helmetHardwareColor", "Helmet hardware", "#aeb7ba", "#868f91", "#c7c8b6"),
    },
    "boots": {
        "primary": material("leatherColor", "Protective leather", "#49372c", "#3c322d", "#574433"),
        "secondary": material("cuffFabricColor", "Cuff and upper finish", "#d28b31", "#9c6d37", "#ebcb4c"),
        "rubber": material("soleRubberColor", "Sole rubber", "#292e31", "#3c3e3c", "#292e31"),
        "metal": material("hardwareColor", "Eyelets and hardware", "#aeb8ba", "#858e90", "#c5c8b8"),
    },
    "gloves": {
        "primary": material("gloveLeatherColor", "Glove leather", "#45372d", "#39322c", "#57452f"),
        "secondary": material("cuffFabricColor", "Gauntlet cuff fabric", "#c87a32", "#94653a", "#e1bd45"),
    },
    "scba": {
        "primary": material("harnessColor", "Harness webbing", "#333a3e", "#41413d", "#353a3c"),
        "secondary": material("cylinderColor", "Air-cylinder finish", "#d0b53d", "#aa923c", "#ebd456"),
        "rubber": material("hoseRubberColor", "Breathing hose", "#262b2f", "#3c3e3b", "#262b2f"),
        "metal": material("regulatorMetalColor", "Regulator hardware", "#aeb8ba", "#899294", "#c6c9b7"),
    },
    "electronics": {
        "primary": material("housingPolymerColor", "Equipment housing", "#424c54", "#4a4943", "#d07c2d"),
        "secondary": material("displayGlassColor", "Display glass", "#4c8595", "#526f76", "#69a9ae"),
        "rubber": material("gripRubberColor", "Rubber grip", "#252a2e", "#3a3c3a", "#252a2e"),
        "metal": material("metalHardwareColor", "Metal controls", "#aeb8bc", "#879194", "#c5c9b8"),
    },
    "tank": {
        "primary": material("vesselPaintColor", "Vessel paint", "#bd3b32", "#865048", "#e27a24"),
        "secondary": material("safetyBandColor", "Safety band", "#e5c84d", "#b19e48", "#f1df64"),
        "rubber": material("sealRubberColor", "Rubber seals", "#303539", "#41423f", "#303539"),
        "metal": material("steelworkColor", "Steel fittings", "#aab5b9", "#858e91", "#c4c7b7"),
    },
    "fan": {
        "primary": material("fanFramePaintColor", "Fan frame paint", "#d99029", "#916533", "#e9b632"),
        "secondary": material("lensColor", "Lamp lens", "#d4e4dc", "#b5c4bb", "#f2e5aa"),
        "rubber": material("rubberFootColor", "Rubber feet and grips", "#303539", "#41423f", "#303539"),
        "metal": material("guardMetalColor", "Guard and blade metal", "#89969b", "#6f797c", "#b9c0b6"),
    },
    "tool": {
        "primary": material("toolCoatingColor", "Tool coating", "#d98727", "#956438", "#e8b331"),
        "secondary": material("safetyMarkingColor", "Safety marking", "#c83730", "#874e49", "#f0db56"),
        "rubber": material("gripRubberColor", "Rubber grip", "#303539", "#41423f", "#303539"),
        "metal": material("steelColor", "Steel and aluminum", "#aab5b9", "#858f92", "#c3c6b6"),
    },
    "fabric": {
        "primary": material("fabricColor", "Protective fabric", "#c34b35", "#8c5545", "#d67e2d"),
        "secondary": material("safetyTrimColor", "Safety trim", "#e4cc55", "#b2a04e", "#f0df67"),
        "rubber": material("rubberGripColor", "Rubber grips", "#303539", "#41423f", "#303539"),
        "metal": material("hardwareColor", "Metal hardware", "#aeb8ba", "#858f91", "#c4c8b8"),
    },
    "nozzle": {
        "primary": material("nozzleMetalColor", "Nozzle metal", "#aeb8ba", "#858f91", "#c4c8b8"),
        "secondary": material("selectorFinishColor", "Selector finish", "#d2ad3e", "#9b7e37", "#eedb59"),
        "rubber": material("gripRubberColor", "Rubber grip", "#303539", "#41423f", "#303539"),
    },
}

VEHICLES = {
    "municipal-fire-engine", "aerial-ladder-fire-engine", "tiller-ladder-fire-truck",
    "quint-fire-apparatus", "municipal-water-tender", "heavy-rescue-fire-truck",
    "wildland-fire-engine", "wildland-brush-truck", "hazmat-response-truck",
    "fire-command-van", "fire-utility-pickup", "electric-fire-pumper",
}
HOSE_ASSETS = {
    "fire-hose-roll", "large-diameter-hose-roll", "folded-hose-pack", "hose-reel-cart",
}
NOZZLE_ASSETS = {"fire-hose-nozzle", "fog-nozzle", "smooth-bore-nozzle"}


def family_for(asset_id: str) -> str:
    if asset_id in VEHICLES:
        return "vehicle"
    if asset_id in HOSE_ASSETS:
        return "hose"
    if asset_id in NOZZLE_ASSETS:
        return "nozzle"
    if "ladder" in asset_id or asset_id == "roof-hook-pike-pole":
        return "ladder"
    if asset_id in {"structural-fire-helmet", "wildland-fire-helmet"}:
        return "helmet"
    if asset_id == "firefighter-turnout-coat" or asset_id == "firefighter-turnout-pants":
        return "turnout"
    if asset_id in {"structural-fire-boots", "firefighter-gloves"}:
        return "boots" if asset_id == "structural-fire-boots" else "gloves"
    if asset_id == "self-contained-breathing-apparatus":
        return "scba"
    if asset_id in {"firefighter-portable-radio", "personal-alert-safety-device", "thermal-imaging-camera", "firefighter-facepiece"}:
        return "electronics"
    if asset_id in {"positive-pressure-ventilation-fan", "smoke-ejector-fan", "portable-fire-scene-light"}:
        return "fan"
    if asset_id in {"collapsible-fire-water-tank", "dry-chemical-fire-extinguisher", "foam-concentrate-canister"}:
        return "tank"
    if asset_id in {"rescue-sling-harness", "firefighter-hood", "fire-blanket-canister", "folded-hose-pack"}:
        return "fabric"
    return "tool"


def role_for(family: str, part_name: str, old_finish: str) -> str:
    part = part_name.lower()
    if family == "vehicle":
        if "hub" in part or any(k in part for k in ("wheel", "tire", "tyre")):
            return "metal" if "hub" in part else "rubber"
        if any(k in part for k in ("window", "windshield")):
            return "metal"
        if any(k in part for k in ("ladder", "rung", "stabilizer", "bumper", "pump", "monitor", "frame", "axle", "handle")):
            return "metal"
        if any(k in part for k in ("crew-cab", "tiller-cab", "warning-lightbar", "compartment")):
            return "secondary"
        if "hosebed" in part:
            return "rubber"
    if family == "helmet":
        if "strap" in part:
            return "rubber"
        if any(k in part for k in ("shield", "visor")):
            return "secondary"
        if "chin" in part:
            return "rubber"
    if family == "turnout":
        if "sleeve" in part:
            return "tertiary"
        if any(k in part for k in ("reflective", "cuff", "closure")):
            return "secondary" if "reflective" in part or "cuff" in part else "metal"
        if any(k in part for k in ("sleeve", "torso", "trouser-leg", "suspender")):
            return "primary"
    if family == "boots":
        if any(k in part for k in ("sole", "boot-foot", "tread")):
            return "rubber"
        if any(k in part for k in ("cuff", "finger")):
            return "secondary"
        if "toe" in part:
            return "primary"
    if family == "gloves":
        if any(k in part for k in ("palm", "finger", "thumb")):
            return "primary"
        if "cuff" in part:
            return "secondary"
    if family == "scba":
        if "cylinder" in part:
            return "secondary"
        if "hose" in part:
            return "rubber"
        if any(k in part for k in ("valve", "regulator")):
            return "metal"
    if family == "electronics":
        if any(k in part for k in ("display", "lens", "screen", "indicator")):
            return "secondary"
        if any(k in part for k in ("grip", "strap", "case")):
            return "rubber" if "grip" in part or "strap" in part else "primary"
        if any(k in part for k in ("antenna", "knob", "port", "button", "clip", "grille")):
            return "metal"
    if family == "fan":
        if any(k in part for k in ("face", "lens", "lamp-head")):
            return "secondary"
        if any(k in part for k in ("leg", "hub", "blade", "guard", "mast", "collar")):
            return "metal"
        if any(k in part for k in ("foot", "handle")):
            return "rubber"
    if family == "hose":
        if any(k in part for k in ("coupling", "flange", "valve", "tip", "pedestal", "yoke", "barrel", "port", "swivel", "handle")):
            return "metal"
        if any(k in part for k in ("wheel", "grip", "foot", "sole")):
            return "rubber"
        if any(k in part for k in ("strap", "selector", "pistol-grip")):
            return "secondary"
    if family == "nozzle":
        if any(k in part for k in ("grip", "handle", "selector-rib")):
            return "rubber"
        if "tip" in part:
            return "secondary"
        if any(k in part for k in ("hose-tail", "nozzle-body")):
            return "primary"
    if family == "ladder":
        if "grip-band" in part or "rung" in part:
            return "secondary"
        if any(k in part for k in ("foot", "grip", "lock")):
            return "rubber"
        if any(k in part for k in ("hook", "hinge")):
            return "metal"
        if any(k in part for k in ("rail", "ladder", "shaft")):
            return "primary"
    if family == "tank":
        if any(k in part for k in ("gauge", "valve", "neck", "fitting", "outlet", "inlet", "handle", "bracket")):
            return "metal"
        if any(k in part for k in ("ring", "hose")):
            return "rubber"
        if any(k in part for k in ("squeeze-lever", "warning", "marking")):
            return "secondary"
    if family == "tool":
        if "handwheel" in part:
            return "secondary"
        if "base-feet" in part:
            return "primary"
        if any(k in part for k in ("grip", "sole", "tread", "footpad", "seal")):
            return "rubber"
        if any(k in part for k in ("steel", "metal", "rail", "rung", "coupling", "valve", "flange", "pipe", "shaft", "bracket", "hinge", "axle", "hook", "nozzle", "handle", "lever", "knob", "grille", "frame", "guard", "stand", "mast", "fitting", "stem", "pulley", "hardware")):
            return "metal"
        if any(k in part for k in ("warning", "stripe", "reflect", "marker", "status-tile", "pull-tab")):
            return "secondary"
    if old_finish == '"#30363b"':
        return "rubber"
    return "primary" if old_finish == "body" else "secondary"


def convert_rotation_syntax(source: str) -> str:
    axes = {"1, 0, 0": "X", "0, 1, 0": "Y", "0, 0, 1": "Z"}
    for vector, axis in axes.items():
        pattern = rf"\.rotate\(\[\s*{re.escape(vector)}\s*\],\s*([^()]*(?:\([^()]*\)[^()]*)*)\)"
        source = re.sub(pattern, rf".rotate{axis}(\1)", source)
    return source


def update_vehicle_detail(source: str, materials: dict[str, dict]) -> str:
    """Add visible grille and paired lamps to apparatus fronts."""
    match = re.search(r'add\("front-bumper", box\([^\n]*?\)\.translate\(([-\d.]+),\s*[-\d.]+,\s*([-\d.]+)\)', source)
    if not match:
        return source
    front_x = float(match.group(1))
    front_z = float(match.group(2))
    metal = materials["metal"]["name"]
    secondary = materials["secondary"]["name"]
    details = [
        f'add("front-grille", box(26, 220, 64, true).translate({front_x + 58:.3f}, 0, {front_z + 40:.3f}), {metal});',
        f'add("headlamp-near", box(32, 52, 38, true).translate({front_x + 48:.3f}, -165, {front_z + 38:.3f}), {secondary});',
        f'add("headlamp-far", box(32, 52, 38, true).translate({front_x + 48:.3f}, 165, {front_z + 38:.3f}), {secondary});',
    ]
    return source.replace("\nreturn p.model();", "\n" + "\n".join(details) + "\n\nreturn p.model();")


def align_ladder_platform(source: str) -> str:
    match = re.search(
        r'add\("ladder-fly", box\(([-\d.]+),[^\n]*?\.rotateY\(([-\d.]+)\)\.translate\(([-\d.]+),\s*[-\d.]+,\s*([-\d.]+)\)',
        source,
    )
    if not match:
        return source
    length, angle, center_x, center_z = map(float, match.groups())
    radians = math.radians(angle)
    end_x = center_x + math.cos(radians) * length / 2
    end_z = center_z - math.sin(radians) * length / 2
    line = re.search(r'^add\("ladder-tip-platform",[^\n]+$', source, re.M)
    if not line:
        return source
    replacement = re.sub(
        r'\.translate\([-\d.]+,\s*0,\s*[-\d.]+\)',
        f".translate({end_x:.3f}, 0, {end_z + 58:.3f})",
        line.group(0),
        count=1,
    )
    return source[:line.start()] + replacement + source[line.end():]


def add_stabilizer_jacks(source: str) -> str:
    """Join deployed outrigger feet back to the horizontal stabilizer beams."""
    if '"stabilizer-jack--1"' in source:
        return source
    if '"stabilizer-foot--1"' not in source or '"stabilizer-foot-1"' not in source:
        return source
    details = '''
add("stabilizer-jack--1", box(70, 70, 180, true).translate(-370, -377.2, 117), metalworkColor);
add("stabilizer-jack-1", box(70, 70, 180, true).translate(-370, 377.2, 117), metalworkColor);
'''
    return source.replace("\nreturn p.model();", "\n" + details + "\nreturn p.model();")


def shape_nozzle_grip(source: str) -> str:
    """Give the hose nozzle a rounded pistol grip and visible selector collar."""
    old_grip = 'add("handle", box(40, 100, 32, true).translate(-31, 0, 16), gripRubberColor);'
    new_grip = '''add("pistol-grip", cylinder(76, 23, 8).translate(-31, 0, -10), gripRubberColor);
add("selector-collar", cylinder(18, 42, 10).rotateY(90).translate(60, 0, 54), selectorFinishColor);'''
    if old_grip not in source:
        return source
    source = source.replace(old_grip, new_grip)
    source = source.replace("const groundOffset = 0;", "const groundOffset = 10;")
    source = source.replace(
        "Straight hose nozzle with hand grip, barrel and adjustable front tip.",
        "Straight fire hose nozzle with barrel, selector collar, pistol grip and adjustable front tip.",
    )
    return source


def update_coat_detail(source: str, materials: dict[str, dict]) -> str:
    if "firefighter-turnout-coat" not in source:
        return source
    secondary = materials["secondary"]["name"]
    sleeve = materials["tertiary"]["name"]
    metal = materials["metal"]["name"]
    torso_pattern = r'add\("coat-torso", box\(490, 250, 570, true\)\.translate\(0, 0, 585\), [A-Za-z]+Color\);'
    torso = """const coatProfile = (width: number, depth: number, corner: number) => path()
  .moveTo(-width / 2 + corner, -depth / 2).lineTo(width / 2 - corner, -depth / 2)
  .lineTo(width / 2, -depth / 2 + corner).lineTo(width / 2, depth / 2 - corner)
  .lineTo(width / 2 - corner, depth / 2).lineTo(-width / 2 + corner, depth / 2)
  .lineTo(-width / 2, depth / 2 - corner).lineTo(-width / 2, -depth / 2 + corner).close();
const coatTorso = coatProfile(430, 235, 44).loft(
  [coatProfile(490, 250, 48), coatProfile(448, 230, 42)],
  { planes: [
    { plane: 'XY' as const, origin: [0, 0, 300] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, 540] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, 870] as [number, number, number] },
  ], ruled: true },
);
add("coat-torso", coatTorso, turnoutFabricColor);"""
    source = re.sub(torso_pattern, torso, source, count=1)
    source = source.replace(
        'add("coat-sleeve--1", box(560, 130, 240, true).rotateX(-12).translate(0, -210, 440), sleeveFabricColor);',
        'add("coat-sleeve--1", box(450, 130, 130, true).rotateY(-35).translate(-400, 0, 730), sleeveFabricColor);',
    )
    source = source.replace(
        'add("coat-sleeve-1", box(560, 130, 240, true).rotateX(12).translate(0, 210, 440), sleeveFabricColor);',
        'add("coat-sleeve-1", box(450, 130, 130, true).rotateY(35).translate(400, 0, 730), sleeveFabricColor);',
    )
    details = [
        f'add("coat-pocket-left", box(112, 18, 88, true).translate(-125, -137, 540), {sleeve});',
        f'add("coat-pocket-right", box(112, 18, 88, true).translate(125, -137, 540), {sleeve});',
        f'add("coat-cuff-left", box(62, 150, 148, true).rotateY(-35).translate(-568, 0, 600), {secondary});',
        f'add("coat-cuff-right", box(62, 150, 148, true).rotateY(35).translate(568, 0, 600), {secondary});',
        f'add("coat-zipper-pull", box(28, 22, 38, true).translate(235, -148, 505), {metal});',
    ]
    return source.replace("\nreturn p.model();", "\n" + "\n".join(details) + "\n\nreturn p.model();")


def shape_helmet_shell(source: str) -> str:
    match = re.search(r'^add\("helmet-shell", cylinder\(170, 165, 12\)\.translate\(0, 0, 160\), ([A-Za-z]+Color)\);$', source, re.M)
    if not match:
        return source
    finish = match.group(1)
    shell = f"""const helmetRing = (radius: number, segments: number) => {{
  let profile = path().moveTo(radius, 0);
  for (let i = 1; i < segments; i++) {{
    const angle = (2 * Math.PI * i) / segments;
    profile = profile.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }}
  return profile.close();
}};
const helmetProfiles = [helmetRing(165, 12), helmetRing(150, 12), helmetRing(85, 12), helmetRing(18, 12)];
const helmetShell = helmetProfiles[0].loft(helmetProfiles.slice(1), {{
  planes: [160, 210, 290, 330].map((z) => ({{ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] }})),
  ruled: true,
}});
add("helmet-shell", helmetShell, {finish});"""
    return source[:match.start()] + shell + source[match.end():]


def promote(path: Path) -> dict:
    source = path.read_text(encoding="utf-8")
    if "presets({" in source or "bodyPaintColor" in source:
        raise ValueError(f"{path.name} is already promoted; run the original wave generator before replaying this script")
    asset_id = path.name.removesuffix(".kcad.ts")
    family = family_for(asset_id)
    palette = PALETTES[family]

    matches = list(re.finditer(r'^add\("([^\"]+)",.*?,\s*(body|accent|"#[0-9a-fA-F]{6}")\);\s*$', source, re.M))
    if not matches:
        raise ValueError(f"no generated parts found in {path}")
    assignments = {}
    part_records = []
    lines = source.splitlines()
    for i, line in enumerate(lines):
        match = re.match(r'^(\s*)add\("([^\"]+)",.*?,\s*(body|accent|"#[0-9a-fA-F]{6}")\);\s*$', line)
        if not match:
            continue
        part_name, old_finish = match.group(2), match.group(3)
        role = role_for(family, part_name, old_finish)
        if role not in palette:
            role = "primary" if old_finish == "body" else "secondary"
        part_records.append((i, old_finish, role))
        variable = palette[role]["name"]
        assignments[variable] = palette[role]
        lines[i] = line[:match.start(3)] + variable + line[match.end(3):]
    assignments.setdefault(palette["primary"]["name"], palette["primary"])
    if len(assignments) == 1:
        # Keep the original second color region meaningful when every part name
        # resolves to one physical material role (for example a boot's shaft
        # and sole). The fallback applies only to a source's explicit accent.
        candidate = next((record for record in part_records if record[1] == "accent" and record[2] != "secondary"), None)
        if candidate is not None and "secondary" in palette:
            line_index = candidate[0]
            previous = palette[candidate[2]]["name"]
            lines[line_index] = lines[line_index].replace(previous, palette["secondary"]["name"])
            assignments[palette["secondary"]["name"]] = palette["secondary"]
    if not 2 <= len(assignments) <= 4:
        raise ValueError(f"expected 2-4 used material controls for {path.name}, found {len(assignments)}: {list(assignments)}")

    source = "\n".join(lines) + "\n"
    source = re.sub(
        r"const body = param\('body', '#78828a', \{ label: 'Body color' \}\);\nconst accent = param\('accent', '#d74735', \{ label: 'Accent color' \}\);",
        "\n".join(
            f"const {item['name']} = param('{item['name']}', '{item['base']}', {{ label: '{item['label']}' }});"
            for item in assignments.values()
        ),
        source,
        count=1,
    )
    if "const body = param" in source:
        raise ValueError(f"material parameter replacement failed for {path.name}")

    material_names = list(assignments)
    weathered = ", ".join(f"{name}: '{assignments[name]['weathered']}'" for name in material_names)
    high_visibility = ", ".join(f"{name}: '{assignments[name]['highVisibility']}'" for name in material_names)
    preset_block = f"presets({{\n  weathered: {{ {weathered} }},\n  highVisibility: {{ {high_visibility} }},\n}});\n"
    insert_after = max(source.index(f"const {name} = param(") for name in material_names)
    insert_after = source.index("\n", insert_after) + 1
    source = source[:insert_after] + preset_block + source[insert_after:]
    primary = palette["primary"]["name"]
    source = source.replace("finish = body", f"finish = {primary}")

    meta_match = re.search(r"description: (\"(?:[^\"\\\\]|\\\\.)*\"),", source)
    if not meta_match:
        raise ValueError(f"description not found in {path.name}")
    description = json.loads(meta_match.group(1))
    bare = description.removesuffix(" Knobs: overall scale, body color and accent color.")
    knob_labels = ", ".join(item["label"].lower() for item in assignments.values())
    new_description = f"{bare} Material controls: {knob_labels}; weathered and highVisibility presets."
    source = source[:meta_match.start(1)] + json.dumps(new_description, ensure_ascii=False) + source[meta_match.end(1):]
    source = re.sub(r"^// Original kernelCAD low-poly .*? modeled from scratch\.$", f"// {new_description}", source, count=1, flags=re.M)
    source = convert_rotation_syntax(source)
    if family == "vehicle":
        source = update_vehicle_detail(source, palette)
        source = align_ladder_platform(source)
        if asset_id in {"aerial-ladder-fire-engine", "quint-fire-apparatus"}:
            source = add_stabilizer_jacks(source)
    if asset_id == "fire-hose-nozzle":
        source = shape_nozzle_grip(source)
    if asset_id == "firefighter-turnout-coat":
        source = update_coat_detail(source, palette)
    if family == "helmet":
        source = shape_helmet_shell(source)

    path.write_text(source, encoding="utf-8")
    return {"id": asset_id, "family": family, "materialControls": [item["name"] for item in assignments.values()], "partAssignments": len(matches)}


def update_readme() -> None:
    path = KIT / "README.md"
    readme = path.read_text(encoding="utf-8")
    readme = readme.replace(
        "Sixty original low-poly scene props for municipal and wildland apparatus, fire hose and water delivery, ladders and rescue, firefighter PPE, ventilation, and incident command. Each asset exposes `scale`, `body` and `accent` controls and declares a 2,200 triangle budget. These generic models support visual scenes; they are not engineering models, operating guidance or certified equipment.",
        "Sixty original low-poly scene props for municipal and wildland apparatus, fire hose and water delivery, ladders and rescue, firefighter PPE, ventilation, and incident command. Each source exposes overall scale and two to four material-named color controls, with `weathered` and `highVisibility` palettes. Models use millimetres and Z up, with a 2,200-triangle ceiling. They are visualization props, not engineering models, operating guidance or certified equipment.",
    )
    readme = readme.replace(
        "The [Fire & Rescue wave demo bundle](../../../artifacts/catalog-demos/fire-rescue-wave-20261102/README.md) retains the source generator, video settings, local audit evidence and inspected MP4. Local replay and software rendering do not imply deployment, simulation or hardware acceptance.",
        "The [quality promotion demo bundle](../../../artifacts/catalog-demos/fire-rescue-quality-promotion-20261104/README.md) retains the source transformation, invocation settings, rendered preview review, verification evidence and inspected MP4. The earlier [kit creation bundle](../../../artifacts/catalog-demos/fire-rescue-wave-20261102/README.md) retains the original wave generator. Local replay, geometry evaluation, software rendering and catalog-page validation do not establish deployed behavior, fireground simulation or hardware acceptance.",
    )
    readme = readme.replace(
        "Straight hose nozzle with hand grip, barrel and adjustable front tip.",
        "Straight fire hose nozzle with barrel, selector collar, pistol grip and adjustable front tip.",
    )
    readme = readme.replace(
        "| id | asset | description | knobs |",
        "| id | asset | description | material controls and presets |",
    )
    for source in sorted(KIT.glob("*.kcad.ts")):
        asset_id = source.name.removesuffix(".kcad.ts")
        src = source.read_text(encoding="utf-8")
        labels = re.findall(r"param\('[A-Za-z0-9]+Color',\s*'#[0-9a-fA-F]{6}',\s*\{ label: '([^']+)' \}\)", src)
        controls = "scale · " + " · ".join(label.lower() for label in labels) + " · weathered · highVisibility"
        row = re.compile(rf"^(\| `{re.escape(asset_id)}` \|[^\n]*? \| )scale · body · accent( \|)$", re.M)
        readme = row.sub(rf"\g<1>{controls}\g<2>", readme)
    rebuild = """## Rebuild and verify

```sh
python3 -B artifacts/catalog-demos/fire-rescue-wave-20261102/generate_fire_rescue_assets.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/fire-rescue-quality-promotion-20261104/promote_fire_rescue_assets.py
mapfile -t asset_ids < <(find catalog/kits/fire-rescue -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\\n' | sed 's/\\.kcad\\.ts$//')
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/fire-rescue/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-fire-rescue-pages
```
"""
    readme = re.sub(r"## Rebuild and verify\n\n```sh\n.*?\n```\n", lambda _: rebuild, readme, count=1, flags=re.S)
    path.write_text(readme, encoding="utf-8")


def main() -> None:
    assets = sorted(KIT.glob("*.kcad.ts"))
    if len(assets) != 60:
        raise SystemExit(f"expected 60 sources, found {len(assets)}")
    results = [promote(path) for path in assets]
    update_readme()
    print(json.dumps({"kit": "fire-rescue", "promoted": len(results), "assets": results}, indent=2))


if __name__ == "__main__":
    main()
