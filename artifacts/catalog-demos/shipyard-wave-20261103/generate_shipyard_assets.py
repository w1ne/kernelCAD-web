#!/usr/bin/env python3
"""Generate the original, parametric shipyard scene kit."""
from collections import defaultdict
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "shipyard"


def B(name, size, at, rotation=None):
    return {"kind": "box", "name": name, "size": size, "at": at, "rotation": rotation}


def C(name, height, radius, at, rotation=None, segments=10):
    return {"kind": "cylinder", "name": name, "height": height, "radius": radius,
            "at": at, "rotation": rotation, "segments": segments}


def S(name, radius, at):
    return {"kind": "sphere", "name": name, "radius": radius, "at": at}


def A(group, asset_id, title, description, color, parts):
    return {"group": group, "id": asset_id, "title": title,
            "description": description, "color": color, "parts": parts}


DOCK = "Yard and dock operations"
FAB = "Plate and block fabrication"
OUTFIT = "Outfitting and yard services"
COATING = "Surface preparation and coating"
MOVE = "Block and material movement"
INSPECT = "Inspection and refit support"

ASSETS = [
    A(DOCK, "dock-gate-caisson", "Dock gate caisson", "Floating drydock gate module with a broad caisson body, stiffening ribs, deck walkway, and paired ballast housings.", "#748987", [
        B("gate-body", [2800, 340, 1900], [0, 0, 950]), B("deck-cap", [2940, 470, 150], [0, 0, 1975]),
        *[B(f"vertical-stiffener-{i}", [120, 150, 1800], [-1100 + i * 440, 185, 900]) for i in range(6)],
        *[B(f"lower-flotation-cell-{i}", [500, 620, 360], [x, 0, 180]) for i, x in enumerate([-720, 720])],
        *[B(f"deck-cleat-{i}", [150, 100, 120], [x, -205, 2110]) for i, x in enumerate([-950, 950])],
    ]),
    A(DOCK, "ship-lift-cradle", "Ship lift cradle", "Transfer cradle with paired guide rails, cross ties, adjustable hull pads, and four guide rollers.", "#76847b", [
        *[B(f"side-rail-{i}", [3000, 220, 260], [0, y, 190]) for i, y in enumerate([-740, 740])],
        *[B(f"cross-tie-{i}", [180, 1430, 130], [x, 0, 105]) for i, x in enumerate([-1100, 0, 1100])],
        *[B(f"hull-pad-{i}", [300, 320, 520], [x, y, 520]) for i, (x, y) in enumerate([(-1050, -480), (-1050, 480), (1050, -480), (1050, 480)])],
        *[C(f"guide-roller-{i}", 220, 90, [x, y, 90], [90, 0, 0], 10) for i, (x, y) in enumerate([(-1280, -760), (1280, -760), (-1280, 760), (1280, 760)])],
    ]),
    A(DOCK, "keel-block-stack", "Keel block stack", "Stepped timber keel support stack with a broad foot, alternating crib layers, and a replaceable top cap.", "#a17d58", [
        B("ground-sill", [1150, 700, 160], [0, 0, 80]), B("lower-block-left", [420, 700, 260], [-350, 0, 290]),
        B("lower-block-right", [420, 700, 260], [350, 0, 290]), B("cross-layer", [920, 560, 180], [0, 0, 510]),
        B("upper-block", [650, 520, 250], [0, 0, 725]), B("keel-cap", [820, 620, 120], [0, 0, 910]),
        *[B(f"side-wedge-{i}", [170, 260, 100], [x, y, 1010]) for i, (x, y) in enumerate([(-260, -210), (260, -210), (-260, 210), (260, 210)])],
    ]),
    A(DOCK, "bow-section-support-stand", "Bow section support stand", "Reusable steel cradle with paired inclined-looking uprights, a high cross head, base shoes, and a broad saddle pad.", "#7b8980", [
        B("base-beam", [1900, 520, 180], [0, 0, 90]), B("left-foot", [260, 440, 120], [-650, 0, 240]),
        B("right-foot", [260, 440, 120], [650, 0, 240]), B("left-post", [190, 240, 1130], [-620, 0, 825]),
        B("right-post", [190, 240, 1130], [620, 0, 825]), B("head-beam", [1650, 330, 220], [0, 0, 1390]),
        B("saddle", [1050, 760, 150], [0, 0, 1575]), B("rear-brace", [1350, 150, 130], [0, 220, 810]),
    ]),
    A(DOCK, "stern-section-support-frame", "Stern section support frame", "Portal-style hull support with two adjustable towers, tie beam, lower braces, and paired padded contact plates.", "#667c78", [
        B("left-base", [420, 520, 180], [-850, 0, 90]), B("right-base", [420, 520, 180], [850, 0, 90]),
        *[B(f"tower-{i}", [230, 260, 1520], [x, 0, 940]) for i, x in enumerate([-850, 850])],
        B("crosshead", [2200, 350, 200], [0, 0, 1740]), B("lower-tie", [1730, 180, 150], [0, 220, 560]),
        *[B(f"contact-pad-{i}", [480, 260, 170], [x, -45, 1900]) for i, x in enumerate([-650, 650])],
        *[B(f"tower-foot-brace-{i}", [160, 180, 720], [x, 150, 500]) for i, x in enumerate([-690, 690])],
    ]),
    A(DOCK, "drydock-level-reference-post", "Drydock level reference post", "Floor-mounted reference mast with a wide foot, graduated cross bars, a weather hood, and a float indicator.", "#d2a64f", [
        B("base-plate", [700, 620, 120], [0, 0, 60]), B("mast", [150, 160, 2570], [0, 0, 1405]),
        *[B(f"graduation-{i}", [430 if i % 4 == 0 else 270, 70, 45], [0, -45, 300 + i * 150]) for i in range(14)],
        B("top-hood", [520, 380, 120], [0, 0, 2760]), C("float-indicator", 130, 95, [0, 0, 2900], segments=12),
    ]),
    A(DOCK, "slipway-rail-shoe", "Slipway rail shoe", "Short paired launch-way rails on timber sleepers with replaceable guide shoes and a stop block.", "#75827c", [
        *[B(f"rail-{i}", [2300, 120, 190], [0, y, 220]) for i, y in enumerate([-440, 440])],
        *[B(f"sleeper-{i}", [220, 1120, 170], [x, 0, 85]) for i, x in enumerate([-900, -300, 300, 900])],
        *[B(f"wear-shoe-{i}", [850, 170, 55], [x, y, 345]) for i, (x, y) in enumerate([(-600, -440), (600, -440), (-600, 440), (600, 440)])],
        B("end-stop", [180, 1120, 320], [1080, 0, 440]),
    ]),
    A(DOCK, "floating-drydock-pontoon-module", "Floating drydock pontoon module", "Modular floating dock section with paired buoyancy tanks, a deck bridge, side fender blocks, and a boarding ladder.", "#728985", [
        *[B(f"pontoon-{i}", [1900, 470, 580], [0, y, 290]) for i, y in enumerate([-580, 580])],
        B("deck-bridge", [1980, 870, 160], [0, 0, 660]),
        *[B(f"fender-{i}", [240, 170, 420], [x, y, 580]) for i, (x, y) in enumerate([(-650, -840), (650, -840), (-650, 840), (650, 840)])],
        *[B(f"ladder-rung-{i}", [420, 100, 75], [0, -845, 240 + i * 230]) for i in range(4)],
        B("ladder-side-left", [70, 100, 850], [-210, -845, 545]), B("ladder-side-right", [70, 100, 850], [210, -845, 545]),
    ]),
    A(DOCK, "drydock-access-stair-tower", "Drydock access stair tower", "Compact access tower with a stepped flight, landing, twin handrails, and stabilizing base feet.", "#798881", [
        B("landing", [1050, 820, 150], [0, 0, 1390]),
        *[B(f"stair-tread-{i}", [820, 260, 110], [-760 + i * 155, -300, 120 + i * 180]) for i in range(7)],
        *[B(f"stair-stringer-{i}", [1900, 110, 120], [-295, y, 660], [0, -34, 0]) for i, y in enumerate([-430, -170])],
        *[B(f"landing-post-{i}", [80, 80, 1080], [x, y, 850]) for i, (x, y) in enumerate([(-450, 340), (450, 340), (-450, -340), (450, -340)])],
        *[B(f"handrail-{i}", [1000, 70, 85], [0, y, 1400]) for i, y in enumerate([340, -340])],
    ]),
    A(DOCK, "dockside-work-platform", "Dockside work platform", "Raised quay-side work deck with four legs, perimeter rails, a toe board, and a short access step.", "#667e79", [
        B("deck", [2200, 1350, 150], [0, 0, 1190]),
        *[B(f"support-leg-{i}", [120, 120, 1120], [x, y, 560]) for i, (x, y) in enumerate([(-950, -520), (950, -520), (-950, 520), (950, 520)])],
        *[B(f"rail-post-{i}", [75, 75, 650], [x, y, 1510]) for i, (x, y) in enumerate([(-950, -520), (0, -520), (950, -520), (-950, 520), (0, 520), (950, 520)])],
        *[B(f"guardrail-{i}", [920, 65, 75], [x, y, z]) for i, (x, y, z) in enumerate([(-475, -520, 1780), (475, -520, 1780), (-475, 520, 1780), (475, 520, 1780)])],
        B("toe-board", [2200, 60, 140], [0, -650, 1335]), B("access-step", [740, 420, 130], [0, -820, 65]),
    ]),
    A(DOCK, "dock-gate-winch-base", "Dock gate winch base", "Drive stand for a floating-gate hauling line with twin cable drums, a motor housing, a brake lever, and a reinforced skid.", "#a56848", [
        B("skid", [1900, 980, 180], [0, 0, 90]), B("motor", [620, 620, 650], [570, 0, 505]),
        *[C(f"haul-drum-{i}", 560, 260, [x, y, 340], [90, 0, 0], 14) for i, (x, y) in enumerate([(-500, -390), (-500, 390)])],
        *[B(f"drum-bearing-{i}", [180, 200, 680], [x, y, 440]) for i, (x, y) in enumerate([(-500, -610), (-500, 610)])],
        B("brake-lever", [75, 720, 75], [-160, 360, 660]), B("guard-cover", [720, 260, 120], [-500, 0, 780]),
    ]),
    A(DOCK, "caisson-ballast-manifold-stand", "Caisson ballast manifold stand", "Pipework display skid with a header, four branch valves, support feet, and a drain receiver.", "#67847e", [
        B("base-skid", [1900, 700, 130], [0, 0, 65]), B("header-pipe", [1540, 160, 160], [0, 0, 1110]),
        *[B(f"branch-pipe-{i}", [150, 150, 760], [-570 + i * 380, 0, 670]) for i in range(4)],
        *[C(f"handwheel-{i}", 55, 145, [-570 + i * 380, -110, 1010], [90, 0, 0], 12) for i in range(4)],
        *[B(f"support-foot-{i}", [130, 130, 900], [x, y, 520]) for i, (x, y) in enumerate([(-760, -220), (760, -220), (-760, 220), (760, 220)])],
        B("drain-receiver", [440, 500, 370], [760, 0, 250]),
    ]),

    A(FAB, "ship-plate-staging-pallet", "Ship plate staging pallet", "Heavy plate pallet with fork pockets, layered sheet stock, end stops, and corner restraint blocks.", "#73817e", [
        B("pallet-base", [2500, 1420, 160], [0, 0, 80]),
        *[B(f"fork-pocket-{i}", [420, 480, 120], [x, y, 220]) for i, (x, y) in enumerate([(-720, 0), (720, 0)])],
        *[B(f"plate-layer-{i}", [2320, 1260, 48], [0, 0, 300 + i * 58]) for i in range(7)],
        *[B(f"end-stop-{i}", [120, 1320, 500], [x, 0, 350]) for i, x in enumerate([-1190, 1190])],
    ]),
    A(FAB, "plate-roller-conveyor", "Plate roller conveyor", "Section of plate feed line with a heavy frame, transverse rollers, side guides, and adjustable feet.", "#78847e", [
        *[B(f"side-frame-{i}", [2550, 140, 280], [0, y, 140]) for i, y in enumerate([-680, 680])],
        *[C(f"feed-roller-{i}", 115, 115, [-1000 + i * 400, 0, 300], [90, 0, 0], 10) for i in range(6)],
        *[B(f"guide-rail-{i}", [2350, 100, 230], [0, y, 460]) for i, y in enumerate([-720, 720])],
        *[B(f"leveling-foot-{i}", [160, 160, 100], [x, y, 50]) for i, (x, y) in enumerate([(-1100, -650), (1100, -650), (-1100, 650), (1100, 650)])],
    ]),
    A(FAB, "plate-rolling-machine", "Plate rolling machine", "Three-roll plate former with a rigid bed, two lower rollers, upper pressure roller, and side drive cabinet.", "#687e79", [
        B("machine-bed", [1800, 1020, 270], [0, 0, 135]),
        *[C(f"lower-roll-{i}", 1050, 210, [x, 0, 510], [90, 0, 0], 14) for i, x in enumerate([-470, 470])],
        C("upper-pressure-roll", 1050, 240, [0, 0, 1120], [90, 0, 0], 14),
        *[B(f"bearing-tower-{i}", [180, 920, 1430], [x, 0, 780]) for i, x in enumerate([-800, 800])],
        B("drive-cabinet", [500, 570, 760], [1180, 0, 380]), B("control-pendant", [250, 100, 360], [1170, -360, 920]),
    ]),
    A(FAB, "hull-panel-cutting-table", "Hull panel cutting table", "Slatted cutting bed on a rigid underframe with rail ends, replaceable slats, and a side cable tray.", "#6e7f7d", [
        B("underframe", [2600, 1750, 250], [0, 0, 125]),
        *[B(f"cutting-slat-{i}", [2520, 60, 640], [0, -800 + i * 160, 570]) for i in range(11)],
        *[B(f"end-rail-{i}", [180, 1900, 170], [x, 0, 980]) for i, x in enumerate([-1240, 1240])],
        B("cable-tray", [2350, 120, 110], [0, 940, 300]),
    ]),
    A(FAB, "plasma-cutting-gantry-head", "Plasma cutting gantry head", "Compact cutting carriage with a bridge beam, end trucks, torch head, cable loop, and operator pendant.", "#d19443", [
        B("bridge", [2300, 230, 220], [0, 0, 1680]),
        *[B(f"end-truck-{i}", [380, 470, 330], [x, 0, 1520]) for i, x in enumerate([-1110, 1110])],
        B("torch-carriage", [320, 430, 360], [180, 0, 1400]), B("torch-nozzle", [90, 90, 580], [180, 0, 930]),
        B("cable-loop", [80, 170, 780], [650, 30, 1170]), B("pendant", [230, 120, 320], [900, -350, 1050]),
    ]),
    A(FAB, "panel-line-strongback", "Panel line strongback", "Long modular strongback fixture with spaced cross rails, clamp blocks, end stops, and datum feet.", "#78867d", [
        *[B(f"longitudinal-rail-{i}", [3000, 150, 180], [0, y, 90]) for i, y in enumerate([-620, 620])],
        *[B(f"cross-rail-{i}", [165, 1320, 130], [-1200 + i * 600, 0, 245]) for i in range(5)],
        *[B(f"clamp-block-{i}", [230, 280, 230], [x, y, 425]) for i, (x, y) in enumerate([(-900, -620), (0, -620), (900, -620), (-900, 620), (0, 620), (900, 620)])],
        *[B(f"datum-foot-{i}", [230, 220, 180], [x, y, 90]) for i, (x, y) in enumerate([(-1350, -620), (1350, -620), (-1350, 620), (1350, 620)])],
    ]),
    A(FAB, "hull-block-fabrication-jig", "Hull block fabrication jig", "Open box-section fixture with corner towers, transverse alignment beams, and replaceable block-contact pads.", "#657c78", [
        *[B(f"base-rail-{i}", [2700, 200, 190], [0, y, 95]) for i, y in enumerate([-1050, 1050])],
        *[B(f"cross-rail-{i}", [180, 2200, 160], [x, 0, 190]) for i, x in enumerate([-1000, 0, 1000])],
        *[B(f"corner-tower-{i}", [220, 250, 1260], [x, y, 900]) for i, (x, y) in enumerate([(-1150, -900), (1150, -900), (-1150, 900), (1150, 900)])],
        *[B(f"alignment-beam-{i}", [150, 2180, 180], [x, 0, 1560]) for i, x in enumerate([-930, 930])],
        *[B(f"contact-pad-{i}", [380, 420, 120], [x, y, 1710]) for i, (x, y) in enumerate([(-930, -730), (930, -730), (-930, 730), (930, 730)])],
    ]),
    A(FAB, "hull-panel-turnover-cradle", "Hull panel turnover cradle", "Pair of curved-looking turnover frames joined by a central axle beam with four stabilizing feet and panel stops.", "#70837d", [
        *[B(f"end-frame-{i}", [180, 1340, 1550], [x, 0, 775]) for i, x in enumerate([-850, 850])],
        B("turnover-axle", [1840, 170, 170], [0, 0, 1130]),
        *[B(f"saddle-arm-{i}", [220, 220, 1280], [x, y, 980]) for i, (x, y) in enumerate([(-850, -520), (-850, 520), (850, -520), (850, 520)])],
        *[B(f"panel-stop-{i}", [260, 260, 180], [x, y, 1670]) for i, (x, y) in enumerate([(-850, -520), (-850, 520), (850, -520), (850, 520)])],
        *[B(f"stabilizer-foot-{i}", [480, 400, 120], [x, y, 60]) for i, (x, y) in enumerate([(-850, -680), (850, -680), (-850, 680), (850, 680)])],
    ]),
    A(FAB, "keel-section-fit-up-jig", "Keel section fit-up jig", "Low alignment bed with parallel keel rails, spacing blocks, datum stops, and removable reference towers.", "#708079", [
        *[B(f"keel-rail-{i}", [2900, 220, 260], [0, y, 130]) for i, y in enumerate([-520, 520])],
        *[B(f"spacing-block-{i}", [250, 300, 360], [x, 0, 440]) for i, x in enumerate([-950, -320, 320, 950])],
        *[B(f"end-stop-{i}", [170, 1280, 540], [x, 0, 670]) for i, x in enumerate([-1400, 1400])],
        *[B(f"reference-tower-{i}", [140, 140, 920], [x, y, 720]) for i, (x, y) in enumerate([(-1150, -520), (-1150, 520), (1150, -520), (1150, 520)])],
    ]),
    A(FAB, "pipe-spool-rotator", "Pipe spool rotator", "Weld-fit rotator with two roller stands, guarded drive housing, foot controls, and a pipe centering stop.", "#ad764a", [
        *[B(f"roller-frame-{i}", [760, 520, 720], [x, 0, 360]) for i, x in enumerate([-760, 760])],
        *[C(f"drive-roller-{i}", 620, 125, [x, y, 910], [90, 0, 0], 12) for i, (x, y) in enumerate([(-760, -190), (-760, 190), (760, -190), (760, 190)])],
        B("drive-cabinet", [450, 360, 500], [-760, -430, 250]), B("foot-pedal", [320, 260, 90], [480, -460, 45]),
        B("pipe-stop", [120, 540, 300], [1150, 0, 900]),
    ]),
    A(FAB, "pipe-spool-saddle-stand", "Pipe spool saddle stand", "Adjustable pipe support with a broad base, twin uprights, saddle crossbar, locking collars, and storage tray.", "#778780", [
        B("base", [1600, 700, 150], [0, 0, 75]),
        *[B(f"upright-{i}", [130, 150, 980], [x, 0, 640]) for i, x in enumerate([-560, 560])],
        B("saddle-crossbar", [1420, 240, 180], [0, 0, 1190]), B("saddle-cap", [950, 280, 170], [0, 0, 1365]),
        *[B(f"locking-collar-{i}", [230, 210, 120], [x, 0, 940]) for i, x in enumerate([-560, 560])],
        B("tool-tray", [1200, 430, 100], [0, -150, 230]),
    ]),
    A(FAB, "weld-fit-up-table", "Weld fit-up table", "Heavy fit-up surface with a grid of clamp slots represented by raised stops, fixture dogs, and a lower shelf.", "#687c78", [
        B("table-top", [1760, 1160, 180], [0, 0, 1160]),
        *[B(f"fixture-stop-{i}", [110, 110, 190], [x, y, 1345]) for i, (x, y) in enumerate([(-650, -400), (-220, -400), (220, -400), (650, -400), (-650, 400), (-220, 400), (220, 400), (650, 400)])],
        *[B(f"table-leg-{i}", [130, 130, 1080], [x, y, 540]) for i, (x, y) in enumerate([(-720, -450), (720, -450), (-720, 450), (720, 450)])],
        B("lower-shelf", [1440, 820, 100], [0, 0, 260]),
    ]),
    A(FAB, "electrode-storage-oven", "Electrode storage oven", "Shop-floor cabinet oven with insulated body, double doors, control panel, ventilation cap, and rack feet.", "#9b7454", [
        B("cabinet", [1120, 780, 1540], [0, 0, 830]), B("toe-kick", [1180, 840, 150], [0, 0, 75]),
        *[B(f"oven-door-{i}", [510, 55, 1280], [x, -420, 880]) for i, x in enumerate([-270, 270])],
        B("control-panel", [240, 80, 520], [610, -430, 900]), B("vent-cap", [360, 420, 160], [0, 0, 1680]),
        *[B(f"rack-foot-{i}", [120, 130, 240], [x, y, 190]) for i, (x, y) in enumerate([(-430, -280), (430, -280), (-430, 280), (430, 280)])],
    ]),
    A(FAB, "welding-curtain-screen", "Welding curtain screen", "Portable hot-work screen with a weighted base, framed panels, hinged center seam, and caster-like feet.", "#7e7060", [
        *[B(f"panel-frame-{i}", [80, 105, 1500], [x, 0, 750]) for i, x in enumerate([-650, 0, 650])],
        *[B(f"curtain-panel-{i}", [600, 55, 1280], [x, 0, 790]) for i, x in enumerate([-320, 320])],
        *[B(f"base-foot-{i}", [700, 500, 110], [x, 0, 55]) for i, x in enumerate([-650, 650])],
        *[C(f"caster-{i}", 90, 65, [x, y, 65], segments=8) for i, (x, y) in enumerate([(-820, -210), (820, -210), (-820, 210), (820, 210)])],
    ]),

    A(OUTFIT, "vessel-shore-power-pedestal", "Vessel shore power pedestal", "Weatherproof service cabinet on a raised plinth with cable outlets, protective cover, and side cable hooks.", "#6f8580", [
        B("plinth", [880, 820, 180], [0, 0, 90]), B("cabinet", [720, 650, 1560], [0, 0, 960]),
        B("door", [570, 55, 1180], [0, -355, 1010]), *[C(f"outlet-{i}", 110, 90, [x, -410, z], [90, 0, 0], 10) for i, (x, z) in enumerate([(-180, 630), (180, 630), (-180, 1120), (180, 1120)])],
        *[B(f"cable-hook-{i}", [90, 300, 90], [x, 400, z]) for i, (x, z) in enumerate([(-420, 1030), (420, 1030)])],
    ]),
    A(OUTFIT, "yard-cable-reel-cart", "Yard cable reel cart", "Portable cable handling cart with a guarded reel, through axle, push handle, and four shop-floor wheels.", "#b27046", [
        B("cart-deck", [1200, 680, 130], [0, 0, 370]),
        *[B(f"side-frame-{i}", [100, 150, 1120], [x, 0, 930]) for i, x in enumerate([-500, 500])],
        C("cable-drum", 620, 370, [0, 0, 1050], [90, 0, 0], 16),
        *[C(f"support-wheel-{i}", 90, 180, [x, y, 180], [90, 0, 0], 10) for i, (x, y) in enumerate([(-540, -330), (540, -330), (-540, 330), (540, 330)])],
        B("push-handle", [100, 800, 90], [-580, 0, 1040]), B("drum-lock", [80, 300, 300], [365, -250, 800]),
    ]),
    A(OUTFIT, "welding-gas-cylinder-trolley", "Welding gas cylinder trolley", "Two-cylinder shop trolley with retaining straps, wheel guard, pull handle, and a low toe plate.", "#759084", [
        B("toe-plate", [680, 500, 130], [0, 0, 65]),
        *[C(f"gas-cylinder-{i}", 1320, 210, [x, 0, 790], segments=12) for i, x in enumerate([-200, 200])],
        *[B(f"retaining-band-{i}", [650, 130, 80], [0, y, z]) for i, (y, z) in enumerate([(-20, 560), (-20, 1040)])],
        *[C(f"trolley-wheel-{i}", 90, 230, [x, 0, 230], [0, 90, 0], 12) for i, x in enumerate([-420, 420])],
        B("pull-handle", [90, 110, 1180], [-480, 0, 930]), B("top-grip", [100, 660, 100], [-480, 0, 1510]),
    ]),
    A(OUTFIT, "portable-ventilation-fan", "Portable ventilation fan", "Axial ventilation fan in a square carry frame with a circular hub, four broad blades, and a floor stand.", "#708984", [
        B("fan-frame", [1180, 220, 1180], [0, 0, 710]), C("fan-hub", 200, 230, [0, -170, 710], [90, 0, 0], 14),
        *[B(f"fan-blade-{i}", [480, 100, 150], [x, -185, z]) for i, (x, z) in enumerate([(0, 1000), (0, 420), (-290, 710), (290, 710)])],
        *[B(f"stand-leg-{i}", [130, 130, 390], [x, y, 195]) for i, (x, y) in enumerate([(-430, -350), (430, -350), (-430, 350), (430, 350)])],
        B("carry-handle", [320, 80, 90], [0, 0, 1370]),
    ]),
    A(OUTFIT, "flexible-duct-hose-stand", "Flexible duct hose stand", "Mobile stand carrying a coiled ventilation duct, with a central post, spool arms, base, and wheel set.", "#8a765d", [
        B("base", [1100, 900, 130], [0, 0, 65]), C("duct-coil", 430, 410, [0, 0, 790], [90, 0, 0], 16),
        B("spool-shaft", [120, 1040, 120], [0, 0, 790]),
        *[B(f"spool-arm-{i}", [760, 90, 90], [x, 0, 790]) for i, x in enumerate([-430, 430])],
        *[C(f"caster-{i}", 85, 85, [x, y, 85], segments=8) for i, (x, y) in enumerate([(-430, -330), (430, -330), (-430, 330), (430, 330)])],
        B("handle", [80, 700, 680], [500, 0, 420]),
    ]),
    A(OUTFIT, "fire-watch-response-cart", "Fire watch response cart", "Hot-work watch cart with a tool chest, hose reel, extinguisher cradle, and a tall signal mast.", "#b45a42", [
        B("cart-frame", [1280, 700, 150], [0, 0, 430]), B("tool-chest", [760, 560, 660], [-170, 0, 835]),
        C("hose-reel", 180, 300, [480, 0, 850], [90, 0, 0], 14),
        B("extinguisher-cradle", [300, 350, 520], [420, 300, 690]), C("signal-mast", 1030, 45, [550, 280, 1480], segments=8),
        *[C(f"cart-wheel-{i}", 80, 165, [x, y, 165], [90, 0, 0], 10) for i, (x, y) in enumerate([(-520, -300), (520, -300), (-520, 300), (520, 300)])],
        B("push-handle", [90, 650, 90], [-650, 0, 940]),
    ]),
    A(OUTFIT, "temporary-work-light-mast", "Temporary work light mast", "Portable telescoping light mast on a stabilizing base with a four-lamp head and cable hook.", "#d5a951", [
        B("base-foot", [760, 760, 150], [0, 0, 75]), B("mast-lower", [140, 140, 1750], [0, 0, 1025]),
        B("mast-upper", [100, 100, 1400], [0, 0, 2600]), B("lamp-bar", [1050, 140, 120], [0, 0, 3260]),
        *[B(f"lamp-{i}", [190, 180, 250], [-390 + i * 260, -70, 3060]) for i in range(4)],
        *[B(f"stabilizer-{i}", [700, 120, 90], [x, y, 45]) for i, (x, y) in enumerate([(-520, 0), (520, 0), (0, -520), (0, 520)])],
        B("cable-hook", [120, 120, 310], [170, 180, 1750]),
    ]),
    A(OUTFIT, "dockside-service-hose-reel", "Dockside service hose reel", "Quay-side hose station with a large drum, guarded side plates, swivel base, and outlet standpipe.", "#72827c", [
        B("base-plinth", [1160, 980, 180], [0, 0, 90]),
        *[C(f"reel-side-plate-{i}", 110, 520, [0, y, 820], [90, 0, 0], 16) for i, y in enumerate([-400, 400])],
        C("reel-drum", 620, 360, [0, 0, 820], [90, 0, 0], 16),
        B("outlet-pipe", [150, 150, 620], [560, 0, 490]), B("handle", [120, 780, 100], [470, 0, 1200]),
        B("hose-guide", [120, 170, 380], [640, 0, 960]),
    ]),
    A(OUTFIT, "pipe-pressure-test-skid", "Pipe pressure test skid", "Service skid with a manifold header, short pipe sections, handwheel-shaped valves, and a drip tray.", "#71847d", [
        B("drip-tray", [1850, 840, 110], [0, 0, 55]), B("header", [1420, 150, 160], [0, 0, 920]),
        *[B(f"test-leg-{i}", [140, 140, 650], [-500 + i * 500, 0, 515]) for i in range(3)],
        *[C(f"valve-handwheel-{i}", 55, 130, [-500 + i * 500, -120, 800], [90, 0, 0], 12) for i in range(3)],
        *[B(f"support-{i}", [130, 130, 700], [x, y, 405]) for i, (x, y) in enumerate([(-680, -280), (680, -280), (-680, 280), (680, 280)])],
        B("gauge-panel", [420, 100, 420], [800, -250, 600]),
    ]),
    A(OUTFIT, "electrical-test-cart", "Electrical test cart", "Mobile electrical checkout cart with a control panel, cable hooks, guarded wheels, and a lower instrument shelf.", "#667d7a", [
        B("cart-deck", [1160, 740, 130], [0, 0, 420]), B("panel-cabinet", [800, 360, 900], [0, 80, 930]),
        B("panel-door", [680, 55, 700], [0, -115, 960]), *[C(f"indicator-{i}", 55, 45, [-230 + i * 150, -160, 1210], [90, 0, 0], 8) for i in range(4)],
        B("instrument-shelf", [980, 420, 100], [0, 80, 220]), B("push-handle", [80, 700, 100], [-560, 80, 1100]),
        *[C(f"cart-wheel-{i}", 80, 150, [x, y, 150], [90, 0, 0], 10) for i, (x, y) in enumerate([(-500, -300), (500, -300), (-500, 300), (500, 300)])],
        *[B(f"cable-hook-{i}", [90, 160, 330], [x, 420, z]) for i, (x, z) in enumerate([(-250, 1160), (250, 1160)])],
    ]),
    A(OUTFIT, "shipfitter-tool-cabinet", "Shipfitter tool cabinet", "Steel shop cabinet with paired doors, shallow drawer bank, top work surface, and a side-hung tool rail.", "#947656", [
        B("cabinet-body", [1260, 650, 1330], [0, 0, 745]), B("toe-kick", [1310, 700, 150], [0, 0, 75]),
        B("worktop", [1430, 800, 140], [0, 0, 1480]),
        *[B(f"door-{i}", [550, 45, 850], [x, -330, 860]) for i, x in enumerate([-300, 300])],
        *[B(f"drawer-{i}", [1080, 60, 120], [0, -360, 240 + i * 165]) for i in range(3)],
        B("side-tool-rail", [100, 480, 90], [680, 0, 1080]),
        *[B(f"foot-{i}", [130, 130, 180], [x, y, 90]) for i, (x, y) in enumerate([(-510, -250), (510, -250), (-510, 250), (510, 250)])],
    ]),
    A(OUTFIT, "modular-scaffold-bay", "Modular scaffold bay", "Short shipyard access scaffold with twin end frames, diagonal braces, a work deck, ladder rungs, and toe boards.", "#788781", [
        *[B(f"upright-{i}", [110, 110, 2140], [x, y, 1070]) for i, (x, y) in enumerate([(-920, -430), (920, -430), (-920, 430), (920, 430)])],
        *[B(f"ledger-{i}", [1840, 100, 100], [0, y, z]) for i, (y, z) in enumerate([(-430, 450), (430, 450), (-430, 1590), (430, 1590)])],
        *[B(f"cross-brace-{i}", [150, 920, 1100], [x, y, 1020]) for i, (x, y) in enumerate([(-920, -220), (920, 220)])],
        B("work-deck", [1740, 780, 110], [0, 0, 1570]), B("toe-board", [1740, 80, 150], [0, -390, 1700]),
        *[B(f"ladder-rung-{i}", [560, 85, 75], [-930, -470, 270 + i * 210]) for i in range(6)],
    ]),

    A(COATING, "abrasive-blast-pot", "Abrasive blast pot", "Portable pressure pot with a rounded vessel, top hopper, control manifold, twin wheels, and hose outlet.", "#a46c4e", [
        C("pressure-vessel", 950, 390, [0, 0, 690], segments=14), C("hopper", 360, 300, [0, 0, 1320], segments=12),
        B("top-lid", [610, 610, 120], [0, 0, 1570]), B("manifold", [620, 150, 180], [0, -340, 790]),
        *[C(f"wheel-{i}", 100, 220, [x, 0, 220], [0, 90, 0], 12) for i, x in enumerate([-520, 520])],
        B("hose-outlet", [190, 190, 350], [430, -180, 390]), B("handle", [100, 700, 100], [-570, 0, 1120]),
    ]),
    A(COATING, "grit-recovery-hopper", "Grit recovery hopper", "Low collection hopper with a sloped bin body, discharge cone, fork pockets, and removable screen deck.", "#8c765c", [
        B("bin-body", [1580, 1200, 980], [0, 0, 680]), B("screen-deck", [1680, 1300, 120], [0, 0, 1240]),
        B("discharge-neck", [620, 520, 330], [0, 0, 200]), B("fork-pocket-left", [350, 300, 190], [-530, 0, 130]),
        B("fork-pocket-right", [350, 300, 190], [530, 0, 130]),
        *[B(f"screen-rib-{i}", [1520, 45, 60], [0, -560 + i * 220, 1330]) for i in range(6)],
        B("outlet-flange", [700, 620, 90], [0, 0, 35]),
    ]),
    A(COATING, "blast-dust-collector", "Blast dust collector", "Compact dust extraction skid with filter canisters, inlet duct, service door, and wheeled base.", "#71837c", [
        B("skid", [1650, 980, 150], [0, 0, 75]),
        *[C(f"filter-canister-{i}", 1320, 240, [x, 0, 810], segments=12) for i, x in enumerate([-520, 0, 520])],
        B("inlet-duct", [1350, 190, 190], [0, -410, 1480]), B("fan-housing", [520, 520, 420], [760, 0, 430]),
        B("service-door", [420, 70, 720], [-820, 0, 780]),
        *[B(f"caster-{i}", [170, 170, 120], [x, y, 60]) for i, (x, y) in enumerate([(-680, -380), (680, -380), (-680, 380), (680, 380)])],
    ]),
    A(COATING, "coating-mix-cabinet", "Coating mix cabinet", "Ventilated material cabinet with a mixing worktop, paired lower doors, top extraction hood, and side shelf.", "#7d7567", [
        B("cabinet-body", [1440, 820, 1360], [0, 0, 760]), B("toe-kick", [1510, 880, 140], [0, 0, 70]),
        B("mixing-top", [1580, 960, 120], [0, 0, 1500]),
        *[B(f"lower-door-{i}", [650, 50, 920], [x, -420, 650]) for i, x in enumerate([-350, 350])],
        B("extraction-hood", [900, 620, 230], [0, 80, 1675]), B("side-shelf", [520, 560, 110], [980, 50, 1040]),
        B("vent-stack", [170, 170, 570], [0, 80, 2075]),
    ]),
    A(COATING, "hull-block-paint-booth", "Hull block paint booth", "Walk-in coating-bay frame with a wide entry, roof trusses, side curtains, and a raised extraction plenum.", "#77867e", [
        *[B(f"corner-post-{i}", [130, 130, 2780], [x, y, 1390]) for i, (x, y) in enumerate([(-1500, -1100), (1500, -1100), (-1500, 1100), (1500, 1100)])],
        *[B(f"roof-joist-{i}", [130, 2200, 140], [x, 0, 2810]) for i, x in enumerate([-1000, 0, 1000])],
        *[B(f"side-curtain-{i}", [90, 1850, 2500], [x, y, 1440]) for i, (x, y) in enumerate([(-1500, 0), (1500, 0)])],
        B("extraction-plenum", [2760, 500, 260], [0, 0, 3050]),
        *[B(f"entry-guide-{i}", [90, 130, 1200], [x, -1110, 600]) for i, x in enumerate([-1410, 1410])],
    ]),
    A(COATING, "paint-booth-filter-wall", "Paint booth filter wall", "Replaceable filter bank with modular frames, intake panels, a lower return plenum, and service feet.", "#6e8179", [
        *[B(f"filter-frame-{i}", [1050, 120, 1840], [-1050 + i * 700, 0, 920]) for i in range(4)],
        *[B(f"filter-panel-{i}", [650, 70, 1560], [-1050 + i * 700, -80, 900]) for i in range(4)],
        B("return-plenum", [3600, 440, 320], [0, 0, 160]),
        *[B(f"service-foot-{i}", [250, 360, 120], [x, 0, 60]) for i, x in enumerate([-1600, 1600])],
        B("top-cap", [3650, 300, 140], [0, 0, 1920]),
    ]),
    A(COATING, "airless-coating-pump-cart", "Airless coating pump cart", "Mobile coating pump with motor block, pressure manifold, hose reel, guarded wheels, and a pull handle.", "#b57848", [
        B("cart-base", [1300, 780, 160], [0, 0, 80]), B("pump-body", [560, 480, 620], [-250, 0, 470]),
        B("motor", [540, 420, 500], [340, 0, 410]), C("hose-reel", 170, 340, [400, 0, 1050], [90, 0, 0], 14),
        *[C(f"cart-wheel-{i}", 100, 190, [x, y, 190], [90, 0, 0], 10) for i, (x, y) in enumerate([(-520, -320), (520, -320), (-520, 320), (520, 320)])],
        B("manifold", [620, 150, 200], [-260, -310, 880]), B("pull-handle", [90, 700, 90], [-650, 0, 770]),
    ]),
    A(COATING, "surface-prep-drying-rack", "Surface preparation drying rack", "Open rack for small hull panels with four uprights, removable cross bars, tray feet, and spacing stops.", "#78847c", [
        *[B(f"upright-{i}", [120, 140, 1940], [x, y, 970]) for i, (x, y) in enumerate([(-920, -520), (920, -520), (-920, 520), (920, 520)])],
        *[B(f"crossbar-{i}", [1840, 150, 110], [0, y, z]) for i, (y, z) in enumerate([(-520, 640), (520, 640), (-520, 1310), (520, 1310)])],
        *[B(f"panel-stop-{i}", [130, 210, 580], [x, y, 1740]) for i, (x, y) in enumerate([(-720, -520), (720, -520), (-720, 520), (720, 520)])],
        *[B(f"tray-foot-{i}", [380, 320, 130], [x, y, 65]) for i, (x, y) in enumerate([(-920, -520), (920, -520), (-920, 520), (920, 520)])],
    ]),
    A(COATING, "paint-curing-air-heater", "Paint curing air heater", "Ducted industrial air heater on a skid with a fan cabinet, outlet plenum, and hose connection.", "#a76845", [
        B("heater-skid", [1700, 900, 140], [0, 0, 70]), B("fan-cabinet", [900, 840, 980], [-300, 0, 630]),
        B("outlet-plenum", [720, 720, 420], [530, 0, 1050]), B("duct-collar", [300, 300, 230], [530, 0, 1380]),
        *[C(f"fan-grille-spoke-{i}", 50, 330, [x, y, z], [90, 0, 0], 12) for i, (x, y, z) in enumerate([(-300, -440, 680)])],
        B("service-panel", [540, 60, 700], [-300, -460, 630]),
        *[B(f"foot-{i}", [170, 180, 160], [x, y, 80]) for i, (x, y) in enumerate([(-650, -320), (650, -320), (-650, 320), (650, 320)])],
    ]),
    A(COATING, "coating-climate-monitor-stand", "Coating climate monitor stand", "Portable environmental monitor on a mast with a weather shield, sample ports, and a weighted base.", "#d3a64b", [
        B("base", [650, 650, 150], [0, 0, 75]), B("mast", [100, 100, 1470], [0, 0, 885]),
        B("monitor-case", [550, 380, 620], [0, -80, 1790]), B("weather-shield", [680, 510, 130], [0, -80, 2165]),
        *[C(f"sample-port-{i}", 120, 65, [x, -310, z], [90, 0, 0], 8) for i, (x, z) in enumerate([(-150, 1630), (150, 1630)])],
        B("probe-arm", [100, 760, 100], [320, 180, 1450]), B("cable-clip", [150, 110, 110], [140, -100, 1120]),
    ]),
    A(COATING, "masking-material-rack", "Masking material rack", "Mobile rack for protective sheeting and tape rolls with a top crossbar, hanging dowels, and storage shelf.", "#7c867a", [
        *[B(f"side-post-{i}", [120, 140, 1910], [x, 0, 955]) for i, x in enumerate([-850, 850])],
        B("top-crossbar", [1710, 180, 150], [0, 0, 1940]),
        *[C(f"masking-roll-{i}", 980, 110, [-600 + i * 300, 0, 1430], [90, 0, 0], 12) for i in range(5)],
        B("lower-shelf", [1600, 800, 130], [0, 0, 330]),
        *[C(f"caster-{i}", 80, 75, [x, y, 75], segments=8) for i, (x, y) in enumerate([(-780, -320), (780, -320), (-780, 320), (780, 320)])],
    ]),

    A(MOVE, "shipyard-block-transporter", "Shipyard block transporter", "Low heavy-haul platform with a reinforced deck, wheel bogies, guide posts, and a tractor coupling beam.", "#c07842", [
        B("transport-deck", [3100, 1680, 260], [0, 0, 500]),
        *[B(f"bogie-frame-{i}", [620, 1840, 240], [x, 0, 210]) for i, x in enumerate([-1080, 1080])],
        *[C(f"bogie-wheel-{i}", 220, 170, [x, y, 170], [90, 0, 0], 12) for i, (x, y) in enumerate([(-1110, -760), (-1110, -260), (-1110, 260), (-1110, 760), (1110, -760), (1110, -260), (1110, 260), (1110, 760)])],
        *[B(f"guide-post-{i}", [140, 140, 620], [x, y, 940]) for i, (x, y) in enumerate([(-1450, -650), (1450, -650), (-1450, 650), (1450, 650)])],
        B("tractor-coupling", [720, 300, 180], [-1900, 0, 350]),
    ]),
    A(MOVE, "modular-axle-carrier", "Modular axle carrier", "Short modular transporter unit with a central load deck, paired axle beams, eight wheels, and side control boxes.", "#71837d", [
        B("load-deck", [2100, 1250, 220], [0, 0, 430]),
        *[B(f"axle-beam-{i}", [280, 1550, 240], [x, 0, 170]) for i, x in enumerate([-700, 700])],
        *[C(f"wheel-{i}", 180, 170, [x, y, 170], [90, 0, 0], 10) for i, (x, y) in enumerate([(-700, -620), (-700, -210), (-700, 210), (-700, 620), (700, -620), (700, -210), (700, 210), (700, 620)])],
        *[B(f"control-box-{i}", [270, 360, 340], [x, y, 710]) for i, (x, y) in enumerate([(-720, -790), (720, -790)])],
        B("coupling-pin", [180, 180, 360], [0, 780, 650]),
    ]),
    A(MOVE, "hull-block-spreader-beam", "Hull block spreader beam", "Generic lifting spreader with a central beam, four adjustable drop links, and soft-contact end shoes.", "#78827a", [
        B("main-beam", [3100, 260, 300], [0, 0, 1500]),
        *[B(f"lifting-lug-{i}", [260, 240, 420], [x, 0, 1860]) for i, x in enumerate([-1150, 1150])],
        *[B(f"drop-link-{i}", [110, 110, 980], [x, y, 1000]) for i, (x, y) in enumerate([(-1320, -580), (-1320, 580), (1320, -580), (1320, 580)])],
        *[B(f"contact-shoe-{i}", [500, 420, 160], [x, y, 440]) for i, (x, y) in enumerate([(-1320, -580), (-1320, 580), (1320, -580), (1320, 580)])],
        *[C(f"shackle-pin-{i}", 320, 80, [x, 0, 1990], [90, 0, 0], 10) for i, x in enumerate([-1150, 1150])],
    ]),
    A(MOVE, "assembly-block-pivot-dolly", "Assembly block pivot dolly", "Transfer dolly with a low pivot table, lock pins, paired bogies, and an adjustable central saddle.", "#75847d", [
        B("underframe", [1980, 1160, 260], [0, 0, 300]), B("pivot-table", [1460, 980, 180], [0, 0, 620]),
        C("pivot-ring", 90, 520, [0, 0, 755], segments=16), B("saddle", [780, 620, 360], [0, 0, 1010]),
        *[C(f"bogie-wheel-{i}", 150, 165, [x, y, 165], [90, 0, 0], 10) for i, (x, y) in enumerate([(-760, -500), (-760, 500), (760, -500), (760, 500)])],
        *[B(f"lock-pin-{i}", [120, 120, 300], [x, y, 860]) for i, (x, y) in enumerate([(-620, -390), (620, -390), (-620, 390), (620, 390)])],
    ]),
    A(MOVE, "plate-pack-transfer-cart", "Plate pack transfer cart", "Shop cart for short plate packs with fork-shaped deck rails, end stops, push bar, and four large wheels.", "#8a765d", [
        B("cart-deck", [1840, 1050, 180], [0, 0, 470]),
        *[B(f"deck-rail-{i}", [1630, 130, 180], [0, y, 650]) for i, y in enumerate([-340, 340])],
        *[B(f"end-stop-{i}", [140, 1020, 400], [x, 0, 760]) for i, x in enumerate([-850, 850])],
        *[C(f"wheel-{i}", 110, 230, [x, y, 230], [90, 0, 0], 12) for i, (x, y) in enumerate([(-650, -450), (650, -450), (-650, 450), (650, 450)])],
        B("push-bar", [100, 920, 100], [-930, 0, 980]), B("handle-grip", [120, 780, 120], [-930, 0, 1480]),
    ]),
    A(MOVE, "pipe-rack-fork-pocket", "Pipe rack with fork pockets", "Stackable pipe storage rack with upright dividers, fork pockets, a retaining rail, and a removable end stop.", "#70827b", [
        *[B(f"base-skid-{i}", [2600, 180, 180], [0, y, 90]) for i, y in enumerate([-600, 600])],
        *[B(f"divider-{i}", [150, 1120, 740], [-1000 + i * 500, 0, 550]) for i in range(5)],
        *[B(f"fork-pocket-{i}", [420, 300, 240], [x, 0, 210]) for i, x in enumerate([-700, 700])],
        B("retaining-rail", [2700, 120, 170], [0, 620, 920]), B("removable-stop", [130, 1160, 850], [1320, 0, 500]),
    ]),
    A(MOVE, "weld-consumable-issue-cage", "Weld consumable issue cage", "Lockable mesh-style store with framed walls, two shelves, a half-height counter, and a roof panel.", "#7a8580", [
        *[B(f"corner-post-{i}", [100, 100, 1750], [x, y, 875]) for i, (x, y) in enumerate([(-950, -500), (950, -500), (-950, 500), (950, 500)])],
        B("roof", [2050, 1150, 120], [0, 0, 1810]), B("counter", [1900, 520, 170], [0, -250, 620]),
        *[B(f"storage-shelf-{i}", [1800, 900, 100], [0, 0, z]) for i, z in enumerate([930, 1350])],
        *[B(f"wall-rail-{i}", [1850, 70, 70], [0, y, z]) for i, (y, z) in enumerate([(-500, 480), (500, 480), (-500, 1320), (500, 1320)])],
        B("lockable-door", [620, 80, 1240], [-600, -560, 980]),
    ]),
    A(MOVE, "yard-material-tug-cart", "Yard material tug cart", "Low powered yard tug with an open operator bay, tow hook, bumper rails, and chunky traction wheels.", "#b87942", [
        B("chassis", [1500, 850, 230], [0, 0, 410]), B("operator-floor", [740, 720, 120], [-300, 0, 590]),
        B("front-cowl", [620, 820, 600], [480, 0, 830]), B("seat", [440, 460, 180], [-450, 0, 920]),
        B("overhead-guard", [880, 760, 130], [-330, 0, 1640]),
        *[C(f"traction-wheel-{i}", 190, 310, [x, y, 310], [90, 0, 0], 12) for i, (x, y) in enumerate([(-550, -490), (550, -490), (-550, 490), (550, 490)])],
        B("tow-hook", [240, 180, 260], [-900, 0, 290]), B("bumper", [180, 1000, 170], [870, 0, 250]),
    ]),
    A(MOVE, "low-profile-material-skid", "Low-profile material skid", "Reinforced ground skid with deck beams, lifting eyes, corner bumpers, and a replaceable wear plate.", "#75847a", [
        B("wear-plate", [2180, 1420, 100], [0, 0, 50]),
        *[B(f"deck-beam-{i}", [190, 1320, 220], [x, 0, 210]) for i, x in enumerate([-800, 0, 800])],
        *[B(f"lifting-eye-{i}", [180, 160, 440], [x, y, 510]) for i, (x, y) in enumerate([(-940, -570), (940, -570), (-940, 570), (940, 570)])],
        *[B(f"corner-bumper-{i}", [260, 260, 260], [x, y, 230]) for i, (x, y) in enumerate([(-1020, -650), (1020, -650), (-1020, 650), (1020, 650)])],
    ]),
    A(MOVE, "drydock-edge-guard-section", "Drydock edge guard section", "Removable edge protection with weighted feet, rail posts, twin guard rails, and a high-visibility end panel.", "#d3a347", [
        *[B(f"base-foot-{i}", [380, 440, 110], [x, 0, 55]) for i, x in enumerate([-1000, 0, 1000])],
        *[B(f"rail-post-{i}", [100, 100, 1150], [x, 0, 680]) for i, x in enumerate([-1000, 0, 1000])],
        *[B(f"guard-rail-{i}", [2050, 90, 100], [0, 0, z]) for i, z in enumerate([460, 1040])],
        B("end-warning-panel", [420, 100, 780], [1040, 0, 790]),
    ]),
    A(MOVE, "mobile-hull-access-platform", "Mobile hull access platform", "Low rolling work deck with adjustable-height posts, guard rails, end stops, and a central access step.", "#71847e", [
        B("deck", [1760, 1080, 150], [0, 0, 660]),
        *[B(f"lift-post-{i}", [120, 120, 560], [x, y, 300]) for i, (x, y) in enumerate([(-700, -400), (700, -400), (-700, 400), (700, 400)])],
        *[B(f"guard-post-{i}", [80, 80, 620], [x, y, 1045]) for i, (x, y) in enumerate([(-700, -400), (0, -400), (700, -400), (-700, 400), (0, 400), (700, 400)])],
        *[B(f"guard-rail-{i}", [700, 65, 75], [x, y, 1300]) for i, (x, y) in enumerate([(-350, -400), (350, -400), (-350, 400), (350, 400)])],
        *[C(f"wheel-{i}", 110, 150, [x, y, 150], [90, 0, 0], 10) for i, (x, y) in enumerate([(-750, -460), (750, -460), (-750, 460), (750, 460)])],
        B("access-step", [620, 330, 130], [0, -680, 65]),
    ]),
    A(INSPECT, "hull-survey-grid-frame", "Hull survey grid frame", "Portable reference frame with an open rectangle, graduated crossbars, leveling feet, and target mounts.", "#6e817a", [
        *[B(f"frame-rail-{i}", [2300, 110, 120], [0, y, z]) for i, (y, z) in enumerate([(-650, 60), (650, 60), (-650, 1800), (650, 1800)])],
        *[B(f"upright-{i}", [110, 110, 1800], [x, y, 900]) for i, (x, y) in enumerate([(-1150, -650), (1150, -650), (-1150, 650), (1150, 650)])],
        *[B(f"cross-reference-{i}", [180, 1320, 100], [x, 0, z]) for i, (x, z) in enumerate([(-600, 650), (0, 900), (600, 1150)])],
    ]),
    A(INSPECT, "hull-profile-template-rack", "Hull profile template rack", "A-frame storage rack for reusable hull-section templates with separated bays, base rails, and end stops.", "#8f795e", [
        *[B(f"base-runner-{i}", [1950, 180, 160], [0, y, 80]) for i, y in enumerate([-500, 500])],
        *[B(f"divider-{i}", [125, 1100, 1660], [-800 + i * 400, 0, 830]) for i in range(5)],
        *[B(f"template-{i}", [70, 860, 1320], [-800 + i * 400, 0, 1490]) for i in range(4)],
        B("top-restraint", [1780, 130, 130], [0, 0, 1710]), B("end-stop", [120, 1050, 520], [960, 0, 420]),
    ]),
    A(INSPECT, "alignment-target-stand", "Alignment target stand", "Compact positioning stand with a tripod-like base, adjustable upright, target plate, and crosshair bezel.", "#d1a84e", [
        B("base-foot", [720, 720, 110], [0, 0, 55]), B("upright", [100, 100, 1260], [0, 0, 685]),
        B("target-plate", [620, 100, 620], [0, -35, 1390]), B("target-center", [250, 80, 250], [0, -100, 1390]),
        *[B(f"crosshair-{i}", [430, 35, 35], [0, -150, z]) for i, z in enumerate([1260, 1520])],
        *[B(f"tripod-foot-{i}", [600, 160, 100], [x, y, 50]) for i, (x, y) in enumerate([(-430, -330), (430, -330), (0, 430)])],
    ]),
    A(INSPECT, "optical-measurement-station", "Optical measurement station", "Portable optical measurement head on a tripod base with a hooded sensor, side handle, and target mast.", "#718780", [
        *[B(f"tripod-leg-{i}", [120, 120, 980], [x, y, 450]) for i, (x, y) in enumerate([(-420, -320), (420, -320), (0, 420)])],
        B("instrument-base", [580, 580, 180], [0, 0, 970]), B("instrument-head", [720, 610, 540], [0, 0, 1330]),
        B("optical-hood", [480, 440, 300], [0, -350, 1470]), C("lens-ring", 100, 180, [0, -520, 1470], [90, 0, 0], 14),
        B("side-handle", [100, 540, 100], [440, 100, 1350]), B("target-mast", [80, 80, 780], [0, 430, 1420]),
    ]),
    A(INSPECT, "weld-inspection-light-stand", "Weld inspection light stand", "Portable inspection light with a weighted base, height mast, twin lamp heads, and a cable hook.", "#d2a64c", [
        B("weighted-base", [620, 620, 170], [0, 0, 85]), B("mast", [100, 100, 1560], [0, 0, 950]),
        B("crossbar", [900, 120, 100], [0, 0, 1750]),
        *[B(f"lamp-head-{i}", [320, 230, 280], [x, 0, 1620]) for i, x in enumerate([-280, 280])],
        *[B(f"lamp-lens-{i}", [220, 50, 190], [x, -130, 1620]) for i, x in enumerate([-280, 280])],
        B("cable-hook", [90, 330, 80], [120, 140, 1240]), B("carry-handle", [320, 80, 100], [0, 0, 1860]),
    ]),
    A(INSPECT, "ultrasonic-test-cart", "Ultrasonic test cart", "Inspection trolley with a protective instrument case, probe holders, cable spool, and four swivel-style wheels.", "#71867d", [
        B("cart-platform", [1150, 760, 130], [0, 0, 420]), B("instrument-case", [780, 570, 650], [0, 0, 810]),
        B("case-lid", [810, 600, 100], [0, 0, 1185]), C("cable-spool", 180, 290, [470, 0, 900], [90, 0, 0], 14),
        *[B(f"probe-holder-{i}", [130, 150, 260], [-280 + i * 190, -350, 1280]) for i in range(4)],
        *[C(f"cart-wheel-{i}", 90, 155, [x, y, 155], [90, 0, 0], 10) for i, (x, y) in enumerate([(-500, -320), (500, -320), (-500, 320), (500, 320)])],
        B("push-handle", [90, 700, 90], [-550, 0, 1120]),
    ]),
    A(INSPECT, "confined-space-rescue-tripod", "Confined-space rescue tripod", "Portable access tripod with three feet, a head bridge, a winch housing, and a suspended retrieval line.", "#d19f45", [
        *[B(f"tripod-leg-{i}", [130, 130, 1940], [x, y, 970]) for i, (x, y) in enumerate([(-650, -500), (650, -500), (0, 650)])],
        B("head-bridge", [1380, 180, 180], [0, 0, 1980]), B("winch-housing", [430, 330, 420], [0, -100, 1680]),
        C("retrieval-drum", 340, 150, [0, -280, 1660], [90, 0, 0], 12),
        B("retrieval-line", [60, 60, 1440], [0, -280, 880]),
        *[B(f"foot-pad-{i}", [360, 280, 110], [x, y, 55]) for i, (x, y) in enumerate([(-650, -500), (650, -500), (0, 650)])],
    ]),
    A(INSPECT, "portable-weld-fume-extractor", "Portable weld fume extractor", "Mobile extraction unit with a filter cabinet, flexible-arm mast, capture hood, and guarded wheels.", "#71857f", [
        B("cabinet", [920, 760, 1120], [0, 0, 700]), B("filter-cover", [980, 820, 160], [0, 0, 1340]),
        B("arm-base", [180, 180, 520], [300, 250, 1620]),
        *[B(f"arm-segment-{i}", [120, 120, 680], [x, y, z]) for i, (x, y, z) in enumerate([(300, 250, 2200), (300, 250, 2760)])],
        B("capture-hood", [520, 400, 180], [300, 250, 3180]),
        *[C(f"wheel-{i}", 90, 155, [x, y, 155], [90, 0, 0], 10) for i, (x, y) in enumerate([(-390, -320), (390, -320), (-390, 320), (390, 320)])],
        B("service-door", [650, 70, 620], [0, -410, 700]),
    ]),
    A(INSPECT, "refit-service-bench", "Refit service bench", "Repair bench with a heavy worktop, vise, drawer bank, tool backboard, and a lower storage shelf.", "#8e775a", [
        B("worktop", [1950, 920, 160], [0, 0, 1020]),
        *[B(f"bench-leg-{i}", [140, 140, 940], [x, y, 470]) for i, (x, y) in enumerate([(-820, -350), (820, -350), (-820, 350), (820, 350)])],
        B("lower-shelf", [1690, 720, 110], [0, 0, 250]), B("backboard", [1900, 100, 880], [0, 400, 1540]),
        B("vise-base", [380, 320, 110], [620, -80, 1155]), B("vise-jaw-left", [90, 350, 180], [490, -100, 1300]),
        B("vise-jaw-right", [90, 350, 180], [750, -100, 1300]),
        *[B(f"drawer-{i}", [560, 60, 140], [-450, -480, 350 + i * 190]) for i in range(4)],
    ]),
    A(INSPECT, "vessel-refit-job-board", "Vessel refit job board", "Freestanding job-status board with a wheeled base, framed planning panel, magnetic columns, and document tray.", "#73847d", [
        B("board-frame", [1700, 140, 1320], [0, 0, 1700]), B("planning-panel", [1540, 90, 1100], [0, -95, 1700]),
        *[B(f"column-divider-{i}", [45, 55, 1040], [-520 + i * 520, -150, 1700]) for i in range(3)],
        B("header-rail", [1600, 120, 120], [0, -110, 2300]), B("document-tray", [1200, 360, 120], [0, -210, 990]),
        *[B(f"support-post-{i}", [100, 100, 1060], [x, 0, 530]) for i, x in enumerate([-650, 650])],
        *[C(f"board-wheel-{i}", 80, 100, [x, y, 100], [90, 0, 0], 8) for i, (x, y) in enumerate([(-650, -175), (650, -175), (-650, 175), (650, 175)])],
        *[B(f"frame-foot-{i}", [720, 420, 110], [x, 0, 55]) for i, x in enumerate([-650, 650])],
    ]),
]

