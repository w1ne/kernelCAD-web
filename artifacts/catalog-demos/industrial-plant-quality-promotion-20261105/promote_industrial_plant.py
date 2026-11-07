#!/usr/bin/env python3
"""Promote the existing industrial-plant sources in place.

The source kit already has multi-part equipment silhouettes. This pass names
its editable colors by material, adds useful material variants, corrects three
weak silhouettes, and preserves the existing asset IDs and triangle budgets.
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog" / "kits" / "industrial-plant"
BEFORE_IDS = ("axial-flow-fan", "evaporative-cooling-tower", "forklift-truck")
RUBBER_ASSETS = {
    "electric-pallet-jack",
    "forklift-truck",
    "gantry-crane",
    "mobile-tool-cart",
    "scissor-lift-table",
}
RUBBER_PART = re.compile(r"wheel|caster|load-roller", re.IGNORECASE)
GLASS_PART = re.compile(r"gauge|display|screen|window|glazing|lens|lamp", re.IGNORECASE)


def color_default(line: str, name: str) -> str:
    match = re.search(rf"param\('{name}',\s*('[^']*')", line)
    if match is None:
        raise ValueError(f"could not read default color for {name}")
    return match.group(1)


def line_index(lines: list[str], prefix: str) -> int:
    matches = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    if len(matches) != 1:
        raise ValueError(f"expected one line starting {prefix!r}, found {len(matches)}")
    return matches[0]


def describe_comment(source: str) -> str:
    description = re.search(r"description: '([^']+)'", source)
    if description is None:
        raise ValueError("asset metadata needs a description")
    identity = description.group(1).split(". Knobs:", 1)[0].rstrip(".")
    return f"// {identity}."


def description_with_materials(source: str, materials: list[str]) -> str:
    match = re.search(r"description: '([^']+)'", source)
    if match is None:
        raise ValueError("asset metadata needs a description")
    base = match.group(1).split(". Knobs:", 1)[0].rstrip(".")
    control_names = ["overall scale", "steel", "safety paint"]
    if "liner" in materials:
        control_names.append("wear liner")
    if "rubber" in materials:
        control_names.append("rubber")
    if "gaugeGlass" in materials:
        control_names.append("gauge glass")
    updated = f"{base}. Controls: {', '.join(control_names)}."
    return source[: match.start(1)] + updated + source[match.end(1) :]


def preset_block(materials: list[str]) -> list[str]:
    weathered = ["steel: '#575851'", "safetyPaint: '#9e722f'"]
    if "rubber" in materials:
        weathered.append("rubber: '#27292b'")
    if "liner" in materials:
        weathered.append("liner: '#3f5054'")
    if "gaugeGlass" in materials:
        weathered.append("gaugeGlass: '#78989b'")
    return [
        "presets({",
        f"  weathered: {{ {', '.join(weathered)} }},",
        "  highVisibility: { safetyPaint: '#f5c640' },",
        "});",
    ]


def enhance_fan(lines: list[str]) -> list[str]:
    shroud = [i for i, line in enumerate(lines) if "p.part('fan-shroud'," in line]
    rim = [i for i, line in enumerate(lines) if "p.part('front-rim'," in line]
    indexes = [i for i, line in enumerate(lines) if "p.part('fan-blade-" in line]
    if len(shroud) != 1 or len(rim) != 1 or len(indexes) != 5:
        raise ValueError("axial-flow-fan expected one shroud, one rim, and five original blades")
    start, end = min(indexes), max(indexes)
    lines[shroud[0] : shroud[0] + 1] = [
        "const fanShroud = cylinder(180, 250, 12).subtract(cylinder(182, 229, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, 90, 367.2).scale(scale).color(steel);",
        "p.part('fan-shroud', fanShroud);",
    ]
    if rim[0] > shroud[0]:
        rim[0] += 1
    lines[rim[0] : rim[0] + 1] = [
        "const fanRim = cylinder(24, 275, 12).subtract(cylinder(26, 229, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, -78, 367.2).scale(scale).color(safetyPaint);",
        "p.part('front-rim', fanRim);",
    ]
    if rim[0] < start:
        start += 2
        end += 2
    elif shroud[0] < start:
        start += 1
        end += 1
    replacement = [
        "const fanBladeProfile = path()",
        "  .moveTo(56, -22)",
        "  .lineTo(188, -8)",
        "  .lineTo(193, 12)",
        "  .lineTo(91, 28)",
        "  .close();",
        "for (let blade = 0; blade < 5; blade++) {",
        "  p.part('fan-blade-' + blade, fanBladeProfile.extrude(14).rotateX(90).rotateY(blade * 72).translate(0, 0, 367.2).scale(scale).color(steel));",
        "}",
    ]
    return lines[:start] + replacement + lines[end + 1 :]


def enhance_cooling_tower(lines: list[str]) -> list[str]:
    indexes = [i for i, line in enumerate(lines) if "p.part('tower-body-" in line]
    if len(indexes) != 2:
        raise ValueError(f"evaporative-cooling-tower expected two shell blocks, got {len(indexes)}")
    start, end = min(indexes), max(indexes)
    replacement = [
        "const octagon = (radius: number) => {",
        "  let ring = path().moveTo(radius, 0);",
        "  for (let side = 1; side < 8; side++) {",
        "    const angle = (2 * Math.PI * side) / 8;",
        "    ring = ring.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));",
        "  }",
        "  return ring.close();",
        "};",
        "const towerShell = octagon(300).loft([octagon(225), octagon(245), octagon(285)], {",
        "  planes: [105, 470, 780, 890].map((z) => ({",
        "    plane: 'XY' as const,",
        "    origin: [0, 0, z] as [number, number, number],",
        "  })),",
        "  ruled: true,",
        "});",
        "p.part('tower-shell', towerShell.scale(scale).color(steel));",
    ]
    return lines[:start] + replacement + lines[end + 1 :]


def enhance_weigh_hopper(lines: list[str]) -> list[str]:
    upper = [i for i, line in enumerate(lines) if "p.part('hopper-transition-upper'," in line]
    lower = [i for i, line in enumerate(lines) if "p.part('hopper-transition-lower'," in line]
    if len(upper) != 1 or len(lower) != 1 or abs(upper[0] - lower[0]) != 1:
        raise ValueError("weigh-hopper expected adjacent upper and lower cylinder transitions")
    start, end = min(upper[0], lower[0]), max(upper[0], lower[0])
    replacement = [
        "const chamferedRectangle = (width: number, depth: number, corner: number) => path()",
        "  .moveTo(-width / 2 + corner, -depth / 2)",
        "  .lineTo(width / 2 - corner, -depth / 2)",
        "  .lineTo(width / 2, -depth / 2 + corner)",
        "  .lineTo(width / 2, depth / 2 - corner)",
        "  .lineTo(width / 2 - corner, depth / 2)",
        "  .lineTo(-width / 2 + corner, depth / 2)",
        "  .lineTo(-width / 2, depth / 2 - corner)",
        "  .lineTo(-width / 2, -depth / 2 + corner)",
        "  .close();",
        "const hopperTransition = chamferedRectangle(450, 380, 34).loft([",
        "  chamferedRectangle(300, 245, 28),",
        "  chamferedRectangle(165, 135, 18),",
        "  chamferedRectangle(128, 98, 16),",
        "], {",
        "  planes: [268, 190, 105, 70].map((z) => ({",
        "    plane: 'XY' as const,",
        "    origin: [0, 0, z] as [number, number, number],",
        "  })),",
        "  ruled: true,",
        "});",
        "p.part('hopper-transition', hopperTransition.scale(scale).color(liner));",
    ]
    return lines[:start] + replacement + lines[end + 1 :]


def update_readme() -> None:
    readme = KIT / "README.md"
    content = readme.read_text()
    old_intro = (
        "Sixty original low-poly factory scene assets for process equipment, power and controls, material handling, lifting, access and safety. "
        "Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable `scale`, `body` and `accent` controls and declares a 1,400 triangle budget. "
        "The catalog audit records the actual triangle count and one-material export for every source."
    )
    new_intro = (
        "Sixty original low-poly factory scene assets for process equipment, power and controls, material handling, lifting, access and safety. "
        "Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable scale and two to four material controls, with `weathered` and `highVisibility` presets. "
        "The models use multi-part silhouettes for process equipment, vehicles, and structures; box-based forms remain for rectilinear components. "
        "The catalog audit records source hashes, material controls, triangle counts, and rendered previews."
    )
    if old_intro not in content:
        raise ValueError("industrial-plant README introduction has changed; review it before updating")
    content = content.replace(old_intro, new_intro, 1)
    content = content.replace(
        "The [industrial plant wave demo bundle](../../../artifacts/catalog-demos/industrial-plant-wave-20261102/README.md) retains the capture source, settings, verification evidence and inspected MP4. It demonstrates the local catalog workflow; deployed behavior and physical equipment acceptance are separate states.",
        "The [industrial plant wave demo bundle](../../../artifacts/catalog-demos/industrial-plant-wave-20261102/README.md) retains the original kit capture and verification. "
        "The [2026-11-05 quality promotion bundle](../../../artifacts/catalog-demos/industrial-plant-quality-promotion-20261105/README.md) records the in-place material, preset, geometry, preview, and local validation work. "
        "Both bundles distinguish local source and preview checks from deployment and physical equipment acceptance.",
        1,
    )
    content = content.replace(
        "discharge cone and outlet gate.",
        "tapered rectangular discharge chute and outlet gate.",
    )

    updated_lines = []
    for line in content.splitlines():
        match = re.match(r"\| `([^`]+)` \|", line)
        if match is not None:
            source = (KIT / f"{match.group(1)}.kcad.ts").read_text()
            controls = ["scale", "steel", "safety paint"]
            if "const rubber = param('rubber'" in source:
                controls.append("rubber")
            if "const liner = param('liner'" in source:
                controls.append("wear liner")
            if "const gaugeGlass = param('gaugeGlass'" in source:
                controls.append("gauge glass")
            line = re.sub(r"scale · body · accent", " · ".join(controls), line, count=1)
        updated_lines.append(line)
    readme.write_text("\n".join(updated_lines) + "\n")


def promote(path: Path) -> tuple[str, list[str]]:
    asset_id = path.stem.removesuffix(".kcad")
    source = path.read_text()
    if "presets(" in source or "param('steel'" in source:
        raise ValueError(f"{path.relative_to(ROOT)} is already promoted; restore the prior source first")
    if asset_id == "weigh-hopper":
        source = source.replace(
            "discharge cone and outlet gate",
            "tapered rectangular discharge chute and outlet gate",
        )

    lines = source.splitlines()
    body_i = line_index(lines, "const body = param('body',")
    accent_i = line_index(lines, "const accent = param('accent',")
    body_default = color_default(lines[body_i], "body")
    accent_default = color_default(lines[accent_i], "accent")
    part_names = re.findall(r"p\.part\('([^']+)'", source)
    has_rubber = asset_id in RUBBER_ASSETS
    has_glass = any(GLASS_PART.search(name) for name in part_names)
    materials = ["steel", "safetyPaint"]
    if has_rubber:
        materials.append("rubber")
    if has_glass:
        materials.append("gaugeGlass")
    if asset_id == "weigh-hopper":
        materials.append("liner")

    param_lines = [
        f"const steel = param('steel', {body_default}, {{ label: 'Structural steel' }});",
        f"const safetyPaint = param('safetyPaint', {accent_default}, {{ label: 'Safety paint' }});",
    ]
    if has_rubber:
        param_lines.append("const rubber = param('rubber', '#30363a', { label: 'Rubber' });")
    if "liner" in materials:
        param_lines.append("const liner = param('liner', '#50666b', { label: 'Wear liner' });")
    if has_glass:
        param_lines.append("const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });")
    lines[body_i : accent_i + 1] = param_lines

    for i, line in enumerate(lines):
        part_match = re.search(r"p\.part\('([^']+)'", line)
        if part_match is None:
            continue
        part_name = part_match.group(1)
        if has_rubber and RUBBER_PART.search(part_name):
            line = re.sub(r"\.color\((?:body|accent)\)", ".color(rubber)", line)
        elif has_glass and GLASS_PART.search(part_name):
            line = re.sub(r"\.color\((?:body|accent)\)", ".color(gaugeGlass)", line)
        else:
            line = line.replace(".color(body)", ".color(steel)")
            line = line.replace(".color(accent)", ".color(safetyPaint)")
        lines[i] = line

    if asset_id == "axial-flow-fan":
        lines = enhance_fan(lines)
    elif asset_id == "evaporative-cooling-tower":
        lines = enhance_cooling_tower(lines)
    elif asset_id == "weigh-hopper":
        lines = enhance_weigh_hopper(lines)

    source = "\n".join(lines) + "\n"
    source = re.sub(
        r"^// Original kernelCAD low-poly .*? scene prop, modeled from scratch\.$",
        describe_comment(source),
        source,
        count=1,
        flags=re.MULTILINE,
    )
    source = description_with_materials(source, materials)

    anchor = next((line for line in source.splitlines() if line.startswith("const p = assembly(")), None)
    if anchor is None:
        raise ValueError(f"{path.relative_to(ROOT)} has no assembly declaration")
    insertion = "\n".join(preset_block(materials)) + "\n"
    source = source.replace(anchor, insertion + anchor, 1)
    if ".color(body)" in source or ".color(accent)" in source:
        raise ValueError(f"{path.relative_to(ROOT)} still has a generic color reference")
    if any(f".color({material})" not in source for material in materials):
        raise ValueError(f"{path.relative_to(ROOT)} declares a material color that no part uses")
    if source.count("presets(") != 1:
        raise ValueError(f"{path.relative_to(ROOT)} did not receive one presets block")

    return source, materials


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sources = sorted(KIT.glob("*.kcad.ts"))
    if len(sources) != 60:
        raise SystemExit(f"expected 60 existing industrial-plant sources, found {len(sources)}")
    promotions = [(path, *promote(path)) for path in sources]
    counts: dict[int, int] = {}
    for _, _, materials in promotions:
        counts[len(materials)] = counts.get(len(materials), 0) + 1
    if args.dry_run:
        print(f"dry run: validated promotion of {len(sources)} industrial-plant assets, adding no IDs")
        print("geometry focus: axial-flow-fan, evaporative-cooling-tower, weigh-hopper")
    else:
        (BUNDLE / "before").mkdir(parents=True, exist_ok=True)
        for asset_id in BEFORE_IDS:
            preview = KIT / "previews" / f"{asset_id}.png"
            if not preview.is_file():
                raise SystemExit(f"missing original preview {preview}")
            shutil.copy2(preview, BUNDLE / "before" / preview.name)
        for path, source, _ in promotions:
            path.write_text(source)
        update_readme()
        print(f"promoted {len(sources)} industrial-plant assets, adding no IDs")
        print(f"material-control counts per asset: {counts}")
        print(f"retained original previews: {len(BEFORE_IDS)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
