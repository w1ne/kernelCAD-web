#!/usr/bin/env python3
"""Generate the original parametric grid-substation scene kit."""

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "grid-substation"
KIT.mkdir(parents=True, exist_ok=True)

# id, title, group, form, (width, depth, height), description, subtype
ASSETS = [
    ("substation-overhead-line-gantry", "Overhead line gantry", "Incoming lines and structures", "portal", (5600, 1800, 7200), "Portal frame carrying the incoming line conductors above a utility substation bay.", "line"),
    ("substation-bus-coupler-gantry", "Bus coupler gantry", "Incoming lines and structures", "portal", (4400, 1600, 5400), "Compact portal support for bus coupler conductors between adjacent yard bays.", "coupler"),
    ("substation-shield-wire-mast", "Shield wire mast", "Incoming lines and structures", "mast", (1000, 1000, 9300), "Slender yard mast with a high crossarm for an overhead shield wire.", "shield"),
    ("substation-dead-end-crossarm", "Dead end crossarm support", "Incoming lines and structures", "crossarm", (2900, 1400, 6200), "Tall steel support with a broad termination crossarm and suspended insulator points.", "dead-end"),
    ("substation-strain-insulator-string", "Strain insulator string", "Incoming lines and structures", "string", (720, 380, 1700), "Suspended stack of insulator sheds with end fittings for a line termination scene.", "strain"),
    ("substation-station-post-insulator", "Station post insulator", "Incoming lines and structures", "insulator", (440, 440, 1350), "Schematic ribbed post insulator on a broad mounting foot for yard equipment.", "post"),
    ("substation-tubular-busbar-bridge", "Tubular busbar bridge", "Incoming lines and structures", "busbridge", (4600, 900, 2300), "Raised busbar span with paired support columns and insulator stacks.", "bridge"),
    ("substation-busbar-expansion-joint", "Busbar expansion joint", "Incoming lines and structures", "expansion", (1800, 680, 650), "Two aligned conductor ends joined by a flexible expansion section.", "joint"),
    ("substation-phase-spacer-damper", "Phase spacer damper", "Incoming lines and structures", "spacer", (1900, 420, 700), "Cross-shaped spacer assembly for a bundled conductor scene.", "phase"),
    ("substation-lightning-mast", "Lightning protection mast", "Incoming lines and structures", "mast", (820, 820, 10800), "Freestanding pointed mast with a compact upper crossarm and wide footing.", "lightning"),
    ("substation-cable-riser-frame", "Cable riser frame", "Incoming lines and structures", "frame", (1500, 1200, 3500), "Open steel frame supporting several vertical cable risers at a bay edge.", "riser"),
    ("substation-bay-identification-post", "Bay identification post", "Incoming lines and structures", "sign", (520, 420, 2200), "Yard post carrying a blank bay identifier panel for scene layout.", "bay"),
    ("substation-three-pole-disconnector", "Three pole disconnector", "Primary switching equipment", "switch", (3900, 1100, 2400), "Three phase outdoor disconnector with a shared base and visible blade arms.", "three-pole"),
    ("substation-center-break-disconnector", "Center break disconnector", "Primary switching equipment", "switch", (4100, 1200, 2700), "Center break switch geometry with paired contact supports and a raised center blade.", "center-break"),
    ("substation-vertical-break-disconnector", "Vertical break disconnector", "Primary switching equipment", "switch", (3500, 1050, 3000), "Vertical break switch with elevated blade pivots and three visible phase positions.", "vertical-break"),
    ("substation-earthing-switch-stand", "Earthing switch stand", "Primary switching equipment", "switch", (1700, 900, 1800), "Grounding switch stand with a short operating blade and grounded support base.", "earth"),
    ("substation-dead-tank-breaker", "Dead tank circuit breaker", "Primary switching equipment", "breaker", (3000, 1600, 2900), "Schematic dead tank breaker with three terminal bushings and a side operating cabinet.", "dead-tank"),
    ("substation-live-tank-breaker", "Live tank circuit breaker", "Primary switching equipment", "breaker", (2600, 1100, 3900), "Three upright interrupter poles on a common frame with overhead terminal arms.", "live-tank"),
    ("substation-gas-insulated-breaker-module", "Gas insulated breaker module", "Primary switching equipment", "gis", (3300, 1300, 2300), "Compact enclosed switching module with three short bushings and an operator cabinet.", "breaker"),
    ("substation-current-transformer", "Current transformer", "Primary switching equipment", "instrument", (850, 800, 2200), "Pedestal current transformer with a broad upper ring body and terminal pads.", "current"),
    ("substation-optical-current-transformer", "Optical current transformer", "Primary switching equipment", "instrument", (900, 820, 2450), "Tall optical current sensor with a distinctive open sensing loop above its support.", "optical"),
    ("substation-inductive-voltage-transformer", "Inductive voltage transformer", "Primary switching equipment", "instrument", (1000, 900, 2350), "Compact voltage transformer with a stepped body, mounting pedestal, and top terminal.", "voltage"),
    ("substation-capacitive-voltage-transformer", "Capacitive voltage transformer", "Primary switching equipment", "instrument", (1250, 950, 2900), "Capacitive voltage transformer with stacked divider sections and an upper terminal.", "capacitive"),
    ("substation-coupling-capacitor", "Coupling capacitor", "Primary switching equipment", "instrument", (1120, 900, 2600), "Stacked capacitor column on a frame with a small secondary terminal box.", "coupling"),
    ("substation-surge-arrester", "Surge arrester", "Primary switching equipment", "arrester", (600, 600, 2400), "Ribbed surge arrester column with a top terminal and a bolted pedestal.", "arrester"),
    ("substation-line-trap", "Line trap", "Primary switching equipment", "lineTrap", (1850, 900, 1450), "Hollow coil assembly suspended from a compact support frame above the bus.", "trap"),
    ("substation-grading-ring-stand", "Grading ring stand", "Primary switching equipment", "grading", (1450, 1000, 2100), "Tall grading ring and terminal support with a wide base and insulator stem.", "ring"),
    ("substation-bus-post-insulator", "Bus post insulator stack", "Primary switching equipment", "insulator", (520, 520, 1550), "Reinforced ribbed post stack with a broad top cap for a yard bus support.", "bus-post"),
    ("substation-hv-cable-termination", "High voltage cable termination", "Primary switching equipment", "termination", (920, 920, 2450), "Cable termination pedestal with a stepped insulator body and flared top fitting.", "cable-end"),
    ("substation-gis-busduct-terminal", "GIS bus duct terminal", "Primary switching equipment", "gis", (2000, 1200, 1950), "Enclosed bus duct end module with a terminal stack and a rectangular service panel.", "busduct"),
    ("substation-main-power-transformer", "Main power transformer", "Transformer bay and auxiliaries", "transformer", (6400, 3900, 5400), "Large transformer tank with cooler banks, bushings, conservator, and transport base.", "main"),
    ("substation-station-service-transformer", "Station service transformer", "Transformer bay and auxiliaries", "transformer", (2600, 2100, 3200), "Compact auxiliary transformer with a simplified tank, bushings, and cooling fins.", "auxiliary"),
    ("substation-transformer-radiator-bank", "Transformer radiator bank", "Transformer bay and auxiliaries", "radiator", (2400, 900, 2450), "Fin bank with header rails and end manifolds for a transformer cooling scene.", "radiator"),
    ("substation-transformer-cooling-fan", "Transformer cooling fan unit", "Transformer bay and auxiliaries", "fan", (1300, 850, 1850), "Fan and motor unit mounted in a protective frame for an oil cooler bank.", "cooler-fan"),
    ("substation-transformer-conservator", "Transformer oil conservator", "Transformer bay and auxiliaries", "oilTank", (2600, 1100, 1650), "Raised conservator vessel with saddles, end caps, and a level indicator box.", "conservator"),
    ("substation-bushing-turret", "Transformer bushing turret", "Transformer bay and auxiliaries", "bushing", (1700, 1450, 2200), "Tank-top turret frame with three tall bushing stacks and terminal pads.", "turret"),
    ("substation-tap-changer-drive-cabinet", "Tap changer drive cabinet", "Transformer bay and auxiliaries", "cabinet", (1100, 900, 2200), "Weatherproof drive cabinet with a roof hood, double doors, and a low cable plinth.", "drive"),
    ("substation-silica-gel-breather", "Silica gel breather", "Transformer bay and auxiliaries", "breather", (620, 580, 1350), "Transparent-style breather vessel silhouette with neck, brackets, and base support.", "breather"),
    ("substation-pressure-relief-device", "Pressure relief device", "Transformer bay and auxiliaries", "pressure", (680, 620, 1050), "Compact relief valve housing with a raised indicator cap and flange foot.", "relief"),
    ("substation-transformer-oil-sampling-station", "Transformer oil sampling station", "Transformer bay and auxiliaries", "oilSample", (1300, 850, 1700), "Small sampling cabinet with bottle shelf, drain tray, and pipe connection points.", "sample"),
    ("substation-transformer-fire-wall", "Transformer fire wall", "Transformer bay and auxiliaries", "firewall", (6000, 500, 4700), "Segmented fire separation wall on steel feet beside a transformer bay.", "transformer-wall"),
    ("substation-oil-containment-bund", "Oil containment bund", "Transformer bay and auxiliaries", "bund", (7200, 5200, 650), "Low perimeter containment curb with internal drain sump and grated center panels.", "bund"),
    ("substation-transformer-rail-bogie", "Transformer rail bogie", "Transformer bay and auxiliaries", "bogie", (3500, 1800, 950), "Low transport bogie with twin rail shoes, crossmembers, and wheel housings.", "bogie"),
    ("substation-oil-cooling-pump-skid", "Oil cooling pump skid", "Transformer bay and auxiliaries", "pump", (2500, 1300, 1750), "Skid-mounted pump and motor pair with visible suction and discharge piping.", "cooling-pump"),
    ("substation-protection-control-kiosk", "Protection and control kiosk", "Protection and control", "cabinet", (3400, 1800, 2900), "Walk-in protection kiosk with entry step, double doors, roof overhang, and service vents.", "kiosk"),
    ("substation-bay-control-cabinet", "Bay control cabinet", "Protection and control", "cabinet", (1300, 950, 2300), "Outdoor bay control cabinet with paired doors and a raised sun hood.", "bay-control"),
    ("substation-protection-relay-rack", "Protection relay rack", "Protection and control", "cabinet", (1200, 800, 2250), "Open relay rack with four shelves and a row of modular relay units.", "relay-rack"),
    ("substation-rtu-gateway-cabinet", "RTU and gateway cabinet", "Protection and control", "cabinet", (1250, 900, 2200), "Tall automation cabinet with a communications bay, plinth, and cooling louvers.", "rtu"),
    ("substation-station-battery-rack", "Station battery rack", "Protection and control", "battery", (2400, 900, 1850), "Two-tier battery rack carrying a row of distinct battery cases.", "battery"),
    ("substation-battery-charger-cabinet", "Battery charger cabinet", "Protection and control", "cabinet", (1050, 850, 2050), "Floor standing charger enclosure with front service panels and lower air slots.", "charger"),
    ("substation-dc-distribution-panel", "DC distribution panel", "Protection and control", "cabinet", (1600, 780, 2200), "Wide panel with grouped feeder doors and a raised cable-entry base.", "dc-panel"),
    ("substation-ac-station-service-board", "AC station service board", "Protection and control", "cabinet", (1900, 820, 2350), "Multi-bay station board with separate incoming and outgoing panel sections.", "ac-board"),
    ("substation-control-room-console", "Control room console", "Protection and control", "console", (2600, 1250, 1450), "Operator desk with three raised instrument panels and a continuous work surface.", "console"),
    ("substation-mimic-board-cabinet", "Mimic board cabinet", "Protection and control", "cabinet", (2200, 800, 2300), "Wide cabinet front with a framed blank mimic panel and service doors below.", "mimic"),
    ("substation-metering-marshalling-box", "Metering marshalling box", "Protection and control", "cabinet", (980, 760, 1500), "Compact instrument junction enclosure with a rain hood and cable gland plate.", "marshal"),
    ("substation-fiber-communications-cabinet", "Fiber communications cabinet", "Protection and control", "cabinet", (1050, 820, 2150), "Communications enclosure with split equipment bays and overhead cable tray.", "fiber"),
    ("substation-synchronism-check-panel", "Synchronism check panel", "Protection and control", "panel", (1600, 720, 2100), "Narrow panel cabinet with a large meter window and grouped control buttons.", "sync"),
    ("substation-disturbance-recorder-cabinet", "Disturbance recorder cabinet", "Protection and control", "cabinet", (1150, 900, 2200), "Recorder cabinet with a recessed instrument bay and lower cable entry.", "recorder"),
    ("substation-precast-cable-trench", "Precast cable trench section", "Cable and grounding", "trench", (4200, 900, 900), "Open-topped precast cable trench segment with reinforced sidewalls and end lips.", "trench"),
    ("substation-cable-trench-cover", "Cable trench cover module", "Cable and grounding", "cover", (1200, 850, 150), "Liftable trench cover slab with two recessed lifting slots and beveled edges.", "cover"),
    ("substation-cable-ladder-section", "Cable ladder section", "Cable and grounding", "tray", (3000, 750, 500), "Open cable ladder with twin stringers, evenly spaced rungs, and support feet.", "ladder"),
    ("substation-cable-junction-pit", "Cable junction pit", "Cable and grounding", "pit", (1500, 1450, 1000), "Square pull pit with a raised rim, removable cover, and four side conduit stubs.", "junction"),
    ("substation-ground-grid-test-well", "Ground grid test well", "Cable and grounding", "ground", (650, 650, 650), "Small inspection well with a removable cap and a visible ground riser.", "test-well"),
    ("substation-ground-conductor-clamp", "Ground conductor clamp", "Cable and grounding", "clamp", (560, 420, 380), "Bolt-on conductor clamp with a base plate, paired jaws, and crossbolt.", "clamp"),
    ("substation-ground-bar-pedestal", "Ground bar pedestal", "Cable and grounding", "groundbar", (1600, 620, 1150), "Insulated support stand carrying a long horizontal equipotential ground bar.", "groundbar"),
    ("substation-power-cable-reel", "Power cable reel", "Cable and grounding", "reel", (1750, 950, 1650), "Portable cable reel with flanged drums, axle supports, and a low transport frame.", "reel"),
    ("substation-protection-relay-test-cart", "Protection relay test cart", "Maintenance and safety", "cart", (1450, 850, 1500), "Wheeled relay test cart with a control face, instrument shelf, and pull handle.", "relay-test"),
    ("substation-breaker-timing-analyzer-cart", "Breaker timing analyzer cart", "Maintenance and safety", "cart", (1250, 780, 1380), "Compact analyzer trolley with an upright recorder panel and coiled lead brackets.", "timing-test"),
    ("substation-hydraulic-breaker-service-trolley", "Breaker service trolley", "Maintenance and safety", "cart", (1900, 950, 1150), "Low service trolley with hydraulic power pack, hose reel, and lifting handle.", "service"),
    ("substation-portable-hv-test-divider", "Portable HV test divider", "Maintenance and safety", "testdiv", (1650, 1100, 2550), "Portable measurement divider on a tripod base with a stepped insulated column.", "divider"),
    ("substation-insulated-stick-cabinet", "Insulated operating stick cabinet", "Maintenance and safety", "cabinet", (2850, 450, 650), "Long wall mounted cabinet with separate bays for insulated operating sticks.", "stick-store"),
    ("substation-yard-barrier-section", "Yard barrier section", "Maintenance and safety", "barrier", (2600, 420, 1150), "Removable tubular barrier panel with two end feet and a high visibility rail silhouette.", "yard-barrier"),
    ("substation-chain-gate-barrier", "Chain gate barrier", "Maintenance and safety", "chainGate", (3200, 450, 1250), "Two freestanding bollards joined by a raised chain line across an access lane.", "chain-gate"),
    ("substation-high-voltage-warning-sign", "High voltage warning sign", "Maintenance and safety", "sign", (760, 360, 2100), "Blank warning sign plate on twin legs for a fenced high voltage yard.", "warning"),
    ("substation-fire-suppression-cylinder-bank", "Fire suppression cylinder bank", "Maintenance and safety", "fire", (2200, 900, 1850), "Grouped suppression cylinders held in a rack with a shared manifold header.", "suppression"),
    ("substation-fire-monitor-post", "Fire monitor post", "Maintenance and safety", "fireMonitor", (1250, 900, 2300), "Fixed monitor post with a raised nozzle head and two-sided control handles.", "monitor"),
    ("substation-oil-water-separator", "Oil water separator", "Maintenance and safety", "separator", (2700, 1600, 1800), "Compact separator vessel with access covers, inlet manifold, and a sampling box.", "separator"),
    ("substation-yard-light-mast", "Yard light mast", "Maintenance and safety", "light", (800, 800, 6800), "Tall lighting mast with a projecting luminaire bracket and compact lamp housing.", "yard-light"),
    ("substation-maintenance-access-platform", "Maintenance access platform", "Maintenance and safety", "platform", (2400, 1800, 1900), "Raised service platform with guardrails, toe boards, and a short access stair.", "platform"),
    ("substation-portable-work-canopy", "Portable work canopy", "Maintenance and safety", "canopy", (4200, 3000, 3100), "Freestanding maintenance canopy with four posts, roof beams, and braced corners.", "canopy"),
]


