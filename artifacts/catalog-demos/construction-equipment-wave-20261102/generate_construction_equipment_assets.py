#!/usr/bin/env python3
"""Generate original low-poly construction equipment props for kernelCAD."""
from pathlib import Path
import json
import math
import re

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "construction-equipment"

# id, title, description, recipe, dimensions/options
ASSETS = [
    ("track-asphalt-paver", "Tracked asphalt paver", "Tracked paving machine with front material hopper, operator canopy, feeder deck and rear screed.", "paver", {"l": 1550, "w": 900, "h": 1000, "mobility": "track"}),
    ("wheel-asphalt-paver", "Wheeled asphalt paver", "Rubber-wheel paving machine with front hopper, raised operator station and adjustable rear screed.", "paver", {"l": 1450, "w": 900, "h": 920, "mobility": "wheel"}),
    ("asphalt-paver-screed", "Asphalt paver screed", "Wide finishing screed assembly with center beam, folding wings and adjustment links.", "screed", {"w": 1850, "d": 320, "h": 400}),
    ("asphalt-transfer-conveyor", "Road material transfer conveyor", "Mobile inclined conveyor with feed hopper, trussed belt frame and transport axle.", "conveyor", {"l": 1700, "w": 600, "h": 1450}),
    ("cold-planer-milling-machine", "Cold planer milling machine", "Road milling machine with enclosed cutter housing, operator canopy and crawler undercarriage.", "milling", {"l": 1380, "w": 950, "h": 1150, "mobility": "track"}),
    ("road-reclaimer", "Road reclaimer", "Road reclamation machine with high-clearance chassis, milling chamber and long operator deck.", "milling", {"l": 1650, "w": 1100, "h": 1450, "mobility": "wheel"}),
    ("tandem-vibratory-roller", "Tandem vibratory roller", "Compaction roller with front and rear steel drums, operator canopy and central chassis.", "roller", {"l": 1050, "w": 700, "h": 900, "drums": 2, "style": "tandem"}),
    ("single-drum-soil-compactor", "Single-drum soil compactor", "Soil compactor with broad front drum, rear traction tires and enclosed operator cab.", "roller", {"l": 1250, "w": 760, "h": 1100, "drums": 1, "style": "soil"}),
    ("pneumatic-tire-roller", "Pneumatic tire roller", "Road compactor with staggered banks of rubber tires and a raised operator station.", "roller", {"l": 1350, "w": 850, "h": 900, "drums": 0, "style": "pneumatic"}),
    ("trench-roller", "Remote trench roller", "Compact trench compactor with paired steel drums and a protected remote-control mast.", "roller", {"l": 680, "w": 520, "h": 650, "drums": 2, "style": "trench"}),
    ("motor-grader", "Motor grader", "Road grader with articulated chassis, six wheels, operator cab and center moldboard.", "grader", {"l": 1750, "w": 850, "h": 1050}),
    ("asphalt-distributor-truck", "Asphalt distributor truck", "Paving tanker truck with insulated tank, rear spray bar and multiple road nozzles.", "spray-truck", {"l": 1680, "w": 780, "h": 1200}),
    ("crawler-dozer", "Crawler dozer", "Tracked earthmoving dozer with broad front blade, engine cover and operator canopy.", "dozer", {"l": 1350, "w": 900, "h": 1000}),
    ("articulated-dump-truck", "Articulated dump truck", "Off-road articulated hauler with forward cab, rear dump body and six large tires.", "dump-truck", {"l": 1550, "w": 900, "h": 1250, "articulated": True}),
    ("rigid-haul-truck", "Rigid-frame haul truck", "Large site haul truck with high-capacity open bed, tall chassis and oversized tires.", "dump-truck", {"l": 1850, "w": 1050, "h": 1500, "rigid": True}),
    ("skid-steer-loader", "Skid-steer loader", "Compact four-wheel loader with protective operator cage, lift arms and front bucket.", "loader", {"l": 850, "w": 700, "h": 850, "mobility": "wheel", "style": "skid"}),
    ("backhoe-loader", "Backhoe loader", "Site loader with front bucket, rear digging boom, stabilizer legs and operator cab.", "backhoe", {"l": 1450, "w": 780, "h": 1200}),
    ("telescopic-handler", "Telescopic handler", "Rough-terrain handler with long extending boom, front carriage and four-wheel chassis.", "telehandler", {"l": 1380, "w": 780, "h": 1300}),
    ("rough-terrain-forklift", "Rough-terrain forklift", "Site forklift with wide tires, overhead guard, tall mast and long fork tines.", "forklift", {"l": 1120, "w": 760, "h": 1150}),
    ("water-tanker-truck", "Construction water tanker truck", "Site water truck with cylindrical tank, cab, hose reel and rear spray manifold.", "spray-truck", {"l": 1580, "w": 760, "h": 1180}),
    ("lowboy-equipment-trailer", "Lowboy equipment trailer", "Heavy equipment trailer with a dropped deck, twin axle groups and loading ramps.", "trailer", {"l": 1850, "w": 820, "h": 500, "style": "lowboy"}),
    ("transit-mixer-truck", "Transit concrete mixer truck", "Concrete mixer truck with rotating-looking drum, rear discharge chute and cab.", "mixer-truck", {"l": 1700, "w": 790, "h": 1300}),
    ("concrete-pump-truck", "Concrete pump truck", "Concrete placing truck with hopper, multi-section boom, outriggers and delivery hose.", "pump-truck", {"l": 1800, "w": 820, "h": 1550}),
    ("concrete-batch-plant", "Compact concrete batch plant", "Portable batch plant with aggregate bins, central mixer, cement silo and service ladder.", "batch-plant", {"l": 1600, "w": 1250, "h": 2050}),
    ("trailer-concrete-line-pump", "Trailer concrete line pump", "Towable concrete pump with hopper, motor enclosure, hose connections and road wheels.", "line-pump", {"l": 1050, "w": 700, "h": 900}),
    ("tracked-concrete-buggy", "Tracked concrete buggy", "Compact powered buggy with tracked undercarriage, skip hopper and operator handles.", "buggy", {"l": 850, "w": 620, "h": 750, "tracked": True}),
    ("ride-on-power-trowel", "Ride-on power trowel", "Concrete finishing machine with twin guarded rotor pans, seat and control console.", "trowel", {"l": 850, "w": 720, "h": 720, "ride": True}),
    ("walk-behind-power-trowel", "Walk-behind power trowel", "Concrete finishing tool with circular blade guard, engine block and long control handle.", "trowel", {"l": 560, "w": 560, "h": 520, "ride": False}),
    ("walk-behind-concrete-saw", "Walk-behind concrete saw", "Push saw with guarded cutting blade, compact motor and adjustable handlebar.", "concrete-saw", {"l": 620, "w": 500, "h": 640, "ride": False}),
    ("ride-on-concrete-saw", "Ride-on concrete saw", "Self-propelled slab saw with operator seat, blade guard and water tank.", "concrete-saw", {"l": 1050, "w": 700, "h": 820, "ride": True}),
    ("concrete-vibrator-needle", "Concrete vibrator and needle", "Portable concrete vibrator with motor case, flexible shaft and immersion head.", "vibrator", {"l": 850, "w": 280, "h": 420}),
    ("vibrating-concrete-screed", "Vibrating concrete screed", "Finishing beam with engine housing, end handles and a straight leveling blade.", "vibrating-screed", {"w": 1550, "d": 420, "h": 480}),
    ("concrete-placement-bucket", "Concrete placement bucket", "Crane-suspended concrete bucket with tapered hopper, discharge gate and lifting frame.", "concrete-bucket", {"w": 720, "d": 680, "h": 1050}),
    ("concrete-formwork-panel", "Concrete formwork panel", "Reusable wall-form panel with framed face, stiffeners and corner clamps.", "formwork", {"w": 900, "d": 180, "h": 1550, "style": "panel"}),
    ("adjustable-formwork-prop", "Adjustable formwork prop", "Telescoping floor support prop with top plate, screw collar and broad base plate.", "formwork", {"w": 180, "d": 180, "h": 1450, "style": "prop"}),
    ("modular-shoring-frame", "Modular shoring frame", "Stackable shoring frame with paired standards, cross braces and foot plates.", "formwork", {"w": 780, "d": 420, "h": 1250, "style": "shoring"}),
    ("concrete-form-tie", "Concrete form tie", "Reusable form tie assembly with threaded rod, bearing plates and wing nuts.", "form-tie", {"l": 600, "w": 140, "h": 160}),
    ("rebar-bending-machine", "Rebar bending machine", "Portable rebar bender with flat work table, rotary pin plate and control pedal.", "rebar-machine", {"w": 760, "d": 560, "h": 520, "style": "bend"}),
    ("rebar-cutting-machine", "Rebar cutting machine", "Jobsite bar cutter with reinforced base, cutting head, guard and foot control.", "rebar-machine", {"w": 720, "d": 520, "h": 620, "style": "cut"}),
    ("rebar-straightener-coil", "Rebar straightener and coil stand", "Portable rebar straightening unit with feed rollers, guide wheels and coil stand.", "rebar-machine", {"w": 1050, "d": 600, "h": 760, "style": "straighten"}),
    ("rebar-cage", "Reinforcing bar cage", "Short reinforcing cage assembled from longitudinal bars and repeating ties.", "rebar-cage", {"l": 1400, "w": 620, "h": 620}),
    ("slab-edge-form", "Slab edge form system", "Straight slab edge form with steel stakes, brackets and adjustable clamps.", "formwork", {"w": 1450, "d": 260, "h": 520, "style": "edge"}),
    ("concrete-column-form", "Concrete column form", "Square column shutter with corner walers, vertical stiffeners and base shoes.", "formwork", {"w": 560, "d": 560, "h": 1550, "style": "column"}),
    ("concrete-beam-form", "Concrete beam form", "Raised beam shutter with paired supports, side panels and bottom soffit.", "formwork", {"w": 1320, "d": 650, "h": 920, "style": "beam"}),
    ("portable-material-hoist", "Portable material hoist", "Compact construction hoist with mast, carriage platform, winch and stabilizing feet.", "hoist", {"w": 660, "d": 680, "h": 1850, "style": "portable"}),
    ("construction-personnel-elevator", "Construction personnel elevator", "Temporary mast elevator cage with guide rails, mesh walls and ground frame.", "hoist", {"w": 780, "d": 720, "h": 2100, "style": "elevator"}),
    ("mast-climbing-work-platform", "Mast-climbing work platform", "Twin-mast access platform with guardrails, deck and ground outriggers.", "hoist", {"w": 1650, "d": 580, "h": 1850, "style": "platform"}),
    ("drywall-panel-lift", "Drywall panel lift", "Foldable panel lift with telescoping mast, tilting cradle, tripod legs and casters.", "panel-lift", {"w": 800, "d": 720, "h": 1650, "style": "drywall"}),
    ("jobsite-tile-saw", "Jobsite tile saw", "Water-cooled tile saw on a folding stand with sliding table and blade guard.", "bench-tool", {"w": 950, "d": 650, "h": 880, "style": "tile"}),
    ("masonry-mixer", "Masonry mortar mixer", "Portable drum mixer with reinforced frame, tilting cradle and transport wheels.", "mixer", {"w": 820, "d": 740, "h": 930, "style": "masonry"}),
    ("portable-air-compressor", "Portable site air compressor", "Towable compressor enclosure with access panels, hose ports and single axle.", "site-plant", {"w": 1050, "d": 780, "h": 950, "style": "compressor"}),
    ("towable-light-tower", "Towable site light tower", "Mobile lighting mast with four floodlight heads, stabilizer legs and road trailer.", "site-plant", {"w": 1050, "d": 720, "h": 2050, "style": "light"}),
    ("portable-site-water-tank", "Portable site water tank", "Skid-mounted water tank with fill cap, outlet valve and protective frame.", "site-plant", {"w": 940, "d": 760, "h": 1250, "style": "tank"}),
    ("mobile-fuel-tank", "Mobile site fuel tank", "Bunded fuel pod on a towable chassis with hose reel, pump box and filler neck.", "site-plant", {"w": 1120, "d": 760, "h": 1080, "style": "fuel"}),
    ("pipe-roller-stand", "Pipe roller stand", "Adjustable pipe support stand with paired rollers, screw post and tripod feet.", "support-stand", {"w": 540, "d": 500, "h": 880, "style": "pipe"}),
    ("portable-core-drill-stand", "Portable core drill stand", "Anchored core-drilling rig with guide column, sliding carriage and base plate.", "drill-stand", {"w": 540, "d": 500, "h": 1280}),
    ("portable-floor-grinder", "Portable floor grinder", "Concrete surface grinder with circular shroud, handlebar and motor enclosure.", "floor-tool", {"w": 660, "d": 600, "h": 740, "style": "grinder"}),
    ("walk-behind-floor-scarifier", "Walk-behind floor scarifier", "Surface-preparation machine with guarded drum, wheeled frame and push handle.", "floor-tool", {"w": 700, "d": 620, "h": 780, "style": "scarifier"}),
    ("laser-level-tripod", "Laser level and tripod", "Survey tripod with compact rotating laser head and control panel.", "survey", {"w": 480, "d": 480, "h": 1380, "style": "laser"}),
    ("grade-rod-and-prism-pole", "Grade rod and prism pole", "Survey rod assembly with graduated segments, target prism and clamp mount.", "survey", {"w": 240, "d": 220, "h": 1750, "style": "rod"}),
]


