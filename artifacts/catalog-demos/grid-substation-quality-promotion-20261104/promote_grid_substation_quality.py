#!/usr/bin/env python3
"""Promote the existing grid-substation kit with material separation and detail.

This promotion retains the 80 source IDs. It converts the source generator's
named components into directly colored assembly parts, adds material presets,
faceted insulating profiles, structural braces, and small object-specific
details. It is intentionally tied to this kit's authored recipes.
"""

from __future__ import annotations

import argparse
import ast
import json
import math
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/grid-substation"
GENERATOR = ROOT / "artifacts/catalog-demos/grid-substation-wave-20261103/generate_grid_substation_assets.py"

PALETTE = {
    "galvanizedSteel": ("Galvanized steel", "#7f8c92"),
    "stainlessSteel": ("Stainless steel", "#b5c0c0"),
    "porcelain": ("Porcelain", "#e6dfcb"),
    "copper": ("Copper", "#b87545"),
    "concrete": ("Concrete", "#92938b"),
    "transformerEnamel": ("Transformer enamel", "#557052"),
    "powderCoat": ("Powder-coated steel", "#526f68"),
    "rubber": ("Rubber", "#293034"),
    "glass": ("Glass", "#4d929b"),
    "polymer": ("Insulating polymer", "#6f91a0"),
    "cableJacket": ("Cable jacket", "#263d50"),
    "safetyYellow": ("Safety yellow", "#efbd32"),
    "hazardBlack": ("Hazard black", "#20292d"),
    "safetyRed": ("Safety red", "#c7493c"),
    "signalAmber": ("Signal amber", "#f39c36"),
    "brass": ("Brass", "#bf9143"),
}

DEFAULT_ROLE = {
    "portal": "galvanizedSteel", "mast": "galvanizedSteel", "crossarm": "galvanizedSteel",
    "string": "galvanizedSteel", "insulator": "galvanizedSteel", "busbridge": "galvanizedSteel",
    "expansion": "galvanizedSteel", "spacer": "galvanizedSteel", "frame": "galvanizedSteel",
    "sign": "galvanizedSteel", "switch": "galvanizedSteel", "breaker": "powderCoat",
    "gis": "powderCoat", "instrument": "powderCoat", "arrester": "galvanizedSteel",
    "lineTrap": "galvanizedSteel", "grading": "galvanizedSteel", "termination": "galvanizedSteel",
    "transformer": "transformerEnamel", "radiator": "transformerEnamel", "fan": "galvanizedSteel",
    "oilTank": "transformerEnamel", "bushing": "powderCoat", "cabinet": "powderCoat",
    "breather": "galvanizedSteel", "pressure": "galvanizedSteel", "oilSample": "powderCoat",
    "firewall": "concrete", "bund": "concrete", "bogie": "galvanizedSteel", "pump": "galvanizedSteel",
    "battery": "galvanizedSteel", "console": "powderCoat", "panel": "powderCoat",
    "trench": "concrete", "cover": "concrete", "tray": "galvanizedSteel", "pit": "concrete",
    "ground": "concrete", "clamp": "galvanizedSteel", "groundbar": "galvanizedSteel",
    "reel": "galvanizedSteel", "cart": "powderCoat", "testdiv": "galvanizedSteel",
    "barrier": "galvanizedSteel", "chainGate": "powderCoat", "fire": "galvanizedSteel",
    "fireMonitor": "galvanizedSteel", "separator": "concrete", "light": "galvanizedSteel",
    "platform": "galvanizedSteel", "canopy": "galvanizedSteel",
}

ROLE_PRIORITY = {
    "safetyYellow": 100, "safetyRed": 98, "signalAmber": 96, "hazardBlack": 94,
    "glass": 90, "porcelain": 88, "copper": 86, "brass": 84, "rubber": 82,
    "polymer": 80, "cableJacket": 78, "concrete": 76, "stainlessSteel": 72,
    "transformerEnamel": 70, "powderCoat": 68, "galvanizedSteel": 60,
}

CALL_RE = re.compile(r'^(B|C|CY|CX)\("([^"]+)",\s*(.*)\);$')
B_RE = re.compile(r'^B\("([^"]+)",\s*\[([^\]]+)\],\s*\[([^\]]+)\]\);$')
C_RE = re.compile(r'^C\("([^"]+)",\s*([-\d.]+),\s*([-\d.]+),\s*\[([^\]]+)\]\);$')
CY_RE = re.compile(r'^(CY|CX)\("([^"]+)",\s*([-\d.]+),\s*([-\d.]+),\s*\[([^\]]+)\]\);$')
GENERIC_RE = re.compile(r"const color = param\(\"color\", \"#[0-9a-fA-F]{6}\", \{ label: \"Asset color\" \}\);")


