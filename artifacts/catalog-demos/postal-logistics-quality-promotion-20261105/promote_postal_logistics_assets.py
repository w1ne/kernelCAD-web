#!/usr/bin/env python3
"""Promote the existing postal-logistics sources in place; add no asset IDs."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/postal-logistics"
BUNDLE = Path(__file__).resolve().parent

MATERIALS = {
    "paintedSteel": {"label": "Painted steel", "weathered": "#68777a", "highVisibility": "#e36d32"},
    "structuralSteel": {"label": "Structural steel", "default": "#58656c", "weathered": "#67675f", "highVisibility": "#454f54"},
    "stainlessSteel": {"label": "Stainless steel", "default": "#bbc4c4", "weathered": "#9ea7a6", "highVisibility": "#d9e0de"},
    "rubber": {"label": "Rubber", "default": "#30373b", "weathered": "#3d3d39", "highVisibility": "#252b2e"},
    "polymer": {"label": "Moulded polymer", "default": "#477c8e", "weathered": "#6c7c7c", "highVisibility": "#e0b245"},
    "fabric": {"label": "Woven fabric", "default": "#476b7d", "weathered": "#6c6b60", "highVisibility": "#d66a35"},
    "paper": {"label": "Label paper", "default": "#eee5ca", "weathered": "#c2b99f", "highVisibility": "#fff1b7"},
    "instrumentGlass": {"label": "Instrument glass", "default": "#57b4c3", "weathered": "#548a91", "highVisibility": "#6bd0dc"},
    "safetyAmber": {"label": "Safety amber", "default": "#e7aa35", "weathered": "#bb8c34", "highVisibility": "#ffd12f"},
    "timber": {"label": "Timber", "default": "#876c4b", "weathered": "#71614b", "highVisibility": "#a27e44"},
}

PRIMARY = {
    "bulk-mail-sack": "fabric",
    "carrier-satchel": "fabric",
    "parcel-overflow-container": "polymer",
    "parcel-tray-transfer-cart": "structuralSteel",
    "postal-dispatch-cage": "timber",
    "postal-route-marker-board": "polymer",
    "postal-sortation-tray-cabinet": "structuralSteel",
    "rolling-postal-container": "structuralSteel",
}

GLASS = ("display", "screen", "window", "lens", "reader-window", "camera", "status-light")
SAFETY = ("button", "trigger", "stop", "key-", "shoe-", "warning", "guard-rail")
RUBBER = ("wheel", "caster", "tire")
FABRIC = ("sack", "bag", "satchel", "strap", "liner", "collar")
POLYMER = ("tray", "tub", "container", "hamper", "bin", "pocket", "case-body", "battery-pack")
PAPER = ("label", "paper", "route-row", "patch")
TIMBER = ("pallet", "skid-")
STRUCTURAL = ("frame", "base", "foot", "leg", "post", "rail", "beam", "brace", "support", "stand", "upright", "skid", "plinth", "crossbar", "guard", "mounting-plate", "bed-frame")
STAINLESS = ("roller", "shaft", "guide", "head", "actuator", "press-pad", "gearbox", "motor", "drive", "vent", "flange", "feed-roll", "thread-guide", "measuring-foot")


def material_for(asset_id: str, part_name: str, primary: str) -> str:
    name = part_name.lower()
    if name.startswith("screen-base-"):
        return "structuralSteel"
    if asset_id == "carrier-satchel" and name.startswith("strap-end-"):
        return "stainlessSteel"
    if any(token in name for token in GLASS):
        return "instrumentGlass"
    if any(token in name for token in SAFETY):
        return "safetyAmber"
    if any(token in name for token in RUBBER):
        return "rubber"
    if any(token in name for token in FABRIC):
        return "fabric"
    if any(token in name for token in POLYMER):
        return "polymer"
    if any(token in name for token in PAPER):
        return "paper"
    if any(token in name for token in TIMBER):
        return "timber"
    if any(token in name for token in STRUCTURAL):
        return "structuralSteel"
    if any(token in name for token in STAINLESS):
        return "stainlessSteel"
    return primary


def material_assignments(asset_id: str, part_names: list[str], primary: str) -> tuple[dict[str, str], list[str]]:
    assigned = {name: material_for(asset_id, name, primary) for name in part_names}
    counts = Counter(assigned.values())
    if len(counts) < 2:
        candidate = next((name for name in reversed(part_names) if name not in {"body", "shell", "tank"}), part_names[-1])
        assigned[candidate] = "structuralSteel" if primary != "structuralSteel" else "stainlessSteel"
        counts = Counter(assigned.values())
    if primary not in counts:
        fallback = next((name for name in part_names if assigned[name] not in {"instrumentGlass", "safetyAmber", "rubber", "paper"}), part_names[0])
        assigned[fallback] = primary
        counts = Counter(assigned.values())
    if len(counts) > 4:
        keep = [primary]
        keep.extend(role for role, _ in counts.most_common() if role != primary)
        selected = set(keep[:4])
        assigned = {name: role if role in selected else primary for name, role in assigned.items()}
        counts = Counter(assigned.values())
    roles = list(dict.fromkeys([primary, *[role for role, _ in counts.most_common() if role != primary]]))
    if not 2 <= len(roles) <= 4:
        raise ValueError(f"{asset_id}: expected 2–4 material roles, got {roles}")
    return assigned, roles


def geometry_helpers(asset_id: str, part_names: list[str], uses_cylinder: bool) -> str:
    common = '''const octRect = (w:number,d:number,cut:number) => path()
  .moveTo(-w/2+cut,-d/2).lineTo(w/2-cut,-d/2).lineTo(w/2,-d/2+cut)
  .lineTo(w/2,d/2-cut).lineTo(w/2-cut,d/2).lineTo(-w/2+cut,d/2)
  .lineTo(-w/2,d/2-cut).lineTo(-w/2,-d/2+cut).close();
const bevelled = (w:number,d:number,h:number) => {
  const edge = Math.min(w,d,h) * 0.08;
  const profiles = [
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
  ];
  const levels = [0,edge,h-edge,h];
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })),
    ruled: true,
  });
};
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => bevelled(w,d,h).translate(x,y,z).scale(scale);'''
    sections = '''const section = (radius:number,sides:number) => {
  let outline = path().moveTo(radius*Math.cos(Math.PI/2),radius*Math.sin(Math.PI/2));
  for (let k=1;k<sides;k++) { const angle=Math.PI/2+(2*Math.PI*k)/sides; outline=outline.lineTo(radius*Math.cos(angle),radius*Math.sin(angle)); }
  return outline.close();
};
const loftCylinder = (height:number,radius:number,sides:number) => {
  const levels=[0,height*0.07,height*0.93,height];
  const radii=[radius*0.88,radius,radius,radius*0.88];
  const profiles=levels.map((_,i)=>section(radii[i],sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  });
};'''
    helpers = [common]
    if any("roller" in name or name in {"label-roll", "feed-roll", "paper-roll"} for name in part_names):
        helpers.append("const rollerX=(x:number,y:number,z:number,w:number,d:number,h:number)=>loftCylinder(w,Math.min(d,h)*0.48,10).rotateY(90).translate(x-w/2,y,z+h/2).scale(scale);")
    if any(name.startswith("wheel-") or name.startswith("wheel_") for name in part_names):
        helpers.append("const wheelY=(x:number,y:number,z:number,w:number,d:number,h:number)=>{const radius=Math.min(w,h)*0.48;return loftCylinder(d,radius,10).rotateX(90).translate(x,y+d/2,z+radius).scale(scale);};")
    if uses_cylinder:
        helpers.append("const c=(x:number,y:number,z:number,h:number,r:number,s:number)=>loftCylinder(h,r,s).translate(x,y,z).scale(scale);")
    if asset_id == "carrier-satchel":
        helpers.append('''const softBag=(x:number,y:number,z:number,w:number,d:number,h:number)=>{
  const dims=[[w*0.76,d*0.78],[w,d],[w*0.94,d*0.93],[w*0.72,d*0.78]];
  const levels=[0,h*0.12,h*0.84,h];
  const profiles=dims.map(([pw,pd])=>octRect(pw,pd,Math.min(pw,pd)*0.15));
  return profiles[0].loft(profiles.slice(1), {
    planes:levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  }).translate(x,y,z).scale(scale);
};''')
    if asset_id == "handheld-postal-scanner":
        helpers.append("const tiltedY = (x:number,y:number,z:number,w:number,d:number,h:number,a:number) => bevelled(w,d,h).translate(0,0,-h/2).rotateY(a).translate(x,y,z+h/2).scale(scale);")
    if asset_id in {"telescopic-parcel-conveyor", "carrier-satchel"}:
        helpers.append("const tiltedX = (x:number,y:number,z:number,w:number,d:number,h:number,a:number) => bevelled(w,d,h).translate(0,0,-h/2).rotateX(a).translate(x,y,z+h/2).scale(scale);")
    if asset_id == "parcel-belt-diverter":
        helpers.append("const tiltedZ = (x:number,y:number,z:number,w:number,d:number,h:number,a:number) => bevelled(w,d,h).translate(0,0,-h/2).rotateZ(a).translate(x,y,z+h/2).scale(scale);")
    if uses_cylinder or any("roller" in name or name in {"label-roll", "feed-roll", "paper-roll"} for name in part_names) or any(name.startswith("wheel-") or name.startswith("wheel_") for name in part_names):
        helpers.insert(1, sections)
    return "\n".join(helpers)


def parameter_block(roles: list[str], original_color: str, primary: str) -> str:
    lines = []
    for role in roles:
        material = MATERIALS[role]
        default = original_color if role == primary else material["default"]
        lines.append(f"const {role} = param('{role}', '{default}', {{ label: '{material['label']}' }});")
    lines.append("presets({")
    for preset in ("weathered", "highVisibility"):
        values = []
        for role in roles:
            material = MATERIALS[role]
            value = material[preset] if preset in material else ("#68777a" if preset == "weathered" else "#e36d32")
            values.append(f"{role}: '{value}'")
        lines.append(f"  {preset}: {{ {', '.join(values)} }},")
    lines.append("});")
    return "\n".join(lines)


def call_arguments(expression: str, helper: str) -> list[float] | None:
    match = re.fullmatch(rf"{helper}\(([^()]*)\)", expression.strip())
    if not match:
        return None
    values = [value.strip() for value in match.group(1).split(",")]
    try:
        return [float(value) for value in values]
    except ValueError:
        return None


def compact(value: float) -> str:
    return str(int(value)) if value.is_integer() else str(value)


def geometry_expression(asset_id: str, part_name: str, expression: str) -> str:
    args = call_arguments(expression, "b")
    if args is None or len(args) != 6:
        return expression
    x,y,z,w,d,h = args
    if "roller" in part_name or part_name in {"label-roll", "feed-roll", "paper-roll"}:
        return f"rollerX({','.join(compact(v) for v in args)})"
    if part_name.startswith("wheel-") or part_name.startswith("wheel_"):
        return f"wheelY({','.join(compact(v) for v in args)})"
    if asset_id == "carrier-satchel" and part_name == "bag-body":
        return f"softBag({','.join(compact(v) for v in args)})"
    if asset_id == "carrier-satchel" and part_name == "flap":
        return f"tiltedX({','.join(compact(v) for v in args)},25)"
    if asset_id == "carrier-satchel" and part_name in {"strap-left", "strap-right", "shoulder-strap", "strap-end-left", "strap-end-right"}:
        front_y = -146 if part_name.startswith("strap-end-") else -132
        return f"b({compact(x)},{front_y},{compact(z)},{compact(w)},{compact(d)},{compact(h)})"
    if asset_id == "handheld-postal-scanner" and part_name == "handle":
        return f"tiltedY({','.join(compact(v) for v in args)},-10)"
    if asset_id == "telescopic-parcel-conveyor" and part_name in {"lower-boom", "middle-boom", "inner-boom"}:
        return f"tiltedX({','.join(compact(v) for v in args)},5)"
    if asset_id == "parcel-belt-diverter" and part_name == "pusher-arm":
        return f"tiltedZ({','.join(compact(v) for v in args)},-12)"
    return expression


def main() -> None:
    asset_files = sorted(KIT.glob("*.kcad.ts"))
    if len(asset_files) != 52:
        raise SystemExit(f"expected 52 existing postal-logistics sources, found {len(asset_files)}")

    records = []
    total_controls = 0
    geometry_changes = Counter()
    for path in asset_files:
        asset_id = path.name.removesuffix(".kcad.ts")
        source = path.read_text()
        if "const color = param('color'" not in source:
            raise SystemExit(f"already promoted or unexpected source format: {path}")
        title_match = re.search(r'^  title: (".*")\s*,?$', source, re.M)
        description_match = re.search(r'^  description: (".*")\s*,?$', source, re.M)
        color_match = re.search(r"^const color = param\('color', (\".*?\"|'.*?'),", source, re.M)
        if not title_match or not description_match or not color_match:
            raise SystemExit(f"missing title, description or original color: {path}")
        title = json.loads(title_match.group(1))
        old_description = json.loads(description_match.group(1))
        original_color = json.loads(color_match.group(1))
        short_description = old_description.removesuffix(" Stylized scene geometry. Knobs: overall scale and asset color.").rstrip(".")
        part_names = re.findall(r'^p\.part\("([^"]+)"', source, re.M)
        assignments, roles = material_assignments(asset_id, part_names, PRIMARY.get(asset_id, "paintedSteel"))
        primary = PRIMARY.get(asset_id, "paintedSteel")
        labels = ", ".join(MATERIALS[role]["label"].lower() for role in roles)
        description = f"{short_description}. Scale, {labels}, and weathered or highVisibility finish presets are editable."
        source = re.sub(r'^  description: ".*"\s*,?$', f"  description: {json.dumps(description)},", source, flags=re.M)
        source = re.sub(
            r'^// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0\.$',
            f"// {title}: {short_description}. Low-poly visualization geometry in millimetres, Z up.",
            source,
            count=1,
            flags=re.M,
        )
        source = re.sub(r"^const color = param\('color'.*;$", parameter_block(roles, original_color, primary), source, count=1, flags=re.M)
        if "const color = param('color'" in source:
            raise SystemExit(f"failed to replace generic color in {path}")

        lines = []
        for line in source.splitlines():
            match = re.match(r'^(\s*p\.part\("([^"]+)"\s*,\s*)(.*)\.color\(color\)\);$', line)
            if not match:
                lines.append(line)
                continue
            name = match.group(2)
            expression = match.group(3)
            improved = geometry_expression(asset_id, name, expression)
            if improved != expression:
                geometry_changes[asset_id] += 1
            lines.append(f"{match.group(1)}{improved}.color({assignments[name]}));")
        source = "\n".join(lines) + "\n"

        old_c = re.search(r"^const c = .*=> cylinder\(h,r,s\).*;$", source, re.M)
        helper = geometry_helpers(asset_id, part_names, old_c is not None)
        has_wheels = any(name.startswith("wheel-") or name.startswith("wheel_") for name in part_names)
        if has_wheels:
            # The lofted wheel helper places its round profile on the source box's ground plane.
            geometry_changes[asset_id] += 1
        source = re.sub(r"^const b = .*;$", helper, source, count=1, flags=re.M)
        # A few original files also declare the vertical cylinder helper; replace it with the lofted profile helper.
        source = re.sub(r"^const c = .*=> cylinder\(h,r,s\).*;$", "", source, flags=re.M)
        if "const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(" in source:
            raise SystemExit(f"failed to replace box helper in {path}")
        if ".color(color)" in source or "const color =" in source:
            raise SystemExit(f"generic color remains in {path}")
        path.write_text(source)
        total_controls += len(roles)
        records.append({
            "id": asset_id,
            "title": title,
            "materialControls": roles,
            "partAssignments": assignments,
            "presets": ["weathered", "highVisibility"],
            "geometryChanges": geometry_changes[asset_id],
        })

    ids = [record["id"] for record in records]
    (BUNDLE / "preview-asset-ids.txt").write_text("\n".join(ids) + "\n")
    report = {
        "kit": "postal-logistics",
        "assetsPromoted": len(records),
        "newAssetIds": 0,
        "materialControls": total_controls,
        "controlsPerAsset": {"min": min(len(record["materialControls"]) for record in records), "max": max(len(record["materialControls"]) for record in records)},
        "presetEntries": len(records) * 2,
        "assetsWithLoftedChamferGeometry": len(records),
        "geometryOrPlacementChanges": sum(geometry_changes.values()),
        "casterPlacementCorrections": [
            record["id"] for record in records
            if any(
                name.startswith("wheel-") or name.startswith("wheel_")
                for name in re.findall(r'^p\.part\("([^"]+)"', (KIT / f"{record['id']}.kcad.ts").read_text(), re.M)
            )
        ],
        "geometryChangesByAsset": dict(sorted(geometry_changes.items())),
        "records": records,
    }
    (BUNDLE / "promotion-output.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"promoted {len(records)} existing assets; added 0 IDs; {total_controls} material controls; {len(records)*2} preset entries; {len(records)} sources use lofted chamfer geometry; {sum(geometry_changes.values())} geometry or placement changes")


if __name__ == "__main__":
    main()