ORIGIN_OFFSETS_MM = {
    "drydock-access-stair-tower": -65,
    "grit-recovery-hopper": 10,
    "hull-block-spreader-beam": -360,
    "optical-measurement-station": 40,
    "plasma-cutting-gantry-head": -640,
}


def fmt(value):
    return json.dumps(value, ensure_ascii=True, separators=(", ", ": "))


def source_for(item):
    part_lines = []
    origin_offset_mm = ORIGIN_OFFSETS_MM.get(item["id"], 0)
    kinds = {part["kind"] for part in item["parts"]}
    for part in item["parts"]:
        if part["kind"] == "box":
            call = f"B({fmt(part['name'])}, {fmt(part['size'])}, {fmt(part['at'])}"
            if part.get("rotation"):
                call += f", {fmt(part['rotation'])}"
            part_lines.append(call + ");")
        elif part["kind"] == "cylinder":
            call = f"C({fmt(part['name'])}, {part['height']}, {part['radius']}, {fmt(part['at'])}"
            if part.get("rotation") or part.get("segments", 10) != 10:
                call += f", {fmt(part.get('rotation') or [0, 0, 0])}, {part.get('segments', 10)}"
            part_lines.append(call + ");")
        else:
            part_lines.append(f"S({fmt(part['name'])}, {part['radius']}, {fmt(part['at'])});")
    helpers = ["""const place = (name: string, shape: Shape, at: [number, number, number]) => {
  p.part(name, shape.translate(at[0], at[1], at[2] + originOffsetMm).scale(scale).color(color));
};"""]
    if "box" in kinds:
        helpers.append("""const B = (name: string, size: [number, number, number], at: [number, number, number], rotation?: [number, number, number]) => {
  let shape = box(size[0], size[1], size[2], true);
  if (rotation?.[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation?.[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation?.[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};""")
    if "cylinder" in kinds:
        helpers.append("""const C = (name: string, height: number, radius: number, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], segments = 10) => {
  let shape = cylinder(height, radius, segments);
  if (rotation[0]) shape = shape.rotate([1, 0, 0], rotation[0]);
  if (rotation[1]) shape = shape.rotate([0, 1, 0], rotation[1]);
  if (rotation[2]) shape = shape.rotate([0, 0, 1], rotation[2]);
  place(name, shape, at);
};""")
    if "sphere" in kinds:
        helpers.append("const S = (name: string, radius: number, at: [number, number, number]) => place(name, sphere(radius), at);")
    return f'''// Original shipyard scene asset. Millimetres, Z up, base origin.
meta({{
  name: {fmt(item["id"])},
  license: "CC0-1.0",
  title: {fmt(item["title"])},
  description: {fmt(item["description"] + " Editable overall scale and asset color.")},
  tags: ["shipyard", "shipbuilding", "drydock", "refit", "low poly", "CC0", {fmt(item["group"].lower())}],
  kit: "shipyard",
  category: "prop",
  origin: "base",
  compat: ["shipyard", "marine", "drydock", "ship-repair"],
  triangleBudget: 1800,
}});

const scale = param("scale", 1, {{ label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 }});
const color = param("color", {fmt(item["color"])}, {{ label: "Asset color" }});
const originOffsetMm = {origin_offset_mm};
const p = assembly({fmt(item["id"])});

{chr(10).join(helpers)}

{chr(10).join(part_lines)}

return p.model();
'''


