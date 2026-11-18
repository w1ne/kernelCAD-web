#!/usr/bin/env python3
"""Promote the existing airfield assets with semantic materials and presets.

The migration keeps all 40 catalog IDs. It refuses generic or previously
promoted sources, assigns colors by named component, and adds a windshield
surface to vehicle cabs with a box-shaped cab primitive.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/airfield"
OUT = Path(__file__).resolve().parent

GROUPS: dict[str, tuple[str, ...]] = {
    "airframe": (
        "amphibious-seaplane", "biplane", "cargo-aircraft", "high-wing-bush-plane",
        "narrowbody-airliner", "private-jet", "regional-jet", "sailplane",
        "single-engine-trainer", "twin-engine-trainer", "ultralight-trike",
        "widebody-airliner",
    ),
    "helicopter": ("firefighting-helicopter", "rescue-helicopter", "utility-helicopter"),
    "ground-vehicle": (
        "aircraft-fuel-truck", "airport-fire-engine", "apron-shuttle-bus",
        "baggage-tractor", "belt-loader", "catering-truck", "deicing-truck",
        "lavatory-service-truck", "pushback-tug", "runway-sweeper",
    ),
    "vehicle-equipment": (
        "aircraft-maintenance-lift", "passenger-boarding-stairs", "passenger-jet-bridge",
    ),
    "baggage-train": ("baggage-cart-train",),
    "building": ("aircraft-hangar", "airport-control-tower", "terminal-gate-front"),
    "misc": (
        "aircraft-uld-container", "aircraft-wheel-chocks", "approach-lighting-array",
        "precision-approach-indicator", "runway-edge-light", "runway-threshold-light-array",
        "taxiway-guidance-sign", "windsock-mast",
    ),
}

PALETTES: dict[str, dict[str, tuple[str, str]]] = {
    "airframe": {
        "airframePaint": ("Airframe paint", "#eeeae0"),
        "canopyGlass": ("Canopy glass", "#76b6c0"),
        "bareMetal": ("Bare aluminium", "#aab5b8"),
        "rubber": ("Tyre rubber", "#292f32"),
    },
    "helicopter": {
        "airframePaint": ("Airframe paint", "#d74432"),
        "canopyGlass": ("Cockpit glass", "#78b9c3"),
        "bareMetal": ("Rotor and hardware metal", "#9ca9ad"),
    },
    "ground-vehicle": {
        "vehiclePaint": ("Vehicle paint", "#d9ae27"),
        "windshieldGlass": ("Windshield glass", "#72b1bd"),
        "stainlessSteel": ("Stainless steel", "#a9b4b6"),
        "rubber": ("Tyre and belt rubber", "#282e31"),
    },
    "vehicle-equipment": {
        "powderCoat": ("Powder-coated steel", "#d6a72d"),
        "galvanizedSteel": ("Galvanized steel", "#89989c"),
        "rubber": ("Tyre rubber", "#292f32"),
    },
    "baggage-train": {
        "tractorPaint": ("Tractor paint", "#557d59"),
        "trailerPaint": ("Trailer paint", "#e2b535"),
        "galvanizedSteel": ("Galvanized steel", "#89969a"),
        "rubber": ("Tyre rubber", "#292f32"),
    },
    "building": {
        "cladding": ("Metal cladding", "#cbd0ca"),
        "roofMetal": ("Roof metal", "#59696e"),
        "concrete": ("Concrete", "#92938d"),
        "glass": ("Glazing", "#79bac5"),
    },
    "misc": {
        # Per-asset controls are selected below to keep each asset at 2–4.
    },
}

MISC_PALETTES: dict[str, dict[str, tuple[str, str]]] = {
    "aircraft-uld-container": {
        "aluminium": ("Aluminium", "#b6c0c1"),
        "polymer": ("Polymer pallet", "#566f72"),
        "steel": ("Steel fittings", "#7d898d"),
    },
    "aircraft-wheel-chocks": {
        "safetyPaint": ("High-visibility paint", "#e76f32"),
        "ropeFabric": ("Rope fabric", "#343a3d"),
    },
    "approach-lighting-array": {
        "galvanizedSteel": ("Galvanized steel", "#8c999c"),
        "lensGlass": ("Optical glass", "#e8c766"),
    },
    "precision-approach-indicator": {
        "galvanizedSteel": ("Galvanized steel", "#818f93"),
        "lensGlass": ("Optical glass", "#e8e2ce"),
        "housingPaint": ("Housing paint", "#53666a"),
    },
    "runway-edge-light": {
        "castAluminium": ("Cast aluminium", "#98a5a8"),
        "lensGlass": ("Optical glass", "#e8c76c"),
        "concrete": ("Concrete base", "#858780"),
    },
    "runway-threshold-light-array": {
        "aluminium": ("Aluminium bar", "#8e9b9e"),
        "redLens": ("Red optical glass", "#c84036"),
        "greenLens": ("Green optical glass", "#4c9b62"),
    },
    "taxiway-guidance-sign": {
        "reflectiveFilm": ("Reflective sign film", "#d7b83d"),
        "galvanizedSteel": ("Galvanized steel", "#8d999b"),
        "concrete": ("Concrete feet", "#858780"),
    },
    "windsock-mast": {
        "galvanizedSteel": ("Galvanized steel", "#879497"),
        "fabric": ("Windsock fabric", "#e15b34"),
        "reflectiveFilm": ("Reflective fabric", "#eee5cf"),
    },
}

PRIMARY_SWATCHES = {
    "aircraft-fuel-truck": "#d9ae27",
    "airport-fire-engine": "#d93a31",
    "apron-shuttle-bus": "#4b7892",
    "baggage-tractor": "#d5af32",
    "belt-loader": "#e4b22c",
    "catering-truck": "#d7d9d1",
    "deicing-truck": "#d8b32a",
    "lavatory-service-truck": "#4c9caa",
    "runway-sweeper": "#c9a52b",
    "firefighting-helicopter": "#d93a31",
    "rescue-helicopter": "#d9b02d",
    "utility-helicopter": "#e5e4da",
    "biplane": "#b94b40",
    "high-wing-bush-plane": "#d6b33d",
    "single-engine-trainer": "#d8ddd9",
    "twin-engine-trainer": "#d8ddd9",
    "ultralight-trike": "#e0b53b",
    "private-jet": "#ebe9e0",
    "narrowbody-airliner": "#e9e8df",
    "regional-jet": "#e9e8df",
    "widebody-airliner": "#e9e8df",
    "cargo-aircraft": "#507a99",
    "amphibious-seaplane": "#558aa0",
    "sailplane": "#e3e2da",
}

RULES: dict[str, list[tuple[str, str]]] = {
    "airframe": [
        (r"canopy|cockpit", "canopyGlass"),
        (r"wheel(?!-strut)", "rubber"),
        (r"strut|gear|engine|prop-hub|rotor-hub|float-strut", "bareMetal"),
    ],
    "helicopter": [
        (r"cockpit", "canopyGlass"),
        (r"rotor|skid|strut|cable|hook|bucket|hoist", "bareMetal"),
    ],
    "ground-vehicle": [
        (r"windscreen", "windshieldGlass"),
        (r"wheel|belt|brush", "rubber"),
        (r"chassis|frame|tow-bar|support|axle|mast|rail|step|hose|reel|boom|pivot|nozzle", "stainlessSteel"),
    ],
    "vehicle-equipment": [
        (r"wheel", "rubber"),
        (r"step-|guardrail|platform|stair|handrail", "galvanizedSteel"),
    ],
    "baggage-train": [
        (r"trailer-\d+-load", "trailerPaint"),
        (r"wheel", "rubber"),
        (r"bed|chassis", "galvanizedSteel"),
    ],
    "building": [
        (r"window|glazing", "glass"),
        (r"roof|ridge|canopy", "roofMetal"),
        (r"base|shaft|pier|apron|rear-wall", "concrete"),
        (r"door-header|wall|cladding|service", "cladding"),
    ],
}

DESCRIPTION_UPDATES = {
    "aircraft-hangar": "Open-front apron hangar with side and rear walls, a pitched gable roof, ridge cap and a clear aircraft-door opening.",
    "airport-control-tower": "Air traffic control tower with a tapered concrete shaft, glazed observation cab and broad roof cap.",
    "airport-fire-engine": "Airport rescue truck with a pale crew cab, red equipment body, roof monitor, raised metallic ladder, heavy axles and metal compartment doors.",
    "aircraft-fuel-truck": "Runway refueller with a rounded tank, distinct driver cab, hose reel and four heavy tyres.",
    "terminal-gate-front": "Terminal gate facade with two concrete piers, a glazed passenger opening, projecting canopy and apron slab.",
    "runway-threshold-light-array": "Portable runway threshold bar with a low aluminium base and alternating red and green optical lamps.",
}

GEOMETRY_REPLACEMENTS = {
    "aircraft-hangar": (
        'p.part("roof", box(700, 600, 34, true).translate(0, 0, 317).scale(scale).color(color));',
        'p.part("roof", path().moveTo(-350, 300).lineTo(0, 392).lineTo(350, 300).lineTo(350, 282).lineTo(-350, 282).close().extrude(600).rotateX(90).translate(0, 300, 0).scale(scale).color(color));',
    ),
    "airport-control-tower": (
        'p.part("shaft", box(150, 150, 540, true).translate(0, 0, 410).scale(scale).color(color));',
        'p.part("shaft", squareProfile(174).loft(squareProfile(126), { spacing: 540, ruled: true }).translate(0, 0, 140).scale(scale).color(color));',
    ),
}

GEOMETRY_EXTRA_REPLACEMENTS = {
    "aircraft-hangar": [
        ('p.part("rear-wall", box(660, 24, 300, true).translate(0, -258, 150)',
         'p.part("rear-wall", box(660, 24, 300, true).translate(0, 258, 150)'),
        ('p.part("door-header", box(510, 28, 36, true).translate(0, 274, 282)',
         'p.part("door-header", box(510, 28, 36, true).translate(0, -274, 282)'),
        ('p.part("ridge", box(700, 24, 36, true).translate(0, 0, 352)',
         'p.part("ridge", box(24, 600, 20, true).translate(0, 0, 397)'),
    ],
    "airport-control-tower": [
        ('p.part("left-cab-window-band", box(18, 232, 72, true).translate(-104, 0, 745)',
         'p.part("left-cab-window-band", box(5, 232, 72, true).translate(-152.25, 0, 745)'),
        ('p.part("right-cab-window-band", box(18, 232, 72, true).translate(104, 0, 745)',
         'p.part("right-cab-window-band", box(5, 232, 72, true).translate(152.25, 0, 745)'),
    ],
    "terminal-gate-front": [
        ('p.part("concourse-roof", box(850, 420, 38, true).translate(0, -185, 332)',
         'p.part("concourse-roof", box(680, 260, 38, true).translate(0, -45, 332)'),
    ],
}

FIRE_ENGINE_LADDER = '''p.part("roof-ladder-outer-rail", box(260, 12, 12, true).translate(-117, -42, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-inner-rail", box(260, 12, 12, true).translate(-117, 42, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-1", box(10, 84, 10, true).translate(-230, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-2", box(10, 84, 10, true).translate(-195, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-3", box(10, 84, 10, true).translate(-160, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-4", box(10, 84, 10, true).translate(-74, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-5", box(10, 84, 10, true).translate(-39, 0, 328).scale(scale).color(stainlessSteel));
p.part("roof-ladder-rung-6", box(10, 84, 10, true).translate(-4, 0, 328).scale(scale).color(stainlessSteel));
'''

HELPER_INSERTS = {
    "airport-control-tower": '''const squareProfile = (side: number) => path().moveTo(-side / 2, -side / 2).lineTo(side / 2, -side / 2).lineTo(side / 2, side / 2).lineTo(-side / 2, side / 2).close();
''',
}


def group_for(asset_id: str) -> str:
    matches = [group for group, ids in GROUPS.items() if asset_id in ids]
    if len(matches) != 1:
        raise SystemExit(f"{asset_id}: expected one group, found {matches}")
    return matches[0]


def palette_for(asset_id: str) -> dict[str, tuple[str, str]]:
    group = group_for(asset_id)
    if group == "misc":
        return MISC_PALETTES[asset_id]
    if asset_id == "aircraft-hangar":
        return {
            "cladding": ("Metal cladding", "#f0ead8"),
            "roofMetal": ("Roof metal", "#39799c"),
            "concrete": ("Concrete", "#bcb8ad"),
        }
    if asset_id == "airport-control-tower":
        return {
            "cladding": ("Metal cladding", "#f4c430"),
            "roofMetal": ("Roof metal", "#38596d"),
            "concrete": ("Concrete", "#b8b4aa"),
            "glass": ("Glazing", "#2aa9be"),
        }
    if asset_id == "terminal-gate-front":
        return {
            "roofMetal": ("Roof metal", "#356d8f"),
            "concrete": ("Concrete", "#b6aa96"),
            "glass": ("Glazing", "#3db4c2"),
        }
    if asset_id == "airport-fire-engine":
        return {
            "vehiclePaint": ("Rescue vehicle paint", "#d93a31"),
            "cabPaint": ("Crew cab paint", "#e7e8df"),
            "stainlessSteel": ("Stainless steel", "#a9b4b6"),
            "rubber": ("Tyre rubber", "#282e31"),
        }
    palette = dict(PALETTES[group])
    primary = {
        "airframe": "airframePaint",
        "helicopter": "airframePaint",
        "ground-vehicle": "vehiclePaint",
    }.get(group)
    if primary and asset_id in PRIMARY_SWATCHES:
        label, _ = palette[primary]
        palette[primary] = (label, PRIMARY_SWATCHES[asset_id])
    if asset_id == "airport-fire-engine":
        # Keep the cab light enough to read as a separate crew compartment.
        palette["windshieldGlass"] = ("Windshield glass", "#75b6c1")
    if asset_id == "aircraft-hangar":
        palette["cladding"] = ("Metal cladding", "#c5c9c3")
    return palette


def night_value(material: str, default: str) -> str:
    low = material.lower()
    if "redlens" in low:
        return "#842f2b"
    if "greenlens" in low:
        return "#2d6840"
    if "reflectivefilm" in low:
        return "#806b39"
    if "lensglass" in low:
        return "#9b8242"
    if "glass" in low:
        return "#315c69"
    if "fabric" in low:
        return "#945b3c"
    if "rubber" in material.lower() or "rope" in material.lower():
        return "#202528"
    if "metal" in material.lower() or "steel" in material.lower() or "aluminium" in material.lower():
        return "#536267"
    if "concrete" in material.lower():
        return "#555751"
    return "#596765"


def high_visibility_value(material: str, default: str) -> str:
    low = material.lower()
    if "redlens" in low or "greenlens" in low:
        return default
    if "reflectivefilm" in low:
        return "#f0c234"
    if "lensglass" in low:
        return default
    if "glass" in low:
        return "#82c8d0"
    if "rubber" in low or "rope" in low:
        return "#262b2e"
    if "metal" in low or "steel" in low or "aluminium" in low:
        return "#aeb9bb"
    if "concrete" in low:
        return "#999990"
    if "fabric" in low:
        return "#ed6739"
    if "paint" in low or "cladding" in low or "polymer" in low:
        return "#f0b52f"
    return default


def cab_windscreen_lines(asset_id: str, line: str) -> list[str]:
    """Add front and side glass panes to a box-shaped named cab."""
    match = re.search(
        r'p\.part\((["\'])(?:cab|operator-cab|tractor-cab)\1,\s*box\(([^)]*)\)\.translate\(([^)]*)\)',
        line,
    )
    if not match:
        return []
    dims = [float(x.strip()) for x in match.group(2).split(",")[:3]]
    center = [float(x.strip()) for x in match.group(3).split(",")]
    if len(dims) < 3 or len(center) != 3:
        raise SystemExit(f"{asset_id}: cannot parse cab box: {line}")
    length, width, height = dims[:3]
    cx, cy, cz = center
    # Vehicle noses face +X. Each pane extends outside the body and overlaps its cab by 0.25 mm.
    x = cx + length / 2 + 2.25
    y_size = round(width * 0.72, 2)
    z_size = round(height * 0.28, 2)
    z = round(cz + height * 0.18, 2)
    side_x_size = round(length * 0.64, 2)
    side_x = round(cx + length * 0.12, 2)
    side_y = width / 2 + 2.25
    return [
        f'p.part("cab-windscreen", box(5, {y_size}, {z_size}, true)'
        f'.translate({x:.2f}, {cy:.2f}, {z:.2f}).scale(scale).color(windshieldGlass));',
        f'p.part("cab-side-window-left", box({side_x_size}, 5, {z_size}, true)'
        f'.translate({side_x:.2f}, {cy - side_y:.2f}, {z:.2f}).scale(scale).color(windshieldGlass));',
        f'p.part("cab-side-window-right", box({side_x_size}, 5, {z_size}, true)'
        f'.translate({side_x:.2f}, {cy + side_y:.2f}, {z:.2f}).scale(scale).color(windshieldGlass));',
    ]


def assignment_for(group: str, part: str, materials: set[str], default: str) -> str:
    for pattern, role in RULES.get(group, []):
        if role in materials and re.search(pattern, part, re.IGNORECASE):
            return role
    if group == "misc":
        if part == "aircraft-uld-container":
            pass
        # These patterns are resolved by asset-specific handling below.
    return default


def assignment_for_asset(asset_id: str, group: str, part: str, materials: set[str], default: str) -> str:
    low = part.lower()
    if asset_id == "airport-fire-engine":
        if "cab" in low:
            return "cabPaint"
        if "wheel" in low:
            return "rubber"
        if "chassis" in low or "nozzle" in low or "monitor" in low or "compartment" in low:
            return "stainlessSteel"
        return "vehiclePaint"
    if asset_id == "aircraft-fuel-truck" and "tanker" in low:
        return "stainlessSteel"
    if asset_id == "aircraft-uld-container":
        if "pallet" in low:
            return "polymer"
        if "lip" in low:
            return "steel"
        return "aluminium"
    if asset_id == "aircraft-wheel-chocks":
        return "ropeFabric" if "rope" in low else "safetyPaint"
    if asset_id == "approach-lighting-array":
        return "lensGlass" if "light" in low else "galvanizedSteel"
    if asset_id == "precision-approach-indicator":
        if "bracket" in low:
            return "galvanizedSteel"
        if "lamp" in low:
            return "lensGlass"
        return "housingPaint"
    if asset_id == "runway-edge-light":
        if "ground-plate" in low:
            return "concrete"
        if "housing" in low:
            return "lensGlass"
        return "castAluminium"
    if asset_id == "runway-threshold-light-array":
        if "left-light" in low:
            return "redLens"
        if "right-light" in low:
            return "greenLens"
        return "aluminium"
    if asset_id == "taxiway-guidance-sign":
        if "panel" in low:
            return "reflectiveFilm"
        if "foot" in low:
            return "concrete"
        return "galvanizedSteel"
    if asset_id == "windsock-mast":
        if "sock-tail" in low:
            return "fabric"
        if "sock-mouth" in low:
            return "reflectiveFilm"
        return "galvanizedSteel"
    if asset_id == "baggage-cart-train":
        if "load" in low:
            return "trailerPaint"
        if "wheel" in low:
            return "rubber"
        if "bed" in low or "chassis" in low:
            return "galvanizedSteel"
        return "tractorPaint"
    if asset_id == "airport-control-tower":
        if "window" in low:
            return "glass"
        if "roof" in low:
            return "roofMetal"
        if "cab" in low:
            return "cladding"
        return "concrete"
    if asset_id == "passenger-jet-bridge":
        if "wheel" in low:
            return "rubber"
        if "support" in low or "base" in low or "column" in low:
            return "galvanizedSteel"
        return "powderCoat"
    if asset_id == "aircraft-hangar":
        if "roof" in low or "ridge" in low or "header" in low:
            return "roofMetal"
        if "rear-wall" in low:
            return "concrete"
        return "cladding"
    if asset_id == "terminal-gate-front":
        if "glazing" in low:
            return "glass"
        if "gate-canopy" in low:
            return "concrete"
        if "canopy" in low or "roof" in low:
            return "roofMetal"
        if "apron" in low or "pier" in low:
            return "concrete"
        return "cladding"
    return assignment_for(group, part, materials, default)


def update_source(path: Path, apply: bool) -> dict[str, object]:
    asset_id = path.name.removesuffix(".kcad.ts")
    source = path.read_text(encoding="utf-8")
    group = group_for(asset_id)
    palette = palette_for(asset_id)
    materials = set(palette)
    default_material = next(iter(palette))
    if not 2 <= len(palette) <= 4:
        raise SystemExit(f"{asset_id}: requires two to four material controls")

    color_decl = re.compile(r"^const color = param\('color', [^\n]+\);$", re.MULTILINE)
    if len(color_decl.findall(source)) != 1:
        raise SystemExit(f"{asset_id}: expected one unpromoted generic color parameter")

    title_match = re.search(r"title:\s*(['\"])(.*?)\1", source)
    desc_match = re.search(r"description:\s*(['\"])(.*?)\1,?\s*$", source, re.MULTILINE)
    if not title_match or not desc_match:
        raise SystemExit(f"{asset_id}: missing title or description")
    title = title_match.group(2)
    old_description = desc_match.group(2)
    description = DESCRIPTION_UPDATES.get(asset_id, old_description)
    labels = [label.lower() for label, _ in palette.values()]
    new_description = (
        f"{description.rstrip('.')}. Material controls: {', '.join(labels)}. "
        "Appearance presets: weathered and high visibility."
    )

    source = color_decl.sub("__MATERIAL_CONTROLS__", source)
    declarations = [
        f"const {name} = param('{name}', '{value}', {{ label: '{label}' }});"
        for name, (label, value) in palette.items()
    ]
    night = {name: night_value(name, value) for name, (_, value) in palette.items()}
    hi_vis = {name: high_visibility_value(name, value) for name, (_, value) in palette.items()}
    preset_lines = [
        "presets({",
        "  weathered: {",
        *[f"    {name}: '{value}'," for name, value in night.items()],
        "  },",
        "  highVisibility: {",
        *[f"    {name}: '{value}'," for name, value in hi_vis.items()],
        "  },",
        "});",
    ]
    source = source.replace("__MATERIAL_CONTROLS__", "\n".join(declarations + [""] + preset_lines), 1)

    source = re.sub(
        r"^(\s*)description:\s*(['\"])(.*?)\2,?\s*$",
        lambda m: f"{m.group(1)}description: '{new_description}',",
        source,
        count=1,
        flags=re.MULTILINE,
    )

    helper = HELPER_INSERTS.get(asset_id)
    if helper:
        marker = 'const p = assembly('
        source = source.replace(marker, helper + marker, 1)

    replacement = GEOMETRY_REPLACEMENTS.get(asset_id)
    if replacement:
        old, new = replacement
        if old not in source:
            raise SystemExit(f"{asset_id}: expected geometry source line was not found")
        source = source.replace(old, new, 1)
    for old, new in GEOMETRY_EXTRA_REPLACEMENTS.get(asset_id, []):
        if old not in source:
            raise SystemExit(f"{asset_id}: expected geometry source fragment was not found: {old}")
        source = source.replace(old, new, 1)

    assignments: dict[str, int] = {name: 0 for name in palette}
    output_lines: list[str] = []
    inserted_windscreen = False
    for line in source.splitlines():
        if ".color(color)" not in line:
            output_lines.append(line)
            continue
        part_match = re.search(r"p\.part\(\s*['\"]([^'\"]+)['\"]", line)
        if not part_match:
            raise SystemExit(f"{asset_id}: cannot identify part on line: {line}")
        part = part_match.group(1)
        material = assignment_for_asset(asset_id, group, part, materials, default_material)
        if material not in materials:
            raise SystemExit(f"{asset_id}/{part}: undeclared material {material}")
        assignments[material] += 1
        output_lines.append(line.replace(".color(color)", f".color({material})"))
        if asset_id in GROUPS["ground-vehicle"] and asset_id != "airport-fire-engine":
            glass_lines = cab_windscreen_lines(asset_id, line)
            if glass_lines:
                if "windshieldGlass" not in materials:
                    raise SystemExit(f"{asset_id}: cab glass has no material control")
                output_lines.extend(glass_lines)
                assignments["windshieldGlass"] += len(glass_lines)
                inserted_windscreen = True
    source = "\n".join(output_lines) + "\n"

    if asset_id == "airport-fire-engine":
        equipment_panels = (
            'p.part("equipment-compartment-front", box(92, 5, 82, true).translate(-193, -113.6, 205).scale(scale).color(stainlessSteel));\n'
            'p.part("equipment-compartment-rear", box(92, 5, 82, true).translate(-49, -113.6, 205).scale(scale).color(stainlessSteel));\n'
        )
        source = source.replace("return p.model();", equipment_panels + "return p.model();", 1)
        assignments["stainlessSteel"] += 2
        source = source.replace("return p.model();", FIRE_ENGINE_LADDER + "\nreturn p.model();", 1)
        assignments["stainlessSteel"] += 8

    if group == "ground-vehicle" and asset_id not in {"apron-shuttle-bus", "airport-fire-engine"} and not inserted_windscreen:
        raise SystemExit(f"{asset_id}: expected a box-shaped cab for a windscreen")

    # Asset-specific new glazing panel for the terminal gate opening.
    if asset_id == "terminal-gate-front":
        marker = "return p.model();"
        glazing = (
            'p.part("gate-glazing-front", box(610, 8, 98, true).translate(0, -43, 221).scale(scale).color(glass));\n'
            'p.part("gate-glazing-back", box(610, 8, 98, true).translate(0, 43, 221).scale(scale).color(glass));\n\n'
        )
        source = source.replace(marker, glazing + marker, 1)
        assignments["glass"] += 2

    for material, count in assignments.items():
        if count < 1:
            raise SystemExit(f"{asset_id}: material control {material} is not assigned to a part")

    comment = f"// {title}: {description} Low-poly scene geometry in millimetres, Z up."
    source = comment + "\n" + source.lstrip()

    row = {
        "id": asset_id,
        "title": title,
        "group": group,
        "description": description,
        "materials": [
            {"name": name, "label": label, "default": value, "parts": assignments[name]}
            for name, (label, value) in palette.items()
        ],
        "presets": ["weathered", "highVisibility"],
        "added_geometry": [
            name for name in ("cab-windscreen" if inserted_windscreen else None,
                              "pitched-roof" if asset_id == "aircraft-hangar" else None,
                              "tapered-tower-shaft" if asset_id == "airport-control-tower" else None,
                              "equipment-compartment-panels" if asset_id == "airport-fire-engine" else None,
                              "roof-ladder" if asset_id == "airport-fire-engine" else None,
                              "shorter-concourse-roof" if asset_id == "terminal-gate-front" else None,
                              "gate-glazing-band" if asset_id == "terminal-gate-front" else None)
            if name
        ],
    }
    if apply:
        path.write_text(source, encoding="utf-8")
    return row


def update_readme(rows: list[dict[str, object]], apply: bool) -> None:
    path = KIT / "README.md"
    source = path.read_text(encoding="utf-8")
    source = source.replace(
        "Forty original low-poly aircraft, apron service vehicles and airport fixtures for airfield scenes. Sources are authored in kernelCAD in millimetres, Z up, with editable overall scale and color controls. Every asset exports one material and remains inside its 1,800-triangle budget. These are stylized scene props, not operational or airworthiness models.",
        "Forty original low-poly aircraft, apron service vehicles and airport fixtures for airfield scenes. Sources are authored in kernelCAD in millimetres, Z up. Each asset keeps its scale control, adds two to four material-specific color controls and the `weathered` and `highVisibility` presets, and has a rendered preview indexed in the catalog. Each remains within its 1,800-triangle budget. These are visualization props, not operational or airworthiness models.",
    )
    by_id = {str(row["id"]): row for row in rows}
    replaced = 0
    out = []
    for line in source.splitlines():
        match = re.match(r"\| `([^`]+)` \|", line)
        if match and match.group(1) in by_id:
            row = by_id[match.group(1)]
            labels = " · ".join(str(item["label"]) for item in row["materials"])
            cells = line.split("|")
            if len(cells) >= 7:
                cells[3] = f" {row['description']} "
                cells[4] = f" scale · {labels} · 2 presets "
                line = "|".join(cells)
                replaced += 1
        out.append(line)
    if replaced != 40:
        raise SystemExit(f"airfield README: expected 40 table rows, updated {replaced}")
    source = "\n".join(out)
    if "## Quality promotion" not in source:
        marker = "## Rebuild and verify"
        section = (
            "## Quality promotion\n\n"
            "The [airfield quality handoff](../../../artifacts/catalog-demos/airfield-quality-promotion-20261105/README.md) "
            "records the in-place material controls, presets, cab glazing, ARFF roof ladder and building silhouette refinements, "
            "refreshed previews, generated index, local checks, and inspected MP4. No asset IDs were added.\n\n"
        )
        if marker not in source:
            raise SystemExit("airfield README: missing rebuild section anchor")
        source = source.replace(marker, section + marker, 1)
    if apply:
        path.write_text(source.rstrip() + "\n", encoding="utf-8")


def refresh_readme_triangle_counts(apply: bool) -> None:
    index_path = ROOT / "catalog/index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    triangles = {
        row["id"]: int(row["stats"]["triangles"])
        for row in index["assets"]
        if row["kit"] == "airfield"
    }
    path = KIT / "README.md"
    source = path.read_text(encoding="utf-8")
    out: list[str] = []
    updated = 0
    for line in source.splitlines():
        match = re.match(r"\| `([^`]+)` \|", line)
        if match and match.group(1) in triangles:
            cells = line.split("|")
            if len(cells) >= 7:
                cells[5] = f" {triangles[match.group(1)]} "
                line = "|".join(cells)
                updated += 1
        out.append(line)
    if updated != 40:
        raise SystemExit(f"airfield README: expected 40 triangle rows, updated {updated}")
    if apply:
        path.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write the promoted sources and README")
    ap.add_argument("--refresh-triangle-counts", action="store_true", help="refresh README counts from generated catalog/index.json")
    args = ap.parse_args()
    if args.refresh_triangle_counts:
        refresh_readme_triangle_counts(apply=True)
        print("Updated all 40 README triangle counts from catalog/index.json")
        return 0
    paths = sorted(KIT.glob("*.kcad.ts"))
    expected = {asset_id for ids in GROUPS.values() for asset_id in ids}
    found = {p.name.removesuffix(".kcad.ts") for p in paths}
    if found != expected:
        raise SystemExit(f"airfield ID mismatch: missing={sorted(expected - found)} extra={sorted(found - expected)}")
    rows = [update_source(path, args.apply) for path in paths]
    update_readme(rows, args.apply)
    manifest = {
        "kit": "airfield",
        "asset_count": len(rows),
        "material_control_count": sum(len(row["materials"]) for row in rows),
        "preset_entry_count": sum(len(row["presets"]) for row in rows),
        "assets": rows,
    }
    if args.apply:
        (OUT / "promotion-plan.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    else:
        print(json.dumps(manifest, indent=2))
    print(f"{'Applied' if args.apply else 'Dry run'}: {len(rows)} airfield assets, {sum(len(r['materials']) for r in rows)} material controls")
    cabs = sum("cab-windscreen" in r["added_geometry"] for r in rows)
    print(f"Cab glazing added: {cabs} cabs with three panes each")
    print("New geometry: cab glazing, ARFF equipment doors and roof ladder, pitched hangar roof, tapered tower shaft, terminal gate glazing")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