def parse_asset_rows() -> dict[str, tuple]:
    module = ast.parse(GENERATOR.read_text(encoding="utf-8"))
    for node in module.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "ASSETS" for target in node.targets
        ):
            rows = ast.literal_eval(node.value)
            return {row[0]: row for row in rows}
    raise RuntimeError("grid-substation generator has no literal ASSETS table")


ASSETS = parse_asset_rows()


def asset_id(path: Path) -> str:
    return path.name.removesuffix(".kcad.ts")


def fmt(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:.2f}"


def numbers(values: str) -> list[float]:
    return [float(value.strip()) for value in values.split(",")]


def default_role(form: str) -> str:
    return DEFAULT_ROLE[form]


def material_for(asset: tuple, part: str) -> str:
    _asset_id, _title, _group, form, _dims, _description, subtype = asset
    name = part.lower()

    if form == "portal":
        if name.startswith("foot-"):
            return "concrete"
        if "insulator" in name:
            return "porcelain"
    elif form in {"mast", "crossarm"}:
        if name in {"foundation", "base-plate"}:
            return "concrete"
        if "insulator" in name:
            return "porcelain"
        if name == "pointed-tip":
            return "stainlessSteel"
    elif form == "string":
        if "shed" in name:
            return "porcelain"
        return "stainlessSteel"
    elif form == "insulator":
        if "shed" in name or name == "core":
            return "porcelain"
        if name == "top-cap":
            return "stainlessSteel"
    elif form == "busbridge":
        if name.startswith("base-"):
            return "concrete"
        if "insulator" in name:
            return "porcelain"
        if "bus-span" in name or "terminal" in name:
            return "copper"
    elif form == "expansion":
        if "insulator" in name:
            return "porcelain"
        if "conductor" in name or "flexible-link" in name:
            return "copper"
    elif form == "spacer":
        if "conductor" in name or "cross-core" in name:
            return "copper"
        if "sleeve" in name:
            return "polymer"
    elif form == "frame":
        if name.startswith("foot-"):
            return "concrete"
        if name.startswith("riser-"):
            return "cableJacket"
    elif form == "sign":
        if name in {"sign-plate", "hazard-triangle-inner"}:
            return "safetyYellow"
        if name.startswith("hazard-") or name == "lightning-bolt":
            return "hazardBlack"
    elif form == "switch":
        if "insulator" in name:
            return "porcelain"
        if "blade" in name or "operating-link" in name:
            return "copper"
        if "drive-cabinet" in name:
            return "powderCoat"
    elif form == "breaker":
        if "bushing" in name:
            return "porcelain"
        if "terminal" in name:
            return "copper"
        if "mechanism-cabinet" in name:
            return "powderCoat"
        if "base" in name:
            return "galvanizedSteel"
    elif form == "gis":
        if "bushing" in name:
            return "porcelain"
        if "terminal" in name:
            return "copper"
        if "base" in name:
            return "galvanizedSteel"
    elif form == "instrument":
        if "sensor-loop" in name:
            return "polymer"
        if "terminal" in name:
            return "copper"
        if "pedestal" in name or "base-plate" in name or "upper-ring" in name:
            return "stainlessSteel"
        if "secondary-box" in name or "body" in name:
            return "powderCoat"
    elif form == "arrester":
        if "section" in name:
            return "porcelain"
        if "terminal" in name:
            return "copper"
    elif form == "lineTrap":
        if "coil-turn" in name:
            return "copper"
        if "terminal" in name:
            return "stainlessSteel"
    elif form == "grading":
        if "ring" in name or "terminal" in name:
            return "copper"
        if name == "support":
            return "porcelain"
    elif form == "termination":
        if "shed" in name:
            return "porcelain"
        if "terminal" in name:
            return "copper"
        if "cable" in name:
            return "cableJacket"
    elif form == "transformer":
        if "bushing" in name:
            return "porcelain"
        if "wheel" in name:
            return "rubber"
        if "conservator-pipe" in name:
            return "stainlessSteel"
        if "cooler" in name or "transport-base" in name:
            return "stainlessSteel"
    elif form == "radiator":
        if "fin" in name:
            return "stainlessSteel"
        if "manifold" in name:
            return "copper"
    elif form == "fan":
        if "housing" in name or "motor" in name:
            return "powderCoat"
        if "blade" in name:
            return "stainlessSteel"
    elif form == "oilTank":
        if "saddle" in name:
            return "galvanizedSteel"
        if "gauge" in name:
            return "glass"
        if "pipe" in name or "nozzle" in name:
            return "copper"
    elif form == "bushing":
        if "bushing" in name or "shed" in name:
            return "porcelain"
        if "terminal" in name:
            return "copper"
    elif form == "cabinet":
        if "status-lamp" in name:
            return "signalAmber"
        if "display" in name or "meter-window" in name:
            return "glass"
        if "stick-bay" in name:
            return "polymer"
        if any(token in name for token in ("handle", "vent", "shelf", "rail", "relay-module", "cable-entry")):
            return "stainlessSteel"
    elif form == "breather":
        if "vessel" in name:
            return "glass"
        if "cap" in name or "neck" in name:
            return "stainlessSteel"
        return "galvanizedSteel"
    elif form == "pressure":
        if "indicator" in name:
            return "signalAmber"
        if "valve" in name or "flange" in name:
            return "brass"
    elif form == "oilSample":
        if "bottle" in name:
            return "glass"
        if "shelf" in name or "tray" in name:
            return "stainlessSteel"
    elif form == "firewall":
        if "foot" in name or "top-cap" in name:
            return "galvanizedSteel"
    elif form == "bund":
        if "grate" in name:
            return "stainlessSteel"
    elif form == "bogie":
        if "wheel" in name:
            return "rubber"
        if "rail-shoe" in name:
            return "stainlessSteel"
    elif form == "pump":
        if "motor" in name or "pipe" in name:
            return "stainlessSteel"
    elif form == "battery":
        if "battery" in name:
            return "polymer"
        if "shelf" in name:
            return "stainlessSteel"
    elif form == "console":
        if "display-panel" in name:
            return "glass"
        if "worktop" in name:
            return "stainlessSteel"
    elif form == "panel":
        if "meter-window" in name:
            return "glass"
        if "button" in name:
            return "signalAmber"
    elif form == "trench":
        if "cable-run" in name:
            return "cableJacket"
        return "concrete"
    elif form == "cover":
        if "slot" in name or "edge-rib" in name:
            return "stainlessSteel"
    elif form == "tray":
        if "rung" in name or "support-foot" in name:
            return "stainlessSteel"
    elif form == "pit":
        if "conduit" in name:
            return "cableJacket"
        if "cover" in name:
            return "galvanizedSteel"
    elif form == "ground":
        if "riser" in name:
            return "copper"
        if "cover" in name:
            return "stainlessSteel"
    elif form == "clamp":
        if "bolt" in name:
            return "copper"
    elif form == "groundbar":
        if "support" in name:
            return "porcelain"
        if "ground-bar" in name or "connection-pad" in name:
            return "copper"
    elif form == "reel":
        if "wheel" in name:
            return "rubber"
        if "cable-drum" in name:
            return "cableJacket"
    elif form == "cart":
        if "caster" in name:
            return "rubber"
        if "face" in name or "instrument" in name:
            return "glass" if "face" in name else "stainlessSteel"
        if "handle" in name:
            return "stainlessSteel"
    elif form == "testdiv":
        if "shed" in name or "column" in name:
            return "porcelain"
        if "terminal" in name:
            return "copper"
    elif form == "barrier":
        if name == "foot":
            return "concrete"
        if "upper-rail" in name:
            return "safetyYellow"
    elif form == "chainGate":
        if "bollard-base" in name:
            return "concrete"
        if "chain" in name:
            return "stainlessSteel"
    elif form == "fire":
        if "cylinder" in name:
            return "safetyRed"
        if "valve" in name:
            return "brass"
    elif form == "fireMonitor":
        if "nozzle" in name or "monitor-body" in name:
            return "brass"
    elif form == "separator":
        if "bund-base" in name:
            return "concrete"
        if "pipe" in name:
            return "copper"
    elif form == "light":
        if "luminaire" in name:
            return "glass"
        if "outreach" in name:
            return "stainlessSteel"
    elif form == "platform":
        if "guardrail" in name or "top-rail" in name or "mid-rail" in name:
            return "safetyYellow"
    elif form == "canopy":
        if "roof-cover" in name:
            return "polymer"

    if any(token in name for token in ("insulator", "porcelain", "shed", "bushing-core")):
        return "porcelain"
    if any(token in name for token in ("wheel", "caster", "tire", "tyre")):
        return "rubber"
    if any(token in name for token in ("conductor", "bus-span", "busbar", "blade", "coil-turn", "ground-bar", "terminal-link")):
        return "copper"
    if any(token in name for token in ("window", "lens", "display")):
        return "glass"
    return default_role(form)


