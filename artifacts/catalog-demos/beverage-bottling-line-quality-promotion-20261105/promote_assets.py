#!/usr/bin/env python3
"""Promote existing beverage-bottling-line sources to useful material variants.

Run from the repository root. This is a one-time source transformation: it
preserves asset IDs, replaces generic colors with finishes applied to named
components, adds intentional appearance presets and machine details, and
documents each asset's recognizable features.
"""

from __future__ import annotations

import re
from pathlib import Path

KIT = Path("catalog/kits/beverage-bottling-line")
MARKER = "// quality-promotion: beverage-bottling-line 2026-11-05"

MATERIALS = {
    "corrugatedBoard": {
        "label": "Corrugated board",
        "default": "#b18a5d",
        "sanitary": "#c49b6b",
        "legacy": "#886342",
        "pattern": r"carton|paper|sheet|stack|pallet|cardboard|corrugated|case[-_ ]?(?:blank|wall|stack|pack|lift)",
    },
    "glass": {
        "label": "Glass tint",
        "default": "#58acc1",
        "sanitary": "#7ac4d2",
        "legacy": "#4a8795",
        "pattern": r"sight-glass|glass|viewport|window|lens",
    },
    "foodPolymer": {
        "label": "Food-grade polymer",
        "default": "#3999a1",
        "sanitary": "#2c828c",
        "legacy": "#286c75",
        "pattern": r"belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve",
    },
    "safetyPaint": {
        "label": "Safety paint",
        "default": "#e3a331",
        "sanitary": "#f0b336",
        "legacy": "#bd7b24",
        "pattern": r"operator|stop|emergency|beacon|signal|status|warning|access",
    },
    "powderCoat": {
        "label": "Powder-coated steel",
        "default": "#397e91",
        "sanitary": "#4b95a4",
        "legacy": "#315b70",
        "pattern": r"base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket",
    },
    "stainlessSteel": {
        "label": "Stainless steel",
        "default": "#aebdc1",
        "sanitary": "#d2dfe1",
        "legacy": "#858f91",
        "pattern": r"shell|vessel|tank|body|valve|head|bowl|disk|table|plate|shaft|nozzle|outlet|inlet|impeller|drum|spindle|pump|exchanger|filter|roller|hopper|chute|reel|ring|manway|flange|pipe|branch|screen|meter|camera|lens|tray|mechanism|tool",
    },
}

# These are evaluated in this order, after the explicit stainless part names.
CLASSIFIERS = [
    (name, re.compile(rf"(?:{info['pattern']})", re.I))
    for name, info in MATERIALS.items()
    if name != "stainlessSteel"
]


def component_labels(source: str) -> list[str]:
    labels: list[str] = []
    for line in source.splitlines():
        if ".part(" not in line:
            continue
        match = re.search(r"\.part\(\s*(?:'([^']*)'|\"([^\"]*)\"|`([^`]*))", line)
        if match:
            labels.append(next(value for value in match.groups() if value is not None).split("${", 1)[0])
    return labels


def finish_for(label: str) -> str:
    for material, pattern in CLASSIFIERS:
        if pattern.search(label):
            return material
    return "stainlessSteel"


