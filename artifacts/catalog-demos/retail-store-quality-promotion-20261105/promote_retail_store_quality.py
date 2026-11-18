#!/usr/bin/env python3
"""Promote the existing retail-store sources with material controls and presets."""

from __future__ import annotations

import json
import re
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/retail-store"

MATERIAL_LABELS = {
    "powderCoat": "Powder-coated steel",
    "stainless": "Stainless steel",
    "aluminium": "Aluminium",
    "galvanizedSteel": "Galvanized steel",
    "steel": "Steel",
    "glass": "Glass",
    "temperedGlass": "Tempered glass",
    "acrylic": "Acrylic",
    "polycarbonate": "Polycarbonate",
    "polypropylene": "Polypropylene",
    "abs": "ABS plastic",
    "rubber": "Rubber",
    "fabric": "Fabric",
    "laminate": "Laminate",
    "plywood": "Plywood",
    "timber": "Timber",
    "paper": "Paper",
    "vinyl": "Vinyl",
    "brass": "Brass",
}

CLEAN_STORE = {
    "powderCoat": "#e5ebed", "stainless": "#bfc8cb", "aluminium": "#c4cdd0",
    "galvanizedSteel": "#afbabb", "steel": "#9ca8ab", "glass": "#9ccfd6",
    "temperedGlass": "#a7d4d9", "acrylic": "#a1d1dc", "polycarbonate": "#a2d1d7",
    "polypropylene": "#d6e0d5", "abs": "#e5e9e9", "rubber": "#40474b",
    "fabric": "#be5548", "laminate": "#d5c3a5", "plywood": "#c9ad7b",
    "timber": "#b9915c", "paper": "#f0e5c9", "vinyl": "#dce9dc", "brass": "#c29a4c",
}

NIGHT_RESTOCK = {
    "powderCoat": "#354750", "stainless": "#66747a", "aluminium": "#6b7a80",
    "galvanizedSteel": "#566468", "steel": "#4a585d", "glass": "#3e6677",
    "temperedGlass": "#476d78", "acrylic": "#486b80", "polycarbonate": "#486b7b",
    "polypropylene": "#45614e", "abs": "#364a55", "rubber": "#262b2e",
    "fabric": "#d5a833", "laminate": "#685744", "plywood": "#6d5839",
    "timber": "#6e5133", "paper": "#c9b27e", "vinyl": "#d2a536", "brass": "#8f682c",
}


def config(default: str, colors: dict[str, str], rules: list[tuple[str, str]]) -> dict[str, object]:
    return {"default": default, "colors": colors, "rules": rules}