def mix_hex(value: str, target: tuple[int, int, int], amount: float) -> str:
    channels = tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
    mixed = tuple(round(a * (1 - amount) + b * amount) for a, b in zip(channels, target))
    return "#" + "".join(f"{channel:02x}" for channel in mixed)


def infer_details(asset: tuple) -> dict[str, list[tuple]]:
    asset_id, _title, _group, form, dimensions, _description, _subtype = asset
    w, d, h = map(float, dimensions)
    sx, sy = w / 2, d / 2
    braces: list[tuple] = []
    if form == "portal":
        left, right = -sx + 420, sx - 420
        y = -sy + 280
        braces = [
            ("knee-brace-left", (left, y, 1450), (left + 780, y, h - 510), 150),
            ("knee-brace-right", (right, y, 1450), (right - 780, y, h - 510), 150),
        ]
    elif form == "mast":
        braces = [
            ("crossarm-brace-left", (0, 0, h * 0.62), (-w * 0.76, 0, h - 940), 100),
            ("crossarm-brace-right", (0, 0, h * 0.62), (w * 0.76, 0, h - 940), 100),
        ]
    elif form == "crossarm":
        braces = [
            ("crossarm-brace-left", (0, 0, h * 0.62), (-w * 0.34, 0, h - 800), 105),
            ("crossarm-brace-right", (0, 0, h * 0.62), (w * 0.34, 0, h - 800), 105),
        ]
    elif form == "frame":
        y = 0
        left, right = -sx * 0.72, sx * 0.72
        braces = [
            ("cross-brace-a", (left, y, 220), (right, y, h - 320), 90),
            ("cross-brace-b", (right, y, 220), (left, y, h - 320), 90),
        ]
    elif form == "canopy":
        for side, x in (("left", -sx * 0.82), ("right", sx * 0.82)):
            inner_x = -sx * 0.56 if side == "left" else sx * 0.56
            for face, y in (("front", -sy * 0.72), ("back", sy * 0.72)):
                braces.append((f"corner-brace-{face}-{side}", (x, y, h - 1040), (inner_x, y, h - 320), 110))
    elif form == "platform":
        for side, x in (("left", -sx * 0.82), ("right", sx * 0.82)):
            inner_x = x + (w * 0.22 if side == "left" else -w * 0.22)
            braces.append((f"deck-brace-{side}", (x, 0, h * 0.26), (inner_x, 0, h - 260), 85))
    elif form == "barrier":
        braces = [("diagonal-safety-brace", (-w * 0.3, 0, h * 0.23), (w * 0.3, 0, h * 0.62), 70)]
    elif form == "busbridge":
        left, right = -sx * 0.7, sx * 0.7
        braces = [
            ("bus-support-brace-left", (left, 0, h * 0.4), (left + w * 0.13, 0, h - 360), 80),
            ("bus-support-brace-right", (right, 0, h * 0.4), (right - w * 0.13, 0, h - 360), 80),
        ]
    return {"braces": braces, "extraRoles": ["galvanizedSteel"] if braces else []}


