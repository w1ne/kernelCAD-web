#!/usr/bin/env python3
"""Promote the existing marine assets with material-separated controls."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/marine"
OUT = Path(__file__).resolve().parent

LABELS = {
    "paintedHull": "Painted hull coating",
    "paintedFiberglass": "Painted fiberglass",
    "paintedSteel": "Painted steel",
    "paintedAluminum": "Painted aluminum",
    "stainlessSteel": "Stainless steel",
    "galvanizedSteel": "Galvanized steel",
    "marineHardware": "Marine hardware",
    "brass": "Brass",
    "bronze": "Bronze",
    "rubber": "Rubber",
    "marineGlass": "Marine glass",
    "timber": "Timber",
    "ropeFiber": "Rope fiber",
    "canvas": "Canvas",
    "marinePolymer": "Marine polymer",
    "nonskidCoating": "Nonskid deck coating",
    "cargoCoating": "Cargo container coating",
    "safetyVinyl": "Safety vinyl",
    "safetyFabric": "Safety fabric",
    "safetyFoam": "Closed-cell safety foam",
    "safetyAmber": "Safety amber lens",
    "nylonWebbing": "Nylon webbing",
    "nylonNetting": "Nylon netting",
    "paperCard": "Printed paper card",
}

PALETTE = {
    "paintedHull": "#4c6874",
    "paintedFiberglass": "#e2e0d4",
    "paintedSteel": "#53676d",
    "paintedAluminum": "#607987",
    "stainlessSteel": "#b5c0c1",
    "galvanizedSteel": "#929fa2",
    "marineHardware": "#b1b9b7",
    "brass": "#c29b45",
    "bronze": "#a97b3b",
    "rubber": "#303638",
    "marineGlass": "#55a4bb",
    "timber": "#805d3d",
    "ropeFiber": "#a78a5d",
    "canvas": "#ddd0a6",
    "marinePolymer": "#528d96",
    "nonskidCoating": "#46575a",
    "cargoCoating": "#b4563e",
    "safetyVinyl": "#e45c3a",
    "safetyFabric": "#e15a38",
    "safetyFoam": "#f0bf3a",
    "safetyAmber": "#f2b536",
    "nylonWebbing": "#314954",
    "nylonNetting": "#73674f",
    "paperCard": "#e9dda7",
}

BASE_ROLE = {
    "anchor-chain": "galvanizedSteel", "anchor-winch": "paintedSteel",
    "anchor": "galvanizedSteel", "bait-bucket": "marinePolymer",
    "binnacle-compass": "timber", "boat-cleat": "stainlessSteel",
    "boat-fender": "rubber", "boat-hook": "timber", "boat-oar": "timber",
    "boat-paddle": "timber", "boat-trailer": "paintedSteel",
    "cargo-ship": "paintedHull", "channel-marker-buoy": "safetyVinyl",
    "coiled-mooring-rope": "ropeFiber", "crab-trap": "galvanizedSteel",
    "dock-bollard": "paintedSteel", "dock-ladder": "galvanizedSteel",
    "dock-piling": "timber", "fish-crate": "timber",
    "fishing-boat": "paintedHull", "fishing-net": "ropeFiber",
    "inflatable-life-raft": "safetyVinyl", "life-jacket": "safetyFabric",
    "life-raft-canister": "paintedFiberglass", "life-ring": "safetyFoam",
    "lobster-pot": "timber", "magnetic-compass": "brass",
    "mooring-buoy": "safetyVinyl", "motorboat": "paintedHull",
    "outboard-motor": "paintedAluminum", "porthole": "brass",
    "rescue-lifeboat": "safetyVinyl", "sailboat": "paintedHull",
    "sextant": "brass", "ship-bell": "bronze", "ship-horn": "paintedSteel",
    "ship-wheel": "timber", "throw-rope-bag": "safetyFabric",
    "tugboat": "paintedHull", "yacht": "paintedFiberglass",
}

# Exact component assignments keep the color controls tied to the material a
# viewer sees on that part. Unlisted components retain the asset's main material.
PART_ROLE = {
    "anchor-chain": {"terminal-shackle": "stainlessSteel"},
    "anchor-winch": {"drum-flange-left": "stainlessSteel", "drum-flange-right": "stainlessSteel", "crank-handle": "rubber"},
    "anchor": {"ring": "stainlessSteel"},
    "bait-bucket": {"handle-left": "stainlessSteel", "handle-right": "stainlessSteel", "handle-grip": "rubber", "rim": "stainlessSteel"},
    "binnacle-compass": {"shoulder": "brass", "compass-bowl": "brass", "hood": "marineGlass", "mount-left": "stainlessSteel", "mount-right": "stainlessSteel"},
    "boat-cleat": {"mount-left": "brass", "mount-right": "brass"},
    "boat-fender": {"top-eye": "stainlessSteel", "bottom-eye": "stainlessSteel", "cap-top": "rubber", "cap-bottom": "rubber"},
    "boat-hook": {"collar": "stainlessSteel", "hook-spine": "stainlessSteel", "hook-tip": "safetyAmber", "crossbar": "stainlessSteel"},
    "boat-oar": {"grip": "rubber", "collar": "stainlessSteel"},
    "boat-paddle": {"blade-neck": "stainlessSteel", "t-grip": "rubber"},
    "boat-trailer": {"wheel-left": "rubber", "wheel-right": "rubber", "axle": "galvanizedSteel", "coupler": "stainlessSteel", "winch-drum": "stainlessSteel"},
    "cargo-ship": {"deck": "nonskidCoating", "bridge-top": "stainlessSteel", "container-1": "cargoCoating", "container-2": "cargoCoating", "container-3": "cargoCoating", "container-4": "cargoCoating", "container-5": "cargoCoating", "container-6": "cargoCoating"},
    "channel-marker-buoy": {"mast": "galvanizedSteel", "keel-weight": "galvanizedSteel", "float-cap": "safetyAmber", "daymark": "safetyAmber"},
    "coiled-mooring-rope": {"eye-splice": "stainlessSteel"},
    "crab-trap": {"bait-cage": "nylonNetting", "handle": "ropeFiber"},
    "dock-bollard": {"column": "stainlessSteel", "cap": "stainlessSteel", "horn-left": "stainlessSteel", "horn-right": "stainlessSteel"},
    "dock-ladder": {"rung-1": "stainlessSteel", "rung-2": "stainlessSteel", "rung-3": "stainlessSteel", "rung-4": "stainlessSteel", "rung-5": "stainlessSteel"},
    "dock-piling": {"cap": "galvanizedSteel", "collar": "galvanizedSteel", "base-shoe": "galvanizedSteel"},
    "fish-crate": {"rim-front": "stainlessSteel", "rim-back": "stainlessSteel", "corner-left": "stainlessSteel", "corner-right": "stainlessSteel"},
    "fishing-boat": {"deck": "nonskidCoating", "front-window": "marineGlass", "stern-rail": "stainlessSteel", "bow-rail": "stainlessSteel"},
    "fishing-net": {"net-1": "nylonNetting", "net-2": "nylonNetting", "net-3": "nylonNetting", "net-4": "nylonNetting", "net-5": "nylonNetting"},
    "inflatable-life-raft": {"canopy-pole": "stainlessSteel", "canopy": "canvas"},
    "life-jacket": {"left-flotation": "safetyFoam", "right-flotation": "safetyFoam", "waist-strap": "nylonWebbing", "buckle": "marineHardware"},
    "life-raft-canister": {"strap-left": "nylonWebbing", "strap-right": "nylonWebbing", "cradle-left": "stainlessSteel", "cradle-right": "stainlessSteel"},
    "life-ring": {"strap-1": "nylonWebbing", "strap-2": "nylonWebbing", "strap-3": "nylonWebbing", "strap-4": "nylonWebbing", "rope-loop": "ropeFiber"},
    "lobster-pot": {"entry-funnel-left": "nylonNetting", "entry-funnel-right": "nylonNetting", "handle": "stainlessSteel"},
    "magnetic-compass": {"bezel": "stainlessSteel", "card": "paperCard", "lubber-line": "safetyAmber", "mount-ear-left": "stainlessSteel", "mount-ear-right": "stainlessSteel"},
    "mooring-buoy": {"lifting-eye": "galvanizedSteel", "chain-shackle": "stainlessSteel"},
    "motorboat": {"deck": "nonskidCoating", "windshield": "marineGlass", "seat-front": "paintedHull", "seat-rear": "paintedHull", "motor-mount": "stainlessSteel"},
    "outboard-motor": {"midsection": "stainlessSteel", "gearcase": "stainlessSteel", "skeg": "stainlessSteel", "prop-shaft": "stainlessSteel", "prop-blade-1": "bronze", "prop-blade-2": "bronze", "tiller": "rubber", "clamp": "stainlessSteel"},
    "porthole": {"inner-glass": "marineGlass", "lug-top": "stainlessSteel", "lug-bottom": "stainlessSteel", "lug-left": "stainlessSteel", "lug-right": "stainlessSteel"},
    "rescue-lifeboat": {"deck": "nonskidCoating", "front-window": "marineGlass", "side-window": "marineGlass", "beacon": "safetyAmber"},
    "sailboat": {"deck": "nonskidCoating", "mast": "timber", "boom": "timber", "main-sail": "canvas"},
    "sextant": {"index-arm": "stainlessSteel", "telescope": "marineGlass", "eyepiece": "marineGlass", "handle": "timber"},
    "ship-bell": {"stem": "brass", "crown": "brass", "loop": "brass", "clapper": "stainlessSteel"},
    "ship-horn": {"mouth": "stainlessSteel", "rear-cap": "stainlessSteel", "support-left": "stainlessSteel", "support-right": "stainlessSteel"},
    "ship-wheel": {"hub": "brass", "handle-top": "brass", "handle-left": "brass", "handle-right": "brass"},
    "throw-rope-bag": {"top-loop": "ropeFiber", "base-band": "nylonWebbing", "side-grip": "rubber"},
    "tugboat": {"deck": "nonskidCoating", "front-glass": "marineGlass", "bow-fender": "rubber"},
    "yacht": {"deck": "nonskidCoating", "window-band": "marineGlass", "swim-platform": "nonskidCoating", "bow-rail": "stainlessSteel"},
}

FEATURES = {
    "anchor-chain": "Articulated chain links lead to a terminal shackle.",
    "anchor-winch": "Twin cheek plates hold a winding drum and hand crank.",
    "anchor": "A long shank, cross-stock, ring, and splayed flukes form the holding profile.",
    "bait-bucket": "A tapered bait tub has a fitted lid, rim, wire handles, and a grip.",
    "binnacle-compass": "A raised compass bowl and hood sit above a tapered pedestal and mounting feet.",
    "boat-cleat": "Two raised horns bridge a deck plate with paired mounting feet.",
    "boat-fender": "An inflated cylindrical fender has end caps and reinforced eye loops.",
    "boat-hook": "A long pole ends in a guarded hook with a crossbar and ferrule.",
    "boat-oar": "A tapered shaft connects a broad blade, hand grip, and collar.",
    "boat-paddle": "A long shaft carries a wide blade, reinforced neck, and T-grip.",
    "boat-trailer": "A road trailer combines a long beam, axle, two wheels, bunks, and winch post.",
    "cargo-ship": "A faceted hull carries six container blocks behind a raised bridge.",
    "channel-marker-buoy": "A weighted float supports a marker mast, daymark, and top ball.",
    "coiled-mooring-rope": "Three rope turns lead into a loose end and spliced eye.",
    "crab-trap": "A ribbed trap frame surrounds a bait cage and lifting handle.",
    "dock-bollard": "A flared foot and capped column support two opposing mooring horns.",
    "dock-ladder": "Two tall side rails carry evenly spaced horizontal rungs.",
    "dock-piling": "A timber pile has a protective cap, collar, and base shoe.",
    "fish-crate": "An open slatted crate has a solid base, perimeter rim, and corner plates.",
    "fishing-boat": "A faceted working hull carries a wheelhouse, glazed front, mast, and bow and stern rails.",
    "fishing-net": "Crossed net strands hang from reinforced side ropes and top and bottom lines.",
    "inflatable-life-raft": "An inflatable perimeter surrounds a raft floor beneath a raised canopy.",
    "life-jacket": "A shaped torso has paired flotation panels, a collar, waist strap, and buckle.",
    "life-raft-canister": "A cylindrical raft canister is retained by two straps in a paired cradle.",
    "life-ring": "A buoyant ring is marked by four cross straps and a retrieval loop.",
    "lobster-pot": "A tapered pot frame has opposed entry funnels and a top handle.",
    "magnetic-compass": "A marked compass card sits inside a bezel with a lubber line and mounting ears.",
    "mooring-buoy": "A buoyant float carries a lifting eye and a lower chain shackle.",
    "motorboat": "A pointed hull supports a cockpit console, glazed screen, paired seats, and motor mount.",
    "outboard-motor": "A cowled powerhead narrows through a leg to a skeg and three-blade propeller.",
    "porthole": "A glazed round opening is held by a thick frame and four mounting lugs.",
    "rescue-lifeboat": "A deep rescue hull carries a raised cabin, glazed windows, and roof beacon.",
    "sailboat": "A narrow hull carries a mast, boom, triangular sail, and open cockpit.",
    "sextant": "A graduated arc and index arm frame a telescope above a hand grip.",
    "ship-bell": "A flared bell hangs from a crown and loop around a visible clapper.",
    "ship-horn": "A trumpet body flares to a broad mouth above a supported mounting base.",
    "ship-wheel": "A circular rim surrounds a hub with radial spokes and projecting handles.",
    "throw-rope-bag": "A compact throw bag has a shoulder, grab loop, reinforced base, and side grip.",
    "tugboat": "A low working hull carries a raised bridge, paired stacks, front glazing, and bow fender.",
    "yacht": "A long white hull carries two cabin levels, a dark window band, swim platform, and bow rail.",
}


def mix(hex_color: str, toward: tuple[int, int, int], amount: float) -> str:
    rgb = tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    out = tuple(round(old * (1 - amount) + new * amount) for old, new in zip(rgb, toward))
    return "#" + "".join(f"{v:02x}" for v in out)


def main() -> None:
    records = []
    for path in sorted(KIT.glob("*.kcad.ts")):
        asset_id = path.name.removesuffix(".kcad.ts")
        src = path.read_text()
        if asset_id not in FEATURES or asset_id not in BASE_ROLE or asset_id not in PART_ROLE:
            raise ValueError(f"missing promotion map for {asset_id}")
        if "presets({" in src or "paintedHull = param(" in src:
            raise ValueError(f"already promoted: {asset_id}")
        color_match = re.search(r"const color = param\('color',\s*(['\"])(#[0-9a-fA-F]{6})\1,\s*\{ label: ['\"]Asset color['\"] \}\);", src)
        if not color_match:
            raise ValueError(f"could not read generic color parameter: {asset_id}")
        old_color = color_match.group(2).lower()
        base = BASE_ROLE[asset_id]
        part_names = re.findall(r"\.part\(\s*(['\"])([^'\"]+)\1", src)
        names = [name for _, name in part_names]
        if not names:
            raise ValueError(f"no named components found: {asset_id}")
        assignments = {name: PART_ROLE[asset_id].get(name, base) for name in names}
        unknown = set(PART_ROLE[asset_id]) - set(names)
        if unknown:
            raise ValueError(f"unknown part assignments for {asset_id}: {sorted(unknown)}")
        roles = list(dict.fromkeys(assignments.values()))
        if not 2 <= len(roles) <= 4:
            raise ValueError(f"expected 2-4 material roles for {asset_id}, got {roles}")

        preserve_original_finish = {
            "paintedHull", "paintedFiberglass", "paintedSteel", "paintedAluminum",
            "brass", "bronze", "timber", "ropeFiber", "marinePolymer",
            "safetyVinyl", "safetyFabric", "safetyFoam",
        }
        defaults = {
            role: (old_color if role == base and role in preserve_original_finish else PALETTE[role])
            for role in roles
        }
        weathered = {role: mix(value, (116, 109, 91), 0.18 if role in ("stainlessSteel", "marineGlass") else 0.28)
                     for role, value in defaults.items()}
        signal_color = {
            "timber": "#a87b3e", "brass": "#d1a448", "bronze": "#bd8a3d",
            "paintedFiberglass": "#e59b35", "paintedHull": "#e56b38",
            "paintedSteel": "#e39032", "paintedAluminum": "#e29435",
            "galvanizedSteel": "#d9a13a", "stainlessSteel": "#d7a342",
            "marinePolymer": "#eda338", "ropeFiber": "#c19d53",
            "canvas": "#e2bd68", "nonskidCoating": "#d09a3b",
            "cargoCoating": "#ed8536", "safetyVinyl": "#f17935",
            "safetyFabric": "#f17b39", "safetyFoam": "#f17939",
            "marineGlass": "#77c1cb", "marineHardware": "#d9ac4b",
            "rubber": "#675746", "nylonWebbing": "#e8a542",
            "nylonNetting": "#b3975d", "paperCard": "#f1e2ad",
            "safetyAmber": "#ffd34f",
        }
        high_visibility = {base: signal_color[base]}
        knobs = "\n".join(
            f"const {role} = param('{role}', '{defaults[role]}', {{ label: '{LABELS[role]}' }});"
            for role in roles
        )
        preset = (
            "presets({\n"
            + "  weathered: { " + ", ".join(f"{role}: '{value}'" for role, value in weathered.items()) + " },\n"
            + "  highVisibility: { " + ", ".join(f"{role}: '{value}'" for role, value in high_visibility.items()) + " },\n"
            + "});"
        )
        src = re.sub(
            r"^const color = param\('color'.*?\);$",
            knobs + "\n" + preset,
            src,
            count=1,
            flags=re.M,
        )
        if "const color = param('color'" in src:
            raise ValueError(f"generic color control remains in {asset_id}")
        for name, role in assignments.items():
            pattern = re.compile(rf"(\.part\(\s*['\"]{re.escape(name)}['\"].*?)\.color\(color\)")
            src, changed = pattern.subn(rf"\1.color({role})", src, count=1)
            if changed != 1:
                raise ValueError(f"could not assign material for {asset_id}/{name}")
        if ".color(color)" in src:
            raise ValueError(f"generic color assignment remains in {asset_id}")

        title_match = re.search(r"title:\s*(['\"])(.*?)\1", src)
        title = title_match.group(2) if title_match else asset_id.replace("-", " ").title()
        feature = FEATURES[asset_id]
        description = f"{title}: {feature} Low-poly visualization prop. Material controls: {', '.join(LABELS[role].lower() for role in roles)}."
        src, desc_count = re.subn(
            r"description:\s*(['\"])(?:[^'\"]*)\1,",
            "description: " + json.dumps(description) + ",",
            src,
            count=1,
        )
        if desc_count != 1:
            raise ValueError(f"could not update description for {asset_id}")
        src = re.sub(r"^// .*?$", f"// {title}: {feature} Low-poly visualization geometry, millimetres, Z up.", src, count=1, flags=re.M)
        src = re.sub(r"^// Millimetres, Z up.*All visible parts share one color control\.$", "// Material controls are assigned to the named physical components below.", src, count=1, flags=re.M)
        path.write_text(src)
        records.append({
            "id": asset_id,
            "title": title,
            "components": len(names),
            "materials": roles,
            "assignments": assignments,
            "presets": ["weathered", "highVisibility"],
            "feature": feature,
            "originalColor": old_color,
        })

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "promotion-audit.json").write_text(json.dumps({"kit": "marine", "assets": records}, indent=2) + "\n")
    print(f"Promoted {len(records)} marine assets; wrote {OUT / 'promotion-audit.json'}")


if __name__ == "__main__":
    main()
