#!/usr/bin/env python3
"""Generate original, low-poly industrial scene sources for kernelCAD."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "industrial-plant"

# id, title, description, recipe, dimensions, category, body, accent
ASSETS = [
    ("vertical-storage-tank", "Vertical storage tank", "Vertical liquid storage tank with a domed-looking roof, service ladder and foundation legs.", "vertical_vessel", {"h": 920, "r": 300, "legs": 4, "rings": 2}, "prop", "#74828a", "#e6ad4e"),
    ("horizontal-pressure-vessel", "Horizontal pressure vessel", "Horizontal pressure vessel on saddle supports with end flanges, top nozzles and a service gauge.", "horizontal_vessel", {"l": 1050, "r": 220, "legs": 2, "nozzles": 2}, "prop", "#607986", "#e2a849"),
    ("process-reactor-vessel", "Process reactor vessel", "Tall process reactor with a bolted top head, access platforms, side ports and braced supports.", "vertical_vessel", {"h": 1080, "r": 250, "legs": 4, "rings": 3, "platform": 1}, "prop", "#71848b", "#db9e3f"),
    ("distillation-column", "Distillation column", "Slender distillation column with stacked tray bands, a crown nozzle and an operator platform.", "column", {"h": 1400, "r": 155, "decks": 3}, "structure", "#74838b", "#e2b455"),
    ("packed-scrubber-column", "Packed scrubber column", "Packed scrubber tower with a wide sump, narrow stack, spray headers and ladder cage.", "column", {"h": 1120, "r": 210, "decks": 2, "sump": 1}, "structure", "#70848d", "#dca84a"),
    ("shell-and-tube-exchanger", "Shell and tube heat exchanger", "Horizontal shell-and-tube heat exchanger with tube sheets, saddle feet and paired process nozzles.", "exchanger", {"l": 790, "r": 170, "feet": 2, "heads": 2}, "prop", "#687e89", "#dca144"),
    ("plate-heat-exchanger", "Plate heat exchanger", "Compact plate heat exchanger with a pack of cooling plates, tie bars and four connection ports.", "plate_exchanger", {"w": 440, "d": 220, "h": 620, "plates": 9}, "prop", "#647b84", "#e4ad4b"),
    ("evaporative-cooling-tower", "Evaporative cooling tower", "Industrial cooling tower with a broad basin, tapered-looking shell and rooftop fan assembly.", "cooling_tower", {"w": 680, "d": 680, "h": 820, "fans": 2}, "structure", "#73838a", "#dda946"),
    ("flare-stack", "Flare stack", "Braced flare stack with a service platform, ignition head and raised support frame.", "flare_stack", {"h": 1450, "r": 70, "braces": 4}, "structure", "#697982", "#e7ac45"),
    ("process-water-silo", "Process water silo", "Tall process silo with a roof cap, ring stiffeners, discharge hopper and four support legs.", "silo", {"h": 1020, "r": 290, "legs": 4}, "structure", "#77838a", "#d9a343"),
    ("centrifugal-pump", "Centrifugal process pump", "Horizontal centrifugal pump with a volute housing, guarded coupling, motor and mounting skid.", "pump", {"l": 620, "w": 240, "h": 300, "style": "volute"}, "prop", "#597785", "#e7ad42"),
    ("chemical-metering-skid", "Chemical metering skid", "Chemical dosing skid with paired metering pumps, a shared manifold, gauges and a raised control box.", "pump_skid", {"l": 760, "w": 390, "h": 430, "pumps": 2}, "prop", "#687c83", "#e2a747"),
    ("positive-displacement-pump", "Positive displacement pump", "Compact positive-displacement pump with a ribbed gearbox, inlet flange and pressure bypass.", "pump", {"l": 480, "w": 250, "h": 310, "style": "gear"}, "prop", "#647985", "#e2a747"),
    ("air-compressor", "Industrial air compressor", "Packaged air compressor with a receiver tank, motor head, intake filter and service gauge.", "compressor", {"l": 720, "w": 360, "h": 500, "style": "piston"}, "prop", "#657c87", "#e4ab45"),
    ("vacuum-pump-unit", "Vacuum pump unit", "Vacuum pump package with a horizontal motor, exhaust silencer, intake pipe and base rails.", "compressor", {"l": 640, "w": 320, "h": 370, "style": "vacuum"}, "prop", "#637a85", "#dda74b"),
    ("process-blower", "Process blower", "Industrial process blower with a broad intake housing, drive motor and raised discharge duct.", "blower", {"w": 470, "d": 380, "h": 460, "style": "centrifugal"}, "prop", "#697d86", "#dfa744"),
    ("diesel-generator-set", "Diesel generator set", "Packaged diesel generator with a sound enclosure, radiator grille, exhaust stack and skid base.", "generator", {"l": 880, "w": 430, "h": 540, "style": "enclosed"}, "prop", "#647880", "#e0a23e"),
    ("industrial-boiler", "Industrial boiler", "Compact industrial boiler with a firebox, raised flue, burner panel and pipe connections.", "boiler", {"w": 610, "d": 440, "h": 690, "style": "firetube"}, "prop", "#737d82", "#dfa741"),
    ("burner-management-skid", "Burner management skid", "Burner management skid with a gas train, control cabinet, paired valves and a pilot stack.", "burner_skid", {"l": 720, "w": 380, "h": 530}, "prop", "#6b7d83", "#e4a43a"),
    ("steam-header-manifold", "Steam header manifold", "Steam distribution header with five branch risers, isolation wheels and a raised pressure gauge.", "manifold", {"l": 920, "w": 310, "h": 420, "branches": 5}, "prop", "#6e7d84", "#dfa945"),
    ("rooftop-air-handler", "Rooftop air handler", "Packaged rooftop air handler with intake and filter sections, exhaust fans and raised service feet.", "air_handler", {"l": 840, "w": 480, "h": 430, "fans": 3}, "prop", "#70818a", "#dfa843"),
    ("centrifugal-chiller", "Centrifugal chiller", "Industrial chiller package with two compressor domes, condenser barrels and pipe connections.", "chiller", {"l": 780, "w": 490, "h": 500, "compressors": 2}, "prop", "#657c83", "#e4a940"),
    ("axial-flow-fan", "Axial flow fan", "Axial flow fan with a faceted shroud, central hub, support frame and adjustable service mount.", "axial_fan", {"r": 250, "depth": 180, "h": 540, "blades": 5}, "prop", "#708087", "#e5ad48"),
    ("baghouse-dust-collector", "Baghouse dust collector", "Baghouse collector with filter tubes, a hopper bottom, service platform and induced-draft fan.", "baghouse", {"w": 620, "d": 360, "h": 920, "bags": 6}, "structure", "#748088", "#dfa344"),
    ("cartridge-filter-housing", "Cartridge filter housing", "Vertical cartridge-filter vessel with a quick-access lid, inlet and outlet pipes and a drain.", "vertical_vessel", {"h": 620, "r": 190, "legs": 3, "rings": 1}, "prop", "#71848a", "#e6b24f"),
    ("cyclone-separator", "Cyclone separator", "Cyclone separator with a tangential inlet, tall outlet stack and a segmented dust hopper.", "cyclone", {"h": 820, "r": 250, "legs": 3}, "prop", "#707e83", "#e0a648"),
    ("industrial-transformer", "Industrial distribution transformer", "Compact distribution transformer with radiator panels, lifting lugs, bushings and wheel skids.", "transformer", {"w": 560, "d": 420, "h": 610, "radiators": 7}, "prop", "#758080", "#e0a744"),
    ("electrical-control-cabinet", "Electrical control cabinet", "Floor-standing control cabinet with twin doors, vent slots, indicator lamps and a plinth.", "cabinet", {"w": 430, "d": 230, "h": 720, "doors": 2}, "prop", "#687a83", "#dfa746"),
    ("motor-control-center", "Motor control center", "Motor-control-center lineup with three distinct bays, operator panels and a shared cable base.", "mcc", {"w": 760, "d": 250, "h": 760, "bays": 3}, "prop", "#687b84", "#e3a944"),
    ("plc-control-rack", "PLC control rack", "Open PLC rack with modular I/O cards, side rails, a communication module and wire duct.", "plc_rack", {"w": 460, "d": 210, "h": 540, "cards": 7}, "prop", "#667984", "#dfa844"),
    ("variable-frequency-drive-cabinet", "Variable frequency drive cabinet", "Drive cabinet with a large heat-sink back, status display, cooling fan and disconnect handle.", "cabinet", {"w": 390, "d": 260, "h": 680, "doors": 1}, "prop", "#647881", "#e4ab48"),
    ("cable-tray-bridge", "Cable tray bridge", "Raised cable tray bridge with perforated-looking rails, crossbars and two support frames.", "cable_tray", {"l": 940, "w": 330, "h": 320, "crossbars": 8}, "structure", "#718087", "#dda743"),
    ("belt-conveyor", "Belt conveyor", "Straight belt conveyor with a raised deck, roller ends, side guides and adjustable support legs.", "belt_conveyor", {"l": 980, "w": 330, "h": 390, "supports": 3}, "structure", "#687b83", "#e2a744"),
    ("roller-conveyor-line", "Roller conveyor line", "Gravity roller conveyor section with a sturdy side frame, repeated rollers and end stops.", "roller_conveyor", {"l": 920, "w": 360, "h": 300, "rollers": 9}, "structure", "#707f84", "#e4ab47"),
    ("screw-conveyor", "Screw conveyor", "Inclined screw conveyor with an enclosed tube, drive gearbox, feed hopper and support saddles.", "screw_conveyor", {"l": 810, "r": 95, "h": 420, "supports": 2}, "structure", "#6f7d83", "#e1a742"),
    ("bucket-elevator", "Bucket elevator", "Bucket elevator with a tall casing, boot housing, head pulley cover and service ladder.", "bucket_elevator", {"h": 1080, "w": 300, "d": 260, "buckets": 6}, "structure", "#718087", "#dfa747"),
    ("vibratory-feeder", "Vibratory feeder", "Vibratory feeder with a wide feed pan, coil supports, drive unit and hopper transition.", "vibratory_feeder", {"l": 560, "w": 330, "h": 350}, "prop", "#687981", "#e1a648"),
    ("weigh-hopper", "Weigh hopper", "Batch weigh hopper with a broad upper bin, load-cell supports, discharge cone and outlet gate.", "hopper", {"w": 520, "d": 440, "h": 610, "legs": 4}, "prop", "#748089", "#e0a747"),
    ("bulk-loading-spout", "Bulk loading spout", "Bulk loading spout with a telescoping-looking outlet, overhead frame and dust skirt.", "loading_spout", {"w": 340, "d": 320, "h": 860}, "structure", "#76838a", "#e0aa49"),
    ("palletizer-robot-cell", "Palletizer robot cell", "Palletizing robot cell with a six-axis arm, pallet table, access gate and safety fence.", "robot_cell", {"w": 860, "d": 740, "h": 980}, "structure", "#6b7d84", "#e9a43b"),
    ("bridge-crane", "Bridge crane", "Overhead bridge crane with twin runway girders, end trucks, a moving trolley and hanging hook.", "bridge_crane", {"l": 1180, "w": 760, "h": 920}, "structure", "#758087", "#e5ac42"),
    ("gantry-crane", "Gantry crane", "Mobile gantry crane with paired portal frames, caster trucks, crossbeam and chain hoist.", "gantry_crane", {"l": 840, "w": 610, "h": 820}, "structure", "#748087", "#e7ad43"),
    ("jib-crane", "Jib crane", "Floor-mounted jib crane with a base plate, mast, cantilevered boom, brace and chain block.", "jib_crane", {"l": 610, "w": 310, "h": 820}, "structure", "#708088", "#e6ad42"),
    ("electric-chain-hoist", "Electric chain hoist", "Compact electric chain hoist with a trolley, chain fall, hook block and suspension eye.", "hoist", {"w": 280, "d": 250, "h": 420}, "prop", "#667780", "#e8a93e"),
    ("forklift-truck", "Forklift truck", "Warehouse forklift with a raised mast, overhead guard, counterweight, paired wheels and forks.", "forklift", {"l": 660, "w": 340, "h": 640}, "vehicle", "#758187", "#e4a43c"),
    ("electric-pallet-jack", "Electric pallet jack", "Walk-behind electric pallet jack with twin forks, steer tiller, battery case and load rollers.", "pallet_jack", {"l": 780, "w": 300, "h": 310}, "vehicle", "#758087", "#e1a33b"),
    ("scissor-lift-table", "Scissor lift table", "Mobile scissor lift table with crossed lifting arms, platform deck, casters and control box.", "scissor_lift", {"l": 600, "w": 420, "h": 600}, "vehicle", "#6d7c82", "#e6a33e"),
    ("pallet-rack-bay", "Pallet rack bay", "Warehouse pallet-rack bay with braced uprights, three beam levels and safety foot plates.", "rack", {"l": 820, "w": 280, "h": 900, "levels": 3}, "structure", "#738088", "#e4a43f"),
    ("machine-guard-enclosure", "Machine guard enclosure", "Modular machine guard with mesh-like infill panels, a framed service door and corner feet.", "machine_guard", {"w": 720, "d": 580, "h": 780}, "structure", "#727f83", "#e4ae49"),
    ("pipe-rack-bay", "Pipe rack bay", "Pipe rack bay with cross-braced uprights, a raised service beam and three parallel utility lines.", "pipe_rack", {"l": 880, "w": 540, "h": 740, "pipes": 3}, "structure", "#707d84", "#e2a844"),
    ("grating-walkway-module", "Grating walkway module", "Industrial grated walkway module with bearer beams, support legs, kick plates and handrails.", "walkway", {"l": 820, "w": 340, "h": 360, "rails": 2}, "structure", "#768187", "#dfa642"),
    ("maintenance-platform", "Maintenance platform", "Raised maintenance platform with toe boards, guarded perimeter, access ladder and braced legs.", "platform", {"l": 620, "w": 540, "h": 660}, "structure", "#738087", "#e0a33f"),
    ("industrial-stair-tower", "Industrial stair tower", "Compact industrial stair tower with two landings, open treads, guard rails and cross braces.", "stair_tower", {"w": 420, "d": 620, "h": 920}, "structure", "#738087", "#dfa747"),
    ("vertical-cage-ladder", "Vertical cage ladder", "Fixed vertical access ladder with evenly spaced rungs, side rails and a wraparound safety cage.", "cage_ladder", {"h": 930, "w": 210, "d": 160, "rungs": 8}, "structure", "#6f7f85", "#e2a846"),
    ("steel-access-gate", "Steel access gate", "Self-closing industrial access gate with a hinge post, framed infill and raised toe plate.", "access_gate", {"w": 420, "d": 100, "h": 520}, "structure", "#718087", "#e3a744"),
    ("valve-manifold-station", "Valve manifold station", "Process valve station with parallel pipe runs, isolation wheels, gauges and a support frame.", "valve_manifold", {"l": 730, "w": 380, "h": 480, "valves": 3}, "prop", "#6c7e85", "#e4aa43"),
    ("pressure-relief-valve", "Pressure relief valve", "Spring-loaded pressure relief valve with inlet flange, bonnet, adjustment cap and lift lever.", "safety_valve", {"h": 410, "r": 120}, "prop", "#788189", "#e3aa46"),
    ("inline-flow-meter", "Inline flow meter", "Inline flow meter with flanged pipe ends, instrument body, readable display block and cable gland.", "flow_meter", {"l": 520, "r": 115, "h": 340}, "prop", "#6e7e84", "#e1aa48"),
    ("compressed-air-receiver", "Compressed air receiver", "Compressed-air receiver tank with saddle feet, drain valve, top port and pressure gauge.", "horizontal_vessel", {"l": 840, "r": 185, "legs": 2, "nozzles": 3}, "prop", "#6a7e87", "#e6ae48"),
    ("mobile-tool-cart", "Mobile industrial tool cart", "Mobile shop-floor tool cart with two trays, drawer cabinet, push handle and caster wheels.", "tool_cart", {"l": 460, "w": 340, "h": 620, "shelves": 2}, "vehicle", "#6d7d84", "#e4a23c"),
]

# Millimetre offsets measured from the catalog bounds audit. Applied before the
# scale knob so every scaled variant keeps its declared base at z = 0.
BASE_CORRECTIONS_MM = {
    "centrifugal-chiller": -0.5,
    "compressed-air-receiver": -0.5,
    "electric-chain-hoist": -2,
    "electric-pallet-jack": 20,
    "evaporative-cooling-tower": 0.5,
    "gantry-crane": 6,
    "horizontal-pressure-vessel": -0.5,
    "inline-flow-meter": -110,
    "mobile-tool-cart": 2,
    "motor-control-center": -0.5,
    "pressure-relief-valve": -15,
    "rooftop-air-handler": -0.5,
    "screw-conveyor": 5.957,
}


def n(value):
    if isinstance(value, int):
        return str(value)
    return f"{value:.1f}".rstrip("0").rstrip(".")


class Model:
    def __init__(self):
        self.parts = []

    def add(self, name, expression, color="body"):
        safe_name = re.sub(r"[^A-Za-z0-9_-]+", "-", name).strip("-")
        self.parts.append((safe_name, expression, color))

    def box(self, name, w, d, h, x, y, z, color="body", angle=None):
        expr = f"box({n(w)}, {n(d)}, {n(h)}, true)"
        if angle is not None:
            axis, degrees = angle
            expr += f".rotate([{n(axis[0])}, {n(axis[1])}, {n(axis[2])}], {n(degrees)})"
        expr += f".translate({n(x)}, {n(y)}, {n(z)})"
        self.add(name, expr, color)

    def cz(self, name, h, r, x, y, z, color="body", sides=10):
        self.add(name, f"cylinder({n(h)}, {n(r)}, {sides}).translate({n(x)}, {n(y)}, {n(z)})", color)

    def cx(self, name, length, r, x, y, z, color="body", sides=10):
        expr = f"cylinder({n(length)}, {n(r)}, {sides}).rotate([0, 1, 0], 90).translate({n(x - length / 2)}, {n(y)}, {n(z)})"
        self.add(name, expr, color)

    def cy(self, name, length, r, x, y, z, color="body", sides=10):
        expr = f"cylinder({n(length)}, {n(r)}, {sides}).rotate([1, 0, 0], 90).translate({n(x)}, {n(y + length / 2)}, {n(z)})"
        self.add(name, expr, color)

    def wheel(self, name, r, width, x, y, z, color="accent"):
        self.cy(name, width, r, x, y, z, color, 8)

    def sphere(self, name, r, x, y, z, color="body"):
        self.add(name, f"sphere({n(r)}).translate({n(x)}, {n(y)}, {n(z)})", color)


def make_model(asset):
    m = Model()
    kind = asset[3]
    d = asset[4]

    if kind in ("vertical_vessel", "column", "silo"):
        h, r = d["h"], d["r"]
        leg_count = d.get("legs", 3 if kind != "column" else 4)
        leg_h = 95 if kind == "silo" else 55
        m.cz("shell", h - leg_h, r, 0, 0, leg_h)
        m.cz("roof-lip", 24, r * 1.06, 0, 0, h - 24, "accent")
        m.cz("roof-cap", 36, r * 0.8, 0, 0, h, "body")
        m.cz("top-nozzle", max(42, h * 0.1), r * 0.14, 0, 0, h + 28, "accent")
        if kind == "silo":
            m.cz("discharge-transition", 90, r * 0.58, 0, 0, leg_h - 88, "accent")
            m.cz("discharge-neck", 92, r * 0.18, 0, 0, leg_h - 92)
        if kind == "column":
            for i in range(d.get("decks", 2)):
                z = h * (0.34 + i * 0.2)
                m.box(f"service-deck-{i}", r * 2.65, r * 2.25, 14, 0, -r * 0.12, z, "accent")
                m.box(f"deck-post-{i}", 12, 12, 76, r * 1.08, -r * 0.12, z + 43, "body")
            if d.get("sump"):
                m.cz("sump", 145, r * 1.22, 0, 0, 0, "accent")
        else:
            rings = d.get("rings", 1)
            for i in range(rings):
                z = leg_h + (h - leg_h) * (i + 1) / (rings + 1)
                m.cz(f"stiffener-{i}", 14, r * 1.04, 0, 0, z, "accent")
        for i in range(leg_count):
            import math
            a = math.pi * 2 * i / leg_count
            x, y = r * 0.72 * math.cos(a), r * 0.72 * math.sin(a)
            m.box(f"support-leg-{i}", 28, 28, leg_h, x, y, leg_h / 2, "accent")
            m.box(f"foot-{i}", 70, 56, 16, x, y, 8, "body")
        m.cx("side-nozzle", r * 0.7, r * 0.14, r * 0.92, 0, h * 0.56, "accent")
        m.cx("side-flange", 20, r * 0.24, r * 1.3, 0, h * 0.56, "body")
        m.box("ladder-left-rail", 12, 12, h * 0.78, r * 1.09, -r * 0.76, leg_h + h * 0.4, "accent")
        m.box("ladder-right-rail", 12, 12, h * 0.78, r * 1.22, -r * 0.76, leg_h + h * 0.4, "accent")
        for i in range(6):
            z = leg_h + i * h * 0.12
            m.box(f"ladder-rung-{i}", 14, 18, 12, r * 1.155, -r * 0.76, z, "body")
        if d.get("platform"):
            m.box("access-platform", r * 2.7, r * 1.25, 16, 0, -r * 0.68, h * 0.74, "accent")
            m.box("platform-rail", r * 2.7, 14, 72, 0, -r * 1.25, h * 0.78, "body")

    elif kind == "horizontal_vessel":
        l, r = d["l"], d["r"]
        z = r + 130
        m.cx("pressure-shell", l, r, 0, 0, z)
        m.cx("left-head", 28, r * 1.06, -l / 2 - 8, 0, z, "accent")
        m.cx("right-head", 28, r * 1.06, l / 2 + 8, 0, z, "accent")
        m.box("skid-rail-left", l * 0.9, 30, 35, 0, -r * 0.6, 18, "accent")
        m.box("skid-rail-right", l * 0.9, 30, 35, 0, r * 0.6, 18, "accent")
        for i in range(d.get("legs", 2)):
            x = -l * 0.28 if i == 0 else l * 0.28
            m.box(f"saddle-{i}", 95, r * 2.35, 90, x, 0, r * 0.54, "accent")
            m.box(f"saddle-foot-{i}", 130, r * 2.55, 18, x, 0, 10)
        for i in range(d.get("nozzles", 2)):
            x = -l * 0.28 + i * l * 0.56 / max(1, d.get("nozzles", 2) - 1)
            m.cz(f"top-port-{i}", 78, r * 0.14, x, 0, z + r - 4, "accent")
            m.cz(f"port-flange-{i}", 16, r * 0.21, x, 0, z + r + 53)
        m.cy("pressure-gauge", 26, 42, l * 0.14, -r * 0.82, z + r * 0.36, "accent")
        m.cz("drain", 62, r * 0.09, 0, 0, 18, "accent")

    elif kind == "exchanger":
        l, r = d["l"], d["r"]
        z = r + 100
        m.cx("shell", l, r, 0, 0, z)
        for side in (-1, 1):
            m.cx(f"tube-sheet-{side}", 36, r * 1.2, side * (l / 2 + 10), 0, z, "accent")
            m.cx(f"channel-head-{side}", 85, r * 0.88, side * (l / 2 + 48), 0, z, "body")
            m.cz(f"connection-{side}", 74, 38, side * (l * 0.32), 0, z + r - 8, "accent")
        for i in range(d.get("feet", 2)):
            x = -l * 0.3 if i == 0 else l * 0.3
            m.box(f"saddle-{i}", 95, r * 2.1, 90, x, 0, r * 0.55, "accent")
            m.box(f"foot-{i}", 150, r * 2.3, 18, x, 0, 9)
        m.cx("shell-band", 16, r * 1.06, 0, 0, z, "accent")

    elif kind == "plate_exchanger":
        w, dep, h, count = d["w"], d["d"], d["h"], d["plates"]
        m.box("base-frame", w * 1.12, dep * 0.9, 32, 0, 0, 16, "accent")
        m.box("fixed-end-plate", 32, dep, h, -w * 0.42, 0, h / 2, "body")
        m.box("movable-end-plate", 32, dep, h, w * 0.42, 0, h / 2, "accent")
        gap = w * 0.68 / count
        for i in range(count):
            x = -w * 0.32 + gap * i
            m.box(f"heat-plate-{i}", max(8, gap * 0.45), dep * 0.82, h * 0.78, x, 0, h * 0.54, "body")
        for i, y in enumerate((-dep * 0.3, dep * 0.3)):
            m.box(f"tie-bar-{i}", w * 0.82, 18, 18, 0, y, h * 0.92, "accent")
        for i, x in enumerate((-w * 0.35, w * 0.35)):
            m.cz(f"port-{i}", 62, 38, x, 0, h * 0.72, "accent")
            m.cz(f"port-flange-{i}", 16, 58, x, 0, h * 0.73)

    elif kind == "cooling_tower":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("basin", w, dep, 105, 0, 0, 52, "accent")
        m.box("tower-body-lower", w * 0.82, dep * 0.82, h * 0.48, 0, 0, 105 + h * 0.24)
        m.box("tower-body-upper", w * 0.67, dep * 0.67, h * 0.36, 0, 0, 105 + h * 0.66, "body")
        m.box("throat-ring", w * 0.71, dep * 0.71, 30, 0, 0, h * 0.66 + 115, "accent")
        m.box("drift-cap", w * 0.76, dep * 0.76, 28, 0, 0, h + 84, "body")
        for i in range(d.get("fans", 2)):
            x = (i - (d["fans"] - 1) / 2) * w * 0.28
            m.cz(f"fan-ring-{i}", 30, w * 0.12, x, 0, h + 110, "accent", 12)
            m.cz(f"fan-hub-{i}", 48, w * 0.045, x, 0, h + 130, "body", 8)
        for i in range(4):
            x = -w * 0.34 + i * w * 0.22
            m.box(f"basin-leg-{i}", 36, 36, 105, x, -dep * 0.34, 52, "body")

    elif kind == "flare_stack":
        h, r = d["h"], d["r"]
        m.cz("foundation", 50, r * 2.7, 0, 0, 25, "accent", 8)
        m.cz("stack", h * 0.78, r, 0, 0, 50)
        m.cz("top-burner", 90, r * 1.8, 0, 0, h * 0.78 + 50, "accent")
        m.cz("tip", 90, r * 1.25, 0, 0, h * 0.78 + 125)
        m.box("platform-deck", r * 8, r * 8, 24, 0, 0, h * 0.58, "accent")
        m.box("platform-rail-back", r * 8, 12, 72, 0, -r * 3.8, h * 0.63, "body")
        for i in range(d.get("braces", 4)):
            import math
            a = math.pi * 2 * i / d["braces"]
            x, y = r * 2.0 * math.cos(a), r * 2.0 * math.sin(a)
            m.box(f"brace-{i}", 20, 20, h * 0.48, x, y, h * 0.25, "accent", ((0, 1, 0), 12 if i % 2 == 0 else -12))
        m.box("ladder-rail-left", 10, 12, h * 0.72, r * 1.7, -r * 1.8, h * 0.36, "body")
        m.box("ladder-rail-right", 10, 12, h * 0.72, r * 2.2, -r * 1.8, h * 0.36, "body")
        for i in range(9):
            m.box(f"ladder-rung-{i}", 12, r * 0.56, 10, r * 1.95, -r * 1.8, 72 + i * h * 0.072, "accent")

    elif kind == "pump":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("skid", l, w, 38, 0, 0, 19, "accent")
        m.box("motor-foot", l * 0.45, w * 0.58, 32, -l * 0.18, 0, 54)
        m.cx("motor", l * 0.42, h * 0.24, -l * 0.2, 0, h * 0.53, "body", 12)
        m.cx("coupling", 70, h * 0.13, l * 0.06, 0, h * 0.53, "accent", 8)
        m.box("coupling-guard", 100, w * 0.58, 52, l * 0.06, 0, h * 0.53, "body")
        if d.get("style") == "gear":
            m.box("gearbox", l * 0.28, w * 0.62, h * 0.56, l * 0.29, 0, h * 0.55, "accent")
            m.cz("pump-head", h * 0.4, w * 0.24, l * 0.31, 0, h * 0.4, "body")
        else:
            m.sphere("volute", w * 0.24, l * 0.3, 0, h * 0.52, "accent")
            m.cz("pump-neck", h * 0.32, w * 0.18, l * 0.3, 0, h * 0.67, "body")
        m.cx("inlet", w * 0.7, w * 0.13, l * 0.42, 0, h * 0.43, "accent")
        m.cz("outlet", h * 0.23, w * 0.12, l * 0.3, 0, h * 0.78, "accent")
        m.cz("outlet-flange", 18, w * 0.2, l * 0.3, 0, h * 0.96)

    elif kind == "pump_skid":
        l, w, h, count = d["l"], d["w"], d["h"], d["pumps"]
        m.box("base-skid", l, w, 40, 0, 0, 20, "accent")
        m.cx("common-header", l * 0.88, 32, 0, w * 0.31, h * 0.65, "body")
        for i in range(count):
            x = -l * 0.24 + i * l * 0.48 / max(1, count - 1)
            m.box(f"metering-pump-{i}", 155, 150, h * 0.4, x, -w * 0.12, h * 0.22, "body")
            m.cz(f"pump-diaphragm-{i}", 58, 60, x, -w * 0.12, h * 0.64, "accent")
            m.cz(f"suction-line-{i}", h * 0.4, 16, x, -w * 0.12, h * 0.61)
            m.cz(f"dose-valve-{i}", 50, 28, x, w * 0.3, h * 0.6, "accent")
        m.box("control-box", 210, 120, 190, l * 0.36, -w * 0.27, h * 0.53, "accent")
        m.box("control-display", 90, 12, 54, l * 0.36, -w * 0.34, h * 0.64, "body")
        m.box("cross-member", l * 0.88, 24, 22, 0, 0, h * 0.35, "body")

    elif kind == "compressor":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("base-frame", l, w, 38, 0, 0, 19, "accent")
        m.cx("receiver", l * 0.64, h * 0.18, 0, 0, h * 0.27, "body", 12)
        m.cx("motor", l * 0.36, h * 0.17, -l * 0.24, 0, h * 0.65, "accent", 12)
        if d.get("style") == "piston":
            for i in range(3):
                x = l * 0.12 + i * 48
                m.cz(f"cylinder-head-{i}", h * 0.28, 35, x, 0, h * 0.55, "body", 8)
                m.cz(f"head-cap-{i}", 14, 44, x, 0, h * 0.83, "accent", 8)
        else:
            m.box("vacuum-pump-head", 170, 140, 135, l * 0.24, 0, h * 0.65, "body")
            m.cx("silencer", 150, 54, l * 0.36, 0, h * 0.88, "accent")
        m.cz("intake-filter", 96, 52, -l * 0.31, 0, h * 0.77, "accent")
        m.cy("pressure-gauge", 22, 38, l * 0.25, -w * 0.35, h * 0.69, "accent")
        m.cx("air-line", l * 0.28, 18, l * 0.31, 0, h * 0.43, "body")
        for i in range(4):
            m.box(f"vent-slot-{i}", 9, 22, h * 0.32, -l * 0.28 + i * 22, -w * 0.51, h * 0.5, "accent")

    elif kind == "blower":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("base", w * 1.3, dep * 1.1, 35, 0, 0, 18, "accent")
        m.box("volute-housing", w * 0.7, dep * 0.68, h * 0.67, 0, 0, h * 0.42, "body")
        m.cy("inlet-flange", 30, w * 0.25, 0, -dep * 0.36, h * 0.45, "accent")
        m.cy("inlet", 100, w * 0.16, 0, -dep * 0.38, h * 0.45, "body")
        m.cz("outlet-stack", h * 0.42, w * 0.12, w * 0.24, 0, h * 0.72, "accent")
        m.cx("drive-motor", w * 0.62, h * 0.17, -w * 0.53, 0, h * 0.32, "accent", 10)
        m.cx("coupler", 65, h * 0.1, -w * 0.16, 0, h * 0.32, "body", 8)
        for i in range(4):
            m.box(f"anchor-{i}", 30, 34, 70, (-1 if i % 2 == 0 else 1) * w * 0.37, (-1 if i < 2 else 1) * dep * 0.36, 35, "body")

    elif kind == "generator":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("base-skid", l, w, 42, 0, 0, 21, "accent")
        m.box("generator-enclosure", l * 0.84, w * 0.86, h * 0.72, 0, 0, h * 0.4, "body")
        m.box("radiator-grille", 28, w * 0.74, h * 0.48, l * 0.43, 0, h * 0.38, "accent")
        for i in range(5):
            m.box(f"grille-bar-{i}", 18, w * 0.78, 12, l * 0.46, 0, h * 0.2 + i * h * 0.07, "body")
        m.cz("exhaust", h * 0.28, 28, -l * 0.31, w * 0.24, h * 0.76, "accent")
        m.cz("exhaust-cap", 24, 44, -l * 0.31, w * 0.24, h * 1.04)
        m.box("service-door", 12, w * 0.48, h * 0.45, -l * 0.1, -w * 0.44, h * 0.43, "accent")
        m.box("control-panel", 18, 90, 120, l * 0.31, -w * 0.47, h * 0.52, "body")

    elif kind == "boiler":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("base", w * 0.86, dep * 0.88, 42, 0, 0, 21, "accent")
        m.box("boiler-shell", w * 0.76, dep * 0.76, h * 0.67, 0, 0, h * 0.4, "body")
        m.box("burner-door", w * 0.32, 22, h * 0.25, 0, -dep * 0.4, h * 0.28, "accent")
        m.cz("flue", h * 0.48, w * 0.1, w * 0.23, dep * 0.2, h * 0.73, "accent")
        m.cz("flue-cap", 24, w * 0.16, w * 0.23, dep * 0.2, h * 1.19)
        m.cy("gauge", 20, 34, -w * 0.26, -dep * 0.38, h * 0.62, "accent")
        for i in range(3):
            m.cx(f"pipe-{i}", w * 0.3, 18, -w * 0.37, -dep * 0.1 + i * dep * 0.18, h * (0.48 + i * 0.12), "accent")

    elif kind == "burner_skid":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("base-skid", l, w, 38, 0, 0, 19, "accent")
        m.box("burner-control", 245, 180, h * 0.72, -l * 0.32, 0, h * 0.4, "body")
        m.box("control-face", 12, 130, h * 0.42, -l * 0.18, -100, h * 0.45, "accent")
        m.cx("gas-header", l * 0.62, 30, l * 0.15, 0, h * 0.42, "body")
        for i in range(3):
            x = -l * 0.06 + i * l * 0.2
            m.cz(f"gas-valve-{i}", 90, 42, x, 0, h * 0.42, "accent")
            m.cz(f"valve-wheel-{i}", 22, 64, x, 0, h * 0.53, "body", 8)
            m.cx(f"branch-{i}", 100, 14, x, 0, h * 0.65, "accent")
        m.cz("pilot-stack", h * 0.45, 24, l * 0.42, 0, 0, "accent")

    elif kind == "manifold":
        l, w, h, count = d["l"], d["w"], d["h"], d["branches"]
        m.box("support-skid", l, w, 34, 0, 0, 17, "accent")
        m.cx("main-header", l * 0.9, 42, 0, 0, h * 0.46)
        for i in range(count):
            x = -l * 0.38 + i * l * 0.76 / max(1, count - 1)
            m.cz(f"branch-{i}", h * 0.43, 20, x, 0, h * 0.46, "accent")
            m.cz(f"branch-flange-{i}", 18, 40, x, 0, h * 0.82)
            m.cz(f"valve-body-{i}", 62, 32, x, 0, h * 0.67, "body")
            m.cx(f"valve-handle-{i}", 115, 10, x, 0, h * 0.72, "accent", 8)
        m.cy("header-gauge", 20, 37, 0, -w * 0.36, h * 0.64, "accent")

    elif kind in ("air_handler", "chiller"):
        l, w, h = d["l"], d["w"], d["h"]
        m.box("base-frame", l, w, 35, 0, 0, 18, "accent")
        m.box("main-casing", l * 0.92, w * 0.9, h * 0.72, 0, 0, h * 0.4, "body")
        section_count = 3 if kind == "air_handler" else 2
        for i in range(section_count):
            x = -l * 0.3 + i * l * 0.3
            m.box(f"service-section-{i}", l * 0.23, w * 0.93, h * 0.58, x, 0, h * 0.41, "accent" if i == 1 else "body")
            m.box(f"inspection-door-{i}", l * 0.13, 14, h * 0.3, x, -w * 0.47, h * 0.4, "accent")
        for i in range(d.get("fans", d.get("compressors", 2))):
            x = -l * 0.31 + i * l * 0.62 / max(1, d.get("fans", d.get("compressors", 2)) - 1)
            if kind == "air_handler":
                m.cy(f"exhaust-fan-{i}", 26, w * 0.12, x, w * 0.26, h * 0.82, "accent", 12)
            else:
                m.cz(f"compressor-dome-{i}", h * 0.35, w * 0.13, x, 0, h * 0.78, "accent", 12)
        for i in range(4):
            m.box(f"support-foot-{i}", 55, 45, 85, (-1 if i % 2 == 0 else 1) * l * 0.39, (-1 if i < 2 else 1) * w * 0.36, 44, "body")
        m.cx("pipe-header", l * 0.32, 24, l * 0.28, 0, h * 0.19, "accent")

    elif kind == "axial_fan":
        r, dep, h = d["r"], d["depth"], d["h"]
        m.box("mounting-base", r * 2.5, dep * 1.2, 28, 0, 0, 14, "accent")
        m.box("fan-support", 30, 34, h * 0.55, 0, 0, h * 0.28)
        m.cy("fan-shroud", dep, r, 0, 0, h * 0.68, "body", 12)
        m.cy("front-rim", 24, r * 1.1, 0, -dep * 0.5, h * 0.68, "accent", 12)
        m.cy("hub", dep * 0.85, r * 0.24, 0, 0, h * 0.68, "accent", 8)
        for i in range(d.get("blades", 5)):
            m.box(f"fan-blade-{i}", r * 0.86, 22, 30, 0, 0, h * 0.68, "body", ((0, 0, 1), i * 360 / d.get("blades", 5)))
        for i in (-1, 1):
            m.box(f"support-brace-{i}", r * 1.5, 22, 18, i * r * 0.31, 0, h * 0.41, "accent", ((0, 1, 0), i * 18))

    elif kind == "baghouse":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("collector-plenum", w, dep, h * 0.52, 0, 0, h * 0.65, "body")
        m.box("access-roof", w * 1.08, dep * 1.08, 28, 0, 0, h * 0.93, "accent")
        for i in range(d.get("bags", 6)):
            x = -w * 0.34 + (i % 3) * w * 0.34
            y = -dep * 0.28 + (i // 3) * dep * 0.56
            m.cz(f"filter-bag-{i}", h * 0.28, 36, x, y, h * 0.91, "accent", 8)
        for i in (-1, 1):
            m.box(f"support-{i}", 36, 36, h * 0.2, i * w * 0.37, 0, h * 0.1, "accent")
        m.cz("hopper", 185, w * 0.28, 0, 0, 50, "body")
        m.cx("fan-duct", 220, 52, w * 0.56, 0, h * 0.73, "accent")
        m.cx("fan-motor", 180, 42, w * 0.73, 0, h * 0.73, "body")
        m.box("service-walkway", w * 1.25, 65, 22, 0, -dep * 0.58, h * 0.48, "accent")
        m.box("walkway-rail", w * 1.25, 14, 62, 0, -dep * 0.66, h * 0.52, "body")

    elif kind == "cyclone":
        h, r = d["h"], d["r"]
        m.cz("barrel", h * 0.5, r, 0, 0, h * 0.43)
        m.cz("upper-rim", 20, r * 1.08, 0, 0, h * 0.86, "accent")
        for i in range(4):
            m.cz(f"cone-step-{i}", h * 0.085, r * (0.82 - i * 0.16), 0, 0, h * (0.34 - i * 0.08), "body" if i % 2 else "accent")
        m.cz("outlet-stack", h * 0.45, r * 0.24, 0, 0, h * 0.85, "accent")
        m.cx("tangential-inlet", r * 1.25, r * 0.18, r * 0.87, 0, h * 0.67, "accent")
        for i in range(d.get("legs", 3)):
            import math
            a = math.pi * 2 * i / d["legs"]
            m.box(f"leg-{i}", 28, 28, 80, r * 0.8 * math.cos(a), r * 0.8 * math.sin(a), 40, "body")

    elif kind == "transformer":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("tank", w * 0.72, dep * 0.75, h * 0.68, 0, 0, h * 0.44, "body")
        m.box("base-skid", w * 1.08, dep * 1.05, 35, 0, 0, 18, "accent")
        for i in range(d.get("radiators", 7)):
            x = -w * 0.36 + i * w * 0.72 / max(1, d["radiators"] - 1)
            m.box(f"radiator-fin-{i}", 18, dep * 0.19, h * 0.48, x, -dep * 0.46, h * 0.42, "accent")
        for i in range(3):
            x = -w * 0.22 + i * w * 0.22
            m.cz(f"bushing-{i}", h * 0.2, 34, x, 0, h * 0.78, "accent", 8)
            m.cz(f"terminal-{i}", 30, 18, x, 0, h * 0.98)
        for i in (-1, 1):
            m.wheel(f"wheel-{i}", 55, 32, i * w * 0.34, dep * 0.42, 55, "body")
        m.box("lifting-lug-left", 25, 30, 60, -w * 0.39, 0, h * 0.85, "accent")
        m.box("lifting-lug-right", 25, 30, 60, w * 0.39, 0, h * 0.85, "accent")

    elif kind == "cabinet":
        w, dep, h, doors = d["w"], d["d"], d["h"], d["doors"]
        m.box("plinth", w * 1.1, dep * 1.08, 48, 0, 0, 24, "accent")
        m.box("enclosure", w, dep, h, 0, 0, h / 2 + 48, "body")
        for i in range(doors):
            x = -w * 0.25 + i * w * 0.5 / max(1, doors - 1)
            m.box(f"door-{i}", w * 0.42, 14, h * 0.82, x, -dep * 0.51, h * 0.47 + 48, "accent" if i == 0 else "body")
            m.box(f"handle-{i}", 15, 20, h * 0.17, x + w * 0.13, -dep * 0.57, h * 0.45 + 48, "body")
        for i in range(4):
            m.box(f"vent-slot-{i}", w * 0.2, 10, 10, -w * 0.3 + i * w * 0.2, -dep * 0.54, h * 0.24 + 48, "accent")
        m.box("display", w * 0.25, 16, 86, w * 0.25, -dep * 0.54, h * 0.73 + 48, "accent")
        for i in range(3):
            m.cz(f"indicator-{i}", 18, 12, -w * 0.3 + i * 31, -dep * 0.57, h * 0.75 + 48, "body", 8)

    elif kind == "mcc":
        w, dep, h, bays = d["w"], d["d"], d["h"], d["bays"]
        m.box("shared-plinth", w * 1.08, dep * 1.1, 55, 0, 0, 28, "accent")
        bay_w = w / bays
        for i in range(bays):
            x = -w / 2 + bay_w * (i + 0.5)
            m.box(f"bay-{i}", bay_w - 12, dep, h, x, 0, h / 2 + 55, "body" if i != 1 else "accent")
            m.box(f"bay-door-{i}", bay_w * 0.76, 12, h * 0.76, x, -dep * 0.53, h * 0.46 + 55, "body")
            m.box(f"operator-panel-{i}", bay_w * 0.38, 14, h * 0.22, x, -dep * 0.56, h * 0.72 + 55, "accent")
            for j in range(2):
                m.cz(f"pushbutton-{i}-{j}", 16, 13, x + (j - 0.5) * 34, -dep * 0.59, h * 0.74 + 55, "body", 8)
        m.box("top-cable-duct", w, dep * 0.42, 42, 0, 0, h + 76, "accent")

    elif kind == "plc_rack":
        w, dep, h, cards = d["w"], d["d"], d["h"], d["cards"]
        m.box("rack-base", w, dep, 32, 0, 0, 16, "accent")
        m.box("backplane", w * 0.76, 24, h * 0.78, 0, 0, h * 0.54, "body")
        m.box("top-crossbar", w * 0.9, 36, 26, 0, 0, h * 0.96, "accent")
        for i in range(cards):
            x = -w * 0.34 + i * w * 0.68 / max(1, cards - 1)
            m.box(f"io-card-{i}", max(22, w * 0.08), 42, h * 0.62, x, -28, h * 0.52, "accent" if i == 0 else "body")
            for j in range(3):
                m.box(f"card-led-{i}-{j}", 9, 8, 9, x - 5, -51, h * 0.35 + j * 24, "accent")
        m.box("wire-duct", w * 0.96, 48, 60, 0, -dep * 0.22, h * 0.12, "body")

    elif kind == "cable_tray":
        l, w, h, count = d["l"], d["w"], d["h"], d["crossbars"]
        for side in (-1, 1):
            m.box(f"side-rail-{side}", l, 26, 42, 0, side * w / 2, h, "accent")
            m.box(f"support-upright-{side}", 30, 30, h, 0, side * w / 2, h / 2, "body")
            m.box(f"foot-{side}", 110, 60, 20, 0, side * w / 2, 10, "accent")
        for i in range(count):
            x = -l * 0.46 + i * l * 0.92 / max(1, count - 1)
            m.box(f"tray-rung-{i}", 26, w, 14, x, 0, h, "body")

    elif kind in ("belt_conveyor", "roller_conveyor"):
        l, w, h = d["l"], d["w"], d["h"]
        for side in (-1, 1):
            m.box(f"side-frame-{side}", l, 30, 55, 0, side * w * 0.46, h * 0.76, "accent")
            for i in range(d.get("supports", 3)):
                x = -l * 0.38 + i * l * 0.76 / max(1, d.get("supports", 3) - 1)
                m.box(f"support-{side}-{i}", 26, 26, h * 0.7, x, side * w * 0.34, h * 0.36, "body")
                m.box(f"foot-{side}-{i}", 74, 70, 18, x, side * w * 0.34, 9, "accent")
        m.box("conveyor-deck", l, w * 0.82, 22, 0, 0, h, "body")
        roll_count = d.get("rollers", 2)
        for i in range(roll_count):
            x = -l * 0.42 + i * l * 0.84 / max(1, roll_count - 1)
            m.cx(f"roller-{i}", w * 0.9, 22, x, 0, h + 24, "accent", 8)
        if kind == "belt_conveyor":
            m.box("belt-surface", l * 0.94, w * 0.74, 16, 0, 0, h + 27, "accent")
            m.box("end-stop", 24, w * 0.82, 72, l * 0.48, 0, h + 36, "body")

    elif kind == "screw_conveyor":
        l, r, h = d["l"], d["r"], d["h"]
        angle = -14
        m.cx("conveyor-tube", l, r, 0, 0, h * 0.58, "body", 12)
        m.cx("drive-motor", l * 0.19, r * 0.78, -l * 0.56, 0, h * 0.58, "accent")
        m.box("feed-hopper", r * 2.1, r * 2.1, r * 1.7, -l * 0.33, 0, h * 0.28, "accent")
        m.box("discharge-collar", 72, r * 1.9, r * 1.8, l * 0.48, 0, h * 0.62, "accent")
        for i in range(d.get("supports", 2)):
            x = -l * 0.22 + i * l * 0.52 / max(1, d.get("supports", 2) - 1)
            m.box(f"saddle-leg-{i}", 30, 32, h * 0.3, x, 0, h * 0.14, "body", ((0, 1, 0), angle))
            m.box(f"support-foot-{i}", 115, 80, 18, x, 0, 9, "accent")

    elif kind == "bucket_elevator":
        h, w, dep = d["h"], d["w"], d["d"]
        m.box("elevator-casing", w, dep, h * 0.72, 0, 0, h * 0.54, "body")
        m.box("boot", w * 1.55, dep * 1.45, 150, 0, 0, 75, "accent")
        m.box("head-house", w * 1.48, dep * 1.5, 180, 0, 0, h * 0.92, "accent")
        m.cx("head-shaft", w * 1.1, 36, 0, 0, h * 0.95, "body")
        for i in range(d.get("buckets", 6)):
            z = 150 + i * (h * 0.72 - 170) / max(1, d.get("buckets", 6) - 1)
            m.box(f"bucket-{i}", 48, 52, 42, w * 0.58, -dep * 0.56, z, "accent")
        m.box("service-ladder-left", 12, 18, h * 0.82, -w * 0.7, -dep * 0.57, h * 0.48, "accent")
        m.box("service-ladder-right", 12, 18, h * 0.82, -w * 0.54, -dep * 0.57, h * 0.48, "accent")
        for i in range(7):
            m.box(f"ladder-rung-{i}", 12, 24, 10, -w * 0.62, -dep * 0.57, 90 + i * h * 0.11, "body")

    elif kind == "vibratory_feeder":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("base", l * 0.92, w * 0.82, 34, 0, 0, 17, "accent")
        m.box("feed-pan", l, w, 52, 0, 0, h * 0.8, "body", ((0, 1, 0), -6))
        m.box("rear-hopper", l * 0.38, w * 0.88, h * 0.35, -l * 0.3, 0, h * 0.64, "accent")
        for side in (-1, 1):
            for i in range(2):
                x = -l * 0.25 + i * l * 0.5
                m.cz(f"spring-{side}-{i}", h * 0.32, 25, x, side * w * 0.32, h * 0.2, "body", 8)
        m.box("drive-unit", 165, 120, 145, l * 0.35, 0, h * 0.35, "accent")
        m.cx("motor", 180, 54, l * 0.49, 0, h * 0.39, "body")

    elif kind == "hopper":
        w, dep, h, legs = d["w"], d["d"], d["h"], d["legs"]
        m.box("upper-bin", w, dep, h * 0.48, 0, 0, h * 0.68, "body")
        m.box("top-rim", w * 1.08, dep * 1.08, 28, 0, 0, h * 0.93, "accent")
        m.cz("hopper-transition-upper", h * 0.16, w * 0.38, 0, 0, h * 0.18, "accent")
        m.cz("hopper-transition-lower", h * 0.14, w * 0.19, 0, 0, h * 0.1, "body")
        m.cz("outlet", 62, w * 0.12, 0, 0, 0, "accent")
        for i in range(legs):
            x = (-1 if i % 2 == 0 else 1) * w * 0.42
            y = (-1 if i < 2 else 1) * dep * 0.42
            m.box(f"support-leg-{i}", 30, 30, h * 0.68, x, y, h * 0.34, "body")
            m.box(f"foot-{i}", 84, 76, 18, x, y, 9, "accent")
        m.box("slide-gate", w * 0.44, dep * 0.35, 24, 0, 0, 82, "accent")

    elif kind == "loading_spout":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("support-beam", w * 1.8, 56, 46, 0, 0, h * 0.93, "accent")
        m.box("frame-post-left", 42, 42, h * 0.86, -w * 0.7, 0, h * 0.43, "body")
        m.box("frame-post-right", 42, 42, h * 0.86, w * 0.7, 0, h * 0.43, "body")
        m.cz("fixed-chute", h * 0.48, w * 0.19, 0, 0, h * 0.49, "accent")
        m.cz("telescoping-tube", h * 0.34, w * 0.13, 0, 0, h * 0.16, "body")
        m.cz("dust-skirt", 70, w * 0.23, 0, 0, 10, "accent", 8)
        m.box("hoist-motor", 160, 130, 90, 0, -dep * 0.4, h * 0.82, "body")
        m.cx("cross-brace", w * 1.2, 16, 0, 0, h * 0.56, "accent")

    elif kind == "robot_cell":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("cell-floor", w, dep, 28, 0, 0, 14, "accent")
        m.box("pallet-table", w * 0.35, dep * 0.35, 170, -w * 0.27, dep * 0.2, 100, "body")
        for side in (-1, 1):
            m.box(f"fence-post-{side}", 24, 24, h * 0.76, side * w * 0.45, dep * 0.37, h * 0.39, "accent")
            m.box(f"fence-panel-{side}", 16, dep * 0.55, h * 0.62, side * w * 0.45, 0, h * 0.43, "body")
        m.box("robot-pedestal", 190, 190, 155, w * 0.2, -dep * 0.2, 92, "accent")
        m.cz("robot-waist", 85, 92, w * 0.2, -dep * 0.2, 168, "body")
        m.box("robot-upper-arm", 220, 100, 115, w * 0.2, -dep * 0.2, 300, "accent", ((0, 1, 0), -28))
        m.sphere("elbow-joint", 67, w * 0.42, -dep * 0.2, 410, "body")
        m.box("robot-forearm", 210, 82, 92, w * 0.48, -dep * 0.2, 515, "accent", ((0, 1, 0), 28))
        m.box("gripper", 110, 145, 50, w * 0.54, -dep * 0.2, 600, "body")
        m.box("gate-leaf", w * 0.38, 18, h * 0.67, -w * 0.29, -dep * 0.46, h * 0.35, "accent")

    elif kind in ("bridge_crane", "gantry_crane", "jib_crane"):
        l, w, h = d["l"], d["w"], d["h"]
        m.box("base-rail-left", l, 42, 34, 0, -w * 0.44, 17, "accent")
        m.box("base-rail-right", l, 42, 34, 0, w * 0.44, 17, "accent")
        if kind == "jib_crane":
            m.cz("mast", h * 0.84, 38, -l * 0.3, 0, 36, "body")
            m.box("boom", l, 44, 42, 0, 0, h * 0.82, "accent")
            m.box("brace", l * 0.7, 24, 22, -l * 0.07, 0, h * 0.58, "body", ((0, 1, 0), -24))
            m.box("hoist", 120, 110, 88, l * 0.32, 0, h * 0.78, "accent")
            m.cz("chain", h * 0.31, 10, l * 0.32, 0, h * 0.48, "body", 8)
            m.box("hook", 38, 24, 45, l * 0.32, 0, h * 0.16, "accent")
        else:
            for side in (-1, 1):
                y = side * w * 0.42
                if kind == "gantry_crane":
                    m.box(f"portal-leg-front-{side}", 42, 42, h * 0.86, -l * 0.42, y, h * 0.43, "body", ((0, 1, 0), side * 8))
                    m.box(f"portal-leg-back-{side}", 42, 42, h * 0.86, l * 0.42, y, h * 0.43, "body", ((0, 1, 0), -side * 8))
                    m.wheel(f"caster-{side}", 48, 40, 0, y, 42, "accent")
                else:
                    m.box(f"column-{side}", 42, 42, h * 0.78, -l * 0.42, y, h * 0.39, "body")
                    m.box(f"runway-girder-{side}", l * 1.08, 44, 55, 0, y, h * 0.81, "accent")
            m.box("bridge-beam", 58, w * 1.04, 72, 0, 0, h * 0.86, "body")
            m.box("trolley", 220, 190, 80, 0, 0, h * 0.91, "accent")
            m.cz("chain", h * 0.34, 11, 0, 0, h * 0.56, "body", 8)
            m.box("hook-block", 46, 50, 70, 0, 0, h * 0.18, "accent")
            m.box("hook", 42, 24, 38, 20, 0, h * 0.11, "body")

    elif kind == "hoist":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("hoist-case", w, dep, h * 0.42, 0, 0, h * 0.64, "body")
        m.box("trolley-plate", w * 1.6, dep * 0.58, 32, 0, 0, h * 0.91, "accent")
        for side in (-1, 1):
            m.wheel(f"trolley-wheel-{side}", 44, 28, side * w * 0.58, 0, h * 0.95, "body")
        m.cz("chain", h * 0.43, 12, 0, 0, h * 0.2, "accent", 8)
        m.box("hook-block", 58, 56, 64, 0, 0, 60, "body")
        m.box("hook-tip", 42, 28, 42, 28, 0, 23, "accent")
        m.box("suspension-eye", 65, 30, 65, 0, 0, h * 0.93, "body")

    elif kind == "forklift":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("chassis", l, w, 105, 0, 0, 90, "body")
        m.box("counterweight", l * 0.28, w * 1.02, 180, -l * 0.33, 0, 210, "accent")
        m.box("operator-seat", 155, 150, 70, -l * 0.03, 0, 245, "accent")
        m.box("overhead-guard-roof", l * 0.68, w * 0.92, 30, -l * 0.02, 0, h * 0.91, "accent")
        for side in (-1, 1):
            m.box(f"guard-post-rear-{side}", 26, 26, h * 0.55, -l * 0.3, side * w * 0.36, h * 0.63, "body")
            m.box(f"guard-post-front-{side}", 26, 26, h * 0.55, l * 0.25, side * w * 0.36, h * 0.63, "body")
            m.wheel(f"rear-wheel-{side}", 82, 52, -l * 0.28, side * w * 0.51, 82, "accent")
            m.wheel(f"front-wheel-{side}", 100, 58, l * 0.24, side * w * 0.51, 100, "accent")
            m.box(f"mast-rail-{side}", 30, 30, h * 0.74, l * 0.4, side * w * 0.34, h * 0.41, "accent")
        m.box("mast-carriage", 38, w * 0.8, h * 0.35, l * 0.43, 0, h * 0.58, "body")
        for side in (-1, 1):
            m.box(f"fork-{side}", l * 0.55, 54, 34, l * 0.7, side * w * 0.25, 44, "accent")

    elif kind == "pallet_jack":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("pump-body", 190, w * 0.7, 85, -l * 0.32, 0, 60, "accent")
        for side in (-1, 1):
            m.box(f"fork-{side}", l * 0.84, 58, 42, l * 0.05, side * w * 0.27, 50, "body")
            m.wheel(f"load-roller-{side}", 38, 32, l * 0.48, side * w * 0.27, 38, "accent")
        m.box("tiller-base", 55, 58, 110, -l * 0.4, 0, 120, "body")
        m.box("tiller-shaft", 30, 30, h * 0.7, -l * 0.45, 0, h * 0.55, "accent", ((0, 1, 0), -18))
        m.box("tiller-grip", 180, 45, 45, -l * 0.55, 0, h * 0.92, "body")
        m.wheel("steer-wheel", 68, 42, -l * 0.3, 0, 48, "accent")

    elif kind == "scissor_lift":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("base", l, w, 80, 0, 0, 40, "body")
        m.box("platform-deck", l * 1.12, w * 1.08, 36, 0, 0, h - 18, "accent")
        for side in (-1, 1):
            m.box(f"scissor-arm-a-{side}", l * 0.74, 36, 34, 0, side * w * 0.24, h * 0.42, "body", ((0, 1, 0), 34))
            m.box(f"scissor-arm-b-{side}", l * 0.74, 36, 34, 0, side * w * 0.24, h * 0.42, "accent", ((0, 1, 0), -34))
            m.wheel(f"caster-{side}", 40, 34, -l * 0.36, side * w * 0.48, 40, "accent")
        m.box("control-box", 90, 70, 150, l * 0.42, -w * 0.4, 170, "body")
        for side in (-1, 1):
            m.box(f"safety-rail-{side}", 20, 16, 90, 0, side * w * 0.48, h - 70, "body")

    elif kind == "rack":
        l, w, h, levels = d["l"], d["w"], d["h"], d["levels"]
        for side in (-1, 1):
            m.box(f"upright-{side}", 34, 32, h, side * l * 0.46, 0, h / 2, "body")
            m.box(f"footplate-{side}", 88, 78, 18, side * l * 0.46, 0, 9, "accent")
            m.box(f"diagonal-brace-{side}", 24, 20, h * 0.8, side * l * 0.46, 0, h * 0.48, "accent", ((0, 1, 0), side * 10))
        for i in range(levels):
            z = h * (0.2 + i * 0.23)
            m.box(f"beam-front-{i}", l, 34, 42, 0, -w * 0.38, z, "accent")
            m.box(f"beam-back-{i}", l, 34, 42, 0, w * 0.38, z, "accent")
            m.box(f"shelf-deck-{i}", l * 0.86, w * 0.68, 22, 0, 0, z - 25, "body")

    elif kind == "machine_guard":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("floor-frame", w, dep, 32, 0, 0, 16, "accent")
        for x in (-w * 0.46, w * 0.46):
            for y in (-dep * 0.46, dep * 0.46):
                m.box(f"corner-post-{x}-{y}", 24, 24, h, x, y, h / 2, "body")
                m.box(f"corner-foot-{x}-{y}", 80, 80, 18, x, y, 9, "accent")
        m.box("rear-mesh-frame", w * 0.94, 20, h * 0.82, 0, dep * 0.45, h * 0.52, "accent")
        m.box("side-panel-left", 18, dep * 0.45, h * 0.82, -w * 0.45, 0, h * 0.52, "accent")
        m.box("side-panel-right", 18, dep * 0.45, h * 0.82, w * 0.45, 0, h * 0.52, "accent")
        m.box("door-panel", w * 0.32, 18, h * 0.72, -w * 0.25, -dep * 0.45, h * 0.47, "body")
        m.box("top-rail", w, 32, 32, 0, 0, h - 8, "body")

    elif kind == "pipe_rack":
        l, w, h, count = d["l"], d["w"], d["h"], d["pipes"]
        for side in (-1, 1):
            m.box(f"support-column-{side}", 48, 48, h, 0, side * w * 0.42, h / 2, "body")
            m.box(f"baseplate-{side}", 125, 125, 22, 0, side * w * 0.42, 11, "accent")
            m.box(f"crossbeam-{side}", l, 44, 46, 0, side * w * 0.42, h * 0.82, "accent")
            m.box(f"brace-{side}", l * 0.74, 28, 25, 0, side * w * 0.42, h * 0.43, "body", ((0, 1, 0), side * 12))
        for i in range(count):
            y = -w * 0.28 + i * w * 0.28
            m.cx(f"pipe-run-{i}", l * 1.06, 34 + i * 8, 0, y, h * 0.86, "accent" if i == 1 else "body")
            m.cx(f"pipe-flange-{i}", 18, 55, l * 0.39, y, h * 0.86, "accent")

    elif kind == "walkway":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("deck", l, w, 24, 0, 0, h, "accent")
        for i in range(8):
            x = -l * 0.44 + i * l * 0.88 / 7
            m.box(f"grating-bar-{i}", 12, w * 0.92, 16, x, 0, h + 18, "body")
        for x in (-l * 0.38, l * 0.38):
            m.box(f"support-leg-{x}", 34, 34, h, x, 0, h / 2, "body")
            m.box(f"foot-{x}", 95, 90, 18, x, 0, 9, "accent")
        for side in (-1, 1):
            m.box(f"handrail-{side}", l, 16, 22, 0, side * w * 0.48, h + 104, "accent")
            for i in range(4):
                x = -l * 0.4 + i * l * 0.27
                m.box(f"rail-post-{side}-{i}", 16, 16, 110, x, side * w * 0.48, h + 56, "body")
            m.box(f"toe-plate-{side}", l, 16, 65, 0, side * w * 0.49, h + 44, "body")

    elif kind == "platform":
        l, w, h = d["l"], d["w"], d["h"]
        m.box("deck", l, w, 28, 0, 0, h, "accent")
        for x in (-l * 0.42, l * 0.42):
            for y in (-w * 0.42, w * 0.42):
                m.box(f"post-{x}-{y}", 32, 32, h, x, y, h / 2, "body")
                m.box(f"base-foot-{x}-{y}", 82, 82, 18, x, y, 9, "accent")
        for side in (-1, 1):
            m.box(f"rail-long-{side}", l, 18, 22, 0, side * w * 0.47, h + 105, "accent")
            for i in (-1, 1):
                m.box(f"mid-rail-{side}-{i}", l, 14, 18, 0, side * w * 0.47, h + 60, "body")
        m.box("access-step", 150, 160, 34, l * 0.58, -w * 0.33, 18, "body")

    elif kind == "stair_tower":
        w, dep, h = d["w"], d["d"], d["h"]
        for side in (-1, 1):
            m.box(f"tower-post-{side}", 30, 30, h, side * w * 0.44, 0, h / 2, "body")
        m.box("lower-landing", w, dep * 0.5, 26, 0, -dep * 0.22, h * 0.35, "accent")
        m.box("upper-landing", w, dep * 0.5, 26, 0, dep * 0.22, h * 0.82, "accent")
        m.box("stair-stringer-left", 22, 22, h * 0.52, -w * 0.32, 0, h * 0.57, "body", ((1, 0, 0), -30))
        m.box("stair-stringer-right", 22, 22, h * 0.52, w * 0.32, 0, h * 0.57, "body", ((1, 0, 0), -30))
        for i in range(7):
            z = h * 0.34 + i * h * 0.064
            y = -dep * 0.33 + i * dep * 0.075
            m.box(f"tread-{i}", w * 0.66, 74, 20, 0, y, z, "accent")
        for side in (-1, 1):
            m.box(f"upper-guard-{side}", 16, dep * 0.48, 78, side * w * 0.45, dep * 0.22, h * 0.86, "body")
        m.box("cross-brace", w * 0.74, 20, 18, 0, 0, h * 0.52, "accent")

    elif kind == "cage_ladder":
        h, w, dep, rungs = d["h"], d["w"], d["d"], d["rungs"]
        for side in (-1, 1):
            m.box(f"ladder-rail-{side}", 24, 24, h, side * w * 0.42, 0, h / 2, "body")
        for i in range(rungs):
            z = 35 + i * (h - 70) / max(1, rungs - 1)
            m.box(f"rung-{i}", w * 0.92, 26, 18, 0, 0, z, "accent")
        for i in range(4):
            z = h * (0.35 + i * 0.15)
            m.cy(f"safety-hoop-{i}", dep, w * 0.72, 0, 0, z, "accent", 8)
            m.box(f"hoop-support-{i}", 16, dep * 0.74, 16, 0, 0, z, "body")
        m.box("top-grab-left", 18, 22, 110, -w * 0.42, 0, h + 50, "accent")
        m.box("top-grab-right", 18, 22, 110, w * 0.42, 0, h + 50, "accent")

    elif kind == "access_gate":
        w, dep, h = d["w"], d["d"], d["h"]
        m.box("hinge-post", 42, 58, h, -w * 0.52, 0, h / 2, "body")
        m.box("latch-post", 42, 58, h, w * 0.52, 0, h / 2, "body")
        m.box("gate-top", w, dep, 28, 0, 0, h * 0.91, "accent")
        m.box("gate-bottom", w, dep, 28, 0, 0, h * 0.25, "accent")
        m.box("gate-panel", w * 0.92, dep * 0.42, h * 0.55, 0, 0, h * 0.59, "body")
        for i in range(5):
            x = -w * 0.38 + i * w * 0.19
            m.box(f"infill-bar-{i}", 14, dep * 0.56, h * 0.56, x, 0, h * 0.59, "accent")
        m.box("toe-plate", w * 0.92, dep * 1.1, h * 0.17, 0, 0, h * 0.14, "accent")

    elif kind == "valve_manifold":
        l, w, h, count = d["l"], d["w"], d["h"], d["valves"]
        m.box("support-frame", l, w, 28, 0, 0, 14, "accent")
        m.cx("header", l * 0.9, 36, 0, w * 0.1, h * 0.4)
        for i in range(count):
            x = -l * 0.3 + i * l * 0.3
            m.cz(f"riser-{i}", h * 0.42, 20, x, 0, h * 0.4, "accent")
            m.cz(f"valve-{i}", 62, 38, x, 0, h * 0.67, "body")
            m.cx(f"handwheel-{i}", 90, 8, x, 0, h * 0.76, "accent", 8)
            m.cx(f"branch-outlet-{i}", 120, 22, x, 0, h * 0.84, "body")
            m.cx(f"flange-{i}", 18, 44, x + 62, 0, h * 0.84, "accent")
        for side in (-1, 1):
            m.box(f"stand-{side}", 32, 32, h * 0.38, side * l * 0.38, 0, h * 0.19, "body")

    elif kind == "safety_valve":
        h, r = d["h"], d["r"]
        m.cz("inlet-flange", 30, r, 0, 0, 15, "accent", 12)
        m.cz("inlet-neck", 110, r * 0.58, 0, 0, 70, "body")
        m.cz("valve-body", 135, r * 0.82, 0, 0, 140, "accent")
        m.cz("bonnet", h * 0.38, r * 0.42, 0, 0, 265, "body")
        m.cz("spring-cap", 42, r * 0.64, 0, 0, h - 22, "accent")
        m.cx("lift-lever", r * 2.1, 16, r * 0.95, 0, h * 0.8, "body")
        m.cy("outlet", r * 1.6, r * 0.38, 0, r * 0.45, h * 0.52, "accent")
        m.cy("outlet-flange", 18, r * 0.6, 0, r * 1.1, h * 0.52, "body")
        for i in range(3):
            m.cz(f"spring-band-{i}", 12, r * 0.48, 0, 0, h * 0.63 + i * 24, "accent", 8)

    elif kind == "flow_meter":
        l, r, h = d["l"], d["r"], d["h"]
        z = r + 110
        m.cx("pipe-run", l, r * 0.55, 0, 0, z, "body")
        for side in (-1, 1):
            m.cx(f"flange-{side}", 24, r, side * (l * 0.43), 0, z, "accent")
        m.box("meter-housing", r * 1.5, r * 1.2, h * 0.62, 0, 0, z + r * 0.7, "accent")
        m.box("display", r * 0.82, 18, h * 0.27, 0, -r * 0.64, z + r * 0.75, "body")
        m.box("cable-gland", 46, 48, 55, r * 0.45, 0, z + r * 1.3, "body")
        m.cz("instrument-neck", 72, 30, 0, 0, z + r * 1.2, "body")

    elif kind == "tool_cart":
        l, w, h, shelves = d["l"], d["w"], d["h"], d["shelves"]
        m.box("drawer-cabinet", l * 0.67, w * 0.78, h * 0.4, 0, 0, h * 0.3, "body")
        for i in range(3):
            m.box(f"drawer-front-{i}", l * 0.57, 18, h * 0.085, 0, -w * 0.42, h * 0.16 + i * h * 0.1, "accent")
            m.box(f"drawer-pull-{i}", l * 0.25, 15, 14, 0, -w * 0.47, h * 0.16 + i * h * 0.1, "body")
        for i in range(shelves):
            z = h * (0.56 + i * 0.28)
            m.box(f"tray-{i}", l, w, 32, 0, 0, z, "accent")
            m.box(f"tray-back-{i}", l * 0.92, 20, 44, 0, w * 0.47, z + 34, "body")
        for side in (-1, 1):
            m.box(f"handle-post-{side}", 18, 18, h * 0.6, -l * 0.45, side * w * 0.42, h * 0.7, "body")
        m.box("push-handle", 24, w * 0.92, 24, -l * 0.45, 0, h * 0.98, "accent")
        for x in (-l * 0.42, l * 0.42):
            for y in (-w * 0.42, w * 0.42):
                m.wheel(f"caster-{x}-{y}", 38, 26, x, y, 36, "accent")

    else:
        raise ValueError(f"unknown recipe: {kind}")

    return m.parts


def source_for(asset):
    asset_id, title, description, _, _, category, body, accent = asset
    model = make_model(asset)
    lines = [
        "// SPDX-License-Identifier: CC0-1.0",
        f"// Original kernelCAD low-poly {title.lower()} scene prop, modeled from scratch.",
        "meta({",
        f"  name: '{asset_id}',",
        "  license: 'CC0-1.0',",
        f"  title: '{title}',",
        f"  description: '{description} Knobs: overall scale, body color and accent color.',",
        "  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],",
        "  kit: 'industrial-plant',",
        f"  category: '{category}',",
        "  origin: 'base',",
        "  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],",
        "  triangleBudget: 1400",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });",
        f"const body = param('body', '{body}', {{ label: 'Body color' }});",
        f"const accent = param('accent', '{accent}', {{ label: 'Accent color' }});",
        f"const p = assembly('{asset_id}');",
    ]
    correction = BASE_CORRECTIONS_MM.get(asset_id, 0)
    correction_text = f"{correction:.3f}".rstrip("0").rstrip(".") if correction else "0"
    adjust = f".translate(0, 0, {correction_text})" if correction else ""
    for name, expression, color in model:
        lines.append(f"p.part('{name}', {expression}{adjust}.scale(scale).color({color}));")
    lines.extend(["", "return p.model();", ""])
    return "\n".join(lines)


def write_readme():
    rows = [
        "# Industrial Plant kit",
        "",
        "Sixty original low-poly factory scene assets for process equipment, power and controls, material handling, lifting, access and safety. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable `scale`, `body` and `accent` controls and declares a 1,400 triangle budget. The catalog audit records the actual triangle count and one-material export for every source.",
        "",
        "The [industrial plant wave demo bundle](../../../artifacts/catalog-demos/industrial-plant-wave-20261102/README.md) retains the capture source, settings, verification evidence and inspected MP4. It demonstrates the local catalog workflow; deployed behavior and physical equipment acceptance are separate states.",
        "",
        "| id | asset | description | knobs |",
        "| --- | --- | --- | --- |",
    ]
    for asset in ASSETS:
        asset_id, title, description = asset[:3]
        rows.append(f"| `{asset_id}` | {title} | {description} | scale · body · accent |")
    rows.extend([
        "",
        "## Use a catalog asset",
        "",
        "Search by object name through the catalog tools, or open a known asset directly in Studio with `?catalog=industrial-plant/<id>`. For example, `?catalog=industrial-plant/bridge-crane` opens the crane source with its scale and palette controls. Exported catalog meshes are low-poly scene props; their geometry is not an engineering specification for real plant equipment.",
        "",
        "## Rebuild and verify",
        "",
        "```sh",
        "python3 -B artifacts/catalog-demos/industrial-plant-wave-20261102/generate_industrial_plant_assets.py",
        "npx tsx scripts/buildAssetCatalog.ts",
        "npx eslint catalog/",
        "npx vitest run tests/integration/catalog/",
        "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(asset[0] for asset in ASSETS),
        "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-industrial-plant-pages",
        "```",
        "",
        "## Licence and provenance",
        "",
        "Every asset and any export from it are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is modeled from scratch with kernelCAD primitives. No downloaded, traced, converted or decimated meshes, textures or palettes are included.",
        "",
    ])
    (KIT / "README.md").write_text("\n".join(rows), encoding="utf-8")


def main():
    if len(ASSETS) != 60 or len({asset[0] for asset in ASSETS}) != len(ASSETS):
        raise SystemExit("expected 60 assets with unique ids")
    KIT.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        path = KIT / f"{asset[0]}.kcad.ts"
        path.write_text(source_for(asset), encoding="utf-8")
    (KIT / "kit.json").write_text(
        '{\n  "title": "Industrial Plant",\n'
        '  "description": "Original low-poly process equipment, factory machines, material handling and access structures with editable scale and palette controls."\n}\n',
        encoding="utf-8",
    )
    write_readme()
    print(f"wrote {len(ASSETS)} industrial plant assets to {KIT}")


if __name__ == "__main__":
    main()
