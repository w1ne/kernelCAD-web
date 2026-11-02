#!/usr/bin/env python3
"""Generate original low-poly agricultural machinery assets for kernelCAD."""

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "farm-machinery"

# id, title, description, recipe, dimensions/options
ASSETS = [
    ("row-crop-tractor", "Row-crop tractor", "Cabbed field tractor with tall rear tires, front axle, engine hood and three-point hitch.", "tractor", {"l": 1160, "w": 720, "rear": 410, "front": 290, "cab": 1}),
    ("articulated-4wd-tractor", "Articulated four-wheel-drive tractor", "Large articulated field tractor with equal-size tires, split chassis and high cab.", "tractor", {"l": 1480, "w": 860, "rear": 490, "front": 490, "articulated": 1, "cab": 1}),
    ("compact-utility-tractor", "Compact utility tractor", "Small utility tractor with compact bonnet, open operator station and rear implement hitch.", "tractor", {"l": 850, "w": 580, "rear": 300, "front": 220, "cab": 0}),
    ("orchard-tractor", "Orchard tractor", "Low-profile orchard tractor with narrow wheel track, protective canopy and enclosed side panels.", "tractor", {"l": 1020, "w": 620, "rear": 350, "front": 260, "cab": 1, "narrow": 1}),
    ("tracked-field-tractor", "Tracked field tractor", "Heavy field tractor with paired rubber-track frames, broad engine housing and raised cab.", "tractor", {"l": 1320, "w": 900, "rear": 450, "front": 420, "tracked": 1, "cab": 1}),
    ("high-clearance-sprayer-tractor", "High-clearance crop tractor", "Tall crop-care tractor with raised axle clearance, narrow tires and a central operator cab.", "tractor", {"l": 1100, "w": 700, "rear": 320, "front": 300, "clearance": 1, "cab": 1}),
    ("front-end-loader-frame", "Front-end loader frame", "Tractor-mounted loader arms with paired lift links, pivot plates and quick-attach carrier.", "attachment", {"w": 780, "d": 420, "h": 1050, "style": "loader"}),
    ("general-purpose-loader-bucket", "General-purpose loader bucket", "Wide front-loader bucket with rolled upper edge, side plates and cutting lip.", "attachment", {"w": 1050, "d": 520, "h": 430, "style": "bucket"}),
    ("bale-spear-attachment", "Bale spear attachment", "Three-point bale frame with three long horizontal spears and a reinforced back plate.", "attachment", {"w": 760, "d": 500, "h": 820, "style": "spear"}),
    ("pallet-fork-attachment", "Tractor pallet-fork attachment", "Quick-attach fork carriage with adjustable-looking tines and raised back guard.", "attachment", {"w": 880, "d": 780, "h": 620, "style": "forks"}),
    ("root-grapple-attachment", "Root grapple attachment", "Loader grapple bucket with lower scoop, split upper claws and hinge crossbar.", "attachment", {"w": 980, "d": 600, "h": 560, "style": "grapple"}),
    ("rear-landscape-rake", "Rear landscape rake", "Three-point landscape rake with angled end plates, long toolbar and closely spaced tines.", "attachment", {"w": 1350, "d": 430, "h": 620, "style": "rake"}),
    ("tractor-box-blade", "Tractor box blade", "Rear grading box blade with twin side plates, replaceable cutting edge and scarifier shanks.", "attachment", {"w": 1300, "d": 560, "h": 480, "style": "boxblade"}),
    ("three-point-hitch-frame", "Three-point hitch frame", "Rear tractor hitch assembly with twin lower links, top link and implement pins.", "attachment", {"w": 680, "d": 500, "h": 620, "style": "hitch"}),
    ("tractor-drawbar-hitch", "Tractor drawbar hitch", "Heavy drawbar with cross pin, stepped support plate and clevis coupling.", "attachment", {"w": 730, "d": 360, "h": 280, "style": "drawbar"}),
    ("tractor-ballast-weight", "Tractor ballast weight", "Rear-mounted counterweight block with mounting frame and raised lifting loop.", "attachment", {"w": 620, "d": 420, "h": 460, "style": "ballast"}),
    ("pto-shaft-guard", "PTO shaft guard", "Protected power-take-off driveline cover with telescoping sections and end shields.", "attachment", {"w": 860, "d": 180, "h": 210, "style": "pto"}),
    ("moldboard-plow", "Moldboard plow", "Three-bottom moldboard plow with a heavy toolbar, curved-looking shares and gauge wheel.", "field", {"w": 1650, "d": 1050, "h": 720, "style": "moldboard", "tools": 3}),
    ("chisel-plow", "Chisel plow", "Wide chisel plow with a folding-looking frame, spring shanks and narrow soil points.", "field", {"w": 2200, "d": 1100, "h": 620, "style": "chisel", "tools": 7}),
    ("offset-disc-harrow", "Offset disc harrow", "Offset disc harrow with paired gangs, frame beam and transport wheels.", "field", {"w": 1850, "d": 1000, "h": 680, "style": "disc", "tools": 8, "wheels": 2}),
    ("field-cultivator", "Field cultivator", "Trailing field cultivator with a three-section toolbar, rows of tines and support wheels.", "field", {"w": 2300, "d": 1000, "h": 670, "style": "cultivator", "tools": 9, "wheels": 2}),
    ("row-crop-cultivator", "Row-crop cultivator", "Inter-row cultivator with adjustable row units, gauge wheels and protective shields.", "field", {"w": 1700, "d": 980, "h": 650, "style": "rowcult", "tools": 6, "wheels": 2}),
    ("subsoiler-implement", "Subsoiler implement", "Deep-tillage subsoiler frame with reinforced standards, angled legs and replaceable points.", "field", {"w": 1500, "d": 900, "h": 800, "style": "subsoiler", "tools": 5}),
    ("land-leveling-scraper", "Land-leveling scraper", "Tractor-pulled land scraper with a deep open bowl, side cheeks and cutting edge.", "field", {"w": 1450, "d": 1000, "h": 700, "style": "scraper", "tools": 2}),
    ("stone-picker-implement", "Stone picker implement", "Field stone picker with a raised hopper, pickup reel guard and tandem support wheels.", "field", {"w": 1500, "d": 1100, "h": 980, "style": "stonepicker", "tools": 5, "wheels": 2}),
    ("seed-drill", "Seed drill", "Compact seed drill with covered hoppers, metering row units and press wheels.", "planter", {"w": 1900, "d": 900, "h": 1050, "rows": 9, "hoppers": 2, "style": "drill"}),
    ("no-till-seeder", "No-till seeder", "Heavy no-till seeder with front coulter row, large seed box and rear closing wheels.", "planter", {"w": 2100, "d": 1050, "h": 1200, "rows": 7, "hoppers": 2, "style": "notill"}),
    ("row-crop-planter", "Row-crop planter", "Trailed row planter with a central seed hopper and evenly spaced planting units.", "planter", {"w": 2200, "d": 1050, "h": 1180, "rows": 8, "hoppers": 1, "style": "row"}),
    ("precision-planter", "Precision planter", "Precision planter with individual seed boxes, parallel-link row units and gauge wheels.", "planter", {"w": 2000, "d": 1050, "h": 1300, "rows": 6, "hoppers": 6, "style": "precision"}),
    ("fertilizer-spreader", "Fertilizer spreader", "Tractor-mounted fertilizer hopper with twin spinner discs, guard frame and support feet.", "spreader", {"w": 850, "d": 730, "h": 1050, "style": "fertilizer", "wheels": 0}),
    ("manure-spreader", "Manure spreader wagon", "Farm spreader wagon with a tall bin, rear beater bars, apron bed and drawbar.", "spreader", {"w": 1200, "d": 2150, "h": 1450, "style": "manure", "wheels": 2}),
    ("trailed-field-sprayer", "Trailed field sprayer", "Tow-behind crop sprayer with tank, folding boom sections and wide support wheels.", "sprayer", {"w": 2500, "d": 1450, "h": 1900, "style": "trailed", "boom": 4300}),
    ("self-propelled-field-sprayer", "Self-propelled field sprayer", "High-clearance crop sprayer with four tall tires, central cab, tank and long booms.", "self_sprayer", {"w": 1800, "d": 2100, "h": 2700, "boom": 5600}),
    ("orchard-air-blast-sprayer", "Orchard air-blast sprayer", "Compact orchard sprayer with tank, axial fan ring, nozzle bank and trailer wheels.", "sprayer", {"w": 1100, "d": 1150, "h": 1500, "style": "airblast", "boom": 0}),
    ("rotary-mower-implement", "Rotary mower implement", "Three-point rotary mower deck with paired blade housings, hitch frame and caster wheels.", "mower", {"w": 1550, "d": 1250, "h": 480, "style": "rotary", "decks": 2}),
    ("flail-mower-implement", "Flail mower implement", "Heavy rear flail mower with enclosed cutter housing, roller and rear service shield.", "mower", {"w": 1500, "d": 1050, "h": 620, "style": "flail", "decks": 1}),
    ("sicklebar-mower", "Sicklebar mower", "Side-mounted sicklebar mower with long finger guard, reciprocating blade rail and support wheel.", "mower", {"w": 1900, "d": 760, "h": 560, "style": "sickle", "decks": 1}),
    ("rotary-tedder", "Rotary hay tedder", "Four-rotor hay tedder with radial tine arms, drawbar and folding transport frame.", "hay", {"w": 2200, "d": 1450, "h": 820, "style": "tedder", "rotors": 4}),
    ("wheel-hay-rake", "Wheel hay rake", "Trailing wheel rake with five star wheels, support frame and adjustable tongue.", "hay", {"w": 2100, "d": 1000, "h": 950, "style": "rake", "rotors": 5}),
    ("round-baler", "Round baler", "Round baler with enclosed bale chamber, pickup reel, side panels and transport wheels.", "baler", {"w": 1350, "d": 1650, "h": 1900, "style": "round"}),
    ("square-baler", "Square baler", "Small square baler with pickup teeth, rectangular chamber, flywheel guard and tandem tires.", "baler", {"w": 1180, "d": 2300, "h": 1650, "style": "square"}),
    ("bale-wrapper", "Bale wrapper", "Trailed bale wrapper with circular cradle rollers, film mast and support wheels.", "hay", {"w": 1180, "d": 1750, "h": 1100, "style": "wrapper", "rotors": 2}),
    ("bale-accumulator", "Bale accumulator", "Rear bale accumulator with twin collection decks, guide rails and discharge gate.", "hay", {"w": 1900, "d": 2100, "h": 1150, "style": "accumulator", "rotors": 1}),
    ("forage-wagon", "Forage wagon", "High-sided forage wagon with slatted walls, walking beam wheels and drawbar.", "wagon", {"w": 1350, "d": 2400, "h": 1850, "style": "forage"}),
    ("combine-harvester", "Combine harvester", "Self-propelled combine with tall grain body, operator cab, large drive wheels and unloading auger.", "combine", {"w": 1900, "d": 2450, "h": 3100, "style": "grain"}),
    ("grain-header", "Grain header", "Wide grain platform header with reel, cutter bar, end dividers and center feeder opening.", "header", {"w": 4200, "d": 1550, "h": 1050, "style": "grain", "rows": 8}),
    ("corn-header", "Corn header", "Row-crop corn header with multiple tapered snouts, gathering chains and cross auger.", "header", {"w": 3600, "d": 1450, "h": 1200, "style": "corn", "rows": 8}),
    ("forage-harvester", "Forage harvester", "Self-propelled forage harvester with cab, crop-processing body, discharge spout and front pickup.", "combine", {"w": 1550, "d": 2050, "h": 2800, "style": "forage"}),
    ("potato-harvester", "Potato harvester", "Trailed potato harvester with digging share, separator web, collection bunker and wheels.", "harvester", {"w": 1550, "d": 2400, "h": 1750, "style": "potato"}),
    ("sugar-beet-harvester", "Sugar-beet harvester", "Root-crop harvester with front lifting row, cleaning web, storage body and high clearance.", "harvester", {"w": 1800, "d": 2700, "h": 2350, "style": "beet"}),
    ("cotton-picker", "Cotton picker", "Tall self-propelled cotton picker with harvesting towers, cab, basket and high-clearance wheels.", "combine", {"w": 1850, "d": 2600, "h": 3200, "style": "cotton"}),
    ("grain-cart", "Grain cart", "Large grain cart with tapered hopper, tandem wheels, auger tube and tractor drawbar.", "wagon", {"w": 1500, "d": 2350, "h": 2050, "style": "grain"}),
    ("farm-grain-auger", "Farm grain auger", "Portable grain auger with intake hopper, segmented tube, transport wheels and support stand.", "grain_auger", {"w": 1050, "d": 4100, "h": 3800}),
    ("portable-grain-conveyor", "Portable grain conveyor", "Mobile belt conveyor with a raised delivery end, tubular frame, hopper and axle wheels.", "grain_auger", {"w": 1050, "d": 3600, "h": 3300, "conveyor": 1}),
    ("grain-dryer", "Farm grain dryer", "Vertical grain-drying tower with intake hopper, vented chamber, service ladder and exhaust cap.", "dryer", {"w": 1100, "d": 1050, "h": 2400, "style": "tower"}),
    ("grain-bin-aeration-fan", "Grain-bin aeration fan unit", "Low-profile aeration fan assembly with intake shroud, motor housing and transition duct.", "dryer", {"w": 850, "d": 720, "h": 820, "style": "fan"}),
    ("center-pivot-irrigation-span", "Center-pivot irrigation span", "Modular irrigation truss with paired tower frames, drive wheels and a suspended spray line.", "irrigation", {"w": 4400, "d": 700, "h": 1550, "style": "pivot", "drops": 7}),
    ("traveling-sprinkler-cart", "Traveling sprinkler cart", "Portable irrigation cart with hose reel, large wheels, guide frame and elevated sprinkler head.", "irrigation", {"w": 950, "d": 1250, "h": 1500, "style": "cart", "drops": 1}),
    ("drip-irrigation-filter-unit", "Drip-irrigation filter unit", "Field irrigation manifold with filter vessels, pressure chamber, valve branch and skid base.", "irrigation", {"w": 1300, "d": 730, "h": 1450, "style": "filter", "drops": 3}),
    ("irrigation-hose-reel", "Irrigation hose reel", "Towable irrigation hose reel with wide spool, support frame, crank and wheeled axle.", "irrigation", {"w": 1250, "d": 1900, "h": 1850, "style": "reel", "drops": 1}),
]

