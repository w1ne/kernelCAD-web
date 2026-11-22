#!/usr/bin/env python3
"""Promote the existing water-treatment sources in place; add no asset IDs."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/water-treatment"
BUNDLE = Path(__file__).resolve().parent

ROLE_ORDER = [
    "concrete",
    "coatedSteel",
    "structuralSteel",
    "stainlessSteel",
    "elastomer",
    "instrumentGlass",
    "filterMedia",
    "polymer",
    "warningAmber",
]

MATERIALS = {
    "concrete": {"label": "Concrete", "default": "#b8b1a1", "weathered": "#9b9587", "highVisibility": "#c6bdac"},
    "coatedSteel": {"label": "Coated equipment steel", "default": "#3d8589", "weathered": "#687b78", "highVisibility": "#e5682d"},
    "structuralSteel": {"label": "Structural steel", "default": "#68777b", "weathered": "#6e6b63", "highVisibility": "#505b60"},
    "stainlessSteel": {"label": "Stainless steel", "default": "#b5c0c0", "weathered": "#9ca7a6", "highVisibility": "#e1ddd0"},
    "elastomer": {"label": "Elastomer", "default": "#343b3e", "weathered": "#3b3d3d", "highVisibility": "#282d30"},
    "instrumentGlass": {"label": "Instrument glass", "default": "#5eb5c1", "weathered": "#548b91", "highVisibility": "#43b4c8"},
    "filterMedia": {"label": "Filter media", "default": "#96744d", "weathered": "#866f52", "highVisibility": "#a07d4f"},
    "polymer": {"label": "Polymer", "default": "#719582", "weathered": "#718477", "highVisibility": "#e4bd43"},
    "warningAmber": {"label": "Safety amber", "default": "#e8a936", "weathered": "#c28e34", "highVisibility": "#ffd138"},
}

CIVIL_ASSETS = {
    "aeration-basin",
    "bar-screen-channel",
    "circular-clarifier",
    "effluent-weir-channel",
    "equalization-basin",
    "grit-removal-chamber",
    "lamella-clarifier",
    "rapid-sand-filter",
    "sludge-thickener-tank",
    "uv-disinfection-channel",
}

CIVIL_PARTS = ("floor", "wall", "basin", "channel", "chamber", "trough", "bed", "containment", "bund", "feed-well", "launder")
STRUCTURAL_PARTS = ("frame", "base", "foot", "leg", "post", "rail", "rung", "walkway", "bridge", "beam", "brace", "skid", "support", "guard", "plinth", "tray", "pontoon")
STAINLESS_PARTS = ("pipe", "header", "flange", "port", "valve", "nozzle", "suction", "discharge", "inlet", "outlet", "vent", "drain", "tube", "chain", "shaft", "impeller", "roller", "screen", "bar-", "plate", "spool", "sensor", "tap-", "fitting", "elbow", "notch-")
GLASS_PARTS = ("display", "lamp", "sample-cell", "level-strip", "sight-glass")


def assign_role(asset_id: str, part_name: str) -> str:
    name = part_name.lower()
    if asset_id == "lamella-clarifier" and name == "plate-pack":
        return "structuralSteel"
    if any(token in name for token in GLASS_PARTS):
        return "instrumentGlass"
    if "media" in name or "carbon-bed" in name:
        return "filterMedia"
    if "membrane" in name or "diffuser-" in name:
        return "polymer"
    if "belt" in name or name == "coupling":
        return "elastomer"
    if "handwheel" in name or "tag" in name or "grip" in name:
        return "warningAmber"
    if asset_id in CIVIL_ASSETS and any(token in name for token in CIVIL_PARTS):
        return "concrete"
    if any(token in name for token in STRUCTURAL_PARTS):
        return "structuralSteel"
    if any(token in name for token in STAINLESS_PARTS):
        return "stainlessSteel"
    return "concrete" if asset_id in CIVIL_ASSETS else "coatedSteel"


def material_controls(asset_id: str, part_names: list[str]) -> tuple[dict[str, str], list[str]]:
    assigned = {name: assign_role(asset_id, name) for name in part_names}
    counts = Counter(assigned.values())
    if len(counts) < 2:
        secondary = "stainlessSteel" if "concrete" in counts else "structuralSteel"
        candidate = next((name for name in part_names if name not in {"tank", "vessel", "shell", "body", "canister"}), part_names[-1])
        assigned[candidate] = secondary
        counts = Counter(assigned.values())

    if len(counts) > 4:
        primary = "concrete" if asset_id in CIVIL_ASSETS else "coatedSteel"
        ordered = [role for role in ROLE_ORDER if role in counts]
        keep = [primary] if primary in counts else []
        keep.extend(role for role in ("structuralSteel", "stainlessSteel") if role in counts and role not in keep)
        keep.extend(role for role in ordered if role not in keep)
        selected = set(keep[:4])
        fallback = primary if primary in selected else next(role for role in ROLE_ORDER if role in selected)
        assigned = {name: role if role in selected else fallback for name, role in assigned.items()}
        counts = Counter(assigned.values())

    if not 2 <= len(counts) <= 4:
        raise ValueError(f"{asset_id}: expected 2–4 material roles, got {sorted(counts)}")
    roles = [role for role in ROLE_ORDER if role in counts]
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
};
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z).scale(scale);'''


def parameter_block(roles: list[str]) -> str:
    lines = []
    for role in roles:
        material = MATERIALS[role]
        lines.append(f"const {role} = param('{role}', '{material['default']}', {{ label: '{material['label']}' }});")
    lines.append("presets({")
    for preset in ("weathered", "highVisibility"):
        values = ", ".join(f"{role}: '{MATERIALS[role][preset]}'" for role in roles)
        lines.append(f"  {preset}: {{ {values} }},")
    lines.append("});")
    return "\n".join(lines)


def main() -> None:
    asset_files = sorted(KIT.glob("*.kcad.ts"))
    if len(asset_files) != 50:
        raise SystemExit(f"expected the existing 50 water-treatment sources, found {len(asset_files)}")

    records = []
    total_controls = 0
    lofted = 0
    for path in asset_files:
        asset_id = path.name.removesuffix(".kcad.ts")
        source = path.read_text()
        if "const color = param('color'" not in source:
            raise SystemExit(f"already promoted or unexpected source format: {path}")
        title_match = re.search(r'^  title: "([^"]+)"\s*,?$', source, re.M)
        description_match = re.search(r'^  description: "([^"]+)"\s*,?$', source, re.M)
        if not title_match or not description_match:
            raise SystemExit(f"missing title or description: {path}")
        title = title_match.group(1)
        old_description = description_match.group(1)
        short_description = old_description.removesuffix(" Knobs: overall scale and asset color.").rstrip(".")
        if asset_id == "lamella-clarifier":
            short_description = "Rectangular clarifier with inclined lamella plates supported by side rails, an inlet compartment, and a collection trough"

        part_names = re.findall(r'^p\.part\("([^"]+)"', source, re.M)
        assignments, roles = material_controls(asset_id, part_names)

        description = (
            f"{short_description}. Parameters: overall scale and "
            f"{', '.join(MATERIALS[role]['label'].lower() for role in roles)}; "
            "weathered and highVisibility presets."
        )
        source = re.sub(r'^  description: "[^"]+"\s*,?$', f'  description: "{description}",', source, flags=re.M)
        source = re.sub(r'^// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0\.$',
                        f"// {title}: {short_description}. Low-poly visualization geometry in millimetres, Z up.",
                        source, count=1, flags=re.M)

        source = re.sub(r"^const color = .*;$",
                        parameter_block(roles), source, count=1, flags=re.M)
        if "const color = param('color'" in source:
            raise SystemExit(f"failed to replace the generic color parameter in {path}")

        lines = []
        for line in source.splitlines():
            match = re.match(r'^(\s*p\.part\("([^"]+)",)(.*)\.color\(color\)\);$', line)
            if not match:
                lines.append(line)
                continue
            part_name = match.group(2)
            role = assignments[part_name]
            if asset_id == "lamella-clarifier" and part_name == "plate-pack":
                lines.append('p.part("plate-pack-side-left",b(0,-185,230,640,30,250).color(structuralSteel));')
                lines.append('p.part("plate-pack-side-right",b(0,185,230,640,30,250).color(structuralSteel));')
                continue
            expression = match.group(3)
            if asset_id == "lamella-clarifier" and part_name.startswith("plate-"):
                box_call = re.fullmatch(r'b\(([^()]*)\)', expression)
                if not box_call:
                    raise SystemExit(f"unexpected lamella plate expression in {path}: {expression}")
                expression = f"tiltedPanel({box_call.group(1)},18)"
            lines.append(f'{match.group(1)}{expression}.color({role}));')
        source = "\n".join(lines) + "\n"

        if re.search(r'^const c\s*=.*=>cylinder\(h,r,n\).*;$', source, re.M):
            source = re.sub(r'^const c\s*=.*=>cylinder\(h,r,n\).*;$', profile_helpers(), source, count=1, flags=re.M)
            lofted += 1
        elif "cylinder(" in source:
            raise SystemExit(f"unhandled cylinder helper in {path}")

        if asset_id == "lamella-clarifier":
            b_line = re.search(r'^const b=.*;$', source, re.M)
            if not b_line:
                raise SystemExit("could not find the lamella box helper")
            source = source[:b_line.end()] + "\nconst tiltedPanel=(x:number,y:number,z:number,w:number,d:number,h:number,angle:number)=>box(w,d,h,true).rotateY(angle).translate(x,y,z+h/2).scale(scale);" + source[b_line.end():]
            if 'tiltedPanel(' not in source:
                raise SystemExit("lamella plate inclination was not applied")

        if ".color(color)" in source or "const color =" in source:
            raise SystemExit(f"generic color remains in {path}")
        path.write_text(source)
        total_controls += len(roles)
        records.append({"id": asset_id, "materialControls": roles, "partAssignments": assignments, "presets": ["weathered", "highVisibility"], "loftedCylinderProfile": "const c" in source and "loftCylinder" in source})

    ids = [record["id"] for record in records]
    (BUNDLE / "preview-asset-ids.txt").write_text("\n".join(ids) + "\n")
    report = {
        "kit": "water-treatment",
        "assetsPromoted": len(records),
        "newAssetIds": 0,
        "materialControls": total_controls,
        "controlsPerAsset": {"min": min(len(record["materialControls"]) for record in records), "max": max(len(record["materialControls"]) for record in records)},
        "presetEntries": len(records) * 2,
        "loftedCylinderSilhouettes": lofted,
        "inclinedLamellaPlates": 6,
        "records": records,
    }
    (BUNDLE / "promotion-output.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"promoted {len(records)} existing assets; added 0 IDs; {total_controls} material controls; {len(records) * 2} named preset entries; {lofted} loft-profiled equipment sources")


if __name__ == "__main__":
    main()
