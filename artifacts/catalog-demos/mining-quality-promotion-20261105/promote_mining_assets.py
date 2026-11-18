#!/usr/bin/env python3
"""Promote the existing mining assets in place; add no catalog IDs."""

from __future__ import annotations

import argparse
import colorsys
import json
import re
import shutil
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/mining"
BUNDLE = Path(__file__).resolve().parent

MATERIALS = {
    "coatedSteel": {
        "label": "Coated equipment steel",
        "weathered": "#6c716d",
        "highVisibility": "#e48a1e",
    },
    "structuralSteel": {
        "label": "Structural steel",
        "default": "#566168",
        "weathered": "#666a66",
        "highVisibility": "#465159",
    },
    "stainlessSteel": {
        "label": "Stainless steel",
        "default": "#b5c0c0",
        "weathered": "#969f9e",
        "highVisibility": "#c5ccca",
    },
    "rubber": {
        "label": "Rubber",
        "default": "#292d2f",
        "weathered": "#393a38",
        "highVisibility": "#24282a",
    },
    "instrumentGlass": {
        "label": "Instrument glass",
        "default": "#5c929c",
        "weathered": "#55787d",
        "highVisibility": "#5fb6c1",
    },
}
ROLE_ORDER = ["coatedSteel", "structuralSteel", "stainlessSteel", "rubber", "instrumentGlass"]
STRUCTURAL_PARTS = (
    "frame", "base", "foot", "leg", "post", "rail", "rung", "walkway",
    "bridge", "beam", "brace", "skid", "support", "plinth", "platform",
    "tower", "truss", "chassis", "foundation", "crossbar", "upright",
    "mast", "stringer", "strut", "deck", "guard", "pier", "portal", "track",
)
STAINLESS_PARTS = (
    "shaft", "drum", "ring", "sprocket", "bearing", "trunnion", "sheave",
    "axle", "rod", "pin", "plate", "bar", "screen", "roll", "spindle",
    "cylinder", "hydraulic", "paddle", "disc", "flywheel", "rotor", "tool-tip", "shoe",
)
RUBBER_PARTS = (
    "belt", "tire", "tyre", "bumper", "tread", "cable", "hose",
    "cushion",
)
PRIMARY_NAMES = {"shell", "body", "main-body", "housing", "vessel", "tank"}
ADDED_PART_NAMES = {
    "continuous-miner": [
        *(f"left-track-shoe-{index}" for index in range(1, 11)),
        *(f"right-track-shoe-{index}" for index in range(1, 11)),
        *(f"cutting-pick-{index}" for index in range(1, 11)),
    ],
    "mine-locomotive": ["cab-side-window-near", "cab-side-window-far", "cab-front-window"],
}


def assign_role(part_name: str) -> str:
    name = part_name.lower()
    if "window" in name or "glazing" in name or "instrument-glass" in name:
        return "instrumentGlass"
    if "track" in name and "shoe" not in name:
        return "structuralSteel"
    if any(token in name for token in RUBBER_PARTS) or (
        "wheel" in name and "bucket-wheel" not in name
    ) or name == "pad" or name.startswith("pad-"):
        return "rubber"
    if any(token in name for token in STRUCTURAL_PARTS):
        return "structuralSteel"
    if any(token in name for token in STAINLESS_PARTS):
        return "stainlessSteel"
    return "coatedSteel"


def material_assignments(part_names: list[str]) -> tuple[dict[str, str], list[str]]:
    if not part_names:
        raise ValueError("source contains no named assembly parts")
    assigned = {name: assign_role(name) for name in part_names}
    if len(set(assigned.values())) < 2:
        secondary_name = next((name for name in reversed(part_names) if name.lower() not in PRIMARY_NAMES), part_names[-1])
        assigned[secondary_name] = "stainlessSteel"
    roles = [role for role in ROLE_ORDER if role in assigned.values()]
    if not 2 <= len(roles) <= 4:
        raise ValueError(f"expected 2–4 material roles, got {roles}")
    return assigned, roles


def profile_helpers() -> str:
    return '''const section = (radius:number, sides:number) => {
  let outline = path().moveTo(radius * Math.cos(Math.PI / 2), radius * Math.sin(Math.PI / 2));
  for (let k = 1; k < sides; k++) {
    const angle = Math.PI / 2 + (2 * Math.PI * k) / sides;
    outline = outline.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder = (height:number, radius:number, sides:number) => {
  const levels = [0, height * 0.08, height * 0.92, height];
  const radii = [radius * 0.9, radius, radius, radius * 0.9];
  const profiles = levels.map((_, index) => section(radii[index], sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};'''