ASSETS: dict[str, dict[str, object]] = {
    "aisle-sign": config("aluminium", {"aluminium": "#77858b", "acrylic": "#e6d6ab", "vinyl": "#c65b3e"}, [(r"sign-panel", "acrylic"), (r"border|arrow", "vinyl")]),
    "assisted-checkout-till": config("abs", {"abs": "#56656d", "glass": "#8dc8d2", "paper": "#f0e3c3"}, [(r"screen", "glass"), (r"receipt", "paper")]),
    "bakery-display-case": config("laminate", {"laminate": "#876f58", "temperedGlass": "#9acfd4", "stainless": "#aeb8ba"}, [(r"post|canopy", "temperedGlass"), (r"rail|trim", "stainless")]),
    "barcode-scanner": config("abs", {"abs": "#38474e", "glass": "#75c5d4", "polycarbonate": "#e0a735"}, [(r"window", "glass"), (r"status", "polycarbonate")]),
    "bottle-return-kiosk": config("powderCoat", {"powderCoat": "#4e665d", "stainless": "#aab4b5", "polycarbonate": "#8bc9b0"}, [(r"intake|control|status", "polycarbonate"), (r"service-door", "stainless")]),
    "bulk-food-bin": config("timber", {"timber": "#877355", "acrylic": "#b5d4ce", "stainless": "#a9b1b2"}, [(r"hopper", "acrylic"), (r"rim|tray|lip|knob", "stainless")]),
    "cash-drawer": config("stainless", {"stainless": "#69767c", "abs": "#373f44", "brass": "#c19740"}, [(r"pull", "abs"), (r"lock", "brass")]),
    "checkout-bagging-stand": config("stainless", {"stainless": "#879397", "laminate": "#b99b70", "polypropylene": "#4e6861"}, [(r"^top$", "laminate"), (r"bag-holder", "polypropylene")]),
    "checkout-conveyor": config("powderCoat", {"powderCoat": "#46545d", "rubber": "#252a2d", "glass": "#72b8c5"}, [(r"belt", "rubber"), (r"scanner", "glass")]),
    "checkout-counter": config("powderCoat", {"powderCoat": "#4c616d", "laminate": "#c1a77e", "glass": "#83c8d2"}, [(r"worktop|customer-ledge|bagging-return", "laminate"), (r"scanner|screen", "glass")]),
    "checkout-divider": config("polypropylene", {"polypropylene": "#df8f38", "rubber": "#41484d", "abs": "#f0b747"}, [(r"grip-fin|end-", "rubber"), (r"top-button", "abs")]),
    "chest-freezer": config("powderCoat", {"powderCoat": "#cbd5d5", "stainless": "#8b999d", "abs": "#4d6975"}, [(r"lid|handle", "stainless"), (r"thermostat", "abs")]),
    "clothing-rail": config("stainless", {"stainless": "#727f84", "rubber": "#363c40", "abs": "#d8dedf"}, [(r"foot", "rubber"), (r"end-cap", "abs")]),
    "customer-service-desk": config("laminate", {"laminate": "#87745d", "powderCoat": "#59666d", "glass": "#86c6d0", "polycarbonate": "#dd9c37"}, [(r"back-display", "powderCoat"), (r"screen", "glass"), (r"call-button", "polycarbonate")]),
    "deli-service-case": config("stainless", {"stainless": "#9ba6a8", "temperedGlass": "#9ed0d4", "laminate": "#b18c5e"}, [(r"glass-post|canopy", "temperedGlass"), (r"display-deck", "laminate")]),
    "entry-security-gate": config("powderCoat", {"powderCoat": "#555f64", "glass": "#83c8d1", "polycarbonate": "#e3ad2b"}, [(r"sensor-face", "glass"), (r"status-light", "polycarbonate")]),
    "flatbed-stock-trolley": config("powderCoat", {"powderCoat": "#4e5e66", "stainless": "#a9b3b5", "rubber": "#292e31"}, [(r"caster-mount|deck|toe-plate", "stainless"), (r"caster|bumper|handle-grip", "rubber")]),
    "floor-display-stand": config("plywood", {"plywood": "#97724d", "stainless": "#8d999c", "paper": "#f0e1bf"}, [(r"foot|bolt", "stainless"), (r"header", "paper")]),
    "gondola-shelf": config("powderCoat", {"powderCoat": "#536971", "stainless": "#c0c9ca", "polypropylene": "#3d484b"}, [(r"shelf", "stainless"), (r"foot", "polypropylene")]),
    "handbasket": config("polypropylene", {"polypropylene": "#d18c42", "rubber": "#52463b", "stainless": "#8a969a"}, [(r"handle-grip", "rubber"), (r"pivot", "stainless")]),
    "hanging-wayfinding-sign": config("aluminium", {"aluminium": "#727f84", "acrylic": "#e8e1c8", "vinyl": "#397c99"}, [(r"panel", "acrylic"), (r"arrow", "vinyl")]),
    "impulse-merchandiser": config("powderCoat", {"powderCoat": "#b87a3d", "paper": "#efe0bc", "aluminium": "#aab5b6"}, [(r"header", "paper"), (r"mast-cap", "aluminium")]),
    "magazine-rack": config("powderCoat", {"powderCoat": "#64594c", "acrylic": "#c0d0cf", "rubber": "#373b3d"}, [(r"pocket", "acrylic"), (r"floor-foot", "rubber")]),
    "pallet-display": config("timber", {"timber": "#94754e", "steel": "#66757a", "vinyl": "#d9b64d"}, [(r"mast|mast-cap", "steel"), (r"sign-panel", "vinyl")]),
    "parcel-locker-bank": config("powderCoat", {"powderCoat": "#62737a", "brass": "#c39b46", "polycarbonate": "#81bdc7"}, [(r"lock", "brass"), (r"keypad", "polycarbonate")]),
    "payment-terminal": config("abs", {"abs": "#364751", "glass": "#79c3ce", "rubber": "#343638"}, [(r"screen|contactless", "glass"), (r"keypad", "rubber")]),
    "price-check-scale": config("abs", {"abs": "#5a6870", "stainless": "#b8c1c2", "glass": "#75bdc9", "polycarbonate": "#d59d32"}, [(r"weigh-platform", "stainless"), (r"screen", "glass"), (r"key-|display", "polycarbonate")]),
    "produce-crate-stack": config("polypropylene", {"polypropylene": "#6d9453", "stainless": "#919da0", "paper": "#eee3c7"}, [(r"stack-pin", "stainless"), (r"label", "paper")]),
    "produce-display-table": config("powderCoat", {"powderCoat": "#57694d", "timber": "#b08a58", "stainless": "#aeb8b8"}, [(r"deck", "timber"), (r"leg|corner-cap", "stainless")]),
    "queue-barrier": config("stainless", {"stainless": "#78868a", "fabric": "#bd4d43", "rubber": "#33393c"}, [(r"strap", "fabric"), (r"foot", "rubber")]),
    "queue-stanchion": config("stainless", {"stainless": "#727f83", "polypropylene": "#bf5949"}, [(r"strap-slot", "polypropylene")]),
    "receipt-printer": config("abs", {"abs": "#59636a", "rubber": "#292d30", "polycarbonate": "#d6a53c"}, [(r"paper-slot", "rubber"), (r"status-button", "polycarbonate")]),
    "recycling-station": config("polypropylene", {"polypropylene": "#507b62", "stainless": "#9ca7a8", "polycarbonate": "#273b3d"}, [(r"shared-top|base-plinth", "stainless"), (r"opening", "polycarbonate")]),
    "refrigerated-display-case": config("powderCoat", {"powderCoat": "#526a71", "stainless": "#aab5b7", "glass": "#91cbd2"}, [(r"shelf|deck|temperature", "stainless"), (r"glass", "glass")]),
    "returns-drop-bin": config("polypropylene", {"polypropylene": "#365c54", "stainless": "#9da8aa", "paper": "#e8dfc4"}, [(r"hinge", "stainless"), (r"label", "paper")]),
    "roll-cage-trolley": config("galvanizedSteel", {"galvanizedSteel": "#7d898c", "rubber": "#292d30", "polypropylene": "#d7a33e"}, [(r"caster-mount", "galvanizedSteel"), (r"caster", "rubber"), (r"pull-handle", "polypropylene")]),
    "self-checkout-kiosk": config("abs", {"abs": "#536a73", "glass": "#7fc5d0", "stainless": "#aeb7b8"}, [(r"screen|scanner-window", "glass"), (r"bag-hook", "stainless")]),
    "shelf-endcap": config("powderCoat", {"powderCoat": "#65777b", "stainless": "#b1bbbc", "vinyl": "#dba83d"}, [(r"deck|base-cap", "stainless"), (r"header", "vinyl")]),
    "shopping-bag-dispenser": config("powderCoat", {"powderCoat": "#64736f", "polypropylene": "#e2d7bb", "stainless": "#9da8aa"}, [(r"bag-stack", "polypropylene"), (r"mount", "stainless")]),
    "shopping-basket": config("polypropylene", {"polypropylene": "#b56c3b", "rubber": "#4a4140", "stainless": "#7e8b90"}, [(r"grip", "rubber"), (r"pivot", "stainless")]),
    "shopping-cart": config("stainless", {"stainless": "#77868a", "polypropylene": "#b63d35", "rubber": "#292d30"}, [(r"mount", "stainless"), (r"handle", "polypropylene"), (r"wheel", "rubber")]),
    "stock-hand-truck": config("aluminium", {"aluminium": "#78868a", "rubber": "#292d30", "stainless": "#b3bec0"}, [(r"guard", "stainless"), (r"wheel|top-grip", "rubber")]),
    "stock-ladder": config("aluminium", {"aluminium": "#c2cbcc", "rubber": "#2e3336", "powderCoat": "#d9a02d"}, [(r"caster", "rubber"), (r"tread|platform", "powderCoat")]),
    "trolley-corral": config("galvanizedSteel", {"galvanizedSteel": "#778488", "powderCoat": "#d8a53b", "rubber": "#343a3c"}, [(r"front-gate|post-cap", "powderCoat"), (r"end-stop", "rubber")]),
    "upright-drink-cooler": config("powderCoat", {"powderCoat": "#536d78", "glass": "#92cbd3", "stainless": "#aeb8ba"}, [(r"door-window", "glass"), (r"shelf|handle|grille", "stainless")]),
    "wall-shelf-unit": config("powderCoat", {"powderCoat": "#7d6d5a", "stainless": "#c1c9ca", "rubber": "#353a3d"}, [(r"deck", "stainless"), (r"foot", "rubber")]),
    "wire-grid-display": config("stainless", {"stainless": "#657175", "rubber": "#353a3d", "polypropylene": "#d29c37"}, [(r"foot", "rubber"), (r"hook", "polypropylene")]),
    "wooden-pallet": config("timber", {"timber": "#a3865c", "steel": "#78868a"}, [(r"nail", "steel")]),
}

