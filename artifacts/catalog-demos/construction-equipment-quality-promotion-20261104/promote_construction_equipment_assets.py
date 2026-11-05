#!/usr/bin/env python3
"""Promote the existing construction-equipment assets with material palettes."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "construction-equipment"

PALETTES = {
    "paint": {
        "name": "equipmentPaintColor", "label": "Equipment enamel paint",
        "base": "#e1a31b", "weathered": "#a87b36", "highVisibility": "#f06b26",
    },
    "steel": {
        "name": "structuralSteelColor", "label": "Exposed structural steel",
        "base": "#89969a", "weathered": "#716b61", "highVisibility": "#c1c7c2",
    },
    "rubber": {
        "name": "tireRubberColor", "label": "Tire and grip rubber",
        "base": "#252a2d", "weathered": "#3a3a37", "highVisibility": "#292e31",
    },
    "glass": {
        "name": "cabGlassColor", "label": "Cab glass",
        "base": "#77a4b0", "weathered": "#66858b", "highVisibility": "#91bdc6",
    },
}

METAL_PARTS = (
    "hub", "frame", "chassis", "axle", "rod", "rail", "rung", "beam", "bracket",
    "mast", "pin", "roller", "drum", "blade", "shaft", "guard", "hinge", "tie",
    "brace", "clamp", "strongback", "waler", "stiffener", "foot", "stake", "disc",
    "cutter", "screed", "sprocket", "idler", "grille", "coupling", "valve", "fitting",
    "strut", "outrigger", "fork", "carriage", "winch", "handle", "ladder", "crossbar",
    "support", "stand", "track-roller", "grouser", "wheel-hub", "lift-arm", "pedal",
)
RUBBER_PARTS = ("tire", "tyre", "belt", "track-belt", "tread", "grip", "caster", "seal", "hose")
GLASS_PARTS = ("window", "glazing", "windshield", "screen", "lens", "display")


def split_add_line(line: str):
    """Split one generated add(...) line at top-level commas."""
    match = re.match(r"^(\s*)add\((.*)\);\s*$", line)
    if not match:
        return None
    text = match.group(2)
    fields, start, depth, quote, escaped = [], 0, 0, None, False
    for i, char in enumerate(text):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"":
            quote = char
        elif char in "([{" :
            depth += 1
        elif char in ")]}":
            depth -= 1
        elif char == "," and depth == 0:
            fields.append(text[start:i].strip())
            start = i + 1
    fields.append(text[start:].strip())
    if len(fields) < 2:
        return None
    name_match = re.fullmatch(r"(['\"])(.*?)\1", fields[0])
    if not name_match:
        return None
    return match.group(1), name_match.group(1), name_match.group(2), fields[1], fields[2] if len(fields) > 2 else None


def material_role(part: str, old_finish: str | None) -> str:
    part = part.lower()
    if any(term in part for term in GLASS_PARTS):
        return "glass"
    if "hub" in part:
        return "steel"
    if any(term in part for term in RUBBER_PARTS):
        return "rubber"
    if "wheel" in part or "tyre" in part or "tire" in part:
        return "rubber"
    if any(term in part for term in METAL_PARTS):
        return "steel"
    if old_finish and "#40474b" in old_finish.lower():
        return "rubber"
    return "paint"


def convert_rotation_syntax(source: str) -> str:
    for vector, axis in (("1, 0, 0", "X"), ("0, 1, 0", "Y"), ("0, 0, 1", "Z")):
        pattern = rf"\.rotate\(\[\s*{re.escape(vector)}\s*\],\s*([^()]*(?:\([^()]*\)[^()]*)*)\)"
        source = re.sub(pattern, rf".rotate{axis}(\1)", source)
    return source


def cab_details(source: str, asset_id: str) -> tuple[str, int]:
    """Add glass, a tapered front grille, lights and mirrors to cabbed equipment."""
    if any(tag in asset_id for tag in ("trailer", "light-tower")):
        return source, 0
    cab = None
    for line in source.splitlines():
        parsed = split_add_line(line)
        if not parsed:
            continue
        _, _, part, shape, _ = parsed
        low = part.lower()
        if not re.search(r"(^|[-_])(cab|operator-cab|crew-cab|hauler-cab|pump-cab|mixer-cab)([-_]|$)", low):
            continue
        if any(x in low for x in ("window", "glazing", "roof", "post", "guard")):
            continue
        dims = re.search(
            r"box\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*true\).*?\.translate\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)",
            shape,
        )
        if dims:
            cab = (part, *map(float, dims.groups()))
            break
    if not cab:
        return source, 0
    name, sx, sy, sz, cx, cy, cz = cab
    front_x = cx + sx / 2
    source_lines = source.splitlines()
    adjusted_window = False
    for index, line in enumerate(source_lines):
        parsed = split_add_line(line)
        if not parsed:
            continue
        indent, quote, part, _, _ = parsed
        low = part.lower()
        if ("window" not in low and "glazing" not in low) or "cab" not in low:
            continue
        window_shape = (
            f"box({sx * 0.30:.2f}, 14, {sz * 0.25:.2f}, true)"
            f".translate({cx - sx * 0.05:.2f}, {cy - sy / 2 - 7:.2f}, {cz + sz * 0.26:.2f})"
        )
        source_lines[index] = f"{indent}add({quote}{part}{quote}, {window_shape}, cabGlassColor);"
        adjusted_window = True
        break
    source = "\n".join(source_lines)
    windshield = (
        "const grilleProfile = path()"
        f".moveTo({-sz * 0.19:.2f}, {-sy * 0.30:.2f})"
        f".lineTo({sz * 0.19:.2f}, {-sy * 0.30:.2f})"
        f".lineTo({sz * 0.16:.2f}, {sy * 0.30:.2f})"
        f".lineTo({-sz * 0.16:.2f}, {sy * 0.30:.2f}).close()"
        f".extrude(16).rotateY(90).translate({front_x + 5:.2f}, {cy:.2f}, {cz - sz * 0.20:.2f});"
    )
    glass_parts = [
        f"add('cab-windshield', box(16, {sy * 0.62:.2f}, {sz * 0.27:.2f}, true).rotateY(-7).translate({front_x + 10:.2f}, {cy:.2f}, {cz + sz * 0.13:.2f}), cabGlassColor);",
        f"add('cab-side-glazing-far', box({sx * 0.30:.2f}, 14, {sz * 0.25:.2f}, true).translate({cx - sx * 0.05:.2f}, {cy + sy / 2 + 7:.2f}, {cz + sz * 0.26:.2f}), cabGlassColor);",
    ]
    detail_parts = [
        f"add('front-grille', {windshield.split(' = ', 1)[1][:-1]}, structuralSteelColor);",
        f"add('headlamp-near', box(22, {sy * 0.15:.2f}, {sz * 0.095:.2f}, true).translate({front_x + 10:.2f}, {cy - sy * 0.31:.2f}, {cz - sz * 0.26:.2f}), cabGlassColor);",
        f"add('headlamp-far', box(22, {sy * 0.15:.2f}, {sz * 0.095:.2f}, true).translate({front_x + 10:.2f}, {cy + sy * 0.31:.2f}, {cz - sz * 0.26:.2f}), cabGlassColor);",
        f"add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate({cx + sx * 0.28:.2f}, {cy - sy * 0.62:.2f}, {cz + sz * 0.12:.2f}), structuralSteelColor);",
        f"add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate({cx + sx * 0.28:.2f}, {cy + sy * 0.62:.2f}, {cz + sz * 0.12:.2f}), structuralSteelColor);",
        f"add('mirror-glass-left', box(18, 48, 66, true).translate({cx + sx * 0.35:.2f}, {cy - sy * 0.68:.2f}, {cz + sz * 0.18:.2f}), cabGlassColor);",
        f"add('mirror-glass-right', box(18, 48, 66, true).translate({cx + sx * 0.35:.2f}, {cy + sy * 0.68:.2f}, {cz + sz * 0.18:.2f}), cabGlassColor);",
        f"add('cab-step', box({sx * 0.28:.2f}, 54, 36, true).translate({cx + sx * 0.14:.2f}, {cy - sy / 2 - 24:.2f}, {cz - sz * 0.42:.2f}), structuralSteelColor);",
        f"add('cab-door-handle', box(28, 16, 12, true).translate({cx + sx * 0.17:.2f}, {cy - sy / 2 - 10:.2f}, {cz - sz * 0.02:.2f}), structuralSteelColor);",
    ]
    if adjusted_window:
        glass_parts = glass_parts[:2]
    block = "\n".join([*detail_parts, *glass_parts])
    source = source.replace("\nreturn p.model();", "\n" + block + "\n\nreturn p.model();")
    return source, len(detail_parts) + len(glass_parts)


def add_hydraulic_details(source: str, asset_id: str) -> tuple[str, int]:
    if asset_id == "articulated-dump-truck":
        details = '''const hydraulicStrut = (from: [number, number, number], to: [number, number, number], radius: number) => {
  const dx = to[0] - from[0]; const dy = to[1] - from[1]; const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, radius, 8).rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
};
add('dump-body-lift-ram-left', hydraulicStrut([-70, -307, 255], [-315, -307, 495], 28), structuralSteelColor);
add('dump-body-lift-ram-right', hydraulicStrut([-70, 307, 255], [-315, 307, 495], 28), structuralSteelColor);
add('tailgate-hinge-left', cylinder(42, 32, 8).rotateX(90).translate(-648, -292, 288), structuralSteelColor);
add('tailgate-hinge-right', cylinder(42, 32, 8).rotateX(90).translate(-648, 292, 288), structuralSteelColor);
add('articulation-pin-near', cylinder(36, 58, 10).rotateX(90).translate(93, -229, 325), structuralSteelColor);'''
        return source.replace("\nreturn p.model();", "\n" + details + "\n\nreturn p.model();"), 5
    if asset_id == "crawler-dozer":
        details = '''const hydraulicStrut = (from: [number, number, number], to: [number, number, number], radius: number) => {
  const dx = to[0] - from[0]; const dz = to[2] - from[2];
  return cylinder(Math.hypot(dx, dz), radius, 8).rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .translate((from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2);
};
add('blade-cheek-left', box(125, 76, 338, true).rotateY(-17).translate(622, -454, 300), equipmentPaintColor);
add('blade-cheek-right', box(125, 76, 338, true).rotateY(17).translate(622, 454, 300), equipmentPaintColor);
add('blade-lift-ram-left', hydraulicStrut([353, -318, 345], [532, -318, 455], 29), structuralSteelColor);
add('blade-lift-ram-right', hydraulicStrut([353, 318, 345], [532, 318, 455], 29), structuralSteelColor);'''
        return source.replace("\nreturn p.model();", "\n" + details + "\n\nreturn p.model();"), 4
    if asset_id == "concrete-pump-truck":
        hopper = '''const hopperProfile = (width: number, depth: number) => path()
  .moveTo(-width / 2, -depth / 2).lineTo(width / 2, -depth / 2)
  .lineTo(width / 2, depth / 2).lineTo(-width / 2, depth / 2).close();
const pumpHopper = hopperProfile(210, 255).loft([hopperProfile(324, 377)], {
  planes: [
    { plane: 'XY' as const, origin: [-450, 0, 280] as [number, number, number] },
    { plane: 'XY' as const, origin: [-450, 0, 580] as [number, number, number] },
  ], ruled: true,
});
add('pump-hopper', pumpHopper, equipmentPaintColor);'''
        source = re.sub(r"add\('pump-hopper', box\(324, 377\.2, 300, true\)\.translate\(-450, 0, 430\), [A-Za-z]+\);", hopper, source)
        source = source.replace(
            "add('boom-section-b', box(504, 76, 78, true).rotateY(35).translate(-918, 0, 1180), equipmentPaintColor);",
            "add('boom-section-b', box(360, 76, 78, true).rotateY(55).translate(-782, 0, 1183), equipmentPaintColor);",
        )
        source = source.replace(
            "add('delivery-hose', box(48, 48, 1350, true).translate(-1116, 0, 675), tireRubberColor);",
            "add('delivery-hose', box(18, 18, 380, true).translate(-885, 0, 1140), tireRubberColor);",
        )
        details = '''const hydraulicStrut = (from: [number, number, number], to: [number, number, number], radius: number) => {
  const dx = to[0] - from[0]; const dy = to[1] - from[1]; const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, radius, 8).rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
};
add('boom-cylinder-a', hydraulicStrut([-250, -58, 520], [-430, -58, 845], 23), structuralSteelColor);
add('boom-cylinder-b', hydraulicStrut([-650, -52, 930], [-875, -52, 1115], 20), structuralSteelColor);
add('outrigger-beam-rear', box(140, 690, 58, true).translate(310, 0, 170), structuralSteelColor);
add('outrigger-rear-column-left', box(72, 72, 145, true).translate(310, -438, 107), structuralSteelColor);
add('outrigger-rear-column-right', box(72, 72, 145, true).translate(310, 438, 107), structuralSteelColor);
add('outrigger-rear-foot-left', box(150, 145, 34, true).translate(310, -438, 17), equipmentPaintColor);
add('outrigger-rear-foot-right', box(150, 145, 34, true).translate(310, 438, 17), equipmentPaintColor);'''
        source = source.replace("\nreturn p.model();", "\n" + details + "\n\nreturn p.model();")
        return source, 7
    return source, 0


def add_tread_details(source: str, asset_id: str) -> tuple[str, int]:
    if asset_id not in {"crawler-dozer", "track-asphalt-paver", "tracked-concrete-buggy"}:
        return source, 0
    # The original belts are wide, flat track bands. Raised shoes make their
    # contact surface read as a track without filling the wheel clearance.
    if asset_id == "crawler-dozer":
        xs = [-390, -230, -70, 90, 250, 390]
        ys, z, width, height = (-421, 421), 255, 118, 34
        prefix = "dozer"
    elif asset_id == "track-asphalt-paver":
        xs = [-390, -220, -50, 120, 290, 430]
        ys, z, width, height = (-414, 414), 210, 124, 28
        prefix = "paver"
    else:
        xs = [-360, -180, 0, 180, 360]
        ys, z, width, height = (-350, 350), 184, 120, 28
        prefix = "buggy"
    detail_lines = []
    for side, y in zip(("left", "right"), ys):
        for index, x in enumerate(xs, 1):
            detail_lines.append(
                f"add('{prefix}-track-shoe-{side}-{index}', box({width}, 30, {height}, true).translate({x}, {y}, {z}), tireRubberColor);"
            )
    source = source.replace("\nreturn p.model();", "\n" + "\n".join(detail_lines) + "\n\nreturn p.model();")
    return source, len(detail_lines)


def improve_signature_shapes(source: str, asset_id: str) -> tuple[str, int]:
    count = 0
    if asset_id == "concrete-batch-plant":
        # Tapered aggregate bins and a round cement silo break up the blockout
        # silhouette while retaining the existing mixer, platform and frame.
        source = source.replace(
            "add('aggregate-bin-0', box(352, 400, 779, true).translate(-544, -375, 389.5), equipmentPaintColor);",
            "const binProfile = (width: number, depth: number) => path()\n"
            "  .moveTo(-width / 2, -depth / 2).lineTo(width / 2, -depth / 2)\n"
            "  .lineTo(width / 2, depth / 2).lineTo(-width / 2, depth / 2).close();\n"
            "const aggregateBin = (x: number) => binProfile(240, 290).loft([binProfile(352, 400)], {\n"
            "  planes: [\n"
            "    { plane: 'XY' as const, origin: [x, -375, 0] as [number, number, number] },\n"
            "    { plane: 'XY' as const, origin: [x, -375, 779] as [number, number, number] },\n"
            "  ], ruled: true,\n"
            "});\n"
            "add('aggregate-bin-0', aggregateBin(-544), equipmentPaintColor);",
        )
        source = source.replace(
            "add('aggregate-bin-1', box(352, 400, 779, true).translate(0, -375, 389.5), equipmentPaintColor);",
            "add('aggregate-bin-1', aggregateBin(0), equipmentPaintColor);",
        ).replace(
            "add('aggregate-bin-2', box(352, 400, 779, true).translate(544, -375, 389.5), equipmentPaintColor);",
            "add('aggregate-bin-2', aggregateBin(544), equipmentPaintColor);",
        )
        source = source.replace(
            "add('cement-silo', box(288, 250, 1558, true).translate(496, 350, 779), equipmentPaintColor);",
            "add('cement-silo', cylinder(125, 1558, 16).translate(496, 350, 779), equipmentPaintColor);",
        )
        count += 4
    if asset_id == "concrete-placement-bucket":
        # A tapered hopper reads as a placement bucket and narrows toward its
        # gated discharge instead of forming four vertical box walls.
        source = source.replace(
            "add('hopper-side--1', box(48, 489.6, 609, true).translate(-216, 0, 379.5), equipmentPaintColor);",
            "const bucketProfile = (width: number, depth: number) => path()\n"
            "  .moveTo(-width / 2, -depth / 2).lineTo(width / 2, -depth / 2)\n"
            "  .lineTo(width / 2, depth / 2).lineTo(-width / 2, depth / 2).close();\n"
            "const bucketShell = bucketProfile(300, 300).loft([bucketProfile(460, 460)], {\n"
            "  planes: [\n"
            "    { plane: 'XY' as const, origin: [0, 0, 75] as [number, number, number] },\n"
            "    { plane: 'XY' as const, origin: [0, 0, 680] as [number, number, number] },\n"
            "  ], ruled: true,\n"
            "});\n"
            "add('tapered-bucket-shell', bucketShell, equipmentPaintColor);",
        )
        source = source.replace(
            "add('hopper-side-1', box(48, 489.6, 609, true).translate(216, 0, 379.5), equipmentPaintColor);\n", ""
        ).replace(
            "add('hopper-front', box(446.4, 48, 525, true).translate(0, -204, 337.5), equipmentPaintColor);\n", ""
        )
        count += 1
    if asset_id == "laser-level-tripod":
        # Spread the three feet so the survey stand has a tripod stance in its
        # preview, with each foot still sitting above the source origin.
        source = source.replace(
            "box(38, 38, 1076.4, true).translate(81.6, 0, 538.2)",
            "box(38, 38, 1076.4, true).rotateY(8).translate(81.6, 0, 542.2)",
        ).replace(
            "box(38, 38, 1076.4, true).translate(-40.8, 70.668, 538.2)",
            "box(38, 38, 1076.4, true).rotateY(-4).rotateX(-7).translate(-40.8, 70.668, 542.2)",
        ).replace(
            "box(38, 38, 1076.4, true).translate(-40.8, -70.668, 538.2)",
            "box(38, 38, 1076.4, true).rotateY(-4).rotateX(7).translate(-40.8, -70.668, 542.2)",
        )
        count += 5
    if asset_id == "portable-site-water-tank":
        # A vertical cylindrical tank matches the common molded site tank
        # profile and sits directly on the existing skid.
        source = source.replace(
            "add('tank-body', box(733.2, 562.4, 900, true).translate(0, 0, 515), equipmentPaintColor);",
            "add('tank-body', cylinder(281.2, 900, 16).translate(0, 0, 515), equipmentPaintColor);\n"
            "add('tank-saddle-left', box(76, 570, 170, true).translate(-228, 0, 149), structuralSteelColor);\n"
            "add('tank-saddle-right', box(76, 570, 170, true).translate(228, 0, 149), structuralSteelColor);",
        )
        count += 2
    if asset_id == "rebar-cutting-machine":
        # The long shear lever and its cross-grip are the identifying operating
        # feature of a manual rebar cutter.
        details = (
            "add('shear-lever', box(390, 36, 42, true).rotateY(30).translate(350, 0, 590), structuralSteelColor);\n"
            "add('shear-lever-grip', cylinder(24, 112, 10).rotateY(90).translate(522, 0, 689), equipmentPaintColor);\n"
            "add('cutter-pivot', cylinder(54, 42, 10).rotateX(90).translate(216, -177, 378.8), structuralSteelColor);"
        )
        source = source.replace("\nreturn p.model();", "\n" + details + "\n\nreturn p.model();")
        count += 3
    if asset_id == "articulated-dump-truck":
        # A hauler uses a forward steering axle and tandem rear bogie. The
        # original wave only had one axle beneath the dump body, so add the
        # missing pair and a visible cross-axle at the articulation.
        source = source.replace(
            "add('articulation-pin-near', cylinder(36, 58, 10).rotateX(90).translate(93, -229, 325), structuralSteelColor);",
            "add('articulation-pin-near', cylinder(36, 58, 10).rotateX(90).translate(93, -229, 325), structuralSteelColor);\n"
            "add('hauler-tandem-axle', cylinder(420, 42, 10).rotateX(90).translate(-105, 0, 145), structuralSteelColor);\n"
            "add('hauler-tandem-wheel-near', cylinder(110, 145, 12).rotateX(90).translate(-105, -269, 145), tireRubberColor);\n"
            "add('hauler-tandem-wheel-far', cylinder(110, 145, 12).rotateX(90).translate(-105, 379, 145), tireRubberColor);\n"
            "add('hauler-tandem-hub-near', cylinder(17.6, 55.1, 10).rotateX(90).translate(-105, -387.8, 145), structuralSteelColor);\n"
            "add('hauler-tandem-hub-far', cylinder(17.6, 55.1, 10).rotateX(90).translate(-105, 387.8, 145), structuralSteelColor);",
        )
        count += 5
    if asset_id == "lowboy-equipment-trailer":
        source = source.replace(
            "add('loading-ramp--1', box(370, 55, 290, true).translate(-777, -254.2, 145), equipmentPaintColor);",
            "add('loading-ramp--1', box(460, 55, 54, true).rotateY(-38).translate(-777, -254.2, 175), equipmentPaintColor);",
        )
        source = source.replace(
            "add('loading-ramp-1', box(370, 55, 290, true).translate(-777, 254.2, 145), equipmentPaintColor);",
            "add('loading-ramp-1', box(460, 55, 54, true).rotateY(-38).translate(-777, 254.2, 175), equipmentPaintColor);",
        )
        source = source.replace(
            "add('drawbar', box(518, 90, 75, true).translate(703, 0, 167.5), equipmentPaintColor);",
            "add('drawbar', box(518, 90, 75, true).translate(703, 0, 167.5), equipmentPaintColor);\n"
            "add('drawbar-arm-left', box(720, 52, 52, true).rotateZ(-19).translate(580, -112, 166), structuralSteelColor);\n"
            "add('drawbar-arm-right', box(720, 52, 52, true).rotateZ(19).translate(580, 112, 166), structuralSteelColor);\n"
            "add('lowboy-raised-neck', box(320, 480, 100, true).translate(415, 0, 250), structuralSteelColor);\n"
            "add('lowboy-neck-transition', box(230, 480, 70, true).rotateY(-22).translate(150, 0, 210), structuralSteelColor);\n"
            "add('trailer-tandem-wheel-near', cylinder(86, 150, 12).rotateX(90).translate(-286, -301.4, 150), tireRubberColor);\n"
            "add('trailer-tandem-wheel-far', cylinder(86, 150, 12).rotateX(90).translate(-286, 387.4, 150), tireRubberColor);\n"
            "add('trailer-tandem-hub-near', cylinder(13.76, 57, 10).rotateX(90).translate(-286, -394.28, 150), structuralSteelColor);\n"
            "add('trailer-tandem-hub-far', cylinder(13.76, 57, 10).rotateX(90).translate(-286, 394.28, 150), structuralSteelColor);",
        )
        count += 10
    if asset_id == "track-asphalt-paver":
        hopper = '''const hopperProfile = (width: number, depth: number) => path()
  .moveTo(-width / 2, -depth / 2).lineTo(width / 2, -depth / 2)
  .lineTo(width / 2, depth / 2).lineTo(-width / 2, depth / 2).close();
const paverHopper = hopperProfile(280, 430).loft([hopperProfile(470, 720)], {
  planes: [
    { plane: 'XY' as const, origin: [527, 0, 300] as [number, number, number] },
    { plane: 'XY' as const, origin: [527, 0, 660] as [number, number, number] },
  ], ruled: true,
});
add('material-hopper', paverHopper, equipmentPaintColor);'''
        source = re.sub(r"add\('material-hopper', box\(372, 648, 360, true\)\.translate\(527, 0, 480\), [A-Za-z]+\);", hopper, source)
        source = source.replace(
            "add('hopper-wing-left', box(310, 72, 340, true).translate(527, -306, 480), body);",
            "add('hopper-wing-left', box(310, 72, 340, true).rotateY(-12).translate(527, -306, 480), equipmentPaintColor);",
        ).replace(
            "add('hopper-wing-right', box(310, 72, 340, true).translate(527, 306, 480), body);",
            "add('hopper-wing-right', box(310, 72, 340, true).rotateY(12).translate(527, 306, 480), equipmentPaintColor);",
        )
        count += 3
    if asset_id == "wheel-asphalt-paver":
        # Give the feed hopper its outward flare and add the missing conveyor lip.
        source = re.sub(
            r"add\('material-hopper', box\(([-\d.]+), ([-\d.]+), ([-\d.]+), true\)\.translate\(([-\d.]+), ([-\d.]+), ([-\d.]+)\), [A-Za-z]+\);",
            lambda m: f"add('material-hopper', box({m.group(1)}, {m.group(2)}, {m.group(3)}, true).rotateY(-8).translate({m.group(4)}, {m.group(5)}, {m.group(6)}), equipmentPaintColor);",
            source,
            count=1,
        )
        count += 1
    return source, count


def promote(path: Path) -> dict:
    source = path.read_text(encoding="utf-8")
    if "presets({" in source or "equipmentPaintColor" in source:
        raise ValueError(f"{path.name} is already promoted; restore the original wave first")
    asset_id = path.name.removesuffix(".kcad.ts")
    lines = source.splitlines()
    used_roles: set[str] = set()
    part_assignments: dict[str, str] = {}
    for index, line in enumerate(lines):
        parsed = split_add_line(line)
        if not parsed:
            continue
        indent, quote, part, shape, old_finish = parsed
        role = material_role(part, old_finish)
        part_assignments[part] = role
        used_roles.add(role)
        replacement = f"{indent}add({quote}{part}{quote}, {shape}, {PALETTES[role]['name']});"
        lines[index] = replacement

    has_glazed_cab = any(
        parsed
        and re.search(r"(^|[-_])(cab|operator-cab|crew-cab|hauler-cab|pump-cab|mixer-cab)([-_]|$)", parsed[2].lower())
        and not any(term in parsed[2].lower() for term in ("window", "glazing", "roof", "post", "guard"))
        for parsed in (split_add_line(line) for line in lines)
    )
    if has_glazed_cab:
        used_roles.add("glass")

    # A second, separate finish keeps genuinely all-metal or all-painted tools
    # editable without introducing a meaningless generic `color` knob.
    if len(used_roles) < 2:
        candidate = next((name for name in part_assignments if "accent" in name.lower()), None)
        if candidate is None:
            candidate = next(iter(part_assignments), None)
        if candidate is None:
            raise ValueError(f"no named component calls found in {path.name}")
        role = "paint" if part_assignments[candidate] != "paint" else "steel"
        part_assignments[candidate] = role
        for i, line in enumerate(lines):
            parsed = split_add_line(line)
            if parsed and parsed[2] == candidate:
                lines[i] = f"{parsed[0]}add({parsed[1]}{candidate}{parsed[1]}, {parsed[3]}, {PALETTES[role]['name']});"
                used_roles.add(role)
                break
    if not 2 <= len(used_roles) <= 4:
        raise ValueError(f"expected 2-4 material roles for {path.name}; got {sorted(used_roles)}")

    source = "\n".join(lines) + "\n"
    source = re.sub(
        r"const body = param\('body', '#78828a', \{ label: 'Body color' \}\);\nconst accent = param\('accent', '#d29a36', \{ label: 'Accent color' \}\);",
        "\n".join(
            f"const {PALETTES[role]['name']} = param('{PALETTES[role]['name']}', '{PALETTES[role]['base']}', {{ label: '{PALETTES[role]['label']}' }});"
            for role in sorted(used_roles)
        ),
        source,
        count=1,
    )
    if "const body = param" in source or "const accent = param" in source:
        raise ValueError(f"parameter replacement failed for {path.name}")
    preset_lines = []
    for preset in ("weathered", "highVisibility"):
        values = ", ".join(
            f"{PALETTES[role]['name']}: '{PALETTES[role][preset]}'" for role in sorted(used_roles)
        )
        preset_lines.append(f"  {preset}: {{ {values} }},")
    anchor = max(source.index(f"const {PALETTES[role]['name']} = param(") for role in used_roles)
    end_line = source.index("\n", anchor) + 1
    source = source[:end_line] + "presets({\n" + "\n".join(preset_lines) + "\n});\n" + source[end_line:]
    source = source.replace("finish = body", "finish = equipmentPaintColor")
    source = convert_rotation_syntax(source)

    description_match = re.search(r'description: ("(?:[^"\\]|\\.)*")\s*,', source)
    if not description_match:
        raise ValueError(f"description not found in {path.name}")
    description = json.loads(description_match.group(1))
    bare = re.sub(r" Knobs:.*$", "", description)
    labels = [PALETTES[role]["label"].lower() for role in sorted(used_roles)]
    new_description = f"{bare} Material controls: {', '.join(labels)}; weathered and highVisibility presets."
    source = source[:description_match.start(1)] + json.dumps(new_description) + source[description_match.end(1):]
    comment = bare.rstrip(".") + "."
    source = re.sub(r"^// Original kernelCAD low-poly .*? modeled from scratch\.$", f"// {comment}", source, count=1, flags=re.M)

    source, cab_detail_count = cab_details(source, asset_id)
    source, hydraulic_count = add_hydraulic_details(source, asset_id)
    source, tr