def box(name, w, d, h, x=0, y=0, z=0):
    return ("B", name, (w, d, h), (x, y, z))


def cyl(name, h, r, x=0, y=0, z=0):
    return ("C", name, h, r, (x, y, z))


def wheel(name, length, r, x=0, y=0, z=0):
    return ("CY", name, length, r, (x, y, z))


def drum(name, length, r, x=0, y=0, z=0):
    return ("CX", name, length, r, (x, y, z))


def recipe(form, subtype, w, d, h):
    p = []
    sx = w / 2
    sy = d / 2

    if form == "portal":
        leg = max(230, min(420, w * 0.055))
        p += [box("foot-left", 560, 620, 320, -sx + 420, -sy + 280), box("foot-right", 560, 620, 320, sx - 420, -sy + 280)]
        p += [box("column-left", leg, leg, h - 700, -sx + 420, -sy + 280, 320), box("column-right", leg, leg, h - 700, sx - 420, -sy + 280, 320)]
        p += [box("top-crossbeam", w, max(240, d * 0.18), 320, 0, 0, h - 380)]
        arm = max(450, w * 0.11)
        p += [box("cantilever-left", arm, 220, 180, -sx + arm / 2, 0, h - 920), box("cantilever-right", arm, 220, 180, sx - arm / 2, 0, h - 920)]
        for i, x in enumerate((-sx * 0.58, -sx * 0.2, sx * 0.2, sx * 0.58)):
            p.append(cyl(f"insulator-{i + 1}", 440, 85, x, 0, h - 1360))
        p.append(box("earthing-platform", w * 0.58, d * 0.35, 120, 0, sy * 0.38, h - 690))
    elif form == "mast":
        p += [box("foundation", w * 0.76, d * 0.76, 420, 0, 0)]
        p += [cyl("mast-shaft", h - 420, max(100, w * 0.11), 0, 0, 420)]
        p += [box("main-crossarm", w * 2.1, 260, 220, 0, 0, h - 930)]
        p += [box("upper-crossarm", w * 1.45, 220, 180, 0, 0, h - 1550)]
        for i, x in enumerate((-w * 0.92, 0, w * 0.92)):
            p.append(cyl(f"crossarm-insulator-{i + 1}", 450, 92, x, 0, h - 1380))
        if subtype == "lightning":
            p += [cyl("pointed-tip", 700, 34, 0, 0, h - 700)]
    elif form == "crossarm":
        p += [box("base-plate", w * 0.45, d * 0.55, 280, 0, 0), cyl("support-pole", h - 280, max(120, w * 0.06), 0, 0, 280)]
        p += [box("termination-crossarm", w, 300, 260, 0, 0, h - 680), box("lower-brace", w * 0.62, 190, 180, 0, 0, h - 1380)]
        for i, x in enumerate((-w * 0.36, 0, w * 0.36)):
            p.append(cyl(f"hanging-insulator-{i + 1}", 700, 78, x, 0, h - 1380))
    elif form == "string":
        p += [cyl("upper-clevis", 180, w * 0.18, 0, 0, h - 180)]
        for i in range(7):
            z = 170 + i * (h - 520) / 7
            p += [cyl(f"shed-{i + 1}", 115, w * (0.24 if i % 2 == 0 else 0.2), 0, 0, z)]
        p += [cyl("lower-clevis", 190, w * 0.16, 0, 0, 0)]
    elif form == "insulator":
        p += [box("mounting-foot", w, d, 160, 0, 0), cyl("core", h - 350, w * 0.18, 0, 0, 160)]
        count = 6 if h > 1200 else 4
        for i in range(count):
            z = 250 + i * (h - 620) / max(1, count - 1)
            p.append(cyl(f"shed-{i + 1}", 90, w * (0.46 if subtype == "bus-post" else 0.38), 0, 0, z))
        p += [box("top-cap", w * 0.62, d * 0.62, 145, 0, 0, h - 145)]
    elif form == "busbridge":
        for side, x in (("left", -sx * 0.7), ("right", sx * 0.7)):
            p += [box(f"base-{side}", 520, d * 0.8, 240, x, 0), cyl(f"support-{side}", h - 700, 95, x, 0, 240), cyl(f"insulator-{side}", 420, 145, x, 0, h - 460)]
        p += [box("bus-span", w, 220, 220, 0, 0, h - 260)]
        p += [box("terminal-left", 260, 400, 220, -sx + 130, 0, h - 300), box("terminal-right", 260, 400, 220, sx - 130, 0, h - 300)]
    elif form == "expansion":
        p += [box("support-left", 460, d, 330, -sx * 0.72, 0), box("support-right", 460, d, 330, sx * 0.72, 0)]
        p += [box("conductor-left", w * 0.4, 180, 190, -sx * 0.43, 0, h * 0.42), box("conductor-right", w * 0.4, 180, 190, sx * 0.43, 0, h * 0.42)]
        p += [box("flexible-link", w * 0.32, 360, 120, 0, 0, h * 0.54)]
        for i, x in enumerate((-sx * 0.7, sx * 0.7)):
            p.append(cyl(f"insulator-{i + 1}", h * 0.45, 105, x, 0, h * 0.3))
    elif form == "spacer":
        p += [box("lower-conductor-support", w * 0.76, 180, 120, 0, 0), box("cross-core", w * 0.72, 180, 180, 0, 0, h * 0.42)]
        p += [box("arm-left", w * 0.36, d, 200, -sx * 0.43, 0, h * 0.32), box("arm-right", w * 0.36, d, 200, sx * 0.43, 0, h * 0.32)]
        for i, x in enumerate((-sx * 0.47, sx * 0.47)):
            p.append(cyl(f"conductor-sleeve-{i + 1}", h * 0.3, 115, x, 0, h * 0.55))
    elif form == "frame":
        for side, x in (("left", -sx * 0.72), ("right", sx * 0.72)):
            p += [box(f"foot-{side}", 420, d * 0.78, 220, x, 0), box(f"upright-{side}", 180, 180, h - 220, x, 0, 220)]
        p += [box("top-support", w * 0.8, 220, 200, 0, 0, h - 200)]
        for i, x in enumerate((-sx * 0.4, -sx * 0.14, sx * 0.14, sx * 0.4)):
            p.append(box(f"riser-{i + 1}", 120, 150, h * 0.62, x, 0, 220))
    elif form == "sign":
        for side, x in (("left", -w * 0.22), ("right", w * 0.22)):
            p.append(box(f"post-{side}", 100, 100, h - d * 0.45, x, 0, 0))
        p += [box("sign-plate", w, 120, d * 0.55, 0, 0, h - d * 0.68), box("lower-brace", w * 0.55, 100, 90, 0, 0, h - d * 0.8)]
    elif form == "switch":
        p += [box("base-frame", w, d, 220, 0, 0)]
        phases = 3 if subtype != "earth" else 1
        for i in range(phases):
            x = (i - (phases - 1) / 2) * w * 0.28
            for side in (-1, 1):
                y = side * d * 0.22
                p.append(cyl(f"phase-{i + 1}-support-{side}", h * 0.55, 95, x, y, 220))
                p.append(cyl(f"phase-{i + 1}-insulator-{side}", h * 0.19, 145, x, y, h * 0.55))
            blade_z = h * (0.83 if subtype in ("center-break", "vertical-break") else 0.75)
            p.append(box(f"phase-{i + 1}-blade", w * 0.27, 115, 110, x, 0, blade_z))
        p += [box("drive-cabinet", w * 0.18, d * 0.3, h * 0.34, -w * 0.36, 0, 220), box("operating-link", w * 0.62, 95, 90, 0, d * 0.38, h * 0.42)]
    elif form == "breaker":
        p += [box("breaker-base", w, d, 300, 0, 0)]
        phases = 3
        for i in range(phases):
            x = (i - 1) * w * 0.29
            if subtype == "live-tank":
                p += [cyl(f"interrupter-pole-{i + 1}", h * 0.68, 175, x, 0, 300), box(f"terminal-arm-{i + 1}", w * 0.2, 180, 150, x, 0, h - 240)]
            else:
                p += [box(f"tank-pole-{i + 1}", w * 0.22, d * 0.3, h * 0.36, x, 0, 350), cyl(f"bushing-{i + 1}", h * 0.34, 130, x, 0, h * 0.62)]
        p += [box("mechanism-cabinet", w * 0.23, d * 0.4, h * 0.38, sx * 0.52, 0, 300), box("terminal-link", w * 0.88, 150, 170, 0, -d * 0.28, h - 210)]
    elif form == "gis":
        p += [box("enclosure-base", w, d, 340, 0, 0), box("sealed-enclosure", w * 0.76, d * 0.72, h * 0.52, 0, 0, 340)]
        for i, x in enumerate((-w * 0.3, 0, w * 0.3)):
            p += [cyl(f"bushing-{i + 1}", h * 0.37, 125, x, 0, h * 0.73), box(f"terminal-{i + 1}", 230, 260, 170, x, 0, h - 180)]
        p += [box("service-cabinet", w * 0.23, d * 0.34, h * 0.57, sx * 0.42, 0, 340)]
    elif form == "instrument":
        p += [box("base-plate", w, d, 180, 0, 0), cyl("pedestal", h * 0.44, w * 0.14, 0, 0, 180)]
        if subtype == "optical":
            p += [box("sensor-body", w * 0.68, d * 0.66, h * 0.17, 0, 0, h * 0.43), box("sensor-loop-left", 150, d * 0.12, h * 0.44, -w * 0.3, 0, h * 0.58), box("sensor-loop-right", 150, d * 0.12, h * 0.44, w * 0.3, 0, h * 0.58), box("sensor-bridge", w * 0.66, d * 0.12, 140, 0, 0, h * 0.94)]
        elif subtype in ("capacitive", "coupling"):
            for i in range(4):
                p.append(cyl(f"divider-section-{i + 1}", h * 0.12, w * (0.34 - i * 0.035), 0, 0, h * (0.44 + i * 0.13)))
        elif subtype == "current":
            p += [box("core-body", w * 0.74, d * 0.74, h * 0.23, 0, 0, h * 0.46), box("upper-ring", w * 0.95, d * 0.92, 200, 0, 0, h * 0.74)]
        else:
            p += [box("transformer-body", w * 0.82, d * 0.78, h * 0.28, 0, 0, h * 0.45), box("top-terminal", w * 0.36, d * 0.35, 180, 0, 0, h - 180)]
        p += [box("secondary-box", w * 0.42, d * 0.38, h * 0.16, sx * 0.48, sy * 0.45, h * 0.12)]
    elif form == "arrester":
        p += [box("mounting-base", w, d, 180, 0, 0)]
        for i in range(6):
            p.append(cyl(f"arrester-section-{i + 1}", h * 0.105, w * (0.31 if i % 2 else 0.36), 0, 0, 180 + i * h * 0.13))
        p += [box("top-terminal", w * 0.42, d * 0.42, 170, 0, 0, h - 170)]
    elif form == "lineTrap":
        p += [box("support-frame", w * 0.92, d * 0.76, 220, 0, 0), box("end-support-left", 180, d * 0.5, h * 0.7, -sx * 0.68, 0, 220), box("end-support-right", 180, d * 0.5, h * 0.7, sx * 0.68, 0, 220)]
        for i in range(5):
            p.append(cyl(f"coil-turn-{i + 1}", h * 0.62, w * (0.36 - i * 0.035), 0, 0, 250 + i * 42))
        p += [box("terminal-pad-left", 300, 340, 150, -sx * 0.82, 0, h - 150), box("terminal-pad-right", 300, 340, 150, sx * 0.82, 0, h - 150)]
    elif form == "grading":
        p += [box("base", w * 0.68, d * 0.68, 220, 0, 0), cyl("support", h * 0.66, 105, 0, 0, 220), box("ring-side-left", w, 130, 130, -sx * 0.3, 0, h * 0.83), box("ring-side-right", w, 130, 130, sx * 0.3, 0, h * 0.83), box("ring-top", w * 0.62, d * 0.62, 130, 0, 0, h * 0.93), box("terminal", 230, 230, 170, 0, 0, h - 170)]
    elif form == "termination":
        p += [box("base", w, d, 210, 0, 0), cyl("cable-riser", h * 0.34, w * 0.16, 0, 0, 210)]
        for i in range(6):
            p.append(cyl(f"stress-cone-shed-{i + 1}", 100, w * (0.29 if i % 2 == 0 else 0.24), 0, 0, h * (0.34 + i * 0.08)))
        p += [box("terminal-pad", w * 0.5, d * 0.48, 170, 0, 0, h - 170), box("cable-clamp", w * 0.42, d * 0.42, 180, 0, 0, 230)]
    elif form == "transformer":
        p += [box("transport-base", w, d * 0.84, 320, 0, 0)]
        tank_w, tank_d, tank_h = w * 0.62, d * 0.66, h * 0.54
        p += [box("main-tank", tank_w, tank_d, tank_h, 0, 0, 320), box("tank-cover", tank_w * 1.06, tank_d * 1.06, 180, 0, 0, 320 + tank_h)]
        for i in range(7):
            x = -tank_w * 0.48 + i * tank_w * 0.16
            p += [box(f"cooler-fin-left-{i + 1}", 100, d * 0.2, tank_h * 0.78, -tank_w * 0.62, 0, 430), box(f"cooler-fin-right-{i + 1}", 100, d * 0.2, tank_h * 0.78, tank_w * 0.62, 0, 430)]
        p += [box("conservator", tank_w * 0.62, tank_d * 0.28, 280, 0, -tank_d * 0.48, h * 0.84), box("conservator-pipe", 180, tank_d * 0.16, h * 0.28, 0, -tank_d * 0.35, h * 0.6)]
        for i in range(4):
            x = -tank_w * 0.34 + i * tank_w * 0.22
            p += [cyl(f"bushing-{i + 1}", h * (0.24 if subtype == "main" else 0.2), 145, x, tank_d * 0.12, 320 + tank_h + 180)]
        for x in (-w * 0.31, w * 0.31):
            for y in (-d * 0.29, d * 0.29):
                p.append(wheel("transport-wheel", 260, 205, x, y, 0))
    elif form == "radiator":
        p += [box("lower-header", w, d * 0.5, 180, 0, 0), box("upper-header", w, d * 0.5, 180, 0, h - 180)]
        for i in range(10):
            x = -sx * 0.88 + i * w * 0.176
            p.append(box(f"radiator-fin-{i + 1}", 95, d * 0.68, h - 360, x, 0, 180))
        p += [box("inlet-manifold", 220, d * 0.25, h * 0.75, -sx + 110, 0, 180), box("outlet-manifold", 220, d * 0.25, h * 0.75, sx - 110, 0, 180)]
    elif form == "fan":
        p += [box("fan-skid", w, d, 220, 0, 0), box("fan-guard", w * 0.86, 220, h * 0.72, 0, -sy * 0.55, 220)]
        for i in range(3):
            x = (i - 1) * w * 0.28
            p += [cyl(f"fan-housing-{i + 1}", 240, d * 0.32, x, 0, h * 0.42), box(f"fan-motor-{i + 1}", w * 0.16, d * 0.42, h * 0.24, x, sy * 0.25, 250)]
    elif form == "oilTank":
        p += [box("saddle-left", w * 0.15, d * 0.72, h * 0.36, -w * 0.27, 0), box("saddle-right", w * 0.15, d * 0.72, h * 0.36, w * 0.27, 0)]
        p += [drum("vessel-shell", w * 0.72, d * 0.27, 0, 0, h * 0.34), box("end-cap-left", 150, d * 0.65, h * 0.46, -w * 0.34, 0, h * 0.32), box("end-cap-right", 150, d * 0.65, h * 0.46, w * 0.34, 0, h * 0.32), box("level-gauge", 170, 120, h * 0.36, sx * 0.46, sy * 0.42, h * 0.44), box("top-nozzle", 220, 220, 250, 0, 0, h - 250)]
    elif form == "bushing":
        p += [box("turret-frame", w, d, 350, 0, 0), box("mounting-cap", w * 0.88, d * 0.88, 180, 0, 0, 350)]
        for i in range(3):
            x = (i - 1) * w * 0.3
            p += [cyl(f"bushing-core-{i + 1}", h * 0.68, 105, x, 0, 530)]
            for ring in range(5):
                p.append(cyl(f"bushing-shed-{i + 1}-{ring + 1}", 80, 185, x, 0, 700 + ring * h * 0.115))
            p.append(box(f"terminal-{i + 1}", 230, 230, 150, x, 0, h - 150))
    elif form == "cabinet":
        if subtype == "kiosk":
            p += [box("plinth", w, d, 320, 0, 0), box("walk-in-shell", w * 0.94, d * 0.9, h - 620, 0, 0, 320), box("roof-overhang", w * 1.08, d * 1.05, 180, 0, 0, h - 300), box("entry-step", w * 0.32, d * 0.3, 140, -w * 0.24, sy * 0.66, 0)]
            p += [box("left-door", w * 0.27, 95, h * 0.57, -w * 0.19, -sy * 0.91, 400), box("right-door", w * 0.27, 95, h * 0.57, w * 0.19, -sy * 0.91, 400)]
            for i in range(6):
                p.append(box(f"vent-slat-{i + 1}", w * 0.28, 80, 45, w * 0.28, -sy * 0.94, 650 + i * 85))
        elif subtype == "relay-rack":
            p += [box("rack-base", w, d, 180, 0, 0), box("left-rail", 120, 120, h - 180, -sx * 0.78, 0, 180), box("right-rail", 120, 120, h - 180, sx * 0.78, 0, 180)]
            for i in range(5):
                z = 260 + i * (h - 500) / 5
                p += [box(f"shelf-{i + 1}", w * 0.82, d, 90, 0, 0, z), box(f"relay-module-{i + 1}", w * 0.55, d * 0.72, 160, 0, 0, z + 90)]
        elif subtype == "stick-store":
            p += [box("wall-back", w, 120, h, 0, sy * 0.42), box("lower-shelf", w, d, 150, 0, 0), box("upper-shelf", w, d, 150, 0, 0, h - 150)]
            for i in range(7):
                x = -sx * 0.82 + i * w * 0.137
                p.append(box(f"stick-bay-{i + 1}", 95, d * 0.42, h * 0.68, x, 0, h * 0.16))
        else:
            p += [box("plinth", w, d, 220, 0, 0), box("cabinet-body", w * 0.92, d * 0.86, h - 360, 0, 0, 220), box("rain-hood", w * 1.04, d * 1.02, 140, 0, 0, h - 140)]
            panel_count = 2 if subtype in ("drive", "rtu", "recorder") else (4 if subtype in ("dc-panel", "ac-board", "mimic") else 1)
            door_w = w * 0.84 / panel_count
            for i in range(panel_count):
                x = -w * 0.42 + door_w * (i + 0.5)
                p.append(box(f"front-panel-{i + 1}", door_w * 0.88, 75, h * 0.72, x, -sy * 0.88, h * 0.14))
                p.append(box(f"handle-{i + 1}", 45, 75, h * 0.13, x + door_w * 0.28, -sy * 0.94, h * 0.45))
            if subtype in ("charger", "rtu", "fiber"):
                for i in range(5):
                    p.append(box(f"vent-{i + 1}", w * 0.55, 70, 38, 0, -sy * 0.92, h * 0.3 + i * 72))
        if subtype not in ("kiosk", "relay-rack", "stick-store"):
            p.append(box("cable-entry-plinth", w * 0.46, d * 0.32, 150, 0, sy * 0.33, 0))
    elif form == "battery":
        p += [box("rack-foot-left", 150, d, 200, -sx * 0.78, 0), box("rack-foot-right", 150, d, 200, sx * 0.78, 0), box("rack-post-left", 120, 120, h - 200, -sx * 0.78, 0, 200), box("rack-post-right", 120, 120, h - 200, sx * 0.78, 0, 200)]
        for shelf in range(2):
            z = 260 + shelf * h * 0.43
            p.append(box(f"shelf-{shelf + 1}", w, d, 110, 0, 0, z))
            for i in range(6):
                x = -sx * 0.82 + i * w * 0.164
                p.append(box(f"battery-{shelf + 1}-{i + 1}", w * 0.13, d * 0.74, h * 0.27, x, 0, z + 110))
    elif form == "console":
        p += [box("console-base", w * 0.86, d * 0.6, h * 0.48, 0, sy * 0.12), box("worktop", w, d, 150, 0, -sy * 0.08, h * 0.48)]
        for i in range(3):
            x = (i - 1) * w * 0.29
            p += [box(f"instrument-pedestal-{i + 1}", w * 0.26, d * 0.23, h * 0.25, x, sy * 0.23, h * 0.63), box(f"display-panel-{i + 1}", w * 0.24, 100, h * 0.18, x, sy * 0.2, h * 0.82)]
    elif form == "panel":
        p += [box("panel-plinth", w, d, 220, 0, 0), box("panel-body", w * 0.95, d * 0.85, h - 330, 0, 0, 220), box("panel-cap", w * 1.02, d * 0.92, 110, 0, 0, h - 110)]
        p += [box("meter-window", w * 0.48, 80, h * 0.28, 0, -sy * 0.88, h * 0.6), box("button-rail", w * 0.76, 85, 95, 0, -sy * 0.88, h * 0.34)]
        for i in range(5):
            p.append(box(f"button-{i + 1}", 60, 80, 75, -w * 0.3 + i * w * 0.15, -sy * 0.96, h * 0.34))
    elif form == "trench":
        wall = 170
        p += [box("trench-floor", w, d, 180, 0, 0), box("wall-left", w, wall, h - 180, 0, -sy + wall / 2, 180), box("wall-right", w, wall, h - 180, 0, sy - wall / 2, 180), box("end-left", wall, d, h - 180, -sx + wall / 2, 0, 180), box("end-right", wall, d, h - 180, sx - wall / 2, 0, 180)]
        for i in range(4):
            p.append(box(f"cable-run-{i + 1}", w * 0.84, 85, 85, 0, -sy * 0.55 + i * d * 0.33, 220 + i * 100))
    elif form == "cover":
        p += [box("cover-slab", w, d, h, 0, 0), box("edge-rib-front", w * 0.9, 75, 60, 0, -sy * 0.82, h), box("edge-rib-back", w * 0.9, 75, 60, 0, sy * 0.82, h)]
        for x in (-sx * 0.45, sx * 0.45):
            p.append(box("lifting-slot-lip", 200, 130, 60, x, 0, h))
    elif form == "tray":
        p += [box("stringer-left", w, 130, h, 0, -sy * 0.75), box("stringer-right", w, 130, h, 0, sy * 0.75)]
        for i in range(13):
            x = -sx * 0.9 + i * w * 0.15
            p.append(box(f"rung-{i + 1}", 95, d * 0.76, 90, x, 0, h * 0.32))
        for x in (-sx * 0.65, sx * 0.65):
            p.append(box("support-foot", 240, d * 0.38, h * 0.32, x, 0, 0))
    elif form == "pit":
        p += [box("pit-floor", w, d, 180, 0, 0), box("wall-front", w, 180, h - 180, 0, -sy + 90, 180), box("wall-back", w, 180, h - 180, 0, sy - 90, 180), box("wall-left", 180, d, h - 180, -sx + 90, 0, 180), box("wall-right", 180, d, h - 180, sx - 90, 0, 180), box("cover", w * 0.84, d * 0.84, 130, 0, 0, h - 130)]
        for x in (-sx, sx):
            p.append(box("conduit-stub", 300, 160, 180, x, 0, 260))
    elif form == "ground":
        p += [box("inspection-box", w, d, h * 0.72, 0, 0), box("cover-lid", w * 1.12, d * 1.12, 100, 0, 0, h * 0.72), cyl("ground-riser", h * 0.35, 75, 0, 0, h * 0.72)]
    elif form == "clamp":
        p += [box("base-plate", w, d, 90, 0, 0), box("jaw-left", 150, d * 0.6, h * 0.7, -sx * 0.52, 0, 90), box("jaw-right", 150, d * 0.6, h * 0.7, sx * 0.52, 0, 90), box("crossbolt", w * 0.8, 100, 100, 0, 0, h * 0.74)]
    elif form == "groundbar":
        p += [box("base", w * 0.9, d, 200, 0, 0), box("insulating-support-left", 220, 220, h * 0.58, -sx * 0.62, 0, 200), box("insulating-support-right", 220, 220, h * 0.58, sx * 0.62, 0, 200), box("ground-bar", w, 180, 180, 0, 0, h * 0.72)]
        for i in range(5):
            p.append(box(f"connection-pad-{i + 1}", 150, 280, 110, -sx * 0.72 + i * w * 0.36, 0, h * 0.86))
    elif form == "reel":
        p += [box("transport-chassis", w, d * 0.72, 220, 0, 0)]
        for x in (-sx * 0.56, sx * 0.56):
            p.append(box("reel-cheek", 160, d, h * 0.76, x, 0, 220))
        for x in (-sx * 0.38, sx * 0.38):
            for y in (-sy * 0.43, sy * 0.43):
                p.append(wheel("transport-wheel", 150, 170, x, y, 0))
        p += [drum("cable-drum", w * 0.67, h * 0.27, 0, 0, h * 0.36), box("axle", w * 0.68, 180, 180, 0, 0, h * 0.53)]
    elif form == "cart":
        p += [box("cart-chassis", w, d * 0.74, 220, 0, 0)]
        for x in (-sx * 0.72, sx * 0.72):
            for y in (-sy * 0.72, sy * 0.72):
                p.append(wheel("caster", d * 0.25, 150, x, y, 0))
        if subtype == "service":
            p += [box("hydraulic-unit", w * 0.58, d * 0.56, h * 0.5, 0, 0, 220), cyl("oil-reservoir", h * 0.42, w * 0.12, sx * 0.34, sy * 0.17, 220), box("hose-reel", w * 0.2, d * 0.25, h * 0.42, -sx * 0.35, 0, 220)]
        elif subtype == "timing-test":
            p += [box("instrument-case", w * 0.68, d * 0.64, h * 0.5, 0, 0, 220), box("analyzer-face", w * 0.58, 90, h * 0.25, 0, -sy * 0.46, h * 0.62), box("handle", w * 0.58, 100, 100, 0, sy * 0.25, h - 100)]
        else:
            p += [box("test-instrument", w * 0.68, d * 0.58, h * 0.44, 0, 0, 220), box("instrument-face", w * 0.58, 90, h * 0.24, 0, -sy * 0.44, h * 0.57), box("lead-bracket", w * 0.17, d * 0.18, h * 0.48, sx * 0.35, sy * 0.32, 220)]
        p += [box("push-handle-left", 90, 100, h * 0.5, -sx * 0.78, sy * 0.3, 220), box("push-handle-right", 90, 100, h * 0.5, sx * 0.78, sy * 0.3, 220), box("handle-crossbar", w * 0.72, 100, 100, 0, sy * 0.3, h * 0.66)]
    elif form == "testdiv":
        for i, x in enumerate((-sx * 0.72, sx * 0.72)):
            p.append(box(f"tripod-leg-{i + 1}", 170, d * 0.24, h * 0.34, x, 0, 0))
        p += [box("tripod-hub", w * 0.66, d * 0.72, 220, 0, 0, h * 0.28), cyl("divider-column", h * 0.54, w * 0.16, 0, 0, h * 0.46)]
        for i in range(6):
            p.append(cyl(f"divider-shed-{i + 1}", 95, w * 0.31, 0, 0, h * (0.5 + i * 0.072)))
        p.append(box("top-terminal", 240, 240, 170, 0, 0, h - 170))
    elif form == "barrier":
        p += [box("lower-rail", w, 130, 130, 0, 0, h * 0.22), box("upper-rail", w, 150, 160, 0, 0, h * 0.68)]
        for i, x in enumerate((-sx * 0.9, -sx * 0.3, sx * 0.3, sx * 0.9)):
            p.append(box(f"upright-{i + 1}", 120, 130, h * 0.62, x, 0, h * 0.2))
        for x in (-sx * 0.8, sx * 0.8):
            p.append(box("foot", 420, d, 150, x, 0, 0))
    elif form == "chainGate":
        for x in (-sx * 0.82, sx * 0.82):
            p += [box("bollard-base", 420, d, 220, x, 0), cyl("bollard", h - 220, 110, x, 0, 220), box("chain-lug", 240, 220, 130, x, 0, h - 420)]
        p += [box("chain-link", w * 0.72, 110, 95, 0, 0, h * 0.66)]
    elif form == "fire":
        p += [box("rack-base", w, d, 200, 0, 0), box("top-retainer", w, d, 160, 0, 0, h - 160)]
        for i in range(5):
            x = -sx * 0.8 + i * w * 0.4
            p += [cyl(f"cylinder-{i + 1}", h * 0.72, d * 0.18, x, 0, 200), box(f"valve-{i + 1}", 170, 200, 130, x, 0, h * 0.84)]
        p += [box("manifold-header", w * 0.92, 150, 160, 0, sy * 0.25, h * 0.92)]
    elif form == "fireMonitor":
        p += [box("pedestal-foot", w, d, 250, 0, 0), cyl("standpipe", h * 0.62, 140, 0, 0, 250), box("monitor-body", w * 0.55, d * 0.42, 280, 0, 0, h * 0.75), box("nozzle", w * 0.5, d * 0.25, 190, 0, -sy * 0.5, h * 0.84)]
        p += [box("handle-left", 90, d * 0.78, 120, -sx * 0.52, 0, h * 0.72), box("handle-right", 90, d * 0.78, 120, sx * 0.52, 0, h * 0.72)]
    elif form == "separator":
        p += [box("bund-base", w, d, 260, 0, 0), box("vessel", w * 0.72, d * 0.58, h * 0.54, 0, 0, 260), box("access-cover-left", w * 0.2, d * 0.3, 130, -sx * 0.26, 0, h * 0.75), box("access-cover-right", w * 0.2, d * 0.3, 130, sx * 0.26, 0, h * 0.75)]
        p += [box("inlet-pipe", w * 0.3, 180, 180, -sx * 0.54, 0, h * 0.57), box("outlet-pipe", w * 0.3, 180, 180, sx * 0.54, 0, h * 0.57), box("sampling-box", w * 0.2, d * 0.23, h * 0.33, sx * 0.48, sy * 0.36, 260)]
    elif form == "light":
        p += [box("base-plate", w, d, 300, 0, 0), cyl("mast-pole", h - 300, 115, 0, 0, 300), box("outreach-arm", w * 1.45, 170, 160, w * 0.48, 0, h - 620), box("luminaire", w * 0.72, d * 0.44, 220, w * 1.05, 0, h - 840)]
    elif form == "platform":
        p += [box("deck", w, d, 180, 0, 0, h - 180), box("toe-board-front", w, 100, 170, 0, -sy + 50, h - 350), box("toe-board-back", w, 100, 170, 0, sy - 50, h - 350)]
        for x in (-sx * 0.82, sx * 0.82):
            for y in (-sy * 0.78, sy * 0.78):
                p.append(box("support-leg", 150, 150, h - 180, x, y, 0))
        for x in (-sx * 0.82, sx * 0.82):
            p.append(box("guardrail-post", 110, 110, h * 0.52, x, sy * 0.25, h - 180))
        p += [box("top-rail", w, 110, 110, 0, sy * 0.25, h - 300), box("mid-rail", w, 90, 90, 0, sy * 0.25, h - 650), box("access-step", w * 0.32, d * 0.32, 160, -sx * 0.6, -sy * 0.2, 0)]
    elif form == "canopy":
        for x in (-sx * 0.82, sx * 0.82):
            for y in (-sy * 0.78, sy * 0.78):
                p.append(box("canopy-post", 170, 170, h - 300, x, y, 0))
        p += [box("roof-frame-front", w, 220, 180, 0, -sy * 0.78, h - 300), box("roof-frame-back", w, 220, 180, 0, sy * 0.78, h - 300), box("roof-frame-left", 220, d * 0.78, 180, -sx * 0.82, 0, h - 300), box("roof-frame-right", 220, d * 0.78, 180, sx * 0.82, 0, h - 300), box("roof-cover", w * 1.08, d * 1.08, 180, 0, 0, h - 180)]
        for x in (-sx * 0.76, sx * 0.76):
            p.append(box("corner-brace", w * 0.15, 130, 130, x, -sy * 0.55, h * 0.56))
    elif form == "breather":
        p += [box("mount-foot", w, d, 170, 0, 0), cyl("glass-vessel", h * 0.56, w * 0.26, 0, 0, 170), cyl("neck", h * 0.18, w * 0.14, 0, 0, h * 0.72), box("top-cap", w * 0.48, d * 0.48, 140, 0, 0, h - 140), box("mount-bracket", w * 0.72, 130, 180, 0, sy * 0.46, h * 0.26)]
    elif form == "pressure":
        p += [box("flange", w, d, 180, 0, 0), cyl("valve-body", h * 0.52, w * 0.3, 0, 0, 180), box("bonnet", w * 0.56, d * 0.56, 230, 0, 0, h * 0.64), box("indicator-cap", w * 0.42, d * 0.42, 200, 0, 0, h - 200), box("side-port", w * 0.24, d * 0.5, 180, sx * 0.55, 0, h * 0.42)]
    elif form == "oilSample":
        p += [box("cabinet-base", w, d, 180, 0, 0), box("sample-cabinet", w * 0.72, d * 0.7, h * 0.7, 0, 0, 180), box("work-shelf", w * 0.84, d * 0.35, 120, 0, -sy * 0.62, h * 0.53), box("drip-tray", w * 0.78, d * 0.72, 70, 0, 0, 200)]
        for i in range(3):
            p.append(cyl(f"sample-bottle-{i + 1}", h * 0.28, 95, -sx * 0.34 + i * w * 0.34, 0, h * 0.55))
    elif form == "firewall":
        for i in range(4):
            x = -sx * 0.76 + i * w * 0.51
            p += [box(f"panel-{i + 1}", w * 0.26, d, h * 0.88, x, 0, 250), box(f"panel-foot-{i + 1}", w * 0.28, d * 1.4, 250, x, 0, 0)]
        p += [box("top-cap", w, d * 1.08, 150, 0, 0, h - 150)]
    elif form == "bund":
        wall = 190
        p += [box("base-slab", w, d, 180, 0, 0), box("curb-front", w, wall, h - 180, 0, -sy + wall / 2, 180), box("curb-back", w, wall, h - 180, 0, sy - wall / 2, 180), box("curb-left", wall, d, h - 180, -sx + wall / 2, 0, 180), box("curb-right", wall, d, h - 180, sx - wall / 2, 0, 180), box("drain-sump", w * 0.17, d * 0.18, 160, sx * 0.62, sy * 0.58, 180)]
        for i in range(6):
            p.append(box(f"grate-panel-{i + 1}", w * 0.12, d * 0.7, 45, -sx * 0.68 + i * w * 0.27, 0, 181))
    elif form == "bogie":
        p += [box("frame", w, d * 0.54, h * 0.36, 0, 0, h * 0.38), box("crossmember-front", w * 0.8, d * 0.9, 180, 0, -sy * 0.57, h * 0.3), box("crossmember-back", w * 0.8, d * 0.9, 180, 0, sy * 0.57, h * 0.3)]
        for x in (-sx * 0.62, sx * 0.62):
            for y in (-sy * 0.62, sy * 0.62):
                p.append(wheel("rail-wheel", 260, h * 0.2, x, y, 0))
        for y in (-sy * 0.7, sy * 0.7):
            p.append(box("rail-shoe", w * 0.92, 220, 160, 0, y, 0))
    elif form == "pump":
        p += [box("skid-base", w, d, 220, 0, 0), box("pump-housing", w * 0.32, d * 0.46, h * 0.43, -sx * 0.34, 0, 220), cyl("motor", h * 0.48, w * 0.17, sx * 0.25, 0, 220), box("coupling-guard", w * 0.18, d * 0.5, h * 0.28, -w * 0.02, 0, 250), box("suction-pipe", w * 0.7, 170, 170, -sx * 0.18, -sy * 0.53, h * 0.48), box("discharge-pipe", w * 0.5, 170, 170, -sx * 0.34, sy * 0.45, h * 0.73)]
        for x in (-sx * 0.35, sx * 0.42):
            p.append(box("pipe-support", 160, 160, h * 0.48, x, sy * 0.48, 220))
    else:
        raise ValueError(f"unknown model form {form}")
    names = {}
    unique = []
    for part in p:
        name = part[1]
        names[name] = names.get(name, 0) + 1
        if names[name] > 1:
            part = (part[0], f"{name}-{names[name]}", *part[2:])
        unique.append(part)
    return unique


