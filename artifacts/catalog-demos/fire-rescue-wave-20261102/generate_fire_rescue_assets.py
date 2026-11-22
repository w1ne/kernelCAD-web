#!/usr/bin/env python3
"""Generate original low-poly fire and rescue props for kernelCAD."""
from pathlib import Path
import json
import math
import re

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "fire-rescue"

# id, title, short visual description, recipe, options
ASSETS = [
    ("municipal-fire-engine", "Municipal fire engine", "Structural pumper with crew cab, hosebed, side pump panel and deck monitor.", "vehicle", {"style": "pumper", "l": 1700, "w": 780, "h": 1400}),
    ("aerial-ladder-fire-engine", "Aerial ladder fire engine", "Fire apparatus with telescoping aerial ladder, stabilizer legs and tip platform.", "vehicle", {"style": "aerial", "l": 1850, "w": 820, "h": 1550}),
    ("tiller-ladder-fire-truck", "Tiller ladder fire truck", "Long aerial ladder apparatus with rear tiller cab and multi-axle chassis.", "vehicle", {"style": "tiller", "l": 2050, "w": 820, "h": 1550}),
    ("quint-fire-apparatus", "Quint fire apparatus", "Combined pumper and aerial apparatus with hosebed, pump panel and mounted ladder.", "vehicle", {"style": "quint", "l": 1850, "w": 820, "h": 1500}),
    ("municipal-water-tender", "Municipal fire water tender", "Water tender with large horizontal tank, rear hose connections and crew cab.", "vehicle", {"style": "tender", "l": 1850, "w": 840, "h": 1450}),
    ("heavy-rescue-fire-truck", "Heavy rescue fire truck", "Rescue apparatus with tall equipment body, open side lockers and roof light mast.", "vehicle", {"style": "rescue", "l": 1850, "w": 820, "h": 1480}),
    ("wildland-fire-engine", "Wildland fire engine", "Off-road fire engine with compact tank, hose reels, brush guard and four-wheel drive stance.", "vehicle", {"style": "wildland", "l": 1450, "w": 760, "h": 1250}),
    ("wildland-brush-truck", "Wildland brush truck", "Pickup-based brush response vehicle with skid tank, roll bar and roof lights.", "vehicle", {"style": "brush", "l": 1280, "w": 700, "h": 1150}),
    ("hazmat-response-truck", "Hazmat response truck", "Hazard response vehicle with high equipment body, storage lockers and exhaust vents.", "vehicle", {"style": "hazmat", "l": 1750, "w": 800, "h": 1500}),
    ("fire-command-van", "Fire command van", "Incident command van with high roof, side windows, roof antenna and warning light bar.", "vehicle", {"style": "command", "l": 1500, "w": 720, "h": 1420}),
    ("fire-utility-pickup", "Fire utility pickup", "Crew pickup with utility bed, compartment boxes, ladder rack and beacon bar.", "vehicle", {"style": "pickup", "l": 1350, "w": 700, "h": 1180}),
    ("electric-fire-pumper", "Electric fire pumper", "Modern pumper with crew cab, compact pump body and roof-mounted battery equipment pod.", "vehicle", {"style": "electric", "l": 1680, "w": 800, "h": 1400}),
    ("fire-hose-roll", "Fire hose roll", "Compact rolled attack hose with paired loop bundles and coupling ends.", "hose-roll", {"radius": 185, "loops": 2}),
    ("large-diameter-hose-roll", "Large diameter supply hose roll", "Wide supply hose rolled into a broad stacked bundle with heavy couplings.", "hose-roll", {"radius": 245, "loops": 3}),
    ("folded-hose-pack", "Folded fire hose pack", "Layered accordion fold of attack hose with a carrying strap and outlet coupling.", "hose-pack", {"w": 500, "d": 360, "h": 200}),
    ("hose-reel-cart", "Fire hose reel cart", "Portable hose reel on a wheeled frame with axle, winding drum and push handle.", "hose-reel", {"w": 430, "h": 760}),
    ("fire-hose-bridge", "Fire hose bridge", "Low protective road bridge with paired ramps and a recessed hose channel.", "hose-bridge", {"l": 740, "w": 520, "h": 180}),
    ("fire-hose-coupling", "Fire hose coupling", "Threaded fire-service coupling with grip ribs, flange and open bore.", "coupling", {"l": 220, "r": 62}),
    ("gated-wye-fire-connection", "Gated wye fire connection", "Branching hose fitting with two gated outlets and control handles.", "wye", {"r": 50}),
    ("fire-hose-nozzle", "Fire hose nozzle", "Straight hose nozzle with hand grip, barrel and adjustable front tip.", "nozzle", {"style": "straight", "l": 310}),
    ("fog-nozzle", "Fog fire nozzle", "Compact fog nozzle with ribbed selector collar, barrel and pistol grip.", "nozzle", {"style": "fog", "l": 280}),
    ("smooth-bore-nozzle", "Smooth bore fire nozzle", "Simple smooth-bore tip with tapered barrel and hose coupling tail.", "nozzle", {"style": "smooth", "l": 250}),
    ("portable-ground-monitor", "Portable ground monitor", "Ground monitor with twin feet, swiveling barrel and directional hand wheels.", "monitor", {"style": "ground"}),
    ("deck-gun-monitor", "Deck gun monitor", "Apparatus-mounted monitor with pedestal, transverse swivel and long water barrel.", "monitor", {"style": "deck"}),
    ("portable-fire-pump", "Portable fire pump", "Compact portable pump with engine block, intake and discharge ports on a carrying frame.", "pump", {"style": "portable"}),
    ("floating-draft-pump", "Floating draft pump", "Floating water pump with guarded intake, motor pod and hose connection.", "pump", {"style": "floating"}),
    ("collapsible-fire-water-tank", "Collapsible fire water tank", "Portable fold-flat water reservoir with rigid rim, corner supports and drain outlet.", "water-tank", {"w": 920, "d": 760, "h": 520}),
    ("foam-eductor", "Fire foam eductor", "Inline foam proportioning body with pickup tube, selector dial and hose couplings.", "foam", {"style": "eductor"}),
    ("foam-concentrate-canister", "Foam concentrate canister", "Portable concentrate can with handle frame, cap and short pickup fitting.", "foam", {"style": "canister"}),
    ("dry-chemical-fire-extinguisher", "Dry chemical fire extinguisher", "Portable extinguisher with pressure cylinder, hose, gauge and squeeze handle.", "extinguisher", {"style": "dry"}),
    ("extension-fire-ladder", "Extension fire ladder", "Two-section extension ladder with parallel rails, repeated rungs and sliding locks.", "ladder", {"style": "extension", "l": 1380, "w": 420, "h": 140}),
    ("roof-hook-ladder", "Roof hook ladder", "Compact roof ladder with ridge hooks, reinforced rails and closely spaced rungs.", "ladder", {"style": "roof", "l": 920, "w": 360, "h": 130}),
    ("folding-attic-ladder", "Folding attic ladder", "Foldable attic ladder with paired hinged sections, rails and rung steps.", "ladder", {"style": "attic", "l": 820, "w": 400, "h": 480}),
    ("roof-hook-pike-pole", "Roof hook pike pole", "Long fireground pole with protective grip bands and a hooked metal head.", "pike-pole", {"l": 1280}),
    ("hydraulic-rescue-cutter", "Hydraulic rescue cutter", "Powered extrication cutter with crossed jaws, pivot, handles and hose ports.", "hydraulic-tool", {"style": "cutter", "l": 780}),
    ("hydraulic-rescue-spreader", "Hydraulic rescue spreader", "Powered rescue spreader with opening jaws, center pivot and hand grips.", "hydraulic-tool", {"style": "spreader", "l": 760}),
    ("hydraulic-rescue-ram", "Hydraulic rescue ram", "Telescoping rescue ram with piston body, end plates and hose connection.", "hydraulic-tool", {"style": "ram", "l": 840}),
    ("vehicle-stabilization-strut", "Vehicle stabilization strut", "Adjustable rescue support strut with foot plates, telescoping sections and ratchet.", "stabilizer", {"h": 980}),
    ("rescue-cribbing-blocks", "Rescue cribbing blocks", "Stackable timber cribbing blocks with alternating layers and hand grooves.", "cribbing", {"w": 460, "d": 360, "h": 280}),
    ("rescue-tripod", "Rescue tripod", "Three-leg rescue tripod with top pulley housing, cable wheel and foot pads.", "tripod", {"h": 1280}),
    ("rescue-basket-stretcher", "Rescue basket stretcher", "Open-frame rescue basket with perimeter rails, cross supports and four carry handles.", "stretcher", {"l": 1050, "w": 360}),
    ("rescue-sling-harness", "Rescue sling harness", "Folded rope rescue harness with shoulder loops, waist belt and leg straps.", "harness", {"w": 440, "h": 620}),
    ("structural-fire-helmet", "Structural fire helmet", "Structural helmet with brim, raised shell, ear flaps, face shield and front shield plate.", "helmet", {"style": "structural"}),
    ("wildland-fire-helmet", "Wildland fire helmet", "Lightweight field helmet with broad brim, shell ridge and chin strap.", "helmet", {"style": "wildland"}),
    ("firefighter-turnout-coat", "Firefighter turnout coat", "Protective coat form with raised collar, sleeves, front closure and reflective bands.", "turnout", {"style": "coat"}),
    ("firefighter-turnout-pants", "Firefighter turnout pants", "Protective trouser form with suspenders, articulated legs and reflective cuffs.", "turnout", {"style": "pants"}),
    ("structural-fire-boots", "Structural fire boots", "Pair of tall protective boots with raised shafts, soles and broad toe guards.", "boots", {}),
    ("firefighter-gloves", "Firefighter gloves", "Pair of gauntlet gloves with cuff guards, segmented fingers and palm patches.", "gloves", {}),
    ("firefighter-hood", "Firefighter protective hood", "Folded protective hood with neck drape, face opening and layered fabric edges.", "hood", {}),
    ("self-contained-breathing-apparatus", "Self-contained breathing apparatus", "Backpack assembly with air cylinder, harness straps, valve and regulator hose.", "scba", {}),
    ("firefighter-facepiece", "Firefighter breathing facepiece", "Respiratory facepiece with broad lens, cheek ports, lower filter and straps.", "facepiece", {}),
    ("firefighter-portable-radio", "Firefighter portable radio", "Handheld radio with antenna, channel knob, speaker grille and shoulder mic.", "radio", {}),
    ("personal-alert-safety-device", "Personal alert safety device", "Compact firefighter alarm clipped to a harness with grille, controls and indicator.", "pass-device", {}),
    ("thermal-imaging-camera", "Thermal imaging camera", "Handheld thermal camera with display, lens barrel, grip and top controls.", "camera", {}),
    ("positive-pressure-ventilation-fan", "Positive pressure ventilation fan", "Angled fan assembly with protective ring, radial blades, handle and folding stand.", "fan", {"style": "ppv"}),
    ("smoke-ejector-fan", "Smoke ejector fan", "Portable square-frame exhaust fan with radial blades, guard ring and carry handle.", "fan", {"style": "ejector"}),
    ("portable-fire-scene-light", "Portable fire scene light", "Tripod-mounted dual scene lamps with adjustable heads and cable-ready base.", "scene-light", {}),
    ("fireground-command-board", "Fireground command board", "Portable incident board with framed panel, status tiles and folding easel.", "command-board", {}),
    ("fire-blanket-canister", "Fire blanket canister", "Wall-mountable fire blanket case with pull tab, cover panel and mounting plate.", "blanket", {}),
    ("fire-apparatus-wheel-chock", "Fire apparatus wheel chock", "High-visibility wedge chock with ribbed tread, pull loop and broad ground face.", "chock", {}),
]