def brace_helper() -> str:
    return '''const brace = (name: string, a: [number, number, number], b: [number, number, number], thickness: number) => {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx) * 180 / Math.PI;
  p.part(name, box(length, thickness, thickness, true).rotateY(angle)
    .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    .scale(scale).color(galvanizedSteel));
};'''


def ngon_helper() -> str:
    return '''const ngon = (r: number, sides: number) => {
  let outline = path().moveTo(r, 0);
  for (let i = 1; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    outline = outline.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return outline.close();
};'''


def lofted_insulator_helper() -> str:
    return '''const loftedInsulator = (height: number, radius: number, sides = 10) => {
  const levels = [0, .08, .18, .29, .40, .51, .62, .73, .84, .93, 1].map((v) => height * v);
  const radii = [.76, .98, .62, .96, .62, .96, .62, .96, .62, .95, .76].map((v) => radius * v);
  const profiles = radii.map((r) => ngon(r, sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};'''


def lofted_shed_helper() -> str:
    return '''const loftedShed = (height: number, radius: number, sides = 8) => {
  const levels = [0, .16, .78, 1].map((v) => height * v);
  const radii = [.60, 1, .88, .62].map((v) => radius * v);
  const profiles = radii.map((r) => ngon(r, sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};'''


def tapered_column_helper() -> str:
    return '''const taperedColumn = (height: number, radius: number, sides = 10) => {
  const profiles = [ngon(radius * 1.2, sides), ngon(radius * .72, sides)];
  return profiles[0].loft(profiles.slice(1), {
    planes: [{ plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
      { plane: 'XY' as const, origin: [0, 0, height] as [number, number, number] }],
    ruled: true,
  });
};'''


def beveled_plate_helper() -> str:
    return '''const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);'''


def beveled_panel_helper() -> str:
    return '''const beveledPanel = (width: number, height: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, 0).lineTo(width / 2 - cut, 0)
    .lineTo(width / 2, cut).lineTo(width / 2, height - cut)
    .lineTo(width / 2 - cut, height).lineTo(-width / 2 + cut, height)
    .lineTo(-width / 2, height - cut).lineTo(-width / 2, cut)
    .close().extrude(thickness).rotateX(90);'''


