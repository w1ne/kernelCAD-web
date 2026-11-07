#!/usr/bin/env python3
"""Promote the existing lab-infrastructure sources in place.

Each asset receives material-named color controls and two useful appearance
presets. Semantic part names drive the assignment; several equipment silhouettes
also gain glazing, tubular arms/spouts, or lofted hoods. No IDs are added.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "lab-infrastructure"
ASSET_RE = re.compile(r"^add\('([^']+)',\s*(.+?)(?:,\s*(body|accent))?\);$")
DESCRIPTION_RE = re.compile(r"description: '([^']*)'")
MATERIAL_LABELS = {
    "enamel": ("Enamel coating", "#c9dedc"),
    "steel": ("Structural steel", "#53666e"),
    "stainless": ("Stainless steel", "#b8c7ca"),
    "glass": ("Tinted safety glass", "#55b7ca"),
    "polymer": ("Polymer controls", "#e5a331"),
    "rubber": ("Rubber and seals", "#30363a"),
}
PRESET_COLORS = {
    "cleanroom": {
        "enamel": "#e7f0ed", "steel": "#75888d", "stainless": "#d0d9d8",
        "glass": "#8bd4dc", "polymer": "#23a5a2", "rubber": "#484f52",
    },
    "highVisibility": {
        "enamel": "#f0f2e8", "steel": "#33464d", "stainless": "#6f8488",
        "glass": "#44d3e2", "polymer": "#ffe000", "rubber": "#202528",
    },
}

GLASS_PART = re.compile(r"vision-panel|window-infill|sash-glazing|reagent-bottle|wide-sash", re.I)
RUBBER_PART = re.compile(r"caster|wheel|gasket|isolation-pad|foot-pad|rubber|bumper", re.I)
POLYMER_PART = re.compile(
    r"pull|handle|button|knob|controller|outlet|socket|warning|vent-slot|corner-tab|"
    r"eyewash-bowl|spray-head|bottle-cap|latch|indicator|replaceable-sheet|diffuser", re.I
)
STAINLESS_PART = re.compile(
    r"worktop|work-surface|sink|faucet|riser|spout|drain|grate|shower-head|"
    r"valve|manifold|port-block|service-line|service-drop|filter-slat|grille|"
    r"shelf-deck|exhaust-neck|pipe|basin-rim|floor-pan|arm|capture-canopy|canopy|"
    r"dewar-body|mounting-deck|tap-stem|long-top|return-top|service-clip", re.I
)
STEEL_PART = re.compile(
    r"frame|rail|bracket|leg|upright|support|brace|post|carrier|mounting-base|"
    r"wall-mount|plinth|toe-kick|kick-plinth|base-frame|retaining-strap|pedestal|"
    r"hood|channel|track", re.I
)


def rectangle(width: float, depth: float) -> str:
    return (
        "path()"
        f".moveTo({-width / 2:g}, {-depth / 2:g})"
        f".lineTo({width / 2:g}, {-depth / 2:g})"
        f".lineTo({width / 2:g}, {depth / 2:g})"
        f".lineTo({-width / 2:g}, {depth / 2:g}).close()"
    )


def part_material(asset_id: str, part: str, finish_hint: str | None) -> str:
    if part == "capture-canopy":
        return "stainless"
    if part.startswith("canopy-"):
        return "steel"
    if GLASS_PART.search(part):
        return "glass"
    if RUBBER_PART.search(part):
        return "rubber"
    if POLYMER_PART.search(part):
        return "polymer"
    if STAINLESS_PART.search(part):
        return "stainless"
    if STEEL_PART.search(part):
        return "steel"
    if asset_id in {"stainless-lab-bench", "laboratory-washup-station", "laboratory-floor-drain-trough"}:
        return "stainless"
    return "enamel"


def rebalance(asset_id: str, assignments: dict[str, str]) -> dict[str, str]:
    """Keep between two and four real material controls per asset."""
    used = set(assignments.values())
    # Preserve glass, polymer and rubber where present; merge plain structural
    # stock first so controls remain tied to a real material role.
    for source, target in (("steel", "enamel"), ("rubber", "steel"), ("stainless", "steel"), ("polymer", "enamel")):
        used = set(assignments.values())
        if len(used) <= 4:
            break
        if source in used and target in used:
            assignments = {part: target if material == source else material for part, material in assignments.items()}
    if len(used) < 2:
        fallback = "polymer" if "polymer" not in used else "steel"
        part = next(iter(assignments))
        assignments[part] = fallback
        used.add(fallback)
    if len(used) < 2 or len(used) > 4:
        raise ValueError(f"{asset_id}: could not select 2-4 materials: {sorted(used)}")
    return assignments


def glazing_line(asset_id: str) -> str | None:
    panels = {
        "laboratory-fume-hood": (920, 500, -375, 1680),
        "benchtop-extraction-enclosure": (510, 210, -258, 550),
        "chemical-weighing-enclosure": (490, 220, -278, 615),
        "ductless-fume-enclosure": (640, 270, -303, 800),
        "laminar-flow-workbench": (850, 350, -328, 1160),
    }
    spec = panels.get(asset_id)
    if spec is None:
        return None
    width, height, y, z = spec
    return (
        f"p.part('sash-glazing', box({width}, 14, {height}, true)"
        f".translate(0, {y}, {z}).scale(scale).color(glass));"
    )


def geometry_enhancements(asset_id: str) -> list[str]:
    if asset_id == "canopy-extraction-hood":
        return [
            f"const canopySkirt = {rectangle(1250, 700)};",
            f"const canopyCrown = {rectangle(720, 430)};",
            "const taperedCanopy = canopySkirt.loft([canopyCrown], {",
            "  planes: [",
            "    { plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },",
            "    { plane: 'XY' as const, origin: [0, 0, 110] as [number, number, number] },",
            "  ],",
            "  ruled: true,",
            "});",
            "p.part('capture-canopy', taperedCanopy.translate(0, 0, 1570).scale(scale).color(stainless));",
        ]
    if asset_id == "articulated-extraction-snorkel":
        return [
            "p.part('lower-arm', cylinder(378, 18, 10).rotateY(90).translate(0, 0, 485.5).scale(scale).color(stainless));",
            "p.part('upper-arm', cylinder(360, 15, 10).rotateY(90).translate(420, 0, 611).scale(scale).color(stainless));",
            f"const intakeMouth = {rectangle(300, 240)};",
            f"const intakeNeck = {rectangle(205, 145)};",
            "const intakeBell = intakeMouth.loft([intakeNeck], {",
            "  planes: [",
            "    { plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },",
            "    { plane: 'XY' as const, origin: [0, 0, 66] as [number, number, number] },",
            "  ],",
            "  ruled: true,",
            "});",
            "p.part('intake-hood', intakeBell.translate(756, 0, 582.5).scale(scale).color(steel));",
        ]
    if asset_id == "cleanroom-pass-through-chamber":
        return [
            "p.part('access-window-left', box(12, 288, 320, true).translate(-400, 0, 648).scale(scale).color(glass));",
            "p.part('access-window-right', box(12, 288, 320, true).translate(400, 0, 648).scale(scale).color(glass));",
        ]
    if asset_id == "laboratory-faucet-set":
        return [
            "p.part('spout', cylinder(210, 12, 10).rotateY(90).translate(40, 0, 376.2).scale(scale).color(stainless));",
            "p.part('spout-elbow', sphere(15).translate(40, 0, 376.2).scale(scale).color(stainless));",
        ]
    if asset_id == "laboratory-water-service-console":
        return [
            "p.part('tap-spout-0', cylinder(95, 12, 8).rotateY(90).translate(-183.6, -16, 398.4).scale(scale).color(stainless));",
            "p.part('tap-spout-1', cylinder(95, 12, 8).rotateY(90).translate(183.6, -16, 398.4).scale(scale).color(stainless));",
        ]
    if asset_id == "laboratory-washup-station":
        return [
            "p.part('faucet-spout', cylinder(135, 11, 8).rotateX(90).translate(275, 190, 1100).scale(scale).color(stainless));",
            "p.part('faucet-elbow', sphere(15).translate(275, 190, 1100).scale(scale).color(stainless));",
        ]
    if asset_id == "ultra-low-temperature-freezer":
        lines = ["// Four narrow rubber seal strips frame each insulated door leaf."]
        for leaf, center_x in enumerate((-207, 207)):
            lines.extend([
                f"p.part('door-seal-left-{leaf}', box(18, 12, 1482, true).translate({center_x - 175}, -467.5, 1729).scale(scale).color(rubber));",
                f"p.part('door-seal-right-{leaf}', box(18, 12, 1482, true).translate({center_x + 175}, -467.5, 1729).scale(scale).color(rubber));",
                f"p.part('door-seal-top-{leaf}', box(350, 12, 18, true).translate({center_x}, -467.5, 2461).scale(scale).color(rubber));",
                f"p.part('door-seal-bottom-{leaf}', box(350, 12, 18, true).translate({center_x}, -467.5, 997).scale(scale).color(rubber));",
            ])
        return lines
    if asset_id == "undercounter-laboratory-freezer":
        return [
            "// Four narrow rubber seal strips frame the insulated door leaf.",
            "p.part('door-seal-left', box(18, 12, 663, true).translate(-271, -385, 773.5).scale(scale).color(rubber));",
            "p.part('door-seal-right', box(18, 12, 663, true).translate(271, -385, 773.5).scale(scale).color(rubber));",
            "p.part('door-seal-top', box(540, 12, 18, true).translate(0, -385, 1096).scale(scale).color(rubber));",
            "p.part('door-seal-bottom', box(540, 12, 18, true).translate(0, -385, 451).scale(scale).color(rubber));",
        ]
    if asset_id == "balance-isolation-bench":
        return [
            f"p.part('foot-pad-{i}', cylinder(40, 24, 8).translate({x}, {y}, 0).scale(scale).color(rubber));"
            for i, (x, y) in enumerate(
                (x, y)
                for x in (-365.5, -121.833, 121.833, 365.5)
                for y in (-260, 260)
            )
        ]
    if asset_id == "vibration-isolation-table":
        return [
            f"p.part('foot-pad-{i}', cylinder(40, 24, 8).translate({x}, {y}, 0).scale(scale).color(rubber));"
            for i, (x, y) in enumerate(
                (x, y)
                for x in (-430, -143.333, 143.333, 430)
                for y in (-320, 320)
            )
        ]
    return []


def extra_material_assignments(asset_id: str) -> dict[str, str]:
    extras: dict[str, str] = {}
    if glazing_line(asset_id):
        extras["sash-glazing"] = "glass"
    if asset_id == "cleanroom-pass-through-chamber":
        extras.update({"access-window-left": "glass", "access-window-right": "glass"})
    if asset_id in {"balance-isolation-bench", "vibration-isolation-table"}:
        for i in range(8):
            extras[f"foot-pad-{i}"] = "rubber"
    if asset_id == "ultra-low-temperature-freezer":
        for leaf in range(2):
            for edge in ("left", "right", "top", "bottom"):
                extras[f"door-seal-{edge}-{leaf}"] = "rubber"
    if asset_id == "undercounter-laboratory-freezer":
        for edge in ("left", "right", "top", "bottom"):
            extras[f"door-seal-{edge}"] = "rubber"
    if asset_id == "laboratory-faucet-set":
        extras["spout-elbow"] = "stainless"
    if asset_id == "laboratory-washup-station":
        extras["faucet-elbow"] = "stainless"
    return extras


def update_readme() -> None:
    readme_path = KIT / "README.md"
    original = readme_path.read_text().splitlines()
    table_start = next((i for i, line in enumerate(original) if line.startswith("| id | asset | description |")), None)
    if table_start is None:
        raise ValueError("lab-infrastructure README has no asset table")
    updated_intro = (
        "Sixty original low-poly room-planning props for laboratory work areas, storage, "
        "service distribution, local extraction, cleanroom transitions and cold rooms. "
        "Sources use millimetres, Z up and a ground-level base origin. Each asset exposes "
        "`scale`, two to four material-named color controls, and `cleanroom` / "
        "`highVisibility` appearance presets. The models are visual scene props, not "
        "engineering, safety or compliance specifications."
    )
    text = "\n".join([
        "# Laboratory Infrastructure kit",
        "",
        updated_intro,
        "",
        "The [laboratory infrastructure wave demo bundle](../../../artifacts/catalog-demos/lab-infrastructure-wave-20261102/README.md) retains the original source and catalog-workflow capture.",
        "",
        "The [quality-promotion demo bundle](../../../artifacts/catalog-demos/lab-infrastructure-quality-promotion-20261105/README.md) shows the refreshed materials, presets, silhouettes, preview renders and local verification.",
        "",
        *original[table_start:],
    ])
    text = text.replace("| id | asset | description | knobs |", "| id | asset | description | controls and presets |", 1)
    rows: list[str] = []
    for line in text.splitlines():
        match = re.match(r"^\| `([^`]+)` \| (.*?) \| (.*?) \| (.*?) \|$", line)
        if not match:
            rows.append(line)
            continue
        asset_id, title, description, _old_controls = match.groups()
        source_path = KIT / f"{asset_id}.kcad.ts"
        source = source_path.read_text()
        controls = [name for name in re.findall(r"const \w+ = param\('([^']+)'", source) if name != "scale"]
        presets = re.findall(r"^  ([A-Za-z_][A-Za-z0-9_]*): \{", source, re.M)
        if not 2 <= len(controls) <= 4 or len(presets) < 1:
            raise ValueError(f"{asset_id}: README row needs 2-4 controls and at least one preset")
        control_text = "scale · " + " · ".join(controls) + " · presets: " + ", ".join(presets)
        rows.append(f"| `{asset_id}` | {title} | {description} | {control_text} |")
    readme_path.write_text("\n".join(rows) + "\n")


def promote(path: Path) -> tuple[int, int, list[str], str]:
    source = path.read_text()
    asset_id = path.stem.removesuffix(".kcad")
    if "const body = param(" not in source or "const add = (name, shape" not in source:
        raise ValueError(f"{path}: not an unpromoted lab-infrastructure asset")

    parts: list[tuple[str, str, str | None]] = []
    rewritten: list[str] = []
    for line in source.splitlines():
        match = ASSET_RE.match(line)
        if match:
            name, shape, finish = match.groups()
            parts.append((name, shape, finish))
            rewritten.append(line)
        else:
            rewritten.append(line)
    if not parts:
        raise ValueError(f"{path}: no add(...) asset parts found")

    assignments = {
        name: part_material(asset_id, name, finish)
        for name, _shape, finish in parts
    }
    assignments.update(extra_material_assignments(asset_id))
    assignments = rebalance(
        asset_id,
        assignments,
    )
    materials = sorted(set(assignments.values()))
    param_lines = [
        f"const {name} = param('{name}', '{MATERIAL_LABELS[name][1]}', {{ label: '{MATERIAL_LABELS[name][0]}' }});"
        for name in materials
    ]
    preset_lines = ["presets({"]
    for preset, colors in PRESET_COLORS.items():
        overrides = ", ".join(f"{name}: '{colors[name]}'" for name in materials)
        preset_lines.append(f"  {preset}: {{ {overrides} }},")
    preset_lines.append("});")

    out: list[str] = []
    inserted = False
    description_base = None
    desc = DESCRIPTION_RE.search(source)
    if desc:
        description_base = desc.group(1).split(". Knobs:", 1)[0].rstrip(".")
        pretty = ", ".join(MATERIAL_LABELS[name][0].lower() for name in materials)
        updated = f"{description_base}. Editable material controls: {pretty}; presets: cleanroom and high visibility."
        source = source[:desc.start(1)] + updated + source[desc.end(1):]
    else:
        raise ValueError(f"{path}: no metadata description found")

    # Replace the generic author comment with a useful object/feature statement.
    comment = f"// {description_base}."
    lines = source.splitlines()
    lines[1] = comment
    for line in lines:
        if line.startswith("const body = param(") or line.startswith("const accent = param("):
            if not inserted:
                out.extend(param_lines)
                out.extend(preset_lines)
                inserted = True
            continue
        if line.startswith("const add = (name, shape"):
            continue
        match = ASSET_RE.match(line)
        if match:
            name, shape, _finish = match.groups()
            replaced_geometry = {
                "canopy-extraction-hood": {"capture-canopy"},
                "articulated-extraction-snorkel": {"lower-arm", "upper-arm", "intake-hood"},
                "laboratory-faucet-set": {"spout"},
                "laboratory-water-service-console": {"tap-spout-0", "tap-spout-1"},
                "laboratory-washup-station": {"faucet-spout"},
                "ultra-low-temperature-freezer": {"door-gasket-0", "door-gasket-1"},
                "undercounter-laboratory-freezer": {"door-gasket-0"},
            }.get(asset_id, set())
            if name in replaced_geometry:
                continue
            out.append(f"p.part('{name}', {shape}.scale(scale).color({assignments[name]}));")
            continue
        if line.strip() == "return p.model();":
            glazing = glazing_line(asset_id)
            if glazing:
                out.append(glazing)
            out.extend(geometry_enhancements(asset_id))
        out.append(line)
    if not inserted:
        raise ValueError(f"{path}: did not replace material parameter block")
    text = "\n".join(out) + "\n"

    if len(materials) < 2 or len(materials) > 4 or "presets({" not in text:
        raise ValueError(f"{path}: promotion invariant failed")
    for material in materials:
        if not re.search(rf"\.color\({re.escape(material)}\)", text):
            raise ValueError(f"{path}: {material} is declared but not applied to a part")
    return len(materials), text.count("presets({"), materials, text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    files = sorted(KIT.glob("*.kcad.ts"))
    if len(files) != 60:
        raise SystemExit(f"expected 60 existing lab-infrastructure assets, found {len(files)}")

    results = []
    for path in files:
        colors, presets, materials, text = promote(path)
        results.append((path, colors, presets, materials, text))
    if not args.dry_run:
        for path, _colors, _presets, _materials, text in results:
            path.write_text(text)
        update_readme()

    for path, colors, presets, materials, _text in results:
        print(f"{path.name}: {colors} materials ({', '.join(materials)}), {presets} preset block")
    print(f"{len(results)} existing assets; no IDs added; {'dry run' if args.dry_run else 'written'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
