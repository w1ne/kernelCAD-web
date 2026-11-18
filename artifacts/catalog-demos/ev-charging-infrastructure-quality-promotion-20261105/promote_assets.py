#!/usr/bin/env python3
"""Promote existing EV charging sources to material-separated variants.

This one-time transformation keeps every asset ID and scale parameter. It maps
named components to a small set of material controls, adds two coordinated
appearance presets, and improves the generic connector and solar canopy forms.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/ev-charging-infrastructure"
MARKER = "// quality-promotion: ev-charging-infrastructure 2026-11-05"

MATERIALS = {
    "powderCoat": {
        "label": "Powder-coated metal",
        "default": "#397f90",
        "fleetReady": "#28765f",
        "nightService": "#3f5059",
    },
    "stainlessSteel": {
        "label": "Stainless steel",
        "default": "#b5c0c2",
        "fleetReady": "#c2c9c8",
        "nightService": "#c8cecd",
    },
    "engineeringPolymer": {
        "label": "Engineering polymer",
        "default": "#657f84",
        "fleetReady": "#263a36",
        "nightService": "#222d32",
    },
    "cableElastomer": {
        "label": "Cable elastomer",
        "default": "#1b2427",
        "fleetReady": "#1a2522",
        "nightService": "#111719",
    },
    "displayGlass": {
        "label": "Display glass",
        "default": "#79cfda",
        "fleetReady": "#46b8c4",
        "nightService": "#11bfd0",
    },
    "safetyPolymer": {
        "label": "Safety-colored polymer",
        "default": "#f0b13c",
        "fleetReady": "#f3bd2f",
        "nightService": "#ffbf24",
    },
    "pvLaminate": {
        "label": "Photovoltaic laminate",
        "default": "#1c4562",
        "fleetReady": "#173d59",
        "nightService": "#102d45",
    },
}

# First match wins. Component names stay human-readable and the rules describe
# the visible material role instead of coloring every part from one asset knob.
RULES = [
    (re.compile(r"pv[-_ ]?panel|photovoltaic|solar[-_ ]?module", re.I), "pvLaminate"),
    (re.compile(r"display|screen|window|readout|lcd|meter[-_ ]?glass|lens", re.I), "displayGlass"),
    (re.compile(r"hanging[-_ ]?cable|main[-_ ]?cable|coiled[-_ ]?cable|power[-_ ]?cable|charging[-_ ]?cable|cable[-_ ]?(?:drop|tail|stub|loop|lead|run|segment|bundle)|coolant[-_ ]?line|wire[-_ ]?harness|strain[-_ ]?relief", re.I), "cableElastomer"),
    (re.compile(r"stop[-_ ]?actuator|emergency[-_ ]?button|warning|reflect(?:or|ive)|sign[-_ ]?face|status[-_ ]?(?:light|led|button)|marker[-_ ]?light|safety[-_ ]?stripe", re.I), "safetyPolymer"),
    (re.compile(r"contact|connector|plug|grip|handle|button|holster|cradle|wheel[-_ ]?stop|stop[-_ ]?body|wheel|tire|tyre|bumper|grommet|insulator|strain[-_ ]?boot|cable[-_ ]?port", re.I), "engineeringPolymer"),
    (re.compile(r"anchor|bolt|fastener|bracket|frame|beam|rail|post|mast|column|plate|base|support|arm|pedestal|canopy|gantry|flange|mount|truss|rafter|shoe|skid|louver|vent|grille", re.I), "stainlessSteel"),
]

CONNECTOR_IDS = {
    "ccs-combo-1-connector",
    "ccs-combo-2-connector",
    "chademo-connector",
    "j1772-ac-connector",
    "nacs-connector",
    "wall-mounted-connector-holster",
}

PART_RE = re.compile(r"\.part\(\s*['\"]([^'\"]+)['\"]")
COLOR_RE = re.compile(r"\.color\(\s*color\s*\)")


def material_for(label: str, default: str) -> str:
    for pattern, material in RULES:
        if pattern.search(label):
            return material
    return default


def detail_geometry(path: Path, source: str) -> str:
    if path.name == "nacs-connector.kcad.ts":
        source = source.replace(
            'const p=assembly("nacs-connector");',
            'const gripBody=()=>path().moveTo(-42,-24).lineTo(-34,-47).lineTo(34,-47).lineTo(42,-24).lineTo(36,43).lineTo(-36,43).close().extrude(112).translate(0,15,0).scale(scale);\n\nconst p=assembly("nacs-connector");',
            1,
        )
        old = 'p.part("hand-grip", b(0, 15, 0, 94, 94, 112).color(color));'
        if old not in source:
            raise SystemExit("expected NACS grip geometry was not found")
        source = source.replace(old, 'p.part("hand-grip", gripBody().color(color));', 1)

    elif path.name == "compact-dc-fast-charger.kcad.ts":
        source = source.replace(
            'const p=assembly("compact-dc-fast-charger");',
            'const plugShell=(x:number,y:number,z:number)=>path().moveTo(-42,-25).lineTo(-34,-44).lineTo(34,-44).lineTo(42,-25).lineTo(36,30).lineTo(-36,30).close().extrude(180).translate(x,y,z).scale(scale);\n\nconst p=assembly("compact-dc-fast-charger");',
            1,
        )
        old = 'p.part("right-charging-cable", hy(353.79999999999995, -500.0, 260, 650, 22, 8).color(color));'
        new = (
            old + '\n'
            'p.part("left-connector-handle", plugShell(-353.79999999999995, -825, 170).color(color));\n'
            'p.part("right-connector-handle", plugShell(353.79999999999995, -825, 170).color(color));\n'
            'p.part("left-contact-collar", hy(-353.79999999999995, -881, 260, 34, 24, 8).color(color));\n'
            'p.part("right-contact-collar", hy(353.79999999999995, -881, 260, 34, 24, 8).color(color));'
        )
        if old not in source:
            raise SystemExit("expected charger cable geometry was not found")
        source = source.replace(old, new, 1)

    elif path.name == "solar-ev-carport.kcad.ts":
        source = source.replace(
            'const p=assembly("solar-ev-carport");',
            'const pvPanel=(x:number,z:number)=>box(600,1090,32,true).rotateY(-4.3).translate(x,0,z+16).scale(scale);\n\nconst p=assembly("solar-ev-carport");',
            1,
        )
        for line in source.splitlines():
            if '.part("pv-panel-' not in line:
                continue
            match = re.search(r'b\(([-\d.]+),\s*[-\d.]+,\s*([-\d.]+),\s*600,\s*1090,\s*32\)', line)
            if not match:
                raise SystemExit(f"could not read solar panel position in {path.name}: {line}")
            source = source.replace(line, re.sub(r'b\([-\d.,\s]+\)', f'pvPanel({match.group(1)}, {match.group(2)})', line), 1)

    return source


def promote(path: Path) -> set[str]:
    source = path.read_text()
    if MARKER in source:
        return set(re.findall(r"\.color\(\s*([A-Za-z_][\w]*)", source))

    source = detail_geometry(path, source)
    title_match = re.search(r'title:\s*["\']([^"\']+)["\']', source)
    description_match = re.search(r'description:\s*["\']([^"\']+)["\']', source)
    color_param_match = re.search(r"^const color = param\(.*\);\n", source, re.M)
    scale_match = re.search(r"^const scale = param\([^\n]+;\n", source, re.M)
    if not title_match or not description_match or not color_param_match or not scale_match:
        raise SystemExit(f"missing expected metadata or params: {path.name}")

    title = title_match.group(1)
    description = description_match.group(1)
    recognizable = description.split(" Knobs:", 1)[0].rstrip(".")
    asset_id = path.name.removesuffix(".kcad.ts")
    default_material = "engineeringPolymer" if asset_id in CONNECTOR_IDS else "powderCoat"

    line_materials: dict[int, str] = {}
    categories: set[str] = set()
    for line_number, line in enumerate(source.splitlines()):
        if ".part(" not in line or ".color(color)" not in line:
            continue
        match = PART_RE.search(line)
        if match is None:
            raise SystemExit(f"unnamed colored part in {path.name}:{line_number + 1}")
        material = material_for(match.group(1), default_material)
        line_materials[line_number] = material
        categories.add(material)

    if not 2 <= len(categories) <= 4:
        kept = priority_order(categories, default_material)[:4]
        if len(kept) < 2:
            raise SystemExit(f"needs two meaningful material roles, got {sorted(categories)} in {path.name}")
        for line_number, material in list(line_materials.items()):
            if material not in kept:
                line_materials[line_number] = default_material
        categories = set(line_materials.values())
    if not 2 <= len(categories) <= 4:
        raise SystemExit(f"invalid material count {len(categories)} in {path.name}: {sorted(categories)}")

    lines = source.splitlines()
    for line_number, material in line_materials.items():
        lines[line_number] = COLOR_RE.sub(f".color({material})", lines[line_number])
    source = "\n".join(lines) + "\n"
    if COLOR_RE.search(source):
        raise SystemExit(f"unassigned generic color remains in {path.name}")

    declarations = "".join(
        f"const {material} = param('{material}', '{MATERIALS[material]['default']}', {{ label: '{MATERIALS[material]['label']}' }});\n"
        for material in priority_order(categories, default_material)
    )
    source = source.replace(color_param_match.group(0), declarations, 1)

    preset_block = "presets({\n"
    for preset in ("fleetReady", "nightService"):
        values = ", ".join(f"{material}: '{MATERIALS[material][preset]}'" for material in priority_order(categories, default_material))
        preset_block += f"  {preset}: {{ {values} }},\n"
    preset_block += "});\n"
    source = source.replace(declarations, declarations + "\n" + preset_block, 1)

    material_labels = [MATERIALS[material]["label"].lower() for material in priority_order(categories, default_material)]
    label_text = ", ".join(material_labels[:-1]) + f" and {material_labels[-1]}"
    new_description = f"{recognizable}. Knobs: overall scale and {label_text} color controls."
    source = re.sub(
        r"(description:\s*)(['\"])(.*?)\2",
        lambda match: match.group(1) + match.group(2) + new_description + match.group(2),
        source,
        count=1,
    )
    source = re.sub(
        r"^// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0\.$",
        f"// {title}: {recognizable[0].lower() + recognizable[1:]}.",
        source,
        count=1,
        flags=re.M,
    )
    source = source.replace(
        f"// {title}: {recognizable[0].lower() + recognizable[1:]}.",
        f"// {title}: {recognizable[0].lower() + recognizable[1:]}.\n// Source convention: millimetres, Z up, base at z = 0.",
        1,
    )
    source = source.replace("// SPDX-License-Identifier: CC0-1.0\n", f"// SPDX-License-Identifier: CC0-1.0\n{MARKER}\n", 1)
    path.write_text(source)
    return categories


def priority_order(categories: set[str], default: str) -> list[str]:
    order = [default, "displayGlass", "cableElastomer", "safetyPolymer", "engineeringPolymer", "pvLaminate", "stainlessSteel", "powderCoat"]
    return list(dict.fromkeys(material for material in order if material in categories))


def main() -> None:
    paths = sorted(KIT.glob("*.kcad.ts"))
    if len(paths) != 50:
        raise SystemExit(f"expected 50 existing sources, found {len(paths)}")
    total_knobs = 0
    for path in paths:
        materials = promote(path)
        if not 2 <= len(materials) <= 4:
            raise SystemExit(f"gate failed for {path.name}: {len(materials)} material controls")
        total_knobs += len(materials)
        print(f"{path.stem}: {', '.join(priority_order(materials, 'powderCoat'))}")
    print(f"promoted {len(paths)} existing IDs with {total_knobs} material controls")


if __name__ == "__main__":
    main()