# Per-asset placement corrections, in millimetres, from the first index build.
# These values put each generated mesh's measured minimum Z on its declared base origin.
GROUND_OFFSETS_MM = {
    'deck-gun-monitor': -18.0,
    'dry-chemical-fire-extinguisher': -40.0,
    'extension-fire-ladder': -58.8,
    'fire-apparatus-wheel-chock': -16.879,
    'fire-blanket-canister': -145.0,
    'fire-hose-bridge': -9.23,
    'fire-hose-coupling': -4.96,
    'fire-hose-roll': 7.0,
    'firefighter-facepiece': -80.0,
    'firefighter-gloves': -92.0,
    'firefighter-hood': -28.0,
    'firefighter-portable-radio': -180.0,
    'firefighter-turnout-coat': -260.0,
    'firefighter-turnout-pants': -34.0,
    'fireground-command-board': -431.353,
    'floating-draft-pump': 10.0,
    'foam-concentrate-canister': -45.0,
    'foam-eductor': 2.0,
    'folded-hose-pack': 2.0,
    'folding-attic-ladder': -126.242,
    'hydraulic-rescue-cutter': -30.0,
    'hydraulic-rescue-ram': -30.0,
    'hydraulic-rescue-spreader': -30.0,
    'large-diameter-hose-roll': 7.0,
    'personal-alert-safety-device': -100.0,
    'portable-fire-pump': -85.0,
    'portable-fire-scene-light': -20.0,
    'portable-ground-monitor': -18.0,
    'positive-pressure-ventilation-fan': -5.0,
    'rescue-basket-stretcher': -70.0,
    'rescue-cribbing-blocks': -16.0,
    'rescue-sling-harness': -93.0,
    'roof-hook-ladder': -54.6,
    'self-contained-breathing-apparatus': -300.0,
    'smooth-bore-nozzle': -9.0,
    'structural-fire-boots': -60.0,
    'structural-fire-helmet': -35.0,
    'thermal-imaging-camera': -20.0,
    'vehicle-stabilization-strut': -18.0,
    'wildland-fire-helmet': -35.0,
}