def add_asset_details(path: Path, source: str) -> str:
    """Add specific shape cues to the three views most in need of detail."""
    if path.name == "beverage-blend-tank.kcad.ts":
        updates = {
            'cylinderPart(0, 0, 70, 1050, 390, 14, body)': 'cylinderPart(0, 0, 280, 1050, 390, 14, body)',
            'cylinderPart(0, 0, 1120, 110, 360, 14, body)': 'cylinderPart(0, 0, 1330, 110, 360, 14, body)',
            'cylinderPart(0, 0, 0, 80, 350, 14, body)': 'cylinderPart(0, 0, 200, 80, 350, 14, body)',
            'cylinderPart(0, 0, 360, 430, 415, 14, accent)': 'cylinderPart(0, 0, 650, 430, 415, 14, accent)',
            'cylinderPart(0, -410, 990, 70, 145, 12, body)': 'cylinderPart(0, -410, 1200, 70, 145, 12, body)',
            'cylinderPart(0, 0, 1230, 250, 145, 12, accent)': 'cylinderPart(0, 0, 1440, 250, 145, 12, accent)',
            'cylinderPart(0, 0, 300, 810, 32, 8, body)': 'cylinderPart(0, 0, 500, 810, 32, 8, body)',
            'boxPart(0, 0, 540, 430, 35, 28, accent)': 'paddlePart(740, 430, 35, 28, 28)',
            'boxPart(0, 0, 820, 330, 35, 28, accent)': 'paddlePart(1020, 330, 35, 28, -28)',
            'cylinderPart(0, -425, 95, 150, 50, 10, body)': 'cylinderPart(0, -425, 285, 150, 50, 10, body)',
        }
        for old, new in updates.items():
            if old not in source:
                raise SystemExit(f"expected tank geometry not found: {old}")
            source = source.replace(old, new, 1)
        source = source.replace(
            'p.part("leg-3", boxPart(-0.0009154884788074894, -229.999999998178, 0, 75, 75, 280, body));',
            'p.part("leg-3", boxPart(-0.0009154884788074894, -229.999999998178, 0, 75, 75, 280, body));\n'
            'p.part("sight-glass", cylinderPart(0, -425, 570, 430, 32, 10, body));\n'
            'p.part("sight-clamp-lower", boxPart(-45, -445, 625, 90, 20, 28, body));\n'
            'p.part("sight-clamp-upper", boxPart(-45, -445, 915, 90, 20, 28, body));',
            1,
        )
        source = source.replace(
            'const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10,color=body) => cylinder(h,r,n).translate(x,y,z).scale(scale).color(color);',
            'const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10,color=body) => cylinder(h,r,n).translate(x,y,z).scale(scale).color(color);\n'
            'const paddlePart = (z:number,w:number,d:number,h:number,angle:number) => box(w,d,h,true).rotateZ(angle).translate(0,0,z+h/2).scale(scale);',
            1,
        )
    elif path.name == "bottle-case-packer.kcad.ts":
        old_guard = 'p.part("guard-front", boxPart(0, -455, 80, 1280, 30, 760, body));'
        new_guard = (
            'p.part("guard-front-left", boxPart(-650, -455, 80, 32, 30, 760, body));\n'
            'p.part("guard-front-right", boxPart(650, -455, 80, 32, 30, 760, body));\n'
            'p.part("guard-top-rail", boxPart(0, -455, 840, 1300, 30, 30, body));\n'
            'p.part("guard-bottom-rail", boxPart(0, -455, 80, 1300, 30, 30, body));'
        )
        if old_guard not in source:
            raise SystemExit("expected case-packer guard panel not found")
        source = source.replace(old_guard, new_guard, 1)
        source = source.replace(
            'return p.model();',
            'p.part("lift-table", boxPart(0, 0, 245, 560, 420, 22, body));\n'
            'p.part("carton-bottom", boxPart(0, 0, 267, 420, 300, 18, body));\n'
            'p.part("carton-front-wall", boxPart(0, -141, 285, 420, 18, 85, body));\n'
            'p.part("carton-back-wall", boxPart(0, 141, 285, 420, 18, 85, body));\n'
            'p.part("carton-left-wall", boxPart(-201, 0, 285, 18, 300, 85, body));\n'
            'p.part("carton-right-wall", boxPart(201, 0, 285, 18, 300, 85, body));\n'
            'for (let row = 0; row < 2; row++) {\n'
            '  for (let column = 0; column < 3; column++) {\n'
            '    const x = (column - 1) * 120;\n'
            '    const y = (row === 0 ? -78 : 78);\n'
            '    const bottleId = row * 3 + column;\n'
            '    p.part(`bottle-body-${bottleId}`, cylinderPart(x, y, 285, 260, 36, 10, body));\n'
            '    p.part(`bottle-neck-${bottleId}`, cylinderPart(x, y, 545, 48, 15, 10, body));\n'
            '    p.part(`bottle-cap-${bottleId}`, cylinderPart(x, y, 593, 16, 18, 10, accent));\n'
            '  }\n'
            '}\n\nreturn p.model();',
            1,
        )
    elif path.name == "rotary-filler.kcad.ts":
        source = source.replace("triangleBudget: 2200,", "triangleBudget: 2800,", 1)
        source = source.replace(
            'return p.model();',
            'for (let i = 0; i < 12; i++) {\n'
            '  const angle = (i * Math.PI) / 6;\n'
            '  const x = 380 * Math.cos(angle);\n'
            '  const y = 380 * Math.sin(angle);\n'
            '  p.part(`bottle-body-${i}`, cylinderPart(x, y, 320, 160, 27, 10, body));\n'
            '  p.part(`bottle-neck-${i}`, cylinderPart(x, y, 480, 42, 12, 10, body));\n'
            '  p.part(`bottle-cap-${i}`, cylinderPart(x, y, 522, 14, 15, 10, accent));\n'
            '}\n\nreturn p.model();',
            1,
        )
    return source