def f(value):
    return f"{value:.3f}".rstrip("0").rstrip(".")


class Parts:
    def __init__(self):
        self.lines = []

    def add(self, name, expression, color="body"):
        name = re.sub(r"[^A-Za-z0-9_-]+", "-", str(name)).strip("-")
        color_expr = json.dumps(color) if color.startswith("#") else color
        self.lines.append(f"add('{name}', {expression}, {color_expr});")

    def box(self, name, x, y, z, w, d, h, color="body"):
        if min(w, d, h) > 0:
            self.add(name, f"box({f(w)}, {f(d)}, {f(h)}, true).translate({f(x)}, {f(y)}, {f(z + h / 2)})", color)

    def cyl(self, name, x, y, z, h, r, color="body", segments=8):
        if h > 0 and r > 0:
            self.add(name, f"cylinder({f(h)}, {f(r)}, {segments}).translate({f(x)}, {f(y)}, {f(z)})", color)

    def cyl_rotated(self, name, x, y, z, h, r, axis, angle, color="body", segments=8):
        if h > 0 and r > 0:
            vector = ", ".join(str(component) for component in axis)
            expression = f"cylinder({f(h)}, {f(r)}, {segments}).rotate([{vector}], {angle}).translate({f(x)}, {f(y)}, {f(z)})"
            self.add(name, expression, color)

    def wheel(self, name, x, y, z, width, radius, color="#40474b"):
        expr = f"cylinder({f(width)}, {f(radius)}, 12).rotate([1, 0, 0], 90).translate({f(x)}, {f(y + width / 2)}, {f(z)})"
        self.add(name, expr, color)
        # Shallow hubs on both outer faces of the axle.
        for side in (-1, 1):
            hub = f"cylinder({f(width * 0.16)}, {f(radius * 0.38)}, 10).rotate([1, 0, 0], 90).translate({f(x)}, {f(y + side * (width / 2 + width * 0.08))}, {f(z)})"
            self.add(name + f"-hub-{side}", hub, "accent")

    def track(self, name, x, y, z, length, width, height, rollers=5):
        self.box(name + "-belt", x, y, z, length, width, height, "body")
        for i in range(rollers):
            xx = x - length * 0.36 + i * length * 0.72 / max(1, rollers - 1)
            self.wheel(name + f"-roller-{i}", xx, y, z + height * 0.46, width * 0.92, height * 0.44, "#40474b")
        self.wheel(name + "-idler-front", x + length * 0.41, y, z + height * 0.48, width * 0.94, height * 0.47, "#40474b")
        self.wheel(name + "-idler-rear", x - length * 0.41, y, z + height * 0.48, width * 0.94, height * 0.47, "#40474b")


def add_pair_wheels(p, name, x_positions, width, radius, track_width, y_center=0, z_offset=0):
    for i, x in enumerate(x_positions):
        for side in (-1, 1):
            p.wheel(f"{name}-{i}-{side}", x, y_center + side * track_width * 0.37, radius + z_offset, width, radius)