def outline_kind(name: str) -> str | None:
    lowered = name.lower()
    if any(token in lowered for token in ("left-door", "right-door", "front-panel", "sign-plate", "meter-window", "display-panel", "panel-body", "cabinet-body", "walk-in-shell", "sealed-enclosure", "service-cabinet", "wall-left", "wall-right", "wall-front", "wall-back", "end-left", "end-right")):
        return "panel"
    if lowered in {"base", "base-frame", "base-plate", "base-slab", "foot-left", "foot-right", "panel-plinth", "panel-cap", "plinth", "rack-base", "skid-base", "trench-floor", "pit-floor", "cover-slab", "roof-cover", "roof-overhang", "tank-cover", "worktop", "deck", "bund-base", "pedestal-foot", "bollard-base", "inspection-box", "transport-base", "sign-plate-base"}:
        return "plate"
    if any(token in lowered for token in ("lower-header", "upper-header", "access-cover", "edge-rib", "entry-step", "shelf-", "top-cap", "rain-hood", "roof-frame", "top-retainer", "rail-shoe", "support-foot")):
        return "plate"
    if lowered.endswith("-base") or lowered.startswith("foot-"):
        return "plate"
    return None


def component_part(line: str, asset: tuple, roles: dict[str, str]) -> tuple[str, bool]:
    match = B_RE.match(line)
    if match:
        name = match.group(1)
        width, depth, height = numbers(match.group(2))
        x, y, z = numbers(match.group(3))
        outline = outline_kind(name)
        if outline == "panel":
            cut = max(2, min(width, height) * 0.06)
            shape = f"beveledPanel({fmt(width)}, {fmt(height)}, {fmt(depth)}, {fmt(cut)})"
            code = f'p.part("{name}", {shape}.translate({fmt(x)}, {fmt(y + depth / 2)}, {fmt(z)}).scale(scale).color({roles[name]}));'
            return code, True
        if outline == "plate":
            cut = max(2, min(width, depth) * 0.06)
            shape = f"beveledPlate({fmt(width)}, {fmt(depth)}, {fmt(height)}, {fmt(cut)})"
            code = f'p.part("{name}", {shape}.translate({fmt(x)}, {fmt(y)}, {fmt(z)}).scale(scale).color({roles[name]}));'
            return code, True
        rotations = []
        if name.startswith("vent-slat-") or name.startswith("vent-"):
            rotations.append(".rotateX(12)")
        elif name.startswith("display-panel-"):
            rotations.append(".rotateX(-8)")
        elif name.endswith("-blade"):
            form, subtype = asset[3], asset[6]
            angle = 10 if subtype == "center-break" else (24 if subtype == "vertical-break" else 0)
            if form == "switch" and angle:
                rotations.append(f".rotateX({angle})")
        shape = f"box({fmt(width)}, {fmt(depth)}, {fmt(height)}, true){''.join(rotations)}"
        at = (x, y, z + height / 2)
        code = f'p.part("{name}", {shape}.translate({fmt(at[0])}, {fmt(at[1])}, {fmt(at[2])}).scale(scale).color({roles[name]}));'
        return code, False

    match = C_RE.match(line)
    if match:
        name, height_s, radius_s, at_s = match.groups()
        height, radius = float(height_s), float(radius_s)
        x, y, z = numbers(at_s)
        lowered = name.lower()
        role = roles[name]
        is_loft = False
        if asset[3] == "bushing" and "shed" in lowered and role == "porcelain":
            shape = f"loftedShed({fmt(height)}, {fmt(radius)}, 8)"
            is_loft = True
        elif any(token in lowered for token in ("insulator", "core", "bushing", "divider", "stress-cone", "shed", "insulating-support")) and role == "porcelain":
            shape = f"loftedInsulator({fmt(height)}, {fmt(radius)}, 10)"
            is_loft = True
        elif any(token in lowered for token in ("mast-shaft", "mast-pole", "support-pole", "standpipe", "pedestal", "bollard", "interrupter-pole", "valve-body", "cylinder-", "vessel", "bottle", "conductor-sleeve")):
            shape = f"taperedColumn({fmt(height)}, {fmt(radius)}, 10)"
            is_loft = True
        else:
            shape = f"cylinder({fmt(height)}, {fmt(radius)}, 10)"
        code = f'p.part("{name}", {shape}.translate({fmt(x)}, {fmt(y)}, {fmt(z)}).scale(scale).color({role}));'
        return code, is_loft

    match = CY_RE.match(line)
    if match:
        axis, name, length_s, radius_s, at_s = match.groups()
        length, radius = float(length_s), float(radius_s)
        x, y, z = numbers(at_s)
        if axis == "CY":
            shape = f"cylinder({fmt(length)}, {fmt(radius)}, 10).rotateX(90)"
            at = (x, y + length / 2, z + radius)
        else:
            shape = f"cylinder({fmt(length)}, {fmt(radius)}, 10).rotateY(90)"
            at = (x - length / 2, y, z + radius)
        code = f'p.part("{name}", {shape}.translate({fmt(at[0])}, {fmt(at[1])}, {fmt(at[2])}).scale(scale).color({roles[name]}));'
        return code, False

    return line, False