def fmt(value):
    return str(int(value)) if float(value).is_integer() else f"{value:.2f}"


def source(asset):
    asset_id, title, group, form, dims, description, subtype = asset
    w, d, h = dims
    parts = recipe(form, subtype, w, d, h)
    used = {part[0] for part in parts}
    calls = []
    for part in parts:
        if part[0] == "B":
            _, name, size, pos = part
            calls.append(f'B("{name}", [{", ".join(map(fmt, size))}], [{", ".join(map(fmt, pos))}]);')
        elif part[0] == "C":
            _, name, height, radius, pos = part
            calls.append(f'C("{name}", {fmt(height)}, {fmt(radius)}, [{", ".join(map(fmt, pos))}]);')
        elif part[0] == "CY":
            _, name, length, radius, pos = part
            calls.append(f'CY("{name}", {fmt(length)}, {fmt(radius)}, [{", ".join(map(fmt, pos))}]);')
        else:
            _, name, length, radius, pos = part
            calls.append(f'CX("{name}", {fmt(length)}, {fmt(radius)}, [{", ".join(map(fmt, pos))}]);')
    helpers = []
    if "B" in used or "C" in used or "CY" in used:
        helpers.append('''const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));
};''')
    if "B" in used:
        helpers.append('''const B = (name: string, size: [number, number, number], at: [number, number, number]) => {
  place(name, box(size[0], size[1], size[2], true), [at[0], at[1], at[2] + size[2] / 2]);
};''')
    if "C" in used:
        helpers.append('''const C = (name: string, height: number, radius: number, at: [number, number, number]) => {
  place(name, cylinder(height, radius, 10), at);
};''')
    if "CY" in used:
        helpers.append('''const CY = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([1, 0, 0], 90);
  place(name, shape, [at[0], at[1] + length / 2, at[2] + radius]);
};''')
    if "CX" in used:
        helpers.append('''const CX = (name: string, length: number, radius: number, at: [number, number, number]) => {
  const shape = cylinder(length, radius, 10).rotate([0, 1, 0], 90);
  place(name, shape, [at[0] - length / 2, at[1], at[2] + radius]);
};''')
    text = f'''// Original grid substation scene asset. Millimetres, Z up, base origin.
meta({{
  name: "{asset_id}",
  license: "CC0-1.0",
  title: "{title}",
  description: "{description} Editable overall scale and asset color.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "low poly", "CC0", "{group.lower()}"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
}});

const scale = param("scale", 1, {{ label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 }});
const color = param("color", "#73828b", {{ label: "Asset color" }});
const p = assembly("{asset_id}");

{chr(10).join(helpers)}

{chr(10).join(calls)}

return p.model();
'''
    return text