def f(v):
    return f"{v:.3f}".rstrip("0").rstrip(".") or "0"


class Parts:
    def __init__(self):
        self.lines = []

    def add(self, name, expression, color="body"):
        name = re.sub(r"[^A-Za-z0-9_-]+", "-", str(name)).strip("-")
        color_expr = json.dumps(color) if color.startswith("#") else color
        self.lines.append(f"add({json.dumps(name)}, {expression}, {color_expr});")

    def box(self, name, x, y, z, w, d, h, color="body", angle=None):
        if min(w, d, h) <= 0:
            return
        shape = f"box({f(w)}, {f(d)}, {f(h)}, true)"
        if angle is not None:
            axis, degrees = angle
            shape += f".rotate([{', '.join(str(a) for a in axis)}], {f(degrees)})"
        self.add(name, f"{shape}.translate({f(x)}, {f(y)}, {f(z + h / 2)})", color)

    def cylinder(self, name, x, y, z, height, radius, color="body", segments=10, rotation=None):
        if height <= 0 or radius <= 0:
            return
        shape = f"cylinder({f(height)}, {f(radius)}, {segments})"
        if rotation is not None:
            axis, degrees = rotation
            shape += f".rotate([{', '.join(str(a) for a in axis)}], {f(degrees)})"
        self.add(name, f"{shape}.translate({f(x)}, {f(y)}, {f(z)})", color)

    def wheel(self, name, x, y, z, width, radius, color="#30363b"):
        self.cylinder(name, x, y + width / 2, z, width, radius, color, 10, ([1, 0, 0], 90))
        for side in (-1, 1):
            self.cylinder(name + f"-hub-{side}", x, y + side * (width * 0.62), z, max(8, width * 0.14), radius * 0.36, "accent", 8, ([1, 0, 0], 90))

    def rod_x(self, name, x, y, z, length, radius, color="body"):
        self.cylinder(name, x, y, z, length, radius, color, 10, ([0, 1, 0], 90))


