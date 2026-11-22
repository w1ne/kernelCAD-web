#!/usr/bin/env python3
"""Split the vet-clinic kit's shared color into visible material controls."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/vet-clinic"

MATERIALS = {
    "paintedSteelColor": {
        "label": "Powder-coated steel",
        "default": "#66838a",
        "clean": "#e4ebe7",
        "teal": "#4d858d",
    },
    "stainlessSteelColor": {
        "label": "Stainless steel",
        "default": "#bdc7c5",
        "clean": "#e1e6e3",
        "teal": "#8daeb0",
    },
    "rubberColor": {
        "label": "Rubber",
        "default": "#30383b",
        "clean": "#3b4142",
        "teal": "#34464a",
    },
    "glassColor": {
        "label": "Tinted glass and displays",
        "default": "#4e8290",
        "clean": "#6b9fab",
        "teal": "#3f7480",
    },
    "polymerColor": {
        "label": "Molded polymer",
        "default": "#d3dfdc",
        "clean": "#e8ece8",
        "teal": "#9bbfc0",
    },
    "upholsteryColor": {
        "label": "Vinyl upholstery",
        "default": "#62858a",
        "clean": "#b8cbc7",
        "teal": "#47767d",
    },
    "fabricColor": {
        "label": "Fabric straps",
        "default": "#b6a98e",
        "clean": "#d6d0bf",
        "teal": "#6c9290",
    },
}

PAINT_PALETTE = ("#66838a", "#718b89", "#7d8d96", "#829687", "#6e8994", "#8e9991")

PRIMARY_ROLE = {
    "basket-muzzle": "polymerColor",
    "hard-sided-pet-carrier": "polymerColor",
    "leash-hook-board": "polymerColor",
    "oxygen-therapy-cage": "paintedSteelColor",
    "sample-prep-bench": "paintedSteelColor",
    "specimen-transport-cooler": "polymerColor",
    "stacked-feline-condo": "polymerColor",
    "stainless-kennel-bank": "stainlessSteelColor",
    "surgical-scrub-sink": "stainlessSteelColor",
    "veterinary-exam-stool": "paintedSteelColor",
    "veterinary-radiography-table": "stainlessSteelColor",
    "veterinary-surgery-table": "paintedSteelColor",
    "waiting-bench": "paintedSteelColor",
    "wet-treatment-table": "stainlessSteelColor",
}

# These parts have a clear material role that cannot be inferred reliably from
# their short source names alone.
PART_ROLE_OVERRIDES = {
    "anesthesia-machine": {
        "base": "paintedSteelColor",
        "tower": "paintedSteelColor",
        "wheel-bracket-a": "stainlessSteelColor",
        "wheel-bracket-b": "stainlessSteelColor",
        "oxygen-cylinder-left": "stainlessSteelColor",
        "oxygen-cylinder-right": "stainlessSteelColor",
        "absorber-canister": "glassColor",
        "monitor": "paintedSteelColor",
        "monitor-screen": "glassColor",
        "breathing-circuit-block": "polymerColor",
        "oxygen-valve-left": "stainlessSteelColor",
        "oxygen-valve-right": "stainlessSteelColor",
    },
    "basket-muzzle": {
        "crown-strap": "fabricColor",
        "chin-strap": "fabricColor",
    },
    "hard-sided-pet-carrier": {
        "carry-handle": "rubberColor",
    },
    "isolation-kennel": {
        "floor-pan": "stainlessSteelColor",
        "rear-panel": "polymerColor",
        "left-panel": "polymerColor",
        "right-panel": "polymerColor",
        "top-cap": "paintedSteelColor",
        "status-card-holder": "glassColor",
    },
    "leash-hook-board": {
        "backboard": "polymerColor",
    },
    "oxygen-therapy-cage": {
        "chamber": "polymerColor",
        "door-window": "glassColor",
    },
    "patient-recovery-incubator": {
        "lower-chamber": "polymerColor",
        "upper-hood": "polymerColor",
        "front-access-door": "polymerColor",
        "door-window": "glassColor",
        "inside-shelf": "stainlessSteelColor",
    },
    "reception-check-in-counter": {
        "transaction-counter": "polymerColor",
        "privacy-screen": "glassColor",
        "monitor-base": "stainlessSteelColor",
        "monitor-housing": "paintedSteelColor",
        "keyboard": "polymerColor",
    },
    "sample-prep-bench": {
        "worktop": "stainlessSteelColor",
        "tube-rack": "polymerColor",
        "tube-0": "glassColor",
        "tube-1": "glassColor",
        "tube-2": "glassColor",
        "tube-3": "glassColor",
        "tube-4": "glassColor",
        "reagent-bottle-a": "glassColor",
        "reagent-bottle-b": "glassColor",
    },
    "specimen-transport-cooler": {
        "cooler-body": "polymerColor",
        "lid": "polymerColor",
        "temperature-window": "glassColor",
    },
    "stacked-feline-condo": {
        "middle-shelf": "upholsteryColor",
        "climb-step-one": "upholsteryColor",
        "climb-step-two": "upholsteryColor",
    },
    "stainless-kennel-bank": {
        "base-plinth": "polymerColor",
        "roof": "stainlessSteelColor",
        "rear-panel": "stainlessSteelColor",
        "left-side": "stainlessSteelColor",
        "right-side": "stainlessSteelColor",
    },
    "surgical-scrub-sink": {
        "foot-control": "rubberColor",
    },
    "veterinary-exam-stool": {
        "seat": "upholsteryColor",
    },
    "veterinary-radiography-table": {
        "imaging-top": "polymerColor",
    },
    "veterinary-surgery-table": {
        "base-plate": "paintedSteelColor",
        "lift-column": "paintedSteelColor",
        "table-center": "stainlessSteelColor",
        "table-wing-left": "stainlessSteelColor",
        "table-wing-right": "stainlessSteelColor",
        "drain-channel": "stainlessSteelColor",
    },
    "waiting-bench": {
        "seat": "upholsteryColor",
        "back": "upholsteryColor",
    },
    "wet-treatment-table": {
        "table-top": "polymerColor",
        "rear-lip": "stainlessSteelColor",
        "left-lip": "stainlessSteelColor",
        "right-lip": "stainlessSteelColor",
    },
    "xray-cassette": {
        "cassette-body": "polymerColor",
        "label-tab": "polymerColor",
    },
}

RUBBER_PART = re.compile(r"(?:wheel|caster|base-foot|leveling-foot|foot-[a-z]|foot-pedal|side-grip|carry-grip|bumper)")
GLASS_PART = re.compile(r"(?:screen|display|lens|window|beacon|gauge|tube-face|temperature-window|status-card-holder)")
FABRIC_PART = re.compile(r"(?:strap|muzzle)")
SOFT_PART = re.compile(r"(?:seat|cushion|upholstery)")
STEEL_PART = re.compile(
    r"(?:rail|bar|leg|arm|post|stand|mast|column|bracket|hinge|pivot|hook|peg|spoke|support|"
    r"clamp|crossbar|handle|faucet|tap|drain|bowl|basin|tray|rim|channel|ring|edge|latch|"
    r"pull|caster-bracket|adjuster|rod|yoke|counterweight|foot-ring|service-slot|tool-hook)"
)


def asset_id(source: Path) -> str:
    return source.name.removesuffix(".kcad.ts")


def title_of(text: str) -> str:
    match = re.search(r'title:\s*"([^"]+)"', text)
    if not match:
        raise ValueError("asset title is missing")
    return match.group(1)


def description_of(text: str) -> str:
    match = re.search(r'description:\s*"([^"]+)"\s*\+\s*\' Editable overall scale and asset color\.\'', text)
    if not match:
        raise ValueError("expected original single-color description")
    return match.group(1).rstrip(".")


def part_names(text: str) -> list[str]:
    return re.findall(r'^\s*[bc]\(\s*["\']([^"\']+)["\']', text, re.MULTILINE)


def classify_part(kit_asset: str, name: str, primary: str) -> str:
    override = PART_ROLE_OVERRIDES.get(kit_asset, {}).get(name)
    if override:
        return override

    lowered = name.lower()
    if RUBBER_PART.search(lowered):
        return "rubberColor"
    if GLASS_PART.search(lowered):
        return "glassColor"
    if kit_asset == "waiting-bench" and name in {"seat", "back"}:
        return "upholsteryColor"
    if SOFT_PART.search(lowered):
        return "upholsteryColor"
    if FABRIC_PART.search(lowered):
        return "fabricColor"
    if STEEL_PART.search(lowered):
        return "stainlessSteelColor"
    return primary


def keep_two_to_four_roles(roles_by_part: dict[str, str], primary: str) -> dict[str, str]:
    role_priority = (
        "glassColor",
        "rubberColor",
        "stainlessSteelColor",
        "upholsteryColor",
        "fabricColor",
        "polymerColor",
        "paintedSteelColor",
    )
    used = set(roles_by_part.values())
    if primary not in used:
        main_part = re.compile(r"(?:base|body|housing|cabinet|shell|platform|panel|floor|roof|board|counter|table|wall|case)")
        candidate = next((part for part in roles_by_part if main_part.search(part)), next(iter(roles_by_part)))
        roles_by_part[candidate] = primary
        used = set(roles_by_part.values())
    if len(used) < 2:
        alternate = "stainlessSteelColor" if primary != "stainlessSteelColor" else "paintedSteelColor"
        candidate = next((part for part, role in roles_by_part.items() if role == primary), None)
        if candidate is None:
            candidate = next(iter(roles_by_part))
            roles_by_part[candidate] = primary
        alternate_part = next((part for part in roles_by_part if part != candidate), None)
        if alternate_part is not None:
            roles_by_part[alternate_part] = alternate
        used = set(roles_by_part.values())
    keep = {primary}
    for role in role_priority:
        if role in used and role != primary and len(keep) < 4:
            keep.add(role)
    return {part: role if role in keep else primary for part, role in roles_by_part.items()}


def palette_for(kit_asset: str, role: str) -> str:
    if role == "paintedSteelColor":
        return PAINT_PALETTE[sum(ord(ch) for ch in kit_asset) % len(PAINT_PALETTE)]
    return MATERIALS[role]["default"]


def build_material_block(kit_asset: str, names: list[str]) -> tuple[str, dict[str, str], str]:
    primary = PRIMARY_ROLE.get(kit_asset, "paintedSteelColor")
    role_by_part = {name: classify_part(kit_asset, name, primary) for name in names}
    role_by_part = keep_two_to_four_roles(role_by_part, primary)
    roles = sorted(set(role_by_part.values()), key=lambda role: (role != primary, role))
    if not 2 <= len(roles) <= 4:
        raise ValueError(f"{kit_asset}: expected two to four used material roles, got {roles}")

    controls = [
        f"const {role} = param('{role}', '{palette_for(kit_asset, role)}', {{ label: '{MATERIALS[role]['label']}' }});"
        for role in roles
    ]

    clean_color = MATERIALS[primary]["clean"]
    teal_color = MATERIALS[primary]["teal"]
    secondary_role = next((role for role in roles if role != primary), primary)
    presets = [
        "presets({",
        f"  clinicClean: {{ {primary}: '{clean_color}' }},",
        f"  softTeal: {{ {primary}: '{teal_color}', {secondary_role}: '{MATERIALS[secondary_role]['teal']}' }},",
        "});",
    ]
    cases: list[str] = []
    for role in roles:
        if role == primary:
            continue
        members = [name for name, assigned in role_by_part.items() if assigned == role]
        for name in members:
            cases.append(f'    case "{name}": return {role};')
    cases.extend(["  }", f"  return {primary};", "};"])
    finish = [
        "const finishFor = (name: string) => {",
        "  switch (name) {",
        *cases,
    ]
    return "\n".join(controls + [""] + presets + [""] + finish), role_by_part, primary


def promote(source: Path) -> tuple[int, int]:
    text = source.read_text(encoding="utf-8")
    if "const color = param('color'" not in text:
        raise ValueError(f"{source.name}: expected original asset-wide color control")
    if ".color(color)" not in text:
        raise ValueError(f"{source.name}: expected source parts to use the asset-wide color")

    identifier = asset_id(source)
    title = title_of(text)
    description = description_of(text)
    names = part_names(text)
    if identifier == "anesthesia-machine":
        names.extend(("monitor-screen", "oxygen-valve-left", "oxygen-valve-right"))
    if len(names) < 3:
        raise ValueError(f"{source.name}: expected at least three named geometry parts")

    block, roles_by_part, _primary = build_material_block(identifier, names)
    role_labels = ", ".join(MATERIALS[role]["label"].lower() for role in sorted(set(roles_by_part.values())))
    header = (
        f"// {title}: {description}. Separate {role_labels} surfaces keep its component silhouette readable."
    )
    lines = text.splitlines()
    lines[0] = header
    text = "\n".join(lines) + "\n"

    updated_description = f"{description}. Material controls: {role_labels}. Presets: clinicClean and softTeal."
    old_description = re.search(
        r'description:\s*"[^"]+"\s*\+\s*\' Editable overall scale and asset color\.\'', text
    )
    if not old_description:
        raise ValueError(f"{source.name}: description changed unexpectedly")
    text = text[: old_description.start()] + f"description: {json.dumps(updated_description)}" + text[old_description.end() :]

    control = re.search(r"^const color = param\('color',.*?\);$", text, re.MULTILINE)
    if not control:
        raise ValueError(f"{source.name}: cannot locate generic color parameter")
    text = text[: control.start()] + block + text[control.end() :]
    text, color_calls = re.subn(r"\.color\(color\)", ".color(finishFor(name))", text)
    if color_calls < 1:
        raise ValueError(f"{source.name}: no part color calls were updated")

    if identifier == "anesthesia-machine":
        text = text.replace("[-170, 130, 165]", "[-276, 0, 165]")
        text = text.replace("[170, 130, 165]", "[276, 0, 165]")
        monitor = 'b("monitor", [330, 50, 230], [0, -150, 1030]);'
        if monitor not in text:
            raise ValueError("anesthesia-machine: monitor anchor changed unexpectedly")
        text = text.replace(
            monitor,
            monitor + '\nb("monitor-screen", [280, 8, 178], [0, -179, 1030]);',
        )
        text = text.replace(
            'c("oxygen-cylinder-right", 500, 82, 10, [276, 0, 165]);',
            'c("oxygen-cylinder-right", 500, 82, 10, [276, 0, 165]);\n'
            'c("oxygen-valve-left", 42, 28, 8, [-276, 0, 668]);\n'
            'c("oxygen-valve-right", 42, 28, 8, [276, 0, 668]);',
        )

    if "param('color'" in text or ".color(color)" in text:
        raise ValueError(f"{source.name}: generic color remains")
    source.write_text(text, encoding="utf-8")
    return len(set(roles_by_part.values())), 2


def main() -> None:
    sources = sorted(KIT.glob("*.kcad.ts"))
    if len(sources) != 50:
        raise SystemExit(f"expected exactly 50 existing vet-clinic assets, found {len(sources)}")
    promoted = 0
    controls = 0
    for source in sources:
        colors, presets = promote(source)
        promoted += 1
        controls += colors
        print(f"{asset_id(source)}: {colors} material controls, {presets} presets")
    print(f"Promoted {promoted} existing assets; {controls} material controls; {promoted * 2} preset entries.")


if __name__ == "__main__":
    main()
