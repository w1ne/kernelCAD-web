#!/usr/bin/env python3
"""Promote the existing data-center kit with useful material controls and shapes."""

from __future__ import annotations

import importlib.util
import json
import math
import re
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/data-center-infrastructure"
BASE_SCRIPT = ROOT / "artifacts/catalog-demos/data-center-wave-20261103/generate_data_center_assets.py"
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import passes, score  # noqa: E402

spec = importlib.util.spec_from_file_location("data_center_wave_source", BASE_SCRIPT)
if spec is None or spec.loader is None:
    raise SystemExit(f"cannot load original geometry source: {BASE_SCRIPT}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

MATERIALS = {
    "steel": {"label": "Painted steel", "default": "#4f7485", "highVisibility": "#d99b22"},
    "polymer": {"label": "Engineering polymer", "default": "#c99b35", "highVisibility": "#263e48"},
    "glass": {"label": "Glass and display lenses", "default": "#42bac9", "highVisibility": "#53d5e0"},
    "rubber": {"label": "Rubber and elastomer", "default": "#252a2d", "highVisibility": "#2a3033"},
    "copper": {"label": "Copper conductors", "default": "#bd7748", "highVisibility": "#ce8948"},
    "aluminum": {"label": "Aluminum fins and panels", "default": "#b9c6ca", "highVisibility": "#dde4e5"},
    "ceramic": {"label": "Electrical ceramic", "default": "#e2ddcf", "highVisibility": "#f0eadc"},
}
ROLE_PRIORITY = ["polymer", "glass", "rubber", "copper", "aluminum", "ceramic"]
DESCRIPTION_OVERRIDES = {
    "modular-ups-cabinet": "Modular UPS cabinet with removable power-module drawers, a service display, ventilation louvers, and a separated base plinth.",
    "data-center-battery-cabinet": "Battery cabinet with repeated access drawers, terminal details, ventilation slots, and an isolated base plinth.",
    "rack-power-distribution-unit": "Vertical rack power distribution unit with a narrow steel channel, repeated outlet sockets, a jacketed feed cable, and mounting tabs.",
    "static-transfer-switch": "Transfer cabinet with two source indicators, paired operator controls, a service display, and a transfer handle.",
    "maintenance-bypass-cabinet": "Bypass switchboard cabinet with a guarded rotary bypass handle, paired source paths, and an interlock panel.",
    "automatic-transfer-switch-cabinet": "Transfer cabinet with utility and generator status windows, a central transfer control, and a lower cable plate.",
    "perimeter-precision-cooler": "Perimeter cooling unit with a broad intake grille, top discharge fans, a service door, plinth, and pipe connections.",
    "floor-air-grille": "Low floor air register with a rigid perimeter frame, closely spaced louver bars, a damper tab, and a shallow curb.",
}


def part_material(name: str) -> str:
    n = name.lower()
    if any(word in n for word in ("rubber", "grommet", "isolator", "foot", "cable", "cord", "hose", "seal", "pad", "bumper")):
        return "rubber"
    if any(word in n for word in ("display", "screen", "window", "lens", "indicator", "optic", "sight-glass", "meter-face")):
        return "glass"
    if any(word in n for word in ("bushing", "insulator")):
        return "ceramic"
    if any(word in n for word in ("copper", "busbar", "conductor", "winding", "terminal-post", "contact")):
        return "copper"
    if any(word in n for word in ("cooling-fin", "coil-fin", "heat-exchanger-plate", "radiator-fin")):
        return "aluminum"
    if any(word in n for word in ("handle", "knob", "button", "control", "latch", "connector", "coupler", "outlet", "drive-carrier", "fan-blade", "cell-cover", "module-drawer", "selector")):
        return "polymer"
    return "steel"


def box_part(name: str, x: float, y: float, z: float, w: float, d: float, h: float) -> tuple:
    return ("box", name, x, y, z, w, d, h)


def cylinder_part(name: str, x: float, y: float, z: float, h: float, r: float, sides: int = 10) -> tuple:
    return ("cylinder", name, x, y, z, h, r, sides)


def add_object_details(asset_id: str, parts: list[tuple]) -> list[tuple]:
    """Give shared profiles their actual equipment-specific details."""
    if asset_id == "modular-ups-cabinet":
        parts = [p for p in parts if not (p[1].startswith("vent-louver-") or p[1] == "front-door")]
        parts += [
            box_part(f"power-module-drawer-{i}", -245 + i * 163, -390, 220 + row * 265, 148, 34, 205)
            for row in range(4) for i in range(3)
        ]
        parts += [box_part(f"module-release-grip-{i}", -245 + i * 163, -414, 300, 72, 14, 22) for i in range(3)]
    elif asset_id == "data-center-battery-cabinet":
        parts = [p for p in parts if not (p[1].startswith("vent-louver-") or p[1] == "front-door")]
        parts += [
            box_part(f"battery-drawer-{i}", 0, -390, 200 + i * 260, 610, 34, 205)
            for i in range(5)
        ]
        parts += [
            box_part(f"battery-vent-slot-{i}", 0, -414, 425 + i * 45, 360, 12, 12)
            for i in range(5)
        ]
    elif asset_id == "static-transfer-switch":
        parts = [p for p in parts if not p[1].startswith("vent-louver-")]
        parts += [
            cylinder_part("utility-source-indicator", -175, -465, 1010, 36, 28, 8),
            cylinder_part("generator-source-indicator", 175, -465, 1010, 36, 28, 8),
            box_part("transfer-handle", 0, -473, 680, 105, 26, 180),
        ]
    elif asset_id == "maintenance-bypass-cabinet":
        parts = [p for p in parts if not p[1].startswith("vent-louver-")]
        parts += [
            box_part("bypass-interlock-panel", 0, -414, 825, 430, 24, 390),
            cylinder_part("rotary-bypass-selector", 0, -460, 720, 70, 68, 10),
            box_part("bypass-selector-handle", 0, -493, 790, 175, 24, 28),
            box_part("utility-path-bar", -220, -430, 1310, 360, 22, 35),
            box_part("bypass-path-bar", 220, -430, 1310, 360, 22, 35),
        ]
    elif asset_id == "automatic-transfer-switch-cabinet":
        parts = [p for p in parts if not p[1].startswith("vent-louver-")]
        parts += [
            box_part("utility-source-window", -180, -414, 1090, 190, 18, 95),
            box_part("generator-source-window", 180, -414, 1090, 190, 18, 95),
            cylinder_part("transfer-control", 0, -460, 840, 48, 40, 10),
        ]
    elif asset_id == "perimeter-precision-cooler":
        parts = [
            box_part("cooler-plinth", 0, 0, 0, 1320, 1120, 115),
            box_part("evaporator-cabinet", 0, 0, 115, 1220, 980, 1580),
            box_part("front-coil-panel", 0, -510, 250, 790, 28, 1240),
            *[box_part(f"front-grille-bar-{i}", 0, -534, 315 + i * 118, 760, 20, 34) for i in range(9)],
            box_part("service-door", 425, -510, 260, 255, 28, 1170),
            *[cylinder_part(f"top-discharge-fan-{i}", -390 + i * 390, 0, 1695, 55, 160, 12) for i in range(3)],
            box_part("pipe-header", 0, 540, 480, 760, 70, 70),
            *[cylinder_part(f"coolant-pipe-stub-{i}", -250 + i * 500, 565, 430, 125, 48, 10) for i in range(2)],
            box_part("mounting-foot-front-left", -540, -450, 0, 120, 105, 90),
            box_part("mounting-foot-front-right", 540, -450, 0, 120, 105, 90),
        ]
    elif asset_id == "floor-air-grille":
        parts = [
            box_part("register-curb", 0, 0, 0, 650, 650, 45),
            box_part("grille-frame", 0, 0, 45, 600, 600, 35),
            *[box_part(f"air-louver-{i}", -240 + i * 48, 0, 80, 24, 535, 20) for i in range(11)],
            box_part("damper-adjuster-tab", 268, 0, 78, 48, 48, 32),
        ]
    elif asset_id == "rack-power-distribution-unit":
        parts = [
            box_part("pdu-channel", 0, 0, 0, 150, 135, 1980),
            box_part("front-strip", 0, -78, 35, 120, 28, 1900),
            *[("horizontal-y", f"outlet-{i}", 0, -106, 100 + i * 135, 36, 18, 8) for i in range(13)],
            box_part("mounting-tab-top", 0, 85, 1830, 180, 40, 90),
            box_part("mounting-tab-bottom", 0, 85, 80, 180, 40, 90),
            ("horizontal-y", "feed-cable", 0, 150, 42, 260, 18, 8),
            box_part("cable-strain-relief", 0, 165, 45, 60, 45, 45),
        ]

    if asset_id == "enclosed-it-rack":
        parts += [box_part("door-vent-inset", 0, -546, 510, 340, 10, 720)]
        parts += [
            box_part(f"door-vent-slat-{i}", 0, -553, 540 + i * 60, 355, 10, 18)
            for i in range(11)
        ]
    elif asset_id == "air-cooled-chiller":
        for bank_x, side in ((-1050, "left"), (1050, "right")):
            parts += [
                box_part(f"coil-fin-{side}-{i}", bank_x, -687, 170 + i * 52, 735, 18, 14)
                for i in range(12)
            ]
        fan_centers = [(-1100 + (i % 3) * 1100, -400 + (i // 3) * 800) for i in range(6)]
        for fan, (x, y) in enumerate(fan_centers):
            for blade in range(3):
                angle = blade * 120
                radians = math.radians(angle)
                parts.append((
                    "rotbox", f"condenser-fan-blade-{fan}-{blade}",
                    x + math.cos(radians) * 62, y + math.sin(radians) * 62,
                    895, 132, 24, 13, angle + 20,
                ))
    elif asset_id == "cooling-tower-cell":
        parts.append(("frustum", "fan-cowl", 0, 0, 2070, 100, 430, 370, 12))
        for blade in range(4):
            angle = blade * 90
            radians = math.radians(angle)
            parts.append((
                "rotbox", f"fan-blade-{blade}", math.cos(radians) * 95,
                math.sin(radians) * 95, 2170, 210, 38, 15, angle + 14,
            ))
    elif asset_id == "dry-type-transformer":
        parts = [p for p in parts if not p[1].startswith("terminal-bushing-")]
        parts += [
            ("frustum", f"terminal-bushing-{i}", -250 + i * 250, 0, 900, 190, 72, 46, 8)
            for i in range(3)
        ]
    elif asset_id == "standby-generator-enclosure":
        parts = [p for p in parts if p[1] != "exhaust-stack"]
        parts.append(("frustum", "exhaust-stack", 900, 300, 1430, 400, 65, 48, 10))
        parts += [
            box_part(f"radiator-fin-{i}", -820 + i * 90, -535, 360, 24, 22, 650)
            for i in range(10)
        ]
    elif asset_id == "environmental-sensor":
        parts = [p for p in parts if p[1] != "vent-cap"]
        parts.append(("frustum", "vent-cap", 0, 0, 1175, 80, 95, 76, 10))

    return parts


def selected_roles(parts: list[tuple]) -> tuple[list[str], dict[str, str]]:
    assignments = {part[1]: part_material(part[1]) for part in parts}
    counts = Counter(assignments.values())
    secondary = sorted(
        (role for role in counts if role != "steel"),
        key=lambda role: (-counts[role], ROLE_PRIORITY.index(role)),
    )
    roles = ["steel", *secondary[:3]]
    if len(roles) < 2:
        # Rectilinear all-steel equipment still gets a useful polymer control on
        # its removable or service-facing panel.
        candidate = next((name for name in assignments if any(w in name for w in ("panel", "door", "cover", "cap"))), next(iter(assignments)))
        assignments[candidate] = "polymer"
        roles.append("polymer")
    allowed = set(roles)
    assignments = {name: role if role in allowed else "steel" for name, role in assignments.items()}
    if not 2 <= len(roles) <= 4:
        raise ValueError(f"expected 2–4 material roles, got {roles}")
    return roles, assignments


def lowest_z(part: tuple) -> float:
    if part[0] == "frustum":
        return float(part[4])
    if part[0] == "rotbox":
        return float(part[4])
    return float(base.low_surface(part))


def material_default(role: str, asset_id: str, original: str) -> str:
    if role == "steel":
        return "#b43b31" if asset_id == "emergency-power-off-station" else MATERIALS[role]["default"]
    if role == "polymer" and asset_id == "emergency-power-off-station":
        return "#f0c330"
    return MATERIALS[role]["default"]


def ngon(radius: str, sides: str) -> list[str]:
    return [
        f"const ngon = (r: number, s: number) => {{",
        "  let profile = path().moveTo(r, 0);",
        "  for (let i = 1; i < s; i++) {",
        "    const a = 2 * Math.PI * i / s;",
        "    profile = profile.lineTo(r * Math.cos(a), r * Math.sin(a));",
        "  }",
        "  return profile.close();",
        "};",
        "const frustum = (x: number, y: number, z: number, h: number, r0: number, r1: number, sides = 10) => {",
        "  const bottom = ngon(r0, sides), top = ngon(r1, sides);",
        "  return bottom.loft([top], {",
        "    planes: [",
        "      { plane: 'XY' as const, origin: [x, y, z - baseZ] as [number, number, number] },",
        "      { plane: 'XY' as const, origin: [x, y, z + h - baseZ] as [number, number, number] },",
        "    ],",
        "    ruled: true,",
        "  }).scale(scale);",
        "};",
    ]


def source_for(spec_row: tuple, index: int) -> tuple[str, dict]:
    asset_id, title, original_description, original_color, profile = spec_row
    description = DESCRIPTION_OVERRIDES.get(asset_id, original_description)
    parts = add_object_details(asset_id, list(base.parts_for(profile, index)))
    if not parts:
        raise ValueError(f"{asset_id}: no part geometry")
    roles, assignments = selected_roles(parts)
    base_z = min(lowest_z(part) for part in parts)
    material_words = ", ".join(MATERIALS[role]["label"].lower() for role in roles)
    full_description = (
        f"{description} Knobs: overall scale; {material_words}. "
        "Presets: facilityStandard and highVisibility."
    )
    lines = [
        "// SPDX-License-Identifier: CC0-1.0",
        f"// {title}: {description.rstrip('.')}.",
        "",
        "meta({",
        f"  name: {json.dumps(asset_id)},",
        "  license: 'CC0-1.0',",
        f"  title: {json.dumps(title)},",
        f"  description: {json.dumps(full_description)},",
        "  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],",
        "  kit: 'data-center-infrastructure',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],",
        "  triangleBudget: 2200,",
        "});",
        "",
        "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });",
    ]
    for role in roles:
        material = MATERIALS[role]
        lines.append(
            f"const {role} = param('{role}', '{material_default(role, asset_id, original_color)}', "
            f"{{ label: '{material['label']}' }});"
        )
    lines.extend([
        "",
        "presets({",
        "  facilityStandard: {",
        *[f"    {role}: '{material_default(role, asset_id, original_color)}'," for role in roles],
        "  },",
        "  highVisibility: {",
        *[f"    {role}: '{MATERIALS[role]['highVisibility']}'," for role in roles],
        "  },",
        "});",
        "",
        f"const baseZ = {base_z:g};",
        "const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);",
    ])
    kinds = {part[0] for part in parts}
    if "cylinder" in kinds:
        lines.append("const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);")
    if "horizontal-x" in kinds:
        lines.append("const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);")
    if "horizontal-y" in kinds:
        lines.append("const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);")
    if "rotbox" in kinds:
        lines.append("const rb=(x:number,y:number,z:number,w:number,d:number,h:number,a:number)=>box(w,d,h,true).rotateZ(a).translate(x,y,z-baseZ+h/2).scale(scale);")
    if "frustum" in kinds:
        lines.extend(["", *ngon("r", "s")])
    lines.extend(["", f"const p=assembly({json.dumps(asset_id)});"])
    helper = {"box": "b", "cylinder": "c", "horizontal-x": "hx", "horizontal-y": "hy", "rotbox": "rb", "frustum": "frustum"}
    for part in parts:
        kind, name, *args = part
        expression = f"{helper[kind]}({', '.join(map(str, args))})"
        lines.append(f"p.part({json.dumps(name)}, {expression}.color({assignments[name]}));")
    lines.extend(["", "return p.model();", ""])
    source = "\n".join(lines)
    with tempfile.NamedTemporaryFile("w", suffix=".kcad.ts", encoding="utf-8", delete=False) as handle:
        handle.write(source)
        temporary_path = handle.name
    try:
        measured = score(temporary_path)
        if not passes(measured, 2):
            raise ValueError(f"{asset_id}: quality gate refused {measured.colours} materials / {measured.presets} presets")
    finally:
        Path(temporary_path).unlink(missing_ok=True)
    return source, {
        "materials": roles,
        "parts": len(parts),
        "presets": ["facilityStandard", "highVisibility"],
        "description": full_description,
    }


def promote() -> None:
    rows = list(base.ASSETS)
    expected = {row[0] for row in rows}
    existing = {path.stem.removesuffix(".kcad") for path in KIT.glob("*.kcad.ts")}
    if len(rows) != 50 or existing != expected:
        raise SystemExit(f"expected the same 50 existing IDs; source={len(existing)}, plan={len(rows)}")
    generated = [(row, *source_for(row, i)) for i, row in enumerate(rows)]
    before = json.loads((ROOT / "catalog/index.json").read_text())
    old_ids = {asset["id"] for asset in before["assets"]}
    if not expected.issubset(old_ids):
        raise SystemExit("promotion cannot add IDs; the existing catalog does not match the planned kit")
    for row, source, _audit in generated:
        (KIT / f"{row[0]}.kcad.ts").write_text(source)
    audit = {
        "kit": "data-center-infrastructure",
        "assetsPromoted": len(generated),
        "idsAdded": len(expected - old_ids),
        "assets": {row[0]: asset_audit for row, _source, asset_audit in generated},
        "geometryChanges": [
            "rack power distribution unit has a narrow outlet channel and separate jacketed feed cable",
            "perimeter precision cooler has a distinct wide cabinet, front coil and top fans",
            "UPS, battery, transfer-switch and floor-grille profiles have equipment-specific faces and controls",
            "air-cooled chiller has repeated coil fins and six visible three-blade fans",
            "cooling tower has a tapered fan cowl and fan blades",
            "transformer bushings, generator stack and sensor cap use lofted profiles",
        ],
    }
    (BUNDLE / "promotion-source-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
    previous_settings_path = BUNDLE / "settings.json"
    previous_settings = json.loads(previous_settings_path.read_text()) if previous_settings_path.exists() else {}
    baseline_commit = previous_settings.get("baselineCommit") or subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True,
        text=True, check=True,
    ).stdout.strip()
    baseline_audit = previous_settings.get(
        "baselineCatalogAudit", {"passing": 1604, "total": 2390, "passRatePercent": 67.1}
    )
    settings = {
        "kit": "data-center-infrastructure",
        "date": "2026-11-05",
        "baselineCommit": baseline_commit,
        "baselineCatalogAudit": baseline_audit,
        "assetCount": 50,
        "assetsAdded": 0,
        "materialControls": "2-4 named by material for every existing asset",
        "presets": ["facilityStandard", "highVisibility"],
        "triangleBudget": 2200,
        "previewCommand": "npx tsx scripts/renderCatalogPreviews.ts <all 50 kit ids>",
        "indexCommand": "npx tsx scripts/buildAssetCatalog.ts",
        "comparisonNote": "/home/andrii/worktrees/kernelCAD-private/catalog-data-center-infrastructure-compare-20261105/COMPARISON.md",
        "source": "promote_data_center_infrastructure.py imports original geometry profiles from the 2026-11-03 wave generator and writes all existing IDs in place",
        "verificationScope": {
            "covered": ["quality gate", "source lint", "catalog integration tests", "targeted PNG previews", "index source hashes and preview paths", "local pages", "source-to-preview demo"],
            "notCovered": ["deployed behavior for this branch", "facility design", "electrical or cooling performance", "safety certification", "physical acceptance"],
        },
    }
    (BUNDLE / "settings.json").write_text(json.dumps(settings, indent=2) + "\n")
    print(f"promoted {len(generated)} existing data-center assets; added 0 IDs")


if __name__ == "__main__":
    promote()