def vehicle(p, d):
    l, w, h, style = d["l"], d["w"], d["h"], d["style"]
    p.box("frame", 0, 0, 210, l * .84, w * .5, 170)
    axles = [-l * .30, l * .28] if style not in ("tiller", "tender", "rescue") else [-l * .31, 0, l * .31]
    for i, x in enumerate(axles):
        for side in (-1, 1):
            p.wheel(f"road-wheel-{i}-{side}", x, side * w * .32, 155, 110, 155)
    cab_len = l * (.28 if style in ("brush", "pickup", "command") else .24)
    cab_x = l * .29
    cab_h = h * .42
    p.box("crew-cab", cab_x, 0, 295, cab_len, w * .44, cab_h, "accent")
    p.box("windshield", cab_x + cab_len * .27, 0, 315 + cab_h * .55, cab_len * .22, w * .40, cab_h * .22, "body")
    for side in (-1, 1):
        p.box(f"side-window-{side}", cab_x - cab_len * .17, side * w * .225, 390 + cab_h * .52, cab_len * .35, 20, cab_h * .19, "body")
    p.box("cab-roof", cab_x, 0, 295 + cab_h, cab_len * 1.05, w * .48, 40, "body")
    p.box("front-bumper", l * .47, 0, 130, 115, w * .67, 95, "accent")
    p.box("warning-lightbar", cab_x, 0, 338 + cab_h, cab_len * .74, 62, 45, "accent")
    if style in ("brush", "pickup"):
        p.box("utility-deck", -l * .20, 0, 300, l * .43, w * .63, 175, "body")
        if style == "brush":
            p.box("skid-water-tank", -l * .18, 0, 475, l * .33, w * .48, h * .22, "accent")
            p.rod_x("hose-reel", -l * .36, 0, 510, 85, 150, "body")
            p.box("brush-guard", l * .50, 0, 250, 52, w * .80, 250, "body")
        else:
            for side in (-1, 1):
                p.box(f"utility-locker-{side}", -l * .18, side * w * .23, 330, l * .30, 34, 145, "accent")
            p.box("ladder-rack", -l * .04, 0, 295 + h * .5, l * .63, 50, 28, "body")
            for side in (-1, 1):
                p.box(f"rack-post-{side}", -l * .04, side * w * .28, 460, 35, 35, 245, "accent")
    else:
        body_len = l * .48
        body_x = -l * .16
        body_h = h * .42
        p.box("apparatus-body", body_x, 0, 310, body_len, w * .60, body_h, "body")
        for side in (-1, 1):
            for j in range(3):
                xx = body_x - body_len * .29 + j * body_len * .29
                p.box(f"compartment-{side}-{j}", xx, side * w * .306, 360 + (j % 2) * 110, body_len * .20, 26, 125, "accent")
                p.box(f"compartment-handle-{side}-{j}", xx + body_len * .025, side * w * .328, 395 + (j % 2) * 110, body_len * .07, 16, 12, "body")
        if style in ("pumper", "quint", "electric"):
            p.box("hosebed", -l * .13, 0, 310 + body_h, body_len * .54, w * .42, h * .13, "accent")
            for side in (-1, 1):
                p.box(f"pump-control-panel-{side}", l * .015, side * w * .316, 390, body_len * .20, 25, 200, "accent")
            p.cylinder("deck-monitor-base", -l * .20, 0, 310 + body_h + h * .13, 48, 54, "accent", 8)
            p.rod_x("deck-monitor-barrel", -l * .20, 0, 310 + body_h + h * .13 + 60, 215, 28, "body")
        if style == "tender":
            p.cylinder("water-tank", -l * .16, 0, 485, w * .42, h * .25, "accent", 12, ([0, 1, 0], 90))
            for side in (-1, 1):
                p.box(f"tank-cradle-{side}", -l * .16, side * w * .20, 370, 80, 55, 190, "body")
        if style == "rescue":
            for side in (-1, 1):
                p.box(f"open-locker-{side}", -l * .13, side * w * .315, 590, body_len * .48, 20, body_h * .50, "accent")
                for j in range(3):
                    p.box(f"rescue-drawer-{side}-{j}", -l * .13, side * w * .33, 460 + j * 105, body_len * .38, 18, 65, "body")
            p.box("light-mast", -l * .15, 0, 310 + body_h, 36, 36, h * .38, "accent")
            p.box("mast-lamp", -l * .15, 0, 310 + body_h + h * .36, 170, 95, 65, "body")
        if style == "hazmat":
            for side in (-1, 1):
                p.box(f"hazmat-storage-{side}", -l * .13, side * w * .31, 510, body_len * .78, 25, body_h * .5, "accent")
            for i in range(4):
                p.cylinder(f"roof-vent-{i}", -l * .34 + i * 105, 0, 310 + body_h, 80, 37, "accent", 8)
        if style == "aerial" or style == "quint":
            for side in (-1, 1):
                p.box(f"stabilizer-beam-{side}", -l * .20, side * w * .44, 205, l * .20, 80, 65, "accent")
                p.box(f"stabilizer-foot-{side}", -l * .20, side * w * .46, 0, 150, 130, 30, "body")
        if style in ("aerial", "quint", "tiller"):
            base_x, base_z = -l * .22, 310 + body_h + 50
            length1, length2 = l * .36, l * .28
            p.box("ladder-base", base_x + length1 * .32, 0, base_z + length1 * .20, length1, 80, 55, "accent", ([0, 1, 0], -32))
            p.box("ladder-fly", base_x + length1 * .73 + length2 * .29, 0, base_z + length1 * .43 + length2 * .18, length2, 58, 44, "body", ([0, 1, 0], -32))
            for side in (-1, 1):
                for i in range(7):
                    xx = base_x + i * length1 * .105
                    zz = base_z + i * length1 * .065
                    p.box(f"ladder-rung-{side}-{i}", xx, side * 54, zz, 24, 120, 24, "body")
            p.box("ladder-tip-platform", base_x + length1 + length2 * .56, 0, base_z + length1 * .62 + length2 * .35, 180, 200, 72, "accent")
            if style == "tiller":
                p.box("rear-tiller-cab", -l * .49, 0, 325, l * .16, w * .40, h * .28, "accent")
        if style == "wildland":
            p.box("high-clearance-guard", -l * .20, 0, 640, l * .55, w * .67, 100, "accent")
            for side in (-1, 1):
                p.rod_x(f"hose-drum-{side}", -l * .12, side * w * .32, 560, 75, 125, "accent")
        if style == "electric":
            p.box("roof-equipment-pod", -l * .12, 0, 310 + body_h + 65, body_len * .40, w * .36, 135, "accent")
        if style == "command":
            p.box("high-roof", cab_x, 0, 295 + cab_h + 38, cab_len * 1.05, w * .46, 140, "accent")
            p.cylinder("radio-antenna", cab_x - 40, 0, 295 + cab_h + 180, 260, 12, "body", 8)
    if style in ("command", "pickup"):
        p.cylinder("roof-antenna", cab_x - 80, 0, 295 + cab_h + 60, 200, 10, "body", 8)


def hose_roll(p, d):
    radius, layers = d["radius"], d["loops"]
    for layer in range(layers):
        r = radius - layer * 38
        z = 28 + layer * 34
        for i in range(12):
            a = 2 * math.pi * i / 12
            p.box(f"hose-loop-{layer}-{i}", r * math.cos(a), r * math.sin(a), z, r * .62, 58, 32, "body", ([0, 0, 1], -90 + i * 30))
    p.cylinder("outer-coupling", radius + 52, 0, 35, 130, 42, "accent", 8, ([0, 1, 0], 90))
    p.cylinder("inner-coupling", -radius - 52, 0, 35, 130, 42, "accent", 8, ([0, 1, 0], 90))
    p.box("carry-strap", 0, 0, radius * 2 + 40, radius * .46, 34, 30, "accent")


def ladder(p, d):
    l, w, style = d["l"], d["w"], d["style"]
    if style == "attic":
        for segment, x, angle in ((0, -l * .18, -28), (1, l * .18, 28)):
            for side in (-1, 1):
                p.box(f"section-{segment}-rail-{side}", x, side * w * .36, d["h"] * .45, l * .48, 42, 45, "accent", ([0, 1, 0], angle))
            for i in range(6):
                p.box(f"section-{segment}-rung-{i}", x - l * .20 + i * l * .08, 0, 230 + (i % 2) * 15, 26, w * .72, 24, "body")
        p.cylinder("hinge", 0, 0, d["h"] * .45, w * .8, 45, "body", 8, ([1, 0, 0], 90))
    else:
        for side in (-1, 1):
            p.box(f"ladder-rail-{side}", 0, side * w * .37, d["h"] * .42, l, 42, 48, "accent")
        rung_count = 10 if style == "extension" else 7
        for i in range(rung_count):
            x = -l * .43 + i * l * .86 / (rung_count - 1)
            p.box(f"ladder-rung-{i}", x, 0, d["h"] * .42, 26, w * .74, 26, "body")
        if style == "extension":
            for side in (-1, 1):
                p.box(f"fly-rail-{side}", 0, side * w * .23, d["h"] * .42 + 72, l * .84, 30, 42, "body")
            for i in range(8):
                p.box(f"fly-rung-{i}", -l * .40 + i * l * .80 / 7, 0, d["h"] * .42 + 72, 20, w * .46, 20, "accent")
        if style == "roof":
            for side in (-1, 1):
                p.box(f"ridge-hook-{side}", l * .45, side * w * .37, d["h"] * .42 + 105, 155, 35, 32, "body", ([0, 1, 0], 35 * side))


