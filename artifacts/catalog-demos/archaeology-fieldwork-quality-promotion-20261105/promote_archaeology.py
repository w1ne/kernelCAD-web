#!/usr/bin/env python3
"""Promote archaeology fieldwork assets with per-material palette controls."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/archaeology-fieldwork"

# label, default, field-ready, weathered
MATERIALS = {
    "timberColor": ("Timber", "#8b6848", "#a27850", "#705a45"),
    "stainlessSteelColor": ("Stainless steel", "#aab4b6", "#c7cdcf", "#7a8588"),
    "paintedSteelColor": ("Painted steel", "#607b83", "#e5a536", "#56686c"),
    "paintedPolymerColor": ("Painted polymer", "#d39b35", "#edb83f", "#ad7c2d"),
    "aluminumColor": ("Aluminum", "#9eafb7", "#c3ccd0", "#788990"),
    "polymerColor": ("Molded polymer", "#d2d8ce", "#e6e9df", "#8d9890"),
    "rubberColor": ("Rubber", "#343a3b", "#454c4d", "#292f30"),
    "glassColor": ("Glass", "#63949c", "#94bdc3", "#5d7b7f"),
    "fabricColor": ("Flag fabric", "#dc6842", "#f39b35", "#a9573d"),
    "canvasColor": ("Canvas", "#a99675", "#c0ad88", "#80745d"),
    "paperColor": ("Paper", "#d8cba9", "#eee6d1", "#a99c7e"),
    "fiberColor": ("Brush fiber", "#cfb986", "#e2d09d", "#a18a61"),
    "ropeColor": ("Survey cord", "#c8ad6e", "#e5cf8d", "#907746"),
    "brassColor": ("Brass", "#b18b50", "#c6a364", "#846a3e"),
    "leatherColor": ("Leather", "#805b3c", "#9b7049", "#664932"),
}

# Each asset's unlisted components retain the primary material. Extras use
# names grounded in the source's part structure, not display-only parameters.
CONFIG = {
    "archaeologist-trowel": ("timberColor", {"stainlessSteelColor": [r"ferrule", r"blade"]}),
    "artifact-bag": ("canvasColor", {"paperColor": [r"label"]}),
    "boundary-flag": ("stainlessSteelColor", {"fabricColor": [r"flag-cloth"]}),
    "context-clipboard": ("timberColor", {"paperColor": [r"paper"], "stainlessSteelColor": [r"clip"], "brassColor": [r"pencil"]}),
    "detail-paintbrush": ("timberColor", {"stainlessSteelColor": [r"ferrule"], "fiberColor": [r"bristle"]}),
    "detail-scoop": ("timberColor", {"stainlessSteelColor": [r"neck|scoop-pan|cheek"]}),
    "dustpan-and-brush": ("polymerColor", {"timberColor": [r"brush-handle"], "fiberColor": [r"brush-head"]}),
    "excavation-camera-tripod": ("stainlessSteelColor", {"polymerColor": [r"pan-head|camera-plate"]}),
    "excavation-grid": ("ropeColor", {"stainlessSteelColor": [r"corner-pin"]}),
    "excavation-pick": ("timberColor", {"stainlessSteelColor": [r"head|point|adze"]}),
    "field-loupe": ("polymerColor", {"stainlessSteelColor": [r"lens-frame|stem"], "glassColor": [r"lens$"]}),
    "field-notebook": ("leatherColor", {"paperColor": [r"page-block"], "rubberColor": [r"elastic-band"]}),
    "finds-tray": ("polymerColor", {"stainlessSteelColor": [r"center-"]}),
    "fine-mesh-sieve": ("stainlessSteelColor", {"polymerColor": [r"handle"]}),
    "flotation-tank": ("polymerColor", {"stainlessSteelColor": [r"stand-leg|outlet-valve"], "rubberColor": [r"outlet$"]}),
    "folding-rule": ("timberColor", {"brassColor": [r"hinge"]}),
    "grade-rod": ("aluminumColor", {"paintedSteelColor": [r"graduation-band"], "polymerColor": [r"shoe|top-grip"]}),
    "hand-auger": ("stainlessSteelColor", {"timberColor": [r"t-handle"]}),
    "hand-broom": ("timberColor", {"fiberColor": [r"bristle"]}),
    "line-level": ("aluminumColor", {"glassColor": [r"vial-window"], "stainlessSteelColor": [r"end-hook"]}),
    "margin-trowel": ("timberColor", {"stainlessSteelColor": [r"neck|blade|shoulder"]}),
    "masonry-chisel": ("stainlessSteelColor", {"rubberColor": [r"hand-guard"]}),
    "mattock": ("timberColor", {"stainlessSteelColor": [r"head|blade|tip"]}),
    "nested-sieves": ("stainlessSteelColor", {"aluminumColor": [r"center-post"]}),
    "north-arrow-marker": ("polymerColor", {"stainlessSteelColor": [r"pivot"], "paintedSteelColor": [r"north-point|south-point|east-point|west-point"]}),
    "photo-board": ("timberColor", {"paperColor": [r"board-face"], "stainlessSteelColor": [r"clip"]}),
    "photo-north-arrow": ("polymerColor", {"paintedSteelColor": [r"arrowhead|tail"]}),
    "photo-scale-bar": ("polymerColor", {"paintedSteelColor": [r"marker"]}),
    "plumb-bob": ("stainlessSteelColor", {"brassColor": [r"lower-weight|top-eye"], "ropeColor": [r"line$"]}),
    "pointing-trowel": ("timberColor", {"stainlessSteelColor": [r"tang|blade|point"]}),
    "round-point-shovel": ("timberColor", {"stainlessSteelColor": [r"blade|shoulder"], "rubberColor": [r"d-grip"]}),
    "sample-scoop": ("timberColor", {"stainlessSteelColor": [r"bowl|rim|neck"]}),
    "sample-tag-set": ("paperColor", {"brassColor": [r"tie-eye"], "ropeColor": [r"tie-"]}),
    "sample-wash-tray": ("polymerColor", {"stainlessSteelColor": [r"drain"]}),
    "sediment-bucket": ("polymerColor", {"stainlessSteelColor": [r"bucket-rim|base-band|handle-"]}),
    "shaker-screen": ("timberColor", {"stainlessSteelColor": [r"mesh-bar"]}),
    "site-camera": ("polymerColor", {"glassColor": [r"lens"], "rubberColor": [r"grip"]}),
    "soft-finds-brush": ("timberColor", {"fiberColor": [r"bristle-bundle"]}),
    "soil-core-sampler": ("stainlessSteelColor", {"rubberColor": [r"top-cap"], "paintedSteelColor": [r"depth-window"]}),
    "soil-knife": ("timberColor", {"stainlessSteelColor": [r"lanyard-eye|blade"]}),
    "sorting-pan": ("polymerColor", {"stainlessSteelColor": [r"divider"]}),
    "specimen-jar-rack": ("aluminumColor", {"glassColor": [r"jar-"], "polymerColor": [r"rack-base|jar-cap"]}),
    "square-point-shovel": ("timberColor", {"stainlessSteelColor": [r"blade"], "rubberColor": [r"cross-grip"]}),
    "survey-compass": ("polymerColor", {"glassColor": [r"bezel"], "brassColor": [r"needle|pivot"]}),
    "survey-stake": ("timberColor", {"paintedSteelColor": [r"stake-head|head-tab"]}),
    "tape-measure": ("polymerColor", {"stainlessSteelColor": [r"tape-blade|hook"], "rubberColor": [r"side-hub|lock-button"]}),
    "total-station": ("paintedPolymerColor", {"aluminumColor": [r"tripod-leg|head-column|display-bezel"], "glassColor": [r"lens|display-screen"], "rubberColor": [r"adjustment-knob"]}),
    "trenching-spade": ("timberColor", {"stainlessSteelColor": [r"blade"]}),
    "water-screen-frame": ("timberColor", {"stainlessSteelColor": [r"mesh-bar"], "polymerColor": [r"drain-tray"]}),
    "wire-cleaning-brush": ("timberColor", {"stainlessSteelColor": [r"hanging-eye"], "brassColor": [r"wire-row"]}),
}


def parse_part_name(line: str) -> str | None:
    marker = ".part("
    start = line.find(marker)
    if start < 0:
        return None
    index = start + len(marker)
    while index < len(line) and line[index].isspace():
        index += 1
    if index >= len(line) or line[index] not in ("'", '"', chr(96)):
        return None
    quote = line[index]
    end = line.find(quote, index + 1)
    return None if end < 0 else line[index + 1:end]


def material_name(role: str) -> str:
    return role.removesuffix("Color")


def rewrite_part_line(line: str, primary: str, extras: dict[str, list[str]], seen: set[str]) -> str:
    name = parse_part_name(line)
    if name is None:
        return line
    role = primary
    for material, patterns in extras.items():
        if any(re.search(pattern, name) for pattern in patterns):
            role = material
            break
    seen.add(role)
    line = line.replace(".color(color)", "")
    close = line.rfind(");")
    if close < 0:
        raise ValueError(f"cannot locate .part() closing on line: {line}")
    return line[:close].rstrip() + f".color({material_name(role)})" + line[close:]


def add_recognition_geometry(source: str, asset_id: str) -> str:
    if asset_id == "field-loupe":
        anchor = 'p.part("lens-frame", ring(150, 0, 38, 22, 88, 16, 12, "z"));'
        lens = 'p.part("lens", cylinder(4, 64, 12).translate(0, 0, -2).translate(150, 0, 28).scale(scale));'
        if anchor not in source:
            raise ValueError("field-loupe: expected lens-frame line not found")
        return source.replace(anchor, anchor + "\n" + lens, 1)
    if asset_id == "total-station":
        anchor = 'p.part("telescope", hx(0, -115, 745, 260, 36, 10));'
        extra_parts = (
            '\np.part("objective-lens", hx(-132, -115, 745, 18, 27, 10));'
            '\np.part("display-bezel", b(70, 0, 870, 92, 64, 16, 0, 0, 0));'
            '\np.part("display-screen", b(70, 0, 883, 70, 44, 6, 0, 0, 0));'
        )
        if anchor not in source:
            raise ValueError("total-station: expected telescope line not found")
        return source.replace(anchor, anchor + extra_parts, 1)
    return source


def promote(path: Path) -> None:
    asset_id = path.name.removesuffix(".kcad.ts")
    primary, extras = CONFIG[asset_id]
    roles = [primary, *extras.keys()]
    if not 2 <= len(roles) <= 4:
        raise ValueError(f"{asset_id}: expected 2-4 material controls, got {roles}")
    source = path.read_text()
    if "const color = param(" not in source and "fieldReady:" in source:
        return
    title_match = re.search(r'title:\s*"([^"]+)"', source)
    description_match = re.search(r'description:\s*"([^"]+)"', source)
    if not title_match or not description_match:
        raise ValueError(f"{asset_id}: title/description missing")
    title = title_match.group(1)
    old_description = description_match.group(1)
    base_description = old_description.split(" Knobs:")[0].rstrip(".")
    if asset_id == "total-station":
        base_description = (
            "Tripod-mounted survey instrument with a telescope, visible field display, "
            "objective lens and three-leg support"
        )
    labels = [MATERIALS[role][0].lower() for role in roles]
    new_description = (
        f"{base_description}. Material controls: {', '.join(labels)}. "
        "Appearance presets: field ready and weathered."
    )
    source = source.replace(old_description, new_description, 1)
    source = re.sub(
        r"(?m)^const color = param\(['\"]color['\"],.*\);\n",
        "",
        source,
    )
    source = source.replace(".color(color)", "")
    source = add_recognition_geometry(source, asset_id)

    declarations = []
    field_values = []
    weathered_values = []
    for role in roles:
        label, default, field_ready, weathered = MATERIALS[role]
        variable = material_name(role)
        declarations.append(
            f"const {variable} = param('{variable}', '{default}', {{ label: '{label}' }});"
        )
        field_values.append(f"{variable}: '{field_ready}'")
        weathered_values.append(f"{variable}: '{weathered}'")
    palette = (
        "\n".join(declarations)
        + "\npresets({\n"
        + "  fieldReady: { " + ", ".join(field_values) + " },\n"
        + "  weathered: { " + ", ".join(weathered_values) + " },\n"
        + "});"
    )
    scale_line = re.search(r"(?m)^const scale = .+;\n", source)
    if not scale_line:
        raise ValueError(f"{asset_id}: scale parameter missing")
    source = source[:scale_line.end()] + palette + "\n" + source[scale_line.end():]

    seen: set[str] = set()
    lines = source.splitlines()
    source = "\n".join(rewrite_part_line(line, primary, extras, seen) for line in lines) + "\n"
    missing = set(roles) - seen
    if missing:
        raise ValueError(f"{asset_id}: controls do not color any part: {sorted(missing)}")

    material_names = ", ".join(labels)
    source = source.replace(
        "// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.",
        f"// {title}: {base_description}. Low-poly field visualization geometry in millimetres, Z-up; visible zones use {material_names}.",
    )
    source = re.sub(
        r"(?m)^  description:.*$",
        "  description: " + json.dumps(new_description, ensure_ascii=False) + ",",
        source,
    )

    if asset_id == "archaeologist-trowel":
        old_blade = 'p.part("blade", b(18, 0, 3, 245, 180, 18, 0, 0, 0).color(stainlessSteel));'
        new_blade = (
            'p.part("blade", path().moveTo(-58, -26).lineTo(-30, -76).'
            'lineTo(125, -76).lineTo(274, 0).lineTo(125, 76).'
            'lineTo(-30, 76).lineTo(-58, 26).close().extrude(18).'
            'translate(0, 0, 3).scale(scale).color(stainlessSteel));'
        )
        if old_blade not in source:
            raise ValueError("archaeologist-trowel: expected blade line not found")
        source = source.replace(old_blade, new_blade, 1)
        source, removed_helpers = re.subn(r"(?ms)^const b = .*?^};\n", "", source, count=1)
        if removed_helpers != 1:
            raise ValueError("archaeologist-trowel: expected unused box helper not found")
        source = re.sub(r'(?m)^p\.part\("blade-tip",.*\n', "", source)

    path.write_text(source)


def main() -> None:
    paths = sorted(KIT.glob("*.kcad.ts"))
    actual = {path.name.removesuffix(".kcad.ts") for path in paths}
    expected = set(CONFIG)
    if actual != expected:
        raise SystemExit(f"kit/config mismatch: missing={sorted(expected - actual)}, extra={sorted(actual - expected)}")
    for path in paths:
        promote(path)
    print(f"Promoted {len(paths)} existing archaeology-fieldwork assets in place.")


if __name__ == "__main__":
    main()