# Ground-level placement corrections in millimetres, measured from the first
# catalog export. Applying them to every component preserves a true base origin.
GROUND_OFFSETS_MM = {
    "bale-accumulator": 130,
    "bale-spear-attachment": 60,
    "chisel-plow": 22,
    "corn-header": 45,
    "fertilizer-spreader": 35,
    "general-purpose-loader-bucket": 20,
    "grain-header": 50,
    "land-leveling-scraper": 55,
    "moldboard-plow": 40,
    "pallet-fork-attachment": 20,
    "pto-shaft-guard": 45,
    "root-grapple-attachment": 20,
    "rotary-tedder": 120,
    "subsoiler-implement": 18,
    "three-point-hitch-frame": 60,
    "tractor-ballast-weight": 60,
    "tractor-drawbar-hitch": 60,
    "wheel-hay-rake": 62.5,
}


def n(value):
    return f"{value:.3f}".rstrip("0").rstrip(".")


class Parts:
    def __init__(self):
        self.lines = []

    def add(self, name, expression, color="body"):
        name = re.sub(r"[^A-Za-z0-9_-]+", "-", str(name)).strip("-")
        color_expression = json.dumps(color) if color.startswith("#") else color
        self.lines.append(f"add('{name}', {expression}, {color_expression});")

    def box(self, name, x, y, z, w, d, h, color="body"):
        if w > 0 and d > 0 and h > 0:
            self.add(name, f"box({n(w)}, {n(d)}, {n(h)}, true).translate({n(x)}, {n(y)}, {n(z + h / 2)})", color)

    def cyl(self, name, x, y, z, h, r, color="body", segments=8):
        if h > 0 and r > 0:
            self.add(name, f"cylinder({n(h)}, {n(r)}, {segments}).translate({n(x)}, {n(y)}, {n(z)})", color)

    def wheel(self, name, x, y, z, width, radius, color="#444b4c"):
        expr = f"cylinder({n(width)}, {n(radius)}, 12).rotate([0, 1, 0], 90).translate({n(x - width / 2)}, {n(y)}, {n(z)})"
        self.add(name, expr, color)
        self.cyl(name + "-hub", x - width * 0.55, y, z, width * 1.1, radius * 0.34, "accent", 10)


