#!/usr/bin/env python3
"""Promote the committed shipyard scene definitions with material zones and profiles."""
from __future__ import annotations

import importlib.util
import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "shipyard"
BASE_GENERATOR = ROOT / "artifacts" / "catalog-demos" / "shipyard-wave-20261103" / "generate_shipyard_assets.py"

spec = importlib.util.spec_from_file_location("shipyard_base", BASE_GENERATOR)
if spec is None or spec.loader is None:
    raise RuntimeError(f"cannot load the original asset definitions at {BASE_GENERATOR}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

STEEL = re.compile(
    r"rail|frame|bracket|mount|hook|leg|hinge|foot|shelf|grille|grate|vent|nozzle|pipe|outlet|drain|latch|lock|rod|arm|guide|tray|roller|bar|mast|plate|pedestal|valve|coupling|header|skid|port|axle|slot|support|anchor|bolt|bearing|brace|clamp|tie|joist|strut|tower|carriage|shaft|cross|post|door-rim|edge|wheel-hub|stiffener|rib|cleat|beam|tie|stop|pin|joist|column|upright|stringer|ledger|strongback|grating|grating|hinge|tie|rail|fork-pocket|foot-pad|end-stop|step|handle|spreader|roller|shaft|bearing|head|saddle|cleat|restraint|divider|coupler|hub|frame|crosshead",
    re.I,
)
RUBBER = re.compile(r"wheel|tire|tyre|grip|bumper|fender|pad|hose|belt|mat|tread|seal|gasket|caster", re.I)
SAFETY = re.compile(r"lamp|lens|indicator|signal|warning|stripe|tag|marker|target|graduation|crosshair|hazard|reflector|button|status|retaining-band", re.I)
TIMBER = re.compile(r"timber|wood|sleeper|pallet|wedge|crib|keel-block|ground-sill|cross-layer|upper-block|lower-block|keel-cap", re.I)

MATERIALS = {
    "yardPaint": ("#73827b", "Yard finish"),
    "structuralSteel": ("#b6c1c4", "Structural steel"),
    "elastomer": ("#30383b", "Elastomer"),
    "safetyMarking": ("#efb934", "Safety marking"),
    "timber": ("#9a714d", "Timber"),
    "timberEndGrain": ("#bf9363", "Timber end grain"),
    "buoyancyCoat": ("#4c969b", "Buoyancy coating"),
}

PART_ROLE_OVERRIDES = {
    "dock-gate-caisson": {
        "lower-flotation-cell-0": "buoyancyCoat",
        "lower-flotation-cell-1": "buoyancyCoat",
    },
}


def adjusted_parts(row: dict) -> list[dict]:
    parts = deepcopy(row["parts"])
    if row["id"] == "dock-gate-caisson":
        for part in parts:
            if part["name"].startswith("vertical-stiffener-"):
                part["at"][1] = -225
    if row["id"] == "welding-gas-cylinder-trolley":
        for part in parts:
            if part["name"].startswith("gas-cylinder-"):
                part["at"][2] = 130
            elif part["name"].startswith("retaining-band-"):
                part["at"][1] = -225
    return parts


def js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def hex_tone(value: str, amount: float) -> str:
    rgb = [int(value[index:index + 2], 16) for index in (1, 3, 5)]
    if amount >= 0:
        rgb = [round(channel + (255 - channel) * amount) for channel in rgb]
    else:
        rgb = [round(channel * (1 + amount)) for channel in rgb]
    return "#" + "".join(f"{channel:02x}" for channel in rgb)


def part_volume(part: dict) -> float:
    if part["kind"] == "box":
        return part["size"][0] * part["size"][1] * part["size"][2]
    if part["kind"] == "cylinder":
        return 3.14159 * part["radius"] ** 2 * part["height"]
    return 1


def semantic_role(name: str) -> str:
    if SAFETY.search(name):
        return "safetyMarking"
    if RUBBER.search(name):
        return "elastomer"
    if TIMBER.search(name):
        return "timber"
    if STEEL.search(name):
        return "structuralSteel"
    return "yardPaint"


def role_map(row: dict) -> dict[str, str]:
    parts = adjusted_parts(row)
    roles = {part["name"]: semantic_role(part["name"]) for part in parts}
    roles.update(PART_ROLE_OVERRIDES.get(row["id"], {}))
    largest = max(parts, key=part_volume)
    timber_count = sum(role == "timber" for role in roles.values())
    main_role = "timber" if timber_count >= len(parts) * 0.4 else "yardPaint"
    roles[largest["name"]] = main_role
    # Every model needs a clearly visible second material even when its names
    # describe only one kind of component.
    if len(set(roles.values())) == 1 and len(parts) > 1:
        main_family = re.sub(r"-\d+$", "", largest["name"])
        secondary = next(part for part in reversed(parts) if re.sub(r"-\d+$", "", part["name"]) != main_family)
        secondary_family = re.sub(r"-\d+$", "", secondary["name"])
        secondary_role = "timberEndGrain" if main_role == "timber" else "structuralSteel"
        for part in parts:
            if re.sub(r"-\d+$", "", part["name"]) == secondary_family and part is not largest:
                roles[part["name"]] = secondary_role
    return roles


def materials_for(row: dict) -> dict[str, tuple[str, str]]:
    roles = role_map(row)
    used = set(roles.values())
    ordered = ["yardPaint", "structuralSteel", "timber", "elastomer", "safetyMarking", "timberEndGrain", "buoyancyCoat"]
    selected = [key for key in ordered if key in used][:4]
    defaults = dict(MATERIALS)
    defaults["yardPaint"] = (row["color"], "Yard finish")
    return {key: defaults[key] for key in selected}


def material_for(row: dict, part_name: str, available: dict[str, tuple[str, str]]) -> str:
    role = role_map(row)[part_name]
    return role if role in available else "yardPaint"


def preset_values(materials: dict[str, tuple[str, str]], preset: str) -> dict[str, str]:
    values = {}
    for key, (default, _) in materials.items():
        if preset == "fresh-coat":
            changes = {
                "yardPaint": hex_tone(default, 0.18),
                "structuralSteel": "#d0d7d8",
                "elastomer": "#3a4245",
                "safetyMarking": "#ffd44d",
                "timber": hex_tone(default, 0.12),
                "timberEndGrain": hex_tone(default, 0.18),
                "buoyancyCoat": "#68b4b6",
            }
        else:
            changes = {
                "yardPaint": hex_tone(default, -0.17),
                "structuralSteel": "#828d91",
                "elastomer": "#252b2d",
                "safetyMarking": "#bd8528",
                "timber": hex_tone(default, -0.14),
                "timberEndGrain": hex_tone(default, -0.1),
                "buoyancyCoat": "#337277",
            }
        values[key] = changes[key]
    return values


def geometry_helpers(row: dict) -> list[str]:
    kinds = {part["kind"] for part in row["parts"]}
    lines = [
        "const panelProfile = (w: number, d: number, corner: number) => {",
        "  const c = Math.max(0.5, Math.min(corner, w * 0.18, d * 0.18));",
        "  return path().moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2)",
        "    .lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c)",
        "    .lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2)",
        "    .lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).close();",
        "};",
        "const profiledBox = (w: number, d: number, h: number) => {",
        "  const corner = Math.min(w, d) * 0.08;",
        "  const inset = Math.min(w, d) * 0.025;",
        "  return panelProfile(w, d, corner)",
        "    .loft(panelProfile(w - inset * 2, d - inset * 2, corner * 0.9), { spacing: h, ruled: true })",
        "    .translate(0, 0, -h / 2);",
        "};",
        "const taperedBox = (w: number, d: number, h: number) => {",
        "  const bottom = panelProfile(w * 0.68, d * 0.68, Math.min(w, d) * 0.05);",
        "  const top = panelProfile(w, d, Math.min(w, d) * 0.08);",
        "  return bottom.loft(top, { spacing: h, ruled: true }).translate(0, 0, -h / 2);",
        "};",
        "const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {",
        "  let shape = /^(bin-body|hopper-body|collection-bin)$/.test(name) ? taperedBox(size[0], size[1], size[2]) : profiledBox(size[0], size[1], size[2]);",
        "  if (rotation?.[0]) shape = shape.rotateX(rotation[0]);",
        "  if (rotation?.[1]) shape = shape.rotateY(rotation[1]);",
        "  if (rotation?.[2]) shape = shape.rotateZ(rotation[2]);",
        "  return shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);",
        "};",
    ]
    if "cylinder" in kinds:
        lines.extend([
            "const ngon = (r: number, sides: number, rotation = 0) => {",
            "  let profile = path().moveTo(r * Math.cos(rotation), r * Math.sin(rotation));",
            "  for (let i = 1; i < sides; i++) {",
            "    const angle = rotation + 2 * Math.PI * i / sides;",
            "    profile = profile.lineTo(r * Math.cos(angle), r * Math.sin(angle));",
            "  }",
            "  return profile.close();",
            "};",
            "const profiledCylinder = (h: number, r: number, sides: number, name: string, profileAngle: number) => {",
            "  const lower = /hopper|funnel|cone|diffuser/i.test(name) ? r * 0.62 : r * 0.94;",
            "  return ngon(lower, sides, profileAngle).loft(ngon(r, sides, profileAngle), { spacing: h, ruled: true });",
            "};",
            "const c = (name: string, h: number, r: number, sides: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {",
            "  const profileAngle = axis?.[0] ? Math.PI / 2 : 0;",
            "  let shape = profiledCylinder(h, r, sides, name, profileAngle);",
            "  if (axis && degrees) {",
            "    if (axis[0]) shape = shape.rotateX(degrees);",
            "    else if (axis[1]) shape = shape.rotateY(degrees);",
            "    else if (axis[2]) shape = shape.rotateZ(degrees);",
            "  }",
            "  return shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale);",
            "};",
        ])
    if "sphere" in kinds:
        lines.append("const s = (radius: number, at: [number, number, number]) => sphere(radius).translate(at[0], at[1], at[2]).scale(scale);")
    return lines


def emit(row: dict) -> str:
    asset_id = row["id"]
    materials = materials_for(row)
    roles = role_map(row)
    origin_offset = base.ORIGIN_OFFSETS_MM.get(asset_id, 0)
    description = row["description"] + " Editable yard-finish and component-material colors; includes fresh-coat and weathered-yard presets."
    lines = [
        f"// {row['title']}: {row['description']} This profile, component layout, and color zoning define its yard role. Millimetres, Z up, base origin.",
        "meta({",
        f"  name: {js(asset_id)},",
        "  license: 'CC0-1.0',",
        f"  title: {js(row['title'])},",
        f"  description: {js(description)},",
        f"  tags: {js(list(dict.fromkeys(['shipyard', 'shipbuilding', 'drydock', 'refit', 'low poly', 'CC0'] + row['title'].lower().split())))},",
        "  kit: 'shipyard',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],",
        "  triangleBudget: 1800,",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });",
    ]
    for key, (value, label) in materials.items():
        lines.append(f"const {key} = param({js(key)}, {js(value)}, {{ label: {js(label)} }});")
    lines.extend([
        "",
        "presets({",
        f"  'fresh-coat': {js(preset_values(materials, 'fresh-coat'))},",
        f"  'weathered-yard': {js(preset_values(materials, 'weathered-yard'))},",
        "});",
        "",
        f"const p = assembly({js(asset_id)});",
        f"const originOffsetMm = {origin_offset};",
        "",
        *geometry_helpers(row),
        "",
    ])
    for part in adjusted_parts(row):
        name = part["name"]
        material = roles[name] if roles[name] in materials else "yardPaint"
        if part["kind"] == "box":
            call = f"b({js(name)}, {js(part['size'])}, {js(part['at'])}"
            if part.get("rotation"):
                call += f", {js(part['rotation'])}"
            lines.append(f"p.part({js(name)}, {call}).color({material}));")
        elif part["kind"] == "cylinder":
            rotation = part.get("rotation")
            call = f"c({js(name)}, {part['height']}, {part['radius']}, {part.get('segments', 10)}, {js(part['at'])}"
            if rotation:
                call += f", {js(rotation)}, {next((v for v in rotation if v), 0)}"
            lines.append(f"p.part({js(name)}, {call}).color({material}));")
        elif part["kind"] == "sphere":
            lines.append(f"p.part({js(name)}, s({part['radius']}, {js(part['at'])}).color({material}));")
        else:
            raise ValueError(f"unsupported part type {part['kind']!r} in {asset_id}")
    if asset_id == "welding-gas-cylinder-trolley":
        for index, x in enumerate((-200, 200)):
            lines.append(f"p.part('cylinder-valve-neck-{index}', c('cylinder-valve-neck-{index}', 90, 72, 8, [{x}, 0, 1438]).color(structuralSteel));")
            lines.append(f"p.part('cylinder-valve-handle-{index}', b('cylinder-valve-handle-{index}', [210, 42, 32], [{x}, 0, 1535]).color(structuralSteel));")
    lines.extend(["", "return p.model();", ""])
    return "\n".join(lines)


def main() -> None:
    KIT.mkdir(parents=True, exist_ok=True)
    if len(base.ASSETS) != 70:
        raise SystemExit(f"expected 70 original shipyard definitions, found {len(base.ASSETS)}")
    for row in base.ASSETS:
        (KIT / f"{row['id']}.kcad.ts").write_text(emit(row), encoding="utf-8")
    print(f"promoted {len(base.ASSETS)} existing shipyard sources; no catalog assets added")


if __name__ == "__main__":
    main()
