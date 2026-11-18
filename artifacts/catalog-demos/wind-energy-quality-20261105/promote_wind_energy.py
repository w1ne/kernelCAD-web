#!/usr/bin/env python3
"""Promote the 50 wind-energy catalog sources from flat colour to materials.

Run after generate_wind_assets.py to restore the original single-colour wave:

    python3 artifacts/catalog-demos/wind-energy-wave-20261103/generate_wind_assets.py
    python3 artifacts/catalog-demos/wind-energy-quality-20261105/promote_wind_energy.py

The script retains the original source dimensions and adds material-separated
parts, useful appearance presets, and tapered/planform turbine geometry.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/wind-energy"
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
TRIANGLES = {
    row["id"]: row["stats"]["triangles"]
    for row in INDEX["assets"]
    if row["kit"] == "wind-energy"
}

TURBINES = {
    "horizontal-axis-wind-turbine",
    "offshore-wind-turbine",
    "rooftop-wind-turbine",
    "small-farm-wind-turbine",
}
FOUNDATIONS = {
    "foundation-anchor-cage",
    "foundation-inspection-hatch",
    "monopile-foundation",
    "tower-base-flange",
    "transition-piece",
    "turbine-base-skirt",
}
ELECTRICAL = {
    "aviation-light",
    "converter-cabinet",
    "grounding-busbar",
    "oil-cooler-module",
    "substation-switchgear-kiosk",
    "turbine-control-cabinet",
    "turbine-junction-box",
    "wind-farm-meter-pedestal",
    "wind-farm-pad-mount-transformer",
}
TRANSPORT = {
    "blade-root-lifting-yoke",
    "blade-transport-saddle",
    "cable-reel-stand",
    "maintenance-tool-cart",
    "nacelle-transport-frame",
    "torque-tool-case",
    "tower-transport-saddle",
}
SITE = {
    "access-ladder-cage",
    "access-platform-ring",
    "nacelle-service-platform",
    "service-lift-cage",
    "service-shelter",
    "turbine-base-steps",
    "turbine-door-frame",
    "turbine-number-placard",
    "wind-farm-access-gate",
    "wind-farm-warning-sign",
    "wind-site-bollard",
}

PALETTES: dict[str, tuple[str, str]] = {
    "paintedSteel": ("Painted steel", "#53727c"),
    "powderCoatedSteel": ("Powder-coated steel", "#287082"),
    "galvanizedSteel": ("Galvanized steel", "#8b9c9e"),
    "structuralSteel": ("Structural steel", "#556971"),
    "marineSteel": ("Marine steel", "#335868"),
    "castSteel": ("Cast steel", "#59666b"),
    "fiberglassComposite": ("Fiberglass composite", "#e7ebe1"),
    "stainlessSteel": ("Stainless steel", "#b8c2c5"),
    "concrete": ("Concrete", "#8b8c84"),
    "safetyPaint": ("Safety paint", "#efb532"),
    "polycarbonate": ("Polycarbonate", "#d8b546"),
    "copper": ("Copper", "#b7734e"),
    "ceramic": ("Electrical ceramic", "#eee2ca"),
    "elastomer": ("Elastomer", "#30383a"),
    "recycledPolymer": ("Recycled polymer", "#416457"),
    "aluminium": ("Aluminium", "#aab7bb"),
    "insulatingPolymer": ("Insulating polymer", "#263e47"),
}

ROLE_PATTERNS: dict[str, re.Pattern[str]] = {
    "fiberglassComposite": re.compile(r"blade|shell|tail|sleeve|protector", re.I),
    "stainlessSteel": re.compile(r"bolt|anchor|stud|axle|shaft|pin|lug|latch|handle|hub|eye|gland|ring|band|collar|tab", re.I),
    "concrete": re.compile(r"^(?!bushing-base).*?(?:base|foot|pad|pile|shoe|floor|step|foundation)", re.I),
    "safetyPaint": re.compile(r"warning|reflector|band|tail|sign|marker|rung|ladder|step|slot|panel|plate|top-edge|bridge|opening|cross|beam|shoe|door|gate|access-panel", re.I),
    "polycarbonate": re.compile(r"lamp|light|screen|lens|beacon", re.I),
    "copper": re.compile(r"busbar|copper|conductor", re.I),
    "ceramic": re.compile(r"insulator|bushing", re.I),
    "elastomer": re.compile(r"wheel|boot|fender|saddle|bumper|seal|pad|support", re.I),
    "recycledPolymer": re.compile(r"case|lid|pad|saddle|boot", re.I),
    "aluminium": re.compile(r"fan|header|cooler|radiator|fin", re.I),
    "insulatingPolymer": re.compile(r"boot|gland|cable|insulator", re.I),
    "marineSteel": re.compile(r"monopile|transition|boat-rail", re.I),
    "galvanizedSteel": re.compile(r"rail|rung|hoop|post|frame|beam|cross|jamb|ladder|leg|mast|tower|stem|flange|rim|bracket|mount|guard|bar", re.I),
    "structuralSteel": re.compile(r"rail|rung|hoop|post|frame|beam|cross|leg|mast|tower|flange|rim|bracket|mount|guard|bar", re.I),
    "paintedSteel": re.compile(r"body|cabinet|tank|hood|door|panel|louver|fin|head|housing|cover|nacelle|converter|shell|roof", re.I),
    "powderCoatedSteel": re.compile(r"body|cabinet|tank|hood|door|panel|louver|fin|head|housing|cover|shelter|roof", re.I),
    "castSteel": re.compile(r"hub|gear|housing|boss|root", re.I),
}


def role_set(asset_id: str) -> tuple[str, ...]:
    if asset_id in TURBINES:
        if asset_id == "offshore-wind-turbine":
            return ("paintedSteel", "fiberglassComposite", "marineSteel")
        if asset_id == "small-farm-wind-turbine":
            return ("paintedSteel", "fiberglassComposite", "safetyPaint")
        return ("paintedSteel", "fiberglassComposite", "stainlessSteel")
    if asset_id in FOUNDATIONS:
        if asset_id == "monopile-foundation":
            return ("marineSteel", "elastomer", "safetyPaint")
        if asset_id == "transition-piece":
            return ("marineSteel", "galvanizedSteel", "safetyPaint")
        if asset_id == "turbine-base-skirt":
            return ("structuralSteel", "concrete", "safetyPaint")
        return ("structuralSteel", "stainlessSteel")
    if asset_id in ELECTRICAL:
        if asset_id == "grounding-busbar":
            return ("copper", "ceramic", "stainlessSteel")
        if asset_id == "aviation-light":
            return ("powderCoatedSteel", "polycarbonate")
        if asset_id == "wind-farm-meter-pedestal":
            return ("powderCoatedSteel", "polycarbonate", "stainlessSteel")
        if asset_id == "wind-farm-pad-mount-transformer":
            return ("powderCoatedSteel", "concrete", "ceramic", "aluminium")
        if asset_id in {"converter-cabinet", "turbine-control-cabinet"}:
            return ("powderCoatedSteel", "stainlessSteel", "safetyPaint")
        if asset_id == "turbine-junction-box":
            return ("powderCoatedSteel", "insulatingPolymer", "stainlessSteel")
        if asset_id == "substation-switchgear-kiosk":
            return ("powderCoatedSteel", "concrete", "stainlessSteel")
        return ("powderCoatedSteel", "aluminium", "stainlessSteel")
    if asset_id in TRANSPORT:
        if asset_id == "torque-tool-case":
            return ("recycledPolymer", "elastomer", "stainlessSteel")
        if asset_id == "maintenance-tool-cart":
            return ("powderCoatedSteel", "elastomer", "stainlessSteel")
        if asset_id in {"blade-transport-saddle", "tower-transport-saddle"}:
            return ("structuralSteel", "elastomer", "stainlessSteel")
        if asset_id == "blade-root-lifting-yoke":
            return ("safetyPaint", "structuralSteel", "stainlessSteel")
        return ("structuralSteel", "stainlessSteel", "safetyPaint")
    if asset_id in SITE:
        if asset_id == "access-platform-ring":
            return ("galvanizedSteel", "safetyPaint")
        if asset_id == "service-shelter":
            return ("powderCoatedSteel", "concrete", "safetyPaint")
        if asset_id == "turbine-door-frame":
            return ("galvanizedSteel", "stainlessSteel")
        if asset_id in {"turbine-number-placard", "wind-farm-warning-sign"}:
            return ("safetyPaint", "galvanizedSteel", "concrete")
        if asset_id == "wind-site-bollard":
            return ("safetyPaint", "stainlessSteel", "concrete")
        if asset_id == "turbine-base-steps":
            return ("galvanizedSteel", "safetyPaint")
        return ("galvanizedSteel", "stainlessSteel", "safetyPaint")
    if asset_id == "wind-turbine-blade":
        return ("fiberglassComposite", "stainlessSteel")
    if asset_id == "vertical-axis-wind-turbine":
        return ("galvanizedSteel", "fiberglassComposite", "stainlessSteel")
    if asset_id in {"blade-root-protector", "turbine-blade-root-sleeve"}:
        return ("fiberglassComposite", "stainlessSteel", "elastomer")
    if asset_id in {"gearbox-enclosure", "generator-cover", "turbine-nacelle-shell", "turbine-rotor-hub", "tower-section"}:
        return ("paintedSteel", "castSteel", "stainlessSteel")
    if asset_id == "cable-entry-boot":
        return ("galvanizedSteel", "insulatingPolymer")
    if asset_id == "cable-trench-cover":
        return ("galvanizedSteel", "safetyPaint", "stainlessSteel")
    if asset_id == "crane-outrigger-pad":
        return ("recycledPolymer", "structuralSteel", "stainlessSteel")
    return ("galvanizedSteel", "stainlessSteel", "safetyPaint")


def color_for(role: str, original: str, primary: str) -> str:
    return PALETTES[role][1]


def shade(hex_color: str, factor: float) -> str:
    rgb = [int(hex_color[i : i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{max(0, min(255, round(c * factor))):02x}" for c in rgb)


def material_roles(asset_id: str, parts: list[str], roles: tuple[str, ...]) -> dict[str, str]:
    primary, *alternates = roles
    assignments = {part: primary for part in parts}
    used: set[str] = set()
    for role in alternates:
        pattern = ROLE_PATTERNS.get(role)
        candidates = [p for p in parts if p not in used and pattern and pattern.search(p)]
        if candidates:
            for part in candidates:
                assignments[part] = role
            used.update(candidates)
    # If the names do not expose a second role, use the last distinct named
    # component as the alternate material, keeping all other parts primary.
    if len(set(assignments.values())) < 2:
        secondary = alternates[0]
        chosen = next((part for part in reversed(parts) if part != primary), None)
        if chosen is None:
            raise ValueError(f"{asset_id} has no separate named component to colour")
        assignments[chosen] = secondary
    return assignments


def add_turbine_helpers(src: str) -> str:
    anchor = "const p=assembly("
    helper = """