def tractor(p, d):
    l, w, rear, front = d["l"], d["w"], d["rear"], d["front"]
    narrow = d.get("narrow", 0)
    clearance = d.get("clearance", 0)
    rear_z = rear
    front_z = front
    axle_back = -l * 0.28
    axle_front = l * 0.33
    for side in (-1, 1):
        y = side * w * 0.43
        p.wheel(f"rear-wheel-{side}", axle_back, y, rear_z, 130 if rear > 380 else 96, rear, "#414848")
        p.wheel(f"front-wheel-{side}", axle_front, y * (0.92 if narrow else 1), front_z, 100 if front > 380 else 76, front, "#414848")
        if d.get("tracked"):
            p.box(f"track-frame-{side}", axle_back, y, 10, l * 0.54, 150, rear * 1.75, "body")
            for i in range(6):
                x = axle_back - l * 0.21 + i * l * 0.42 / 5
                p.cyl(f"track-roller-{side}-{i}", x, y * 1.14, 20, 38, rear * 0.18, "accent", 8)
    chassis_z = max(rear_z, front_z) * 0.76
    p.box("main-chassis", -l * 0.04, 0, chassis_z, l * 0.75, w * 0.54, 150, "body")
    p.box("engine-hood", l * 0.22, 0, chassis_z + 100, l * 0.44, w * 0.47, rear * 0.72, "accent")
    p.box("front-grille", l * 0.45, 0, chassis_z + 110, 38, w * 0.38, rear * 0.44, "body")
    p.box("rear-fender-left", axle_back, -w * 0.28, rear_z + rear * 0.72, l * 0.28, 150, 36, "accent")
    p.box("rear-fender-right", axle_back, w * 0.28, rear_z + rear * 0.72, l * 0.28, 150, 36, "accent")
    if d.get("cab"):
        cab_w = w * 0.48
        cab_d = l * 0.32
        cab_z = max(rear_z, front_z) * 0.8 + 180
        p.box("cab-floor", -l * 0.2, 0, cab_z, cab_d, cab_w, 45, "body")
        p.box("cab-glazing-front", -l * 0.05, 0, cab_z + 50, 24, cab_w * 0.94, rear * 0.78, "accent")
        p.box("cab-glazing-rear", -l * 0.35, 0, cab_z + 50, 24, cab_w * 0.94, rear * 0.78, "accent")
        for side in (-1, 1):
            p.box(f"cab-pillar-{side}", -l * 0.2, side * cab_w * 0.5, cab_z + 70, cab_d, 30, rear * 0.9, "body")
        p.box("cab-roof", -l * 0.2, 0, cab_z + rear * 0.82, cab_d * 1.2, cab_w * 1.2, 70, "accent")
    else:
        p.box("operator-platform", -l * 0.2, 0, chassis_z + rear * 0.8, l * 0.31, w * 0.54, 32, "accent")
        p.box("roll-bar-left", -l * 0.22, -w * 0.22, chassis_z + rear * 0.45, 34, 34, rear * 1.2, "body")
        p.box("roll-bar-right", -l * 0.22, w * 0.22, chassis_z + rear * 0.45, 34, 34, rear * 1.2, "body")
    p.cyl("exhaust-stack", l * 0.18, -w * 0.14, chassis_z + rear * 0.72, rear * 0.75, 24, "body", 8)
    p.box("rear-hitch", -l * 0.51, 0, 40, 190, 190, 150, "accent")
    p.box("front-weight-block", l * 0.5, 0, 20, 210, w * 0.45, 80, "body")
    if d.get("articulated"):
        p.box("articulation-joint", 0, 0, chassis_z + 60, 160, w * 0.62, 130, "accent")
        p.box("rear-frame", -l * 0.37, 0, chassis_z, l * 0.34, w * 0.62, 145, "body")
    if clearance:
        p.box("high-clearance-portal", 0, 0, front_z + rear * 0.62, 150, w * 0.48, 220, "body")