def warning_sign_parts(asset: tuple) -> list[str]:
    _asset_id, _title, _group, _form, dimensions, _description, _subtype = asset
    width, depth, height = map(float, dimensions)
    plate_base = height - depth * 0.68
    plate_h = depth * 0.55
    front_y = -60
    base_z = plate_base + plate_h * 0.12
    outer = f'''p.part("hazard-triangle-outer", path().moveTo(0, 0).lineTo(-{fmt(width * .27)}, 0)
  .lineTo(0, {fmt(depth * .45)}).lineTo({fmt(width * .27)}, 0).close().extrude(12)
  .rotateX(90).translate(0, {front_y}, {fmt(base_z)}).scale(scale).color(hazardBlack));'''
    inner = f'''p.part("hazard-triangle-inner", path().moveTo(0, 0).lineTo(-{fmt(width * .22)}, 0)
  .lineTo(0, {fmt(depth * .34)}).lineTo({fmt(width * .22)}, 0).close().extrude(10)
  .rotateX(90).translate(0, {fmt(front_y - 13)}, {fmt(base_z + 10)}).scale(scale).color(safetyYellow));'''
    bolt = f'''p.part("lightning-bolt", path().moveTo(-24, {fmt(depth * .29)}).lineTo(18, {fmt(depth * .17)})
  .lineTo(-4, {fmt(depth * .17)}).lineTo(30, {fmt(depth * .06)})
  .lineTo(-34, {fmt(depth * .19)}).lineTo(-8, {fmt(depth * .19)}).close().extrude(9)
  .rotateX(90).translate(0, {fmt(front_y - 24)}, {fmt(base_z + 22)}).scale(scale).color(hazardBlack));'''
    return [outer, inner, bolt]


def cabinet_indicator(asset: tuple) -> list[str]:
    _asset_id, _title, _group, _form, dimensions, _description, _subtype = asset
    width, depth, height = map(float, dimensions)
    x = width * 0.33
    y = -depth * 0.5 - 18
    z = height * 0.78
    return [f'p.part("status-lamp-amber", cylinder(78, 34, 10).translate({fmt(x)}, {fmt(y)}, {fmt(z)}).scale(scale).color(signalAmber));']


def fan_blades(asset: tuple) -> list[str]:
    _asset_id, _title, _group, _form, dimensions, _description, _subtype = asset
    width, depth, height = map(float, dimensions)
    radius = depth * 0.29
    blade_length = radius * 0.82
    y = -depth * 0.55 - 120
    z = height * 0.42
    lines = ['for (let fan = 0; fan < 3; fan++) {', '  const centerX = (fan - 1) * ' + fmt(width * 0.28) + ';', '  for (let blade = 0; blade < 3; blade++) {',
             '    const angle = blade * 120;', '    const radians = angle * Math.PI / 180;',
             '    const cx = centerX + Math.cos(radians) * ' + fmt(blade_length * 0.40) + ';',
             '    const cz = ' + fmt(z) + ' - Math.sin(radians) * ' + fmt(blade_length * 0.40) + ';',
             '    p.part(`fan-blade-${fan + 1}-${blade + 1}`, box(' + fmt(blade_length * 0.72) + ', 58, 66, true).rotateY(angle)',
             f'      .translate(cx, {fmt(y)}, cz).scale(scale).color(stainlessSteel));',
             '  }', '}']
    return lines


def brace_lines(asset: tuple, details: dict[str, list[tuple]]) -> list[str]:
    lines = []
    for name, a, b, thickness in details["braces"]:
        lines.append(
            f'brace("{name}", [{fmt(a[0])}, {fmt(a[1])}, {fmt(a[2])}], '
            f'[{fmt(b[0])}, {fmt(b[1])}, {fmt(b[2])}], {fmt(thickness)});'
        )
    return lines