ids = [item[0] for item in ASSETS]
if len(ids) != len(set(ids)):
    raise SystemExit("duplicate ids in generator")
for asset in ASSETS:
    target = KIT / f"{asset[0]}.kcad.ts"
    target.write_text(source(asset), encoding="utf-8")

kit = {
    "title": "Grid Substation",
    "description": "Visualization assets for utility substation line bays, switching apparatus, transformer auxiliaries, protection and control, cable routes, and yard maintenance.",
}
(KIT / "kit.json").write_text(json.dumps(kit, indent=2) + "\n", encoding="utf-8")
groups = {}
for asset in ASSETS:
    groups.setdefault(asset[2], []).append(asset)
sections = []
for group, assets in groups.items():
    entries = ", ".join(f"`{asset[1]}` (`{asset[0]}`)" for asset in assets)
    sections.append(f"## {group}\n\n{entries}.\n")
readme = f'''# Grid Substation kit

Eighty original low-poly scene assets for a utility substation yard. Sources use millimetres and Z up. Each asset exposes overall scale and asset color, uses one material, and declares a 1,800-triangle ceiling. All geometry is dedicated to the public domain under CC0 1.0.

{chr(10).join(sections)}
## Preview and verification

The [grid substation wave bundle](../../../artifacts/catalog-demos/grid-substation-wave-20261103/README.md) records generated sources, catalog previews, local audits, and the inspected MP4 walkthrough.

These are generic visualization props. They do not specify voltage or current ratings, clearances, fault performance, switching procedures, electrical safety, grid compliance, or operational acceptance. Catalog checks do not establish electrical or field safety.
'''
(KIT / "README.md").write_text(readme, encoding="utf-8")
print(f"generated {len(ASSETS)} grid-substation assets in {KIT}")