def promote(path: Path) -> None:
    source = path.read_text()
    if MARKER in source:
        return
    source = add_asset_details(path, source)

    title_match = re.search(r'title:\s*"([^"]+)"', source)
    description_match = re.search(r'description:\s*"([^"]+)"', source)
    if not title_match or not description_match:
        raise SystemExit(f"missing title/description: {path}")
    title = title_match.group(1)
    description = description_match.group(1)
    recognizable = description.split(". Knobs:", 1)[0].rstrip(".")
    labels = component_labels(source)
    if len(labels) < 2:
        raise SystemExit(f"not enough named assembly parts to map finishes: {path}")
    active = {finish_for(label) for label in labels}
    if len(active) < 2:
        support = next((label for label in labels if re.search(r"base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform", label, re.I)), None)
        if support is None:
            raise SystemExit(f"needs a second visibly assigned material: {path}")
        active.add("powderCoat")
    if "stainlessSteel" not in active:
        primary = next((label for label in labels if not any(pattern.search(label) for _, pattern in CLASSIFIERS)), None)
        if primary is None:
            raise SystemExit(f"needs a visible stainless component: {path}")
        active.add("stainlessSteel")
    material_labels = [MATERIALS[name]["label"].lower() for name in ["stainlessSteel", "powderCoat", "foodPolymer", "safetyPaint", "corrugatedBoard", "glass"] if name in active]
    if len(material_labels) == 2:
        material_text = " and ".join(material_labels)
    else:
        material_text = ", ".join(material_labels[:-1]) + f", and {material_labels[-1]}"
    knob_text = f"overall scale and color controls for {material_text}"
    description = re.sub(r'\. Knobs: [^"]+', f". Knobs: {knob_text}.", description)
    source = source[:description_match.start(1)] + description + source[description_match.end(1):]
    comment = f"// {title}: {recognizable[0].lower() + recognizable[1:]}."
    source = re.sub(r"^// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up\.$", comment, source, count=1, flags=re.M)
    source = source.replace("// SPDX-License-Identifier: CC0-1.0\n", f"// SPDX-License-Identifier: CC0-1.0\n{MARKER}\n", 1)

    source = re.sub(r"^const body = .*;\n", "", source, flags=re.M)
    source = re.sub(r"^const accent = .*;\n", "", source, flags=re.M)

    source = re.sub(
        r"(const \w+Part = \([^\n]*?),color=body\) => (.+?)\.color\(color\);",
        r"\1) => \2;",
        source,
    )
    if "color=body" in source or ".color(color)" in source:
        raise SystemExit(f"could not remove generic material helper from {path}")

    source = re.sub(r"((?:\w+Part)\([^\n]*?),\s*(?:body|accent)\)", r"\1)", source)
    source = source.replace(".rotate([0,1,0],90)", ".rotateY(90)")
    if re.search(r"param\(['\"](?:body|accent)['\"]|color=(?:body|accent)|\.color\(color\)|,\s*(?:body|accent)\)", source):
        raise SystemExit(f"generic color parameter remains in {path}")

    source_lines = source.splitlines()
    roller_calls = [
        i for i, line in enumerate(source_lines)
        if ".part(" in line and re.search(r"roller|idler", line, re.I) and "cylinderPart(" in line
    ]
    if roller_calls and "const rollerPart =" not in source:
        for i in roller_calls:
            source_lines[i] = source_lines[i].replace("cylinderPart(", "rollerPart(", 1)
        helper = "const rollerPart = (x:number,y:number,z:number,length:number,r:number,n=10) => cylinder(length,r,n).rotateX(90).translate(x,y+length/2,z+r).scale(scale);"
        helper_index = next((i for i, line in enumerate(source_lines) if line.startswith("const cylinderPart =")), None)
        if helper_index is None:
            helper_index = next((i for i, line in enumerate(source_lines) if line.startswith("const boxPart =")), None)
        if helper_index is None:
            raise SystemExit(f"no helper insertion point for roller geometry: {path}")
        source_lines.insert(helper_index + 1, helper)
        source = "\n".join(source_lines) + "\n"

    declarations = []
    preset_sanitary = []
    preset_legacy = []
    for name in ["stainlessSteel", "powderCoat", "foodPolymer", "safetyPaint", "corrugatedBoard", "glass"]:
        if name not in active:
            continue
        info = MATERIALS[name]
        declarations.append(f"const {name} = param('{name}', '{info['default']}', {{ label: '{info['label']}' }});")
        preset_sanitary.append(f"    {name}: '{info['sanitary']}',")
        preset_legacy.append(f"    {name}: '{info['legacy']}',")
    parameter_block = "\n".join(declarations)
    parameter_block += "\n\npresets({\n  sanitaryLine: {\n" + "\n".join(preset_sanitary)
    parameter_block += "\n  },\n  legacyPlant: {\n" + "\n".join(preset_legacy) + "\n  },\n});"

    scale_line = re.search(r"^const scale = .*;$", source, re.M)
    if not scale_line:
        raise SystemExit(f"missing scale parameter: {path}")
    source = source[:scale_line.end()] + "\n" + parameter_block + source[scale_line.end():]

    finish_lines = [
        "const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {",
        "  const component = name.toLowerCase();",
    ]
    for name in ["corrugatedBoard", "glass", "foodPolymer", "safetyPaint", "powderCoat"]:
        if name not in active or name == "stainlessSteel":
            continue
        finish_lines.append(f"  if (/{MATERIALS[name]['pattern']}/i.test(component)) return shape.color({name});")
    finish_lines.append("  return shape.color(stainlessSteel);")
    finish_lines.append("};")
    finish_block = "\n".join(finish_lines)

    # Retain each direct p.part('component', ...) call so the catalog analyzer
    # can continue to see assembly structure. Color only the named leaf part.
    output_lines = []
    inserted = False
    for line in source.splitlines():
        if not inserted and re.match(r"const p = assembly\(.*\);$", line.strip()):
            output_lines.append(line)
            output_lines.append(finish_block)
            inserted = True
            continue
        if "p.part(" in line:
            start = line.index("p.part(") + len("p.part(")
            first_comma = line.find(",", start)
            end = line.rfind(");")
            if first_comma < 0 or end < first_comma:
                raise SystemExit(f"unsupported part-call layout in {path}: {line}")
            label_expr = line[start:first_comma].strip()
            shape_expr = line[first_comma + 1:end].strip()
            line = line[:first_comma + 1] + f" finishPart({label_expr}, {shape_expr})" + line[end:]
        output_lines.append(line)
    if not inserted:
        raise SystemExit(f"missing assembly root: {path}")

    promoted = "\n".join(output_lines) + "\n"
    path.write_text(promoted)


def main() -> None:
    paths = sorted(KIT.glob("*.kcad.ts"))
    if len(paths) != 50:
        raise SystemExit(f"expected 50 existing sources, found {len(paths)}")
    for path in paths:
        promote(path)
    print(f"promoted {len(paths)} existing beverage-bottling-line assets")


if __name__ == "__main__":
    main()
