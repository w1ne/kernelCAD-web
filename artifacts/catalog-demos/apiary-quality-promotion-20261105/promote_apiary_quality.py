#!/usr/bin/env python3
"""Split the apiary kit's shared asset colors into material controls."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/apiary"

MATERIALS = {
    "timber": ("Hive timber", "#b8874a", "#d4a462", "#68543d"),
    "steel": ("Galvanized steel", "#647176", "#b7c0be", "#716d63"),
    "stainless": ("Stainless steel", "#aeb9b7", "#d9dfdc", "#788482"),
    "enamel": ("Painted enamel", "#647b59", "#91a66b", "#4b5f48"),
    "polymer": ("Molded polymer", "#67877b", "#d7e2d8", "#3f5d54"),
    "glass": ("Tinted glass", "#9ac1bd", "#c9dfd8", "#6e9392"),
    "leather": ("Leather", "#805b3c", "#a67a50", "#503a2c"),
    "fabric": ("Canvas and protective fabric", "#c8b78f", "#e7dfc9", "#78664a"),
    "mesh": ("Woven veil mesh", "#4a5e55", "#6c8075", "#303d38"),
    "fiber": ("Brush fiber", "#d7c394", "#ede0b7", "#92794b"),
    "wax": ("Beeswax and foundation", "#e3c978", "#f1df9d", "#bc9344"),
    "honey": ("Honey", "#d18a23", "#e9aa35", "#a55f17"),
    "brass": ("Brass hardware", "#a97932", "#c49a50", "#725225"),
    "paper": ("Label paper", "#e7dfc8", "#f6f0df", "#c6b893"),
    "rubber": ("Rubber", "#333a3b", "#485152", "#252b2c"),
}

# Material controls are limited to the parts where a customer would expect to
# change the finish. Rectilinear hive bodies stay rectilinear; the additions
# below address missing silhouettes or material components in specific models.
PROFILES = {
    "apiary-shade-canopy": ["timber", "fabric", "steel"],
    "apiary-sign": ["timber", "enamel", "steel"],
    "apiary-waterer": ["polymer", "glass", "stainless"],
    "bee-brush": ["timber", "brass", "fiber"],
    "bee-escape-board": ["timber", "polymer"],
    "bee-smoker": ["stainless", "leather", "timber"],
    "beekeeper-gloves": ["fabric", "leather"],
    "beekeeper-jacket": ["fabric", "mesh", "leather"],
    "beekeeper-veil-hood": ["fabric", "mesh", "leather"],
    "beeswax-block": ["wax", "paper"],
    "bottling-stand": ["timber", "stainless", "rubber"],
    "comb-section-box": ["timber", "wax", "stainless"],
    "entrance-feeder": ["polymer", "glass", "stainless"],
    "entrance-reducer": ["timber", "polymer", "stainless"],
    "foundation-frame": ["timber", "wax"],
    "frame-carrier": ["timber", "stainless"],
    "frame-grip": ["stainless", "rubber"],
    "frame-rest": ["timber", "stainless"],
    "hive-frame": ["timber", "wax"],
    "hive-inspection-mirror": ["timber", "glass", "rubber"],
    "hive-scale": ["stainless", "polymer", "glass"],
    "hive-stand": ["timber", "steel"],
    "hive-tool": ["stainless", "rubber"],
    "honey-bucket": ["polymer", "stainless"],
    "honey-extractor": ["stainless", "enamel", "rubber"],
    "honey-jar": ["honey", "brass", "paper"],
    "honey-settling-tank": ["stainless", "glass", "rubber"],
    "honey-squeeze-bottle": ["honey", "polymer", "paper"],
    "honey-strainer": ["stainless", "mesh"],
    "inner-hive-cover": ["timber", "stainless"],
    "langstroth-hive": ["timber", "stainless", "enamel"],
    "migratory-hive-cover": ["timber", "steel"],
    "mouse-guard": ["timber", "stainless"],
    "nuc-carrier": ["timber", "stainless"],
    "nuc-hive-box": ["timber", "steel", "polymer"],
    "observation-hive": ["timber", "glass"],
    "pollen-trap": ["timber", "stainless", "polymer"],
    "queen-cage": ["polymer", "stainless"],
    "queen-catching-clip": ["stainless", "rubber"],
    "queen-excluder": ["timber", "stainless"],
    "queen-marking-tube": ["glass", "polymer", "rubber"],
    "screened-bottom-board": ["timber", "stainless"],
    "solar-wax-melter": ["timber", "glass", "wax"],
    "swarm-trap": ["timber", "steel"],
    "top-bar-hive": ["timber", "stainless"],
    "top-feeder": ["polymer", "glass"],
    "uncapping-fork": ["stainless", "timber"],
    "uncapping-knife": ["stainless", "timber", "rubber"],
    "uncapping-tank": ["stainless", "polymer"],
}

PART_OVERRIDES = {
    "apiary-shade-canopy": {
        "shade-cloth": "fabric",
        "corner-bracket-front-left": "steel", "corner-bracket-front-right": "steel",
        "corner-bracket-back-left": "steel", "corner-bracket-back-right": "steel",
    },
    "apiary-sign": {"panel": "enamel", "foot-left": "steel", "foot-right": "steel"},
    "apiary-waterer": {
        "tray": "polymer", "reservoir": "glass", "neck": "polymer", "cap": "polymer",
        "landing-front": "polymer", "landing-back": "polymer", "mount-left": "stainless", "mount-right": "stainless",
    },
    "bee-brush": {"handle": "timber", "ferrule": "brass", "bristles": "fiber"},
    "bee-escape-board": {"board": "timber", "escape-tunnel-0": "polymer", "escape-tunnel-1": "polymer", "escape-tunnel-2": "polymer"},
    "bee-smoker": {"bellows-back": "leather", "bellows-front": "leather", "handle": "timber"},
    "beekeeper-gloves": {"palm-left": "leather", "palm-right": "leather"},
    "beekeeper-jacket": {"hood-rim": "mesh", "collar": "leather"},
    "beekeeper-veil-hood": {"veil-front": "mesh", "veil-back": "mesh", "veil-left": "mesh", "veil-right": "mesh", "brim": "leather"},
    "beeswax-block": {"block": "wax", "top": "wax", "rib-left": "wax", "rib-right": "wax", "tab-front": "paper", "tab-back": "paper"},
    "bottling-stand": {"front-feet": "rubber", "left-guide": "stainless", "right-guide": "stainless"},
    "comb-section-box": {"comb-panel": "wax", "top-rim": "stainless"},
    "entrance-feeder": {"tray": "polymer", "reservoir": "glass", "reservoir-cap": "polymer", "mount-left": "stainless", "mount-right": "stainless"},
    "entrance-reducer": {"strip": "timber", "center-bar": "timber", "left-block": "polymer", "right-block": "polymer", "lift-tab-left": "stainless", "lift-tab-right": "stainless"},
    "foundation-frame": {"foundation": "wax"},
    "frame-carrier": {"handle-left": "stainless", "handle-right": "stainless"},
    "frame-grip": {"pivot": "stainless", "grip-left": "rubber", "grip-right": "rubber"},
    "frame-rest": {"center-stop": "stainless"},
    "hive-frame": {"wax-foundation": "wax"},
    "hive-inspection-mirror": {"mirror-face": "glass", "grip-cap": "rubber"},
    "hive-scale": {"readout": "polymer", "screen": "glass"},
    "hive-tool": {"shaft": "stainless", "scraper": "stainless", "hook-base": "stainless", "hook-tip": "stainless", "grip-rib-a": "rubber", "grip-rib-b": "rubber"},
    "hive-stand": {"shoe-front-left": "steel", "shoe-front-right": "steel", "shoe-back-left": "steel", "shoe-back-right": "steel"},
    "honey-bucket": {"pail": "polymer", "bail": "stainless", "lid-knob": "polymer"},
    "honey-extractor": {"crank-grip": "rubber", "leg-0": "enamel", "leg-1": "enamel", "leg-2": "enamel"},
    "honey-jar": {"jar-body": "honey", "shoulder": "honey", "lid": "brass", "label": "paper"},
    "honey-settling-tank": {"vessel": "stainless", "sight-glass": "glass", "foot-0": "rubber", "foot-1": "rubber", "foot-2": "rubber", "foot-3": "rubber"},
    "honey-squeeze-bottle": {"body": "honey", "shoulder": "honey", "neck": "polymer", "nozzle": "polymer", "cap": "polymer", "label": "paper"},
    "honey-strainer": {"basket": "stainless"},
    "inner-hive-cover": {"vent-collar": "stainless", "grip": "stainless"},
    "langstroth-hive": {"entrance-strip": "enamel", "roof-sheet": "stainless"},
    "migratory-hive-cover": {"metal-skin": "steel"},
    "mouse-guard": {"plate": "timber"},
    "nuc-carrier": {"handle-left": "stainless", "handle-right": "stainless"},
    "nuc-hive-box": {"handle-left": "steel", "handle-right": "steel", "entrance": "polymer"},
    "observation-hive": {"lower-panel": "glass", "middle-panel": "glass", "upper-panel": "glass"},
    "pollen-trap": {"trap-body": "timber", "grid": "stainless"},
    "queen-cage": {"cage-body": "polymer", "hanging-loop": "stainless"},
    "queen-catching-clip": {"arm-left": "stainless", "arm-right": "stainless", "hinge": "stainless", "handle-left": "rubber", "handle-right": "rubber"},
    "queen-excluder": {"grid-0": "stainless", "grid-1": "stainless", "grid-2": "stainless", "grid-3": "stainless"},
    "queen-marking-tube": {"tube": "glass", "base-cup": "polymer", "plunger-handle": "rubber"},
    "screened-bottom-board": {"screen-bar-a": "stainless", "screen-bar-b": "stainless", "screen-bar-c": "stainless", "screen-bar-d": "stainless", "screen-bar-e": "stainless"},
    "solar-wax-melter": {"lid-panel": "glass", "tray": "wax"},
    "swarm-trap": {"hanger-left": "steel", "hanger-right": "steel"},
    "top-bar-hive": {"roof-sheet": "stainless"},
    "top-feeder": {"pan": "polymer", "access-well": "glass", "cover": "polymer"},
    "uncapping-fork": {"handle": "timber", "neck": "stainless", "head": "stainless"},
    "uncapping-knife": {"blade": "stainless", "blade-tip": "stainless", "handle": "timber", "guard": "rubber"},
    "uncapping-tank": {"tank": "stainless", "frame-ledge-left": "polymer", "frame-ledge-right": "polymer"},
}

ADDITIONS = {
    "apiary-shade-canopy": '''
p.part("shade-cloth",b(0,0,1135,780,600,14).color(fabric));
p.part("corner-bracket-front-left",b(-400,-300,1040,58,58,95).color(steel));
p.part("corner-bracket-front-right",b(400,-300,1040,58,58,95).color(steel));
p.part("corner-bracket-back-left",b(-400,300,1040,58,58,95).color(steel));
p.part("corner-bracket-back-right",b(400,300,1040,58,58,95).color(steel));''',
    "apiary-waterer": '''
p.part("mount-left",b(-130,-205,25,32,28,60).color(stainless));
p.part("mount-right",b(130,-205,25,32,28,60).color(stainless));''',
    "hive-frame": '''
p.part("wax-foundation",b(0,0,40,400,12,620).color(wax));''',
    "hive-stand": '''
p.part("shoe-front-left",b(-250,-180,0,70,70,12).color(steel));
p.part("shoe-front-right",b(250,-180,0,70,70,12).color(steel));
p.part("shoe-back-left",b(-250,180,0,70,70,12).color(steel));
p.part("shoe-back-right",b(250,180,0,70,70,12).color(steel));''',
    "honey-settling-tank": '''
p.part("sight-glass",c(110,-212,170,240,18,8).color(glass));''',
    "langstroth-hive": '''
p.part("roof-sheet",b(0,0,955,690,590,18).color(stainless));''',
    "migratory-hive-cover": '''
p.part("metal-skin",b(0,0,80,700,540,12).color(steel));''',
    "top-bar-hive": '''
p.part("roof-sheet",b(0,0,855,1160,540,10).color(stainless));''',
}

SOURCE_REPLACEMENTS = {
    "apiary-shade-canopy": [
        ('p.part("shade-cloth",b(0,0,1120,780,600,14).color(fabric));',
         'p.part("shade-cloth",b(0,0,1135,780,600,14).color(fabric));'),
    ],
    "bee-smoker": [
        ('p.part("spout",b(0,-130,330,110,230,70).color(stainless));',
         'p.part("spout",path().moveTo(0,0).lineTo(70,0).lineTo(34,230).lineTo(0,230).close().revolve().rotateX(90).translate(0,-130,365).scale(scale).color(stainless));'),
        ('p.part("spout-tip",b(0,-310,330,150,50,45).color(stainless));',
         'p.part("spout-tip",cylinder(14,34,8).rotateX(90).translate(0,-360,365).scale(scale).color(stainless));'),
    ],
    "honey-jar": [
        ("const glass = param('glass', \"#9ac1bd\", { label: \"Tinted glass\" });\n", ""),
        ('description: "Simple straight sided jar with a shoulder rim, screw lid and small label panel. Material controls: glass, honey, brass, paper. Presets: goldenHarvest and paleSpring.",',
         'description: "Simple straight sided jar with a shoulder rim, screw lid and small label panel. Material controls: honey, brass, paper. Presets: goldenHarvest and paleSpring.",'),
        ('p.part("jar-body",c(0,0,0,220,75,8).color(glass).material({ name: "clear jar glass", baseColor: glass.value, transmission: 0.9, ior: 1.5, thickness: 3, roughness: 0.06, attenuationColor: "#edf5e9", attenuationDistance: 900 }));',
         'p.part("jar-body",c(0,0,0,220,75,8).color(honey));'),
        ('p.part("jar-body",c(0,0,0,220,75,8).color(glass));',
         'p.part("jar-body",c(0,0,0,220,75,8).color(honey));'),
        ('p.part("shoulder",c(0,0,220,45,60,8).color(glass).material({ name: "clear jar shoulder", baseColor: glass.value, transmission: 0.9, ior: 1.5, thickness: 3, roughness: 0.06, attenuationColor: "#edf5e9", attenuationDistance: 900 }));',
         'p.part("shoulder",c(0,0,220,45,60,8).color(honey));'),
        ('p.part("shoulder",c(0,0,220,45,60,8).color(glass));',
         'p.part("shoulder",c(0,0,220,45,60,8).color(honey));'),
        ('p.part("neck",c(0,0,265,70,45,8).color(glass).material({ name: "clear jar neck", baseColor: glass.value, transmission: 0.9, ior: 1.5, thickness: 3, roughness: 0.06, attenuationColor: "#edf5e9", attenuationDistance: 900 }));',
         'p.part("neck",c(0,0,265,70,45,8).color("#9ac1bd").material({ name: "tinted jar glass", baseColor: "#9ac1bd", transmission: 0.9, ior: 1.5, thickness: 3, roughness: 0.06, attenuationColor: "#edf5e9", attenuationDistance: 900 }));'),
        ('p.part("neck",c(0,0,265,70,45,8).color(glass));',
         'p.part("neck",c(0,0,265,70,45,8).color("#9ac1bd").material({ name: "tinted jar glass", baseColor: "#9ac1bd", transmission: 0.9, ior: 1.5, thickness: 3, roughness: 0.06, attenuationColor: "#edf5e9", attenuationDistance: 900 }));'),
        ('p.part("neck",c(0,0,265,70,45,8).color("#9ac1bd").material({ name: "tinted jar glass", baseColor: "#9ac1bd", transmission: 0.9, ior: 1.5, thickness: 3, roughness: 0.06, attenuationColor: "#edf5e9", attenuationDistance: 900 }));',
         'p.part("neck",c(0,0,265,70,45,8).color("#9ac1bd"));'),
        ('p.part("neck",c(0,0,265,70,45,8).color(honey));',
         'p.part("neck",c(0,0,265,70,45,8).color("#9ac1bd").material({ name: "tinted jar glass", baseColor: "#9ac1bd", transmission: 0.9, ior: 1.5, thickness: 3, roughness: 0.06, attenuationColor: "#edf5e9", attenuationDistance: 900 }));'),
        ('p.part("honey-fill",c(0,0,12,180,58,8).color(honey));', ''),
    ],
}

LABELS = {
    "apiary-shade-canopy": ("summerCanopy", "weatheredYard"),
    "beekeeper-gloves": ("fieldReady", "sunWorn"),
    "beekeeper-jacket": ("fieldReady", "sunWorn"),
    "beekeeper-veil-hood": ("fieldReady", "sunWorn"),
    "honey-jar": ("goldenHarvest", "paleSpring"),
    "honey-squeeze-bottle": ("goldenHarvest", "paleSpring"),
    "honey-extractor": ("brightStainless", "warmHarvest"),
    "honey-settling-tank": ("brightStainless", "warmHarvest"),
}


def asset_id(source: Path) -> str:
    return source.name.removesuffix(".kcad.ts")


def title_of(text: str) -> str:
    match = re.search(r'title:\s*"([^"]+)"', text)
    if not match:
        raise ValueError("asset title is missing")
    return match.group(1)


def description_of(text: str) -> str:
    match = re.search(r'description:\s*"([^"]+)"', text)
    if not match:
        raise ValueError("asset description is missing")
    return re.split(r"\s*Stylized scene geometry\.", match.group(1))[0].rstrip(" .")


def part_names(text: str) -> list[str]:
    return re.findall(r'\.part\(\s*["\']([^"\']+)["\']', text)


def classify(asset: str, part: str, roles: list[str]) -> str:
    overrides = PART_OVERRIDES.get(asset, {})
    if part in overrides:
        role = overrides[part]
        if role not in roles:
            raise ValueError(f"{asset}/{part}: override role {role} is not in its profile")
        return role

    lower = part.lower()
    candidates = []
    if "paper" in roles and re.search(r"label|tab", lower):
        candidates.append("paper")
    if "wax" in roles and re.search(r"wax|foundation|comb", lower):
        candidates.append("wax")
    if "honey" in roles and re.search(r"honey|fill", lower):
        candidates.append("honey")
    if "glass" in roles and re.search(r"glass|mirror|screen|window|tube|readout|reservoir|panel", lower):
        candidates.append("glass")
    if "mesh" in roles and re.search(r"veil|mesh|screen|grid", lower):
        candidates.append("mesh")
    if "fiber" in roles and re.search(r"bristle|fiber", lower):
        candidates.append("fiber")
    if "leather" in roles and re.search(r"bellows|palm|leather", lower):
        candidates.append("leather")
    if "fabric" in roles and re.search(r"cloth|canopy|torso|sleeve|cuff|finger|glove|hood|crown|collar|veil", lower):
        candidates.append("fabric")
    if "rubber" in roles and re.search(r"grip|rubber|bumper|shoe|foot", lower):
        candidates.append("rubber")
    if "polymer" in roles and re.search(r"polymer|reservoir|tray|cap|nozzle|plunger|entrance|well|landing", lower):
        candidates.append("polymer")
    if "brass" in roles and re.search(r"brass|ferrule|lid-knob|lid", lower):
        candidates.append("brass")
    if "enamel" in roles and re.search(r"panel|enamel|entrance-strip", lower):
        candidates.append("enamel")
    metal_words = r"wire|grid|screen-bar|guard|blade|scraper|hook|spindle|crank|drain|valve|steel|stainless|ring|hinge|pivot|tine|shaft|spout|latch|ferrule|hanger|bracket|shoe"
    if any(role in roles for role in ("steel", "stainless")) and re.search(metal_words, lower):
        candidates.append("stainless" if "stainless" in roles else "steel")

    if candidates:
        return candidates[0]
    return roles[0]


PRESET_OVERRIDES = {
    # The second honey-jar variant is intentionally pale, not the weathered
    # finish used for most apiary equipment.
    ("honey-jar", "honey", 1): "#f3d184",
    ("honey-jar", "brass", 1): "#bcaa77",
    ("honey-jar", "paper", 1): "#fbf8ed",
}


def palette(asset: str, role: str, variant: int) -> str:
    return PRESET_OVERRIDES.get((asset, role, variant), MATERIALS[role][variant + 2])


def preset_names(asset: str) -> tuple[str, str]:
    if asset in LABELS:
        return LABELS[asset]
    if asset.startswith("beekeeper-"):
        return "fieldReady", "sunWorn"
    if asset.startswith("honey-") or asset in {"bottling-stand", "comb-section-box", "uncapping-tank"}:
        return "brightStainless", "warmHarvest"
    if any(role in PROFILES[asset] for role in ("fabric", "mesh", "leather")):
        return "fieldReady", "sunWorn"
    return "freshApiary", "weatheredYard"


def apply_source_replacements(text: str, asset: str) -> str:
    for old, new in SOURCE_REPLACEMENTS.get(asset, []):
        if old in text:
            text = text.replace(old, new)
    return text


def promote(source: Path) -> tuple[int, int]:
    text = source.read_text(encoding="utf-8")
    asset = asset_id(source)
    if asset == "apiary-gate":
        lines = text.splitlines()
        lines[1] = "// Apiary gate: timber posts, framed rails, diagonal brace, panel, hinges, and latch. Millimetres, Z up."
        source.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return 3, 2
    if asset not in PROFILES:
        raise ValueError(f"{asset}: missing material profile")
    if "const color = param('color'" not in text:
        if "presets({" in text and all(f".color({role})" in text for role in PROFILES[asset]):
            text = apply_source_replacements(text, asset)
            first_preset, second_preset = preset_names(asset)
            roles = PROFILES[asset]
            first_values = ", ".join(f"{role}: '{palette(asset, role, 0)}'" for role in roles)
            second_values = ", ".join(f"{role}: '{palette(asset, role, 1)}'" for role in roles)
            preset_block = "\n".join(
                [
                    "presets({",
                    f"  {first_preset}: {{ {first_values} }},",
                    f"  {second_preset}: {{ {second_values} }},",
                    "});",
                ]
            )
            text, changed = re.subn(r"presets\(\{[\s\S]*?\n\}\);", preset_block, text, count=1)
            if changed != 1:
                raise ValueError(f"{asset}: couldn't refresh preset values")
            source.write_text(text, encoding="utf-8")
            return len(PROFILES[asset]), 2
        raise ValueError(f"{asset}: expected the original shared color parameter or a completed promotion")
    if "const color = param('color'" not in text or ".color(color)" not in text:
        raise ValueError(f"{asset}: expected the original shared color parameter")

    roles = PROFILES[asset]
    names = part_names(text)
    if len(names) < 2:
        raise ValueError(f"{asset}: expected at least two named parts")
    role_by_part = {name: classify(asset, name, roles) for name in names}
    extra_names = re.findall(r'\.part\(\s*["\']([^"\']+)["\']', ADDITIONS.get(asset, ""))
    for name in extra_names:
        role = PART_OVERRIDES.get(asset, {}).get(name) or classify(asset, name, roles)
        role_by_part[name] = role
    for role in set(re.findall(r"\.color\((\w+)\)", ADDITIONS.get(asset, ""))):
        role_by_part[f"added:{role}"] = role
    used = set(role_by_part.values())
    if used != set(roles):
        raise ValueError(f"{asset}: declared {roles}, assigned {sorted(used)}")

    first_preset, second_preset = preset_names(asset)
    controls = [
        f"const {role} = param('{role}', {json.dumps(MATERIALS[role][1])}, {{ label: {json.dumps(MATERIALS[role][0])} }});"
        for role in roles
    ]
    first_values = ", ".join(f"{role}: '{palette(asset, role, 0)}'" for role in roles)
    second_values = ", ".join(f"{role}: '{palette(asset, role, 1)}'" for role in roles)
    material_block = "\n".join(
        controls
        + [
            "",
            "presets({",
            f"  {first_preset}: {{ {first_values} }},",
            f"  {second_preset}: {{ {second_values} }},",
            "});",
        ]
    )
    labels = ", ".join(MATERIALS[role][0].lower() for role in roles)
    story = description_of(text)
    lines = text.splitlines()
    lines[1] = f"// {title_of(text)}: {story}. Separate {labels} surfaces clarify the parts."
    text = "\n".join(lines) + "\n"

    desc = (
        f"{story}. Material controls: {', '.join(roles)}. "
        f"Presets: {first_preset} and {second_preset}."
    )
    text, changed = re.subn(
        r'description:\s*"[^"]+"',
        f"description: {json.dumps(desc)}",
        text,
        count=1,
    )
    if changed != 1:
        raise ValueError(f"{asset}: couldn't update description")

    control, changed = re.subn(
        r"^const color = param\('color',[^\n]*\);$",
        material_block,
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if changed != 1:
        raise ValueError(f"{asset}: couldn't replace generic color parameter")
    text = control

    def assign(match: re.Match[str]) -> str:
        part = match.group(2)
        role = role_by_part[part]
        return f"{match.group(1)}.color({role})"

    text, changed = re.subn(
        r'(\.part\(\s*["\']([^"\']+)["\'][^\n]*?)\.color\(color\)',
        assign,
        text,
    )
    if changed != len(names):
        raise ValueError(f"{asset}: recolored {changed} of {len(names)} existing parts")

    if asset == "honey-extractor":
        text = text.replace(
            'p.part("crank-arm",b(0,-90,900,260,35,35).color(stainless));',
            'p.part("crank-arm",box(260,35,35,true).rotateZ(28).translate(0,-90,900).scale(scale).color(stainless));',
        )

    additions = ADDITIONS.get(asset)
    if additions:
        text = text.replace("\nreturn p.model();", f"\n{additions}\n\nreturn p.model();")
    text = apply_source_replacements(text, asset)
    if "param('color'" in text or ".color(color)" in text:
        raise ValueError(f"{asset}: generic color remains")
    if asset in {"honey-jar", "honey-settling-tank", "langstroth-hive"} and additions and additions not in text:
        raise ValueError(f"{asset}: geometry addition did not land")

    source.write_text(text, encoding="utf-8")
    return len(roles), 2


def main() -> None:
    sources = sorted(KIT.glob("*.kcad.ts"))
    if len(sources) != 50:
        raise SystemExit(f"expected 50 existing apiary assets, found {len(sources)}")
    promoted = 0
    controls_added = 0
    preset_entries_added = 0
    for source in sources:
        colors, preset_count = promote(source)
        if asset_id(source) != "apiary-gate":
            promoted += 1
            controls_added += colors
            preset_entries_added += preset_count
        print(f"{source.stem}: {colors} material controls, {preset_count} presets")
    print(
        f"Reviewed 50 existing assets; promoted {promoted}; added {controls_added} material controls "
        f"and {preset_entries_added} preset entries."
    )


if __name__ == "__main__":
    main()
