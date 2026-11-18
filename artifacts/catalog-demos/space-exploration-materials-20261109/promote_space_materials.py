#!/usr/bin/env python3
"""Add useful, part-specific material controls to the space-exploration kit."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "space-exploration"
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import score  # noqa: E402


MATERIALS = {
    "rubber": ("#34383a", "#514d44", "#252a2c"),
    "composite": ("#71817c", "#9a9484", "#d1a847"),
    "polymer": ("#536c76", "#7a8279", "#d4a63f"),
    "stainlessSteel": ("#758589", "#8c8b80", "#d5aa42"),
    "thermalBlanket": ("#b4a77f", "#c7ba96", "#d8bd70"),
    "aluminum": ("#b6bdbe", "#c3c5c3", "#d8b255"),
    "brass": ("#b8873a", "#c0a573", "#e1b83a"),
    "fabric": ("#687b78", "#b9ad94", "#dc9858"),
    "carbide": ("#707a80", "#77746c", "#c4a85f"),
    "ceramic": ("#e0dac6", "#d0c9b6", "#f0c447"),
    "laminate": ("#938671", "#b0a38b", "#d8b255"),
    "insulation": ("#b2a77f", "#c3b791", "#d6b870"),
}

# material name, UI label, defaults/preset values, and existing component names
PROMOTIONS = {
    "airlock-hatch": ("rubber", "Rubber handle grip", ["handle"]),
    "cargo-airlock-pod": ("composite", "Composite hatch panel", ["hatch"]),
    "drill-core-tube-rack": ("polymer", "Polymer sample tubes", ["tube-0", "tube-1", "tube-2", "tube-3"]),
    "dust-protection-screen": ("stainlessSteel", "Stainless protective mesh", ["panel-0", "panel-1", "panel-2"]),
    "emergency-shelter-pod": ("thermalBlanket", "Thermal blanket shell", ["shell"]),
    "equipment-locker": ("rubber", "Rubber leveling feet", ["foot--300", "foot-300"]),
    "equipment-stanchion": ("polymer", "Polymer sensor cap", ["cap"]),
    "field-lamp": ("aluminum", "Bare aluminum stem", ["stem"]),
    "field-tool-chest": ("polymer", "Polymer latches", ["latch"]),
    "habitat-corridor-section": ("thermalBlanket", "Thermal blanket shell", ["tube"]),
    "habitat-spares-crate": ("polymer", "Polymer corner guards", ["corner--340--265", "corner--340-265", "corner-340--265", "corner-340-265"]),
    "landing-gear-pod": ("rubber", "Rubber landing pad", ["foot"]),
    "oxygen-cylinder-rack": ("brass", "Brass cylinder valves", []),
    "payload-container": ("polymer", "Polymer instrument panel", ["panel"]),
    "power-distribution-unit": ("polymer", "Polymer cable glands", ["gland-0", "gland-1", "gland-2"]),
    "pressurized-tunnel-collar": ("rubber", "Rubber pressure seal", ["inner-lip"]),
    "regolith-sieve": ("stainlessSteel", "Stainless sieve mesh", ["mesh"]),
    "robotic-arm-pedestal": ("polymer", "Polymer gripper fingers", []),
    "rover-charging-dock": ("polymer", "Polymer connector insulator", ["connector"]),
    "rover-dust-shield": ("rubber", "Rubber dust lips", ["lip-left", "lip-right"]),
    "rover-seat": ("fabric", "Seat upholstery", ["cushion", "back"]),
    "rover-tool-rack": ("rubber", "Rubber tool-channel liners", ["channel-0", "channel-1", "channel-2"]),
    "sample-canister": ("rubber", "Rubber carry grip", ["handle"]),
    "sample-cassette": ("polymer", "Polymer sample cells", ["cell-0", "cell-1", "cell-2", "cell-3"]),
    "sample-drill-head": ("carbide", "Tungsten-carbide bit", ["bit"]),
    "science-instrument-tripod": ("ceramic", "Ceramic instrument isolator", ["mount"]),
    "science-worktable": ("laminate", "Lab laminate top", ["top"]),
    "seismic-sensor": ("polymer", "Polymer cable port", ["port"]),
    "specimen-tray": ("polymer", "Polymer specimen tray", ["base"]),
    "spectrometer-case": ("rubber", "Rubber carry grip", ["handle"]),
    "surface-antenna-mast": ("ceramic", "Ceramic aerial insulators", ["aerial-0", "aerial-1"]),
    "surface-battery-bank": ("polymer", "Polymer terminal caps", ["cap-0", "cap-1", "cap-2", "cap-3"]),
    "surface-cable-bridge": ("rubber", "Rubber cable-protection lips", ["lip-left", "lip-right"]),
    "surface-sensor-post": ("polymer", "Polymer foot insulators", ["foot-0", "foot-1", "foot-2"]),
    "surface-storage-shed": ("thermalBlanket", "Insulated door panels", ["door-left", "door-right"]),
    "transport-sled": ("rubber", "Rubber tow-loop grip", ["tow-loop"]),
}

# Keep each existing color control assigned after splitting out the new
# material. These are physically sensible surfaces, not hidden placeholder
# uses added only to satisfy the source linter.
SUPPORT_ASSIGNMENTS = {
    "drill-core-tube-rack": ("aluminum", ["end-left", "end-right"]),
    "dust-protection-screen": ("paint", ["top-rail", "bottom-rail"]),
    "equipment-locker": ("aluminum", ["top"]),
    "habitat-corridor-section": ("paint", ["ring-a", "ring-b"]),
    "power-distribution-unit": ("aluminum", ["roof"]),
    "regolith-sieve": ("paint", ["rim-side-a", "rim-side-b"]),
    "rover-seat": ("paint", ["arm-left", "arm-right"]),
    "specimen-tray": ("aluminum", ["corner-0", "corner-1", "corner-2", "corner-3"]),
    "surface-antenna-mast": ("paint", ["crossbar"]),
}

DESCRIPTION_UPDATES = {
    "field-tool-chest": "Low tool chest with a hinged-looking lid, front drawer line, side grab handles and a separate polymer latch",
    "oxygen-cylinder-rack": "Two upright oxygen cylinders sit in a retaining frame with bottom tray, lifting bar and paired brass valve fittings",
    "robotic-arm-pedestal": "Two supported instrument-arm links rise from a turntable through distinct shoulder and wrist pivots to a paired polymer gripper",
}

SOURCE_COMMENTS = {
    "field-tool-chest": "// Field tool chest: Low chest with a hinged lid, drawer seam, side carry handles and a contrasting front polymer latch. Stylized visualization geometry in millimetres, Z up.",
}

MATERIAL_DISPLAY_NAMES = {
    "thermalBlanket": "thermal blanket",
    "stainlessSteel": "stainless steel",
    "carbide": "tungsten carbide",
}

DEFAULT_OVERRIDES = {
    "field-tool-chest": {"polymer": "#d4a63f"},
    "oxygen-cylinder-rack": {"paint": "#5d8f6d"},
    "robotic-arm-pedestal": {"paint": "#c9783b"},
}


def add_parameter(source: str, asset_id: str, name: str, label: str) -> str:
    if re.search(rf"param\(\s*['\"]{re.escape(name)}['\"]", source):
        raise ValueError(f"{name} already exists in source")
    default = DEFAULT_OVERRIDES.get(asset_id, {}).get(name, MATERIALS[name][0])
    line = f'const {name} = param(\'{name}\', "{default}", {{ label: "{label}" }});\n\n'
    marker = "presets({"
    if source.count(marker) != 1:
        raise ValueError("expected one presets block")
    return source.replace(marker, line + marker, 1)


def extend_presets(source: str, name: str) -> str:
    default, lunar, high = MATERIALS[name]
    pattern = re.compile(r"presets\(\{\n(?P<body>.*?)\n\}\);", re.S)
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise ValueError("expected one presets block")
    body = matches[0].group("body")
    lines = body.splitlines()
    wanted = {"lunarDust": lunar, "highVisibility": high}
    for preset, value in wanted.items():
        matches_for_preset = [i for i, line in enumerate(lines) if line.lstrip().startswith(f"{preset}:")]
        if len(matches_for_preset) != 1:
            raise ValueError(f"expected exactly one {preset} preset")
        index = matches_for_preset[0]
        line = lines[index]
        if f'"{name}"' in line or f"'{name}'" in line:
            raise ValueError(f"{name} already appears in {preset}")
        comma = "," if line.rstrip().endswith(",") else ""
        clean = line.rstrip()[:-1] if comma else line.rstrip()
        close = clean.rfind("}")
        if close < 0:
            raise ValueError(f"could not parse {preset} values")
        lines[index] = clean[:close] + f', "{name}": "{value}"' + clean[close:] + comma
    replacement = "presets({\n" + "\n".join(lines) + "\n});"
    return source[: matches[0].start()] + replacement + source[matches[0].end() :]


def reassign_parts(source: str, asset_id: str, material: str, targets: list[str]) -> str:
    lines = source.splitlines()
    for target in targets:
        matches = [i for i, line in enumerate(lines) if f'p.part("{target}",' in line]
        if len(matches) != 1:
            raise ValueError(f"{asset_id}: expected one part named {target}, found {len(matches)}")
        index = matches[0]
        line = lines[index]
        if re.search(r"\.color\(\s*" + re.escape(material) + r"\s*\)", line):
            raise ValueError(f"{asset_id}/{target} already uses {material}")
        updated, count = re.subn(
            r"\.color\(\s*[A-Za-z_]\w*\s*\)(\);)\s*$",
            f".color({material})\\1",
            line,
        )
        if count != 1:
            raise ValueError(f"{asset_id}/{target}: could not replace its material assignment")
        lines[index] = updated
    return "\n".join(lines) + "\n"


def promote_oxygen_rack(source: str) -> str:
    old = 'p.part("cylinder-1",c(150,0,105,820,110,8).color(paint));'
    new = old + '\n' + '\n'.join([
        'p.part("valve-0",c(-150,-70,905,70,34,8).color(brass));',
        'p.part("valve-1",c(150,-70,905,70,34,8).color(brass));',
    ])
    if source.count(old) != 1:
        raise ValueError("oxygen-cylinder-rack: expected one second cylinder assignment")
    return source.replace(old, new, 1)


def promote_robotic_arm(source: str) -> str:
    old_helper = 'const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);'
    new_helper = old_helper + '\nconst cy = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(0,0,-h/2).rotateX(90).translate(x,y,z).scale(scale);'
    if source.count(old_helper) != 1:
        raise ValueError("robotic-arm-pedestal: expected the original cylinder helper")
    source = source.replace(old_helper, new_helper, 1)
    start = source.index('const p = assembly("robotic-arm-pedestal");')
    end = source.index("return p.model();", start)
    replacement = '''const p = assembly("robotic-arm-pedestal");
p.part("base",b(0,0,0,520,520,70).color(paint));
p.part("turntable",c(0,0,35,90,180,8).color(paint));
p.part("support-column",c(0,0,110,240,112,10).color(aluminum));
p.part("lower-link",b(0,0,330,185,150,420).color(paint));
p.part("shoulder-pivot",cy(0,0,405,190,104).color(aluminum));
p.part("forearm",b(225,0,620,430,135,115).color(paint));
p.part("elbow-pivot",cy(25,0,660,170,104).color(aluminum));
p.part("wrist-pivot",cy(410,0,665,150,76).color(aluminum));
p.part("tool-palm",b(500,0,625,150,190,90).color(aluminum));
p.part("gripper-finger-left",b(620,70,620,150,24,110).color(polymer));
p.part("gripper-finger-right",b(620,-70,620,150,24,110).color(polymer));
'''
    source = source[:start] + replacement + source[end:]
    source = source.replace("triangleBudget: 596,", "triangleBudget: 900,", 1)
    source = source.replace(
        "// Instrument arm pedestal: Static instrument-arm pedestal with a broad base, two block links and a tool-end mount. Stylized visualization geometry in millimetres, Z up.",
        "// Instrument arm pedestal: Supported two-link arm with separate shoulder, elbow and wrist pivots ending in paired gripper fingers. Stylized visualization geometry in millimetres, Z up.",
        1,
    )
    return source


def update_description(source: str, asset_id: str, material: str) -> str:
    pattern = re.compile(r'(description: ")([^"]*)(")')
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise ValueError(f"{asset_id}: expected one metadata description")
    old = matches[0].group(2)
    base = DESCRIPTION_UPDATES.get(asset_id, old.split(". Material controls:", 1)[0].rstrip("."))
    controls_match = re.search(r"Material controls: ([^;]+);", old)
    if controls_match is None:
        raise ValueError(f"{asset_id}: description is missing its material controls")
    controls = [part.strip() for part in controls_match.group(1).split(",")]
    display_name = MATERIAL_DISPLAY_NAMES.get(material, material)
    if display_name not in controls:
        controls.append(display_name)
    updated = f"{base}. Material controls: {', '.join(controls)}; named lunarDust and highVisibility presets."
    return source[: matches[0].start(2)] + updated + source[matches[0].end(2) :]


def apply_default_overrides(source: str, asset_id: str) -> str:
    for name, value in DEFAULT_OVERRIDES.get(asset_id, {}).items():
        pattern = re.compile(rf"(^const {re.escape(name)} = param\('{re.escape(name)}', )\"[^\"]+(\".*$)", re.M)
        source, count = pattern.subn(rf'\g<1>"{value}\g<2>', source)
        if count != 1:
            raise ValueError(f"{asset_id}: expected one {name} parameter for its color default")
    return source


def promote_source(asset_id: str, source: str) -> str:
    material, label, targets = PROMOTIONS[asset_id]
    source = add_parameter(source, asset_id, material, label)
    source = extend_presets(source, material)
    if asset_id == "oxygen-cylinder-rack":
        source = promote_oxygen_rack(source)
    elif asset_id == "robotic-arm-pedestal":
        source = promote_robotic_arm(source)
    else:
        source = reassign_parts(source, asset_id, material, targets)
    if asset_id in SUPPORT_ASSIGNMENTS:
        support_material, support_parts = SUPPORT_ASSIGNMENTS[asset_id]
        source = reassign_parts(source, asset_id, support_material, support_parts)
    source = apply_default_overrides(source, asset_id)
    if asset_id in SOURCE_COMMENTS:
        lines = source.splitlines()
        comment_lines = [index for index, line in enumerate(lines) if line.startswith("// ") and not line.startswith("// SPDX-")]
        if len(comment_lines) != 1:
            raise ValueError(f"{asset_id}: expected one descriptive source comment")
        lines[comment_lines[0]] = SOURCE_COMMENTS[asset_id]
        source = "\n".join(lines) + "\n"
    return update_description(source, asset_id, material)


def update_readme() -> None:
    readme = KIT / "README.md"
    lines = readme.read_text(encoding="utf-8").splitlines()
    if not any("space-exploration-materials-20261109" in line for line in lines):
        old_handoff = "The [quality promotion handoff](../../../artifacts/catalog-demos/space-exploration-quality-promotion-20261105/README.md) records source changes, refreshed previews, local validation, the capture settings and an inspected MP4."
        new_handoff = (
            "The [2026-11-09 material and silhouette refinement](../../../artifacts/catalog-demos/space-exploration-materials-20261109/README.md) "
            "records component-level material controls, a supported instrument arm, regenerated previews, local checks and an inspected MP4. "
            "The [initial quality-promotion handoff](../../../artifacts/catalog-demos/space-exploration-quality-promotion-20261105/README.md) preserves the earlier source-to-preview round."
        )
        if old_handoff not in "\n".join(lines):
            raise ValueError("could not find the existing quality handoff paragraph")
        lines = [line.replace(old_handoff, new_handoff) for line in lines]

    output = []
    for line in lines:
        if line.startswith("| `") and line.count("|") >= 5:
            match = re.match(r"\| `([^`]+)` \|", line)
            if match is not None:
                asset_id = match.group(1)
                source = (KIT / f"{asset_id}.kcad.ts").read_text(encoding="utf-8")
                knobs = re.findall(r"param\(\s*['\"]([^'\"]+)['\"]", source)
                if len(knobs) >= 2:
                    labels = {
                        "scale": "scale", "paint": "paint", "aluminum": "aluminum",
                        "rubber": "rubber", "glass": "glass", "fabric": "fabric",
                        "warningAmber": "warning amber", "solarCell": "solar cell",
                        "reflector": "reflector", "thermalBlanket": "thermal blanket",
                        "composite": "composite", "polymer": "polymer",
                        "stainlessSteel": "stainless steel", "brass": "brass",
                        "carbide": "tungsten carbide", "ceramic": "ceramic",
                        "laminate": "laminate",
                    }
                    knob_text = " · ".join(labels.get(name, name) for name in knobs)
                    columns = line.split("|")
                    description = re.search(r'description: "([^"]+)"', source)
                    if description is None:
                        raise ValueError(f"{asset_id}: metadata description was not found")
                    columns[3] = f" {description.group(1)} "
                    columns[4] = f" {knob_text} "
                    line = "|".join(columns)
        output.append(line)
    readme.write_text("\n".join(output) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    paths = sorted(KIT.glob("*.kcad.ts"))
    two_color_ids = {Path(item.path).stem.removesuffix(".kcad") for item in [score(str(path)) for path in paths] if item.colours == 2}
    if set(PROMOTIONS) != two_color_ids - {"rover-wheel-assembly"}:
        missing = sorted((two_color_ids - {"rover-wheel-assembly"}) - set(PROMOTIONS))
        extra = sorted(set(PROMOTIONS) - two_color_ids)
        raise ValueError(f"promotion coverage changed; missing={missing}, extra={extra}")

    changed = []
    for asset_id, (material, _, _) in PROMOTIONS.items():
        path = KIT / f"{asset_id}.kcad.ts"
        source = path.read_text(encoding="utf-8")
        updated = promote_source(asset_id, source)
        changed.append((path, source, updated, material))

    if args.dry_run:
        print(f"dry-run: {len(changed)} assets receive a third material control")
        for path, _, _, material in changed:
            print(f"  {path.relative_to(ROOT)}: {material}")
        print("robotic-arm-pedestal: connected two-link, pivot and gripper silhouette")
        print("oxygen-cylinder-rack: two brass valve fittings")
        return 0

    for path, _, updated, _ in changed:
        path.write_text(updated, encoding="utf-8")
    update_readme()
    print(f"promoted {len(changed)} existing space-exploration assets; no IDs added")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