def main():
    ids = [item["id"] for item in ASSETS]
    if len(ids) != 70 or len(set(ids)) != len(ids):
        raise SystemExit(f"expected 70 unique assets, got {len(ids)} rows / {len(set(ids))} ids")
    KIT.mkdir(parents=True, exist_ok=True)
    expected = set(ids)
    for existing in KIT.glob("*.kcad.ts"):
        if existing.stem not in expected:
            (KIT / "previews" / f"{existing.stem}.png").unlink(missing_ok=True)
            existing.unlink()
    for item in ASSETS:
        (KIT / f"{item['id']}.kcad.ts").write_text(source_for(item), encoding="utf-8")
    (KIT / "kit.json").write_text(json.dumps({
        "title": "Shipyard",
        "description": "Visualization assets for drydock work, hull-block fabrication, outfitting, coating, yard movement, and refit support.",
    }, indent=2) + "\n", encoding="utf-8")
    grouped = defaultdict(list)
    for item in ASSETS:
        grouped[item["group"]].append(item)
    lines = [
        "# Shipyard kit", "",
        "Seventy original low-poly scene props for shipyard construction, repair, block fabrication, and drydock operations. Sources use millimetres and Z up. Each asset exposes overall scale and asset color, uses one material, and declares a 1,800-triangle ceiling. All geometry is dedicated to the public domain under CC0 1.0.", "",
    ]
    for group, items in grouped.items():
        lines.extend([f"## {group}", "", ", ".join(f"`{item['id']}`" for item in items) + ".", ""])
    lines.extend([
        "## Preview and verification", "",
        "The [shipyard wave bundle](../../../artifacts/catalog-demos/shipyard-wave-20261103/README.md) contains the reproducible source generator, catalog audit, rendered previews, parameter check, and inspected MP4 walkthrough.", "",
        "These are generic visualization props. They do not specify vessel structure, lift capacity, welding procedures, drydock certification, occupational-safety compliance, or repair instructions. Catalog validation does not establish shipyard or vessel safety, regulatory compliance, or operational acceptance.", "",
    ])
    (KIT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {len(ASSETS)} assets to {KIT}")


if __name__ == "__main__":
    main()