DESCRIPTION_OVERRIDES = {
    "barcode-scanner": "Countertop barcode scanner with an angled reading head, glass windows and a low weighted base.",
    "checkout-counter": "Checkout fixture with customer ledge, separate bagging wing, laminate cashier-side fascia and cashier display.",
    "produce-crate-stack": "Stable two-by-two stack of four ventilated produce crates with open rail sides and corner clips.",
    "refrigerated-display-case": "Open-front chilled display with framed glass sides, three stainless shelves and an insulated base.",
    "shopping-basket": "Open-frame shopping basket with a slatted polypropylene body, reinforced rim and a raised carry handle.",
    "shopping-cart": "Retail cart with an open wire-grid basket, child-seat rail, lower rack and four rubber casters.",
    "upright-drink-cooler": "Single-door beverage cooler with a framed glass door, six bottles on visible shelves, a pull handle, and lower compressor grille.",
}

GEOMETRY_INSERTS = {
    "bakery-display-case": '''p.part("glass-side-left", b(-702, 0, 1130, 14, 520, 480).color(temperedGlass));
p.part("glass-side-right", b(702, 0, 1130, 14, 520, 480).color(temperedGlass));
''',
    "deli-service-case": '''p.part("glass-side-left", b(-792, 0, 1220, 14, 520, 620).color(temperedGlass));
p.part("glass-side-right", b(792, 0, 1220, 14, 520, 620).color(temperedGlass));
''',
    "refrigerated-display-case": '''p.part("side-glass-left", b(-892, 0, 1290, 16, 650, 1010).color(glass));
p.part("side-glass-right", b(892, 0, 1290, 16, 650, 1010).color(glass));
''',
}