def promoted_source(path: Path, original: str, asset: tuple) -> str:
    if "const color = param(\"color\"" not in original:
        if "presets({" in original and any(name in original for name in PALETTE):
            raise ValueError(f"already promoted: {path.name}")
        raise ValueError(f"expected the original asset color knob in {path.name}")

    form = asset[3]
    details = infer_details(asset)
    lines = original.splitlines()
    first_part = next((i for i, line in enumerate(lines) if CALL_RE.match(line)), None)
    if first_part is None:
        raise ValueError(f"no named source components in {path.name}")
    component_names = []
    for line in lines[first_part:]:
        match = CALL_RE.match(line)
        if match:
            component_names.append(match.group(2))
        elif line.startswith("return p.model()"):
            break
    if len(component_names) < 2:
        raise ValueError(f"not enough named components in {path.name}")

    assignments = {name: material_for(asset, name) for name in component_names}
    if details["braces"]:
        assignments.update({name: "galvanizedSteel" for name, *_ in details["braces"]})
    if form == "cabinet":
        assignments["status-lamp-amber"] = "signalAmber"
    if form == "fan":
        assignments.update({f"fan-blade-{fan}-{blade}": "stainlessSteel" for fan in range(1, 4) for blade in range(1, 4)})
    if asset[0] == "substation-high-voltage-warning-sign":
        assignments.update({"hazard-triangle-outer": "hazardBlack", "hazard-triangle-inner": "safetyYellow", "lightning-bolt": "hazardBlack"})

    default = default_role(form)
    used_roles = list(dict.fromkeys(assignments.values()))
    if len(used_roles) < 2:
        second = "stainlessSteel" if default != "stainlessSteel" else "copper"
        candidate = next((name for name in component_names if any(word in name.lower() for word in ("handle", "cap", "terminal", "cover", "rail", "ring", "bracket", "rung"))), component_names[-1])
        assignments[candidate] = second
        used_roles = list(dict.fromkeys(assignments.values()))

    if len(used_roles) > 4:
        keep = {default} | set(sorted((role for role in used_roles if role != default), key=lambda role: (-ROLE_PRIORITY[role], role))[:3])
        assignments = {name: (role if role in keep else default) for name, role in assignments.items()}
        used_roles = list(dict.fromkeys(assignments.values()))
    if not 2 <= len(used_roles) <= 4:
        raise ValueError(f"{path.name} has {len(used_roles)} material controls after assignment")

    extra_lines: list[str] = []
    extra_lines += brace_lines(asset, details)
    if form == "cabinet":
        extra_lines += cabinet_indicator(asset)
    if form == "fan":
        extra_lines += fan_blades(asset)
    if asset[0] == "substation-high-voltage-warning-sign":
        extra_lines += warning_sign_parts(asset)

    used_roles = list(dict.fromkeys(assignments.values()))
    if len(used_roles) < 2 or len(used_roles) > 4:
        raise ValueError(f"{path.name} ends with {len(used_roles)} materials")
    knob_lines = [
        f"const {role} = param('{role}', '{PALETTE[role][1]}', {{ label: '{PALETTE[role][0]}' }});"
        for role in used_roles
    ]
    weathered = {
        role: mix_hex(PALETTE[role][1], (102, 99, 86), 0.22 if role in {"porcelain", "concrete", "glass"} else 0.30)
        for role in used_roles
    }
    maintenance_role = next((role for role in ("safetyYellow", "signalAmber", "safetyRed", "powderCoat", "transformerEnamel", "galvanizedSteel", "concrete") if role in used_roles), used_roles[0])
    maintenance_color = {
        "safetyYellow": "#ffd64a", "signalAmber": "#ffc04d", "safetyRed": "#e45b4d",
        "powderCoat": "#cf7736", "transformerEnamel": "#9a7040",
        "galvanizedSteel": "#e1b63d", "concrete": "#c1b46a",
    }.get(maintenance_role, "#d08039")
    presets_block = (
        "presets({\n  weathered: { " + ", ".join(f"{role}: '{value}'" for role, value in weathered.items()) + " },\n"
        + f"  maintenance: {{ {maintenance_role}: '{maintenance_color}' }},\n}});"
    )

    title = asset[1]
    description = asset[5].strip().rstrip(".")
    material_labels = ", ".join(PALETTE[role][0].lower() for role in used_roles)
    metadata_description = f"{description}. Material controls: {material_labels}; finish presets: weathered and maintenance."
    comment = f"// {title}: {description}. Low-poly visualization geometry in millimetres, Z up."

    output: list[str] = []
    for index, line in enumerate(lines):
        if index == 0 and line.startswith("// Original grid substation scene asset"):
            output.append(comment)
            continue
        if line.startswith("  description:"):
            output.append("  description: " + json.dumps(metadata_description) + ",")
            continue
        if GENERIC_RE.fullmatch(line.strip()):
            output.extend(knob_lines)
            output.append(presets_block)
            continue
        if "const place =" in line:
            # Skip the old shared-color helpers through the first geometry call.
            break
        if CALL_RE.match(line):
            code, _used_loft = component_part(line, asset, assignments)
            output.append(code)
            continue
        output.append(line)

    first_geometry = next((i for i, line in enumerate(lines) if CALL_RE.match(line)), None)
    helper_insert = next((i for i, line in enumerate(output) if line.startswith("const p = assembly")), None)
    if helper_insert is None or first_geometry is None:
        raise ValueError(f"could not locate source assembly boundary in {path.name}")
    insert_at = helper_insert + 1
    component_output = []
    for line in lines[first_geometry:]:
        if line.startswith("return p.model()"):
            break
        if CALL_RE.match(line):
            code, _used_loft = component_part(line, asset, assignments)
            component_output.append(code)

    needs_insulator = any("loftedInsulator(" in line for line in component_output)
    needs_shed = any("loftedShed(" in line for line in component_output)
    needs_tapered = any("taperedColumn(" in line for line in component_output)
    needs_plate = any("beveledPlate(" in line for line in component_output)
    needs_panel = any("beveledPanel(" in line for line in component_output)
    helpers = []
    if needs_insulator or needs_shed or needs_tapered:
        helpers.append(ngon_helper())
    if needs_insulator:
        helpers.append(lofted_insulator_helper())
    if needs_shed:
        helpers.append(lofted_shed_helper())
    if needs_tapered:
        helpers.append(tapered_column_helper())
    if needs_plate:
        helpers.append(beveled_plate_helper())
    if needs_panel:
        helpers.append(beveled_panel_helper())
    if helpers:
        output[insert_at:insert_at] = ["", *helpers]
        insert_at += len(helpers) + 1
    if details["braces"]:
        output[insert_at:insert_at] = ["", brace_helper()]

    # The earlier loop stopped at the old helper block; append the transformed
    # parts after inserting only the helpers this asset calls.
    output.extend(["", *component_output])
    if extra_lines:
        output.extend(["", *extra_lines])
    output.extend(["", "return p.model();", ""])

    # Ensure helpers precede the first generated part call and avoid carrying
    # over any of the original B/C/CY/CX wrappers.
    result = "\n".join(output)
    result = re.sub(r"\n{3,}", "\n\n", result)
    if ".color(color)" in result or "const color = param" in result:
        raise ValueError(f"generic color remains in {path.name}")
    if not all(f".color({role})" in result for role in used_roles):
        raise ValueError(f"one of the material controls is not used in {path.name}")
    if "presets({" not in result:
        raise ValueError(f"missing presets in {path.name}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", nargs="*", help="promote selected asset IDs")
    parser.add_argument("--apply", action="store_true", help="write promoted sources and kit README")
    args = parser.parse_args()

    paths = sorted(KIT.glob("*.kcad.ts"))
    if len(paths) != 80 and not args.ids:
        raise SystemExit(f"expected 80 existing assets, found {len(paths)}")
    if args.ids:
        wanted = set(args.ids)
        paths = [path for path in paths if asset_id(path) in wanted]
        found = {asset_id(path) for path in paths}
        if found != wanted:
            raise SystemExit(f"unknown asset IDs: {', '.join(sorted(wanted - found))}")

    reports = []
    for path in paths:
        asset = ASSETS.get(asset_id(path))
        if not asset:
            raise SystemExit(f"no authored recipe for {asset_id(path)}")
        source = path.read_text(encoding="utf-8")
        output = promoted_source(path, source, asset)
        color_count = len(set(re.findall(r"\.color\(([A-Za-z_][\w]*)\)", output)))
        preset_count = len(re.findall(r"\bpresets\s*\(", output))
        geometry_count = len(re.findall(r"\.\b(?:path|loft|rotate[A-Za-z]*)\s*\(", output))
        reports.append({
            "asset": asset_id(path),
            "materials": color_count,
            "presets": preset_count,
            "shapeOperations": geometry_count,
            "sourceChanged": output != source,
        })
        if args.apply and output != source:
            path.write_text(output, encoding="utf-8")

    if args.apply and not args.ids:
        readme = KIT / "README.md"
        text = readme.read_text(encoding="utf-8")
        text = re.sub(
            r"^Eighty original low-poly scene assets.*?CC0 1\.0\.",
            "Eighty original low-poly utility-yard scene assets. Sources use millimetres and Z up. Each asset exposes overall scale plus two to four named material controls, with `weathered` and `maintenance` finish presets. Distinct equipment geometry includes repeated steel, porcelain, copper, concrete, glass, and insulating-polymer components where each material belongs. The 1,800-triangle ceiling remains the default and is raised only for an asset whose reviewed geometry requires it. All geometry is dedicated to the public domain under CC0 1.0.",
            text,
            count=1,
            flags=re.M | re.S,
        )
        text = text.replace(
            "The [grid substation wave bundle](../../../artifacts/catalog-demos/grid-substation-wave-20261103/README.md) records generated sources, catalog previews, local audits, and the inspected MP4 walkthrough.",
            "The [grid substation wave bundle](../../../artifacts/catalog-demos/grid-substation-wave-20261103/README.md) records the original source recipes. The [quality-promotion handoff](../../../artifacts/catalog-demos/grid-substation-quality-promotion-20261104/README.md) records the 80-asset material and geometry promotion, refreshed previews, validation, and inspected MP4 walkthrough.",
        )
        readme.write_text(text, encoding="utf-8")

    result = {
        "kit": "grid-substation",
        "assetCount": len(reports),
        "applied": args.apply,
        "assets": reports,
        "materialCountRange": [min(row["materials"] for row in reports), max(row["materials"] for row in reports)],
        "allHavePresets": all(row["presets"] >= 1 for row in reports),
    }
    print(json.dumps(result, indent=2))
    if not result["allHavePresets"] or result["materialCountRange"][0] < 2 or result["materialCountRange"][1] > 4:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
