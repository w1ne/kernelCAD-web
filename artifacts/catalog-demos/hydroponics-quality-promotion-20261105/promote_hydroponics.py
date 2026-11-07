#!/usr/bin/env python3
"""Promote the existing hydroponics sources without adding asset IDs."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/hydroponics"
BUNDLE = Path(__file__).resolve().parent

ROLE_ORDER = [
    "powderCoatedSteel",
    "stainlessSteel",
    "pvc",
    "polymer",
    "rubber",
    "glass",
    "polycarbonate",
    "polyethylene",
    "growSubstrate",
    "safetyAmber",
]

MATERIALS = {
    "powderCoatedSteel": {"label": "Powder-coated steel", "default": "#557b70", "weathered": "#69766e", "highVisibility": "#e87832"},
    "stainlessSteel": {"label": "Stainless steel", "default": "#b2c0bf", "weathered": "#929e9c", "highVisibility": "#d6dfdc"},
    "pvc": {"label": "PVC", "default": "#c7d4ca", "weathered": "#b2bcae", "highVisibility": "#ead789"},
    "polymer": {"label": "Polymer", "default": "#ddd8c7", "weathered": "#b4b5aa", "highVisibility": "#f2c84b"},
    "rubber": {"label": "Rubber", "default": "#323a3d", "weathered": "#4b504e", "highVisibility": "#262d30"},
    "glass": {"label": "Instrument glass", "default": "#51afc1", "weathered": "#548e98", "highVisibility": "#38c5dc"},
    "polycarbonate": {"label": "Polycarbonate", "default": "#8ccbd1", "weathered": "#83aeb1", "highVisibility": "#b6edf0"},
    "polyethylene": {"label": "Greenhouse polyethylene", "default": "#bddbd0", "weathered": "#a9bdb5", "highVisibility": "#e0f2e9"},
    "growSubstrate": {"label": "Grow substrate", "default": "#8a6848", "weathered": "#75604b", "highVisibility": "#aa8652"},
    "safetyAmber": {"label": "Safety amber", "default": "#e4a52e", "weathered": "#b9842f", "highVisibility": "#ffd139"},
}

STRUCTURAL = ("frame", "rail", "post", "mast", "beam", "brace", "support", "foot", "leg", "base", "skid", "bracket", "mount", "hanger", "stand", "guard", "crossbar", "plinth", "suspension", "tension-anchor")
PLUMBING = ("pipe", "tube", "header", "riser", "drain", "inlet", "outlet", "feed", "return", "branch", "union", "nozzle", "valve", "elbow", "cleanout", "irrigation-line", "lateral", "stub", "pickup", "drop", "flow-cell")
CONTAINERS = ("bucket", "tray", "channel", "gutter", "trough", "tank", "reservoir", "vessel", "cup", "pot", "raft", "slab", "curtain", "cover", "lid", "door", "cabinet", "housing", "case", "panel", "body", "canister", "chamber", "screen", "filter", "pad-core", "plug", "float", "collar", "meter", "controller", "console", "knob", "button", "handle", "selector", "louvre", "louver", "cap", "nameplate", "label", "control-box", "service-panel", "sump")


def role_for(asset_id: str, part_name: str) -> str:
    name = part_name.lower()
    if "polyethylene-roof" in name:
        return "polyethylene"
    if asset_id == "propagation-plug-tray" and name.startswith("cell-row"):
        return "growSubstrate"
    if asset_id == "propagation-plug-tray" and name.startswith("carry-grip"):
        return "polymer"
    if "clamp" in name:
        return "stainlessSteel"
    if "display" in name or name == "screen" or "lens" in name or name.startswith("lamp-"):
        return "glass"
    if "light-diffuser" in name:
        return "polycarbonate"
    if "blade" in name:
        return "polymer"
    if "coupling-guard" in name:
        return "powderCoatedSteel"
    if any(token in name for token in ("fan-hub", "fan-guard", "rotor", "motor", "pump-volute", "motor-endcap", "shaft", "agitator", "probe", "electrode", "meter-head", "tip", "stainless")):
        return "stainlessSteel" if any(token in name for token in ("shaft", "agitator", "probe", "electrode", "tip")) else "powderCoatedSteel"
    if any(token in name for token in ("rubber", "coupling", "caster", "gasket", "roller", "tubing")):
        return "rubber"
    if any(token in name for token in ("substrate", "coir", "media", "pad-core")):
        return "growSubstrate"
    if any(token in name for token in ("button", "selector", "warning", "signal-stack")):
        return "safetyAmber"
    if any(token in name for token in PLUMBING):
        # Hydroponic feed and return lines are shown as PVC, while sensors and
        # moving shafts above retain their metal finish.
        return "pvc"
    if any(token in name for token in STRUCTURAL):
        return "powderCoatedSteel"
    if any(token in name for token in CONTAINERS):
        return "polymer"
    if asset_id in {"seedling-transplant-tool", "plant-support-clip-rack"} and any(token in name for token in ("clip", "grip")):
        return "polymer"
    return "polymer"


def compact_roles(asset_id: str, part_names: list[str]) -> tuple[dict[str, str], list[str]]:
    assigned = {name: role_for(asset_id, name) for name in part_names}
    counts = Counter(assigned.values())
    if len(counts) < 2:
        candidate = next((name for name in reversed(part_names) if name not in {"body", "shell", "tank", "vessel"}), part_names[-1])
        alternate = "stainlessSteel" if counts.most_common(1)[0][0] in {"polymer", "pvc"} else "polymer"
        assigned[candidate] = alternate
        counts = Counter(assigned.values())

    if len(counts) > 4:
        keep = sorted(counts, key=lambda role: (-counts[role], ROLE_ORDER.index(role)))[:4]
        fallback = "polymer" if "polymer" in keep else keep[0]
        assigned = {name: role if role in keep else fallback for name, role in assigned.items()}
        counts = Counter(assigned.values())

    if not 2 <= len(counts) <= 4:
        raise ValueError(f"{asset_id}: expected 2–4 material roles, got {sorted(counts)}")
    return assigned, [role for role in ROLE_ORDER if role in counts]


def profile_helpers() -> str:
    return '''const section=(radius:number,sides:number)=>{
  let outline=path().moveTo(radius*Math.cos(Math.PI/2),radius*Math.sin(Math.PI/2));
  for(let k=1;k<sides;k++){
    const angle=Math.PI/2+(2*Math.PI*k)/sides;
    outline=outline.lineTo(radius*Math.cos(angle),radius*Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder=(height:number,radius:number,sides:number)=>{
  const levels=[0,height*0.08,height*0.92,height];
  const radii=[radius*0.9,radius,radius,radius*0.9];
  const profiles=levels.map((_,index)=>section(radii[index],sides));
  return profiles[0].loft(profiles.slice(1),{
    planes:levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  });
};
const c=(x:number,y:number,z:number,h:number,r:number,s:number)=>loftCylinder(h,r,s).translate(x,y,z).scale(scale);'''


def swept_blade_helper() -> str:
    return '''
const sweptBlade=(angle:number,centerZ:number,faceY:number,inside:number,outside:number,width:number)=>{
  const profile=path().moveTo(inside,-width*0.45)
    .lineTo(inside+55,-width*0.55)
    .lineTo(outside,-width*0.1)
    .lineTo(outside-30,width*0.5)
    .lineTo(inside+35,width*0.6)
    .lineTo(inside,width*0.35).close();
  return profile.extrude(36).rotateZ(angle).rotateX(90).translate(0,faceY,centerZ).scale(scale);
};'''


def tunnel_roof_helper() -> str:
    return '''
const tunnelRoof=()=>{
  const steps=16;
  let profile=path().moveTo(-750,2250);
  for(let i=1;i<=steps;i++){
    const angle=Math.PI*i/steps;
    profile=profile.lineTo(-750+1500*i/steps,2250+700*Math.sin(angle));
  }
  for(let i=steps;i>=0;i--){
    const angle=Math.PI*i/steps;
    profile=profile.lineTo(-720+1440*i/steps,2250+640*Math.sin(angle));
  }
  return profile.close().extrude(2860).rotateX(90).translate(0,1430,0).scale(scale);
};'''


def parameter_block(roles: list[str]) -> str:
    lines = [
        f"const {role}=param('{role}','{MATERIALS[role]['default']}',{{label:'{MATERIALS[role]['label']}'}});"
        for role in roles
    ]
    lines.append("presets({")
    for preset in ("weathered", "highVisibility"):
        values = ", ".join(f"{role}:'{MATERIALS[role][preset]}'" for role in roles)
        lines.append(f"  {preset}: {{{values}}},")
    lines.append("});")
    return "\n".join(lines)


def extra_parts(asset_id: str, roles: dict[str, str]) -> list[str]:
    if asset_id == "greenhouse-tunnel-bay":
        return [f'p.part("polyethylene-roof",tunnelRoof().color({roles["polyethylene-roof"]}));']
    if asset_id == "greenhouse-circulation-fan":
        blade_role = roles["blade-north"]
        return [
            f'p.part("blade-north",sweptBlade(0,1320,-24,82,325,98).color({blade_role}));',
            f'p.part("blade-southwest",sweptBlade(120,1320,-24,82,325,98).color({roles["blade-southwest"]}));',
            f'p.part("blade-southeast",sweptBlade(240,1320,-24,82,325,98).color({roles["blade-southeast"]}));',
        ]
    if asset_id == "circulation-pump-skid":
        support = roles["pump-support-near"]
        return [
            f'p.part("pump-support-near",b(260,-85,80,120,70,140).color({support}));',
            f'p.part("pump-support-far",b(260,85,80,120,70,140).color({roles["pump-support-far"]}));',
        ]
    if asset_id == "greenhouse-exhaust-fan":
        steel = roles["outer-frame-top"]
        inner = roles["inner-frame-top"]
        blade = roles["blade-a"]
        return [
            f'p.part("motor-housing",loftCylinder(220,90,10).rotateX(-90).translate(0,60,525).scale(scale).color({roles["motor-housing"]}));',
            f'p.part("motor-shaft",loftCylinder(160,18,8).rotateX(-90).translate(0,-100,525).scale(scale).color({roles["motor-shaft"]}));',
            f'p.part("outer-frame-top",b(0,0,990,1050,250,60).color({steel}));',
            f'p.part("outer-frame-bottom",b(0,0,0,1050,250,60).color({steel}));',
            f'p.part("outer-frame-left",b(-495,0,0,60,250,1050).color({steel}));',
            f'p.part("outer-frame-right",b(495,0,0,60,250,1050).color({steel}));',
            f'p.part("inner-frame-top",b(0,-140,890,850,35,50).color({inner}));',
            f'p.part("inner-frame-bottom",b(0,-140,90,850,35,50).color({inner}));',
            f'p.part("inner-frame-left",b(-400,-140,90,50,35,850).color({inner}));',
            f'p.part("inner-frame-right",b(400,-140,90,50,35,850).color({inner}));',
            f'p.part("blade-a",sweptBlade(45,525,-92,118,345,108).color({blade}));',
            f'p.part("blade-b",sweptBlade(135,525,-92,118,345,108).color({roles["blade-b"]}));',
            f'p.part("blade-c",sweptBlade(225,525,-92,118,345,108).color({roles["blade-c"]}));',
            f'p.part("blade-d",sweptBlade(315,525,-92,118,345,108).color({roles["blade-d"]}));',
        ]
    return []


def update_asset(source: str, asset_id: str) -> tuple[str, dict]:
    if "const color = param('color'" not in source or ".color(color)" not in source:
        raise ValueError(f"unexpected or previously promoted source for {asset_id}")
    title_match = re.search(r'^  title: "([^"]+)"\s*,?$', source, re.M)
    description_match = re.search(r'^  description: "([^"]+)"\s*,?$', source, re.M)
    if not title_match or not description_match:
        raise ValueError(f"missing title or description for {asset_id}")
    title = title_match.group(1)
    description = description_match.group(1)
    short = description.removesuffix(" Stylized scene geometry. Knobs: overall scale and asset color.").rstrip(".")
    if asset_id == "greenhouse-tunnel-bay":
        short = "Compact hoop-house bay with perimeter posts, a ridge beam, front-door opening, vent curb and curved polyethylene roof"
    elif asset_id == "circulation-pump-skid":
        short = "Recirculation pump skid with a cylindrical motor and volute, axial coupling guard, inlet flange and discharge riser"
    elif asset_id == "greenhouse-circulation-fan":
        short = "Floor-stand circulation fan with an upright circular guard, swept rotor blades, vertical mast and broad base"
    elif asset_id == "greenhouse-exhaust-fan":
        short = "Wall exhaust module with an open square mounting frame, four swept rotor blades, rear motor and central drive hub"

    part_names = re.findall(r'^p\.part\("([^"]+)"', source, re.M)
    removed = set()
    if asset_id == "greenhouse-tunnel-bay":
        part_names.append("polyethylene-roof")
    if asset_id == "greenhouse-circulation-fan":
        removed = {"blade-horizontal", "blade-vertical"}
        part_names = [name for name in part_names if name not in removed]
        part_names.extend(["blade-north", "blade-southwest", "blade-southeast"])
    if asset_id == "greenhouse-exhaust-fan":
        removed = {"outer-frame", "inner-frame", "blade-left", "blade-right", "blade-upper", "blade-lower", "motor-bracket"}
        part_names = [name for name in part_names if name not in removed]
        part_names.extend([
            "outer-frame-top", "outer-frame-bottom", "outer-frame-left", "outer-frame-right",
            "inner-frame-top", "inner-frame-bottom", "inner-frame-left", "inner-frame-right",
            "blade-a", "blade-b", "blade-c", "blade-d", "motor-housing", "motor-shaft",
        ])
    if asset_id == "circulation-pump-skid":
        removed = {"pump-support"}
        part_names = [name for name in part_names if name not in removed]
        part_names.extend(["pump-support-near", "pump-support-far"])

    assignments, roles = compact_roles(asset_id, part_names)
    # The tunnel film is a dedicated greenhouse material and should remain
    # independently editable even when the other parts use three materials.
    if asset_id == "greenhouse-tunnel-bay" and "polyethylene" not in roles:
        if len(roles) == 4:
            dropped = next((role for role in ("polymer", "pvc", "rubber", "safetyAmber") if role in roles), None)
            if dropped is None:
                raise ValueError("cannot make room for greenhouse polyethylene control")
            roles.remove(dropped)
            assignments = {name: ("powderCoatedSteel" if role == dropped else role) for name, role in assignments.items()}
        roles.append("polyethylene")

    params_text = ", ".join(["overall scale", *(MATERIALS[role]["label"].lower() for role in roles)])
    new_description = f"{short}. Parameters: {params_text}; weathered and highVisibility presets."
    source = re.sub(r'^  description: "[^"]+"\s*,?$', f'  description: "{new_description}",', source, count=1, flags=re.M)
    source = re.sub(
        r'^// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0\.$',
        f"// {title}: {short}. Low-poly visualization geometry in millimetres, Z up.",
        source,
        count=1,
        flags=re.M,
    )
    source = re.sub(r"^const color = .*;$", parameter_block(roles), source, count=1, flags=re.M)
    source = re.sub(
        r"^const c\s*=\s*\(x:number,y:number,z:number,h:number,r:number,s:number\)\s*=>\s*cylinder\(h,r,s\)\.translate\(x,y,z\)\.scale\(scale\);$",
        profile_helpers(),
        source,
        count=1,
        flags=re.M,
    )
    if "const loftCylinder" not in source:
        raise ValueError(f"failed to add profiled cylindrical forms to {asset_id}")
    if asset_id in {"circulation-pump-skid", "greenhouse-exhaust-fan"}:
        source = re.sub(r"^const c=.*;\n", "", source, count=1, flags=re.M)
    if asset_id in {"greenhouse-circulation-fan", "greenhouse-exhaust-fan"}:
        source = source.replace("\nconst p = assembly(", swept_blade_helper() + "\n\nconst p = assembly(", 1)
    if asset_id == "greenhouse-tunnel-bay":
        source = source.replace("\nconst p = assembly(", tunnel_roof_helper() + "\n\nconst p = assembly(", 1)

    lines = []
    for line in source.splitlines():
        match = re.match(r'^(\s*p\.part\("([^"]+)",)(.*)\.color\(color\)\);$', line)
        if not match:
            if ".color(color)" in line:
                raise ValueError(f"unhandled material expression in {asset_id}: {line}")
            lines.append(line)
            continue
        name = match.group(2)
        if name in removed:
            continue
        expression = match.group(3)
        if asset_id == "greenhouse-circulation-fan":
            if name == "fan-guard":
                expression = "loftCylinder(55,380,10).rotateX(90).translate(0,0,1320).scale(scale)"
            elif name == "hub":
                expression = "loftCylinder(100,85,10).rotateX(90).translate(0,-25,1320).scale(scale)"
            elif name == "guard-crossbar-a":
                expression = "b(0,-40,1320,620,34,34)"
            elif name == "guard-crossbar-b":
                expression = "b(0,-40,1320,34,34,620)"
        elif asset_id == "greenhouse-exhaust-fan":
            if name == "fan-hub":
                expression = "loftCylinder(72,125,10).rotateX(90).translate(0,-82,525).scale(scale)"
            elif name.startswith("corner-boss-"):
                x = "-470" if name.endswith("left") else "470"
                expression = f"loftCylinder(90,48,10).rotateX(90).translate({x},-145,48).scale(scale)"
        elif asset_id == "circulation-pump-skid":
            if name == "motor-block":
                expression = "loftCylinder(300,150,10).rotateY(90).translate(-340,0,235).scale(scale)"
            elif name == "coupling-guard":
                expression = "loftCylinder(210,78,10).rotateY(90).translate(-40,0,285).scale(scale)"
            elif name == "pump-volute":
                expression = "loftCylinder(180,125,10).rotateY(90).translate(170,0,305).scale(scale)"
            elif name == "motor-endcap":
                expression = "loftCylinder(30,148,10).rotateY(90).translate(-370,0,235).scale(scale)"
            elif name == "inlet-pipe":
                expression = "loftCylinder(260,35,10).rotateY(90).translate(340,-50,175).scale(scale)"
            elif name == "inlet-flange":
                expression = "loftCylinder(65,78,10).rotateY(90).translate(500,-50,175).scale(scale)"
        role = assignments[name]
        lines.append(f"{match.group(1)}{expression}.color({role}));")

    source = "\n".join(lines) + "\n"
    extras = extra_parts(asset_id, assignments)
    if extras:
        marker = "return p.model();"
        if source.count(marker) != 1:
            raise ValueError(f"expected one return statement in {asset_id}")
        source = source.replace(marker, "\n".join(extras) + "\n\n" + marker)

    if asset_id == "greenhouse-tunnel-bay" and "tunnelRoof().color(polyethylene)" not in source:
        raise ValueError("curved greenhouse polyethylene roof was not added")
    if asset_id in {"greenhouse-circulation-fan", "greenhouse-exhaust-fan"} and "sweptBlade(" not in source:
        raise ValueError(f"swept fan blades were not added to {asset_id}")
    if "const color =" in source or ".color(color)" in source:
        raise ValueError(f"generic color control remains in {asset_id}")
    return source, {"id": asset_id, "materials": roles, "partAssignments": assignments, "presets": ["weathered", "highVisibility"]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="validate the complete rewrite without writing files")
    args = parser.parse_args()
    asset_files = sorted(KIT.glob("*.kcad.ts"))
    if len(asset_files) != 52:
        raise SystemExit(f"expected 52 existing hydroponics sources, found {len(asset_files)}")

    records = []
    updates = []
    for path in asset_files:
        asset_id = path.name.removesuffix(".kcad.ts")
        old_source = path.read_text()
        source, record = update_asset(old_source, asset_id)
        updates.append((path, source, old_source))
        records.append(record)

    if not args.dry_run:
        for path, source, _ in updates:
            path.write_text(source)

    total_controls = sum(len(record["materials"]) for record in records)
    extra_roles = {role for record in records for role in record["materials"]}
    ids = [record["id"] for record in records]
    report = {
        "kit": "hydroponics",
        "assetsPromoted": len(records),
        "newAssetIds": 0,
        "materialControls": total_controls,
        "controlsPerAsset": {
            "min": min(len(record["materials"]) for record in records),
            "max": max(len(record["materials"]) for record in records),
        },
        "presetEntries": len(records) * 2,
        "profiledCylinderSources": sum(1 for _, source, _ in updates if "const loftCylinder" in source),
        "geometryUpgrades": [
            "Turned shoulders on the existing cylinder forms",
            "Curved polyethylene roof added to greenhouse-tunnel-bay",
            "Swept rotor blades and open frame rails added to greenhouse-exhaust-fan",
            "Swept rotor blades and upright guard added to greenhouse-circulation-fan",
            "Cylindrical motor and axial pump volute replace cuboid solids on circulation-pump-skid",
        ],
        "materialRolesUsed": sorted(extra_roles),
        "records": records,
    }
    if not args.dry_run:
        (BUNDLE / "preview-asset-ids.txt").write_text("\n".join(ids) + "\n")
        (BUNDLE / "promotion-output.json").write_text(json.dumps(report, indent=2) + "\n")
    prefix = "validated" if args.dry_run else "promoted"
    print(
        f"{prefix} {len(records)} existing assets; added 0 IDs; "
        f"{total_controls} material controls; {len(records) * 2} named preset entries"
    )


if __name__ == "__main__":
    main()
