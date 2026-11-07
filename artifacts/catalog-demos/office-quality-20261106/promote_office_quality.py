#!/usr/bin/env python3
"""Promote the 40 existing office models to material-named color controls."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/office"
OUT = Path(__file__).resolve().parent

# (parameter, UI label, default, professional preset, classroom preset)
MATERIALS = {
    "archive-box": [
        ("paperboard", "Paperboard", "#b8945b", "#b8945b", "#6d9a72"),
        ("coverStock", "Cover stock", "#e7ddc7", "#e7ddc7", "#ef9852"),
        ("ink", "Label ink", "#427895", "#427895", "#4e5caa"),
    ],
    "business-card-holder": [
        ("anodizedAluminum", "Anodized aluminum", "#a6afb2", "#a6afb2", "#446c8c"),
        ("cardStock", "Card stock", "#f1ece1", "#f1ece1", "#f4c66b"),
        ("rubber", "Rubber feet", "#343c40", "#343c40", "#c6564d"),
    ],
    "calculator": [
        ("polymer", "Case polymer", "#3c454b", "#3c454b", "#e17448"),
        ("lcdGlass", "LCD glass", "#7d9e80", "#7d9e80", "#8ba8d0"),
        ("keycapPlastic", "Keycap plastic", "#cdd0c6", "#cdd0c6", "#f0cf56"),
    ],
    "clipboard": [
        ("polypropylene", "Polypropylene", "#476b7e", "#476b7e", "#e06b4f"),
        ("paper", "Paper", "#f2efe6", "#f2efe6", "#f1df8e"),
        ("stainlessSteel", "Stainless steel", "#b5bdc1", "#b5bdc1", "#577189"),
    ],
    "desk-calendar": [
        ("paper", "Calendar paper", "#f0eee5", "#f0eee5", "#f4df83"),
        ("chipboard", "Chipboard stand", "#416f89", "#416f89", "#d96b4e"),
        ("steelWire", "Steel wire", "#bbc0c2", "#bbc0c2", "#637b8b"),
    ],
    "desk-organizer": [
        ("timber", "Timber", "#ad8155", "#ad8155", "#426f75"),
        ("stainlessSteel", "Stainless steel", "#bfc3c4", "#bfc3c4", "#d1a340"),
        ("labelPaper", "Label paper", "#eae4d3", "#eae4d3", "#d96f4e"),
    ],
    "dry-erase-board": [
        ("enamelSteel", "Enamel steel", "#f3f3eb", "#f3f3eb", "#f2e88a"),
        ("aluminum", "Aluminum frame", "#9da8ab", "#9da8ab", "#456d88"),
        ("polymer", "Marker polymer", "#497083", "#497083", "#d7584a"),
    ],
    "envelope-stack": [
        ("kraftPaper", "Kraft paper", "#c8a96d", "#c8a96d", "#75a06d"),
        ("paper", "Envelope paper", "#f2eee4", "#f2eee4", "#f0df91"),
        ("ink", "Printed ink", "#4b6681", "#4b6681", "#b54f47"),
    ],
    "file-folder": [
        ("manilaCard", "Manila card", "#c8a85a", "#c8a85a", "#709c70"),
        ("paper", "Paper", "#eee9db", "#eee9db", "#f0df8c"),
        ("steelWire", "Steel wire", "#aab1b3", "#aab1b3", "#526f8a"),
    ],
    "footrest": [
        ("polymer", "Platform polymer", "#3c484d", "#3c484d", "#557a8a"),
        ("rubber", "Grip rubber", "#7c898b", "#7c898b", "#df674d"),
        ("foam", "Cushion foam", "#d0cab9", "#d0cab9", "#e2be6a"),
    ],
    "fountain-pen": [
        ("resin", "Barrel resin", "#254f74", "#254f74", "#9b513f"),
        ("stainlessSteel", "Stainless steel", "#b7c1c4", "#b7c1c4", "#d3a84d"),
        ("ink", "Ink", "#254777", "#254777", "#3d6389"),
    ],
    "hanging-file-folder": [
        ("fileCard", "File card", "#88a76a", "#88a76a", "#e0a04d"),
        ("steel", "Hanging rail steel", "#aeb8bb", "#aeb8bb", "#506c83"),
        ("paper", "Folder paper", "#f0e8d7", "#f0e8d7", "#ece076"),
    ],
    "highlighter": [
        ("polymer", "Barrel polymer", "#eac633", "#eac633", "#57a16a"),
        ("fluorescentInk", "Fluorescent ink", "#f4ed48", "#f4ed48", "#ff8d49"),
        ("felt", "Felt tip", "#c84747", "#c84747", "#3c6da3"),
    ],
    "hole-punch": [
        ("powderCoatedSteel", "Powder-coated steel", "#425e76", "#425e76", "#df664b"),
        ("stainlessSteel", "Stainless steel", "#b6bdc0", "#b6bdc0", "#d5a94b"),
        ("polymer", "Handle polymer", "#d05b47", "#d05b47", "#527f91"),
    ],
    "ink-pad": [
        ("polymer", "Case polymer", "#475a69", "#475a69", "#d7664a"),
        ("felt", "Ink felt", "#394a55", "#394a55", "#576b9a"),
        ("ink", "Stamp ink", "#385f86", "#385f86", "#a44946"),
    ],
    "label-maker": [
        ("polymer", "Case polymer", "#d86045", "#d86045", "#4b718d"),
        ("lcdGlass", "LCD glass", "#88a899", "#88a899", "#b7cbe0"),
        ("rubber", "Grip rubber", "#363c40", "#363c40", "#e1bd50"),
    ],
    "laminator": [
        ("polymer", "Housing polymer", "#48525b", "#48525b", "#557f91"),
        ("aluminum", "Feed tray aluminum", "#a5adb0", "#a5adb0", "#d8a84f"),
        ("rubber", "Roller rubber", "#31373c", "#31373c", "#cc5e49"),
    ],
    "laptop-stand": [
        ("anodizedAluminum", "Anodized aluminum", "#a8afb2", "#a8afb2", "#4a7892"),
        ("silicone", "Silicone pads", "#353c41", "#353c41", "#d35d48"),
        ("stainlessSteel", "Stainless steel", "#8b9498", "#8b9498", "#d3a546"),
    ],
    "letter-sorter": [
        ("timber", "Timber", "#aa7d4f", "#aa7d4f", "#4b7784"),
        ("paper", "Letter paper", "#f0e6d1", "#f0e6d1", "#e4cf72"),
        ("powderCoatedSteel", "Powder-coated steel", "#3f5967", "#3f5967", "#d3664c"),
    ],
    "letter-tray": [
        ("polymer", "Tray polymer", "#405969", "#405969", "#d6674a"),
        ("rubber", "Grip rubber", "#303c44", "#303c44", "#78904f"),
        ("stainlessSteel", "Stainless steel", "#b5b8b6", "#b5b8b6", "#d0a448"),
    ],
    "marker": [
        ("polymer", "Barrel polymer", "#5b83a5", "#5b83a5", "#db634a"),
        ("ink", "Marker ink", "#276395", "#276395", "#c94e42"),
        ("felt", "Felt tip", "#c3463d", "#c3463d", "#4c8d63"),
    ],
    "mechanical-pencil": [
        ("aluminum", "Barrel aluminum", "#9aa6aa", "#9aa6aa", "#4a7892"),
        ("polymer", "Grip polymer", "#d85e4d", "#d85e4d", "#607e54"),
        ("graphite", "Graphite lead", "#393c3e", "#393c3e", "#d4ae4c"),
    ],
    "memo-pad": [
        ("paper", "Memo paper", "#f3eee1", "#f3eee1", "#f0df7a"),
        ("chipboard", "Chipboard backing", "#b78a52", "#b78a52", "#49798a"),
        ("ink", "Printed ink", "#3e627e", "#3e627e", "#cb5a47"),
    ],
    "monitor-riser": [
        ("timber", "Timber shelf", "#ae8153", "#ae8153", "#537582"),
        ("steel", "Support steel", "#3d484e", "#3d484e", "#d36549"),
        ("rubber", "Edge rubber", "#ddd2bb", "#ddd2bb", "#d4ad48"),
    ],
    "mousepad": [
        ("fabric", "Woven fabric", "#4d6687", "#4d6687", "#d2604b"),
        ("rubber", "Non-slip rubber", "#2f3438", "#2f3438", "#678454"),
        ("foam", "Cushion foam", "#b5aa93", "#b5aa93", "#e0bf65"),
    ],
    "notebook": [
        ("paper", "Page paper", "#eee9db", "#eee9db", "#f0df88"),
        ("leatherette", "Cover leatherette", "#385971", "#385971", "#a75145"),
        ("ink", "Printed ink", "#3d444b", "#3d444b", "#476d9a"),
    ],
    "office-pinboard": [
        ("cork", "Cork panel", "#b58b58", "#b58b58", "#7b9c6a"),
        ("timber", "Timber frame", "#765536", "#765536", "#426f83"),
        ("steel", "Pin steel", "#5e7c8a", "#5e7c8a", "#cf5c47"),
    ],
    "paper-clip-dish": [
        ("polymer", "Dish polymer", "#527689", "#527689", "#d35e4b"),
        ("stainlessSteel", "Stainless steel", "#b1b8bb", "#b1b8bb", "#527c8e"),
        ("brass", "Brass clips", "#c79b3e", "#c79b3e", "#d7b65a"),
    ],
    "paper-cutter": [
        ("powderCoatedSteel", "Powder-coated steel", "#59727d", "#59727d", "#d6634a"),
        ("stainlessSteel", "Stainless steel blade", "#aeb7ba", "#aeb7ba", "#d0a84d"),
        ("polymer", "Handle polymer", "#30383d", "#30383d", "#4e8092"),
    ],
    "paper-shredder": [
        ("polymer", "Housing polymer", "#b9c4c4", "#b9c4c4", "#4e758c"),
        ("steel", "Cutter steel", "#464b4d", "#464b4d", "#d25e49"),
        ("glass", "Bin window glass", "#73948b", "#73948b", "#d4b24d"),
    ],
    "paperweight": [
        ("glass", "Glass body", "#5d8791", "#5d8791", "#d16a52"),
        ("brass", "Brass foot", "#c29e54", "#c29e54", "#d1ac4b"),
        ("ceramic", "Ceramic inset", "#454d53", "#454d53", "#547d90"),
    ],
    "pencil-cup": [
        ("ceramic", "Ceramic cup", "#546f82", "#546f82", "#d3634d"),
        ("wood", "Pencil wood", "#b69263", "#b69263", "#d6ad4d"),
        ("graphite", "Graphite", "#484e50", "#484e50", "#587f56"),
    ],
    "ring-binder": [
        ("polypropylene", "Cover polypropylene", "#4a6c8a", "#4a6c8a", "#d6644c"),
        ("paper", "Paper", "#eee9db", "#eee9db", "#f0de83"),
        ("steel", "Ring steel", "#b0b6b8", "#b0b6b8", "#d0a449"),
    ],
    "rubber-stamp": [
        ("timber", "Handle timber", "#9a7247", "#9a7247", "#4f7890"),
        ("rubber", "Stamp rubber", "#3d464b", "#3d464b", "#cc5d48"),
        ("brass", "Cap brass", "#c39b46", "#c39b46", "#d5ad4e"),
    ],
    "ruler": [
        ("acrylic", "Ruler acrylic", "#d4ccad", "#d4ccad", "#6e9a79"),
        ("ink", "Scale ink", "#3d586b", "#3d586b", "#c45043"),
        ("aluminum", "End aluminum", "#b7bec0", "#b7bec0", "#d2a649"),
    ],
    "scissors": [
        ("stainlessSteel", "Stainless steel", "#aeb7ba", "#aeb7ba", "#c0c6c8"),
        ("polymer", "Handle polymer", "#c95045", "#c95045", "#4f7992"),
        ("brass", "Pivot brass", "#c19a4b", "#c19a4b", "#d2a548"),
    ],
    "stapler": [
        ("powderCoatedSteel", "Powder-coated steel", "#506a7d", "#506a7d", "#d1644b"),
        ("stainlessSteel", "Stainless steel", "#bdc1c1", "#bdc1c1", "#547e8f"),
        ("rubber", "Grip rubber", "#33383a", "#33383a", "#d3aa4a"),
    ],
    "sticky-notes": [
        ("paper", "Sticky-note paper", "#e2e559", "#e2e559", "#e9a94f"),
        ("adhesive", "Adhesive strip", "#e9dfc1", "#e9dfc1", "#92a56a"),
        ("ink", "Printed ink", "#475a6a", "#475a6a", "#4e7191"),
    ],
    "tape-dispenser": [
        ("polymer", "Dispenser polymer", "#496b80", "#496b80", "#d36249"),
        ("stainlessSteel", "Cutter stainless steel", "#acb4b8", "#acb4b8", "#d2a94c"),
        ("rubber", "Roller rubber", "#343a3c", "#343a3c", "#688751"),
    ],
    "wrist-rest": [
        ("fabric", "Cover fabric", "#3d617a", "#3d617a", "#d2614a"),
        ("foam", "Cushion foam", "#bbab90", "#bbab90", "#d9b75b"),
        ("rubber", "Non-slip rubber", "#31393e", "#31393e", "#66834f"),
    ],
}


def replace_param(source: str, old: str, new: str, label: str, default: str) -> str:
    pattern = re.compile(
        rf"const {old} = param\(['\"]{old}['\"], ['\"]#[0-9a-fA-F]{{6}}['\"], "
        rf"\{{ label: ['\"][^'\"]+['\"] \}}\);"
    )
    replacement = (
        f"const {new} = param('{new}', '{default}', "
        f"{{ label: '{label}' }});"
    )
    source, count = pattern.subn(replacement, source)
    if count != 1:
        raise ValueError(f"expected one color parameter {old}, found {count}")
    return source


def promote_helper(source: str, materials: list[tuple[str, str, str, str, str]]) -> str:
    names = [material[0] for material in materials]
    pattern = re.compile(
        r"(?P<head>const add\w+ = \((?P<args>[^)]*colour: typeof \w+[^)]*)\) => \{\n)"
        r"(?P<indent>\s*)office\.part\(name, (?P<shape>.*?)\.color\(colour\)\);\n"
        r"(?P<tail>\s*\};)",
        re.DOTALL,
    )

    def convert(match: re.Match[str]) -> str:
        args = match.group("args")
        args = re.sub(
            r"colour: typeof \w+",
            "colour: " + " | ".join(f"typeof {name}" for name in names),
            args,
        )
        indent = match.group("indent")
        shape = match.group("shape")
        dispatch = [f"{indent}const partShape = {shape};"]
        for index, name in enumerate(names):
            keyword = "if" if index == 0 else "else if" if index < len(names) - 1 else "else"
            condition = f" (colour === {name})" if keyword != "else" else ""
            dispatch.append(
                f"{indent}{keyword}{condition} office.part(name, partShape.color({name}));"
            )
        return (
            f"const {match.group(0).split('const ', 1)[1].split(' = ', 1)[0]} = ({args}) => {{\n"
            + "\n".join(dispatch)
            + f"\n{match.group('tail')}"
        )

    source, count = pattern.subn(convert, source)
    if count == 0:
        raise ValueError("no color-aware office part helper found")
    return source


def update_asset(asset_id: str, materials: list[tuple[str, str, str, str, str]]) -> dict:
    path = KIT / f"{asset_id}.kcad.ts"
    before = path.read_text(encoding="utf-8")
    title = re.search(r"title: ['\"]([^'\"]+)['\"]", before)
    description = re.search(r"description: ['\"]([^'\"]+)['\"]", before)
    if not title or not description:
        raise ValueError(f"missing title or description in {path}")
    summary = description.group(1).split(". Knobs:", 1)[0].rstrip(".")

    source = before
    # Rename all current color-control identifiers, preset keys and uses.
    original_names = ["body", "accent", "detail"]
    for old, material in zip(original_names, materials, strict=True):
        source = re.sub(rf"\b{old}\b", material[0], source)
    # Restore a customer-facing description with explicit material controls.
    controls = ", ".join(material[1].lower() for material in materials)
    new_description = f"{summary}. Controls: {controls}."
    source = re.sub(
        r"description: ['\"][^'\"]+['\"]",
        "description: " + json.dumps(new_description),
        source,
        count=1,
    )

    for old, material in zip([item[0] for item in materials], materials, strict=True):
        source = replace_param(source, old, old, material[1], material[2])

    preset_entries = []
    for key, value_index in (("professional", 3), ("classroom", 4)):
        field_entries = ", ".join(
            f"{material[0]}: '{material[value_index]}'" for material in materials
        )
        preset_entries.append(f"  {key}: {{ {field_entries} }},")
    new_presets = "presets({\n" + "\n".join(preset_entries) + "\n});"
    source, count = re.subn(
        r"presets\(\{.*?\}\);", new_presets, source, count=1, flags=re.DOTALL
    )
    if count != 1:
        raise ValueError(f"expected one preset block in {path}")

    source = promote_helper(source, materials)
    source = f"// {title.group(1)}: {summary}. Material controls: {controls}.\n\n" + source

    if asset_id == "scissors":
        source, left = re.subn(
            r"addBox\('blade-left'.*?\naddBox\('blade-right'.*?\n",
            "const blade = (name: string, outline: [number, number][], z: number) =>\n"
            "  office.part(name, extrudePolygon(outline, 3).translate(0, 0, z).color(stainlessSteel));\n"
            "blade('blade-left', [[-70, -4], [18, -4], [24, 0], [18, 4], [-70, 4]], 0);\n"
            "blade('blade-right', [[70, -4], [-18, -4], [-24, 0], [-18, 4], [70, 4]], 3);\n",
            source,
            count=1,
            flags=re.DOTALL,
        )
        if left != 1:
            raise ValueError("could not replace the crossed scissor blade boxes")

    path.write_text(source, encoding="utf-8")
    return {
        "id": asset_id,
        "sourceSha256Before": __import__("hashlib").sha256(before.encode()).hexdigest(),
        "sourceSha256After": __import__("hashlib").sha256(source.encode()).hexdigest(),
        "materials": [
            {"param": name, "label": label, "default": default}
            for name, label, default, _professional, _classroom in materials
        ],
        "presets": ["professional", "classroom"],
        "partCount": len(re.findall(r"\badd(?:Box|Cylinder)\(['\"]", source)),
        "changed": before != source,
    }


def main() -> None:
    expected = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
    if sorted(MATERIALS) != expected:
        missing = sorted(set(expected) - set(MATERIALS))
        extra = sorted(set(MATERIALS) - set(expected))
        raise SystemExit(f"office mapping mismatch; unmapped={missing}, extra={extra}")
    report = [update_asset(asset_id, MATERIALS[asset_id]) for asset_id in expected]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "material-map.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"Promoted {len(report)} existing office assets; added no IDs.")


if __name__ == "__main__":
    main()
