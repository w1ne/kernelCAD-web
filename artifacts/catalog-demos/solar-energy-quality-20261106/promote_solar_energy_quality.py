#!/usr/bin/env python3
"""Promote the existing solar-energy assets into material-aware variants."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/solar-energy"
OUT = Path(__file__).resolve().parent

MATERIALS = {
    "solarGlass": ("Solar glass", "#244a68"),
    "aluminum": ("Frame aluminum", "#b7c1c4"),
    "galvanizedSteel": ("Galvanized steel", "#748184"),
    "stainlessSteel": ("Stainless steel", "#c3caca"),
    "cellBusbar": ("PV cell busbars", "#d9dedd"),
    "concrete": ("Concrete", "#99968d"),
    "polymer": ("Polymer", "#daddd7"),
    "rubber": ("Rubber", "#262c2e"),
    "powderCoat": ("Powder-coated steel", "#687c7c"),
    "displayGlass": ("Display glass", "#24515d"),
    "ceramic": ("Porcelain ceramic", "#eee8d8"),
    "warningPaint": ("Safety paint", "#e5a032"),
    "wood": ("Treated wood", "#856849"),
    "batteryPolymer": ("Battery polymer", "#3b5d65"),
}

FIELD_SERVICE = {
    "solarGlass": "#1e4668", "aluminum": "#a9b5b9",
    "galvanizedSteel": "#68787b", "stainlessSteel": "#abb5b7",
    "cellBusbar": "#e4e5df", "concrete": "#8b8982",
    "polymer": "#cdd2cb", "rubber": "#282d2e",
    "powderCoat": "#7a807b", "displayGlass": "#376a73",
    "ceramic": "#e7e0ce", "warningPaint": "#e79a2e",
    "wood": "#755b43", "batteryPolymer": "#354b51",
}

HIGH_VISIBILITY = {
    "solarGlass": "#183a5b", "aluminum": "#d4dcdf",
    "galvanizedSteel": "#536367", "stainlessSteel": "#e0e5e4",
    "cellBusbar": "#f2f2e9", "concrete": "#77766f",
    "polymer": "#e6e0d1", "rubber": "#232728",
    "powderCoat": "#d1722b", "displayGlass": "#167d95",
    "ceramic": "#fff3d1", "warningPaint": "#f1b431",
    "wood": "#8a6440", "batteryPolymer": "#34745f",
}

PV_ASSETS = {
    "balcony-solar-panel", "bifacial-pv-module", "flexible-solar-panel",
    "floating-solar-platform", "ground-mount-pv-rack", "pv-ballast-block",
    "pv-cable-tray", "pv-module-microinverter", "rooftop-pv-array", "rooftop-pv-module",
    "single-axis-solar-tracker", "solar-carport-canopy", "solar-pergola-canopy",
    "solar-roof-section",
}

SENSOR_ASSETS = {
    "plane-of-array-irradiance-sensor", "solar-electric-meter",
    "solar-weather-station", "solar-wind-sensor-mast",
}


def has(name: str, *tokens: str) -> bool:
    low = name.lower()
    return any(token in low for token in tokens)


def material_for(asset_id: str, part: str) -> str:
    name = part.lower()

    if asset_id in SENSOR_ASSETS:
        if has(name, "instrument-base"):
            return "galvanizedSteel"
        if has(name, "meter-face", "sensor-disc", "sensor-cap"):
            return "displayGlass"
        if has(name, "sensor-pod", "meter-enclosure", "wind-vane", "anemometer-cup"):
            return "polymer"
        if has(name, "meter-ring", "weather-crossarm", "wind-crossarm", "anemometer-hub"):
            return "aluminum"
        if has(name, "mast", "arm", "anemometer-cup-arm"):
            return "galvanizedSteel"
        return "galvanizedSteel"

    if asset_id == "pad-mount-transformer":
        if has(name, "transformer-pad"):
            return "concrete"
        if has(name, "porcelain-bushing"):
            return "ceramic"
        if has(name, "bushing-base", "bushing-cap", "radiator-fin", "lifting-lug"):
            return "stainlessSteel"
        return "powderCoat"

    if asset_id == "pole-mount-transformer":
        if has(name, "utility-pole", "crossarm"):
            return "wood"
        if has(name, "insulator"):
            return "ceramic"
        return "powderCoat"

    if asset_id in PV_ASSETS:
        if has(name, "surface", "flexible-sheet"):
            return "solarGlass"
        if asset_id == "pv-module-microinverter" and has(name, "cell-bar"):
            return "solarGlass"
        if has(name, "cell-bar", "flex-cell-line"):
            return "cellBusbar"
        if has(name, "grommet", "microinverter-port", "lead"):
            return "rubber"
        if has(name, "float", "pontoon"):
            return "polymer"
        if name.startswith(("ballast-left", "ballast-right")) or has(name, "balcony-floor"):
            return "concrete"
        if has(name, "microinverter-case"):
            return "aluminum"
        if has(name, "frame", "edge-border"):
            return "aluminum"
        if has(name, "clamp", "bolt", "grommet"):
            return "stainlessSteel"
        if asset_id == "pv-cable-tray" and has(name, "end-splice"):
            return "stainlessSteel"
        if has(name, "roof-deck", "ridge-cap", "flashing", "tray", "rung", "splice",
               "rail", "rack", "leg", "post", "bracket", "beam", "cross", "axis",
               "pier", "tracker", "torque", "drive-enclosure", "standoff", "slotted-foot"):
            return "galvanizedSteel"
        return "aluminum"

    if asset_id == "battery-rack":
        return "batteryPolymer" if has(name, "battery-") else "galvanizedSteel"

    if asset_id in {"pv-panel-cleaning-robot", "pv-module-transport-cart", "solar-panel-wash-cart"}:
        if has(name, "wheel", "track"):
            return "rubber"
        if asset_id == "pv-panel-cleaning-robot" and has(name, "idler"):
            return "stainlessSteel"
        if has(name, "surface"):
            return "solarGlass"
        if has(name, "module-frame"):
            return "aluminum"
        if has(name, "tank", "body", "brush-bar", "cleaning-wand"):
            return "polymer"
        if has(name, "handle-rail", "push-handle"):
            return "galvanizedSteel"
        if has(name, "hose", "reel"):
            return "rubber"
        return "galvanizedSteel"

    if asset_id == "solar-panel-end-clamp":
        if has(name, "bolt"):
            return "stainlessSteel"
        if has(name, "pressure-cap"):
            return "aluminum"
        return "galvanizedSteel"

    if asset_id == "roof-flashing-mount":
        if has(name, "standoff"):
            return "rubber"
        if has(name, "clamp"):
            return "stainlessSteel"
        return "galvanizedSteel"

    if asset_id == "solar-battery-container":
        return "stainlessSteel" if has(name, "handle", "vent", "lifting", "cooling", "corrugation", "hinge") else "powderCoat"

    if asset_id in {"battery-cabinet", "home-battery-wall"}:
        if has(name, "service-label"):
            return "warningPaint"
        if has(name, "handle", "vent", "seam", "plinth"):
            return "stainlessSteel"
        return "powderCoat"

    if asset_id == "solar-data-logger":
        if has(name, "mast"):
            return "galvanizedSteel"
        if has(name, "antenna-cap"):
            return "polymer"
        return "powderCoat" if has(name, "body", "door") else "stainlessSteel"

    if asset_id == "solar-main-panel":
        return "powderCoat" if has(name, "body", "door") else "stainlessSteel"

    if asset_id in {"ac-disconnect-switch", "dc-disconnect-switch"}:
        if has(name, "conduit"):
            return "rubber"
        if has(name, "lever"):
            return "warningPaint"
        return "powderCoat" if has(name, "body", "door") else "stainlessSteel"

    if asset_id == "solar-charge-controller":
        if has(name, "screen"):
            return "displayGlass"
        if has(name, "button"):
            return "warningPaint"
        return "powderCoat" if has(name, "body", "door") else "stainlessSteel"

    if asset_id in {"hybrid-inverter", "string-inverter", "utility-inverter-station"}:
        if has(name, "display"):
            return "displayGlass"
        if has(name, "cable-port"):
            return "rubber"
        return "powderCoat" if has(name, "body", "door") else "stainlessSteel"

    if asset_id in {"microinverter-unit"}:
        if has(name, "lead"):
            return "rubber"
        if has(name, "mount-ear"):
            return "aluminum"
        return "powderCoat" if has(name, "body") else "stainlessSteel"

    if asset_id in {"pv-combiner-box", "pv-junction-box"}:
        if has(name, "entry", "gland"):
            return "rubber"
        return "powderCoat" if has(name, "body", "door") else "stainlessSteel"

    raise ValueError(f"no material mapping for {asset_id}/{part}")


def replace_color(line: str, role: str) -> str:
    return re.sub(r"\.color\(color\)", f".color({role})", line)


def improve_tracker(source: str) -> str:
    source = re.sub(
        r'(?m)^p\.part\("tracker-table-surface"[^\n]*\n',
        "",
        source,
    )
    source = re.sub(
        r'(?m)^p\.part\("tracker-table-frame"[^\n]*\n',
        'p.part("tracker-table-frame", trackerPanel(1740, 548.4, 22, 0, 0, 522).color(galvanizedSteel));\n',
        source,
    )
    helper = (
        "const trackerPanel = (w:number,d:number,h:number,x:number,y:number,z:number) => "
        "box(w,d,h,true).translate(x,y,z - 372.4).rotate([1,0,0],11).translate(0,0,372.4).scale(scale);\n"
    )
    source = source.replace('const p = assembly("single-axis-solar-tracker");\n',
                            'const p = assembly("single-axis-solar-tracker");\n' + helper)
    parts = []
    for column, x in enumerate((-645, -215, 215, 645)):
        for row, y in enumerate((-134, 134)):
            parts.append(f'p.part("tracker-module-{column}-{row}-frame", trackerPanel(420, 254, 14, {x}, {y}, 539).color(aluminum));')
            parts.append(f'p.part("tracker-module-{column}-{row}-surface", trackerPanel(400, 234, 4, {x}, {y}, 548).color(solarGlass));')
            for divider, dx in enumerate((-100, 100)):
                parts.append(f'p.part("tracker-module-{column}-{row}-busbar-x-{divider}", trackerPanel(4, 234, 2, {x + dx}, {y}, 550).color(cellBusbar));')
            for divider, dy in enumerate((-58, 58)):
                parts.append(f'p.part("tracker-module-{column}-{row}-busbar-y-{divider}", trackerPanel(400, 4, 2, {x}, {y + dy}, 550).color(cellBusbar));')
    source = source.replace("return p.model();", "\n".join(parts) + "\n\nreturn p.model();")
    if source.count("const trackerPanel =") != 1 or "tracker-table-surface" in source:
        raise ValueError("tracker geometry replacement failed")
    return source


def add_cleaning_robot_idlers(source: str) -> str:
    idlers = []
    for side, y in (("left", -138.6), ("right", 138.6)):
        for index, x in enumerate((-170, -57, 57, 170)):
            idlers.append(
                f'p.part("robot-idler-{side}-{index}", '
                f'cylinder(35,22,10).rotate([1,0,0],90).translate({x},{y + 17.5},30).scale(scale).color(stainlessSteel));'
            )
    source = source.replace("return p.model();", "\n".join(idlers) + "\n\nreturn p.model();")
    return source


def add_container_detail(source: str) -> str:
    source = source.replace(
        'p.part("cooling-unit-0", box(313.2, 90, 462.4, true).translate(0, -349.6, 571.2).scale(scale).color(stainlessSteel));',
        'p.part("cooling-unit-0", box(90, 313.2, 462.4, true).translate(-790, 0, 571.2).scale(scale).color(stainlessSteel));',
    )
    source = source.replace(
        'p.part("cooling-unit-1", box(313.2, 90, 462.4, true).translate(0, 349.6, 571.2).scale(scale).color(stainlessSteel));',
        'p.part("cooling-unit-1", box(90, 313.2, 462.4, true).translate(790, 0, 571.2).scale(scale).color(stainlessSteel));',
    )
    detail = []
    for side, x in (("left", -790), ("right", 790)):
        for index, y in enumerate((-315, -225, -135, -45, 45, 135, 225, 315)):
            detail.append(
                f'p.part("container-corrugation-rib-{side}-{index}", '
                f'box(20,18,970,true).translate({x},{y},575.6).scale(scale).color(stainlessSteel));'
            )
    for side, y in (("front", 398.6), ("rear", -398.6)):
        if side == "rear":
            for door, x in ((1, -385.5), (2, 385.5)):
                detail.append(
                    f'p.part("battery-container-rear-door-{door}", '
                    f'box(763,8,1029.2,true).translate({x},{y},571.6).scale(scale).color(powderCoat));'
                )
            for handle, x in ((1, -107.94), (2, 663.06)):
                detail.append(
                    f'p.part("battery-container-rear-handle-{handle}", '
                    f'box(12,18,72,true).translate({x},-409.6,575.6).scale(scale).color(stainlessSteel));'
                )
            for vent, z in enumerate((100, 235.867, 371.733, 507.6, 643.467, 779.333, 915.2), 1):
                detail.append(
                    f'p.part("battery-container-rear-vent-{vent}", '
                    f'box(751.68,10,8,true).translate(0,-407.6,{z}).scale(scale).color(stainlessSteel));'
                )
        for x_side, x in (("left", -690), ("left", -80), ("right", 80), ("right", 690)):
            for level, z in enumerate((210, 575, 930)):
                detail.append(
                    f'p.part("container-door-hinge-{side}-{x_side}-{x}-{level}", '
                    f'box(28,18,92,true).translate({x},{410 if y > 0 else -410},{z}).scale(scale).color(stainlessSteel));'
                )
    source = source.replace("return p.model();", "\n".join(detail) + "\n\nreturn p.model();")
    return source


def main() -> None:
    records = []
    for path in sorted(KIT.glob("*.kcad.ts")):
        asset_id = path.name.removesuffix(".kcad.ts")
        original = path.read_text(encoding="utf-8")
        before_hash = hashlib.sha256(original.encode()).hexdigest()
        parts = re.findall(r'p\.part\(\s*[\'"]([^\'"]+)[\'"]', original)
        if not parts:
            raise ValueError(f"no named parts in {path}")
        role_map = {part: material_for(asset_id, part) for part in parts}
        roles = list(dict.fromkeys(role_map.values()))
        synthetic_parts = []
        if asset_id == "single-axis-solar-tracker":
            roles.append("cellBusbar")
            synthetic_parts = [
                {"part": f"tracker-module-{column}-{row}-frame", "param": "aluminum"}
                for column in range(4) for row in range(2)
            ] + [
                {"part": f"tracker-module-{column}-{row}-surface", "param": "solarGlass"}
                for column in range(4) for row in range(2)
            ] + [
                {"part": f"tracker-module-{column}-{row}-busbar-{axis}-{index}", "param": "cellBusbar"}
                for column in range(4) for row in range(2)
                for axis in ("x", "y") for index in range(2)
            ]
        elif asset_id == "pv-panel-cleaning-robot":
            roles.append("stainlessSteel")
            synthetic_parts = [
                {"part": f"robot-idler-{side}-{index}", "param": "stainlessSteel"}
                for side in ("left", "right") for index in range(4)
            ]
        elif asset_id == "solar-battery-container":
            synthetic_parts = [
                {"part": f"container-corrugation-rib-{side}-{index}", "param": "stainlessSteel"}
                for side in ("left", "right") for index in range(8)
            ] + [
                {"part": f"battery-container-rear-door-{door}", "param": "powderCoat"}
                for door in (1, 2)
            ] + [
                {"part": f"battery-container-rear-handle-{handle}", "param": "stainlessSteel"}
                for handle in (1, 2)
            ] + [
                {"part": f"battery-container-rear-vent-{vent}", "param": "stainlessSteel"}
                for vent in range(1, 8)
            ] + [
                {"part": f"container-door-hinge-{side}-{x_side}-{x}-{level}", "param": "stainlessSteel"}
                for side in ("front", "rear")
                for x_side, x in (("left", -690), ("left", -80), ("right", 80), ("right", 690))
                for level in range(3)
            ]
        roles = list(dict.fromkeys(roles))
        recorded_role_map = {
            part: role for part, role in role_map.items()
            if not (asset_id == "single-axis-solar-tracker" and part == "tracker-table-surface")
        }
        if not 2 <= len(roles) <= 4:
            raise ValueError(f"{asset_id} has {len(roles)} material roles: {roles}")
        if not re.search(r"const color = param\(['\"]color['\"]", original):
            raise ValueError(f"generic color control not found in {path}")
        if original.count(".color(color)") != len(parts):
            raise ValueError(f"expected one color per part in {path}")

        source = re.sub(r"(?m)^const color = param\(['\"]color['\"].*\n", "", original)
        declarations = "".join(
            f"const {role} = param('{role}', '{MATERIALS[role][1]}', {{ label: '{MATERIALS[role][0]}' }});\n"
            for role in roles
        )
        presets = "presets({\n"
        for preset_name, palette in (("fieldService", FIELD_SERVICE), ("highVisibility", HIGH_VISIBILITY)):
            presets += f"  {preset_name}: {{ " + ", ".join(f"{role}: '{palette[role]}'" for role in roles) + " },\n"
        presets += "});\n"
        source = re.sub(r"(?m)^(const scale = .*\n)", r"\1" + declarations + presets, source, count=1)

        part_index = 0
        def recolor(line: str) -> str:
            nonlocal part_index
            part = parts[part_index]
            part_index += 1
            return replace_color(line, role_map[part])

        source = re.sub(r"(?m)^p\.part\([^\n]*\.color\(color\)[^\n]*$", lambda match: recolor(match.group(0)), source)
        if part_index != len(parts):
            raise ValueError(f"recolored {part_index}/{len(parts)} parts for {asset_id}")

        description_match = re.search(r"(?m)^\s*description: ('|\")([^'\"]*)\1,?\s*$", source)
        if not description_match:
            raise ValueError(f"description not found in {path}")
        material_labels = ", ".join(MATERIALS[role][0].lower() for role in roles)
        old_description = description_match.group(2)
        detail_descriptions = {
            "single-axis-solar-tracker": "Eight framed PV modules tilt together around a torque tube carried by three piers and a drive housing",
            "pv-panel-cleaning-robot": "Tracked panel-cleaning carriage with four idler wheels per side and a full-width brush shaft",
            "solar-battery-container": "Corrugated battery enclosure with paired service doors on both long faces, raised hinges, louvered vents, lifting corners and end-mounted cooling units",
        }
        descriptive_base = detail_descriptions.get(asset_id, old_description.rstrip("."))
        new_description = descriptive_base.rstrip(".") + f". Material controls: {material_labels}."
        quote = description_match.group(1)
        source = source[:description_match.start(2)] + new_description + source[description_match.end(2):]
        title_match = re.search(r"(?m)^\s*title: ('|\")([^'\"]+)\1,?\s*$", source)
        if not title_match:
            raise ValueError(f"title not found in {path}")
        comment = f"// {title_match.group(2)}: {descriptive_base.rstrip('.')}"
        source = re.sub(r"(?m)^(meta\()", lambda match: comment + "\n" + match.group(1), source, count=1)

        if asset_id == "single-axis-solar-tracker":
            source = improve_tracker(source)
            roles = list(dict.fromkeys(roles + ["cellBusbar"]))
        elif asset_id == "pv-panel-cleaning-robot":
            source = add_cleaning_robot_idlers(source)
            roles = list(dict.fromkeys(roles + ["stainlessSteel"]))
        elif asset_id == "solar-battery-container":
            source = add_container_detail(source)

        path.write_text(source, encoding="utf-8")
        records.append({
            "id": asset_id,
            "source": str(path.relative_to(ROOT)),
            "beforeSha256": before_hash,
            "afterSha256": hashlib.sha256(source.encode()).hexdigest(),
            "partsBeforeDetail": len(parts),
            "partsAfter": len(re.findall(r'p\.part\(\s*[\'"]([^\'"]+)[\'"]', source)),
            "materials": [
                {"part": name, "param": role, "label": MATERIALS[role][0]}
                for name, role in recorded_role_map.items()
            ] + [
                {"part": item["part"], "param": item["param"], "label": MATERIALS[item["param"]][0]}
                for item in synthetic_parts
            ],
            "presets": ["fieldService", "highVisibility"],
        })

    evidence = {
        "date": "2026-11-06",
        "kit": "solar-energy",
        "assetCount": len(records),
        "materialsAdded": sum(len({row["param"] for row in record["materials"]}) for record in records),
        "presetEntriesAdded": sum(len(record["presets"]) for record in records),
        "assets": records,
    }
    (OUT / "material-map.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in evidence.items() if key != "assets"}, indent=2))


if __name__ == "__main__":
    main()