def clean_description(source: str, asset_id: str) -> tuple[str, str]:
    match = re.search(r'  description: "([^"]+)",', source)
    if not match:
        raise SystemExit(f"{asset_id}: missing description")
    old = match.group(1).split(" Knobs:")[0].strip()
    description = DESCRIPTION_OVERRIDES.get(asset_id, old)
    return old.rstrip("."), description.rstrip(".")


def replace_assembly(source: str, asset_id: str, replacement: str) -> str:
    marker = f'const p = assembly("{asset_id}");\n'
    begin = source.find(marker)
    end = source.find("return p.model();", begin)
    if begin < 0 or end < 0:
        raise SystemExit(f"{asset_id}: expected assembly block not found")
    return source[:begin] + replacement.rstrip() + "\n\n" + source[end:]


def update_source(path: Path, settings: dict[str, object], apply: bool) -> None:
    asset_id = path.name.removesuffix(".kcad.ts")
    source = path.read_text(encoding="utf-8")
    old_description, description = clean_description(source, asset_id)
    default = str(settings["default"])
    colors = dict(settings["colors"])
    rules = list(settings["rules"])
    if default not in colors or not 2 <= len(colors) <= 4:
        raise SystemExit(f"{asset_id}: requires two to four declared material colors")

    color_decl = re.compile(r"^const color = param\('color',.*\);$", re.MULTILINE)
    if len(color_decl.findall(source)) != 1:
        raise SystemExit(f"{asset_id}: expected the original generic color param exactly once")
    source = color_decl.sub("__MATERIAL_CONTROLS__", source)

    control_lines = [
        f"const {name} = param('{name}', '{hex_value}', {{ label: '{MATERIAL_LABELS[name]} color' }});"
        for name, hex_value in colors.items()
    ]
    preset_lines = ["presets({", "  cleanStore: {"]
    preset_lines.extend(f"    {name}: '{CLEAN_STORE[name]}'," for name in colors)
    preset_lines.extend(["  },", "  nightRestock: {"])
    preset_lines.extend(f"    {name}: '{NIGHT_RESTOCK[name]}'," for name in colors)
    preset_lines.extend(["  },", "});"])
    source = source.replace("__MATERIAL_CONTROLS__", "\n".join(control_lines + [""] + preset_lines), 1)

    assignment_counts = {name: 0 for name in colors}
    part_line = re.compile(r"^(\s*p\.part\()([\"'])([^\"']+)([\"'],.*)\.color\(color\)(\);\s*)$")
    output_lines = []
    for line in source.splitlines():
        if ".color(color)" not in line:
            output_lines.append(line)
            continue
        match = part_line.match(line)
        if match is None:
            raise SystemExit(f"{asset_id}: cannot assign material on line: {line}")
        part_name = match.group(3)
        material = default
        for pattern, candidate in rules:
            if re.search(pattern, part_name, re.IGNORECASE):
                material = candidate
                break
        if material not in colors:
            raise SystemExit(f"{asset_id}/{part_name}: rule uses undeclared material {material}")
        assignment_counts[material] += 1
        output_lines.append(line.replace(".color(color)", f".color({material})"))
    source = "\n".join(output_lines) + "\n"

    if asset_id == "checkout-counter":
        old_panel = 'p.part("front-panel", b(-40, 356, 265, 1340, 14, 350).color(powderCoat));\n'
        new_details = '''p.part("front-fascia", b(-40, -356, 265, 1340, 14, 350).color(laminate));
p.part("fascia-end-left", b(-710, -366, 265, 24, 18, 350).color(powderCoat));
p.part("fascia-end-right", b(630, -366, 265, 24, 18, 350).color(powderCoat));
p.part("toe-kick", b(-40, -365, 48, 1340, 18, 88).color(powderCoat));
p.part("cashier-display-post", b(-450, 190, 590, 44, 50, 140).color(powderCoat));
p.part("cashier-display", b(-450, 177, 720, 270, 44, 180).color(powderCoat));
p.part("cashier-screen", b(-450, 151, 720, 226, 12, 132).color(glass));
p.part("cash-drawer", b(-450, 230, 445, 390, 270, 70).color(powderCoat));
'''
        if old_panel not in source:
            raise SystemExit("checkout-counter: front panel source line was not found")
        source = source.replace(old_panel, new_details, 1)

    missing = {name for name, count in assignment_counts.items() if count == 0}
    expected_new_materials = {
        "produce-crate-stack": {"paper"},
        "refrigerated-display-case": {"glass"},
    }.get(asset_id, set())
    if missing - expected_new_materials:
        raise SystemExit(f"{asset_id}: declared but unassigned material controls: {sorted(missing - expected_new_materials)}")

    updated_description = (
        f"{description}. Knobs: overall scale and "
        + ", ".join(MATERIAL_LABELS[name].lower() for name in colors)
        + " color controls. Presets: cleanStore and nightRestock."
    )
    source = re.sub(
        r'  description: "[^"]+",',
        "  description: " + json.dumps(updated_description, ensure_ascii=False) + ",",
        source,
        count=1,
    )
    comment = f"// {description}"
    source = source.replace(
        "// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.",
        comment,
        1,
    )

    if asset_id in {"barcode-scanner", "payment-terminal", "self-checkout-kiosk"}:
        helper = "const tiltedB = (x: number, y: number, z: number, w: number, d: number, h: number, angle: number) => box(w, d, h, true).rotateX(angle).translate(x, y, z).scale(scale);\n"
        needle = "const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);\n"
        if needle not in source:
            raise SystemExit(f"{asset_id}: box helper not found for the tilted control surface")
        source = source.replace(needle, needle + helper, 1)
        if asset_id == "barcode-scanner":
            source = source.replace('p.part("scanner-head", b(0, 0, 112, 260, 210, 90).color(abs));', 'p.part("scanner-head", tiltedB(0, 0, 112, 260, 210, 90, -10).color(abs));')
            source = source.replace('p.part("front-window", b(0, -108, 145, 185, 12, 52).color(glass));', 'p.part("front-window", tiltedB(0, -108, 145, 185, 12, 52, -10).color(glass));')
        elif asset_id == "payment-terminal":
            source = source.replace('p.part("housing", b(0, 0, 105, 180, 155, 150).color(abs));', 'p.part("housing", tiltedB(0, 0, 105, 180, 155, 150, -9).color(abs));')
            source = source.replace('p.part("screen", b(0, -82, 160, 132, 12, 65).color(glass));', 'p.part("screen", tiltedB(0, -82, 160, 132, 12, 65, -9).color(glass));')
        else:
            source = source.replace('p.part("display", b(0, 40, 900, 500, 100, 300).color(abs));', 'p.part("display", tiltedB(0, 40, 900, 500, 100, 300, -10).color(abs));')
            source = source.replace('p.part("screen", b(0, -18, 910, 390, 18, 205).color(glass));', 'p.part("screen", tiltedB(0, -18, 910, 390, 18, 205, -10).color(glass));')

    if asset_id == "bakery-display-case":
        source = source.replace('p.part("canopy", b(0, 0, 1380, 1540, 680, 50).color(temperedGlass));\n', 'p.part("canopy", b(0, 0, 1380, 1540, 680, 50).color(temperedGlass));\n' + GEOMETRY_INSERTS[asset_id], 1)
    elif asset_id == "deli-service-case":
        source = source.replace('p.part("canopy", b(0, 0, 1560, 1760, 720, 60).color(temperedGlass));\n', 'p.part("canopy", b(0, 0, 1560, 1760, 720, 60).color(temperedGlass));\n' + GEOMETRY_INSERTS[asset_id], 1)
    elif asset_id == "refrigerated-display-case":
        source = source.replace('p.part("canopy", b(0, 0, 1800, 1880, 900, 90).color(powderCoat));\n', 'p.part("canopy", b(0, 0, 1800, 1880, 900, 90).color(powderCoat));\n' + GEOMETRY_INSERTS[asset_id], 1)

    if asset_id == "shopping-basket":
        block = '''const p = assembly("shopping-basket");
p.part("basket-floor", b(0, 0, 36, 540, 380, 72).color(polypropylene));
p.part("rim-front", b(0, -190, 318, 600, 24, 32).color(polypropylene));
p.part("rim-back", b(0, 190, 318, 600, 24, 32).color(polypropylene));
p.part("rim-left", b(-288, 0, 318, 24, 356, 32).color(polypropylene));
p.part("rim-right", b(288, 0, 318, 24, 356, 32).color(polypropylene));
for (const x of [-258, 258]) {
  for (const y of [-168, 168]) p.part(`corner-${x}-${y}`, b(x, y, 185, 20, 20, 230).color(polypropylene));
}
for (let row = 0; row < 3; row++) {
  const z = 104 + row * 82;
  p.part(`front-rail-${row}`, b(0, -178, z, 520, 16, 18).color(polypropylene));
  p.part(`back-rail-${row}`, b(0, 178, z, 520, 16, 18).color(polypropylene));
  p.part(`left-rail-${row}`, b(-258, 0, z, 16, 340, 18).color(polypropylene));
  p.part(`right-rail-${row}`, b(258, 0, z, 16, 340, 18).color(polypropylene));
}
p.part("handle-left", b(-220, 0, 480, 22, 28, 280).color(polypropylene));
p.part("handle-right", b(220, 0, 480, 22, 28, 280).color(polypropylene));
p.part("grip", b(0, 0, 620, 460, 30, 30).color(rubber));
p.part("pivot-left", c(-230, 0, 350, 20, 22, 8).color(stainless));
p.part("pivot-right", c(230, 0, 350, 20, 22, 8).color(stainless));
'''
        source = replace_assembly(source, asset_id, block)
    elif asset_id == "shopping-cart":
        for part in ("basket-front", "basket-back", "basket-side--400", "basket-side-400"):
            source = re.sub(rf'^p\.part\("{re.escape(part)}",.*\n', "", source, flags=re.MULTILINE)
        cage = '''for (let row = 0; row < 5; row++) {
  const z = 650 + row * 95;
  p.part(`front-wire-${row}`, b(0, -270, z, 820, 16, 14).color(stainless));
  p.part(`back-wire-${row}`, b(0, 230, z, 820, 16, 14).color(stainless));
  p.part(`left-wire-${row}`, b(-400, -20, z, 16, 500, 14).color(stainless));
  p.part(`right-wire-${row}`, b(400, -20, z, 16, 500, 14).color(stainless));
}
for (let rod = 0; rod <= 8; rod++) {
  const x = -400 + rod * 100;
  p.part(`front-upright-${rod}`, b(x, -270, 845, 14, 16, 390).color(stainless));
  p.part(`back-upright-${rod}`, b(x, 230, 845, 14, 16, 390).color(stainless));
}
for (let rod = 0; rod <= 5; rod++) {
  const y = -270 + rod * 100;
  p.part(`left-upright-${rod}`, b(-400, y, 845, 16, 14, 390).color(stainless));
  p.part(`right-upright-${rod}`, b(400, y, 845, 16, 14, 390).color(stainless));
}
'''
        source = source.replace('p.part("basket-floor", b(0, -20, 610, 820, 530, 34).color(stainless));\n', 'p.part("basket-floor", b(0, -20, 610, 820, 530, 34).color(stainless));\n' + cage, 1)
    elif asset_id == "produce-crate-stack":
        block = '''const p = assembly("produce-crate-stack");
const cratePositions = [
  { id: "lower-left", x: -310, z: 170 },
  { id: "lower-right", x: 310, z: 170 },
  { id: "upper-left", x: -310, z: 510 },
  { id: "upper-right", x: 310, z: 510 },
];
for (const crate of cratePositions) {
  p.part(`crate-${crate.id}-floor`, b(crate.x, 0, crate.z - 156, 600, 500, 28).color(polypropylene));
  for (const xSide of [-1, 1]) {
    for (const ySide of [-1, 1]) {
      p.part(`crate-${crate.id}-corner-${xSide}-${ySide}`, b(crate.x + xSide * 282, ySide * 232, crate.z, 32, 32, 320).color(polypropylene));
    }
  }
  for (let row = 0; row < 3; row++) {
    const z = crate.z - 75 + row * 75;
    p.part(`crate-${crate.id}-front-rail-${row}`, b(crate.x, -242, z, 580, 22, 22).color(polypropylene));
    p.part(`crate-${crate.id}-back-rail-${row}`, b(crate.x, 242, z, 580, 22, 22).color(polypropylene));
    p.part(`crate-${crate.id}-left-rail-${row}`, b(crate.x - 292, 0, z, 22, 460, 22).color(polypropylene));
    p.part(`crate-${crate.id}-right-rail-${row}`, b(crate.x + 292, 0, z, 22, 460, 22).color(polypropylene));
  }
  p.part(`crate-${crate.id}-label`, b(crate.x - 180, -256, crate.z + 96, 180, 10, 48).color(paper));
}
p.part("stack-clip-left-front", c(-592, -232, 670, 22, 18, 8).color(stainless));
p.part("stack-clip-left-back", c(-592, 232, 670, 22, 18, 8).color(stainless));
p.part("stack-clip-right-front", c(592, -232, 670, 22, 18, 8).color(stainless));
p.part("stack-clip-right-back", c(592, 232, 670, 22, 18, 8).color(stainless));
'''
        source = replace_assembly(source, asset_id, block)
    elif asset_id == "upright-drink-cooler":
        old_cabinet = 'p.part("cabinet", b(0, 0, 950, 780, 700, 1900).color(powderCoat));\n'
        open_cabinet = '''p.part("cabinet-left-side", b(-365, 0, 1000, 50, 700, 1800).color(powderCoat));
p.part("cabinet-right-side", b(365, 0, 1000, 50, 700, 1800).color(powderCoat));
p.part("cabinet-back", b(0, 330, 1000, 680, 40, 1800).color(powderCoat));
p.part("cabinet-top", b(0, 0, 1875, 680, 660, 50).color(powderCoat));
p.part("cabinet-base", b(0, 0, 175, 680, 660, 350).color(powderCoat));
'''
        if old_cabinet not in source:
            raise SystemExit("upright-drink-cooler: cabinet source line was not found")
        source = source.replace(old_cabinet, open_cabinet, 1)
        old_frame = 'p.part("door-frame", b(0, -365, 1120, 710, 22, 1460).color(powderCoat));\n'
        new_frame = '''p.part("door-frame-left", b(-340, -365, 1120, 30, 22, 1460).color(powderCoat));
p.part("door-frame-right", b(340, -365, 1120, 30, 22, 1460).color(powderCoat));
p.part("door-frame-top", b(0, -365, 1835, 680, 22, 30).color(powderCoat));
p.part("door-frame-bottom", b(0, -365, 405, 680, 22, 30).color(powderCoat));
p.part("door-glass-left", b(-300, -382, 1120, 10, 12, 1280).color(glass));
p.part("door-glass-right", b(300, -382, 1120, 10, 12, 1280).color(glass));
p.part("door-glass-top", b(0, -382, 1730, 590, 12, 10).color(glass));
p.part("door-glass-bottom", b(0, -382, 510, 590, 12, 10).color(glass));
'''
        if old_frame not in source:
            raise SystemExit("upright-drink-cooler: door frame source line was not found")
        source = source.replace(old_frame, new_frame, 1)
        old_window = 'p.part("door-window", b(0, -382, 1120, 590, 12, 1280).color(glass));\n'
        if old_window not in source:
            raise SystemExit("upright-drink-cooler: glass panel source line was not found")
        source = source.replace(old_window, "", 1)
        source = re.sub(r'(p\.part\("inner-shelf-\d+", b\(0, )-280(, \d+, 570, 510, 28\)\.color\(stainless\);)', r'\g<1>0\g<2>', source)
        if "b(0, -280," in source:
            raise SystemExit("upright-drink-cooler: shelves are still outside the cabinet depth")
        source = source.replace(
            'p.part("inner-shelf-3", b(0, 0, 1500, 570, 510, 28).color(stainless));\n',
            'p.part("inner-shelf-3", b(0, 0, 1500, 570, 510, 28).color(stainless));\n'
            'for (const z of [554, 874]) {\n'
            '  for (const x of [-175, 0, 175]) {\n'
            '    p.part(`beverage-bottle-${z}-${x}`, c(x, -80, z, 180, 38, 10).color(glass));\n'
            '    p.part(`bottle-cap-${z}-${x}`, c(x, -80, z + 180, 18, 24, 10).color(stainless));\n'
            '  }\n'
            '}\n',
            1,
        )
        source = source.replace(
            'p.part("compressor-grille", c(0, 0, 0, 65, 260, 8).color(stainless));\n',
            'p.part("compressor-grille", b(0, -356, 190, 500, 12, 150).color(stainless));\n'
            'for (let slat = 0; slat < 4; slat++) {\n'
            '  p.part(`compressor-slat-${slat}`, b(0, -365, 140 + slat * 32, 440, 10, 8).color(powderCoat));\n'
            '}\n',
            1,
        )

    unconnected = [name for name in colors if not re.search(rf"\.color\({name}\)", source)]
    if unconnected:
        raise SystemExit(f"{asset_id}: material controls do not color geometry: {unconnected}")
    if "const color = param('color'" in source or ".color(color)" in source:
        raise SystemExit(f"{asset_id}: generic color control remains")
    if apply:
        path.write_text(source, encoding="utf-8")
    action = "promoted" if apply else "would promote"
    print(f"{action} {asset_id}: {len(colors)} material color controls, two presets")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write the promoted .kcad.ts sources")
    args = parser.parse_args()
    sources = sorted(KIT.glob("*.kcad.ts"))
    if len(sources) != 48:
        raise SystemExit(f"expected 48 existing retail-store assets, found {len(sources)}")
    ids = {path.name.removesuffix(".kcad.ts") for path in sources}
    if ids != set(ASSETS):
        raise SystemExit(f"asset set mismatch: missing {sorted(set(ASSETS) - ids)}; extra {sorted(ids - set(ASSETS))}")
    for path in sources:
        update_source(path, ASSETS[path.name.removesuffix(".kcad.ts")], args.apply)
    action = "Completed" if args.apply else "Validated"
    print(f"{action} in-place quality promotion for all 48 existing retail-store IDs.")


if __name__ == "__main__":
    main()
