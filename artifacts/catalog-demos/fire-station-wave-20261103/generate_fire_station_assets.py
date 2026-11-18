#!/usr/bin/env python3
"""Generate original low-poly fire-station scene assets."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "fire-station"


def B(name, w, d, h, x, y, z, rot=None):
    return ("box", name, (w, d, h), (x, y, z), rot)


def C(name, h, r, x, y, z, segments=10, axis=None, degrees=0):
    return ("cylinder", name, (h, r, segments), (x, y, z), axis, degrees)


def asset(id, title, description, color, parts, origin="base"):
    return {"id": id, "title": title, "description": description, "color": color, "parts": parts, "origin": origin}


ASSETS = [
    asset("apparatus-bay-sectional-door", "Apparatus bay sectional door", "Full-height sectional door assembly with side guides, horizontal panels and upper vision lites.", "#778786", [
        B("left-guide", 100, 100, 3300, -1650, 0, 1650), B("right-guide", 100, 100, 3300, 1650, 0, 1650),
        B("door-leaf", 3100, 75, 2800, 0, 0, 1450),
        *[B(f"door-seam-{i}", 3100, 18, 18, 0, -48, 280 + i * 330) for i in range(1, 8)],
        *[B(f"vision-lite-{i}", 430, 18, 220, -1080 + i * 720, -50, 2470) for i in range(1, 4)],
        B("header", 3400, 140, 180, 0, 0, 3210),
    ]),
    asset("bay-door-control-station", "Bay door control station", "Wall-mounted open, stop and close controls with a protected manual-release handle.", "#6d8580", [
        B("backplate", 270, 70, 430, 0, 0, 1500), B("control-face", 205, 24, 330, 0, -44, 1500),
        *[C(f"button-{i}", 24, 28, -62 + i * 62, -66, 1600, 8, [1, 0, 0], 90) for i in range(3)],
        B("release-cover", 92, 18, 150, 90, -62, 1430),
    ], origin="wall"),
    asset("bay-warning-beacon", "Bay warning beacon", "Wall-mounted red and green signal lamps for a vehicle bay opening.", "#8b6b5c", [
        B("wall-plate", 180, 48, 420, 0, 0, 1850), C("lower-lamp", 150, 82, 0, -35, 1730, 10),
        C("upper-lamp", 150, 82, 0, -35, 1970, 10), B("hood-lower", 190, 110, 24, 0, -24, 1815),
        B("hood-upper", 190, 110, 24, 0, -24, 2055),
    ], origin="wall"),
    asset("apparatus-bay-bollard", "Apparatus bay bollard", "Heavy floor bollard with a broad anchor plate and high-visibility upper sleeve.", "#d09b51", [
        C("post", 900, 85, 0, 0, 0, 12), C("reflective-band", 110, 91, 0, 0, 620, 12),
        B("anchor-foot", 260, 260, 90, 0, 0, 45),
    ]),
    asset("bay-column-protector", "Bay column protector", "Low two-sided guard around a structural post with beveled top caps.", "#d09b51", [
        B("front-guard", 700, 105, 620, 0, -205, 310), B("side-guard", 105, 520, 620, -298, 0, 310),
        B("top-cap-front", 730, 125, 48, 0, -205, 596), B("top-cap-side", 125, 520, 48, -298, 0, 596),
        *[B(f"stripe-{i}", 68, 18, 400, -245 + i * 145, -265, 310, [0, 0, -20]) for i in range(4)],
    ]),
    asset("apparatus-exhaust-capture-rail", "Apparatus exhaust capture rail", "Ceiling-suspended rail, trolley and hose drop for a vehicle exhaust capture line.", "#788985", [
        B("ceiling-rail", 4200, 130, 120, 0, 0, 0), B("hanger-left", 90, 90, 650, -1700, 0, 385),
        B("hanger-right", 90, 90, 650, 1700, 0, 385), B("trolley", 260, 220, 135, 0, 0, -115),
        C("hose-drop", 1700, 52, 0, 0, -1830, 12), B("nozzle-hanger", 280, 86, 72, 0, -15, -1860),
    ], origin="ceiling"),
    asset("retractable-exhaust-hose-reel", "Retractable exhaust hose reel", "Ceiling hose reel with a compact motor housing, hose loop and tailpipe connector.", "#697d7d", [
        B("motor-box", 420, 310, 260, 0, 0, 0), C("reel-drum", 240, 180, 0, 0, -210, 12, [1, 0, 0], 90),
        C("hose", 920, 28, 0, -95, -1280, 10), B("tailpipe-coupler", 145, 145, 185, 0, -105, -1370),
        B("mount-plate", 520, 420, 45, 0, 0, 140),
    ], origin="ceiling"),
    asset("exhaust-capture-nozzle", "Exhaust capture nozzle", "Flexible tailpipe capture head with a tapered socket and hanging handle.", "#697b78", [
        C("socket", 210, 90, 0, 0, 0, 12), C("neck", 180, 48, 0, 0, 190, 10),
        B("handle", 340, 42, 42, 0, 90, 340), B("grip", 120, 54, 45, 0, 90, 340),
        B("hose-collar", 145, 145, 55, 0, 0, 208),
    ]),
    asset("bay-trench-drain", "Apparatus bay trench drain", "Long grated drain channel with end outlet and removable grate panels.", "#687978", [
        B("channel-body", 3600, 210, 150, 0, 0, 75),
        *[B(f"grate-panel-{i}", 440, 204, 24, -1500 + i * 500, 0, 162) for i in range(7)],
        *[B(f"grate-slot-{i}", 18, 185, 10, -1650 + i * 95, 0, 180) for i in range(35)],
        C("outlet", 200, 58, 0, 0, 0, 12),
    ]),
    asset("bay-washdown-hose-reel", "Bay washdown hose reel", "Wall reel with a circular hose drum, swivel mount, spray hose and pistol grip.", "#668b88", [
        B("mount-plate", 300, 75, 380, 0, 0, 1350), C("drum", 110, 220, 0, -55, 1350, 12, [1, 0, 0], 90),
        C("hub", 90, 60, 0, -105, 1350, 10, [1, 0, 0], 90), C("hose", 720, 22, 0, -90, 630, 10),
        B("spray-grip", 70, 60, 260, 0, -110, 590), C("trigger", 80, 16, 0, -150, 510, 8),
    ], origin="wall"),
    asset("bay-utility-hose-station", "Bay utility hose station", "Wall-mounted compressed-air and water hose outlets with two short reel lines.", "#7b8980", [
        B("panel", 500, 65, 420, 0, 0, 1450), B("shelf", 600, 200, 52, 0, -105, 1214),
        *[C(f"outlet-{i}", 48, 34, x, -45, 1510, 8, [1, 0, 0], 90) for i, x in enumerate([-150, 0, 150])],
        *[C(f"hose-loop-{i}", 36, 165, x, -105, 1820, 10, [1, 0, 0], 90) for i, x in enumerate([-150, 150])],
    ], origin="wall"),
    asset("fire-hose-washing-machine", "Fire hose washing machine", "Station hose washer with feed rollers, covered wash chamber and drain tray.", "#69817f", [
        B("base", 1000, 760, 180, 0, 0, 90), B("wash-cabinet", 840, 580, 650, 0, 0, 505),
        B("front-door", 650, 30, 420, 0, -306, 545), *[C(f"feed-roller-{i}", 48, 82, -370 + i * 230, -335, 298, 10, [1, 0, 0], 90) for i in range(4)],
        B("top-control", 330, 28, 140, 280, -303, 870), B("drip-tray", 980, 760, 32, 0, 0, 196),
    ]),
    asset("hose-spin-dryer", "Hose spin dryer", "Vertical hose dryer with a guarded drum, top lid and drain foot.", "#6b8382", [
        B("base", 640, 640, 140, 0, 0, 70), C("drum", 760, 285, 0, 0, 0, 12),
        B("door-frame", 390, 48, 470, 0, -292, 510), B("lid", 650, 650, 70, 0, 0, 905),
        C("status-light", 90, 32, 250, -295, 870, 8),
    ]),
    asset("hose-drying-tower", "Hose drying tower", "Freestanding hose drying frame with an overhead spreader and four hanging bays.", "#788985", [
        B("foot-left", 260, 360, 100, -470, 0, 50), B("foot-right", 260, 360, 100, 470, 0, 50),
        B("mast-left", 80, 80, 3100, -470, 0, 1600), B("mast-right", 80, 80, 3100, 470, 0, 1600),
        B("top-spreader", 1120, 180, 100, 0, 0, 3060),
        *[C(f"hose-hook-{i}", 180, 24, x, 0, 2920, 8) for i, x in enumerate([-360, -120, 120, 360])],
    ]),
    asset("boot-wash-scrubber", "Boot wash scrubber", "Low boot-cleaning station with two tread brushes, splash guards and a drain pan.", "#72857e", [
        B("pan", 760, 520, 90, 0, 0, 45), B("left-brush", 230, 400, 180, -175, 0, 180),
        B("right-brush", 230, 400, 180, 175, 0, 180), B("rear-splash", 760, 48, 260, 0, 230, 220),
        *[B(f"brush-ridge-{i}", 28, 355, 16, -245 + i * 70, 0, 278) for i in range(8)],
    ]),
    asset("decon-shower-stall", "Decontamination shower stall", "Open shower bay with a raised pan, three-sided splash screen and overhead spray.", "#71817d", [
        B("shower-pan", 1100, 1000, 80, 0, 0, 40), B("rear-screen", 1100, 50, 2100, 0, 475, 1130),
        B("left-screen", 50, 950, 2100, -525, 0, 1130), B("right-screen", 50, 950, 2100, 525, 0, 1130),
        C("shower-riser", 1720, 28, 0, 350, 0, 10), C("shower-head", 56, 115, 0, 350, 1700, 10, [1, 0, 0], 90),
        B("grab-bar", 700, 44, 44, 0, 420, 920),
    ]),
    asset("decon-eyewash-station", "Decontamination eyewash station", "Floor eyewash pedestal with paired spray heads and a catch bowl.", "#759187", [
        B("base", 400, 360, 100, 0, 0, 50), C("pedestal", 760, 38, 0, 0, 0, 10),
        C("bowl", 80, 150, 0, 0, 735, 12), C("spray-head-left", 42, 52, -92, -34, 820, 8),
        C("spray-head-right", 42, 52, 92, -34, 820, 8), B("pull-handle", 320, 22, 32, 0, -70, 640),
    ]),
    asset("transition-zone-airlock-bench", "Transition zone airlock bench", "Compact wipe-clean bench with boot shelves and a dividing rail for gear transitions.", "#827f72", [
        B("seat", 1400, 440, 70, 0, 0, 520), *[B(f"leg-{i}", 70, 70, 500, x, y, 250) for i, (x, y) in enumerate([(-620, -150), (620, -150), (-620, 150), (620, 150)])],
        B("lower-shelf", 1280, 360, 45, 0, 0, 205), B("divider", 40, 430, 1100, 0, 205, 550),
        *[B(f"boot-slot-{i}", 30, 335, 220, -510 + i * 170, 0, 110) for i in range(7)],
    ]),
    asset("contaminated-gear-bagging-cart", "Contaminated gear bagging cart", "Closed transport cart with segregated bag bins and a lid for recently used equipment.", "#857c69", [
        B("cart-body", 820, 620, 740, 0, 0, 420), B("lid", 860, 660, 70, 0, 0, 825),
        *[B(f"bin-front-{i}", 360, 35, 300, -205 + i * 410, -332, 270) for i in range(2)],
        *[C(f"caster-{i}", 42, 44, x, y, 0, 8) for i, (x, y) in enumerate([(-310, -220), (310, -220), (-310, 220), (310, 220)])],
        B("push-handle", 720, 45, 42, 0, 325, 800),
    ]),
    asset("dirty-laundry-drop-cabinet", "Dirty laundry drop cabinet", "Wall-mounted lined chute cabinet with a swing flap and bag-retention rim.", "#7d8278", [
        B("cabinet", 780, 360, 920, 0, 0, 1300), B("front", 720, 30, 760, 0, -194, 1300),
        B("drop-flap", 540, 36, 150, 0, -235, 1660, [12, 0, 0]), B("bag-rim", 620, 260, 40, 0, 0, 820),
        B("label-plate", 270, 24, 120, 0, -225, 1030),
    ], origin="wall"),
    asset("turnout-gear-extractor", "Turnout gear extractor", "Dedicated garment extractor with drum door, control panel and vibration feet.", "#738584", [
        B("base", 940, 900, 170, 0, 0, 85), B("cabinet", 860, 820, 1120, 0, 0, 730),
        C("door-rim", 48, 315, 0, -420, 790, 12, [1, 0, 0], 90), B("door-window", 26, 510, 510, 0, -435, 790),
        B("control-panel", 220, 35, 260, 260, -432, 1150),
        *[B(f"vibration-foot-{i}", 100, 100, 85, x, y, 42.5) for i, (x, y) in enumerate([(-340, -330), (340, -330), (-340, 330), (340, 330)])],
    ]),
    asset("turnout-gear-drying-cabinet", "Turnout gear drying cabinet", "Ventilated cabinet with hanging rails, perforated door and low drain tray.", "#6d8280", [
        B("base", 980, 700, 120, 0, 0, 60), B("cabinet", 900, 620, 1680, 0, 0, 960),
        B("left-door", 425, 32, 1570, -215, -326, 960), B("right-door", 425, 32, 1570, 215, -326, 960),
        *[C(f"hanger-rail-{i}", 760, 18, 0, -140 + i * 280, 0, 1670, 8) for i in range(2)],
        B("vent-grille", 620, 24, 115, 0, -330, 190),
    ]),
    asset("clean-turnout-gear-locker", "Clean turnout gear locker", "Tall clean-storage locker with helmet shelf, coat hooks and nameplate strip.", "#71847d", [
        B("cabinet", 780, 620, 1950, 0, 0, 975), B("door-left", 370, 35, 1850, -195, -325, 975),
        B("door-right", 370, 35, 1850, 195, -325, 975), B("nameplate", 240, 25, 90, 0, -350, 1810),
        *[C(f"hook-{i}", 86, 22, x, -355, 1300, 8, [1, 0, 0], 90) for i, x in enumerate([-130, 0, 130])],
    ]),
    asset("turnout-gear-open-drying-rack", "Turnout gear open drying rack", "Freestanding frame with four gear bays, boot shelves and hanging rails.", "#74827d", [
        *[B(f"upright-{i}", 48, 52, 1980, x, y, 990) for i, (x, y) in enumerate([(-670, -260), (-225, -260), (225, -260), (670, -260), (-670, 260), (-225, 260), (225, 260), (670, 260)])],
        B("top-rail-front", 1440, 48, 52, 0, -260, 1950), B("top-rail-back", 1440, 48, 52, 0, 260, 1950),
        B("boot-shelf", 1440, 560, 52, 0, 0, 90), *[C(f"hook-{i}", 110, 20, x, 0, 1840, 8) for i, x in enumerate([-500, -170, 170, 500])],
    ]),
    asset("gear-inspection-bench", "Gear inspection bench", "Durable inspection table with bright task-light mast, tool strip and shallow parts tray.", "#7e8981", [
        B("top", 1500, 760, 65, 0, 0, 860), *[B(f"leg-{i}", 70, 70, 825, x, y, 412.5) for i, (x, y) in enumerate([(-660, -300), (660, -300), (-660, 300), (660, 300)])],
        B("rear-tool-strip", 1380, 38, 110, 0, 340, 945), B("parts-tray", 500, 230, 70, 380, 130, 930),
        C("task-light-mast", 680, 22, -620, 235, 0, 8), B("task-light-head", 230, 165, 55, -620, 210, 700),
    ]),
    asset("scba-washing-machine", "SCBA washing machine", "Dedicated breathing-apparatus washer with sealed chamber, latch and cycle controls.", "#738481", [
        B("base", 960, 850, 160, 0, 0, 80), B("cabinet", 900, 760, 1320, 0, 0, 820),
        B("door-frame", 700, 42, 960, 0, -405, 820), B("door-window", 510, 20, 690, 0, -435, 840),
        B("control-panel", 250, 34, 250, 300, -408, 1240), C("latch", 65, 22, 0, -456, 820, 8, [1, 0, 0], 90),
    ]),
    asset("facepiece-drying-cabinet", "Facepiece drying cabinet", "Clean cabinet with individually spaced mask hooks and filtered-air vents.", "#70847f", [
        B("base", 800, 530, 100, 0, 0, 50), B("body", 740, 470, 1350, 0, 0, 775),
        B("door", 690, 28, 1240, 0, -248, 780),
        *[C(f"mask-hook-{i}", 120, 18, x, -270, 450 + (i % 2) * 450, 8) for i, x in enumerate([-260, -130, 0, 130, 260])],
        *[B(f"vent-{i}", 620, 20, 28, 0, -270, 250 + i * 105) for i in range(5)],
    ]),
    asset("scba-cylinder-drying-rack", "SCBA cylinder drying rack", "Wall rack for clean breathing-air cylinders with four cradles and retaining straps.", "#74847e", [
        B("backplate", 1400, 60, 820, 0, 0, 1320),
        *[C(f"cradle-{i}", 420, 82, x, -120, 1000, 10, [1, 0, 0], 90) for i, x in enumerate([-480, -160, 160, 480])],
        *[B(f"strap-{i}", 70, 45, 360, x, -180, 1310) for i, x in enumerate([-480, -160, 160, 480])],
        B("label-strip", 1220, 24, 105, 0, -44, 1740),
    ], origin="wall"),
    asset("scba-fill-control-panel", "SCBA fill control panel", "Wall panel with pressure gauges, fill-valve controls and guarded hose sockets.", "#667d7b", [
        B("backplate", 680, 70, 900, 0, 0, 1600), B("control-face", 610, 26, 780, 0, -48, 1600),
        *[C(f"gauge-{i}", 28, 75, x, -80, 1900, 10, [1, 0, 0], 90) for i, x in enumerate([-190, 0, 190])],
        *[C(f"fill-socket-{i}", 90, 30, x, -87, 1320, 8, [1, 0, 0], 90) for i, x in enumerate([-200, 0, 200])],
        B("instruction-card", 360, 18, 185, 0, -68, 1050),
    ], origin="wall"),
    asset("breathing-air-cascade-bank", "Breathing air cascade bank", "Three-cylinder high-pressure storage bank with shared header, gauges and protective frame.", "#6f817e", [
        *[C(f"storage-cylinder-{i}", 1650, 155, x, 0, 110, 12) for i, x in enumerate([-430, 0, 430])],
        *[B(f"frame-upright-{i}", 60, 95, 1850, x, 160, 925) for i, x in enumerate([-650, -215, 215, 650])],
        B("top-rail", 1360, 110, 70, 0, 160, 1840), B("header", 1270, 58, 58, 0, -60, 1570),
        *[C(f"gauge-{i}", 26, 58, x, -105, 1690, 10, [1, 0, 0], 90) for i, x in enumerate([-440, 0, 440])],
    ]),
    asset("scba-cylinder-storage-rack", "SCBA cylinder storage rack", "Floor rack with four upright cylinder bays, lower heel stops and retaining bar.", "#70827e", [
        B("base", 1500, 430, 90, 0, 0, 45), B("back-rail", 1500, 70, 1120, 0, 185, 650),
        *[B(f"divider-{i}", 42, 380, 1040, x, 0, 570) for i, x in enumerate([-540, -180, 180, 540])],
        *[C(f"heel-stop-{i}", 190, 88, x, -90, 90, 12) for i, x in enumerate([-540, -180, 180, 540])],
        B("retaining-bar", 1450, 55, 60, 0, 100, 1130),
    ]),
    asset("scba-cylinder-fill-bank", "SCBA cylinder fill bank", "Cylinder refill cabinet with guarded fill sockets and hinged blast-shield lid.", "#70827e", [
        B("base", 980, 760, 180, 0, 0, 90), B("cabinet", 900, 680, 780, 0, 0, 570),
        B("shield", 900, 80, 440, 0, 385, 690), B("top-cover", 980, 760, 70, 0, 0, 995),
        *[C(f"fill-port-{i}", 74, 32, x, -365, 610, 8, [1, 0, 0], 90) for i, x in enumerate([-300, -100, 100, 300])],
        B("pressure-display", 290, 34, 165, 0, -367, 820),
    ]),
    asset("contaminated-gear-rinse-sink", "Contaminated gear rinse sink", "Deep stainless rinse basin with backsplash, hose spray and lower storage shelf.", "#788c86", [
        B("basin", 1050, 620, 300, 0, 0, 900), B("front-apron", 1050, 60, 330, 0, -295, 615),
        B("backsplash", 1050, 60, 380, 0, 280, 1120), *[B(f"leg-{i}", 65, 65, 840, x, y, 420) for i, (x, y) in enumerate([(-440, -235), (440, -235), (-440, 235), (440, 235)])],
        B("lower-shelf", 910, 480, 45, 0, 0, 100), C("sprayer-neck", 360, 22, 180, 0, 1040, 8, [1, 0, 0], 90),
        C("spray-head", 120, 34, 180, -20, 940, 8, [1, 0, 0], 90),
    ]),
    asset("decon-chemical-cabinet", "Decontamination supply cabinet", "Labeled cabinet for segregated cleaning supplies with drip shelf and lockable doors.", "#827e70", [
        B("cabinet", 900, 520, 1800, 0, 0, 900), B("left-door", 430, 26, 1680, -220, -275, 900),
        B("right-door", 430, 26, 1680, 220, -275, 900), B("drip-shelf", 940, 560, 50, 0, 0, 70),
        *[B(f"shelf-{i}", 820, 470, 38, 0, 0, 420 + i * 390) for i in range(3)],
        B("lock", 45, 28, 95, 0, -300, 870),
    ]),
    asset("transition-zone-floor-mat", "Transition zone floor mat", "Low slip-resistant walk-off mat with a raised tread pattern and beveled rim.", "#706e5d", [
        B("mat", 1600, 920, 22, 0, 0, 11), *[B(f"tread-{i}", 28, 840, 6, -730 + i * 105, 0, 25) for i in range(14)],
        B("front-rim", 1600, 28, 28, 0, -460, 14), B("back-rim", 1600, 28, 28, 0, 460, 14),
    ]),
    asset("hot-zone-boundary-sign", "Hot-zone boundary sign", "Wall sign marking the transition from apparatus contamination zone to clean spaces.", "#b07a57", [
        B("sign-panel", 920, 48, 440, 0, 0, 1660), B("top-header", 920, 70, 100, 0, 0, 1930),
        B("left-mount", 60, 90, 120, -380, 30, 1350), B("right-mount", 60, 90, 120, 380, 30, 1350),
        *[B(f"zone-bar-{i}", 180, 28, 38, -280 + i * 280, -28, 1540) for i in range(3)],
    ], origin="wall"),
    asset("decon-shower-control-station", "Decontamination shower controls", "Wall control panel with separate rinse and soap valves and a temperature dial.", "#71817d", [
        B("mount-plate", 350, 56, 520, 0, 0, 1450), B("face", 285, 24, 430, 0, -40, 1450),
        *[C(f"valve-{i}", 38, 52, x, -66, 1510, 8, [1, 0, 0], 90) for i, x in enumerate([-75, 75])],
        C("temperature-dial", 28, 72, 0, -67, 1300, 10, [1, 0, 0], 90), B("label", 235, 18, 58, 0, -60, 1655),
    ], origin="wall"),
    asset("clean-zone-handwash-sink", "Clean-zone handwash sink", "Compact wall basin with splashback, hands-free control and soap dispenser.", "#7e9088", [
        B("basin", 700, 460, 170, 0, 0, 900), B("splashback", 720, 58, 500, 0, 185, 1100),
        B("wall-bracket", 500, 80, 75, 0, 190, 785), C("tap", 240, 25, 0, 110, 990, 8),
        B("soap-dispenser", 130, 120, 250, 360, 135, 1160), B("towel-dispenser", 230, 115, 360, -340, 125, 1200),
        *[B(f"pedestal-leg-{i}", 60, 60, 770, x, y, 385) for i, (x, y) in enumerate([(-255, -140), (255, -140)])],
    ]),
    asset("decon-boot-brush-set", "Decontamination boot brush set", "Pair of upright boot brushes fixed to a drainable floor plate.", "#72857e", [
        B("footplate", 580, 390, 62, 0, 0, 31), *[B(f"brush-{i}", 180, 75, 420, x, 0, 272) for i, x in enumerate([-150, 150])],
        *[B(f"bristle-{i}", 20, 54, 340, -225 + i * 30, -10, 300) for i in range(16)],
        B("grab-rail", 55, 45, 520, 0, 155, 325),
    ]),
    asset("station-alerting-control-console", "Station alerting control console", "Duty desk panel with incident display, station status buttons and speaker grille.", "#687e7f", [
        B("desk-base", 1100, 720, 760, 0, 0, 380), B("worktop", 1400, 840, 80, 0, 0, 800),
        B("raised-console", 990, 230, 300, 0, 250, 970), B("display", 520, 50, 330, -260, 125, 1110),
        *[C(f"status-button-{i}", 28, 36, x, -48, 1000, 8) for i, x in enumerate([180, 300, 420])],
        B("speaker-grille", 245, 24, 105, 0, 118, 965),
    ]),
    asset("station-call-board", "Station call assignment board", "Wall board with unit-ready columns, crew cards and a magnetic incident strip.", "#7b8580", [
        B("backboard", 1600, 46, 940, 0, 0, 1580), B("top-title", 1600, 38, 130, 0, -40, 2070),
        *[B(f"column-{i}", 30, 20, 730, -520 + i * 260, -40, 1570) for i in range(5)],
        *[B(f"crew-card-{i}", 210, 20, 110, -520 + i * 260, -68, 1740) for i in range(5)],
        B("incident-strip", 1480, 28, 90, 0, -54, 1050),
    ], origin="wall"),
    asset("station-alerting-speaker", "Station alerting speaker", "Wall-mounted horn speaker with protective grille and shallow backbox.", "#718481", [
        B("backbox", 320, 90, 300, 0, 0, 1770), C("horn", 180, 150, 0, -60, 1770, 10, [1, 0, 0], 90),
        B("grille", 255, 18, 220, 0, -160, 1770), B("mount-bracket", 70, 90, 140, 0, 0, 1550),
    ], origin="wall"),
    asset("radio-charging-rack", "Radio charging rack", "Wall rack with six handheld-radio charging bays and cable management.", "#657c7d", [
        B("backplate", 1100, 60, 750, 0, 0, 1500), B("upper-rail", 1160, 90, 70, 0, -20, 1880),
        *[B(f"charger-{i}", 130, 160, 310, -440 + i * 176, -105, 1425) for i in range(6)],
        *[C(f"radio-antenna-{i}", 160, 10, -440 + i * 176, -145, 1610, 8) for i in range(6)],
        B("cable-tray", 1080, 85, 60, 0, 0, 1065),
    ], origin="wall"),
    asset("station-pager-locker", "Station pager locker", "Small lockable charging cabinet with individual numbered slots and status lights.", "#73817c", [
        B("cabinet", 920, 420, 1250, 0, 0, 625), B("door", 860, 32, 1170, 0, -220, 625),
        *[B(f"slot-{i}", 185, 18, 230, -305 + i * 305, -245, 790) for i in range(4)],
        *[C(f"ready-light-{i}", 20, 22, -305 + i * 305, -250, 1100, 8) for i in range(4)],
        B("name-strip", 600, 18, 70, 0, -245, 1190),
    ]),
    asset("bay-hose-test-rack", "Hose test rack", "Ground-mounted rack with spaced hose couplings, test manifold and catch trough.", "#70827e", [
        B("trough", 1600, 500, 100, 0, 0, 50), *[B(f"upright-{i}", 48, 60, 980, x, 0, 540) for i, x in enumerate([-650, -325, 0, 325, 650])],
        B("top-rail", 1470, 58, 58, 0, 0, 1030), *[C(f"coupling-{i}", 80, 42, x, -85, 890, 8, [1, 0, 0], 90) for i, x in enumerate([-520, -260, 0, 260, 520])],
        B("test-manifold", 450, 240, 190, 500, 0, 220),
    ]),
    asset("station-maintenance-workbench", "Station maintenance workbench", "Shop bench with tool backboard, vise, drawer bank and parts tray.", "#7d8982", [
        B("worktop", 1800, 760, 80, 0, 0, 900), *[B(f"leg-{i}", 75, 75, 880, x, y, 440) for i, (x, y) in enumerate([(-790, -310), (790, -310), (-790, 310), (790, 310)])],
        B("drawer-bank", 540, 690, 390, -520, 0, 640), B("backboard", 1800, 55, 920, 0, 340, 1400),
        B("vise-base", 220, 220, 170, 550, -120, 1025), B("vise-jaw", 280, 200, 90, 550, -120, 1155),
        B("parts-tray", 430, 260, 55, -220, 65, 970),
    ]),
    asset("station-equipment-service-cart", "Station equipment service cart", "Mobile two-shelf cart with labeled equipment bins and a push handle.", "#748781", [
        B("lower-shelf", 820, 500, 55, 0, 0, 190), B("upper-shelf", 820, 500, 55, 0, 0, 770),
        *[B(f"post-{i}", 42, 42, 680, x, y, 480) for i, (x, y) in enumerate([(-365, -205), (365, -205), (-365, 205), (365, 205)])],
        *[C(f"caster-{i}", 40, 40, x, y, 0, 8) for i, (x, y) in enumerate([(-350, -195), (350, -195), (-350, 195), (350, 195)])],
        B("handle", 720, 42, 42, 0, 250, 1030),
    ]),
    asset("station-utility-sink", "Station utility sink", "Deep mop sink with tall backsplash, faucet and pail-clearance legs.", "#798b85", [
        B("basin", 900, 620, 330, 0, 0, 850), B("backsplash", 900, 58, 650, 0, 280, 1170),
        *[B(f"leg-{i}", 65, 65, 680, x, y, 340) for i, (x, y) in enumerate([(-360, -230), (360, -230), (-360, 230), (360, 230)])],
        B("lower-shelf", 760, 470, 42, 0, 0, 68), C("faucet", 240, 24, 0, 150, 1050, 8),
        B("spray-handle", 52, 48, 250, 260, 180, 920),
    ]),
    asset("clean-gear-cabinet", "Clean gear cabinet", "Ventilated clean-storage cabinet with divided shelves and a sealed door.", "#71847f", [
        B("base", 980, 650, 100, 0, 0, 50), B("cabinet", 900, 580, 1800, 0, 0, 1000),
        B("door", 840, 30, 1690, 0, -305, 1000), *[B(f"shelf-{i}", 820, 520, 40, 0, 0, 320 + i * 390) for i in range(4)],
        *[B(f"vent-{i}", 640, 20, 22, 0, -326, 120 + i * 55) for i in range(5)],
    ]),
    asset("turnout-bench-with-boot-cubbies", "Turnout bench with boot cubbies", "Entry bench with four boot bays, coat hooks and a divided personal-equipment shelf.", "#807b6e", [
        B("seat", 1600, 520, 75, 0, 0, 520), *[B(f"divider-{i}", 36, 470, 420, x, 0, 270) for i, x in enumerate([-600, -200, 200, 600])],
        B("base", 1600, 500, 80, 0, 0, 40), B("back", 1600, 50, 700, 0, 230, 830),
        *[C(f"coat-hook-{i}", 90, 22, x, 185, 1040, 8) for i, x in enumerate([-570, -190, 190, 570])],
    ]),
    asset("gear-glove-drying-cabinet", "Gear glove drying cabinet", "Compact forced-air cabinet with four removable glove drying fingers.", "#6e827d", [
        B("base", 700, 540, 110, 0, 0, 55), B("body", 640, 480, 980, 0, 0, 600),
        B("door", 580, 28, 850, 0, -256, 600), *[C(f"drying-finger-{i}", 220, 27, x, -285, 400 + (i // 2) * 280, 8, [1, 0, 0], 90) for i, x in enumerate([-180, -60, 60, 180])],
        B("air-grille", 500, 20, 95, 0, -257, 160),
    ]),
    asset("station-boot-drying-rack", "Station boot drying rack", "Wall rail with six inverted boot nozzles and a removable drip channel.", "#71817b", [
        B("mount-rail", 1600, 70, 180, 0, 0, 1350), B("drip-channel", 1600, 160, 80, 0, -80, 860),
        *[C(f"boot-nozzle-{i}", 450, 28, x, -130, 1090, 8) for i, x in enumerate([-600, -360, -120, 120, 360, 600])],
        *[B(f"mount-bracket-{i}", 65, 100, 340, x, 0, 1200) for i, x in enumerate([-700, 700])],
    ], origin="wall"),
    asset("station-facepiece-cleaning-sink", "Facepiece cleaning sink", "Dedicated facepiece basin with rinse spout, drying hooks and a clean-side shelf.", "#7a8b85", [
        B("basin", 900, 600, 220, 0, 0, 880), B("backsplash", 900, 55, 520, 0, 270, 1110),
        *[B(f"leg-{i}", 65, 65, 770, x, y, 385) for i, (x, y) in enumerate([(-350, -210), (350, -210), (-350, 210), (350, 210)])],
        B("clean-side-shelf", 440, 240, 45, 500, 100, 1010), C("rinse-spout", 230, 25, 230, 125, 1040, 8),
        *[C(f"dry-hook-{i}", 130, 18, x, 220, 1230, 8) for i, x in enumerate([-240, -80, 80, 240])],
    ]),
    asset("station-hand-sanitizer-dispenser", "Station sanitizer dispenser", "Wall dispenser with a protected reservoir, push lever and drip-catch plate.", "#7c8980", [
        B("backplate", 210, 54, 420, 0, 0, 1480), B("reservoir", 165, 150, 275, 0, -58, 1520),
        B("push-lever", 155, 65, 38, 0, -125, 1370), B("catch-tray", 230, 150, 35, 0, -70, 1240),
        B("level-window", 38, 20, 150, 40, -138, 1530),
    ], origin="wall"),
    asset("station-airlock-door-closer", "Station airlock door closer", "Door-top closer assembly with hydraulic body, swing arm and wall shoe.", "#777f79", [
        B("door-leaf", 900, 72, 2200, 0, 0, 1100), B("closer-body", 380, 90, 74, 190, -78, 2145),
        B("arm", 490, 34, 34, -10, -72, 2170, [0, 0, 15]), B("shoe", 95, 55, 80, -245, -55, 2150),
        B("threshold", 920, 120, 38, 0, 0, 19),
    ]),
    asset("station-clean-zone-clock", "Station clean-zone clock", "Large wall clock with a deep bezel and high-contrast index marks.", "#748782", [
        B("backplate", 620, 75, 620, 0, 0, 1750), C("bezel", 80, 285, 0, -45, 1750, 12, [1, 0, 0], 90),
        C("face", 18, 244, 0, -95, 1750, 12, [1, 0, 0], 90),
        *[B(f"hour-mark-{i}", 16, 18, 52, x, -112, z) for i, (x, z) in enumerate([(0, 1960), (145, 1905), (205, 1750), (145, 1595), (0, 1540), (-145, 1595), (-205, 1750), (-145, 1905)])],
        B("minute-hand", 14, 150, 18, 0, -125, 1785, [0, 0, 30]),
    ], origin="wall"),
    asset("station-door-traffic-signal", "Station door traffic signal", "Two-lamp wall signal with a protective cage for airlock traffic status.", "#a17c55", [
        B("mount-plate", 260, 70, 600, 0, 0, 1800), C("upper-lamp", 150, 100, 0, -45, 1980, 10),
        C("lower-lamp", 150, 100, 0, -45, 1620, 10), B("guard-top", 260, 40, 32, 0, -90, 2100),
        B("guard-bottom", 260, 40, 32, 0, -90, 1500),
    ], origin="wall"),
    asset("station-callout-light-strip", "Station callout light strip", "Hallway callout light bar with three labeled response-zone indicators.", "#77867e", [
        B("backplate", 1450, 60, 160, 0, 0, 1900),
        *[B(f"lens-{i}", 350, 28, 80, x, -42, 1900) for i, x in enumerate([-480, 0, 480])],
        *[B(f"label-{i}", 300, 18, 52, x, -44, 1780) for i, x in enumerate([-480, 0, 480])],
        B("mount-left", 70, 90, 120, -620, 0, 1790), B("mount-right", 70, 90, 120, 620, 0, 1790),
    ], origin="wall"),
    asset("station-training-whiteboard", "Station training whiteboard", "Wall training board with marker ledge, grid lines and three magnetic panels.", "#7e8982", [
        B("board", 1800, 55, 1100, 0, 0, 1600), B("left-panel", 560, 18, 980, -610, -42, 1600),
        B("center-panel", 560, 18, 980, 0, -42, 1600), B("right-panel", 560, 18, 980, 610, -42, 1600),
        B("marker-tray", 1720, 135, 50, 0, -92, 1035),
        *[B(f"grid-v-{i}", 12, 15, 940, -800 + i * 200, -56, 1600) for i in range(9)],
    ], origin="wall"),
    asset("station-fitness-weight-rack", "Station fitness weight rack", "Low equipment rack with tiered shelves and end stops for training weights.", "#717d78", [
        B("base", 1500, 480, 80, 0, 0, 40), *[B(f"upright-{i}", 55, 55, 1080, x, y, 580) for i, (x, y) in enumerate([(-650, -180), (650, -180), (-650, 180), (650, 180)])],
        B("lower-shelf", 1380, 420, 55, 0, 0, 350), B("upper-shelf", 1380, 420, 55, 0, 0, 850),
        *[C(f"weight-stop-{i}", 140, 55, x, -120, 420, 8) for i, x in enumerate([-500, -250, 0, 250, 500])],
    ]),
    asset("station-response-map-cabinet", "Station response map cabinet", "Wall map cabinet with hinged cover, grid insert and route-card pockets.", "#7c8983", [
        B("backboard", 1500, 70, 1100, 0, 0, 1650), B("map-panel", 1350, 30, 850, 0, -52, 1670),
        B("cover", 1420, 42, 940, 0, -88, 1670), *[B(f"route-pocket-{i}", 350, 36, 240, -480 + i * 480, -115, 1210) for i in range(3)],
        B("hinge-top", 1320, 40, 50, 0, 18, 2130), B("hinge-bottom", 1320, 40, 50, 0, 18, 1190),
    ], origin="wall"),
    asset("station-electrical-transfer-cabinet", "Station transfer switch cabinet", "Floor cabinet with labeled transfer switch door and cable raceway.", "#6e827d", [
        B("base", 900, 650, 90, 0, 0, 45), B("cabinet", 820, 570, 1400, 0, 0, 790),
        B("door", 760, 28, 1310, 0, -300, 790), B("switch-handle", 55, 75, 240, 250, -360, 900),
        B("label-window", 250, 20, 130, -170, -320, 1260), B("cable-raceway", 160, 100, 2200, 500, 80, 1110),
    ]),
    asset("station-standby-generator", "Station standby generator", "Enclosed standby generator with cooling louvers, exhaust stack and service panel.", "#798880", [
        B("skid", 1700, 760, 140, 0, 0, 70), B("enclosure", 1580, 680, 1080, 0, 0, 680),
        *[B(f"louver-{i}", 480, 26, 38, -450 + i * 300, -350, 780) for i in range(4)],
        B("service-door", 430, 35, 730, 500, -350, 650), C("exhaust-stack", 650, 62, -560, 210, 1080, 10),
        B("control-box", 250, 140, 250, 790, -120, 900),
    ]),
    asset("station-key-control-cabinet", "Station key control cabinet", "Lockable key cabinet with numbered hooks, access keypad and issue-return slots.", "#7b837a", [
        B("cabinet", 760, 300, 980, 0, 0, 490), B("door", 700, 28, 900, 0, -165, 490),
        *[C(f"key-hook-{i}", 55, 14, x, -190, 600 + (i // 5) * 170, 8) for i, x in enumerate([-260, -130, 0, 130, 260] * 2)],
        B("keypad", 145, 25, 210, 460, -190, 640), B("return-slot", 250, 35, 65, -50, -195, 185),
    ]),
    asset("station-air-compressor", "Station breathing-air compressor", "Enclosed breathing-air compressor skid with vertical receiver and filter stack.", "#75857e", [
        B("base", 1250, 850, 140, 0, 0, 70), B("compressor-housing", 800, 700, 720, -150, 0, 500),
        C("receiver", 700, 210, 440, 0, 0, 12), B("filter-stack", 220, 220, 800, 500, 0, 540),
        *[C(f"filter-bowl-{i}", 180, 72, 500, 0, 500 + i * 210, 10) for i in range(3)],
        B("control-box", 300, 200, 250, 400, -410, 620),
    ]),
    asset("station-turnout-gear-inspection-light", "Turnout gear inspection light", "Free-standing task light with wide weighted base and adjustable inspection head.", "#7e8980", [
        B("base", 420, 380, 70, 0, 0, 35), C("mast", 1480, 28, 0, 0, 70, 8),
        B("arm", 520, 38, 38, 230, 0, 1480, [0, 0, -12]), B("light-head", 250, 190, 110, 480, -10, 1430),
        C("knob", 40, 42, 180, 0, 1480, 8, [1, 0, 0], 90),
    ]),
    asset("station-gear-tag-printer", "Station gear tag printer", "Compact label printer with tag roll, feed slot and cleanable work shelf.", "#72827d", [
        B("printer-body", 620, 460, 480, 0, 0, 240), B("top", 660, 500, 55, 0, 0, 507.5),
        B("display", 250, 35, 145, 160, -240, 435), B("feed-slot", 370, 18, 45, 0, -245, 160),
        C("tag-roll", 65, 100, -210, 140, 520, 10, [1, 0, 0], 90), B("output-tray", 520, 160, 38, 0, -315, 90),
    ]),
    asset("station-decon-tool-rack", "Decontamination tool rack", "Wall rack with removable brush slots and a drip channel for cleaning tools.", "#78857d", [
        B("backplate", 1200, 54, 1000, 0, 0, 1350), B("drip-channel", 1260, 180, 48, 0, -70, 840),
        *[B(f"tool-loop-{i}", 90, 46, 90, -450 + i * 300, -60, 1100) for i in range(4)],
        *[B(f"handle-clip-{i}", 52, 30, 270, -450 + i * 300, -80, 1500) for i in range(4)],
        B("label-strip", 1050, 20, 88, 0, -38, 1900),
    ], origin="wall"),
    asset("station-clean-gear-hamper", "Clean gear hamper", "Covered clean-laundry hamper with divided bag frame and foot-operated lid.", "#7b877e", [
        B("body", 760, 600, 760, 0, 0, 380), B("lid", 800, 640, 60, 0, 0, 790),
        B("front-label", 390, 24, 135, 0, -315, 530), B("pedal", 240, 110, 28, 0, -360, 14),
        *[C(f"caster-{i}", 36, 38, x, y, 0, 8) for i, (x, y) in enumerate([(-290, -225), (290, -225), (-290, 225), (290, 225)])],
    ]),
    asset("station-clean-room-airlock-cabinet", "Clean-room airlock cabinet", "Pass-through cabinet with separate dirty-side and clean-side doors.", "#718580", [
        B("cabinet", 1080, 680, 1100, 0, 0, 550), B("dirty-door", 500, 28, 960, -270, -355, 550),
        B("clean-door", 500, 28, 960, 270, 355, 550), B("shelf", 970, 480, 60, 0, 0, 550),
        B("door-handle-dirty", 32, 44, 250, -80, -390, 550), B("door-handle-clean", 32, 44, 250, 460, 390, 550),
        B("status-strip", 900, 18, 90, 0, -360, 1070),
    ]),
]


def js(value):
    return json.dumps(value, ensure_ascii=False)


def emit(row):
    name = row["id"]
    tags = ["fire", "station", "apparatus bay", "firefighter health", "low poly", "CC0"] + row["title"].lower().split()
    lines = [
        f"// Original fire-station scene asset. Millimetres, Z up, {row['origin']} origin.",
        "meta({",
        f"  name: {js(name)},",
        "  license: 'CC0-1.0',",
        f"  title: {js(row['title'])},",
        f"  description: {js(row['description'])} + ' Editable overall scale and asset color.',",
        f"  tags: {js(list(dict.fromkeys(tags)))},",
        "  kit: 'fire-station',",
        "  category: 'prop',",
        f"  origin: {js(row['origin'])},",
        "  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],",
        "  triangleBudget: 1800,",
        "});",
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });",
        f"const color = param('color', {js(row['color'])}, {{ label: 'Asset color' }});",
        f"const p = assembly({js(name)});",
        "",
        "const b = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {",
        "  let shape = box(size[0], size[1], size[2], true);",
        "  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);",
        "  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);",
        "  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);",
        "  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));",
        "};",
    ]
    if any(part[0] == "cylinder" for part in row["parts"]):
        lines.extend([
            "const c = (name: string, h: number, r: number, segments: number, at: [number, number, number], axis?: [number, number, number], degrees = 0) => {",
            "  let shape = cylinder(h, r, segments);",
            "  if (axis && degrees) shape = shape.rotate(axis, degrees);",
            "  p.part(name, shape.translate(at[0], at[1], at[2]).scale(scale).color(color));",
            "};",
        ])
    lines.append("")
    for part in row["parts"]:
        if part[0] == "box":
            _, pname, size, at, rotation = part
            call = f"b({js(pname)}, {js(size)}, {js(at)}"
            if rotation:
                call += f", {js(rotation)}"
            lines.append(call + ");")
        elif part[0] == "cylinder":
            _, pname, dimensions, at, axis, degrees = part
            h, r, segments = dimensions
            call = f"c({js(pname)}, {h}, {r}, {segments}, {js(at)}"
            if axis:
                call += f", {js(axis)}, {degrees}"
            lines.append(call + ");")
        else:
            raise ValueError(f"unsupported part: {part[0]}")
    lines.extend(["", "return p.model();", ""])
    return "\n".join(lines)


def main():
    KIT.mkdir(parents=True, exist_ok=True)
    kit = {
        "title": "Fire station",
        "description": "Station fixtures for apparatus-bay readiness, equipment washing, decontamination, breathing-apparatus processing, gear storage, and crew alerting.",
    }
    (KIT / "kit.json").write_text(json.dumps(kit, indent=2) + "\n", encoding="utf-8")
    for row in ASSETS:
        (KIT / f"{row['id']}.kcad.ts").write_text(emit(row), encoding="utf-8")
    print(f"wrote {len(ASSETS)} original fire-station assets to {KIT}")


if __name__ == "__main__":
    main()
