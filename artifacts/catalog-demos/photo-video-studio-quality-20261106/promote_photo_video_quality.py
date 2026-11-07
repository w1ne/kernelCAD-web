#!/usr/bin/env python3
"""Split photo/video studio props into material zones and named looks."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/photo-video-studio"
BUNDLE = Path(__file__).resolve().parent

MATERIALS = {
    "polymer": {
        "label": "Polymer",
        "studioBlack": "#343c43",
        "fieldRental": "#c75a2e",
    },
    "rubber": {
        "label": "Rubber",
        "studioBlack": "#1b2024",
        "fieldRental": "#292b2d",
    },
    "metal": {
        "label": "Metal",
        "studioBlack": "#a9b5ba",
        "fieldRental": "#657780",
    },
    "glass": {
        "label": "Optical glass",
        "studioBlack": "#45a6c0",
        "fieldRental": "#79d4e3",
    },
    "fabric": {
        "label": "Studio fabric",
        "studioBlack": "#e5ddce",
        "fieldRental": "#d6b365",
    },
    "diffusionFabric": {
        "label": "Diffuser fabric",
        "studioBlack": "#fff7e8",
        "fieldRental": "#fff0c8",
    },
    "polycarbonate": {
        "label": "Diffuser polycarbonate",
        "studioBlack": "#d7e4e3",
        "fieldRental": "#f0c75a",
    },
    "reflectiveFilm": {
        "label": "Reflective film",
        "studioBlack": "#d0d7d7",
        "fieldRental": "#d3a64b",
    },
    "mattePaint": {
        "label": "Matte paint",
        "studioBlack": "#333a3e",
        "fieldRental": "#e9e4d7",
    },
    "wood": {
        "label": "Wood",
        "studioBlack": "#9a714d",
        "fieldRental": "#c79a58",
    },
    "foam": {
        "label": "Foam",
        "studioBlack": "#514844",
        "fieldRental": "#596c53",
    },
}

CAMERA_IDS = {
    "action-camera",
    "camcorder",
    "cinema-camera",
    "digital-slr-camera",
    "disposable-camera",
    "film-rangefinder-camera",
    "gimbal-stabilizer",
    "instant-camera",
    "mirrorless-camera",
    "pocket-digital-camera",
    "webcam",
}
LENS_IDS = {
    "macro-lens",
    "pancake-lens",
    "portrait-lens",
    "telephoto-lens",
    "wide-angle-lens",
    "zoom-lens",
}
SUPPORT_IDS = {
    "c-stand",
    "camera-cage",
    "camera-slider",
    "camera-tripod",
    "follow-focus-unit",
    "light-stand",
    "monopod",
    "shoulder-rig",
    "video-tripod",
}
LIGHTING_IDS = {
    "beauty-dish-light",
    "lantern-softbox",
    "led-panel-light",
    "ring-light",
    "softbox-light",
    "speedlight-flash",
    "umbrella-reflector",
}


def includes(name: str, *terms: str) -> bool:
    return any(term in name for term in terms)


def material_for(asset_id: str, part: str) -> str:
    name = part.lower()

    if asset_id == "camera-backpack":
        if name == "grab-handle":
            return "rubber"
        if name in {"front-flap", "side-pocket-left", "side-pocket-right"}:
            return "polymer"
        return "fabric"

    if asset_id == "backdrop-frame":
        if name == "backdrop-panel":
            return "fabric"
        if includes(name, "foot"):
            return "rubber"
        if includes(name, "lock"):
            return "polymer"
        return "metal"

    if asset_id == "camera-roller-case":
        if includes(name, "wheel"):
            return "rubber"
        if includes(name, "latch", "post"):
            return "metal"
        return "polymer"

    if asset_id == "lens-filter-set":
        if includes(name, "filter-") and not includes(name, "rim"):
            return "glass"
        if includes(name, "rim"):
            return "metal"
        return "polymer"

    if asset_id == "lens-hood":
        return "metal" if includes(name, "bayonet", "ring") else "polymer"

    if asset_id == "reflector-board":
        return "reflectiveFilm" if includes(name, "panel") else "metal"

    if asset_id == "clapperboard":
        if name == "face":
            return "mattePaint"
        if includes(name, "hinge"):
            return "metal"
        if name == "top-stick":
            return "wood"
        return "polymer"

    if asset_id in CAMERA_IDS:
        if includes(name, "screen", "window", "viewfinder", "lens-face", "front-glass") or name == "flash":
            return "glass"
        if name == "lens":
            return "glass"
        if (asset_id == "camcorder" and name == "strap") or (asset_id == "pocket-digital-camera" and name == "wrist-loop"):
            return "fabric"
        if includes(name, "grip", "strap", "loop"):
            return "rubber"
        if includes(name, "barrel", "ring", "rim", "mount", "rail", "dial", "plate", "shoe", "post", "hinge", "mic", "wheel"):
            return "metal"
        return "polymer"

    if asset_id in LENS_IDS:
        if includes(name, "glass"):
            return "glass"
        if includes(name, "focus-ring", "zoom-band", "focus-band", "aperture-band"):
            return "rubber"
        if includes(name, "mount", "rim", "ring", "barrel"):
            return "metal"
        return "metal"

    if asset_id in LIGHTING_IDS:
        if asset_id == "beauty-dish-light":
            if includes(name, "deflector"):
                return "polycarbonate"
            if includes(name, "foot"):
                return "rubber"
            return "metal"
        if asset_id == "lantern-softbox":
            if includes(name, "diffuser"):
                return "diffusionFabric"
            if includes(name, "cap"):
                return "polymer"
            if includes(name, "foot"):
                return "rubber"
            return "metal"
        if asset_id == "led-panel-light":
            if includes(name, "diffuser"):
                return "polycarbonate"
            if name == "panel":
                return "polymer"
            return "metal"
        if asset_id == "ring-light":
            if includes(name, "light-ring"):
                return "polycarbonate"
            if includes(name, "clamp"):
                return "rubber"
            if includes(name, "phone-grip"):
                return "polymer"
            return "metal"
        if asset_id == "softbox-light":
            if includes(name, "diffuser"):
                return "diffusionFabric"
            if includes(name, "side-") or name in {"top-side", "bottom-side"}:
                return "fabric"
            if includes(name, "base"):
                return "rubber"
            return "metal"
        if asset_id == "speedlight-flash":
            if includes(name, "diffuser"):
                return "polycarbonate"
            if includes(name, "screen"):
                return "glass"
            if includes(name, "dial"):
                return "polymer"
            if name in {"base", "foot"}:
                return "metal"
            return "polymer"
        if asset_id == "umbrella-reflector":
            if includes(name, "canopy"):
                return "fabric"
            if includes(name, "hub"):
                return "polymer"
            return "metal"

    if asset_id == "shoulder-rig" and includes(name, "shoulder-pad"):
        return "foam"

    if asset_id in SUPPORT_IDS:
        if asset_id == "camera-cage" and name == "camera-body":
            return "polymer"
        if asset_id == "monopod" and includes(name, "wrist-loop"):
            return "fabric"
        if includes(name, "foot", "wheel", "grip", "pad", "loop"):
            if name == "grip-head":
                return "metal"
            return "rubber"
        if includes(name, "lock", "end-", "carriage", "focus-wheel"):
            return "polymer"
        return "metal"

    raise ValueError(f"no material plan for {asset_id}/{part}")


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def update_source(path: Path) -> dict:
    asset_id = path.stem.removesuffix(".kcad")
    source = path.read_text(encoding="utf-8")
    if "param('color'" not in source or "presets(" in source:
        raise ValueError(f"unexpected source state: {path}")

    before_hash = hashlib.sha256(source.encode("utf-8")).hexdigest()
    part_names = re.findall(r"\.part\([\"']([^\"']+)[\"']\s*,", source)
    color_calls = source.count(".color(color)")
    if not part_names or len(part_names) != color_calls:
        raise ValueError(f"part/color mismatch in {path}: {len(part_names)} parts, {color_calls} colors")

    assignments = {part: material_for(asset_id, part) for part in part_names}
    used = list(dict.fromkeys(assignments.values()))
    if not 2 <= len(used) <= 4:
        raise ValueError(f"expected 2-4 materials in {asset_id}, got {used}")

    declarations = "\n".join(
        f"const {key} = param('{key}', '{MATERIALS[key]['studioBlack']}', {{ label: '{MATERIALS[key]['label']}' }});"
        for key in used
    )
    presets = [
        "presets({",
        "  studioBlack: { " + ", ".join(f"{key}: '{MATERIALS[key]['studioBlack']}'" for key in used) + " },",
        "  fieldRental: { " + ", ".join(f"{key}: '{MATERIALS[key]['fieldRental']}'" for key in used) + " },",
        "});",
    ]
    declarations += "\n\n" + "\n".join(presets) + "\n"

    source, replaced = re.subn(r"^const color = param\('color'.*?\);$", declarations.rstrip(), source, count=1, flags=re.M)
    if replaced != 1:
        raise ValueError(f"could not replace generic color declaration in {path}")

    for part, material in assignments.items():
        line_pattern = re.compile(rf"(\.part\([\"']{re.escape(part)}[\"']\s*,[^\n]*?)\.color\(color\)")
        source, changed = line_pattern.subn(rf"\1.color({material})", source, count=1)
        if changed != 1:
            raise ValueError(f"could not map color for {asset_id}/{part}")

    labels = [MATERIALS[key]["label"].lower() for key in used]
    label_list = ", ".join(labels[:-1]) + (" and " if len(labels) > 1 else "") + labels[-1]
    description_match = re.search(r"^\s*description:\s*(['\"])(.*)\1,?\s*$", source, re.M)
    if not description_match:
        raise ValueError(f"could not locate description in {path}")
    description = description_match.group(2)
    if " Knobs:" in description:
        description = description.split(" Knobs:", 1)[0]
    description += f" Knobs: overall scale and {label_list} color controls. Presets: studioBlack and fieldRental."
    source = source[:description_match.start()] + f"  description: {ts_string(description)}," + source[description_match.end():]

    comment_lines = source.splitlines()
    for i, line in enumerate(comment_lines[:8]):
        if "All visible parts share one color control." in line:
            comment_lines[i] = "// Millimetres, Z up, base on z = 0. Separate " + label_list + " zones keep the object readable and editable."
            break
    source = "\n".join(comment_lines) + "\n"

    path.write_text(source, encoding="utf-8")
    after_hash = hashlib.sha256(source.encode("utf-8")).hexdigest()
    values = {key: MATERIALS[key]["studioBlack"] for key in used}
    alternate = {key: MATERIALS[key]["fieldRental"] for key in used}
    return {
        "assetId": asset_id,
        "source": str(path.relative_to(ROOT)),
        "sourceBeforeSha256": before_hash,
        "sourceSha256": after_hash,
        "partCount": len(part_names),
        "materials": {key: MATERIALS[key]["label"] for key in used},
        "partMaterials": assignments,
        "presets": {"studioBlack": values, "fieldRental": alternate},
    }


def main() -> None:
    paths = sorted(KIT.glob("*.kcad.ts"))
    if len(paths) != 40:
        raise SystemExit(f"expected 40 existing photo/video assets, found {len(paths)}")
    rows = [update_source(path) for path in paths]
    result = {
        "baseCommit": "41232a82d",
        "kit": "photo-video-studio",
        "assets": rows,
        "materialControls": sum(len(row["materials"]) for row in rows),
        "presetEntries": sum(len(row["presets"]) for row in rows),
        "partCount": sum(row["partCount"] for row in rows),
    }
    (BUNDLE / "material-map.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"promoted {len(rows)} assets: {result['materialControls']} material controls, {result['presetEntries']} preset entries")


if __name__ == "__main__":
    main()