const ngon = (radius: number, sides: number, offset = 0) => {
  let profile = path().moveTo(radius * Math.cos(offset), radius * Math.sin(offset));
  for (let i = 1; i < sides; i++) {
    const angle = offset + (2 * Math.PI * i) / sides;
    profile = profile.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return profile.close();
};
const towerShape = (levels: number[][], sides = 10) => {
  const profiles = levels.map((level, i) => ngon(level[1]!, sides, (i % 2) * Math.PI / sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map(([z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  }).scale(scale);
};
const rotorHub = (x: number, y: number, z: number, length: number, radius: number, sides = 12) =>
  cylinder(length, radius, sides).rotateX(90).translate(x, y + length / 2, z).scale(scale);
const rotorBlade = (span: number, rootChord: number, middleChord: number, tipChord: number, thickness: number, sweep = 20) => {
  const profile = path()
    .moveTo(-rootChord / 2, 0)
    .lineTo(rootChord / 2, 0)
    .lineTo(sweep + middleChord / 2, span * 0.46)
    .lineTo(sweep + tipChord / 2, span)
    .lineTo(sweep - tipChord / 2, span)
    .lineTo(sweep - middleChord / 2, span * 0.46)
    .lineTo(-rootChord / 2, 0)
    .close();
  return profile.extrude(thickness).rotateX(90).translate(0, thickness / 2, 0).scale(scale);
};
"""
    if anchor not in src:
        raise ValueError("assembly declaration was not found")
    return src.replace(anchor, helper + "\n" + anchor, 1)


def improve_turbine(asset_id: str, src: str) -> str:
    if asset_id not in TURBINES:
        return src
    src = add_turbine_helpers(src)
    if asset_id == "horizontal-axis-wind-turbine":
        before = '''p.part("tower",c(0,0,0,2500,85,8).color(color));
p.part("nacelle",b(0,0,2500,620,180,200).color(color));
p.part("hub",c(0,-110,2570,160,140,8).color(color));
p.part("blade-up",b(0,-120,2750,110,70,900).color(color));
p.part("blade-left",b(-530,-120,2520,930,70,110).color(color));
p.part("blade-right",b(530,-120,2520,930,70,110).color(color));'''
        after = '''p.part("tower",towerShape([[0,145],[300,120],[2480,72]],10).color(color));
p.part("nacelle",b(0,0,2480,680,240,205).color(color));
p.part("hub",rotorHub(0,-180,2600,180,125,12).color(color));
p.part("blade-up",rotorBlade(1180,210,135,38,56,34).translate(0,-180,2600).color(color));
p.part("blade-left",rotorBlade(1180,210,135,38,56,34).rotateY(120).translate(0,-180,2600).color(color));
p.part("blade-right",rotorBlade(1180,210,135,38,56,34).rotateY(240).translate(0,-180,2600).color(color));'''
        if before not in src:
            raise ValueError(f"original rotor block was not found: {asset_id}")
        src = src.replace(before, after, 1)
    elif asset_id == "offshore-wind-turbine":
        before = '''p.part("monopile",c(0,0,0,1200,180,8).color(color));
p.part("transition",c(0,0,1150,450,220,8).color(color));
p.part("tower",c(0,0,1500,1900,100,8).color(color));
p.part("nacelle",b(0,0,3400,650,220,220).color(color));
p.part("hub",c(0,-140,3470,160,145,8).color(color));
p.part("blade-up",b(0,-150,3630,100,70,1050).color(color));
p.part("blade-left",b(-600,-150,3420,1050,70,100).color(color));
p.part("blade-right",b(600,-150,3420,1050,70,100).color(color));'''
        after = '''p.part("monopile",c(0,0,0,1200,180,12).color(color));
p.part("transition",c(0,0,1150,450,220,12).color(color));
p.part("tower",towerShape([[1500,122],[1820,112],[3400,78]],10).color(color));
p.part("nacelle",b(0,0,3370,720,270,235).color(color));
p.part("hub",rotorHub(0,-215,3510,190,135,12).color(color));
p.part("blade-up",rotorBlade(1580,260,175,42,68,50).translate(0,-215,3510).color(color));
p.part("blade-left",rotorBlade(1580,260,175,42,68,50).rotateY(120).translate(0,-215,3510).color(color));
p.part("blade-right",rotorBlade(1580,260,175,42,68,50).rotateY(240).translate(0,-215,3510).color(color));'''
        if before not in src:
            raise ValueError(f"original rotor block was not found: {asset_id}")
        src = src.replace(before, after, 1)
    elif asset_id == "rooftop-wind-turbine":
        before = '''p.part("mast",c(0,0,50,760,40,8).color(color));
p.part("nacelle",b(0,0,810,380,150,150).color(color));
p.part("hub",c(0,-90,850,90,95,8).color(color));
p.part("blade-up",b(0,-90,940,70,65,400).color(color));
p.part("blade-left",b(-235,-90,835,400,65,70).color(color));
p.part("blade-right",b(235,-90,835,400,65,70).color(color));'''
        after = '''p.part("mast",towerShape([[50,56],[785,34]],9).color(color));
p.part("nacelle",b(0,0,810,380,150,150).color(color));
p.part("hub",rotorHub(0,-112,902,104,68,10).color(color));
p.part("blade-up",rotorBlade(450,112,72,24,32,12).translate(0,-112,902).color(color));
p.part("blade-left",rotorBlade(450,112,72,24,32,12).rotateY(120).translate(0,-112,902).color(color));
p.part("blade-right",rotorBlade(450,112,72,24,32,12).rotateY(240).translate(0,-112,902).color(color));'''
        if before not in src:
            raise ValueError(f"original rotor block was not found: {asset_id}")
        src = src.replace(before, after, 1)
    elif asset_id == "small-farm-wind-turbine":
        before = '''p.part("tower",c(0,0,0,1350,50,8).color(color));
p.part("nacelle",b(0,0,1350,340,140,130).color(color));
p.part("hub",c(0,-85,1390,80,75,8).color(color));
p.part("blade-up",b(0,-90,1470,60,55,520).color(color));
p.part("blade-left",b(-300,-90,1370,540,55,60).color(color));
p.part("blade-right",b(300,-90,1370,540,55,60).color(color));'''
        after = '''p.part("tower",towerShape([[0,82],[190,66],[1330,43]],9).color(color));
p.part("nacelle",b(0,0,1320,400,165,145).color(color));
p.part("hub",rotorHub(0,-116,1398,100,80,10).color(color));
p.part("blade-up",rotorBlade(620,150,92,25,40,18).translate(0,-116,1398).color(color));
p.part("blade-left",rotorBlade(620,150,92,25,40,18).rotateY(120).translate(0,-116,1398).color(color));
p.part("blade-right",rotorBlade(620,150,92,25,40,18).rotateY(240).translate(0,-116,1398).color(color));'''
        if before not in src:
            raise ValueError(f"original rotor block was not found: {asset_id}")
        src = src.replace(before, after, 1)
    if "rotorBlade(" not in src or (asset_id != "rooftop-wind-turbine" and "towerShape(" not in src):
        raise ValueError(f"turbine geometry upgrade did not apply to {asset_id}")
    return src


def upgrade_vertical_axis(src: str) -> str:
    helper = '''const radialRotorBlade = (height: number, z: number, angle: number) => {
  const outline = path()
    .moveTo(170, -28).lineTo(270, -28).lineTo(305, -14)
    .lineTo(305, 14).lineTo(270, 28).lineTo(170, 28).lineTo(158, 0).close();
  return outline.extrude(height).rotateZ(angle).translate(0, 0, z).scale(scale);
};
'''
    src = re.sub(r"const curvedRotorBlade = .*?\n};\n", lambda _: helper, src, count=1, flags=re.S)
    block = '''const p=assembly("vertical-axis-wind-turbine");
p.part("shaft",c(0,0,60,980,36,10).color(stainlessSteel));
p.part("blade-a",radialRotorBlade(920,90,0).color(fiberglassComposite));
p.part("blade-b",radialRotorBlade(920,90,120).color(fiberglassComposite));
p.part("blade-c",radialRotorBlade(920,90,240).color(fiberglassComposite));
p.part("lower-arm-a",b(135,0,110,270,32,28).color(galvanizedSteel));
p.part("lower-arm-b",b(135,0,110,270,32,28).rotateZ(120).color(galvanizedSteel));
p.part("lower-arm-c",b(135,0,110,270,32,28).rotateZ(240).color(galvanizedSteel));
p.part("upper-arm-a",b(135,0,925,270,32,28).color(galvanizedSteel));
p.part("upper-arm-b",b(135,0,925,270,32,28).rotateZ(120).color(galvanizedSteel));
p.part("upper-arm-c",b(135,0,925,270,32,28).rotateZ(240).color(galvanizedSteel));
p.part("lower-bearing",c(0,0,70,70,72,10).color(stainlessSteel));
p.part("upper-bearing",c(0,0,960,70,72,10).color(stainlessSteel));
p.part("base",b(0,0,0,680,540,50).color(galvanizedSteel));

return p.model();'''
    src, count = re.subn(r'const p=assembly\("vertical-axis-wind-turbine"\);[\s\S]*?return p\.model\(\);', lambda _: block, src, count=1)
    if count != 1:
        raise ValueError("vertical-axis rotor source block was not found")
    return src


def upgrade_blade(src: str) -> str:
    old = '''p.part("root",b(0,0,20,250,170,130).color(color));
p.part("inner",b(0,0,190,170,120,900).color(color));
p.part("mid",b(0,0,870,110,95,900).color(color));
p.part("tip",b(0,0,1550,58,70,460).color(color));'''
    new = '''const bladeOutline = path()
  .moveTo(-150,0).lineTo(150,0).lineTo(115,580).lineTo(72,1320)
  .lineTo(30,2040).lineTo(-26,2040).lineTo(-76,1320).lineTo(-124,580).close();
p.part("blade",bladeOutline.extrude(72).rotateX(90).translate(0,36,20).scale(scale).color(color));'''
    if old not in src:
        raise ValueError("wind-turbine-blade segmentation was not found")
    return src.replace(old, new)


def upgrade_transformer(src: str) -> str:
    old = '''p.part("tank",b(0,0,355,700,520,660).color(color));
p.part("lid",b(0,0,705,760,570,40).color(color));
p.part("fin-0",b(-220,265,365,50,35,470).color(color));
p.part("fin-1",b(-110,265,365,50,35,470).color(color));
p.part("fin-2",b(0,265,365,50,35,470).color(color));
p.part("fin-3",b(110,265,365,50,35,470).color(color));
p.part("fin-4",b(220,265,365,50,35,470).color(color));
p.part("bushing-0",c(-210,-80,725,130,35,8).color(color));
p.part("bushing-1",c(0,-80,725,130,35,8).color(color));
p.part("bushing-2",c(210,-80,725,130,35,8).color(color));'''
    new = '''p.part("tank",b(0,0,50,700,520,650).color(color));
p.part("lid",b(0,0,700,760,570,40).color(color));
p.part("fin-0",b(-250,-284,300,44,48,400).color(color));
p.part("fin-1",b(-125,-284,300,44,48,400).color(color));
p.part("fin-2",b(0,-284,300,44,48,400).color(color));
p.part("fin-3",b(125,-284,300,44,48,400).color(color));
p.part("fin-4",b(250,-284,300,44,48,400).color(color));
p.part("bushing-base-0",c(-225,-80,740,28,70,10).color(color));
p.part("bushing-base-1",c(0,-80,740,28,70,10).color(color));
p.part("bushing-base-2",c(225,-80,740,28,70,10).color(color));
p.part("bushing-0",c(-225,-80,768,205,52,10).color(color));
p.part("bushing-1",c(0,-80,768,205,52,10).color(color));
p.part("bushing-2",c(225,-80,768,205,52,10).color(color));'''
    if old not in src:
        raise ValueError("transformer cooling/bushing geometry was not found")
    return src.replace(old, new, 1)


def upgrade_tool_cart(src: str) -> str:
    src = re.sub(
        r"^const c=.*$",
        "const wheel=(x:number,y:number,z:number)=>cylinder(90,75,10).rotateX(90).translate(x,y+45,z+75).scale(scale);",
        src,
        count=1,
        flags=re.M,
    )
    src, wheel_count = re.subn(
        r'p\.part\("(wheel[^"]+)",c\(([-\d]+),([-\d]+),0,75,75,8\)\.color\(color\)\);',
        lambda m: f'p.part("{m.group(1)}",wheel({m.group(2)},{m.group(3)},0).color(color));',
        src,
    )
    if wheel_count != 4:
        raise ValueError(f"expected four wheel parts, found {wheel_count}")
    old_handle = 'p.part("handle",b(0,260,760,760,45,45).color(color));'
    new_handle = '''p.part("handle-post-left",b(-360,260,520,45,45,65).color(color));
p.part("handle-post-right",b(360,260,520,45,45,65).color(color));
p.part("handle",b(0,260,585,760,45,45).color(color));'''
    if old_handle not in src:
        raise ValueError("maintenance-cart handle placement was not found")
    return src.replace(old_handle, new_handle, 1)


def promote(asset_id: str, path: Path) -> None:
    src = path.read_text()
    if "param('color'" not in src and 'param("color"' not in src:
        if "presets({" in src:
            return
        raise ValueError(f"expected original single-color source: {path}")

    title_match = re.search(r"title:\s*([\"'])(.*?)\1,", src)
    description_match = re.search(r"description:\s*([\"'])(.*?)\1,", src)
    color_match = re.search(r"const color = param\(['\"]color['\"],\s*([\"'])(#[0-9a-fA-F]{6})\1,.*?\);", src)
    if not (title_match and description_match and color_match):
        raise ValueError(f"metadata or original colour is missing: {path}")
    title = title_match.group(2)
    description = description_match.group(2)
    original_color = color_match.group(2)

    src = improve_turbine(asset_id, src)
    if asset_id == "vertical-axis-wind-turbine":
        src = upgrade_vertical_axis(src)
    if asset_id == "wind-turbine-blade":
        src = upgrade_blade(src)
    if asset_id == "wind-farm-pad-mount-transformer":
        src = upgrade_transformer(src)
    if asset_id == "maintenance-tool-cart":
        src = upgrade_tool_cart(src)
    if asset_id in {"rooftop-wind-turbine", "small-farm-wind-turbine"}:
        src = re.sub(r"^const c=.*\n", "", src, count=1, flags=re.M)

    parts = re.findall(r'p\.part\(["\']([^"\']+)["\']', src)
    requested_roles = role_set(asset_id)[: min(4, len(parts))]
    assignments = material_roles(asset_id, parts, requested_roles)
    roles = tuple(role for role in requested_roles if role in assignments.values())
    if len(roles) < 2:
        raise ValueError(f"{asset_id} did not get two distinct material assignments")
    primary = roles[0]
    param_lines = []
    role_defaults = {}
    for role in roles:
        label, palette_default = PALETTES[role]
        value = color_for(role, original_color, primary)
        if asset_id == "vertical-axis-wind-turbine" and role == "galvanizedSteel":
            value = "#52727c"
        role_defaults[role] = value
        param_lines.append(f"const {role} = param('{role}', '{value}', {{ label: '{label}' }});")

    # Apply material colours per named subassembly part.
    def replace_part(match: re.Match[str]) -> str:
        part_name, body = match.group(1), match.group(2)
        role = assignments.get(part_name, primary)
        return f'p.part("{part_name}",{body}.color({role}));'

    src, count = re.subn(
        r'p\.part\(["\']([^"\']+)["\'],(.*?)\.color\(color\)\);',
        replace_part,
        src,
    )
    if count < len(parts):
        missing = len(parts) - count
        raise ValueError(f"only recoloured {count}/{len(parts)} parts in {path} (missing {missing})")

    src = src.replace(color_match.group(0), "", 1)

    coastal = {primary: shade(role_defaults[primary], 0.78)}
    if len(roles) > 1:
        coastal[roles[1]] = shade(role_defaults[roles[1]], 1.08)
    high_visibility = {primary: "#d8a62b"}
    if "safetyPaint" in roles:
        high_visibility = {"safetyPaint": "#f7c331", primary: shade(role_defaults[primary], 0.88)}
    elif "fiberglassComposite" in roles:
        high_visibility = {"fiberglassComposite": "#e48d35"}
    elif "polycarbonate" in roles:
        high_visibility = {"polycarbonate": "#f2b92e"}
    preset_text = "presets({\n  weathered: " + json.dumps(coastal, separators=(", ", ": ")) + ",\n  highVisibility: " + json.dumps(high_visibility, separators=(", ", ": ")) + ",\n});"
    scale_line = re.search(r"const scale = param\([^\n]+\);", src)
    if not scale_line:
        raise ValueError(f"scale parameter is missing: {path}")
    src = src[: scale_line.end()] + "\n" + "\n".join(param_lines) + "\n\n" + preset_text + src[scale_line.end() :]
    labels = ", ".join(PALETTES[r][0].lower() for r in roles)
    base_description = description.split(" Knobs:")[0].rstrip(".")
    if asset_id == "vertical-axis-wind-turbine":
        base_description = "Three-blade vertical-axis rotor with an open frame, central shaft, and radial supports"
    new_description = f"{base_description}. Controls: scale and {labels}; weathered and high-visibility presets."
    src = re.sub(r"description:\s*([\"']).*?\1,", lambda m: f"description: {json.dumps(new_description)},", src, count=1)

    # Give each file a truthful object-specific source note.
    source_note = f"// {title}. {base_description}. Stylized catalog geometry, millimetres, Z up."
    src = re.sub(r"^// Original low-poly wind-energy scene prop,.*$", source_note, src, count=1, flags=re.M)

    # Keep budgets proportional to measured mesh size. The principal turbine
    # silhouettes gained lofted towers and swept planform blades.
    measured = TRIANGLES.get(asset_id, 250)
    budget = math.ceil((measured * (2.8 if asset_id in TURBINES | {"wind-turbine-blade", "vertical-axis-wind-turbine"} else 2.0)) / 50) * 50
    budget = max(300, budget)
    src = re.sub(r"triangleBudget:\s*\d+", f"triangleBudget: {budget}", src, count=1)

    path.write_text(src)


def main() -> None:
    paths = sorted(KIT.glob("*.kcad.ts"))
    if len(paths) != 50:
        raise SystemExit(f"expected 50 wind-energy assets, found {len(paths)}")
    for path in paths:
        promote(path.name.removesuffix(".kcad.ts"), path)
    print(f"promoted {len(paths)} wind-energy asset sources")


if __name__ == "__main__":
    main()