def attachment(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("mounting-frame", 0, dep * 0.34, 60, w * 0.82, 100, h * 0.58, "body")
    p.box("crossbar", 0, dep * 0.23, h * 0.62, w, 95, 80, "accent")
    if style == "loader":
        for side in (-1, 1):
            y = side * w * 0.38
            p.box(f"loader-upright-{side}", -dep * 0.12, y, 0, 85, 110, h * 0.74, "body")
            p.box(f"loader-arm-{side}", dep * 0.15, y, h * 0.55, dep * 1.4, 105, 90, "accent")
            p.cyl(f"pivot-{side}", dep * 0.42, y, h * 0.52, 74, 58, "body", 10)
        p.box("quick-attach", dep * 0.9, 0, h * 0.36, 120, w * 0.65, 190, "accent")
    elif style in ("bucket", "grapple"):
        p.box("bucket-floor", 0, -dep * 0.1, 20, w, dep * 0.78, 38, "accent")
        for side in (-1, 1):
            p.box(f"bucket-cheek-{side}", side * w * 0.44, 0, h * 0.35, 50, dep, h * 0.7, "body")
        p.box("cutting-edge", 0, -dep * 0.52, 40, w * 1.04, 45, 52, "body")
        p.box("back-shell", 0, dep * 0.27, h * 0.36, w * 0.95, dep * 0.18, h * 0.54, "accent")
        if style == "grapple":
            p.box("grapple-crossbar", 0, dep * 0.22, h * 0.9, w * 0.86, 90, 72, "body")
            for i in range(5):
                x = -w * 0.38 + i * w * 0.19
                p.box(f"grapple-tine-{i}", x, dep * 0.18, h * 0.57, 48, dep * 0.62, h * 0.6, "accent")
    elif style == "spear":
        for i in range(3):
            x = -w * 0.3 + i * w * 0.3
            p.box(f"spear-socket-{i}", x, -dep * 0.16, h * 0.45, 75, 100, 80, "accent")
            p.add(f"bale-spear-{i}", f"cylinder({n(dep * 0.9)}, 16, 8).rotate([1, 0, 0], 90).translate({n(x)}, {n(-dep * 0.52)}, {n(h * 0.45)})", "body")
    elif style == "forks":
        p.box("fork-carriage", 0, 0, h * 0.4, w * 0.9, 65, h * 0.58, "accent")
        for side in (-1, 1):
            x = side * w * 0.26
            p.box(f"fork-tine-{side}", x, -dep * 0.4, 20, 82, dep * 0.82, 60, "body")
    elif style == "rake":
        p.box("rake-beam", 0, 0, h * 0.55, w, 110, 90, "accent")
        for i in range(13):
            x = -w * 0.46 + i * w * 0.92 / 12
            p.box(f"rake-tooth-{i}", x, -dep * 0.35, 0, 24, 55, h * 0.54, "body")
    elif style == "boxblade":
        for side in (-1, 1):
            p.box(f"side-plate-{side}", side * w * 0.44, 0, h * 0.27, 52, dep, h * 0.55, "body")
        p.box("moldboard", 0, dep * 0.28, h * 0.34, w * 0.88, 60, h * 0.62, "accent")
        p.box("cutting-edge", 0, -dep * 0.32, 20, w, 32, 42, "body")
        for i in range(5):
            x = -w * 0.34 + i * w * 0.17
            p.box(f"scarifier-{i}", x, 0, 0, 34, 42, h * 0.5, "accent")
    elif style == "hitch":
        for side in (-1, 1):
            p.box(f"lower-link-{side}", side * w * 0.32, -dep * 0.25, 90, 62, dep * 0.8, 60, "accent")
            p.cyl(f"link-pin-{side}", side * w * 0.32, -dep * 0.55, 100, 80, 34, "body", 8)
        p.box("top-link", 0, -dep * 0.15, h * 0.73, 90, dep * 0.85, 48, "body")
        p.box("hitch-tower", 0, dep * 0.25, h * 0.5, w * 0.34, 100, h, "accent")
    elif style == "drawbar":
        p.box("drawbar-shank", 0, -dep * 0.35, 80, 150, dep * 0.95, 90, "body")
        p.box("clevis", 0, -dep * 0.76, 95, 210, 85, 75, "accent")
        p.cyl("hitch-pin", 0, -dep * 0.76, 80, 110, 27, "body", 8)
    elif style == "ballast":
        p.box("weight-block", 0, 0, 80, w, dep * 0.76, h * 0.72, "accent")
        p.box("mounting-lugs", 0, dep * 0.48, h * 0.62, w * 0.5, 110, h * 0.6, "body")
        p.box("lift-loop", 0, 0, h * 0.82, w * 0.32, 75, 46, "body")
    elif style == "pto":
        p.cyl("shaft-cover", 0, 0, 60, h * 0.56, w * 0.14, "accent", 10)
        p.box("guard-support", 0, 0, 45, w * 0.72, dep * 0.8, 34, "body")
        p.box("end-shield-a", 0, -dep * 0.44, h * 0.5, w * 0.25, 32, h * 0.58, "body")
        p.box("end-shield-b", 0, dep * 0.44, h * 0.5, w * 0.25, 32, h * 0.58, "body")


def field(p, d):
    w, dep, h, style, tools = d["w"], d["d"], d["h"], d["style"], d.get("tools", 5)
    p.box("main-toolbar", 0, dep * 0.12, h * 0.54, w, 110, 94, "accent")
    p.box("drawbar", 0, dep * 0.43, h * 0.62, 135, dep * 0.56, 70, "body")
    if d.get("wheels"):
        for side in (-1, 1):
            p.wheel(f"transport-wheel-{side}", w * 0.37, side * dep * 0.23, 120, 85, 120, "#414848")
    if style in ("moldboard", "chisel", "cultivator", "rowcult", "subsoiler"):
        for i in range(tools):
            x = -w * 0.42 + i * w * 0.84 / max(1, tools - 1)
            p.box(f"standard-{i}", x, 0, h * 0.25, 42, 58, h * 0.62, "body")
            if style == "moldboard":
                p.box(f"moldboard-share-{i}", x, -dep * 0.12, 40, 190, 250, 32, "accent")
                p.box(f"moldboard-wing-{i}", x, -dep * 0.22, 150, 110, 160, h * 0.46, "body")
            elif style == "chisel":
                p.box(f"chisel-point-{i}", x, -dep * 0.16, 22, 86, 180, 44, "accent")
            elif style == "subsoiler":
                p.box(f"subsoiler-leg-{i}", x, -dep * 0.12, 25, 82, 200, h * 0.55, "body")
                p.box(f"subsoiler-point-{i}", x, -dep * 0.24, 18, 120, 210, 40, "accent")
            else:
                p.box(f"cultivator-sweep-{i}", x, -dep * 0.12, 25, 130, 170, 34, "accent")
    elif style == "disc":
        for gang in (-1, 1):
            for i in range(tools // 2):
                x = -w * 0.38 + i * w * 0.76 / max(1, tools // 2 - 1)
                p.cyl(f"disc-{gang}-{i}", x, gang * dep * 0.22, 40, 30, 142, "body", 10)
                p.box(f"disc-scraper-{gang}-{i}", x, gang * dep * 0.22, 170, 16, 180, 220, "accent")
    elif style == "scraper":
        p.box("scraper-bowl-floor", 0, -dep * 0.08, h * 0.25, w * 0.82, dep * 0.55, 40, "body")
        for side in (-1, 1):
            p.box(f"bowl-side-{side}", side * w * 0.38, 0, h * 0.4, 65, dep * 0.68, h * 0.78, "accent")
        p.box("cutting-edge", 0, -dep * 0.42, 55, w * 0.86, 46, 54, "body")
    elif style == "stonepicker":
        p.box("hopper", 0, -dep * 0.1, h * 0.46, w * 0.8, dep * 0.5, h * 0.62, "body")
        p.box("pickup-guard", 0, -dep * 0.43, h * 0.18, w * 0.76, 90, 160, "accent")
        for i in range(tools):
            x = -w * 0.32 + i * w * 0.64 / max(1, tools - 1)
            p.cyl(f"pickup-roller-{i}", x, -dep * 0.52, 35, 95, 24, "body", 8)


def planter(p, d):
    w, dep, h, rows, style = d["w"], d["d"], d["h"], d["rows"], d["style"]
    p.box("planter-frame", 0, 0, h * 0.46, w, dep * 0.42, 90, "accent")
    p.box("seed-hopper", 0, dep * 0.05, h * 0.72, w * 0.76, dep * 0.7, h * 0.48, "body")
    if d.get("hoppers", 1) > 1:
        for side in (-1, 1):
            p.box(f"side-hopper-{side}", side * w * 0.25, dep * 0.04, h * 0.72, w * 0.22, dep * 0.62, h * 0.44, "accent")
    if style == "precision":
        for i in range(rows):
            x = -w * 0.42 + i * w * 0.84 / max(1, rows - 1)
            p.box(f"seed-box-{i}", x, dep * 0.08, h * 0.62, 165, 180, 210, "accent")
    for i in range(rows):
        x = -w * 0.43 + i * w * 0.86 / max(1, rows - 1)
        p.box(f"row-unit-{i}", x, -dep * 0.16, h * 0.24, 70, 88, h * 0.43, "body")
        p.cyl(f"press-wheel-{i}", x, -dep * 0.32, 30, 40, 58, "accent", 8)
        p.box(f"seed-tube-{i}", x, 0, h * 0.25, 22, 30, h * 0.36, "accent")
    for side in (-1, 1):
        p.wheel(f"transport-wheel-{side}", side * w * 0.36, dep * 0.22, 130, 90, 130, "#414848")
    p.box("tongue", 0, dep * 0.52, h * 0.44, 110, dep * 0.56, 65, "body")


def spreader(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("spreader-frame", 0, 0, 35, w * 0.85, dep * 0.76, 76, "accent")
    if style == "manure":
        p.box("spreader-bin", 0, dep * 0.02, h * 0.54, w * 0.84, dep * 0.72, h * 0.68, "body")
        p.box("apron-bed", 0, -dep * 0.18, h * 0.39, w * 0.73, dep * 0.24, 34, "accent")
        for i in range(5):
            x = -w * 0.3 + i * w * 0.15
            p.cyl(f"rear-beater-{i}", x, -dep * 0.44, 65, h * 0.46, 22, "accent", 8)
        for side in (-1, 1):
            p.wheel(f"wagon-wheel-{side}", -dep * 0.08, side * w * 0.46, 250, 90, 250, "#414848")
        p.box("drawbar", 0, dep * 0.58, 105, 92, dep * 0.45, 60, "body")
    else:
        p.box("fertilizer-hopper", 0, 0, h * 0.54, w * 0.8, dep * 0.76, h * 0.68, "body")
        p.box("hopper-lid", 0, 0, h * 0.89, w * 0.88, dep * 0.82, 38, "accent")
        for side in (-1, 1):
            p.cyl(f"spinner-{side}", side * w * 0.22, -dep * 0.42, 80, 35, 135, "accent", 10)
            p.box(f"spinner-vane-{side}", side * w * 0.22, -dep * 0.42, 125, 210, 24, 15, "body")
        p.box("mounting-tower", 0, dep * 0.45, h * 0.38, w * 0.34, 85, h * 0.54, "accent")


def sprayer(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d.get("style", "self")
    if style == "trailed":
        p.box("sprayer-chassis", 0, 0, 250, w * 0.7, dep, 90, "body")
        p.box("sprayer-tank", 0, 0, h * 0.53, w * 0.54, dep * 0.54, h * 0.53, "accent")
        for side in (-1, 1):
            p.wheel(f"sprayer-wheel-{side}", 0, side * w * 0.43, 170, 94, 170, "#414848")
            p.box(f"boom-wing-{side}", side * d["boom"] * 0.35, -dep * 0.15, h * 0.84, d["boom"] * 0.34, 68, 55, "body")
            for i in range(7):
                x = side * (d["boom"] * 0.2 + i * d["boom"] * 0.04)
                p.cyl(f"nozzle-{side}-{i}", x, -dep * 0.15, h * 0.78, 45, 12, "accent", 6)
        p.box("center-boom", 0, -dep * 0.15, h * 0.84, d["boom"] * 0.42, 68, 55, "accent")
        p.box("drawbar", 0, dep * 0.52, 125, 94, dep * 0.52, 62, "body")
    else:
        p.box("sprayer-chassis", 0, 0, 520, w * 0.74, dep * 0.64, 135, "body")
        p.box("chemical-tank", 0, dep * 0.03, h * 0.55, w * 0.63, dep * 0.38, h * 0.39, "accent")
        for x in (-w * 0.32, w * 0.32):
            for y in (-dep * 0.4, dep * 0.4):
                p.wheel(f"high-wheel-{x}-{y}", x, y, 430, 92, 430, "#414848")
        p.box("operator-cab", -w * 0.25, -dep * 0.27, h * 0.78, w * 0.42, dep * 0.4, h * 0.34, "body")
        p.box("cab-window", -w * 0.25, -dep * 0.48, h * 0.8, w * 0.31, 18, h * 0.22, "accent")
        for side in (-1, 1):
            p.box(f"boom-wing-{side}", side * d["boom"] * 0.34, -dep * 0.12, h * 0.76, d["boom"] * 0.34, 58, 52, "accent")


def mower(p, d):
    w, dep, h, style, decks = d["w"], d["d"], d["h"], d["style"], d["decks"]
    p.box("mower-deck", 0, 0, h * 0.33, w * 0.82, dep * 0.62, h * 0.46, "body")
    p.box("deck-lip", 0, -dep * 0.3, h * 0.3, w * 0.86, 42, 38, "accent")
    if style == "sickle":
        p.box("sickle-bar", w * 0.43, 0, h * 0.3, w * 0.17, dep * 0.84, 45, "accent")
        for i in range(12):
            y = -dep * 0.38 + i * dep * 0.76 / 11
            p.box(f"guard-finger-{i}", w * 0.54, y, h * 0.27, 180, 22, 26, "body")
    else:
        for i in range(decks):
            x = -w * 0.28 + i * w * 0.56 / max(1, decks - 1)
            p.cyl(f"blade-housing-{i}", x, 0, 20, 28, 155, "accent", 10)
            p.box(f"blade-spindle-{i}", x, 0, 48, 45, 45, 80, "body")
    for side in (-1, 1):
        p.wheel(f"deck-wheel-{side}", side * w * 0.36, dep * 0.22, 90, 54, 90, "#414848")
    p.box("three-point-tower", 0, dep * 0.5, h * 0.55, w * 0.24, 60, h * 0.6, "accent")
    if style == "flail":
        p.cyl("rear-roller", 0, dep * 0.43, 45, 60, 70, "body", 10)
        p.box("rear-shield", 0, dep * 0.48, h * 0.64, w * 0.86, 32, 120, "accent")


def hay(p, d):
    w, dep, h, style, rotors = d["w"], d["d"], d["h"], d["style"], d["rotors"]
    p.box("hay-frame", 0, dep * 0.08, h * 0.42, w * 0.84, 85, 78, "accent")
    p.box("drawbar", 0, dep * 0.43, h * 0.5, 95, dep * 0.5, 56, "body")
    if style == "tedder":
        for i in range(rotors):
            x = -w * 0.38 + i * w * 0.76 / max(1, rotors - 1)
            p.cyl(f"rotor-hub-{i}", x, 0, 120, 42, 78, "body", 10)
            for j in range(6):
                angle = j * 60
                p.box(f"tedder-arm-{i}-{j}", x + (j - 2.5) * 55, 0, 170, 34, 280, 20, "accent")
    elif style == "rake":
        for i in range(rotors):
            x = -w * 0.42 + i * w * 0.84 / max(1, rotors - 1)
            p.wheel(f"star-rake-wheel-{i}", x, -dep * 0.18, h * 0.35, 34, 270, "#505858")
            for j in range(5):
                p.box(f"rake-spoke-{i}-{j}", x, -dep * 0.18, h * 0.35, 24, 430, 15, "accent")
    elif style == "wrapper":
        for i in range(rotors):
            x = -w * 0.22 + i * w * 0.44 / max(1, rotors - 1)
            p.cyl(f"roller-{i}", x, 0, 70, h * 0.58, 95, "body", 10)
        p.box("film-mast", w * 0.4, 0, 0, 44, 44, h, "accent")
        p.box("film-roll", w * 0.4, 0, h * 0.64, 95, 180, 260, "body")
    elif style == "accumulator":
        for level in range(2):
            p.box(f"collection-deck-{level}", 0, -dep * 0.22 + level * dep * 0.42, 130 + level * 280, w * 0.82, dep * 0.38, 36, "body")
        for side in (-1, 1):
            p.box(f"guide-rail-{side}", side * w * 0.42, 0, h * 0.45, 42, dep * 0.86, h * 0.68, "accent")
        p.box("discharge-gate", 0, -dep * 0.45, h * 0.55, w * 0.7, 40, 240, "body")


def baler(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("baler-chassis", 0, 0, 160, w * 0.8, dep * 0.72, 120, "body")
    p.box("baler-chamber", 0, dep * 0.02, h * 0.58, w * 0.82, dep * 0.68, h * 0.58, "accent")
    p.box("pickup-housing", 0, -dep * 0.42, 100, w * 0.76, 170, 170, "body")
    for i in range(7):
        x = -w * 0.32 + i * w * 0.64 / 6
        p.cyl(f"pickup-tooth-{i}", x, -dep * 0.51, 35, 115, 13, "accent", 6)
    for side in (-1, 1):
        p.wheel(f"baler-wheel-{side}", 0, side * w * 0.46, 180, 92, 180, "#414848")
        p.box(f"side-access-panel-{side}", side * w * 0.42, 0, h * 0.58, 48, dep * 0.48, h * 0.36, "body")
    if style == "round":
        p.cyl("bale-chamber", 0, dep * 0.3, h * 0.72, 32, min(w, h) * 0.31, "body", 12)
    else:
        p.box("square-bale-chute", 0, dep * 0.48, h * 0.55, w * 0.48, dep * 0.56, h * 0.4, "body")
    p.box("drawbar", 0, -dep * 0.55, 150, 88, dep * 0.42, 60, "accent")


def wagon(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("wagon-chassis", 0, 0, 140, w * 0.8, dep * 0.9, 110, "body")
    p.box("wagon-floor", 0, 0, 250, w * 0.94, dep * 0.88, 38, "accent")
    for side in (-1, 1):
        p.box(f"wagon-side-{side}", side * w * 0.46, 0, 250, 54, dep * 0.86, h - 260, "body")
    p.box("wagon-front", 0, -dep * 0.42, 250, w * 0.9, 70, h - 250, "accent")
    p.box("wagon-rear", 0, dep * 0.42, 250, w * 0.9, 70, h - 250, "accent")
    for side in (-1, 1):
        p.wheel(f"wagon-wheel-{side}", 0, side * w * 0.52, 240, 130, 240, "#414848")
    p.box("drawbar", 0, -dep * 0.65, 110, 105, dep * 0.5, 72, "body")
    if style == "grain":
        p.box("grain-cover", 0, 0, h + 240, w * 0.8, dep * 0.75, 40, "accent")
        p.box("auger-base", w * 0.4, dep * 0.2, h * 0.64, 75, 100, h * 0.68, "accent")
        p.box("auger-tube", w * 0.63, dep * 0.2, h * 0.9, 360, 74, 70, "body")


def combine(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("combine-chassis", 0, 0, 360, w, dep * 0.78, 210, "body")
    p.box("engine-compartment", -w * 0.2, 0, h * 0.58, w * 0.58, dep * 0.75, h * 0.44, "accent")
    p.box("grain-body", -w * 0.17, dep * 0.06, h * 0.8, w * 0.56, dep * 0.71, h * 0.35, "body")
    for side in (-1, 1):
        p.wheel(f"drive-tire-{side}", -w * 0.28, side * dep * 0.43, 350, 125, 350, "#414848")
        p.wheel(f"steer-tire-{side}", w * 0.35, side * dep * 0.44, 220, 100, 220, "#414848")
    p.box("cab", w * 0.24, -dep * 0.12, h * 0.7, w * 0.3, dep * 0.46, h * 0.5, "accent")
    p.box("cab-roof", w * 0.24, -dep * 0.12, h * 0.96, w * 0.35, dep * 0.52, 55, "body")
    p.box("header-feeder", w * 0.54, 0, h * 0.28, w * 0.25, dep * 0.65, 190, "body")
    p.box("unloading-auger", -w * 0.07, dep * 0.54, h * 0.78, w * 0.83, 65, 65, "accent")
    p.box("auger-discharge", w * 0.33, dep * 0.54, h * 0.87, 120, 72, 145, "body")
    if style == "forage":
        p.box("crop-spout", w * 0.42, dep * 0.13, h * 1.02, 170, 220, h * 0.34, "accent")
        p.box("spout-cap", w * 0.42, dep * 0.13, h * 1.34, 390, 250, 36, "body")
    elif style == "cotton":
        for i in range(4):
            x = -w * 0.31 + i * w * 0.2
            p.box(f"picker-tower-{i}", x, dep * 0.2, h * 0.78, w * 0.14, dep * 0.36, h * 0.46, "accent")
            p.box(f"picker-door-{i}", x, -dep * 0.02, h * 0.76, w * 0.08, 22, h * 0.28, "body")


def header(p, d):
    w, dep, h, style, rows = d["w"], d["d"], d["h"], d["style"], d["rows"]
    p.box("header-floor", 0, 0, 70, w, dep * 0.62, 54, "body")
    p.box("cutterbar", 0, -dep * 0.38, 95, w * 0.97, 34, 56, "accent")
    for side in (-1, 1):
        p.box(f"end-divider-{side}", side * w * 0.48, -dep * 0.17, h * 0.44, 80, dep * 0.44, h * 0.66, "body")
    if style == "grain":
        p.box("reel-shaft", 0, dep * 0.15, h * 0.7, w * 0.94, 46, 46, "accent")
        for i in range(rows):
            x = -w * 0.43 + i * w * 0.86 / max(1, rows - 1)
            p.box(f"reel-spoke-{i}", x, dep * 0.15, h * 0.52, 22, 28, h * 0.48, "body")
            p.box(f"snout-{i}", x, -dep * 0.52, 50, w * 0.08, dep * 0.28, 75, "accent")
    else:
        for i in range(rows):
            x = -w * 0.43 + i * w * 0.86 / max(1, rows - 1)
            p.box(f"row-snout-{i}", x, -dep * 0.44, 45, w * 0.08, dep * 0.58, h * 0.35, "accent")
            p.box(f"gathering-chain-{i}", x, 0, 160, 28, dep * 0.5, 26, "body")
        p.box("cross-auger", 0, dep * 0.29, h * 0.3, w * 0.91, 60, 60, "body")


def harvester(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("harvester-chassis", 0, 0, 320, w * 0.72, dep * 0.74, 210, "body")
    p.box("storage-bunker", 0, dep * 0.05, h * 0.67, w * 0.62, dep * 0.68, h * 0.52, "accent")
    for side in (-1, 1):
        p.wheel(f"field-wheel-{side}", 0, side * dep * 0.44, 280, 130, 280, "#414848")
        p.box(f"elevator-side-{side}", side * w * 0.34, 0, h * 0.48, 72, dep * 0.62, h * 0.6, "body")
    p.box("digging-share", 0, -dep * 0.51, 45, w * 0.72, 200, 75, "body")
    for i in range(8):
        x = -w * 0.3 + i * w * 0.6 / 7
        p.cyl(f"separator-roller-{i}", x, -dep * 0.25, 90, 44, 58, "accent", 8)
    p.box("transfer-conveyor", 0, dep * 0.35, h * 0.55, w * 0.78, 220, 70, "body")
    if style == "beet":
        p.box("cleaning-web", 0, -dep * 0.02, h * 0.38, w * 0.6, dep * 0.35, 60, "accent")


def grain_auger(p, d):
    w, length, h = d["w"], d["d"], d["h"]
    p.box("support-base", 0, 0, 0, w * 1.2, w * 1.1, 55, "accent")
    p.box("intake-hopper", 0, -length * 0.4, 80, w * 0.85, 400, 360, "body")
    p.box("auger-lower-tube", 0, -length * 0.25, h * 0.17, 150, length * 0.5, 140, "accent")
    p.box("auger-upper-tube", 0, length * 0.16, h * 0.47, 135, length * 0.34, 125, "body")
    p.box("grain-discharge", 0, length * 0.37, h * 0.72, 220, 280, 230, "accent")
    for side in (-1, 1):
        p.wheel(f"transport-wheel-{side}", 0, side * w * 0.58, 140, 70, 140, "#414848")
    for i in range(4):
        z = 130 + i * h * 0.17
        p.box(f"support-leg-{i}", (-1) ** i * w * 0.3, -length * 0.15 + i * length * 0.1, z, 36, 38, h * 0.13, "body")
    if d.get("conveyor"):
        for i in range(8):
            y = -length * 0.25 + i * length * 0.52 / 7
            z = h * 0.2 + i * h * 0.46 / 7
            p.box(f"belt-roller-{i}", 0, y, z, w * 0.95, 36, 32, "accent")


def dryer(p, d):
    w, dep, h, style = d["w"], d["d"], d["h"], d["style"]
    if style == "fan":
        p.box("fan-base", 0, 0, 0, w, dep, 100, "accent")
        p.box("fan-housing", 0, 0, 100, w * 0.8, dep * 0.72, h * 0.56, "body")
        p.cyl("fan-inlet", 0, -dep * 0.3, h * 0.34, 55, w * 0.25, "accent", 12)
        p.box("motor", 0, dep * 0.25, h * 0.34, w * 0.3, dep * 0.34, h * 0.22, "body")
        for i in range(5):
            p.box(f"air-slot-{i}", 0, -dep * 0.38, 130 + i * 36, w * 0.44, 16, 10, "accent")
    else:
        p.box("dryer-base", 0, 0, 0, w * 1.25, dep * 1.25, 60, "accent")
        p.box("drying-column", 0, 0, 60, w, dep, h * 0.72, "body")
        p.box("inlet-hopper", 0, 0, h * 0.73, w * 1.12, dep * 1.12, 250, "accent")
        p.box("exhaust-cap", 0, 0, h * 0.93, w * 0.8, dep * 0.8, 100, "body")
        for side in (-1, 1):
            p.box(f"ladder-rail-{side}", side * w * 0.58, -dep * 0.58, 0, 28, 28, h * 0.86, "accent")
        for i in range(7):
            p.box(f"drying-vent-{i}", 0, -dep * 0.52, h * (0.2 + i * 0.08), w * 0.52, 16, 22, "accent")


def irrigation(p, d):
    w, dep, h, style, drops = d["w"], d["d"], d["h"], d["style"], d.get("drops", 1)
    if style == "pivot":
        p.box("water-main", 0, 0, h * 0.78, w, 55, 55, "accent")
        p.box("truss-upper-chord", 0, 0, h * 0.94, w, dep * 0.3, 28, "body")
        for side in (-1, 1):
            p.box(f"truss-lower-chord-{side}", 0, side * dep * 0.25, h * 0.7, w, 30, 30, "body")
        n = drops
        for i in range(n):
            x = -w * 0.42 + i * w * 0.84 / max(1, n - 1)
            p.box(f"truss-web-{i}", x, 0, h * 0.81, 28, dep * 0.48, h * 0.24, "accent")
            p.box(f"sprinkler-drop-{i}", x, 0, 80, 22, 22, h * 0.65, "body")
            p.cyl(f"sprinkler-head-{i}", x, 0, 55, 25, 36, "accent", 8)
        for side in (-1, 1):
            p.box(f"tower-leg-left-{side}", side * w * 0.35, -dep * 0.18, 0, 45, 45, h * 0.72, "body")
            p.box(f"tower-leg-right-{side}", side * w * 0.35, dep * 0.18, 0, 45, 45, h * 0.72, "body")
            p.wheel(f"tower-wheel-{side}", side * w * 0.35, 0, 72, 65, 72, "#414848")
    elif style == "cart":
        p.box("cart-frame", 0, 0, 90, w, dep * 0.75, 80, "body")
        for side in (-1, 1):
            p.wheel(f"cart-wheel-{side}", 0, side * dep * 0.42, 180, 88, 180, "#414848")
        p.box("hose-reel", 0, 0, h * 0.55, w * 0.68, 90, h * 0.54, "accent")
        p.cyl("sprinkler-mast", 0, dep * 0.36, 220, h * 0.68, 28, "body", 8)
        p.box("sprinkler-arm", 0, dep * 0.36, h * 0.89, 320, 25, 28, "accent")
    elif style == "filter":
        p.box("irrigation-skid", 0, 0, 0, w, dep, 42, "accent")
        for i in range(3):
            x = -w * 0.34 + i * w * 0.34
            p.cyl(f"filter-vessel-{i}", x, 0, 42, h * 0.74, 90, "body", 10)
            p.cyl(f"vessel-rim-{i}", x, 0, h * 0.72, 35, 105, "accent", 10)
        p.box("water-header", 0, dep * 0.4, h * 0.55, w * 0.86, 70, 70, "accent")
        for i in range(drops):
            p.cyl(f"valve-{i}", -w * 0.25 + i * w * 0.25, dep * 0.4, h * 0.58, 100, 18, "body")
    else:
        p.box("reel-frame", 0, 0, 0, w, dep, 70, "accent")
        p.box("reel-side-a", 0, -dep * 0.32, h * 0.52, w * 0.88, 80, h * 0.72, "body")
        p.box("reel-side-b", 0, dep * 0.32, h * 0.52, w * 0.88, 80, h * 0.72, "body")
        p.cyl("reel-drum", 0, 0, h * 0.18, h * 0.68, w * 0.32, "accent", 12)
        for side in (-1, 1):
            p.wheel(f"reel-wheel-{side}", 0, side * dep * 0.48, 120, 70, 120, "#414848")
        p.box("crank-handle", w * 0.51, 0, h * 0.5, 180, 40, 36, "accent")


def build(asset):
    _, _, _, recipe, d = asset
    p = Parts()
    if recipe == "tractor":
        tractor(p, d)
    elif recipe == "attachment":
        attachment(p, d)
    elif recipe == "field":
        field(p, d)
    elif recipe == "planter":
        planter(p, d)
    elif recipe == "spreader":
        spreader(p, d)
    elif recipe in ("sprayer", "self_sprayer"):
        sprayer(p, d)
    elif recipe == "mower":
        mower(p, d)
    elif recipe == "hay":
        hay(p, d)
    elif recipe == "baler":
        baler(p, d)
    elif recipe == "wagon":
        wagon(p, d)
    elif recipe == "combine":
        combine(p, d)
    elif recipe == "header":
        header(p, d)
    elif recipe == "harvester":
        harvester(p, d)
    elif recipe == "grain_auger":
        grain_auger(p, d)
    elif recipe == "dryer":
        dryer(p, d)
    elif recipe == "irrigation":
        irrigation(p, d)
    else:
        raise ValueError(f"unknown recipe: {recipe}")
    return p.lines


def source_for(asset):
    aid, title, description, recipe, _ = asset
    parts = build(asset)
    ground_offset = GROUND_OFFSETS_MM.get(aid, 0)
    category = "structure" if recipe in ("field", "irrigation") else "prop"
    lines = [
        "// SPDX-License-Identifier: CC0-1.0",
        f"// Original kernelCAD low-poly {title.lower()} scene prop, modeled from scratch.",
        "meta({",
        f"  name: {json.dumps(aid)},",
        "  license: 'CC0-1.0',",
        f"  title: {json.dumps(title)},",
        f"  description: {json.dumps(description + ' Knobs: overall scale, body color and accent color.')},",
        "  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],",
        "  kit: 'farm-machinery',",
        f"  category: '{category}',",
        "  origin: 'base',",
        "  compat: ['farm', 'field', 'agriculture', 'rural-scene'],",
        "  triangleBudget: 2200",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });",
        "const body = param('body', '#5d7f75', { label: 'Body color' });",
        "const accent = param('accent', '#c67b39', { label: 'Accent color' });",
        f"const p = assembly('{aid}');",
        f"const groundOffset = {n(ground_offset)};",
        "const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));",
        *parts,
        "",
        "return p.model();",
        "",
    ]
    return "\n".join(lines)


def write_readme():
    rows = [
        "# Farm Machinery kit",
        "",
        "Sixty original low-poly agricultural scene assets spanning tractors, loader attachments, soil preparation, planting, crop care, hay and forage, harvesting, grain handling and irrigation. Sources use millimetres, Z up and base origins at ground level. Each asset exposes `scale`, `body` and `accent` and declares a 2,200 triangle budget. They are stylized scene props, not equipment fit, safety or performance specifications.",
        "",
        "The [farm machinery wave demo bundle](../../../artifacts/catalog-demos/farm-machinery-wave-20261102/README.md) retains the source generator, video settings, audit evidence and inspected MP4. It demonstrates local catalog behavior; live deployment and hardware acceptance are separate states.",
        "",
        "| id | asset | description | knobs |",
        "| --- | --- | --- | --- |",
    ]
    for aid, title, description, _, _ in ASSETS:
        rows.append(f"| `{aid}` | {title} | {description} | scale · body · accent |")
    rows.extend([
        "",
        "## Use a catalog asset",
        "",
        "Search for equipment by name through the catalog, or open an asset directly in Studio with `?catalog=farm-machinery/<id>`. For example, `?catalog=farm-machinery/row-crop-tractor` opens the original source with its scale and palette controls.",
        "",
        "## Rebuild and verify",
        "",
        "```sh",
        "python3 -B artifacts/catalog-demos/farm-machinery-wave-20261102/generate_farm_machinery_assets.py",
        "npx tsx scripts/buildAssetCatalog.ts",
        "npx eslint catalog/",
        "npx vitest run tests/integration/catalog/",
        "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(asset[0] for asset in ASSETS),
        "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-farm-machinery-pages",
        "```",
        "",
        "## Licence and provenance",
        "",
        "All assets are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is original and built from kernelCAD primitives. No external meshes, textures or product images are included.",
        "",
    ])
    (KIT / "README.md").write_text("\n".join(rows), encoding="utf-8")


def main():
    if len(ASSETS) != 60 or len({asset[0] for asset in ASSETS}) != len(ASSETS):
        raise SystemExit("expected 60 assets with unique ids")
    KIT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        (KIT / f"{asset[0]}.kcad.ts").write_text(source_for(asset), encoding="utf-8")
    (KIT / "kit.json").write_text(
        '{\n  "title": "Farm Machinery",\n'
        '  "description": "Original low-poly agricultural tractors, field implements, crop-care equipment, harvest machinery and irrigation props with editable scale and palette controls."\n}\n',
        encoding="utf-8",
    )
    write_readme()
    print(f"wrote {len(ASSETS)} farm machinery assets to {KIT}")


if __name__ == "__main__":
    main()