def truck_base(p, d, name="truck", bed=False):
    l, w, h = d["l"], d["w"], d["h"]
    p.box(name + "-chassis", 0, 0, 140, l * 0.82, w * 0.46, 150, "body")
    axle_x = [-l * 0.3, l * 0.28]
    if d.get("rigid"):
        axle_x = [-l * 0.32, l * 0.18, l * 0.34]
    for i, x in enumerate(axle_x):
        radius = 160 if i else 145
        for side in (-1, 1):
            p.wheel(f"{name}-wheel-{i}-{side}", x, side * w * 0.36, radius, 110, radius)
    cab_x = l * 0.28
    p.box(name + "-cab", cab_x, 0, 290, l * 0.25, w * 0.4, h * 0.42, "accent")
    p.box(name + "-cab-window", cab_x + l * 0.03, -w * 0.02, 300 + h * 0.27, l * 0.16, w * 0.42, h * 0.1, "body")
    p.box(name + "-roof", cab_x, 0, 290 + h * 0.42, l * 0.27, w * 0.43, 45, "body")
    if bed:
        p.box(name + "-bed-floor", -l * 0.18, 0, 330, l * 0.47, w * 0.63, h * 0.38, "accent")
        for side in (-1, 1):
            p.box(name + f"-bed-side-{side}", -l * 0.18, side * w * 0.28, 330, l * 0.48, w * 0.055, h * 0.56, "body")
        p.box(name + "-tailgate", -l * 0.43, 0, 330, 38, w * 0.65, h * 0.55, "accent")