def parameter_block(roles: list[str], original_color: str) -> str:
    lines = []
    for role in roles:
        material = MATERIALS[role]
        default = coated_default(original_color) if role == "coatedSteel" else material["default"]
        lines.append(f"const {role} = param('{role}', '{default}', {{ label: '{material['label']}' }});")
    lines.append("presets({")
    for preset in ("weathered", "highVisibility"):
        values = []
        for role in roles:
            value = MATERIALS[role][preset]
            values.append(f"{role}: '{value}'")
        lines.append(f"  {preset}: {{ {', '.join(values)} }},")
    lines.append("});")
    return "\n".join(lines)


def coated_default(original_color: str) -> str:
    red, green, blue = (int(original_color[index:index + 2], 16) / 255 for index in (1, 3, 5))
    hue, saturation, value = colorsys.rgb_to_hsv(red, green, blue)
    saturation = min(0.72, max(0.4, saturation * 1.5))
    value = min(0.9, max(0.66, value * 1.05))
    rgb = colorsys.hsv_to_rgb(hue, saturation, value)
    return "#" + "".join(f"{round(channel * 255):02x}" for channel in rgb)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write source and before-preview copies")
    args = parser.parse_args()

    asset_files = sorted(KIT.glob("*.kcad.ts"))
    if len(asset_files) != 50:
        raise SystemExit(f"expected the existing 50 mining sources, found {len(asset_files)}")

    plans = []
    for path in asset_files:
        asset_id = path.name.removesuffix(".kcad.ts")
        source = path.read_text()
        if "const color = param('color'" not in source:
            raise SystemExit(f"already promoted or unexpected source format: {path}")
        title_match = re.search(r'^  title: "([^"]+)"\s*,?$', source, re.M)
        description_match = re.search(r'^  description: "([^"]+)"\s*,?$', source, re.M)
        color_match = re.search(r"const color = param\('color',\s*(\"#[0-9a-fA-F]{6}\"|'#[0-9a-fA-F]{6}')", source)
        if not title_match or not description_match or not color_match:
            raise SystemExit(f"missing expected title, description, or hex color parameter: {path}")
        title = title_match.group(1)
        old_description = description_match.group(1)
        short_description = old_description.removesuffix(" Knobs: overall scale and asset color.").rstrip(".")
        original_color = color_match.group(1).strip("\"'")
        names = []
        for line in source.splitlines():
            if "p.part(" not in line or ".color(color)" not in line:
                continue
            match = re.search(r'p\.part\(\s*(?:"([^"]+)"|\'([^\']+)\'|`([^`]+)`)', line)
            if not match:
                raise SystemExit(f"could not read part name in {path}: {line}")
            names.append(next(group for group in match.groups() if group is not None))
        if not names:
            raise SystemExit(f"no colored named parts found: {path}")
        assignments, roles = material_assignments(names + ADDED_PART_NAMES.get(asset_id, []))
        plans.append({
            "path": path,
            "assetId": asset_id,
            "source": source,
            "title": title,
            "shortDescription": short_description,
            "originalColor": original_color,
            "assignments": assignments,
            "sourcePartNames": names,
            "roles": roles,
        })

    if not args.write:
        print(f"dry-run: {len(plans)} existing mining assets; {sum(len(p['roles']) for p in plans)} material controls")
        for plan in plans:
            print(f"{plan['assetId']}: {', '.join(plan['roles'])}")
        return

    before_dir = BUNDLE / "before"
    before_dir.mkdir(parents=True, exist_ok=True)
    total_controls = 0
    role_counts: Counter[str] = Counter()
    lofted_sources = 0
    records = []

    for plan in plans:
        path = plan["path"]
        asset_id = plan["assetId"]
        source = plan["source"]
        preview = KIT / "previews" / f"{asset_id}.png"
        if not preview.is_file():
            raise SystemExit(f"cannot preserve missing pre-promotion preview: {preview}")
        before_preview = before_dir / preview.name
        if not before_preview.exists():
            shutil.copy2(preview, before_preview)

        labels = [MATERIALS[role]["label"].lower() for role in plan["roles"]]
        description = (
            f"{plan['shortDescription']}. Controls: overall scale, "
            f"{', '.join(labels)}; weathered and highVisibility presets."
        )
        source = re.sub(
            r'^  description: "[^"]+"\s*,?$',
            f'  description: "{description}",',
            source,
            count=1,
            flags=re.M,
        )
        source = re.sub(
            r'^// Original low-poly mining scene prop, millimetres, Z up, base at z = 0\.$',
            f"// {plan['title']}: {plan['shortDescription']}. Low-poly visualization geometry in millimetres, Z up.",
            source,
            count=1,
            flags=re.M,
        )
        source = re.sub(
            r"^const color = .*;$",
            parameter_block(plan["roles"], plan["originalColor"]),
            source,
            count=1,
            flags=re.M,
        )
        if "const color = param('color'" in source:
            raise SystemExit(f"failed to replace generic color in {path}")

        replaced = set()
        lines = []
        for line in source.splitlines():
            if "p.part(" in line and ".color(color)" in line:
                match = re.search(r'p\.part\(\s*(?:"([^"]+)"|\'([^\']+)\'|`([^`]+)`)', line)
                if not match:
                    raise SystemExit(f"could not map colored part in {path}: {line}")
                part_name = next(group for group in match.groups() if group is not None)
                role = plan["assignments"][part_name]
                line = line.replace(".color(color)", f".color({role})")
                replaced.add(part_name)
            lines.append(line)
        if replaced != set(plan["sourcePartNames"]):
            raise SystemExit(f"part color mapping mismatch for {path}: {replaced ^ set(plan['sourcePartNames'])}")
        source = "\n".join(lines) + "\n"

        if "path().moveTo" in source or "const section =" in source:
            raise SystemExit(f"unexpected existing profile helper in {path}")
        b_match = re.search(r"^const b=.*;$", source, re.M)
        if not b_match:
            raise SystemExit(f"missing box helper in {path}")
        source = source[:b_match.end()] + "\n" + profile_helpers() + source[b_match.end():]
        if "cylinder(" not in source:
            raise SystemExit(f"no cylinder helper to profile in {path}")
        source = source.replace("cylinder(", "loftCylinder(")
        if "const loftCylinder =" not in source or ".loft(" not in source:
            raise SystemExit(f"lofted profile not installed in {path}")
        if ".color(color)" in source:
            raise SystemExit(f"generic color use remains in {path}")
        if asset_id == "continuous-miner":
            extras = '''
for (let shoe = 0; shoe < 10; shoe++) {
  const x = -500 + shoe * 90;
  p.part(`left-track-shoe-${shoe + 1}`, b(x,-320,35,72,16,72).color(stainlessSteel));
  p.part(`right-track-shoe-${shoe + 1}`, b(x,320,35,72,16,72).color(stainlessSteel));
}
for (let pick = 0; pick < 10; pick++) {
  const angle = (2 * Math.PI * pick) / 10;
  const x = 440 + 170 * Math.cos(angle);
  const z = 225 + 170 * Math.sin(angle);
  p.part(`cutting-pick-${pick + 1}`, box(42,44,32,true).rotateY((360 * pick) / 10).translate(x,0,z-baseZ).scale(scale).color(stainlessSteel));
}'''
            source = source.replace("\nreturn p.model();", extras + "\n\nreturn p.model();", 1)
        elif asset_id == "mine-locomotive":
            extras = '''
p.part("cab-side-window-near", b(-190,-166,390,220,14,120).color(instrumentGlass));
p.part("cab-side-window-far", b(-190,166,390,220,14,120).color(instrumentGlass));
p.part("cab-front-window", b(-9,0,390,14,190,120).color(instrumentGlass));'''
            source = source.replace("\nreturn p.model();", extras + "\n\nreturn p.model();", 1)
        if "return p.model();" not in source:
            raise SystemExit(f"could not insert machine-specific geometry in {path}")
        path.write_text(source)

        for role in plan["roles"]:
            role_counts[role] += 1
        total_controls += len(plan["roles"])
        lofted_sources += 1
        records.append({
            "id": asset_id,
            "materialControls": plan["roles"],
            "partAssignments": plan["assignments"],
            "presets": ["weathered", "highVisibility"],
            "loftProfiledCylinders": True,
        })

    ids = [record["id"] for record in records]
    (BUNDLE / "preview-asset-ids.txt").write_text("\n".join(ids) + "\n")
    report = {
        "kit": "mining",
        "assetsPromoted": len(records),
        "newAssetIds": 0,
        "materialControls": total_controls,
        "controlsPerAsset": {
            "min": min(len(record["materialControls"]) for record in records),
            "max": max(len(record["materialControls"]) for record in records),
        },
        "materialRoleAssetCounts": dict(role_counts),
        "presetEntries": len(records) * 2,
        "loftProfiledSources": lofted_sources,
        "records": records,
    }
    (BUNDLE / "promotion-output.json").write_text(json.dumps(report, indent=2) + "\n")
    print(
        f"promoted {len(records)} existing assets; added 0 IDs; {total_controls} material controls; "
        f"{len(records) * 2} named preset entries; lofted cylindrical profiles in {lofted_sources} sources"
    )


if __name__ == "__main__":
    main()
