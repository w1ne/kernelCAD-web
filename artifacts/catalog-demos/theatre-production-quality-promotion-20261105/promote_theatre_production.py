#!/usr/bin/env python3
"""Promote the existing theatre-production models with material controls and palettes."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/theatre-production"

TEXTILE = {
    "cyclorama-drop", "grand-drape-valance", "marley-floor-roll", "masking-leg",
    "sandbag-counterweight", "scrim-frame", "teaser-border", "traveler-curtain-track",
}
DECK = {
    "dance-floor-panel", "folding-stage-ramp", "modular-stage-deck",
    "orchestra-pit-filler", "orchestra-shell-panel", "prop-table",
    "rolling-stage-platform", "scenic-flat-panel", "scenic-wagon",
    "stage-edge-trim", "stage-extension-wing", "stage-pocket-hatch",
    "stage-riser-platform", "stage-stair-unit",
}
LIGHTING = {
    "dimmer-rack", "ellipsoidal-reflector-spotlight", "fresnel-wash-fixture",
    "led-cyc-wash-light", "par-can-fixture", "spotlight-followspot-stand",
    "stage-batten-section", "strip-light-battens",
}
CONTROL = {
    "audio-mixing-console", "audio-monitor-wedge", "backstage-call-board",
    "hoist-controller", "lighting-control-console", "stage-manager-console",
    "stage-power-distro", "wireless-intercom-beltpack",
}
CASEWORK = {
    "cable-ramp-crossing", "floor-cable-trough", "prop-storage-rack",
    "riser-cart", "touring-road-case",
}
DESCRIPTION_OVERRIDES = {
    "touring-road-case": "Touring flight case with reinforced corners, recessed pull handles, metal latches and four exposed low-profile caster wheels.",
}

MATERIALS = {
    "fabric": {"label": "Stage fabric", "default": "#463849", "houseShow": "#28262d", "touring": "#a14469"},
    "timber": {"label": "Stage timber", "default": "#946b43", "houseShow": "#725137", "touring": "#cd914b"},
    "steel": {"label": "Painted steel", "default": "#46515a", "houseShow": "#343b41", "touring": "#315968"},
    "paintedSteel": {"label": "Painted steel", "default": "#454d54", "houseShow": "#313940", "touring": "#dda21f"},
    "galvanizedSteel": {"label": "Galvanized steel", "default": "#aab5b9", "houseShow": "#c0c8ca", "touring": "#dce2e2"},
    "powderCoat": {"label": "Powder-coated steel", "default": "#353b41", "houseShow": "#272d33", "touring": "#315465"},
    "aluminum": {"label": "Aluminum", "default": "#bac3c6", "houseShow": "#c7cecf", "touring": "#dce3e2"},
    "glass": {"label": "Lens and display glass", "default": "#f3e9bf", "houseShow": "#ffd15d", "touring": "#31b9d2"},
    "polymer": {"label": "Polymer controls and cable jacket", "default": "#426878", "houseShow": "#344e5b", "touring": "#e3a928"},
    "hardware": {"label": "Steel hardware", "default": "#c28f3e", "houseShow": "#c5a052", "touring": "#e2b347"},
    "rubber": {"label": "Rubber and isolation pads", "default": "#272a2d", "houseShow": "#222629", "touring": "#25292c"},
}

ORDER = list(MATERIALS)
ASSET_LINE = re.compile(
    r"^(?P<indent>\s*)p\.part\((?P<quote>['\"])(?P<part>[^'\"]+)(?P=quote), "
    r"(?P<shape>.*)\.color\(color\)\);$"
)
DESCRIPTION_LINE = re.compile(
    r"^(?P<indent>\s*)description:\s*(?P<value>\"(?:\\.|[^\"])*\"|'(?:\\.|[^'])*'),$"
)
TITLE_LINE = re.compile(r"^\s*title:\s*(['\"])(.*?)\1,")


def theme_for(asset_id: str) -> str:
    if asset_id in TEXTILE:
        return "textile"
    if asset_id in DECK:
        return "deck"
    if asset_id in LIGHTING:
        return "lighting"
    if asset_id in CONTROL:
        return "control"
    if asset_id in CASEWORK:
        return "casework"
    return "rigging"


def material_for(part: str, theme: str) -> str:
    name = part.lower()
    contains = lambda *words: any(word in name for word in words)

    if theme == "textile":
        if contains("cloth", "curtain", "drape", "valance", "scrim", "sheet", "bag-body", "strap", "seam", "hem"):
            return "fabric"
        if contains("pin", "hook", "eye", "hanger", "grommet", "weight", "retainer", "carrier", "tab", "cap"):
            return "hardware"
        return "steel"

    if theme == "deck":
        if contains("caster", "wheel", "pad", "level-foot", "foot-"):
            return "rubber"
        if contains("pin", "hinge", "fastener", "fixing", "socket", "handle", "lock", "tab", "grip"):
            return "hardware"
        if contains("deck", "surface", "fascia", "shelf", "worktop", "panel", "face", "step", "floor", "ramp", "platform", "apron", "stiffener"):
            return "timber"
        return "steel"

    if theme == "lighting":
        if contains("lens", "display", "window", "indicator"):
            return "glass"
        if contains("barrel", "rim", "reflector", "bezel"):
            return "aluminum"
        if contains("bolt", "clip", "tab", "hanger", "pivot", "eye", "fastener", "spigot", "crossbar", "handle", "end-plate", "yoke", "support", "foot"):
            return "hardware"
        return "powderCoat"

    if theme == "control":
        if contains("display", "screen", "monitor", "window"):
            return "glass"
        if contains("button", "encoder", "fader", "trackball", "knob", "grip", "cable", "cord", "antenna", "socket", "connector", "control-cover", "front-grille", "woofer"):
            return "polymer"
        if contains("handle", "latch", "clip", "fastener", "pin", "arm-rest", "base", "post", "leg"):
            return "hardware"
        return "powderCoat"

    if theme == "casework":
        if contains("wheel", "caster", "pad", "bumper"):
            return "rubber"
        if contains("handle", "corner", "latch", "hinge", "pin", "lock", "clip", "fastener", "bolt"):
            return "hardware"
        if contains("rail", "frame", "post", "skid", "tray", "upright", "crossbar"):
            return "aluminum"
        return "polymer"

    if contains("wheel", "caster", "pad", "grip", "foot"):
        return "rubber"
    if contains("hook", "pin", "eye", "axle", "hinge", "fastener", "cleat", "collar", "lock", "pivot", "stop", "clip"):
        return "hardware"
    if contains("guide", "crosshead", "base-crossbar", "frame", "backplate", "carriage"):
        return "paintedSteel"
    if contains("chain", "rail", "track", "guide", "sheave", "bar", "weight", "crosshead", "rope-slot", "fairlead"):
        return "galvanizedSteel"
    return "paintedSteel"


def decode_js_string(value: str) -> str:
    if value.startswith('"'):
        return json.loads(value)
    return value[1:-1]


def promote(path: Path) -> tuple[dict[str, object], str]:
    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()
    asset_id = path.name.removesuffix(".kcad.ts")
    theme = theme_for(asset_id)
    title = next((m.group(2) for line in lines if (m := TITLE_LINE.match(line))), None)
    description_match = next((m for line in lines if (m := DESCRIPTION_LINE.match(line))), None)
    if title is None or description_match is None:
        raise ValueError(f"{path}: title or description metadata missing")
    if "const color = param('color'" not in source:
        raise ValueError(f"{path}: expected an unpromoted generic color parameter")

    description = decode_js_string(description_match.group("value"))
    base_description = re.sub(
        r"\s*Stylized scene geometry\.\s*Knobs: overall scale and asset color\.?$", "", description
    ).strip()
    if base_description == description:
        raise ValueError(f"{path}: expected original scene description and generic knob summary")
    base_description = DESCRIPTION_OVERRIDES.get(asset_id, base_description)

    parts: dict[str, str] = {}
    output: list[str] = []
    for line in lines:
        match = ASSET_LINE.match(line)
        if match:
            part = match.group("part")
            if asset_id == "touring-road-case" and part in {"wheel-left", "wheel-right"}:
                continue
            if asset_id == "motorized-chain-hoist" and part in {"hook-block", "hook-tip"}:
                continue
            if asset_id in {"rolling-stage-platform", "scenic-wagon"} and part.startswith("caster-"):
                continue
            if part in parts:
                raise ValueError(f"{path}: duplicate part name {part}")
            role = material_for(part, theme)
            parts[part] = role
            shape = match.group("shape")
            if asset_id == "touring-road-case" and part == "case-shell":
                shape = "b(0,0,100,900,650,850)"
            if asset_id == "touring-road-case" and part in {"left-corner", "right-corner"}:
                x = "-440" if part == "left-corner" else "440"
                shape = f"b({x},0,100,55,620,850)"
            output.append(
                f"{match.group('indent')}p.part({match.group('quote')}{part}{match.group('quote')}, "
                f"{shape}.color({role}));"
            )
            continue
        if "const color = param('color'" in line:
            continue
        output.append(line)

    if asset_id == "touring-road-case":
        for side, x in (("left", -430), ("right", 430)):
            for end, y in (("front", -285), ("back", 285)):
                parts[f"caster-plate-{end}-{side}"] = "hardware"
                parts[f"caster-wheel-{end}-{side}"] = "rubber"
                output.extend([
                    f'p.part("caster-plate-{end}-{side}", b({x}, {y}, 65, 120, 80, 45).color(hardware));',
                    f'p.part("caster-wheel-{end}-{side}", cylinder(70, 58, 10).rotateX({90 if end == "front" else -90}).translate({x}, {y + (-15 if end == "front" else 15)}, 58).scale(scale).color(rubber));',
                ])

    if asset_id == "motorized-chain-hoist":
        parts["hook-profile"] = "hardware"
        helper = [
            "const hookProfile = () => path()",
            "  .moveTo(-44, 185).lineTo(44, 185).lineTo(44, 124).lineTo(27, 124)",
            "  .lineTo(23, 82).lineTo(9, 49).lineTo(-13, 27).lineTo(-39, 0)",
            "  .lineTo(-63, 34).lineTo(-76, 58).lineTo(-73, 81).lineTo(-60, 96)",
            "  .lineTo(-45, 85).lineTo(-53, 68).lineTo(-46, 52).lineTo(-31, 43)",
            "  .lineTo(-15, 47).lineTo(-4, 61).lineTo(0, 82).lineTo(0, 124)",
            "  .lineTo(-44, 124).close().extrude(38).rotateX(90).translate(0, 19, 0).scale(scale);",
        ]
        for i, line in enumerate(output):
            if line.startswith('const p = assembly("motorized-chain-hoist")'):
                output[i:i] = ["", *helper, ""]
                break
        output.extend([
            'p.part("hook-profile", hookProfile().color(hardware));',
        ])

    if asset_id == "rolling-stage-platform":
        for side, x in (("left", -600), ("right", 600)):
            for end, y, direction in (("front", -410, 90), ("back", 410, -90)):
                parts[f"caster-fork-{side}-{end}"] = "steel"
                parts[f"caster-wheel-{side}-{end}"] = "rubber"
                output.extend([
                    f'p.part("caster-fork-{side}-{end}", b({x}, {y}, 112, 110, 120, 70).color(steel));',
                    f'p.part("caster-wheel-{side}-{end}", cylinder(50, 58, 10).rotateX({direction}).translate({x}, {y}, 58).scale(scale).color(rubber));',
                ])

    if asset_id == "scenic-wagon":
        for side, x in (("left", -640), ("right", 640)):
            for end, y, direction in (("front", -380, 90), ("back", 380, -90)):
                parts[f"caster-bracket-{side}-{end}"] = "hardware"
                parts[f"caster-wheel-{side}-{end}"] = "rubber"
                output.extend([
                    f'p.part("caster-bracket-{side}-{end}", b({x}, {y}, 120, 110, 100, 110).color(hardware));',
                    f'p.part("caster-wheel-{side}-{end}", cylinder(52, 62, 10).rotateX({direction}).translate({x}, {y}, 62).scale(scale).color(rubber));',
                ])

    for i, line in enumerate(output):
        if line == "return p.model();":
            tail = output[i + 1:]
            late_parts = [candidate for candidate in tail if re.match(r"^\s*p\.part\(", candidate)]
            if late_parts:
                tail = [candidate for candidate in tail if not re.match(r"^\s*p\.part\(", candidate)]
                output = output[:i] + late_parts + [""] + output[i:i + 1] + tail
            break

    for helper in ("b", "c"):
        used = any(
            re.search(rf"\b{helper}\(", line) and not line.lstrip().startswith(f"const {helper} =")
            for line in output
        )
        if not used:
            output = [line for line in output if not line.lstrip().startswith(f"const {helper} =")]

    roles = list(dict.fromkeys(parts.values()))
    if not 2 <= len(roles) <= 4:
        raise ValueError(f"{path}: expected 2–4 used material roles, found {roles}")
    if len(parts) < 6:
        raise ValueError(f"{path}: too few named parts for a readable scene asset ({len(parts)})")

    specs = [MATERIALS[role] for role in roles]
    labels = ", ".join(spec["label"].lower() for spec in specs)
    new_description = (
        f"{base_description} Knobs: overall scale; {labels}; houseShow and touring appearance presets."
    )
    for i, line in enumerate(output):
        match = DESCRIPTION_LINE.match(line)
        if match:
            output[i] = f"{match.group('indent')}description: {json.dumps(new_description)},"
            break
    else:
        raise ValueError(f"{path}: description line disappeared")

    output[1] = f"// {title}: {base_description.rstrip('.')} .".replace(" .", ".")

    declarations = [
        f"const {role} = param('{role}', '{MATERIALS[role]['default']}', {{ label: '{MATERIALS[role]['label']}' }});"
        for role in roles
    ]
    preset_lines = ["presets({", "  houseShow: {"]
    preset_lines.extend(f"    {role}: '{MATERIALS[role]['houseShow']}'," for role in roles)
    preset_lines.extend(["  },", "  touring: {"])
    preset_lines.extend(f"    {role}: '{MATERIALS[role]['touring']}'," for role in roles)
    preset_lines.extend(["  },", "});"])

    for i, line in enumerate(output):
        if "const scale = param(" in line:
            output[i + 1:i + 1] = ["", *declarations, "", *preset_lines, ""]
            break
    else:
        raise ValueError(f"{path}: scale parameter missing")

    promoted_source = "\n".join(output).rstrip() + "\n"
    return ({
        "id": asset_id,
        "theme": theme,
        "materials": roles,
        "namedParts": len(parts),
        "presetNames": ["houseShow", "touring"],
        "geometryEnhancements": {
            "touring-road-case": "raised shell and four exposed low-profile caster wheels on metal mounting plates",
            "motorized-chain-hoist": "extruded J-shaped hook profile below the chain drop",
            "rolling-stage-platform": "four floor-level caster wheels with steel forks below the deck",
            "scenic-wagon": "four exposed caster wheels with supporting brackets connecting them to the deck",
        }.get(asset_id),
    }, promoted_source)


def main() -> None:
    paths = sorted(KIT.glob("*.kcad.ts"))
    if len(paths) != 52:
        raise SystemExit(f"expected the 52 existing theatre-production assets, found {len(paths)}")
    promoted = [promote(path) for path in paths]
    audit = {
        "kit": "theatre-production",
        "assetsPromoted": len(paths),
        "assets": [record for record, _source in promoted],
    }
    for path, (_record, source) in zip(paths, promoted, strict=True):
        path.write_text(source, encoding="utf-8")
    BUNDLE.mkdir(parents=True, exist_ok=True)
    (BUNDLE / "promotion-audit.json").write_text(f"{json.dumps(audit, indent=2)}\n", encoding="utf-8")
    print(json.dumps({"kit": audit["kit"], "assetsPromoted": len(paths), "audit": str(BUNDLE / "promotion-audit.json")}, indent=2))


if __name__ == "__main__":
    main()