def paver(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    if d["mobility"] == "track":
        for side in (-1, 1):
            p.track(f"crawler-{side}", -l * 0.02, side * w * 0.35, 0, l * 0.72, w * 0.22, 210, 4)
    else:
        add_pair_wheels(p, "paver-wheel", [-l * 0.28, l * 0.27], 85, 145, w * 0.82)
    p.box("main-deck", 0, 0, 220, l * 0.72, w * 0.58, 230, "body")
    p.box("material-hopper", l * 0.34, 0, 300, l * 0.24, w * 0.72, 360, "accent")
    p.box("hopper-wing-left", l * 0.34, -w * 0.34, 310, l * 0.2, w * 0.08, 340, "body")
    p.box("hopper-wing-right", l * 0.34, w * 0.34, 310, l * 0.2, w * 0.08, 340, "body")
    p.box("operator-platform", -l * 0.13, 0, 450, l * 0.25, w * 0.42, 50, "accent")
    p.box("canopy-posts", -l * 0.12, 0, 500, 32, w * 0.35, h * 0.32, "body")
    p.box("canopy-roof", -l * 0.12, 0, 500 + h * 0.32, l * 0.42, w * 0.55, 50, "accent")
    p.box("feeder-deck", -l * 0.37, 0, 150, l * 0.34, w * 0.42, 85, "body")
    p.box("screed-main", -l * 0.48, 0, 65, 68, w * 0.92, 120, "accent")
    for side in (-1, 1):
        p.box(f"screed-wing-{side}", -l * 0.48, side * w * 0.52, 80, 70, w * 0.18, 95, "body")
        p.box(f"screed-arm-{side}", -l * 0.32, side * w * 0.34, 180, l * 0.27, 35, 38, "accent")
    p.cyl("feed-auger", -l * 0.27, 0, 180, w * 0.62, 48, "body", 10)


def roller(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    style = d["style"]
    p.box("roller-frame", l * 0.06, 0, 230, l * 0.68, w * 0.5, 180, "body")
    if style in ("tandem", "trench"):
        radius = 180 if style == "tandem" else 110
        width = w * 0.76
        p.wheel("front-drum", l * 0.34, 0, radius, width, radius, "#657078")
        p.wheel("rear-drum", -l * 0.32, 0, radius, width, radius, "#657078")
    elif style == "soil":
        p.wheel("front-drum", l * 0.34, 0, 240, w * 0.78, 240, "#657078")
        for side in (-1, 1):
            p.wheel(f"rear-tire-{side}", -l * 0.32, side * w * 0.18, 155, 100, 155)
    else:
        for axle, x in enumerate([-l * 0.35, -l * 0.12, l * 0.12, l * 0.35]):
            for side in (-1, 1):
                p.wheel(f"pneumatic-tire-{axle}-{side}", x, side * w * 0.35, 165, 90, 165)
    p.box("engine-cover", l * 0.16, 0, 410, l * 0.28, w * 0.45, 250, "accent")
    if style != "trench":
        p.box("operator-platform", -l * 0.14, 0, 420, l * 0.25, w * 0.38, 50, "body")
        p.box("canopy-posts", -l * 0.17, 0, 470, 28, w * 0.32, h * 0.28, "accent")
        p.box("canopy-roof", -l * 0.17, 0, 470 + h * 0.28, l * 0.35, w * 0.44, 42, "body")
    else:
        p.box("remote-control-mast", 0, 0, 410, 32, 35, 190, "accent")


def dump_truck(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    truck_base(p, d, "hauler")
    p.box("dump-body-floor", -l * 0.17, 0, 300, l * 0.48, w * 0.64, h * 0.42, "accent")
    for side in (-1, 1):
        p.box(f"dump-body-side-{side}", -l * 0.17, side * w * 0.28, 300, l * 0.5, w * 0.08, h * 0.56, "body")
    p.box("dump-body-front", l * 0.08, 0, 300, 46, w * 0.66, h * 0.54, "body")
    p.box("tailgate", -l * 0.42, 0, 300, 42, w * 0.67, h * 0.5, "accent")
    p.box("lift-ram", -l * 0.03, 0, 280, 90, 75, h * 0.45, "body")
    if d.get("articulated"):
        p.box("articulation-joint", l * 0.06, 0, 260, 140, w * 0.3, 130, "accent")


def loader(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    if d["mobility"] == "track":
        for side in (-1, 1):
            p.track(f"track-{side}", -l * 0.02, side * w * 0.34, 0, l * 0.74, w * 0.24, 220, 4)
    else:
        add_pair_wheels(p, "loader-wheel", [-l * 0.28, l * 0.28], 94, 185, w * 0.84)
    p.box("loader-chassis", 0, 0, 220, l * 0.7, w * 0.55, 210, "body")
    p.box("operator-cab", -l * 0.11, 0, 430, l * 0.28, w * 0.43, h * 0.42, "accent")
    p.box("cab-window", -l * 0.11, -w * 0.225, 470, l * 0.19, 22, h * 0.25, "body")
    for side in (-1, 1):
        p.box(f"lift-arm-{side}", l * 0.25, side * w * 0.33, 420, l * 0.48, 70, 80, "accent")
        p.cyl(f"lift-pivot-{side}", l * 0.32, side * w * 0.37, 460, 78, 55, "body", 8)
    p.box("bucket-back", l * 0.57, 0, 150, 90, w * 0.72, 230, "body")
    p.box("bucket-floor", l * 0.63, 0, 80, l * 0.2, w * 0.75, 48, "accent")
    p.box("bucket-cutting-edge", l * 0.74, 0, 70, 50, w * 0.82, 45, "body")


def backhoe(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    add_pair_wheels(p, "backhoe-wheel", [-l * 0.31, l * 0.29], 105, 195, w * 0.82)
    p.box("chassis", 0, 0, 240, l * 0.72, w * 0.53, 170, "body")
    p.box("front-loader-arm", l * 0.38, -w * 0.31, 420, l * 0.34, 54, 70, "accent")
    p.box("front-loader-arm-right", l * 0.38, w * 0.31, 420, l * 0.34, 54, 70, "accent")
    p.box("front-bucket", l * 0.63, 0, 190, 120, w * 0.78, 220, "body")
    p.box("cab", 0, 0, 410, l * 0.27, w * 0.44, h * 0.42, "accent")
    p.box("cab-roof", 0, 0, 410 + h * 0.42, l * 0.31, w * 0.48, 44, "body")
    for side in (-1, 1):
        p.box(f"stabilizer-{side}", -l * 0.38, side * w * 0.37, 0, 48, 55, 300, "accent")
        p.box(f"stabilizer-foot-{side}", -l * 0.38, side * w * 0.37, 0, 150, 120, 35, "body")
    p.box("rear-boom", -l * 0.43, 0, 620, l * 0.28, 90, 95, "accent")
    p.box("dipper", -l * 0.55, 0, 390, 65, 75, 410, "body")
    p.box("digging-bucket", -l * 0.66, 0, 120, 150, 190, 145, "accent")


def telehandler(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    add_pair_wheels(p, "handler-wheel", [-l * 0.31, l * 0.31], 110, 190, w * 0.86)
    p.box("chassis", 0, 0, 240, l * 0.72, w * 0.56, 190, "body")
    p.box("cab", l * 0.2, -w * 0.18, 430, l * 0.24, w * 0.39, h * 0.4, "accent")
    p.box("cab-glazing", l * 0.2, -w * 0.39, 460, l * 0.18, 20, h * 0.26, "body")
    p.box("telescopic-boom", -l * 0.08, 0, 470, l * 0.7, 100, 120, "accent")
    p.box("inner-boom", -l * 0.39, 0, 535, l * 0.38, 75, 68, "body")
    p.box("boom-carriage", -l * 0.62, 0, 470, 100, w * 0.36, 180, "accent")
    p.box("fork-tine-left", -l * 0.76, -w * 0.18, 110, 270, 38, 42, "body")
    p.box("fork-tine-right", -l * 0.76, w * 0.18, 110, 270, 38, 42, "body")


def forklift(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    add_pair_wheels(p, "forklift-wheel", [-l * 0.29, l * 0.27], 95, 170, w * 0.8)
    p.box("forklift-frame", 0, 0, 230, l * 0.65, w * 0.55, 190, "body")
    p.box("operator-cab", -l * 0.1, 0, 420, l * 0.27, w * 0.42, h * 0.32, "accent")
    p.box("overhead-guard", -l * 0.1, 0, 420 + h * 0.32, l * 0.36, w * 0.5, 36, "body")
    p.box("mast-inner", l * 0.38, 0, 150, 75, w * 0.47, h * 0.62, "accent")
    p.box("mast-outer-left", l * 0.38, -w * 0.22, 130, 58, 38, h * 0.72, "body")
    p.box("mast-outer-right", l * 0.38, w * 0.22, 130, 58, 38, h * 0.72, "body")
    p.box("fork-carriage", l * 0.43, 0, 230, 70, w * 0.62, 150, "accent")
    for side in (-1, 1):
        p.box(f"fork-tine-{side}", l * 0.58, side * w * 0.2, 80, 340, 40, 46, "body")


def grader(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    add_pair_wheels(p, "grader-wheel", [-l * 0.34, -l * 0.2, l * 0.34], 96, 175, w * 0.82)
    p.box("rear-frame", -l * 0.16, 0, 280, l * 0.48, w * 0.48, 170, "body")
    p.box("engine-hood", -l * 0.28, 0, 450, l * 0.3, w * 0.44, 300, "accent")
    p.box("operator-cab", l * 0.12, 0, 460, l * 0.22, w * 0.4, h * 0.38, "body")
    p.box("cab-roof", l * 0.12, 0, 460 + h * 0.38, l * 0.27, w * 0.45, 45, "accent")
    p.box("grader-front-frame", l * 0.4, 0, 230, l * 0.43, 120, 100, "body")
    p.box("moldboard", l * 0.05, 0, 180, l * 0.24, w * 0.9, 75, "accent")
    p.cyl("circle-drive", 0, 0, 165, 75, 130, "body", 10)


def spray_truck(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    truck_base(p, d, "site-truck")
    if l >= 1500:
        tank_length = l * 0.43
        tank_x = -l * 0.16
        p.cyl_rotated("tank", tank_x - tank_length / 2, 0, 500, tank_length, w * 0.27, [0, 1, 0], 90, "accent", 12)
        p.box("tank-saddle-a", tank_x - tank_length * 0.1, 0, 290, 70, w * 0.62, 70, "body")
        p.box("tank-saddle-b", tank_x + tank_length * 0.1, 0, 290, 70, w * 0.62, 70, "body")
    else:
        p.box("utility-tank", -l * 0.17, 0, 340, l * 0.45, w * 0.62, h * 0.4, "accent")
    p.box("spray-bar", -l * 0.48, 0, 110, 60, w * 1.45, 45, "body")
    for i in range(9):
        y = -w * 0.65 + i * w * 1.3 / 8
        p.cyl(f"spray-nozzle-{i}", -l * 0.48, y, 72, 28, 12, "accent", 6)
    p.box("hose-reel", -l * 0.05, w * 0.31, 510, 170, 150, 180, "body")


def service_truck(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    truck_base(p, d, "service")
    p.box("service-body", -l * 0.17, 0, 300, l * 0.42, w * 0.62, h * 0.5, "accent")
    for i in range(3):
        p.box(f"locker-door-{i}", -l * 0.17, -w * 0.32, 360 + i * h * 0.12, l * 0.12, 24, h * 0.09, "body")
    p.cyl("work-light-mast", -l * 0.11, w * 0.28, h * 0.78, h * 0.38, 28, "body", 8)
    p.box("work-light-head", -l * 0.11, w * 0.28, h * 1.1, 160, 100, 55, "accent")


def trailer(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    p.box("trailer-deck", -l * 0.08, 0, 240 if d["style"] == "dump" else 100, l * 0.7, w * 0.78, 100, "body")
    axle_positions = [-l * 0.26, -l * 0.05] if d["style"] == "lowboy" else [-l * 0.25, -l * 0.13]
    for i, x in enumerate(axle_positions):
        for side in (-1, 1):
            p.wheel(f"trailer-wheel-{i}-{side}", x, side * w * 0.42, 150, 86, 150)
    p.box("drawbar", l * 0.38, 0, 130, l * 0.28, 90, 75, "accent")
    if d["style"] == "dump":
        p.box("tipper-floor", -l * 0.08, 0, 340, l * 0.7, w * 0.7, h * 0.4, "accent")
        for side in (-1, 1):
            p.box(f"tipper-side-{side}", -l * 0.08, side * w * 0.32, 340, l * 0.72, 38, h * 0.62, "body")
        p.box("tailgate", -l * 0.43, 0, 340, 40, w * 0.7, h * 0.6, "accent")
    else:
        for side in (-1, 1):
            p.box(f"loading-ramp-{side}", -l * 0.42, side * w * 0.31, 0, l * 0.2, 55, 290, "accent")


def mixer_truck(p, d):
    truck_base(p, d, "mixer")
    l, w = d["l"], d["w"]
    # Horizontal drum on the chassis, expressed as a faceted cylinder along X.
    p.add("mixing-drum", f"cylinder({f(l * 0.4)}, {f(w * 0.29)}, 12).rotate([0, 1, 0], 90).translate({f(-l * 0.2)}, 0, 410)", "accent")
    p.cyl("drum-neck", -l * 0.42, 0, 400, 105, 80, "body", 10)
    p.box("rear-chute-support", -l * 0.4, 0, 250, 85, 90, 360, "body")
    for i in range(3):
        p.box(f"discharge-chute-{i}", -l * 0.48 - i * 70, 0, 210 - i * 35, 120, 88, 38, "accent")


def pump_truck(p, d):
    truck_base(p, d, "pump")
    l, w, h = d["l"], d["w"], d["h"]
    p.box("pump-hopper", -l * 0.25, 0, 280, l * 0.18, w * 0.46, 300, "accent")
    for side in (-1, 1):
        p.box(f"outrigger-beam-{side}", -l * 0.13, side * w * 0.29, 140, 150, w * 0.82, 60, "body")
        p.box(f"outrigger-column-{side}", -l * 0.13, side * w * 0.56, 35, 75, 75, 145, "body")
        p.box(f"outrigger-foot-{side}", -l * 0.13, side * w * 0.56, 0, 160, 150, 35, "accent")
    p.box("boom-base", -l * 0.09, 0, 290, 130, 125, 420, "body")
    p.add("boom-section-a", f"box({f(l * 0.36)}, 88, 92, true).rotate([0, 1, 0], 35).translate({f(-l * 0.23)}, 0, 850)", "accent")
    p.add("boom-section-b", f"box({f(l * 0.28)}, 76, 78, true).rotate([0, 1, 0], 35).translate({f(-l * 0.51)}, 0, 1180)", "body")
    p.box("delivery-hose", -l * 0.62, 0, 0, 48, 48, 1350, "accent")


def batch_plant(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    for i in range(3):
        x = -l * 0.34 + i * l * 0.34
        p.box(f"aggregate-bin-{i}", x, -w * 0.3, 0, l * 0.22, w * 0.32, h * 0.38, "body")
        p.box(f"bin-top-rim-{i}", x, -w * 0.3, h * 0.38, l * 0.23, w * 0.34, 42, "accent")
    p.box("batch-frame", 0, 0, h * 0.38, l * 0.3, w * 0.26, h * 0.12, "accent")
    p.cyl("mixer-drum", 0, 0, h * 0.52, 55, l * 0.12, "body", 12)
    p.box("cement-silo", l * 0.31, w * 0.28, 0, l * 0.18, w * 0.2, h * 0.76, "accent")
    p.cyl("silo-roof", l * 0.31, w * 0.28, h * 0.76, 55, l * 0.12, "body", 10)
    for side in (-1, 1):
        p.box(f"silo-leg-{side}", l * 0.31, w * 0.28 + side * w * 0.08, 0, 38, 38, h * 0.62, "body")
    p.box("service-platform", 0, w * 0.39, h * 0.43, l * 0.24, 45, h * 0.08, "accent")


def line_pump(p, d):
    trailer(p, {**d, "style": "lowboy"})
    l, w, h = d["l"], d["w"], d["h"]
    p.box("pump-enclosure", 0, 0, 310, l * 0.4, w * 0.58, h * 0.46, "body")
    p.box("hopper", l * 0.12, 0, 580, l * 0.22, w * 0.6, 210, "accent")
    p.cyl("hose-connection", l * 0.25, 0, 420, w * 0.52, 42, "accent", 8)
    p.box("control-panel", -l * 0.16, -w * 0.3, 400, 170, 35, 150, "accent")


def buggy(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    if d.get("tracked"):
        for side in (-1, 1):
            p.track(f"buggy-track-{side}", -l * 0.04, side * w * 0.3, 0, l * 0.74, w * 0.32, 155, 3)
    else:
        add_pair_wheels(p, "buggy-wheel", [-l * 0.25, l * 0.25], 80, 135, w * 0.78)
    p.box("buggy-frame", 0, 0, 170, l * 0.72, w * 0.58, 110, "body")
    p.box("skip-floor", 0, 0, 280, l * 0.52, w * 0.6, 70, "accent")
    for side in (-1, 1):
        p.box(f"skip-side-{side}", 0, side * w * 0.25, 310, l * 0.52, 45, h * 0.38, "body")
    p.box("operator-handle", -l * 0.48, 0, 270, 55, 60, 340, "accent")


def trowel(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    if d.get("ride"):
        p.box("operator-platform", 0, 0, 160, l * 0.8, w * 0.7, 85, "body")
        for side in (-1, 1):
            p.cyl(f"rotor-guard-{side}", side * l * 0.28, 0, 0, 72, 230, "accent", 12)
        p.box("seat-post", -l * 0.08, 0, 245, 58, 58, 230, "accent")
        p.box("seat", -l * 0.08, 0, 475, 180, 160, 70, "body")
        p.box("control-console", l * 0.2, 0, 275, 200, 180, 125, "accent")
    else:
        p.cyl("trowel-guard", 0, 0, 0, 72, w * 0.45, "body", 12)
        p.cyl("engine", 0, 0, 135, 290, 125, "accent", 10)
        p.box("handle-post", -l * 0.24, 0, 280, 55, 58, 220, "body")
        p.box("control-handle", -l * 0.38, 0, 475, 260, 55, 42, "accent")
        p.box("blade-guard", 0, 0, 0, w * 0.84, w * 0.84, 44, "body")


def concrete_saw(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    add_pair_wheels(p, "saw-wheel", [-l * 0.26, l * 0.27], 64, 100, w * 0.82)
    p.box("saw-frame", 0, 0, 180, l * 0.72, w * 0.6, 100, "body")
    p.box("engine-cover", l * 0.12, 0, 280, l * 0.32, w * 0.48, h * 0.34, "accent")
    p.cyl("blade", l * 0.34, 0, 95, 42, h * 0.25, "body", 12)
    p.box("blade-guard", l * 0.34, 0, 100, 100, w * 0.52, h * 0.3, "accent")
    if d.get("ride"):
        p.box("operator-seat", -l * 0.2, 0, 290, 180, 170, 90, "accent")
        p.box("water-tank", -l * 0.12, 0, 370, 190, w * 0.36, 130, "body")
    else:
        p.box("push-handle", -l * 0.34, 0, 280, 55, 60, h * 0.42, "accent")


def vibrator(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    p.box("motor-base", 0, 0, 0, l * 0.42, w * 0.62, 85, "body")
    p.box("motor-case", 0, 0, 85, l * 0.36, w * 0.55, h * 0.45, "accent")
    p.cyl_rotated("motor-shaft", -l * 0.18, 0, 155, l * 0.36, 48, [0, 1, 0], 90, "body", 8)
    p.box("flexible-shaft", l * 0.32, 0, h * 0.3, l * 0.34, 28, 28, "accent")
    p.cyl_rotated("vibrator-head", l * 0.49, 0, h * 0.3, 190, 42, [0, 1, 0], 90, "body", 8)


def vibrating_screed(p, d):
    w, depth, h = d["w"], d["d"], d["h"]
    p.box("screed-beam", 0, 0, 0, 70, w, 110, "body")
    p.box("vibrator-housing", 0, 0, 110, 190, 210, 150, "accent")
    p.box("handle-left", -depth * 0.4, -w * 0.36, 205, depth * 0.72, 38, 38, "accent")
    p.box("handle-right", -depth * 0.4, w * 0.36, 205, depth * 0.72, 38, 38, "accent")
    p.cyl("eccentric-weight", 0, 0, 310, 80, 58, "body", 8)


def concrete_bucket(p, d):
    w, depth, h = d["w"], d["d"], d["h"]
    p.box("bucket-floor", 0, 0, 0, w * 0.7, depth * 0.7, 75, "body")
    for side in (-1, 1):
        p.box(f"hopper-side-{side}", side * w * 0.3, 0, 75, 48, depth * 0.72, h * 0.58, "accent")
        p.box(f"lifting-ear-{side}", side * w * 0.28, 0, h * 0.55, 52, 70, h * 0.4, "body")
    p.box("hopper-front", 0, -depth * 0.3, 75, w * 0.62, 48, h * 0.5, "body")
    p.box("discharge-gate", 0, -depth * 0.35, 0, w * 0.44, 55, 190, "accent")
    p.box("lifting-crossbar", 0, 0, h * 0.9, w * 0.78, 45, 45, "accent")


def formwork(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    if style == "panel":
        p.box("form-face", 0, 0, 0, w, depth * 0.25, h, "body")
        for side in (-1, 1):
            p.box(f"vertical-strongback-{side}", side * w * 0.44, depth * 0.42, 0, 45, depth * 0.34, h, "accent")
        for i in range(4):
            p.box(f"horizontal-waler-{i}", 0, depth * 0.42, i * h * 0.26, w * 1.08, 42, 45, "body")
    elif style == "prop":
        p.box("base-plate", 0, 0, 0, w * 1.8, d["d"] * 1.8, 35, "body")
        p.cyl("outer-tube", 0, 0, 35, h * 0.63, 64, "accent", 10)
        p.cyl("inner-tube", 0, 0, h * 0.63, h * 0.31, 45, "body", 10)
        p.box("adjustment-collar", 0, 0, h * 0.6, 160, 150, 52, "accent")
        p.box("head-plate", 0, 0, h * 0.94, w * 1.7, d["d"] * 1.7, 38, "body")
    elif style == "shoring":
        for xside in (-1, 1):
            for yside in (-1, 1):
                p.cyl(f"standard-{xside}-{yside}", xside * w * 0.38, yside * depth * 0.36, 0, h, 48, "body", 8)
        for level in range(4):
            z = level * h * 0.27 + 60
            p.box(f"crossbar-front-{level}", 0, -depth * 0.37, z, w * 0.82, 32, 32, "accent")
            p.box(f"crossbar-side-{level}", -w * 0.38, 0, z, 32, depth * 0.76, 32, "accent")
        p.box("head-plate", 0, 0, h - 55, w * 1.04, depth * 0.94, 55, "body")
    elif style == "edge":
        p.box("edge-board", 0, 0, 90, w, depth * 0.2, h * 0.56, "body")
        for i in range(5):
            x = -w * 0.44 + i * w * 0.22
            p.box(f"stake-{i}", x, 0, 0, 32, depth * 0.6, h, "accent")
            p.box(f"clamp-{i}", x, 0, h * 0.58, 68, depth * 0.62, 40, "body")
    elif style == "column":
        p.box("column-face", 0, 0, 0, w * 0.78, depth * 0.78, h, "body")
        for side in (-1, 1):
            p.box(f"column-waler-x-{side}", side * w * 0.46, 0, 0, 42, depth * 1.05, h * 1.02, "accent")
            p.box(f"column-waler-y-{side}", 0, side * depth * 0.46, 0, w * 1.05, 42, h * 1.02, "accent")
        for i in range(4):
            p.box(f"column-clamp-{i}", 0, 0, i * h * 0.25, w * 1.18, depth * 1.18, 38, "body")
    elif style == "beam":
        p.box("soffit", 0, 0, h * 0.42, w, depth * 0.55, 80, "body")
        for side in (-1, 1):
            p.box(f"beam-side-{side}", 0, side * depth * 0.3, h * 0.56, w, 45, h * 0.56, "accent")
            for x in (-w * 0.35, w * 0.35):
                p.box(f"support-leg-{side}-{x}", x, side * depth * 0.3, 0, 44, 44, h * 0.48, "body")
                p.box(f"support-foot-{side}-{x}", x, side * depth * 0.3, 0, 150, 120, 36, "accent")
    else:
        p.box("reinforcement-tie", 0, 0, h * 0.45, w * 0.92, depth * 0.4, 60, "body")


def form_tie(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    p.cyl_rotated("tie-rod", -l / 2, 0, 18, l, 18, [0, 1, 0], 90, "body", 8)
    for side in (-1, 1):
        p.box(f"bearing-plate-{side}", side * l * 0.32, 0, 0, 38, w, 55, "accent")
        p.cyl_rotated(f"wing-nut-{side}", side * l * 0.32 - 60, 0, 36, 60, 36, [0, 1, 0], 90, "body", 8)


def rebar_machine(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("machine-base", 0, 0, 0, w * 0.8, depth * 0.76, 110, "body")
    p.box("work-table", 0, 0, 110, w, depth * 0.78, 80, "accent")
    p.box("motor-case", -w * 0.22, 0, 190, w * 0.25, depth * 0.48, h * 0.34, "body")
    if style == "bend":
        p.cyl("bending-disc", w * 0.24, 0, 190, 72, depth * 0.24, "accent", 10)
        for i in range(5):
            p.cyl(f"bend-pin-{i}", w * 0.1 + i * w * 0.07, 0, 260, 48, 18, "body", 8)
    elif style == "cut":
        p.box("cutting-head", w * 0.3, 0, 230, 180, depth * 0.55, h * 0.48, "accent")
        p.box("blade-guard", w * 0.3, -depth * 0.3, h * 0.38, 120, 24, 100, "body")
    else:
        for i in range(4):
            x = -w * 0.18 + i * w * 0.12
            p.cyl_rotated(f"feed-roller-{i}", x, depth * 0.28, h * 0.55, depth * 0.56, 48, [1, 0, 0], 90, "accent", 8)
        p.cyl_rotated("coil-hub", -w * 0.42, depth * 0.26, h * 0.5, depth * 0.52, 140, [1, 0, 0], 90, "body", 10)
        p.box("coil-support", -w * 0.42, 0, 0, 45, depth * 0.62, h * 0.5, "accent")


def rebar_cage(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    p.box("assembly-skid", 0, 0, 0, l * 0.9, w * 0.9, 35, "body")
    for side in (-1, 1):
        p.box(f"support-saddle-{side}", 0, side * w * 0.38, 35, l * 0.84, 35, h * 0.18, "accent")
    for side in (-1, 1):
        for i in range(6):
            y = -w * 0.42 + i * w * 0.84 / 5
            p.cyl_rotated(f"longitudinal-bar-{side}-{i}", -l * 0.41, y, h * 0.6, l * 0.82, 18, [0, 1, 0], 90, "body", 6)
    for i in range(8):
        x = -l * 0.38 + i * l * 0.76 / 7
        p.cyl_rotated(f"tie-ring-{i}", x, w * 0.36, h * 0.6, w * 0.72, 16, [1, 0, 0], 90, "accent", 8)


def rack(p, d):
    w, depth, h, levels = d["w"], d["d"], d["h"], d["levels"]
    for side in (-1, 1):
        p.box(f"rack-post-{side}", side * w * 0.42, 0, 0, 42, 42, h, "body")
    for level in range(levels):
        z = 70 + level * (h - 160) / max(1, levels - 1)
        p.box(f"rack-shelf-{level}", 0, 0, z, w, depth, 48, "accent")
        for i in range(5):
            x = -w * 0.36 + i * w * 0.18
            p.cyl(f"sample-cylinder-{level}-{i}", x, 0, z + 48, 120, 46, "body", 8)


def hoist(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("ground-frame", 0, 0, 0, w * 0.82, depth * 0.82, 90, "body")
    if style == "portable":
        p.box("mast", 0, depth * 0.12, 90, 95, 95, h * 0.8, "accent")
        p.box("carriage", 0, -depth * 0.22, 150, w * 0.76, 60, h * 0.28, "body")
        p.cyl("winch", 0, depth * 0.36, h * 0.72, 150, 110, "accent", 10)
        for side in (-1, 1):
            p.box(f"stabilizer-{side}", 0, side * depth * 0.52, 0, w * 1.3, 50, 55, "body")
    elif style == "elevator":
        for side in (-1, 1):
            p.box(f"mast-{side}", side * w * 0.34, depth * 0.26, 90, 65, 68, h * 0.88, "accent")
            p.box(f"cross-brace-{side}", side * w * 0.34, -depth * 0.24, 140, 35, 40, h * 0.72, "body")
        p.box("elevator-platform", 0, 0, 250, w * 0.72, depth * 0.64, h * 0.28, "body")
        for side in (-1, 1):
            p.box(f"cage-side-{side}", side * w * 0.37, 0, 250, 38, depth * 0.64, h * 0.42, "accent")
    else:
        for side in (-1, 1):
            p.box(f"mast-{side}", side * w * 0.37, 0, 90, 70, 72, h * 0.9, "body")
            p.box(f"outrigger-{side}", side * w * 0.4, 0, 0, w * 0.52, 48, 55, "accent")
        p.box("working-platform", 0, 0, h * 0.55, w * 1.12, depth * 0.88, 70, "accent")
        for side in (-1, 1):
            p.box(f"guardrail-{side}", 0, side * depth * 0.42, h * 0.6, w * 1.1, 34, h * 0.25, "body")


def panel_lift(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("base-crossbar", 0, 0, 110, w, 70, 52, "body")
    for side in (-1, 1):
        p.wheel(f"caster-{side}", side * w * 0.38, 0, 78, 52, 78, "#40474b")
    p.cyl("mast", 0, 0, 160, h * 0.62, 52, "accent", 8)
    p.box("mast-collar", 0, 0, h * 0.48, 135, 135, 58, "body")
    if style == "drywall":
        p.box("tilt-cradle", 0, 0, h * 0.8, w * 0.82, depth * 0.52, 60, "accent")
        p.box("cradle-crossbar", 0, 0, h * 0.9, 55, w * 0.92, 48, "body")
        p.box("base-leg-left", -w * 0.36, 0, 0, 60, depth * 0.9, 65, "accent")
        p.box("base-leg-right", w * 0.36, 0, 0, 60, depth * 0.9, 65, "accent")
    else:
        p.box("support-cradle", 0, 0, h * 0.82, w * 0.94, 85, 120, "accent")
        for side in (-1, 1):
            p.box(f"support-arm-{side}", 0, side * 85, h * 0.82, w * 0.92, 36, 42, "body")


def bench_tool(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("tool-table", 0, 0, h * 0.55, w, depth * 0.68, 58, "body")
    for side in (-1, 1):
        p.box(f"stand-leg-{side}", side * w * 0.38, 0, 0, 42, 42, h * 0.54, "accent")
    p.box("motor-head", -w * 0.28, 0, h * 0.64, w * 0.25, depth * 0.5, h * 0.28, "accent")
    if style == "tile":
        p.box("sliding-carriage", w * 0.08, 0, h * 0.62, w * 0.34, depth * 0.54, 48, "body")
        p.cyl("tile-blade", w * 0.28, 0, h * 0.61, 45, 115, "accent", 10)
        p.box("water-pan", 0, 0, h * 0.12, w * 0.88, depth * 0.7, 38, "body")


def mixer(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    for side in (-1, 1):
        p.wheel(f"mixer-wheel-{side}", -w * 0.32, side * depth * 0.39, 150, 76, 150)
    p.box("mixer-frame", 0, 0, 180, w * 0.82, depth * 0.44, 90, "body")
    p.cyl("mixing-drum", 0, 0, h * 0.47, 460, w * 0.35, "accent", 12)
    p.box("tilting-cradle", 0, 0, 270, w * 0.62, depth * 0.52, 70, "body")
    p.box("motor-housing", w * 0.32, 0, 220, w * 0.3, depth * 0.34, 250, "accent")
    p.box("push-handle", -w * 0.46, 0, 225, 45, 45, h * 0.42, "body")


def site_plant(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    if style in ("compressor", "fuel"):
        for side in (-1, 1):
            p.wheel(f"trailer-wheel-{side}", -w * 0.3, side * depth * 0.38, 145, 80, 145)
        p.box("tow-frame", w * 0.3, 0, 95, w * 0.52, 60, 55, "accent")
    p.box("skid-base", 0, 0, 0, w * 0.9, depth * 0.86, 65, "body")
    if style == "compressor":
        p.box("compressor-enclosure", -w * 0.04, 0, 65, w * 0.7, depth * 0.68, h * 0.62, "accent")
        for i in range(5):
            p.box(f"vent-{i}", -w * 0.12 + i * 36, -depth * 0.35, 180, 18, 18, h * 0.32, "body")
        p.cyl("hose-reel", w * 0.34, 0, 220, 95, 155, "body", 10)
    elif style == "light":
        p.box("tower-base", 0, 0, 65, w * 0.38, depth * 0.36, 105, "accent")
        p.cyl("telescoping-mast", 0, 0, 170, h * 0.78, 38, "body", 8)
        p.box("light-bar", 0, 0, h * 0.91, w * 0.72, 46, 46, "accent")
        for i in range(4):
            x = -w * 0.28 + i * w * 0.19
            p.box(f"floodlight-{i}", x, 0, h * 0.91 + 35, 86, 62, 75, "body")
        for side in (-1, 1):
            p.box(f"stabilizer-{side}", 0, side * depth * 0.62, 0, w * 1.15, 40, 40, "accent")
    elif style == "tank":
        p.box("tank-body", 0, 0, 65, w * 0.78, depth * 0.74, h * 0.72, "accent")
        p.cyl("filler-neck", -w * 0.28, 0, h * 0.78, 100, 48, "body", 8)
        p.cyl("outlet-valve", w * 0.42, 0, h * 0.34, 125, 34, "body", 8)
        for side in (-1, 1):
            p.box(f"tank-skid-{side}", 0, side * depth * 0.39, 0, w * 0.96, 35, 82, "body")
    else:
        p.box("bunded-tank", 0, 0, 65, w * 0.72, depth * 0.65, h * 0.58, "accent")
        p.box("outer-containment", 0, 0, 65, w * 0.84, depth * 0.78, h * 0.66, "body")
        p.box("pump-box", w * 0.28, -depth * 0.42, 120, w * 0.23, 85, 180, "accent")
        p.cyl("filler-cap", -w * 0.24, 0, h * 0.7, 64, 38, "body", 8)


def support_stand(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d.get("style", "drill")
    if style == "pipe":
        for i, (x, y) in enumerate([(-w * 0.35, -depth * 0.34), (w * 0.35, -depth * 0.34), (0, depth * 0.36)]):
            p.box(f"tripod-leg-{i}", x * 0.5, y * 0.5, 0, 42, 42, h * 0.75, "body")
        p.cyl("upright-post", 0, 0, h * 0.68, h * 0.25, 46, "accent", 8)
        p.cyl_rotated("roller-left", 0, -depth * 0.2 + w * 0.35 / 2, h * 0.95, w * 0.35, 50, [1, 0, 0], 90, "body", 8)
        p.cyl_rotated("roller-right", 0, depth * 0.2 + w * 0.35 / 2, h * 0.95, w * 0.35, 50, [1, 0, 0], 90, "body", 8)
    else:
        p.box("drill-base", 0, 0, 0, w * 0.9, depth * 0.8, 55, "body")
        p.box("guide-column", 0, 0, 55, 60, 60, h * 0.82, "accent")
        p.box("drill-carriage", 0, 0, h * 0.5, w * 0.32, depth * 0.32, 200, "body")
        p.cyl("core-bit", 0, 0, h * 0.2, h * 0.34, 48, "accent", 10)
        p.box("feed-handle", -w * 0.38, 0, h * 0.48, w * 0.42, 35, 35, "body")


def floor_tool(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    add_pair_wheels(p, "floor-wheel", [-w * 0.28, w * 0.27], 54, 92, depth * 0.8)
    p.box("machine-frame", 0, 0, 160, w * 0.7, depth * 0.56, 120, "body")
    p.box("motor-housing", w * 0.12, 0, 280, w * 0.32, depth * 0.42, h * 0.38, "accent")
    p.cyl("handle-post", -w * 0.36, 0, 280, h * 0.45, 32, "body", 8)
    p.box("handle-bar", -w * 0.36, 0, h * 0.76, 250, 40, 40, "accent")
    if style == "grinder":
        p.cyl("grinding-head", 0, 0, 100, 95, depth * 0.3, "accent", 12)
        p.box("dust-shroud", 0, 0, 90, w * 0.62, depth * 0.56, 50, "body")
    else:
        p.box("scarifier-hood", w * 0.2, 0, 100, w * 0.4, depth * 0.62, 110, "accent")
        p.cyl_rotated("cutting-drum", w * 0.2, depth * 0.25, 150, depth * 0.5, 80, [1, 0, 0], 90, "body", 10)


def hand_tool(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    p.box("tool-base", 0, 0, 0, w, depth, 50, "body")
    p.box("battery-case", -w * 0.12, 0, 50, w * 0.55, depth * 0.62, h * 0.38, "accent")
    p.box("grip", w * 0.05, 0, h * 0.38, 80, 70, h * 0.25, "body")
    p.cyl_rotated("nose", w * 0.3, 0, h * 0.28, w * 0.4, 36, [0, 1, 0], 90, "accent", 8)
    p.box("stand-peg", -w * 0.31, 0, 0, 42, 42, h * 0.32, "body")


def survey(p, d):
    w, depth, h, style = d["w"], d["d"], d["h"], d["style"]
    if style in ("tripod", "laser"):
        for i, angle in enumerate((0, 120, 240)):
            rad = angle * 3.14159 / 180
            x, y = w * 0.34 * math.cos(rad), depth * 0.34 * math.sin(rad)
            p.box(f"tripod-leg-{i}", x * 0.5, y * 0.5, 0, 38, 38, h * 0.78, "body")
        p.cyl("tripod-column", 0, 0, h * 0.65, h * 0.26, 38, "accent", 8)
        p.box("head-plate", 0, 0, h * 0.9, w * 0.35, depth * 0.35, 45, "body")
        if style == "laser":
            p.cyl("laser-head", 0, 0, h * 0.93, 170, 115, "accent", 12)
            p.box("display", 0, -depth * 0.12, h * 0.96, 100, 26, 58, "body")
    else:
        p.box("rod-foot", 0, 0, 0, w * 0.45, depth * 0.45, 42, "body")
        p.cyl("survey-pole", 0, 0, 42, h * 0.88, 26, "accent", 8)
        for i in range(8):
            z = 95 + i * h * 0.095
            p.box(f"graduation-band-{i}", 0, -depth * 0.08, z, w * 0.35, 22, 16, "body")
        p.box("prism-bracket", 0, 0, h * 0.85, w * 0.65, 60, 54, "body")
        p.cyl("prism", 0, 0, h * 0.88, 86, 70, "accent", 8)


def build(asset):
    _, _, _, recipe, d = asset
    p = Parts()
    recipes = {
        "paver": paver, "screed": vibrating_screed, "conveyor": conveyor,
        "milling": milling, "roller": roller, "grader": grader,
        "spray-truck": spray_truck, "dozer": dozer, "dump-truck": dump_truck,
        "trailer": trailer, "loader": loader, "backhoe": backhoe,
        "telehandler": telehandler, "forklift": forklift, "service-truck": service_truck,
        "mixer-truck": mixer_truck, "pump-truck": pump_truck, "batch-plant": batch_plant,
        "line-pump": line_pump, "buggy": buggy, "trowel": trowel, "concrete-saw": concrete_saw,
        "vibrator": vibrator, "vibrating-screed": vibrating_screed,
        "concrete-bucket": concrete_bucket, "formwork": formwork, "form-tie": form_tie,
        "rebar-machine": rebar_machine, "rebar-cage": rebar_cage, "rack": rack,
        "hoist": hoist, "panel-lift": panel_lift, "bench-tool": bench_tool,
        "mixer": mixer, "site-plant": site_plant, "support-stand": support_stand,
        "drill-stand": support_stand, "floor-tool": floor_tool, "hand-tool": hand_tool,
        "survey": survey,
    }
    if recipe == "conveyor":
        conveyor(p, d)
    elif recipe == "milling":
        milling(p, d)
    elif recipe == "dozer":
        dozer(p, d)
    else:
        recipes[recipe](p, d)
    return p.lines


def conveyor(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    p.box("hopper", l * 0.38, 0, 0, l * 0.22, w * 0.86, h * 0.28, "accent")
    p.box("conveyor-belt", -l * 0.06, 0, h * 0.32, l * 0.88, w * 0.32, 70, "body")
    for side in (-1, 1):
        p.box(f"truss-rail-{side}", -l * 0.08, side * w * 0.22, h * 0.24, l * 0.88, 35, 45, "accent")
        p.box(f"support-leg-{side}", -l * 0.22, side * w * 0.22, 0, 45, 45, h * 0.42, "body")
    for side in (-1, 1):
        p.wheel(f"transport-wheel-{side}", -l * 0.18, side * w * 0.42, 125, 70, 125)
    p.box("discharge-chute", -l * 0.47, 0, h * 0.83, 180, w * 0.4, 80, "accent")


def milling(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    mobility = d["mobility"]
    if mobility == "track":
        for side in (-1, 1):
            p.track(f"milling-track-{side}", -l * 0.02, side * w * 0.34, 0, l * 0.75, w * 0.22, 230, 4)
    else:
        add_pair_wheels(p, "milling-wheel", [-l * 0.32, l * 0.28], 95, 190, w * 0.82)
    p.box("main-frame", 0, 0, 240, l * 0.72, w * 0.58, 230, "body")
    p.box("engine-cover", -l * 0.18, 0, 470, l * 0.38, w * 0.5, h * 0.34, "accent")
    p.box("operator-deck", l * 0.18, 0, 450, l * 0.2, w * 0.38, 42, "body")
    p.box("canopy-posts", l * 0.18, 0, 492, 32, w * 0.34, h * 0.32, "accent")
    p.box("canopy", l * 0.18, 0, 492 + h * 0.32, l * 0.36, w * 0.44, 48, "body")
    p.box("milling-hood", l * 0.36, 0, 40, l * 0.25, w * 0.82, 250, "accent")
    p.wheel("cutter-drum", l * 0.39, 0, 120, w * 0.75, 120, "#596166")
    for i in range(7):
        x = l * 0.28 + i * l * 0.035
        p.box(f"cutting-tooth-{i}", x, 0, 42, 30, w * 0.74, 30, "body")


def dozer(p, d):
    l, w, h = d["l"], d["w"], d["h"]
    for side in (-1, 1):
        p.track(f"dozer-track-{side}", -l * 0.02, side * w * 0.34, 0, l * 0.76, w * 0.25, 260, 5)
    p.box("dozer-chassis", 0, 0, 260, l * 0.65, w * 0.5, 220, "body")
    p.box("engine-hood", -l * 0.2, 0, 480, l * 0.32, w * 0.46, h * 0.3, "accent")
    p.box("operator-cab", l * 0.16, 0, 470, l * 0.25, w * 0.42, h * 0.36, "body")
    p.box("cab-roof", l * 0.16, 0, 470 + h * 0.36, l * 0.3, w * 0.47, 46, "accent")
    p.box("blade-face", l * 0.48, 0, 90, 95, w * 1.12, 400, "accent")
    for side in (-1, 1):
        p.box(f"blade-lift-arm-{side}", l * 0.33, side * w * 0.38, 280, l * 0.32, 72, 75, "body")


def source_for(asset):
    aid, title, description, recipe, _ = asset
    parts = build(asset)
    category = "structure" if recipe in ("formwork", "batch-plant", "hoist", "rebar-cage") else "prop"
    lines = [
        "// SPDX-License-Identifier: CC0-1.0",
        f"// Original kernelCAD low-poly {title.lower()} scene prop, modeled from scratch.",
        "meta({",
        f"  name: {json.dumps(aid)},",
        "  license: 'CC0-1.0',",
        f"  title: {json.dumps(title)},",
        f"  description: {json.dumps(description + ' Knobs: overall scale, body color and accent color.')},",
        "  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],",
        "  kit: 'construction-equipment',",
        f"  category: '{category}',",
        "  origin: 'base',",
        "  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],",
        "  triangleBudget: 2200",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });",
        "const body = param('body', '#78828a', { label: 'Body color' });",
        "const accent = param('accent', '#d29a36', { label: 'Accent color' });",
        f"const p = assembly('{aid}');",
        "const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));",
        *parts,
        "",
        "return p.model();",
        "",
    ]
    return "\n".join(lines)


def write_readme():
    rows = [
        "# Construction Equipment kit",
        "",
        "Sixty original low-poly scene props covering road paving and compaction, earthmoving support, concrete placement, formwork and rebar, and site logistics. Each asset exposes `scale`, `body` and `accent` controls and declares a 2,200 triangle budget. Models use generic geometry and are visual scene props, not engineering, equipment-fit, operating or performance specifications.",
        "",
        "The [construction equipment wave demo bundle](../../../artifacts/catalog-demos/construction-equipment-wave-20261102/README.md) retains the source generator, video settings, local audit evidence and inspected MP4. Local replay and software rendering do not imply deployment, simulation or hardware acceptance.",
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
        "Search for construction or paving equipment in the catalog, or open an asset in Studio with `?catalog=construction-equipment/<id>`. For example, `?catalog=construction-equipment/track-asphalt-paver` opens its editable source and controls.",
        "",
        "## Rebuild and verify",
        "",
        "```sh",
        "python3 -B artifacts/catalog-demos/construction-equipment-wave-20261102/generate_construction_equipment_assets.py",
        "npx tsx scripts/buildAssetCatalog.ts",
        "npx eslint catalog/",
        "npx vitest run tests/integration/catalog/",
        "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(asset[0] for asset in ASSETS),
        "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-construction-equipment-pages",
        "```",
        "",
        "## License and provenance",
        "",
        "All assets are original and dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). They use kernelCAD primitives; no external meshes, textures, manufacturer marks or product images are included.",
        "",
    ])
    (KIT / "README.md").write_text("\n".join(rows), encoding="utf-8")


def main():
    if len(ASSETS) != 60 or len({asset[0] for asset in ASSETS}) != len(ASSETS):
        raise SystemExit("expected 60 unique assets")
    recipes = {"paver", "screed", "conveyor", "milling", "roller", "grader", "spray-truck", "dozer", "dump-truck", "trailer", "loader", "backhoe", "telehandler", "forklift", "service-truck", "mixer-truck", "pump-truck", "batch-plant", "line-pump", "buggy", "trowel", "concrete-saw", "vibrator", "vibrating-screed", "concrete-bucket", "formwork", "form-tie", "rebar-machine", "rebar-cage", "rack", "hoist", "panel-lift", "bench-tool", "mixer", "site-plant", "support-stand", "drill-stand", "floor-tool", "hand-tool", "survey"}
    unknown = sorted({asset[3] for asset in ASSETS} - recipes)
    if unknown:
        raise SystemExit(f"unimplemented recipes: {unknown}")
    KIT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        (KIT / f"{asset[0]}.kcad.ts").write_text(source_for(asset), encoding="utf-8")
    (KIT / "kit.json").write_text(
        '{\n  "title": "Construction Equipment",\n'
        '  "description": "Original low-poly road paving, compaction, concrete placement and site logistics props with editable scale and palette controls."\n}\n',
        encoding="utf-8",
    )
    write_readme()
    print(f"wrote {len(ASSETS)} construction equipment assets to {KIT}")


if __name__ == "__main__":
    # Recipe implementations defined below are available before main() runs.
    main()