def build(asset):
    aid, title, description, recipe, d = asset
    p = Parts()
    if recipe == "vehicle":
        vehicle(p, d)
    elif recipe == "hose-roll":
        hose_roll(p, d)
    elif recipe == "hose-pack":
        w, depth, h = d["w"], d["d"], d["h"]
        p.box("pack-base", 0, 0, 15, w, depth, 34, "accent")
        for row in range(5):
            for col in range(4):
                p.box(f"fold-{row}-{col}", -w * .36 + col * w * .24, -depth * .34 + row * depth * .17, 48 + (row % 2) * 20, w * .19, depth * .14, h * .50, "body")
        p.box("carry-strap", 0, 0, h * .84, 60, depth * .84, 24, "accent")
        p.cylinder("coupling", w * .42, 0, 40, 130, 42, "accent", 8, ([0, 1, 0], 90))
    elif recipe == "hose-reel":
        w, h = d["w"], d["h"]
        for side in (-1, 1):
            p.cylinder(f"reel-flange-{side}", 0, side * w * .25, h * .53, 42, h * .26, "accent", 10, ([1, 0, 0], 90))
        p.cylinder("spool", 0, 0, h * .53, w * .55, h * .15, "body", 10, ([1, 0, 0], 90))
        for side in (-1, 1):
            p.box(f"frame-leg-{side}", 0, side * w * .32, 0, 45, 45, h * .50, "body")
            p.wheel(f"cart-wheel-{side}", -w * .28, side * w * .40, 95, 60, 95)
        p.box("push-handle", -w * .44, 0, h * .46, 38, 48, h * .60, "accent")
    elif recipe == "hose-bridge":
        l, w, h = d["l"], d["w"], d["h"]
        p.box("center-channel", 0, 0, h * .42, l * .42, w * .36, h * .34, "accent")
        for side in (-1, 1):
            p.box(f"approach-ramp-{side}", side * l * .29, 0, h * .17, l * .20, w, h * .34, "body", ([0, 1, 0], -side * 18))
            p.box(f"outer-rail-{side}", side * l * .18, side * w * .42, h * .44, l * .60, 50, h * .20, "accent")
    elif recipe == "coupling":
        l, r = d["l"], d["r"]
        p.rod_x("coupling-barrel", -l * .14, 0, r, l * .58, r * .64, "body")
        p.rod_x("male-end", l * .28, 0, r, l * .26, r * .44, "accent")
        for i in range(3):
            p.rod_x(f"grip-rib-{i}", -l * .38 + i * l * .13, 0, r, 22, r * .78, "accent")
        p.rod_x("flange", -l * .48, 0, r, 35, r * .92, "body")
    elif recipe == "wye":
        r = d["r"]
        p.box("branch-body", 0, 0, 0, 250, 170, 100, "body")
        p.rod_x("inlet", 145, 0, 50, 150, r * .55, "accent")
        for side in (-1, 1):
            p.box(f"outlet-{side}", -120, side * 125, 80, 200, 55, 55, "accent", ([0, 0, 1], side * 35))
            p.cylinder(f"gate-wheel-{side}", -205, side * 155, 135, 22, 48, "body", 8)
            p.box(f"gate-stem-{side}", -205, side * 155, 88, 24, 24, 55, "accent")
    elif recipe == "nozzle":
        l, style = d["l"], d["style"]
        p.rod_x("hose-tail", -l * .36, 0, 54, l * .26, 45, "accent")
        p.rod_x("nozzle-body", -l * .03, 0, 54, l * .47, 34 if style != "fog" else 42, "body")
        p.rod_x("tip", l * .32, 0, 54, l * .18, 52 if style == "fog" else 22, "accent")
        if style == "fog":
            for i in range(4):
                p.rod_x(f"selector-rib-{i}", -l * .14 + i * 28, 0, 54, 12, 52, "accent")
            p.box("pistol-grip", -30, 0, 0, 38, 42, 80, "accent")
        elif style == "straight":
            p.box("handle", -l * .10, 0, 0, 40, 100, 32, "accent")
    elif recipe == "monitor":
        style = d["style"]
        p.box("base-feet", 0, 0, 18, 360, 280, 36, "body")
        if style == "ground":
            for side in (-1, 1):
                p.box(f"stabilizer-foot-{side}", 0, side * 180, 25, 450, 45, 48, "accent")
        p.cylinder("swivel-pedestal", 0, 0, 48, 120, 64, "accent", 8)
        p.box("elevation-yoke", 0, 0, 175, 70, 180, 180, "body")
        p.rod_x("monitor-barrel", 120, 0, 230, 420, 50, "accent")
        p.rod_x("nozzle-tip", 350, 0, 230, 120, 32, "body")
        for side in (-1, 1):
            p.cylinder(f"handwheel-{side}", 0, side * 145, 192, 24, 50, "accent", 8, ([1, 0, 0], 90))
    elif recipe == "pump":
        style = d["style"]
        p.box("pump-frame", 0, 0, 85, 570, 390, 130, "body")
        p.box("engine-housing", -40, 0, 215, 300, 290, 230, "accent")
        p.cylinder("pump-volute", 180, 0, 290, 125, 110, "body", 10, ([0, 1, 0], 90))
        for side in (-1, 1):
            p.rod_x(f"hose-port-{side}", 200, side * 210, 200, 130, 50, "accent")
        if style == "floating":
            p.box("float-pontoon-left", 0, -240, 20, 620, 170, 60, "accent")
            p.box("float-pontoon-right", 0, 240, 20, 620, 170, 60, "accent")
            p.cylinder("intake-screen", -240, 0, 70, 130, 80, "body", 8, ([0, 1, 0], 90))
        else:
            for side in (-1, 1):
                p.box(f"carry-handle-{side}", -230, side * 150, 220, 42, 40, 150, "accent")
    elif recipe == "water-tank":
        w, depth, h = d["w"], d["d"], d["h"]
        p.box("tank-floor", 0, 0, 18, w, depth, 36, "accent")
        for side in (-1, 1):
            p.box(f"tank-wall-x-{side}", side * w * .47, 0, h * .47, 45, depth, h * .88, "body")
            p.box(f"tank-wall-y-{side}", 0, side * depth * .47, h * .47, w, 45, h * .88, "body")
            p.box(f"corner-post-{side}-a", side * w * .43, side * depth * .43, 0, 44, 44, h, "accent")
            p.box(f"corner-post-{side}-b", -side * w * .43, -side * depth * .43, 0, 44, 44, h, "accent")
        p.rod_x("drain-outlet", w * .48, 0, 120, 130, 42, "accent")
    elif recipe == "foam":
        style = d["style"]
        if style == "eductor":
            p.rod_x("eductor-body", 0, 0, 70, 460, 54, "body")
            p.rod_x("inlet-coupling", 275, 0, 70, 125, 72, "accent")
            p.rod_x("outlet-coupling", -275, 0, 70, 125, 72, "accent")
            p.box("proportioning-dial", 0, 0, 125, 78, 75, 80, "accent")
            p.cylinder("pickup-hose", 0, 125, 20, 240, 18, "body")
        else:
            p.cylinder("canister", 0, 0, 45, 390, 145, "accent", 10)
            p.box("handle", 0, 0, 430, 210, 48, 30, "body")
            p.cylinder("cap", 0, 0, 435, 55, 54, "body", 8)
            p.rod_x("pickup-fitting", 130, 0, 115, 120, 32, "body")
    elif recipe == "extinguisher":
        p.cylinder("pressure-vessel", 0, 0, 60, 470, 125, "accent", 10)
        p.cylinder("base-ring", 0, 0, 40, 45, 132, "body", 10)
        p.cylinder("valve-neck", 0, 0, 530, 55, 45, "body", 8)
        p.box("handle-bracket", 0, 0, 610, 125, 32, 35, "body")
        p.box("squeeze-lever", 40, 0, 646, 150, 30, 24, "accent")
        p.cylinder("gauge", 38, -38, 585, 18, 38, "body", 8, ([1, 0, 0], 90))
        p.rod_x("hose", -125, 0, 420, 150, 20, "body")
        p.box("nozzle", -210, 0, 420, 70, 34, 32, "accent")
    elif recipe == "ladder":
        ladder(p, d)
    elif recipe == "pike-pole":
        l = d["l"]
        p.cylinder("shaft", 0, 0, 0, l, 24, "body", 8)
        for i in range(5):
            p.cylinder(f"grip-band-{i}", 0, 0, 180 + i * 42, 18, 30, "accent", 8)
        p.box("hook-spine", 0, 0, l + 70, 35, 32, 170, "accent")
        p.box("hook-tip", 72, 0, l + 135, 145, 32, 35, "body")
    elif recipe == "hydraulic-tool":
        style, l = d["style"], d["l"]
        p.box("tool-body", -l * .08, 0, 90, l * .42, 110, 125, "body")
        p.box("rear-handle", -l * .37, 0, 155, 90, 230, 45, "accent")
        p.box("front-handle", -l * .12, 0, 30, 240, 42, 50, "accent")
        p.cylinder("pivot", l * .12, 0, 155, 70, 75, "accent", 8)
        if style in ("cutter", "spreader"):
            angle = 36 if style == "spreader" else 24
            for side in (-1, 1):
                p.box(f"jaw-{side}", l * .34, side * 120, 230, l * .44, 48, 50, "body", ([0, 0, 1], angle * side))
                p.box(f"jaw-tip-{side}", l * .56, side * 160, 230, 85, 45, 70, "accent")
        else:
            p.box("ram-cylinder", l * .28, 0, 150, l * .42, 84, 92, "accent")
            p.box("ram-piston", l * .54, 0, 155, l * .28, 52, 58, "body")
            p.box("ram-foot", l * .70, 0, 130, 68, 150, 120, "accent")
    elif recipe == "stabilizer":
        h = d["h"]
        p.box("base-plate", 0, 0, 18, 250, 250, 36, "body")
        p.cylinder("outer-strut", 0, 0, 55, h * .66, 68, "accent", 8)
        p.cylinder("inner-strut", 0, 0, h * .62, h * .30, 38, "body", 8)
        p.box("ratchet-handle", 90, 0, h * .53, 180, 38, 34, "accent")
        p.box("top-pad", 0, 0, h * .90, 230, 230, 40, "body")
    elif recipe == "cribbing":
        w, dep = d["w"], d["d"]
        for layer in range(4):
            for i in range(3):
                along_x = layer % 2 == 0
                x = -w * .30 + i * w * .30 if along_x else 0
                y = 0 if along_x else -dep * .30 + i * dep * .30
                p.box(f"crib-layer-{layer}-{i}", x, y, 16 + layer * 66, w * (.52 if along_x else .72), dep * (.72 if along_x else .52), 62, "body" if layer % 2 == 0 else "accent")
    elif recipe == "tripod":
        h = d["h"]
        p.box("top-head", 0, 0, h * .90, 190, 190, 110, "accent")
        for i, angle in enumerate((0, 120, 240)):
            rad = math.radians(angle)
            x, y = 0, 0
            leg = f"leg-{i}"
            p.box(leg, 310 * math.cos(rad), 310 * math.sin(rad), h * .42, 60, 60, h * .88, "body", ([math.cos(rad), math.sin(rad), 0], 17))
            p.box(f"foot-{i}", 390 * math.cos(rad), 390 * math.sin(rad), 18, 170, 120, 36, "accent", ([0, 0, 1], angle))
        p.cylinder("pulley", 0, 0, h * .93 + 60, 160, 55, "body", 8, ([1, 0, 0], 90))
        p.cylinder("hook", 0, 0, 0, 120, 20, "accent", 8)
    elif recipe == "stretcher":
        l, w = d["l"], d["w"]
        p.box("basket-bed", 0, 0, 90, l * .83, w * .78, 55, "accent")
        for side in (-1, 1):
            p.box(f"long-rail-{side}", 0, side * w * .46, 115, l, 42, 70, "body")
            for i in range(3):
                p.box(f"carry-handle-{side}-{i}", -l * .36 + i * l * .36, side * w * .64, 80, 120, 32, 32, "accent")
        for i in range(5):
            p.box(f"cross-support-{i}", -l * .35 + i * l * .175, 0, 70, 32, w * .82, 35, "body")
    elif recipe == "harness":
        w, h = d["w"], d["h"]
        p.box("waist-belt", 0, 0, h * .34, w, 70, 72, "accent")
        for side in (-1, 1):
            p.box(f"shoulder-strap-{side}", side * w * .24, 0, h * .67, 78, 80, h * .55, "body", ([0, 1, 0], side * 14))
            p.box(f"leg-loop-{side}", side * w * .27, 0, h * .15, 190, 75, 42, "accent")
        p.box("back-pad", 0, 28, h * .60, 210, 55, h * .40, "body")
        p.box("front-buckle", 0, -50, h * .35, 90, 35, 60, "accent")
    elif recipe == "helmet":
        style = d["style"]
        p.cylinder("helmet-brim", 0, 0, 130, 32, 235 if style == "wildland" else 250, "accent", 12)
        p.cylinder("helmet-shell", 0, 0, 160, 170, 165, "body", 12)
        p.box("front-shield", 0, -160, 210, 115, 30, 90, "accent")
        p.box("face-shield", 0, -190, 95, 185, 20, 105, "body")
        for side in (-1, 1):
            p.box(f"ear-flap-{side}", side * 185, 0, 105, 65, 170, 120, "accent")
            p.box(f"chin-strap-{side}", side * 110, -15, 35, 35, 40, 105, "body")
        if style == "wildland":
            p.box("rear-neck-shroud", 0, 160, 68, 230, 90, 90, "accent")
    elif recipe == "turnout":
        style = d["style"]
        if style == "coat":
            p.box("coat-torso", 0, 0, 300, 490, 250, 570, "body")
            p.box("raised-collar", 0, 0, 595, 290, 245, 110, "accent")
            for side in (-1, 1):
                p.box(f"coat-sleeve-{side}", 0, side * 210, 320, 560, 130, 240, "accent", ([1, 0, 0], side * 12))
            for z in (260, 370, 480):
                p.box(f"coat-reflective-band-{z}", 0, 0, z, 505, 260, 30, "accent")
            p.box("front-closure", 235, 0, 310, 35, 28, 420, "accent")
        else:
            for side in (-1, 1):
                p.box(f"trouser-leg-{side}", 0, side * 120, 240, 220, 190, 455, "body")
                p.box(f"trouser-cuff-{side}", 0, side * 120, 34, 240, 205, 58, "accent")
                p.box(f"reflective-cuff-{side}", 0, side * 120, 95, 226, 198, 30, "accent")
            p.box("waistband", 0, 0, 485, 470, 340, 75, "accent")
            for side in (-1, 1):
                p.box(f"suspender-{side}", 0, side * 120, 600, 42, 48, 260, "body")
    elif recipe == "boots":
        for side in (-1, 1):
            p.box(f"boot-shaft-{side}", 0, side * 135, 190, 220, 205, 340, "body")
            p.box(f"boot-foot-{side}", 90, side * 135, 60, 380, 220, 120, "accent")
            p.box(f"boot-toe-{side}", 240, side * 135, 86, 120, 210, 110, "body")
    elif recipe == "gloves":
        for side in (-1, 1):
            p.box(f"gauntlet-cuff-{side}", -90, side * 160, 95, 170, 180, 150, "accent")
            p.box(f"palm-{side}", 35, side * 160, 125, 210, 155, 150, "body")
            for i in range(4):
                p.box(f"finger-{side}-{i}", 160, side * 90 + i * 45, 120, 125, 34, 70, "accent")
            p.box(f"thumb-{side}", 70, side * 255, 92, 125, 48, 60, "body")
    elif recipe == "hood":
        p.box("hood-neck-drape", 0, 0, 100, 390, 340, 190, "body")
        p.box("hood-crown", 0, 0, 270, 300, 300, 270, "accent")
        p.box("face-opening", 0, -158, 290, 175, 24, 125, "body")
        p.box("hem-band", 0, 0, 28, 410, 360, 40, "accent")
    elif recipe == "scba":
        p.box("backplate", 0, 0, 300, 330, 150, 470, "body")
        p.cylinder("air-cylinder", -40, 0, 300, 560, 105, "accent", 10)
        p.cylinder("valve", -40, 0, 860, 80, 42, "body", 8)
        for side in (-1, 1):
            p.box(f"shoulder-strap-{side}", 0, side * 105, 580, 70, 55, 340, "accent")
            p.box(f"waist-strap-{side}", 90, side * 88, 330, 160, 48, 52, "accent")
        p.box("regulator", 165, -20, 560, 130, 100, 110, "body")
        p.rod_x("air-hose", 225, 0, 525, 220, 18, "accent")
    elif recipe == "facepiece":
        p.box("mask-frame", 0, 0, 170, 300, 115, 250, "accent")
        p.box("lens", 70, -65, 235, 180, 28, 100, "body")
        p.cylinder("left-port", -110, 0, 145, 85, 48, "body", 8)
        p.cylinder("right-port", 110, 0, 145, 85, 48, "body", 8)
        p.box("lower-regulator", 0, -100, 80, 140, 65, 75, "accent")
        for side in (-1, 1):
            p.box(f"strap-{side}", side * 185, 0, 245, 110, 25, 24, "body")
    elif recipe == "radio":
        p.box("radio-body", 0, 0, 180, 190, 115, 360, "body")
        p.cylinder("antenna", -65, 0, 540, 220, 12, "accent", 8)
        p.cylinder("channel-knob", 75, -42, 565, 35, 32, "accent", 8)
        for i in range(5):
            p.box(f"speaker-slot-{i}", 0, -62, 320 + i * 25, 96, 16, 10, "accent")
        p.box("display", 0, -62, 490, 100, 18, 48, "accent")
        p.rod_x("shoulder-mic", 140, 55, 400, 120, 28, "body")
    elif recipe == "pass-device":
        p.box("alarm-case", 0, 0, 100, 220, 140, 195, "accent")
        p.box("clip", 0, 90, 125, 105, 24, 105, "body")
        p.cylinder("alarm-grille", 0, -74, 210, 22, 54, "body", 8, ([1, 0, 0], 90))
        p.cylinder("indicator", 72, -85, 260, 20, 22, "body", 8, ([1, 0, 0], 90))
        p.box("test-button", -65, -78, 272, 45, 28, 22, "body")
    elif recipe == "camera":
        p.box("camera-body", 0, 0, 160, 350, 250, 210, "body")
        p.box("display", -30, -138, 285, 190, 25, 110, "accent")
        p.cylinder("thermal-lens", 150, -85, 215, 105, 62, "accent", 10, ([0, 1, 0], 90))
        p.box("grip", -30, 0, 20, 130, 190, 110, "accent")
        p.cylinder("top-control", -90, 0, 295, 26, 36, "body", 8)
    elif recipe == "fan":
        style = d["style"]
        p.box("fan-frame", 0, 0, 165, 510, 230, 330, "accent")
        p.cylinder("fan-hub", 0, -135, 190, 42, 65, "body", 8, ([1, 0, 0], 90))
        for i in range(6):
            angle = i * 60
            p.box(f"fan-blade-{i}", 0, -115, 190, 210, 50, 28, "body", ([1, 0, 0], angle))
        p.cylinder("guard-ring", 0, -150, 190, 24, 185, "body", 12, ([1, 0, 0], 90))
        p.box("handle", 0, 0, 365, 250, 45, 40, "body")
        if style == "ppv":
            p.box("angled-stand", -140, 0, 25, 48, 48, 190, "body", ([0, 1, 0], -18))
            p.box("fuel-tank", 170, 0, 30, 150, 150, 75, "accent")
        else:
            p.box("floor-stand", 0, 0, 0, 240, 280, 45, "body")
    elif recipe == "scene-light":
        for side in (-1, 1):
            p.box(f"tripod-leg-{side}", side * 135, 0, 470, 44, 44, 900, "body", ([0, 1, 0], side * 9))
            p.box(f"lamp-head-{side}", side * 140, 0, 990, 220, 100, 145, "accent")
            p.box(f"lamp-face-{side}", side * 140, -58, 990, 160, 20, 100, "body")
        p.cylinder("mast-collar", 0, 0, 820, 80, 85, "accent", 8)
        p.box("ground-foot", 0, 0, 20, 550, 410, 40, "body")
    elif recipe == "command-board":
        p.box("board-frame", 0, 0, 870, 620, 70, 760, "accent")
        p.box("board-face", 0, -43, 870, 550, 24, 690, "body")
        for row in range(3):
            for col in range(4):
                p.box(f"status-tile-{row}-{col}", -195 + col * 130, -65, 1060 - row * 185, 88, 22, 82, "accent" if (row + col) % 2 == 0 else "body")
        for side in (-1, 1):
            p.box(f"easel-leg-{side}", side * 245, 0, 430, 40, 45, 850, "body", ([0, 1, 0], side * 8))
    elif recipe == "blanket":
        p.box("mounting-plate", 0, 30, 300, 370, 45, 520, "body")
        p.box("case", 0, -10, 300, 340, 230, 460, "accent")
        p.box("case-lid", 0, -135, 300, 300, 30, 420, "body")
        p.box("pull-tab", 0, -170, 145, 95, 30, 60, "accent")
    elif recipe == "chock":
        p.box("wedge", 0, 0, 75, 420, 230, 150, "accent", ([0, 1, 0], 17))
        for i in range(6):
            p.box(f"tread-rib-{i}", -150 + i * 55, 0, 125, 24, 240, 28, "body", ([0, 1, 0], 17))
        p.box("pull-loop", -220, 0, 190, 80, 45, 32, "body")
    else:
        raise ValueError(f"unknown recipe {recipe} for {aid}")
    return p.lines


