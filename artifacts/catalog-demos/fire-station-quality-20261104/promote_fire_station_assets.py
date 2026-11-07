#!/usr/bin/env python3
"""Promote the existing fire-station assets with material zones and profiles.

The original, dated asset definitions remain in fire-station-wave-20261103.
This script reuses those definitions and emits the quality pass as source-first
kernelCAD models. It does not add or rename catalog assets.
"""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "fire-station"
BASE_GENERATOR = ROOT / "artifacts" / "catalog-demos" / "fire-station-wave-20261103" / "generate_fire_station_assets.py"

spec = importlib.util.spec_from_file_location("fire_station_base", BASE_GENERATOR)
if spec is None or spec.loader is None:
    raise RuntimeError(f"cannot load the original asset definitions at {BASE_GENERATOR}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

METAL = re.compile(r"rail|frame|bracket|mount|hook|leg|hinge|handle|foot|shelf|grille|grate|vent|nozzle|pipe|outlet|bowl|basin|faucet|tap|drain|latch|lock|rod|arm|guide|tray|roller|cylinder|bar|mast|plate|pedestal|valve|coupling|header|skid|stack|port|cap|axle|trench|caster|slot|support|anchor|bolt|^pan$|socket|neck|collar|raceway|door-rim|edge", re.I)
RUBBER = re.compile(r"hose|boot|mat|tread|strap|caster|wheel|grip|brush|foot|seal|bumper|roller|glove|mask|pad|gasket", re.I)
SIGNAL = re.compile(r"reflect|stripe|sign|label|lamp|light|button|screen|display|status|indicator|card|signal|marker|lens|zone|warning|map|tag|title|incident", re.I)
POLYMER = re.compile(r"dispenser|reservoir|window|vision|lite|shield|cover|cap|handle|knob|grip|soap|towel|plug|spray-head|spray-handle", re.I)

SPECIAL_MATERIALS: dict[str, dict[str, tuple[str, str]]] = {
    "bay-warning-beacon": {
        "powderCoat": ("#536d7e", "Powder coat"),
        "stainlessSteel": ("#b7c1c6", "Stainless steel"),
        "redLens": ("#dc3e42", "Red lens"),
        "greenLens": ("#41a66b", "Green lens"),
    },
    "station-door-traffic-signal": {
        "powderCoat": ("#4f687b", "Powder coat"),
        "stainlessSteel": ("#aeb9c0", "Stainless steel"),
        "redLens": ("#d63c40", "Red lens"),
        "greenLens": ("#39a46c", "Green lens"),
    },
    "station-callout-light-strip": {
        "powderCoat": ("#405467", "Powder coat"),
        "redLens": ("#d43c40", "Red lens"),
        "amberLens": ("#f0b634", "Amber lens"),
        "greenLens": ("#42a66b", "Green lens"),
    },
    "station-alerting-control-console": {
        "powderCoat": ("#4d718c", "Powder coat"),
        "stainlessSteel": ("#aeb9c0", "Stainless steel"),
        "screenGlass": ("#23353d", "Display glass"),
        "signalColor": ("#f0bd36", "Signal color"),
    },
    "bay-door-control-station": {
        "powderCoat": ("#486f83", "Powder coat"),
        "stainlessSteel": ("#b1bbc1", "Stainless steel"),
        "greenPolymer": ("#48a870", "Green polymer"),
        "redPolymer": ("#d83f42", "Red polymer"),
    },
    "clean-zone-handwash-sink": {
        "stainlessSteel": ("#aebbc0", "Stainless steel"),
        "polypropylene": ("#eee9dd", "Polypropylene"),
        "elastomer": ("#30383b", "Elastomer"),
    },
    "station-utility-sink": {
        "stainlessSteel": ("#aebbc0", "Stainless steel"),
        "polypropylene": ("#ebe7dc", "Polypropylene"),
        "elastomer": ("#30383b", "Elastomer"),
    },
    "contaminated-gear-rinse-sink": {
        "stainlessSteel": ("#9faeb4", "Stainless steel"),
        "polypropylene": ("#e5e1d8", "Polypropylene"),
        "elastomer": ("#30383b", "Elastomer"),
        "signalColor": ("#e59d2a", "Safety color"),
    },
    "station-facepiece-cleaning-sink": {
        "stainlessSteel": ("#aebbc0", "Stainless steel"),
        "polypropylene": ("#eee9dd", "Polypropylene"),
        "elastomer": ("#30383b", "Elastomer"),
    },
    "station-call-board": {
        "powderCoat": ("#456981", "Powder coat"),
        "stainlessSteel": ("#9ea9ae", "Stainless steel"),
        "paper": ("#f0ead9", "Paper"),
        "signalColor": ("#edb93c", "Signal color"),
    },
    "transition-zone-floor-mat": {
        "elastomer": ("#343a3c", "Elastomer"),
        "signalColor": ("#e2a423", "Safety marking"),
    },
    "bay-column-protector": {
        "powderCoat": ("#d58e17", "Powder coat"),
        "stainlessSteel": ("#9ea9ae", "Stainless steel"),
        "elastomer": ("#282e31", "Elastomer"),
        "signalColor": ("#f3ce38", "Safety marking"),
    },
}


def js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def main_color(row: dict) -> str:
    name = row["id"]
    if any(token in name for token in ("warning", "bollard", "protector", "boundary", "traffic", "callout")):
        return "#e8791b"
    if any(token in name for token in ("fire-hose", "turnout", "scba", "breathing-air")):
        return "#b94338"
    if any(token in name for token in ("decon", "rinse", "shower", "eyewash", "boot-wash", "clean-zone")):
        return "#4b8984"
    if any(token in name for token in ("alert", "radio", "pager", "call-board", "key-control", "response-map", "clock")):
        return "#4c7089"
    if any(token in name for token in ("sink", "washer", "dryer", "compressor", "generator")):
        return "#557f88"
    return "#637d83"


def materials_for(row: dict) -> dict[str, tuple[str, str]]:
    if row["id"] in SPECIAL_MATERIALS:
        candidates = SPECIAL_MATERIALS[row["id"]]
        used = {material_for(row, part[1], candidates) for part in row["parts"]}
        if row["id"] in {"clean-zone-handwash-sink", "station-utility-sink", "contaminated-gear-rinse-sink", "station-facepiece-cleaning-sink"}:
            used.update({"stainlessSteel", "polypropylene", "elastomer"})
            if row["id"] == "contaminated-gear-rinse-sink":
                used.add("signalColor")
        return {key: value for key, value in candidates.items() if key in used}
    names = [part[1] for part in row["parts"]]
    used: dict[str, tuple[str, str]] = {
        "powderCoat": (main_color(row), "Powder coat"),
        "stainlessSteel": ("#b4bec3", "Stainless steel"),
    }
    if any(RUBBER.search(name) for name in names):
        used["elastomer"] = ("#303539", "Elastomer")
    if any(SIGNAL.search(name) for name in names):
        used["signalColor"] = ("#f0bf38", "Safety color")
    if len(used) < 4 and any(POLYMER.search(name) for name in names):
        used["polymer"] = ("#e8e4d9", "Polymer")
    colors_used = {material_for(row, name, used) for name in names}
    return {key: value for key, value in used.items() if key in colors_used}


def material_for(row: dict, name: str, materials: dict[str, tuple[str, str]]) -> str:
    asset_id = row["id"]
    key = name.lower()
    if asset_id in {"bay-warning-beacon", "station-door-traffic-signal"}:
        if key == "upper-lamp":
            return "redLens"
        if key == "lower-lamp":
            return "greenLens"
    if asset_id == "station-callout-light-strip":
        if key == "lens-0":
            return "redLens"
        if key == "lens-1":
            return "amberLens"
        if key == "lens-2":
            return "greenLens"
    if asset_id == "station-alerting-control-console":
        if key == "display":
            return "screenGlass"
        if key.startswith("status-button"):
            return "signalColor"
    if asset_id == "bay-door-control-station":
        if key == "release-cover":
            return "stainlessSteel"
        if key in {"button-0", "button-2"}:
            return "greenPolymer"
        if key == "button-1":
            return "redPolymer"
    if asset_id == "station-call-board":
        if key.startswith("crew-card"):
            return "paper"
        if key.startswith("column-"):
            return "stainlessSteel"
    if asset_id == "station-electrical-transfer-cabinet" and key == "label-window":
        return "signalColor"
    if asset_id == "station-training-whiteboard":
        if key.startswith("grid-"):
            return "stainlessSteel"
        if key == "marker-tray":
            return "signalColor"
    if asset_id == "contaminated-gear-rinse-sink" and key == "front-apron":
        return "signalColor"
    if asset_id == "apparatus-bay-bollard" and key == "anchor-foot":
        return "stainlessSteel"
    if asset_id == "transition-zone-floor-mat" and "rim" in key:
        return "signalColor"
    if asset_id == "bay-column-protector" and re.fullmatch(r"stripe-[13]", key):
        return "elastomer"
    if asset_id in {"clean-zone-handwash-sink", "station-utility-sink", "contaminated-gear-rinse-sink", "station-facepiece-cleaning-sink"}:
        if "gasket" in key:
            return "elastomer"
        if re.search(r"soap|towel|dispenser|reservoir|plug|spray-head|spray-handle", key):
            return "polypropylene"
        return "stainlessSteel"
    if "elastomer" in materials and RUBBER.search(key):
        return "elastomer"
    if "polymer" in materials and POLYMER.search(key):
        return "polymer"
    if "signalColor" in materials and SIGNAL.search(key):
        return "signalColor"
    if "stainlessSteel" in materials and METAL.search(key):
        return "stainlessSteel"
    return "powderCoat" if "powderCoat" in materials else next(iter(materials))


def preset_values(materials: dict[str, tuple[str, str]], mode: str) -> dict[str, str]:
    if mode == "apparatus-red":
        values = {
            "powderCoat": "#b83d34", "stainlessSteel": "#c3c9cc", "elastomer": "#252a2d",
            "signalColor": "#f3c83d", "redLens": "#d93e42", "greenLens": "#41a66b",
            "amberLens": "#f0b634", "backplate": "#405467", "screenGlass": "#23353d",
            "greenPolymer": "#48a870", "redPolymer": "#d83f42", "polypropylene": "#eee9dd",
            "polymer": "#e8e4d9", "paper": "#f4efdf",
        }
    else:
        values = {
            "powderCoat": "#4e8c87", "stainlessSteel": "#d0d8db", "elastomer": "#30383b",
            "signalColor": "#f2c642", "redLens": "#d83e42", "greenLens": "#40a76c",
            "amberLens": "#f1b836", "backplate": "#476879", "screenGlass": "#263943",
            "greenPolymer": "#4da978", "redPolymer": "#d74343", "polypropylene": "#f2eee2",
            "polymer": "#ece9e1", "paper": "#f4efdf",
        }
    return {key: values[key] for key in materials}


def beveled_box_source() -> list[str]:
    return [
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
    ]


def add_sink_source(row: dict) -> list[str]:
    sink_ids = {"clean-zone-handwash-sink", "station-utility-sink", "contaminated-gear-rinse-sink", "station-facepiece-cleaning-sink"}
    if row["id"] not in sink_ids:
        return []
    return [
        "  const t = Math.min(48, size[1] * 0.1, size[2] * 0.25);",
        "  const cutHeight = size[2] - t + 20;",
        "  const cavity = box(size[0] - 2 * t, size[1] - 2 * t, cutHeight, true)",
        "    .translate(0, 0, -size[2] / 2 + t + cutHeight / 2);",
        "  const shell = profiledBox(size[0], size[1], size[2]).subtract(cavity);",
        "  p.part('basin-shell', shell.translate(at[0], at[1], at[2]).scale(scale).color(stainlessSteel));",
        "  p.part('basin-drain', c(8, Math.max(22, t * 0.48), 10, [at[0], at[1], at[2] - size[2] / 2 + t]).color(stainlessSteel));",
        "  p.part('basin-drain-gasket', c(3, Math.max(24, t * 0.55), 10, [at[0], at[1], at[2] - size[2] / 2 + t + 8]).color(elastomer));",
        "  p.part('basin-drain-plug', b([Math.max(34, t * 0.9), Math.max(34, t * 0.9), 6], [at[0], at[1], at[2] - size[2] / 2 + t + 7]).color(polypropylene));",
    ]


def emit(row: dict) -> str:
    asset_id = row["id"]
    materials = materials_for(row)
    material_lines = [
        f"const {key} = param({js(key)}, {js(value)}, {{ label: {js(label)} }});"
        for key, (value, label) in materials.items()
    ]
    material_lines.extend([
        "",
        "presets({",
        f"  'apparatus-red': {js(preset_values(materials, 'apparatus-red'))},",
        f"  'clean-zone': {js(preset_values(materials, 'clean-zone'))},",
        "});",
    ])
    description = row["description"] + " Editable scale and material colors; use the apparatus-red or clean-zone finish preset."
    lines = [
        f"// {row['title']}: {row['description']} Millimetres, Z up, {row['origin']} origin.",
        "meta({",
        f"  name: {js(asset_id)},",
        "  license: 'CC0-1.0',",
        f"  title: {js(row['title'])},",
        f"  description: {js(description)},",
        f"  tags: {js(list(dict.fromkeys(["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0"] + row['title'].lower().split())))},",
        "  kit: 'fire-station',",
        "  category: 'prop',",
        f"  origin: {js(row['origin'])},",
        "  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],",
        "  triangleBudget: 1800,",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });",
        *material_lines,
        f"const p = assembly({js(asset_id)});",
        "",
        *beveled_box_source(),
        "",
    ]
    lines.extend([
        "",
        "const b = (size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {",
        "  let shape = profiledBox(size[0], size[1], size[2]);",
        "  if (rotation?.[0]) shape = shape.rotateX(rotation[0]);",
        "  if (rotation?.[1]) shape = shape.rotateY(rotation[1]);",
        "  if (rotation?.[2]) shape = shape.rotateZ(rotation[2]);",
        "  return shape.translate(at[0], at[1], at[2]).scale(scale);",
        "};",
    ])
    if any(part[0] == "cylinder" for part in row["parts"]) or asset_id in {"clean-zone-handwash-sink", "station-utility-sink", "contaminated-gear-rinse-sink", "station-facepiece-cleaning-sink", "apparatus-bay-bollard"}:
        lines.extend([
            "const ngon = (r: number, sides: number, rotation = 0) => {",
            "  let profile = path().moveTo(r * Math.cos(rotation), r * Math.sin(rotation));",
            "  for (let i = 1; i < sides; i++) {",
            "    const angle = rotation + 2 * Math.PI * i / sides;",
            "    profile = profile.lineTo(r * Math.cos(angle), r * Math.sin(angle));",
            "  }",
            "  return profile.close();",
            "};",
            "const profiledCylinder = (h: number, r: number, sides: number) =>",
            "  ngon(r, sides).loft(ngon(r * 0.95, sides, Math.PI / sides), { spacing: h, ruled: true });",
            "const c = (h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {",
            "  let shape = profiledCylinder(h, r, segments);",
            "  if (axis && degrees) {",
            "    if (axis[0]) shape = shape.rotateX(degrees);",
            "    else if (axis[1]) shape = shape.rotateY(degrees);",
            "    else if (axis[2]) shape = shape.rotateZ(degrees);",
            "  }",
            "  return shape.translate(at[0], at[1], at[2]).scale(scale);",
            "};",
        ])
    if asset_id in {"clean-zone-handwash-sink", "station-utility-sink", "contaminated-gear-rinse-sink", "station-facepiece-cleaning-sink"}:
        lines.extend([
        "const sinkBasin = (size: [number, number, number], at: [number, number, number]) => {",
            *add_sink_source(row),
            "};",
        ])
    lines.append("")
    for part in row["parts"]:
        if part[0] == "box":
            _, part_name, size, at, rotation = part
            if part_name == "basin" and asset_id in {"clean-zone-handwash-sink", "station-utility-sink", "contaminated-gear-rinse-sink", "station-facepiece-cleaning-sink"}:
                lines.append(f"sinkBasin({js(size)}, {js(at)});")
                continue
            if asset_id == "station-alerting-control-console" and part_name == "display":
                rotation = [-10, 0, 0]
            call = f"b({js(size)}, {js(at)}"
            if rotation:
                call += f", {js(rotation)}"
            color = material_for(row, part_name, materials)
            lines.append(f"p.part({js(part_name)}, {call}).color({color}));")
        elif part[0] == "cylinder":
            _, part_name, dimensions, at, axis, degrees = part
            h, radius, sides = dimensions
            if asset_id == "turnout-gear-drying-cabinet" and part_name.startswith("hanger-rail-"):
                # The original row accidentally used the 1,670 mm rail height
                # as the polygon count. Keep the real rail horizontal at z=1670.
                sides, at, axis, degrees = 8, [at[0], at[1], 1670], [0, 1, 0], 90
            call = f"c({h}, {radius}, {sides}, {js(at)}"
            if axis:
                call += f", {js(axis)}, {degrees}"
            color = material_for(row, part_name, materials)
            lines.append(f"p.part({js(part_name)}, {call}).color({color}));")
        else:
            raise ValueError(f"unsupported part: {part[0]}")
    if asset_id == "apparatus-bay-bollard":
        for index, (x, y) in enumerate([(-82, -82), (82, -82), (-82, 82), (82, 82)]):
            lines.append(f"p.part('anchor-bolt-{index}', c(18, 13, 8, [{x}, {y}, 85]).color(stainlessSteel));")
        lines.append("p.part('post-cap', c(62, 88, 12, [0, 0, 838]).color(stainlessSteel));")
    if asset_id == "clean-zone-handwash-sink":
        lines.append("p.part('tap-spout', c(180, 16, 8, [0, 110, 1165], [1, 0, 0], 90).color(stainlessSteel));")
    lines.extend(["", "return p.model();", ""])
    return "\n".join(lines)


def main() -> None:
    KIT.mkdir(parents=True, exist_ok=True)
    if len(base.ASSETS) != 70:
        raise SystemExit(f"expected 70 original fire-station definitions, found {len(base.ASSETS)}")
    for row in base.ASSETS:
        (KIT / f"{row['id']}.kcad.ts").write_text(emit(row), encoding="utf-8")
    print(f"promoted {len(base.ASSETS)} existing fire-station sources; no catalog assets added")


if __name__ == "__main__":
    main()
