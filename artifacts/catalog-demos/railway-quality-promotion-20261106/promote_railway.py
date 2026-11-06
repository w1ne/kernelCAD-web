#!/usr/bin/env python3
"""Promote the existing railway assets with material-specific controls."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/railway"
OUT = Path(__file__).resolve().parent

LABELS = {
    "paintedSteel": "Painted steel",
    "paintedAluminum": "Painted aluminum",
    "railSteel": "Rail and running gear steel",
    "stainlessSteel": "Stainless steel",
    "galvanizedSteel": "Galvanized steel",
    "glass": "Glazing",
    "displayGlass": "Display glass",
    "signalRedGlass": "Red signal glass",
    "signalAmberGlass": "Amber signal glass",
    "signalGreenGlass": "Green signal glass",
    "rubber": "Rubber",
    "timber": "Timber",
    "concrete": "Concrete",
    "ballast": "Track ballast",
    "asphalt": "Road asphalt",
    "safetyPaint": "High-visibility paint",
    "tactilePolymer": "Tactile polymer",
    "polymerShell": "Luggage polymer shell",
    "leather": "Leather",
    "aluminum": "Bare aluminum",
    "enamel": "Railway enamel",
    "brass": "Brass",
}

PALETTE = {
    "paintedSteel": "#53646c",
    "paintedAluminum": "#506f7b",
    "railSteel": "#626b70",
    "stainlessSteel": "#b8c1c2",
    "galvanizedSteel": "#929da0",
    "glass": "#54a6bb",
    "displayGlass": "#385f77",
    "signalRedGlass": "#cf4039",
    "signalAmberGlass": "#efb438",
    "signalGreenGlass": "#42935f",
    "rubber": "#30363a",
    "timber": "#8b6643",
    "concrete": "#aaa79c",
    "ballast": "#706b62",
    "asphalt": "#4e5558",
    "safetyPaint": "#e7b735",
    "tactilePolymer": "#e1b33a",
    "polymerShell": "#527b91",
    "leather": "#6d4a34",
    "aluminum": "#a7b2b4",
    "enamel": "#eee5cf",
    "brass": "#c29b46",
}

FRESH_SERVICE = {
    "paintedSteel": "#b74734",
    "paintedAluminum": "#28728a",
    "railSteel": "#56636a",
    "stainlessSteel": "#cad2d1",
    "galvanizedSteel": "#aab4b4",
    "glass": "#68b9ca",
    "displayGlass": "#417b98",
    "signalRedGlass": "#e0443a",
    "signalAmberGlass": "#ffc12f",
    "signalGreenGlass": "#32a05e",
    "rubber": "#272e32",
    "timber": "#9b7146",
    "concrete": "#b8b4a8",
    "ballast": "#797367",
    "asphalt": "#555c5e",
    "safetyPaint": "#f5c521",
    "tactilePolymer": "#f0c32c",
    "polymerShell": "#4388a5",
    "leather": "#795239",
    "aluminum": "#bdc8c8",
    "enamel": "#f6eddb",
    "brass": "#d3aa4d",
}

# Each source starts with one primary material. Regex rules assign named parts to
# other materials only where those materials are visible and make sense.
SPECS = {
    "baggage-cart": ("paintedSteel", [(r"wheel", "rubber"), (r"top-rail", "stainlessSteel")]),
    "buffer-stop": ("paintedSteel", [(r"rail-", "railSteel"), (r"sleeper", "concrete"), (r"pad", "rubber")]),
    "caboose": ("paintedSteel", [(r"window", "glass"), (r"underframe|wheel", "railSteel")]),
    "commuter-car": ("paintedAluminum", [(r"window", "glass"), (r"underframe|bogie|wheel", "railSteel"), (r"air-unit", "stainlessSteel")]),
    "crossing-gate": ("galvanizedSteel", [(r"barrier-arm|counterweight", "safetyPaint"), (r"barrier-stripe", "enamel"), (r"lamp-head", "signalAmberGlass")]),
    "crossing-warning-light": ("galvanizedSteel", [(r"lamp-left", "signalRedGlass"), (r"lamp-right", "signalAmberGlass"), (r"hood", "safetyPaint")]),
    "curved-track": ("railSteel", [(r"ballast", "ballast"), (r"sleeper", "concrete")]),
    "diesel-locomotive": ("paintedSteel", [(r"frame|wheel|front-grille", "railSteel"), (r"cab-.*window", "glass"), (r"headlamp", "signalAmberGlass")]),
    "dining-car": ("paintedSteel", [(r"window", "glass"), (r"underframe|wheel", "railSteel"), (r"galley-vent", "stainlessSteel")]),
    "electric-locomotive": ("paintedSteel", [(r"front-window|cab-side-window", "glass"), (r"frame|wheel", "railSteel"), (r"pantograph", "aluminum")]),
    "flatbed-wagon": ("railSteel", [(r"deck", "timber"), (r"stake", "paintedSteel"), (r"wheel", "railSteel")]),
    "freight-boxcar": ("paintedSteel", [(r"underframe|bogie|wheel|coupler", "railSteel"), (r"ladder|door-rail", "galvanizedSteel")]),
    "handcar": ("paintedSteel", [(r"platform", "timber"), (r"wheel", "railSteel"), (r"grip", "rubber")]),
    "hopper-wagon": ("paintedSteel", [(r"underframe|wheel", "railSteel"), (r"top-rail|outlet", "galvanizedSteel")]),
    "inspection-trolley": ("paintedSteel", [(r"wheel", "railSteel"), (r"seat", "timber"), (r"handlebar", "rubber")]),
    "level-crossing": ("asphalt", [(r"rail-", "railSteel"), (r"warning-post|crossbar", "safetyPaint")]),
    "luggage-stack": ("polymerShell", [(r"handle", "leather"), (r"wheel", "rubber")]),
    "lumber-wagon": ("paintedSteel", [(r"underframe|wheel", "railSteel"), (r"deck|log", "timber")]),
    "mail-car": ("paintedSteel", [(r"window", "glass"), (r"underframe|wheel", "railSteel"), (r"vent", "aluminum")]),
    "maintenance-railcar": ("safetyPaint", [(r"frame|wheel", "railSteel"), (r"tool-box", "paintedSteel"), (r"beacon", "signalAmberGlass")]),
    "milepost": ("paintedSteel", [(r"board", "enamel"), (r"foot", "concrete")]),
    "passenger-coach": ("paintedSteel", [(r"window", "glass"), (r"underframe|bogie|wheel", "railSteel")]),
    "platform-canopy": ("galvanizedSteel", [(r"roof|brace|ridge|gutter", "paintedSteel")]),
    "rail-sleeper": ("concrete", [(r"plate", "railSteel"), (r"bolt", "stainlessSteel")]),
    "railway-lantern": ("paintedSteel", [(r"globe", "glass"), (r"handle", "brass")]),
    "railway-ticket-machine": ("paintedSteel", [(r"display", "displayGlass"), (r"keypad|ticket-slot", "stainlessSteel")]),
    "semaphore-signal": ("paintedSteel", [(r"arm", "safetyPaint"), (r"pivot", "brass"), (r"ladder", "galvanizedSteel")]),
    "signal-gantry": ("galvanizedSteel", [(r"signal-", "paintedSteel"), (r"lens-left", "signalRedGlass"), (r"lens-right", "signalAmberGlass")]),
    "signal-light": ("galvanizedSteel", [(r"lens-top", "signalRedGlass"), (r"lens-middle", "signalAmberGlass"), (r"lens-bottom", "signalGreenGlass")]),
    "station-bench": ("timber", [(r"leg-|arm-", "paintedSteel")]),
    "station-clock": ("paintedSteel", [(r"face", "enamel"), (r"rim", "brass")]),
    "station-platform": ("concrete", [(r"tactile-strip", "tactilePolymer")]),
    "steam-locomotive": ("paintedSteel", [(r"front-window", "glass"), (r"lower-frame|wheel|drive-rod", "railSteel"), (r"stack-cap", "brass")]),
    "straight-track": ("ballast", [(r"rail-", "railSteel"), (r"sleeper", "concrete")]),
    "subway-car": ("paintedAluminum", [(r"window", "glass"), (r"underframe|bogie|wheel", "railSteel")]),
    "tank-wagon": ("paintedSteel", [(r"underframe|bogie|wheel|ladder", "railSteel"), (r"tank-cap|walkway", "stainlessSteel")]),
    "ticket-barrier": ("paintedSteel", [(r"reader|sensor", "displayGlass"), (r"flap", "aluminum")]),
    "timetable-board": ("paintedSteel", [(r"panel|display", "enamel"), (r"top-cap", "brass")]),
    "track-switch-lever": ("paintedSteel", [(r"grip", "rubber"), (r"pivot|rod", "galvanizedSteel")]),
    "turnout-track": ("ballast", [(r"main-|branch-rail|frog", "railSteel"), (r"tie-", "concrete")]),
}


def mix(hex_color: str, toward: tuple[int, int, int], amount: float) -> str:
    rgb = tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    out = tuple(round(old * (1 - amount) + new * amount) for old, new in zip(rgb, toward))
    return "#" + "".join(f"{value:02x}" for value in out)


def main() -> None:
    records = []
    sources = sorted(KIT.glob("*.kcad.ts"))
    if len(sources) != 40:
        raise ValueError(f"expected 40 existing railway assets, found {len(sources)}")

    for path in sources:
        asset_id = path.name.removesuffix(".kcad.ts")
        src = path.read_text()
        if asset_id not in SPECS:
            raise ValueError(f"missing material specification for {asset_id}")
        if "presets({" in src or "const paintedSteel = param(" in src:
            raise ValueError(f"already promoted: {asset_id}")

        color_match = re.search(
            r"const color = param\('color',\s*(['\"])(#[0-9a-fA-F]{6})\1,\s*\{ label: ['\"]Asset color['\"] \}\);",
            src,
        )
        if not color_match:
            raise ValueError(f"could not read original asset color: {asset_id}")
        original_color = color_match.group(2).lower()

        if asset_id == "diesel-locomotive":
            old_nose = 'p.part("nose", box(250, 270, 245, true).translate(370,0,320).scale(scale).translate(0, 0, -12).color(color));'
            shaped_nose = 'p.part("nose", path().moveTo(245,195).lineTo(495,225).lineTo(495,390).lineTo(245,445).close().extrude(270).rotateX(90).translate(0,135,0).scale(scale).translate(0, 0, -12).color(color));'
            if old_nose not in src:
                raise ValueError("expected original diesel nose geometry")
            src = src.replace(old_nose, shaped_nose, 1)
            cab_roof = 'p.part("cab-roof", box(270,330,42,true).translate(-410,0,561).scale(scale).translate(0, 0, -12).color(color));\n'
            windows = (
                'p.part("cab-side-window-left", box(118,8,118,true).translate(-410,-148,420).scale(scale).translate(0, 0, -12).color(color));\n'
                'p.part("cab-side-window-right", box(118,8,118,true).translate(-410,148,420).scale(scale).translate(0, 0, -12).color(color));\n'
                'p.part("cab-front-window", box(8,178,126,true).translate(-297,0,420).scale(scale).translate(0, 0, -12).color(color));\n'
            )
            if cab_roof not in src:
                raise ValueError("expected original diesel cab roof geometry")
            src = src.replace(cab_roof, cab_roof + windows, 1)

        if asset_id == "crossing-gate":
            arm = 'p.part("barrier-arm", box(1100,48,48,true).rotate([0,1,0],-3).translate(580,0,520).scale(scale).translate(0, 0, 0).color(color));\n'
            stripes = "".join(
                f'p.part("barrier-stripe-{index}", box(82,52,52,true).rotate([0,1,0],-3).translate({x},0,520).scale(scale).translate(0, 0, 0).color(color));\n'
                for index, x in enumerate((190, 430, 670, 910), start=1)
            )
            if arm not in src:
                raise ValueError("expected original crossing barrier arm")
            src = src.replace(arm, arm + stripes, 1)

        if asset_id == "electric-locomotive":
            front_window = 'p.part("front-window", box(14,210,120,true).translate(551,-2,400).scale(scale).translate(0, 0, -14).color(color));\n'
            side_windows = (
                'p.part("cab-side-window-left", box(130,10,145,true).translate(440,-153,415).scale(scale).translate(0, 0, -14).color(color));\n'
                'p.part("cab-side-window-right", box(130,10,145,true).translate(440,153,415).scale(scale).translate(0, 0, -14).color(color));\n'
            )
            if front_window not in src:
                raise ValueError("expected original electric locomotive windshield")
            src = src.replace(front_window, front_window + side_windows, 1)

        if asset_id == "station-clock":
            top_cap = 'p.part("top-cap", box(240,180,38,true).translate(0,0,820).scale(scale).translate(0, 0, 0).color(color));\n'
            raised_cap = 'p.part("top-cap", box(240,180,38,true).translate(0,30,895).scale(scale).translate(0, 0, 0).color(color));\n'
            if top_cap not in src:
                raise ValueError("expected original station clock top cap")
            src = src.replace(top_cap, raised_cap, 1)
            rim = 'p.part("rim", cylinder(32,198,16).subtract(cylinder(34,166,16).translate(0,0,-1)).rotate([1,0,0],90).translate(0,-14,700).scale(scale).translate(0, 0, 0).color(color));\n'
            dial = (
                'p.part("hour-hand", box(14,10,72,true).rotateY(-28).translate(0,-60,700).scale(scale).translate(0, 0, 0).color(color));\n'
                'p.part("minute-hand", box(10,10,112,true).rotateY(38).translate(0,-60,700).scale(scale).translate(0, 0, 0).color(color));\n'
                'p.part("dial-mark-top", box(10,10,24,true).translate(0,-60,850).scale(scale).translate(0, 0, 0).color(color));\n'
                'p.part("dial-mark-bottom", box(10,10,24,true).translate(0,-60,550).scale(scale).translate(0, 0, 0).color(color));\n'
                'p.part("dial-mark-left", box(24,10,10,true).translate(-150,-60,700).scale(scale).translate(0, 0, 0).color(color));\n'
                'p.part("dial-mark-right", box(24,10,10,true).translate(150,-60,700).scale(scale).translate(0, 0, 0).color(color));\n'
            )
            if rim not in src:
                raise ValueError("expected original station clock bezel")
            src = src.replace(rim, rim + dial, 1)

        if asset_id == "milepost":
            board = 'p.part("board", box(240,60,220,true).translate(0,0,610).scale(scale).translate(0, 0, 0).color(color));\n'
            markings = (
                'p.part("distance-mark-vertical", box(14,8,78,true).translate(0,-35,610).scale(scale).translate(0, 0, 0).color(color));\n'
                'p.part("distance-mark-top", box(50,8,12,true).translate(10,-35,648).scale(scale).translate(0, 0, 0).color(color));\n'
                'p.part("distance-mark-bottom", box(50,8,12,true).translate(0,-35,574).scale(scale).translate(0, 0, 0).color(color));\n'
            )
            if board not in src:
                raise ValueError("expected original milepost marker board")
            src = src.replace(board, board + markings, 1)

        base_role, rules = SPECS[asset_id]
        part_names = re.findall(r"\.part\(\s*(['\"])([^'\"]+)\1", src)
        names = [name for _, name in part_names]
        if not names:
            raise ValueError(f"no named components found: {asset_id}")

        assignments = {name: base_role for name in names}
        for pattern, role in rules:
            if role not in LABELS:
                raise ValueError(f"unknown material role {role} in {asset_id}")
            matched = [name for name in names if re.search(pattern, name)]
            if not matched:
                raise ValueError(f"material rule {pattern!r} matched no parts in {asset_id}")
            for name in matched:
                assignments[name] = role
        roles = list(dict.fromkeys(assignments.values()))
        if not 2 <= len(roles) <= 4:
            raise ValueError(f"expected 2-4 materials for {asset_id}, got {roles}")

        preserve_livery = {"paintedSteel", "paintedAluminum"}
        defaults = {
            role: original_color if role == base_role and role in preserve_livery else PALETTE[role]
            for role in roles
        }
        if asset_id == "diesel-locomotive":
            # A distinct default livery lifts the cab, glazing, and nose from
            # the dark running gear in the catalog's small preview.
            defaults["paintedSteel"] = "#28758b"
        if asset_id == "electric-locomotive":
            defaults["paintedSteel"] = "#2f7286"
        if asset_id == "steam-locomotive":
            defaults["paintedSteel"] = "#914337"
        if asset_id == "milepost":
            defaults["paintedSteel"] = "#515d63"
        weathered = {
            role: mix(value, (112, 103, 89), 0.2 if "Glass" in role or role == "glass" else 0.27)
            for role, value in defaults.items()
        }
        fresh = {role: FRESH_SERVICE[role] for role in roles}
        params = "\n".join(
            f"const {role} = param('{role}', '{defaults[role]}', {{ label: '{LABELS[role]}' }});"
            for role in roles
        )
        presets = (
            "presets({\n"
            + "  weathered: { " + ", ".join(f"{role}: '{value}'" for role, value in weathered.items()) + " },\n"
            + "  freshService: { " + ", ".join(f"{role}: '{value}'" for role, value in fresh.items()) + " },\n"
            + "});"
        )
        src, replaced = re.subn(
            r"^const color = param\('color'.*?\);$",
            params + "\n" + presets,
            src,
            count=1,
            flags=re.M,
        )
        if replaced != 1:
            raise ValueError(f"could not replace color knob in {asset_id}")

        for name, role in assignments.items():
            pattern = re.compile(rf"(\.part\(\s*['\"]{re.escape(name)}['\"][^\n]*?\.color\()color(\))")
            src, changed = pattern.subn(rf"\g<1>{role}\g<2>", src, count=1)
            if changed != 1:
                raise ValueError(f"could not assign {asset_id}/{name} to {role}")
        if re.search(r"\.color\(color\)|const color = param\('color'", src):
            raise ValueError(f"generic color control remains in {asset_id}")

        title_match = re.search(r"title:\s*(['\"])(.*?)\1", src)
        title = title_match.group(2) if title_match else asset_id.replace("-", " ").title()
        description_match = re.search(r"description:\s*(['\"])(.*?)\1,", src)
        if not description_match:
            raise ValueError(f"could not read description in {asset_id}")
        description = re.sub(r"\s*Knobs: overall scale and asset color\.$", "", description_match.group(2))
        if asset_id == "diesel-locomotive":
            description = "Road-switcher diesel locomotive with a long hood, sloped nose, glazed cab, radiator grille, front lights and six steel wheels."
        feature_overrides = {
            "crossing-gate": "Rail crossing barrier with alternating white and yellow bands, a pivot housing, counterweight and warning lamp.",
            "electric-locomotive": "Electric locomotive with a sloped nose, glazed cab, raised aluminum pantograph and six steel wheels.",
            "milepost": "Trackside railway milepost with a marked enamel distance board, narrow post, cap and broad ground foot.",
            "station-clock": "Round station clock with a marked enamel face, brass bezel, hour and minute hands, and a tall support post.",
            "steam-locomotive": "Steam locomotive with a cylindrical boiler, brass stack cap, glazed cab, cowcatcher and three driving wheel pairs.",
        }
        if asset_id in feature_overrides:
            description = feature_overrides[asset_id]
        material_text = ", ".join(LABELS[role].lower() for role in roles)
        new_description = f"{description} Editable material controls: {material_text}. Includes weathered and fresh service presets."
        src, changed = re.subn(
            r"description:\s*(['\"])(.*?)\1,",
            "description: " + json.dumps(new_description) + ",",
            src,
            count=1,
        )
        if changed != 1:
            raise ValueError(f"could not update description in {asset_id}")

        first_comment = re.search(r"^// (.+)$", src, re.M)
        if not first_comment:
            raise ValueError(f"missing descriptive comment in {asset_id}")
        feature = first_comment.group(1)
        feature = re.sub(r"^Original kernelCAD low-poly\s+", "", feature)
        feature = feature.replace("low-poly low-poly", "low-poly")
        if asset_id == "diesel-locomotive":
            feature = "Road-switcher diesel locomotive with a long hood, sloped nose, glazed cab, radiator grille, front lights and six steel wheels."
        feature_overrides = {
            "crossing-gate": "Rail crossing barrier with alternating white and yellow bands, a pivot housing, counterweight and warning lamp.",
            "electric-locomotive": "Electric locomotive with a sloped nose, glazed cab, raised aluminum pantograph and six steel wheels.",
            "milepost": "Trackside railway milepost with a marked enamel distance board, narrow post, cap and broad ground foot.",
            "station-clock": "Round station clock with a marked enamel face, brass bezel, hour and minute hands, and a tall support post.",
            "steam-locomotive": "Steam locomotive with a cylindrical boiler, brass stack cap, glazed cab, cowcatcher and three driving wheel pairs.",
        }
        if asset_id in feature_overrides:
            feature = feature_overrides[asset_id]
        feature = feature[:1].upper() + feature[1:]
        src = src[:first_comment.start()] + "// " + feature + src[first_comment.end():]
        src = re.sub(
            r"^// Millimetres, Z up, base on z = 0\. All visible parts share one color control\.$",
            "// Millimetres, Z up, base on z = 0. Material knobs map to the named components below.",
            src,
            count=1,
            flags=re.M,
        )
        path.write_text(src)
        records.append({
            "id": asset_id,
            "title": title,
            "partCount": len(names),
            "baseMaterial": base_role,
            "materials": roles,
            "assignments": assignments,
            "presets": {"weathered": weathered, "freshService": fresh},
            "originalColor": original_color,
        })

    OUT.joinpath("promotion-audit.json").write_text(
        json.dumps({"kit": "railway", "assets": records}, indent=2) + "\n"
    )
    print(f"Promoted {len(records)} railway assets; wrote {OUT / 'promotion-audit.json'}")


if __name__ == "__main__":
    main()