def source_for(asset):
    aid, title, description, _, _ = asset
    parts = build(asset)
    ground_offset = GROUND_OFFSETS_MM.get(aid, 0.0)
    return "\n".join([
        "// SPDX-License-Identifier: CC0-1.0",
        f"// Original kernelCAD low-poly {title.lower()} scene prop, modeled from scratch.",
        "meta({",
        f"  name: {json.dumps(aid)},",
        "  license: 'CC0-1.0',",
        f"  title: {json.dumps(title)},",
        f"  description: {json.dumps(description + ' Knobs: overall scale, body color and accent color.')},",
        "  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],",
        "  kit: 'fire-rescue',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],",
        "  triangleBudget: 2200",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });",
        "const body = param('body', '#78828a', { label: 'Body color' });",
        "const accent = param('accent', '#d74735', { label: 'Accent color' });",
        f"const p = assembly({json.dumps(aid)});",
        f"const groundOffset = {f(ground_offset)};",
        "const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));",
        *parts,
        "",
        "return p.model();",
        "",
    ])


def write_readme():
    rows = [
        "# Fire & Rescue kit",
        "",
        "Sixty original low-poly scene props for municipal and wildland apparatus, fire hose and water delivery, ladders and rescue, firefighter PPE, ventilation, and incident command. Each asset exposes `scale`, `body` and `accent` controls and declares a 2,200 triangle budget. These generic models support visual scenes; they are not engineering models, operating guidance or certified equipment.",
        "",
        "The [Fire & Rescue wave demo bundle](../../../artifacts/catalog-demos/fire-rescue-wave-20261102/README.md) retains the source generator, video settings, local audit evidence and inspected MP4. Local replay and software rendering do not imply deployment, simulation or hardware acceptance.",
        "",
        "| id | asset | description | knobs |",
        "| --- | --- | --- | --- |",
    ]
    for aid, title, description, _, _ in ASSETS:
        rows.append(f"| `{aid}` | {title} | {description} | scale · body · accent |")
    rows.extend([
        "",
        "## Open an asset",
        "",
        "Search for fire or rescue equipment in the catalog, or open an asset in Studio with `?catalog=fire-rescue/<id>`. For example, `?catalog=fire-rescue/municipal-fire-engine` opens its editable source and controls.",
        "",
        "## Rebuild and verify",
        "",
        "```sh",
        "python3 -B artifacts/catalog-demos/fire-rescue-wave-20261102/generate_fire_rescue_assets.py",
        "npx tsx scripts/buildAssetCatalog.ts",
        "npx eslint catalog/",
        "npx vitest run tests/integration/catalog/",
        "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(a[0] for a in ASSETS),
        "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-fire-rescue-pages",
        "```",
        "",
        "## License and provenance",
        "",
        "All assets are original and dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). They use kernelCAD primitives; no external meshes, textures, manufacturer marks or product images are included.",
        "",
    ])
    (KIT / "README.md").write_text("\n".join(rows), encoding="utf-8")


def main():
    if len(ASSETS) != 60 or len({a[0] for a in ASSETS}) != len(ASSETS):
        raise SystemExit("expected 60 unique assets")
    KIT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        (KIT / f"{asset[0]}.kcad.ts").write_text(source_for(asset), encoding="utf-8")
    (KIT / "kit.json").write_text(json.dumps({"title": "Fire & Rescue", "description": "Original low-poly fire service apparatus, fireground equipment, rescue tools and protective gear with editable scale and palette controls."}, indent=2) + "\n", encoding="utf-8")
    write_readme()
    print(f"wrote {len(ASSETS)} fire & rescue assets to {KIT}")


if __name__ == "__main__":
    main()
