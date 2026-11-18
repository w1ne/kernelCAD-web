#!/usr/bin/env python3
"""Generate the original parametric amusement-park scene kit."""
from collections import defaultdict
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog" / "kits" / "amusement-park"


def B(name, size, at, rotation=None):
    return {"kind": "box", "name": name, "size": size, "at": at, "rotation": rotation}


def C(name, height, radius, at, rotation=None, segments=10):
    return {"kind": "cylinder", "name": name, "height": height, "radius": radius,
            "at": at, "rotation": rotation, "segments": segments}


def S(name, radius, at):
    return {"kind": "sphere", "name": name, "radius": radius, "at": at}


def A(group, id, title, description, color, parts):
    return {"group": group, "id": id, "title": title, "description": description,
            "color": color, "parts": parts}


ENTRY = "Entry and guest services"
RIDES = "Attractions and queues"
GAMES = "Midway games"
FOOD = "Concessions and rest areas"
OPS = "Park operations and guest comfort"

ASSETS = [
    A(ENTRY, "park-entry-arch", "Park entry arch", "Freestanding entry portal with paired columns, overhead canopy, and a raised central crest.", "#d66d4d", [
        B("left-column", [220, 260, 2750], [-1060, 0, 1375]), B("right-column", [220, 260, 2750], [1060, 0, 1375]),
        B("header-beam", [2380, 320, 260], [0, 0, 2760]), B("canopy", [2740, 640, 120], [0, 0, 2950]),
        B("crest-plinth", [600, 230, 220], [0, -20, 3130]), S("crest", 150, [0, -35, 3300]),
        *[B(f"column-band-{i}", [275, 278, 55], [x, 0, 420 + i * 530]) for i, x in enumerate([-1060, 1060]) for _ in [0]],
    ]),
    A(ENTRY, "ticket-window-booth", "Ticket window booth", "Compact staffed entry booth with a deep transaction ledge, shuttered window, side door, and rain canopy.", "#9c7550", [
        B("booth-body", [1500, 1050, 1900], [0, 0, 950]), B("front-counter", [1600, 240, 190], [0, -620, 1030]),
        B("window-frame", [780, 70, 570], [0, -545, 1490]), B("window-sill", [930, 150, 65], [0, -625, 1190]),
        B("service-shutter", [650, 35, 330], [0, -590, 1500]), B("side-door", [400, 45, 1120], [520, 535, 570]),
        B("canopy", [1780, 720, 110], [0, -80, 1990]), B("step", [620, 350, 90], [0, -700, 45]),
    ]),
    A(ENTRY, "admission-turnstile-bank", "Admission turnstile bank", "Three waist-high admission gates with rotating arms and a shared approach rail.", "#718b87", [
        B("approach-rail-front", [2200, 55, 900], [0, -520, 450]), B("approach-rail-rear", [2200, 55, 900], [0, 520, 450]),
        *[B(f"pedestal-{i}", [220, 260, 920], [-700 + i * 700, 0, 460]) for i in range(3)],
        *[B(f"turnstile-arm-{i}-{j}", [460, 42, 42], [-700 + i * 700 + dx, 0, 500], [0, 0, angle])
          for i in range(3) for j, (dx, angle) in enumerate([(0, 0), (0, 120), (0, 240)])],
        *[B(f"reader-{i}", [160, 120, 95], [-700 + i * 700, -20, 965]) for i in range(3)],
    ]),
    A(ENTRY, "ticket-vending-kiosk", "Ticket vending kiosk", "Self-service ticket terminal with a sheltered screen, receipt slot, and accessible-height controls.", "#69807e", [
        B("pedestal", [520, 450, 1020], [0, 0, 510]), B("screen-housing", [650, 135, 540], [0, -230, 1300]),
        B("display", [430, 24, 300], [0, -309, 1360]), B("weather-hood", [760, 390, 85], [0, -70, 1620]),
        B("ticket-slot", [190, 38, 80], [0, -309, 1110]), B("side-return", [310, 80, 55], [0, -310, 1000]),
        B("foot-plate", [700, 590, 70], [0, 0, 35]),
    ]),
    A(ENTRY, "guest-services-map-kiosk", "Guest services map kiosk", "Covered information stand with a large park map panel and a low shelf for printed guides.", "#94785c", [
        B("base", [780, 620, 140], [0, 0, 70]), B("support-post", [120, 130, 1460], [0, 90, 870]),
        B("map-panel", [1320, 150, 920], [0, -20, 1900]), B("map-frame-top", [1430, 205, 100], [0, -35, 2410]),
        B("map-frame-bottom", [1430, 205, 100], [0, -35, 1390]), B("guide-shelf", [1100, 430, 85], [0, -300, 970]),
        B("shelter-roof", [1640, 920, 120], [0, 50, 2540]),
    ]),
    A(ENTRY, "wayfinding-pylon", "Park wayfinding pylon", "Tall freestanding direction marker with three offset destination blades and a broad ground plinth.", "#d8aa54", [
        B("plinth", [740, 680, 180], [0, 0, 90]), B("mast", [190, 190, 3000], [0, 0, 1680]),
        B("north-blade", [1500, 150, 340], [150, 0, 2700], [0, 0, -7]),
        B("east-blade", [1270, 150, 330], [-90, 0, 2110], [0, 0, 6]),
        B("west-blade", [1400, 150, 330], [130, 0, 1510], [0, 0, -5]),
        C("emblem", 95, 150, [0, -120, 3210], [90, 0, 0], 12),
    ]),
    A(ENTRY, "entrance-planter", "Entrance planter", "Long entry plaza planter with four low ornamental shrubs spaced along a raised rim.", "#758967", [
        B("planter-box", [2100, 720, 420], [0, 0, 210]), B("rim", [2220, 820, 75], [0, 0, 450]),
        *[C(f"shrub-{i}", 560, 210, [x, 0, 520], segments=9) for i, x in enumerate([-720, -240, 240, 720])],
        *[S(f"shrub-crown-{i}", 200, [x, 0, 800]) for i, x in enumerate([-720, -240, 240, 720])],
    ]),
    A(ENTRY, "stroller-parking-rack", "Stroller parking rack", "Queue-side stroller corral with numbered bays, wheel stops, and a clear central aisle.", "#71827a", [
        B("base-rail-front", [2500, 70, 75], [0, -430, 38]), B("base-rail-back", [2500, 70, 75], [0, 430, 38]),
        *[B(f"bay-divider-{i}", [65, 850, 900], [-1000 + i * 500, 0, 450]) for i in range(5)],
        *[B(f"bay-number-plate-{i}", [210, 40, 160], [-1000 + i * 500, -460, 1020]) for i in range(5)],
        B("entry-side-rail", [75, 900, 750], [1250, 0, 375]),
    ]),
    A(ENTRY, "park-stroller", "Park stroller", "Single-seat visitor stroller with folding canopy, push handle, footrest, and paired wheels.", "#688b89", [
        B("seat-pan", [520, 620, 100], [0, 0, 700]), B("backrest", [520, 100, 720], [0, 210, 1080], [-12, 0, 0]),
        B("footrest", [390, 250, 70], [0, -300, 430]), B("canopy-rib", [60, 670, 65], [0, 160, 1510], [18, 0, 0]),
        B("canopy", [570, 720, 85], [0, 170, 1510], [18, 0, 0]), B("push-handle", [680, 65, 65], [0, 500, 1430]),
        *[C(f"wheel-{i}", 70, 205, [x, y, 205], [0, 90, 0], 12) for i, (x, y) in enumerate([(-360, -20), (360, -20)])],
        *[B(f"frame-leg-{i}", [55, 55, 700], [x, y, 500], [angle, 0, 0]) for i, (x, y, angle) in enumerate([(-300, 0, -15), (300, 0, -15), (-260, 260, 25), (260, 260, 25)])],
    ]),
    A(ENTRY, "family-locker-bank", "Family locker bank", "Six-door day-use locker unit with recessed-looking door panels, toe kick, and numbered header strip.", "#728b80", [
        B("locker-case", [2300, 640, 1840], [0, 0, 920]), B("toe-kick", [2330, 670, 130], [0, 0, 65]),
        B("top-header", [2360, 700, 170], [0, 0, 1945]),
        *[B(f"locker-door-{i}", [350, 35, 760], [-875 + (i % 3) * 875, -340, 500 + (i // 3) * 850]) for i in range(6)],
        *[B(f"locker-handle-{i}", [45, 50, 150], [-730 + (i % 3) * 875, -385, 500 + (i // 3) * 850]) for i in range(6)],
    ]),
    A(ENTRY, "wristband-checkin-desk", "Wristband check-in desk", "Guest check-in counter with wristband dispenser, handheld scanner cradle, and an accessible return shelf.", "#967a59", [
        B("counter-body", [1800, 760, 850], [0, 0, 425]), B("countertop", [1900, 850, 100], [0, 0, 900]),
        B("wristband-dispenser", [340, 310, 420], [-570, -60, 1160]), B("scanner-cradle", [270, 300, 240], [470, -110, 1070], [-14, 0, 0]),
        B("privacy-screen", [1350, 45, 420], [0, 340, 1170]), B("lower-return-shelf", [1100, 340, 80], [0, -90, 200]),
    ]),
    A(ENTRY, "lost-child-kiosk", "Lost child reunification kiosk", "Quiet guest-support station with a canopy, two-sided service counter, privacy screen, and waiting seat.", "#738d89", [
        B("base", [1500, 1100, 100], [0, 0, 50]), B("service-counter", [1420, 420, 870], [0, -180, 485]),
        B("privacy-screen", [1360, 65, 840], [0, 390, 920]), B("canopy", [1780, 1260, 120], [0, 40, 1420]),
        B("side-panel-left", [70, 740, 850], [-690, 220, 650]), B("side-panel-right", [70, 740, 850], [690, 220, 650]),
        B("waiting-seat", [650, 300, 90], [0, 700, 480]),
    ]),
    A(ENTRY, "first-aid-response-cart", "First aid response cart", "Compact wheeled response cart with divided supply drawers, grab handles, and a raised cross panel.", "#c96b58", [
        B("cart-body", [980, 620, 740], [0, 0, 480]), B("top-tray", [1040, 690, 95], [0, 0, 900]),
        *[B(f"drawer-{i}", [870, 45, 130], [0, -324, 330 + i * 190]) for i in range(3)],
        B("cross-vertical", [120, 45, 380], [-330, -365, 1150]), B("cross-horizontal", [350, 45, 120], [-330, -365, 1150]),
        *[C(f"caster-{i}", 52, 85, [x, y, 85], segments=8) for i, (x, y) in enumerate([(-360, -230), (360, -230), (-360, 230), (360, 230)])],
        B("push-bar", [760, 75, 75], [0, 355, 970]),
    ]),
    A(ENTRY, "accessible-entry-queue-gate", "Accessible entry queue gate", "Wide clear-opening gate with swing leaf, paired handrails, and a low threshold plate.", "#69847d", [
        B("threshold", [1850, 700, 50], [0, 0, 25]), B("left-post", [100, 100, 1200], [-870, 0, 600]),
        B("right-post", [100, 100, 1200], [870, 0, 600]), B("swing-leaf", [70, 1500, 900], [650, 0, 520], [0, 0, -35]),
        B("left-handrail", [1600, 70, 75], [-500, 250, 500]), B("right-handrail", [1600, 70, 75], [500, -250, 500]),
        B("operator-latch", [130, 100, 180], [795, 0, 1000]),
    ]),
    A(ENTRY, "entrance-photo-frame", "Entrance photo frame", "Freestanding family photo portal with a broad top beam, side plinths, and a camera-marked crest.", "#d9a657", [
        B("left-plinth", [260, 300, 1600], [-930, 0, 800]), B("right-plinth", [260, 300, 1600], [930, 0, 800]),
        B("photo-beam", [2100, 340, 230], [0, 0, 1650]), B("top-cap", [2350, 560, 115], [0, 0, 1820]),
        C("camera-emblem", 90, 160, [0, -190, 1680], [90, 0, 0], 12),
        *[B(f"frame-accent-{i}", [90, 120, 980], [x, -25, 800]) for i, x in enumerate([-770, 770])],
    ]),

    A(RIDES, "park-observation-wheel", "Park observation wheel", "Static scene wheel with a segmented rim, radial braces, ten enclosed gondolas, and a twin-leg base.", "#6e8885", [
        B("left-foundation", [760, 500, 150], [-510, 0, 75]), B("right-foundation", [760, 500, 150], [510, 0, 75]),
        B("left-support", [250, 280, 3350], [-500, 0, 1675], [0, -8, 0]), B("right-support", [250, 280, 3350], [500, 0, 1675], [0, 8, 0]),
        *[B(f"rim-segment-{i}", [125, 115, 940], [0, 1760 * math.sin(i * math.tau / 12), 3720 + 1760 * math.cos(i * math.tau / 12)], [-i * 30 - 90, 0, 0]) for i in range(12)],
        *[B(f"spoke-{i}", [75, 80, 1770], [0, 885 * math.sin(i * math.tau / 12), 3720 + 885 * math.cos(i * math.tau / 12)], [i * 30, 0, 0]) for i in range(12)],
        C("axle", 450, 210, [0, 0, 3720], [90, 0, 0], 12),
        *[B(f"gondola-hanger-{i}", [65, 70, 380], [0, 1700 * math.sin(i * math.tau / 10), 3720 + 1700 * math.cos(i * math.tau / 10) - 190]) for i in range(10)],
        *[B(f"gondola-{i}", [350, 300, 330], [0, 1700 * math.sin(i * math.tau / 10), 3720 + 1700 * math.cos(i * math.tau / 10) - 470]) for i in range(10)],
    ]),
    A(RIDES, "family-carousel", "Family carousel", "Round family ride platform with a central mast, radial canopy braces, and eight outward-facing seats.", "#d89055", [
        C("platform", 180, 1450, [0, 0, 0], segments=16), C("center-mast", 2560, 115, [0, 0, 180], segments=12),
        C("canopy", 170, 1280, [0, 0, 2560], segments=16), C("canopy-crown", 130, 380, [0, 0, 2730], segments=12),
        *[C(f"canopy-support-{i}", 950, 34, [1040 * math.cos(i * math.tau / 8), 1040 * math.sin(i * math.tau / 8), 1610], segments=8) for i in range(8)],
        *[C(f"seat-pole-{i}", 1440, 26, [980 * math.cos(i * math.tau / 8), 980 * math.sin(i * math.tau / 8), 1120], segments=8) for i in range(8)],
        *[B(f"seat-{i}", [370, 300, 250], [980 * math.cos(i * math.tau / 8), 980 * math.sin(i * math.tau / 8), 980], [0, 0, i * 45]) for i in range(8)],
    ]),
    A(RIDES, "tea-cup-spinner-car", "Tea cup spinner car", "Single round spinner tub with raised rim, seat bench, center grip, and a broad display base.", "#9c7891", [
        C("spinner-base", 110, 540, [0, 0, 55], segments=14), C("cup-body", 480, 420, [0, 0, 115], segments=14),
        C("cup-rim", 80, 475, [0, 0, 520], segments=14), C("center-grip", 470, 65, [0, 0, 575], segments=10),
        B("seat-bench", [460, 180, 170], [0, -165, 330]),
        *[B(f"cup-handle-{i}", [300, 75, 75], [x, y, 390]) for i, (x, y) in enumerate([(450, 0), (-450, 0), (0, 450), (0, -450)])],
    ]),
    A(RIDES, "junior-coaster-train-car", "Junior coaster train car", "Two-row family coaster car with paired wheels, lap-bar silhouettes, and a raised front fairing.", "#6e8e9d", [
        B("chassis", [1450, 820, 180], [0, 0, 360]), B("front-fairing", [540, 820, 470], [500, 0, 640], [0, -12, 0]),
        B("rear-seat", [420, 740, 250], [-460, 0, 730]), B("front-seat", [420, 740, 250], [260, 0, 730]),
        *[B(f"lap-bar-{i}", [75, 650, 280], [x, 0, 860], [0, 0, 0]) for i, x in enumerate([-460, 260])],
        *[C(f"wheel-{i}", 90, 135, [x, y, 150], [90, 0, 0], 10) for i, (x, y) in enumerate([(-520, -360), (520, -360), (-520, 360), (520, 360)])],
    ]),
    A(RIDES, "junior-coaster-track-section", "Junior coaster track section", "Short display section of family coaster rail with cross ties, two supports, and a gentle rise.", "#707d82", [
        *[B(f"rail-{i}", [3400, 95, 90], [0, y, 670 + i * 70], [0, -12, 0]) for i, y in enumerate([-360, 360])],
        *[B(f"cross-tie-{i}", [130, 840, 90], [-1450 + i * 580, 0, 590 + i * 27]) for i in range(6)],
        *[B(f"support-{i}", [100, 100, 620 + i * 70], [x, 0, 300 + i * 35]) for i, x in enumerate([-1200, 0, 1200])],
        B("base-foot", [3600, 1020, 65], [0, 0, 32]),
    ]),
    A(RIDES, "bumper-car", "Bumper car", "Single electric bumper car with four perimeter bumper rails, a low cockpit, overhead pickup mast, steering control, and four floor rollers.", "#d27057", [
        B("floor-pan", [1250, 940, 180], [0, 0, 280]),
        B("bumper-front", [1320, 95, 95], [0, -520, 250]), B("bumper-rear", [1320, 95, 95], [0, 520, 250]),
        B("bumper-left", [95, 1050, 95], [-650, 0, 250]), B("bumper-right", [95, 1050, 95], [650, 0, 250]),
        B("nose", [380, 640, 300], [510, 0, 440], [0, -15, 0]), B("seat", [420, 500, 300], [-120, 0, 500]),
        C("steering-column", 250, 24, [180, -20, 560], [0, -20, 0], 8), C("steering-wheel", 42, 140, [180, -20, 790], [90, 0, 0], 10),
        *[C(f"roller-{i}", 80, 110, [x, y, 110], [0, 90, 0], 8) for i, (x, y) in enumerate([(-410, -400), (410, -400), (-410, 400), (410, 400)])],
        C("power-pickup", 650, 24, [-400, 0, 650], segments=8),
    ]),
    A(RIDES, "miniature-park-tram-engine", "Miniature park tram engine", "Low-speed park railway locomotive with an open cab, front buffer, boiler hood, and four wheels.", "#6b8580", [
        B("chassis", [1760, 770, 230], [0, 0, 360]), B("cab-floor", [650, 720, 140], [-470, 0, 620]),
        B("cab-back", [85, 720, 970], [-760, 0, 1120]), B("cab-roof", [760, 850, 105], [-480, 0, 1630]),
        C("boiler", 880, 290, [430, 0, 480], [0, 90, 0], 12), C("smokestack", 330, 110, [700, 0, 920], segments=10),
        B("front-buffer", [170, 920, 180], [1010, 0, 230]),
        *[C(f"wheel-{i}", 95, 250, [x, y, 250], [90, 0, 0], 10) for i, (x, y) in enumerate([(-520, -420), (520, -420), (-520, 420), (520, 420)])],
    ]),
    A(RIDES, "miniature-park-tram-coach", "Miniature park tram coach", "Open-air visitor train coach with paired bench rows, side step, canopy roof, and four rail wheels.", "#7b9280", [
        B("underframe", [1850, 820, 200], [0, 0, 330]), B("floor", [1760, 780, 110], [0, 0, 480]),
        B("canopy-roof", [1980, 1040, 110], [0, 0, 1640]),
        *[B(f"canopy-post-{i}", [75, 75, 1050], [x, y, 1070]) for i, (x, y) in enumerate([(-850, -350), (850, -350), (-850, 350), (850, 350)])],
        *[B(f"bench-{i}", [650, 220, 210], [x, y, 760]) for i, (x, y) in enumerate([(-450, -210), (450, -210), (-450, 210), (450, 210)])],
        *[C(f"wheel-{i}", 90, 230, [x, y, 230], [90, 0, 0], 10) for i, (x, y) in enumerate([(-610, -430), (610, -430), (-610, 430), (610, 430)])],
    ]),
    A(RIDES, "drop-tower-seat-ring", "Drop tower seat ring", "Static circular ride-seat assembly with padded-looking backs, a central hub, and lower foot bars.", "#d59a54", [
        C("center-hub", 300, 370, [0, 0, 370], segments=14), C("seat-ring", 130, 940, [0, 0, 250], segments=16),
        *[B(f"seat-back-{i}", [330, 160, 620], [820 * math.cos(i * math.tau / 8), 820 * math.sin(i * math.tau / 8), 900], [0, 0, i * 45]) for i in range(8)],
        *[B(f"foot-bar-{i}", [330, 90, 90], [820 * math.cos(i * math.tau / 8), 820 * math.sin(i * math.tau / 8), 390], [0, 0, i * 45]) for i in range(8)],
        *[B(f"seat-base-{i}", [350, 360, 180], [820 * math.cos(i * math.tau / 8), 820 * math.sin(i * math.tau / 8), 470], [0, 0, i * 45]) for i in range(8)],
    ]),
    A(RIDES, "log-flume-boat", "Log flume boat", "Two-seat flume boat with raised bow, open seating well, rear grab bar, and keel-like lower profile.", "#79917f", [
        B("keel", [1760, 560, 170], [0, 0, 180]), B("hull", [2080, 1040, 390], [0, 0, 420], [0, -7, 0]),
        B("bow-cap", [450, 1040, 210], [940, 0, 690], [0, -18, 0]), B("seat-front", [150, 850, 240], [400, 0, 790]),
        B("seat-rear", [150, 850, 240], [-420, 0, 790]), B("grab-bar", [95, 850, 95], [-820, 0, 1100]),
        B("foot-well", [650, 520, 90], [0, 0, 680]),
    ]),
    A(RIDES, "pirate-ship-ride-car", "Pirate ship ride car", "Static swinging-ship-shaped ride car with stepped seating rows, a raised prow, and a central keel.", "#8c7358", [
        B("keel", [2280, 360, 220], [0, 0, 230]), B("hull", [2240, 720, 420], [0, 0, 500]),
        B("prow", [620, 760, 500], [970, 0, 730], [0, -28, 0]), B("stern", [460, 760, 390], [-970, 0, 660], [0, 18, 0]),
        *[B(f"seat-row-{i}", [340, 620, 210], [x, 0, 870 + i * 260]) for i, x in enumerate([-480, 0, 480])],
        B("mast", [85, 85, 990], [0, 0, 1440]), B("sail", [60, 620, 740], [0, 0, 1530]),
    ]),
    A(RIDES, "splash-pad-jet-column", "Splash pad jet column", "Low interactive water-play feature with a central jet post, four short spray arms, and a raised drain base.", "#6b9ba0", [
        C("drain-base", 90, 540, [0, 0, 45], segments=14), C("jet-column", 920, 70, [0, 0, 90], segments=10),
        *[C(f"spray-arm-{i}", 420, 40, [x, y, 420], [0, 0, angle], 8) for i, (x, y, angle) in enumerate([(180, 0, 90), (-180, 0, 90), (0, 180, 0), (0, -180, 0)])],
        *[S(f"nozzle-{i}", 56, [x, y, z]) for i, (x, y, z) in enumerate([(240, 0, 540), (-240, 0, 540), (0, 240, 540), (0, -240, 540)])],
    ]),
    A(RIDES, "playground-climber", "Playground climber", "Small family-zone climbing frame with a raised platform, ladder rungs, crawl-through opening, and slide.", "#d39b57", [
        B("platform", [880, 820, 110], [0, 0, 1120]), B("platform-post-0", [95, 95, 1120], [-350, -300, 560]),
        B("platform-post-1", [95, 95, 1120], [350, -300, 560]), B("platform-post-2", [95, 95, 1120], [-350, 300, 560]),
        B("platform-post-3", [95, 95, 1120], [350, 300, 560]),
        *[B(f"ladder-rung-{i}", [580, 75, 70], [0, -370, 250 + i * 190]) for i in range(5)],
        B("slide-bed", [520, 1340, 100], [0, 1040, 510], [-24, 0, 0]),
        *[B(f"slide-rail-{i}", [80, 1380, 250], [x, 1040, 590], [-24, 0, 0]) for i, x in enumerate([-290, 290])],
    ]),
    A(RIDES, "rope-net-tunnel", "Rope net tunnel", "Short crawl-through play tunnel with six arch frames, cross braces, and a low net-grid silhouette.", "#a07a60", [
        *[B(f"arch-foot-{i}", [180, 180, 90], [x, y, 45]) for i, (x, y) in enumerate([(-1100, -600), (1100, -600), (-1100, 600), (1100, 600)])],
        *[B(f"arch-rib-{i}", [80, 95, 1500], [x, y, 760], [angle, 0, 0]) for i, (x, y, angle) in enumerate([(-1050, -590, -24), (-1050, 590, 24), (0, -590, -24), (0, 590, 24), (1050, -590, -24), (1050, 590, 24)])],
        *[B(f"net-strand-{i}", [70, 1200, 70], [x, 0, z]) for i, (x, z) in enumerate([(-900, 900), (-600, 1220), (-300, 1400), (0, 1480), (300, 1400), (600, 1220), (900, 900)])],
        *[B(f"cross-brace-{i}", [2150, 70, 70], [0, y, 760]) for i, y in enumerate([-480, 0, 480])],
    ]),
    A(RIDES, "ride-load-platform", "Ride load platform", "Queue-side loading deck with three boarding bays, stairs, handrails, and a hinged-looking access gate.", "#78817c", [
        B("deck", [2800, 1450, 200], [0, 0, 760]), B("stair-base", [1050, 780, 120], [0, -1180, 60]),
        *[B(f"stair-step-{i}", [1050, 230, 90], [0, -1050 + i * 230, 120 + i * 110]) for i in range(6)],
        *[B(f"rail-post-{i}", [75, 75, 820], [x, y, 1170]) for i, (x, y) in enumerate([(-1300, 510), (-450, 510), (450, 510), (1300, 510), (-1300, -430), (1300, -430)])],
        B("rear-handrail", [2700, 75, 85], [0, 510, 1540]), B("side-handrail-left", [75, 940, 85], [-1300, 40, 1540]),
        B("side-handrail-right", [75, 940, 85], [1300, 40, 1540]), B("boarding-gate", [600, 60, 700], [0, -380, 1210]),
    ]),
    A(RIDES, "ride-operator-console", "Ride operator console", "Freestanding dispatch console with a slanted control face, stop button, status lamps, and weather hood.", "#778983", [
        B("pedestal", [520, 480, 840], [0, 0, 420]), B("control-face", [830, 200, 500], [0, -90, 1030], [-12, 0, 0]),
        B("hood", [980, 580, 100], [0, 0, 1390]),
        *[C(f"status-lamp-{i}", 85, 62, [x, -220, 1260], segments=8) for i, x in enumerate([-260, -90, 90, 260])],
        B("stop-button-guard", [200, 170, 60], [0, -215, 1150]), B("side-grab-left", [80, 520, 80], [-500, 0, 860]),
        B("side-grab-right", [80, 520, 80], [500, 0, 860]),
    ]),
    A(RIDES, "ride-photo-camera", "Ride photo camera", "Elevated attraction camera on a three-leg stand with a sun hood and a large front lens barrel.", "#606f73", [
        B("camera-body", [650, 470, 440], [0, 0, 1960]), B("lens-barrel", [180, 260, 180], [0, -355, 1950], [90, 0, 0]),
        B("sun-hood", [430, 470, 80], [0, -40, 2210]), C("lens", 65, 135, [0, -500, 1950], [90, 0, 0], 10),
        C("mast", 1140, 58, [0, 0, 1090], segments=8),
        *[B(f"tripod-leg-{i}", [55, 60, 1100], [x, y, 530], [angle, 0, 0]) for i, (x, y, angle) in enumerate([(-420, 0, 20), (210, -365, -12), (210, 365, -12)])],
        B("tripod-foot-0", [420, 160, 55], [-420, 0, 30]), B("tripod-foot-1", [420, 160, 55], [210, -365, 30]), B("tripod-foot-2", [420, 160, 55], [210, 365, 30]),
    ]),
    A(RIDES, "ride-photo-preview-kiosk", "Ride photo preview kiosk", "Guest-facing image preview station with a large display, purchase ledge, and a tilted sun shield.", "#6d8380", [
        B("base", [650, 580, 160], [0, 0, 80]), B("pedestal", [440, 400, 970], [0, 0, 645]),
        B("display-frame", [1080, 170, 900], [0, -110, 1550]), B("display-face", [850, 32, 660], [0, -211, 1550]),
        B("purchase-ledge", [1060, 380, 110], [0, -170, 1080]), B("sun-shield", [1250, 520, 100], [0, -20, 2070], [-8, 0, 0]),
        B("receipt-slot", [210, 30, 70], [0, -218, 1120]),
    ]),
    A(RIDES, "height-check-marker", "Rider height check marker", "Queue entry height guide with two graduated side posts, an overhead bar, and a free-standing base.", "#d0a44f", [
        B("left-foot", [350, 460, 100], [-450, 0, 50]), B("right-foot", [350, 460, 100], [450, 0, 50]),
        B("left-post", [100, 110, 2050], [-450, 0, 1125]), B("right-post", [100, 110, 2050], [450, 0, 1125]),
        B("top-bar", [1000, 150, 130], [0, 0, 2170]),
        *[B(f"graduation-{i}", [230, 40, 38], [-315, -64, 450 + i * 140]) for i in range(10)],
        B("marker-cap", [420, 60, 175], [-450, -80, 2210]),
    ]),
    A(RIDES, "queue-switchback-rail", "Queue switchback rail", "Modular two-lane queue divider with paired rails, seven posts, and a rounded turning end.", "#7c817a", [
        *[C(f"post-{i}", 980, 54, [x, y, 0], segments=8) for i, (x, y) in enumerate([(-1500, -420), (-1000, -420), (-500, -420), (0, -420), (500, -420), (1000, -420), (1500, -420), (-1500, 420), (-1000, 420), (-500, 420), (0, 420), (500, 420), (1000, 420), (1500, 420)])],
        *[B(f"upper-rail-{i}", [470, 65, 65], [x, y, 840]) for i, (x, y) in enumerate([(-1250, -420), (-750, -420), (-250, -420), (250, -420), (750, -420), (1250, -420), (-1250, 420), (-750, 420), (-250, 420), (250, 420), (750, 420), (1250, 420)])],
        *[B(f"lower-rail-{i}", [470, 55, 55], [x, y, 430]) for i, (x, y) in enumerate([(-1250, -420), (-750, -420), (-250, -420), (250, -420), (750, -420), (1250, -420), (-1250, 420), (-750, 420), (-250, 420), (250, 420), (750, 420), (1250, 420)])],
    ]),
    A(RIDES, "queue-shade-canopy", "Queue shade canopy", "Open-sided queue shelter with four posts, a peaked roof silhouette, and hanging wayfinding tabs.", "#a4775d", [
        *[B(f"post-{i}", [95, 95, 2700], [x, y, 1350]) for i, (x, y) in enumerate([(-1600, -540), (1600, -540), (-1600, 540), (1600, 540)])],
        B("left-roof-slope", [1920, 1250, 130], [-800, 0, 2750], [0, 0, -8]),
        B("right-roof-slope", [1920, 1250, 130], [800, 0, 2750], [0, 0, 8]),
        B("ridge-beam", [3600, 120, 130], [0, 0, 2980]),
        *[B(f"queue-tab-{i}", [220, 90, 290], [-1100 + i * 730, -610, 2440]) for i in range(4)],
    ]),
    A(RIDES, "accessible-ride-transfer-bench", "Accessible ride transfer bench", "Transfer area bench with clear side approach, back rail, and adjacent bag shelf.", "#7a8e84", [
        B("seat", [1450, 520, 95], [0, 0, 610]), B("back", [1450, 75, 740], [0, 220, 1000]),
        *[B(f"leg-{i}", [95, 95, 570], [x, y, 285]) for i, (x, y) in enumerate([(-600, -180), (600, -180), (-600, 180), (600, 180)])],
        B("bag-shelf", [1120, 440, 70], [0, 0, 140]), B("side-grab-rail", [80, 75, 800], [760, 0, 800]),
        B("front-grab-rail", [600, 75, 80], [550, -270, 680]),
    ]),

    A(GAMES, "ring-toss-game-counter", "Ring toss game counter", "Midway toss booth with a raised bottle rack, counter ledge, and a high striped canopy frame.", "#d28650", [
        B("counter", [1900, 660, 880], [0, 0, 440]), B("front-ledge", [2020, 140, 130], [0, -385, 920]),
        *[C(f"target-bottle-{i}", 370, 75, [x, 70, 1080], segments=8) for i, x in enumerate([-650, -325, 0, 325, 650])],
        *[B(f"canopy-post-{i}", [70, 70, 1120], [x, y, 1480]) for i, (x, y) in enumerate([(-920, 250), (920, 250), (-920, -250), (920, -250)])],
        B("canopy", [2200, 820, 100], [0, 0, 2070]),
    ]),
    A(GAMES, "water-race-game-lane", "Water race game lane", "Two-player midway race fixture with parallel troughs, pump handles, and a raised finish marker.", "#6c9ba0", [
        B("base", [2360, 940, 140], [0, 0, 70]),
        *[B(f"race-trough-{i}", [1900, 320, 270], [0, y, 270]) for i, y in enumerate([-245, 245])],
        *[C(f"pump-handle-{i}", 450, 36, [x, y, 410], [0, 0, 0], 8) for i, (x, y) in enumerate([(-650, -245), (-650, 245)])],
        *[S(f"race-ball-{i}", 75, [x, y, 450]) for i, (x, y) in enumerate([(600, -245), (600, 245)])],
        B("finish-post-left", [90, 90, 790], [980, -430, 395]), B("finish-post-right", [90, 90, 790], [980, 430, 395]),
        B("finish-bar", [160, 940, 100], [980, 0, 790]),
    ]),
    A(GAMES, "duck-pond-game-trough", "Duck pond game trough", "Shallow midway fishing-game basin with a raised rim, four duck targets, and a prize-catch lip.", "#7b9ca0", [
        B("basin", [1880, 1460, 250], [0, 0, 125]), B("rim-front", [2010, 100, 140], [0, -730, 320]),
        B("rim-back", [2010, 100, 140], [0, 730, 320]), B("rim-left", [100, 1360, 140], [-960, 0, 320]),
        B("rim-right", [100, 1360, 140], [960, 0, 320]),
        *[S(f"duck-target-{i}", 125, [x, y, 430]) for i, (x, y) in enumerate([(-520, -350), (-170, 260), (210, -160), (540, 330)])],
        B("prize-lip", [600, 150, 300], [0, -805, 210]),
    ]),
    A(GAMES, "balloon-dart-gallery", "Balloon dart gallery", "Counter-height dart game with a pegged balloon wall, side dividers, and an overhead net frame.", "#aa7d69", [
        B("backboard", [1950, 120, 1380], [0, 450, 1090]), B("counter", [2100, 780, 170], [0, 0, 820]),
        *[S(f"balloon-{i}", 115, [x, 360, z]) for i, (x, z) in enumerate([(-700, 700), (-350, 920), (0, 690), (350, 930), (700, 710), (-525, 1190), (175, 1180), (560, 1120)])],
        *[B(f"side-divider-{i}", [100, 1120, 1500], [x, 370, 750]) for i, x in enumerate([-1070, 1070])],
        *[B(f"net-post-{i}", [70, 70, 2200], [x, y, 1100]) for i, (x, y) in enumerate([(-1050, 430), (1050, 430), (-1050, -500), (1050, -500)])],
        B("net-header", [2200, 1050, 80], [0, 0, 2220]),
    ]),
    A(GAMES, "skee-ball-lane", "Skee-ball lane", "Single midway rolling lane with a sloped launch bed, side gutters, target arch, and scoring pockets.", "#957657", [
        B("lane-base", [3250, 850, 170], [0, 0, 85]), B("ramp-bed", [2130, 730, 140], [-400, 0, 400], [0, 12, 0]),
        B("left-gutter", [2300, 90, 250], [-360, -390, 410]), B("right-gutter", [2300, 90, 250], [-360, 390, 410]),
        B("target-backboard", [300, 900, 1230], [1300, 0, 1030]),
        *[C(f"score-ring-{i}", 65, r, [1260, y, z], [0, 90, 0], 10) for i, (r, y, z) in enumerate([(240, -260, 1190), (180, 0, 1360), (240, 260, 1190)])],
        *[B(f"score-pocket-{i}", [180, 230, 210], [1190, y, 700]) for i, y in enumerate([-270, 0, 270])],
    ]),
    A(GAMES, "ball-toss-target-wall", "Ball toss target wall", "Three-bay beanbag toss stand with stepped target openings, side braces, and a front counter shelf.", "#d19750", [
        B("backboard", [1880, 160, 1450], [0, 450, 900]), B("side-left", [170, 1000, 1330], [-950, 0, 800], [0, 0, 3]),
        B("side-right", [170, 1000, 1330], [950, 0, 800], [0, 0, -3]), B("counter-shelf", [2050, 500, 130], [0, -250, 620]),
        *[C(f"target-ring-{i}", 75, 175, [x, 330, z], [90, 0, 0], 10) for i, (x, z) in enumerate([(-550, 780), (0, 1160), (550, 780)])],
        B("base-foot", [2150, 940, 130], [0, 0, 65]),
    ]),
    A(GAMES, "prize-wall-display", "Midway prize wall", "Prize counter backdrop with three open display shelves, hanging plush silhouettes, and a lower redemption ledge.", "#9a7960", [
        B("back-panel", [2200, 120, 1850], [0, 430, 925]),
        *[B(f"display-shelf-{i}", [2100, 550, 80], [0, 180, 540 + i * 480]) for i in range(3)],
        *[S(f"prize-plush-{i}", 150, [x, 0, z]) for i, (x, z) in enumerate([(-700, 710), (0, 710), (700, 710), (-700, 1190), (0, 1190), (700, 1190), (-700, 1670), (0, 1670), (700, 1670)])],
        B("redemption-counter", [2300, 700, 850], [0, -80, 425]), B("counter-lip", [2400, 160, 120], [0, -430, 870]),
    ]),
    A(GAMES, "game-token-counter", "Game token counter", "Midway exchange counter with a token hopper, change tray, service window, and queue-side awning.", "#8a765e", [
        B("counter-body", [1580, 680, 850], [0, 0, 425]), B("service-window", [1000, 70, 500], [0, -355, 1170]),
        B("counter-ledge", [1800, 360, 110], [0, -320, 900]), C("token-hopper", 380, 190, [-490, 30, 900], segments=12),
        B("change-tray", [420, 300, 80], [490, -250, 980]), B("awning", [1950, 760, 100], [0, 10, 1710]),
        *[B(f"awning-post-{i}", [70, 70, 840], [x, 300, 1290]) for i, x in enumerate([-820, 820])],
    ]),
    A(GAMES, "midway-scoreboard", "Midway scoreboard", "Freestanding race scoreboard with two lane panels, a roof cap, and a weighted ground frame.", "#737f83", [
        B("base", [1420, 640, 100], [0, 0, 50]), B("left-panel", [620, 150, 920], [-340, 0, 970]),
        B("right-panel", [620, 150, 920], [340, 0, 970]), B("center-divider", [80, 160, 940], [0, 0, 970]),
        B("header", [1500, 240, 210], [0, 0, 1540]), B("roof", [1680, 850, 110], [0, 0, 1710]),
        *[C(f"score-lamp-{i}", 80, 48, [x, -110, 1560], segments=8) for i, x in enumerate([-490, -165, 165, 490])],
    ]),
    A(GAMES, "midway-barker-microphone-stand", "Midway game microphone stand", "Portable host microphone podium with an angled script shelf, hand mic, and folded-stand feet.", "#927a5f", [
        B("podium-base", [620, 500, 110], [0, 0, 55]), B("stem", [150, 160, 990], [0, 0, 600]),
        B("script-shelf", [780, 500, 100], [0, -40, 1170], [-12, 0, 0]), B("front-panel", [580, 90, 620], [0, -245, 620]),
        C("microphone", 350, 44, [280, -20, 1500], [0, 0, -30], 8),
        *[B(f"foot-{i}", [520, 80, 70], [x, y, 35], [0, 0, angle]) for i, (x, y, angle) in enumerate([(-200, 0, 25), (200, 0, -25), (0, 200, 90)])],
    ]),

    A(FOOD, "popcorn-warmer-kiosk", "Popcorn warmer kiosk", "Countertop popcorn service kiosk with a tall warming case, serving shelf, and striped rain canopy.", "#d29a52", [
        B("counter", [1550, 1050, 840], [0, 0, 420]), B("warmer-base", [920, 740, 240], [0, -80, 960]),
        B("warming-case", [920, 740, 900], [0, -80, 1530]), B("case-roof", [1050, 850, 90], [0, -80, 2010]),
        B("serving-shelf", [1820, 480, 120], [0, -420, 900]), B("awning", [1950, 1300, 100], [0, 0, 2370]),
        *[B(f"awning-post-{i}", [70, 70, 1250], [x, y, 1750]) for i, (x, y) in enumerate([(-870, 500), (870, 500), (-870, -500), (870, -500)])],
    ]),
    A(FOOD, "cotton-candy-cart", "Cotton candy cart", "Push cart with a round candy bowl, umbrella mast, flavor tubs, push handle, and paired wheels.", "#c77f93", [
        B("cart-bed", [1220, 740, 170], [0, 0, 560]), B("cart-cabinet", [960, 650, 580], [0, 0, 920]),
        C("candy-bowl", 480, 390, [0, -20, 1460], segments=14), C("spinner-hub", 260, 85, [0, -20, 1460], segments=10),
        C("umbrella-pole", 1220, 40, [510, 240, 840], segments=8),
        B("umbrella-canopy", [1420, 1380, 100], [510, 240, 1500]),
        *[B(f"flavor-tub-{i}", [240, 240, 220], [x, -300, 1320]) for i, x in enumerate([-340, 0, 340])],
        C("wheel-axle", 880, 62, [0, 440, 260], [90, 0, 0], 10),
        *[B(f"axle-bracket-{i}", [90, 120, 250], [x, 0, 390]) for i, x in enumerate([-430, 430])],
        *[C(f"wheel-{i}", 90, 260, [x, y, 260], [90, 0, 0], 10) for i, (x, y) in enumerate([(-430, -390), (430, -390)])],
        B("push-handle", [720, 70, 70], [0, 390, 930]),
    ]),
    A(FOOD, "pretzel-warmer-counter", "Pretzel warmer counter", "Warm pretzel display with two-tier glass case, condiment niche, service shelf, and cash drawer.", "#a87c55", [
        B("counter-body", [1640, 820, 790], [0, 0, 395]), B("display-base", [1380, 620, 150], [0, -40, 870]),
        B("glass-case-back", [1300, 70, 700], [0, 220, 1280]), B("glass-case-top", [1380, 640, 75], [0, 0, 1640]),
        B("glass-case-front", [1300, 70, 700], [0, -285, 1280]), B("display-shelf", [1260, 520, 65], [0, 0, 1230]),
        B("condiment-cubby", [420, 390, 360], [500, -410, 1040]), B("cash-drawer", [520, 430, 100], [-460, -200, 850]),
    ]),
    A(FOOD, "ice-cream-cart", "Ice cream cart", "Mobile frozen-treat cart with insulated chest, hinged lid, flavor-board canopy, and four wheels.", "#7d9aa1", [
        B("cart-body", [1300, 850, 680], [0, 0, 420]), B("insulated-chest", [1160, 720, 420], [0, 0, 970]),
        B("hinged-lid", [1240, 800, 95], [0, 0, 1230]), B("handle", [860, 80, 75], [0, 500, 790]),
        B("menu-board", [1100, 70, 520], [0, 240, 1620]), B("awning", [1650, 900, 90], [0, 0, 1940]),
        *[C(f"wheel-{i}", 85, 190, [x, y, 190], [90, 0, 0], 10) for i, (x, y) in enumerate([(-470, -430), (470, -430), (-470, 430), (470, 430)])],
    ]),
    A(FOOD, "lemonade-dispenser-cart", "Lemonade dispenser cart", "Beverage cart with paired transparent-tank silhouettes, tap handles, ice bin, and a push bar.", "#b89a50", [
        B("cart-frame", [1520, 820, 160], [0, 0, 80]), B("front-counter", [1530, 850, 720], [0, 0, 520]),
        *[C(f"drink-tank-{i}", 670, 250, [x, 0, 1040], segments=12) for i, x in enumerate([-390, 390])],
        *[C(f"tap-{i}", 150, 46, [x, -290, 720], [90, 0, 0], 8) for i, x in enumerate([-390, 390])],
        B("ice-bin", [400, 500, 300], [0, 180, 1000]), B("push-bar", [850, 85, 85], [0, 500, 740]),
        *[C(f"wheel-{i}", 80, 180, [x, y, 180], [90, 0, 0], 10) for i, (x, y) in enumerate([(-550, -350), (550, -350), (-550, 350), (550, 350)])],
    ]),
    A(FOOD, "churro-warmer-cart", "Churro warmer cart", "Narrow snack cart with a heated tray, draining rack, flour-dusting station, and bicycle-style wheels.", "#bc8051", [
        B("cart-cabinet", [1460, 650, 760], [0, 0, 420]), B("hot-tray", [1360, 520, 130], [0, -25, 850]),
        *[C(f"churro-roller-{i}", 1100, 34, [-500 + i * 200, -25, 960], [0, 90, 0], 8) for i in range(6)],
        B("dusting-shelf", [600, 330, 80], [450, -390, 930]), C("umbrella-pole", 1300, 42, [-500, 180, 800], segments=8),
        B("umbrella", [1180, 1100, 80], [-500, 180, 1470]),
        *[C(f"wheel-{i}", 85, 210, [x, y, 210], [90, 0, 0], 10) for i, (x, y) in enumerate([(-520, -350), (520, -350)])],
    ]),
    A(FOOD, "funnel-cake-kiosk", "Funnel cake kiosk", "Fair-food fry stand with a vent hood, serving pass, fryer tub silhouette, and side-order shelf.", "#a27b57", [
        B("kiosk-base", [1750, 1250, 920], [0, 0, 460]), B("service-pass", [1360, 160, 560], [0, -650, 1080]),
        B("fryer-casing", [620, 620, 530], [-430, 0, 1200]), C("fryer-vat", 190, 250, [-430, 0, 1480], segments=12),
        B("vent-riser", [620, 510, 620], [430, 300, 1540]), B("hood", [1060, 960, 150], [430, 250, 1900]),
        B("side-shelf", [520, 750, 120], [1080, 100, 1020]), B("queue-counter", [1880, 350, 140], [0, -680, 700]),
    ]),
    A(FOOD, "soft-drink-fountain", "Soft drink fountain", "Self-service beverage dispenser with cup ledge, four nozzle stations, drip tray, and splashback.", "#718d91", [
        B("cabinet", [1150, 680, 1160], [0, 0, 580]), B("splashback", [1180, 100, 620], [0, 340, 1470]),
        B("cup-ledge", [1340, 540, 110], [0, -80, 1190]), B("drip-tray", [1320, 410, 65], [0, -80, 1020]),
        *[B(f"nozzle-station-{i}", [230, 190, 370], [-390 + i * 260, -250, 1410]) for i in range(4)],
        *[C(f"nozzle-{i}", 105, 36, [-390 + i * 260, -350, 1190], segments=8) for i in range(4)],
    ]),
    A(FOOD, "refillable-cup-rack", "Refillable cup rack", "Countertop carousel for reusable park cups with a rotating-style central mast and four storage shelves.", "#7d9188", [
        C("base", 95, 540, [0, 0, 48], segments=12), C("mast", 1150, 65, [0, 0, 95], segments=10),
        *[B(f"cup-shelf-{i}", [1100, 800, 80], [0, 0, 280 + i * 240]) for i in range(4)],
        *[C(f"cup-holder-{i}", 170, 140, [x, y, 420 + (i % 4) * 240], segments=8)
          for i, (x, y) in enumerate([(320, 210), (-320, 210), (320, -210), (-320, -210)])],
        B("top-cap", [460, 460, 90], [0, 0, 1270]),
    ]),
    A(FOOD, "condiment-counter", "Condiment counter", "Park dining condiment station with four bottle wells, napkin cubbies, tray return, and a wipe-clean top.", "#927b61", [
        B("cabinet", [1850, 720, 900], [0, 0, 450]), B("top", [1980, 820, 100], [0, 0, 950]),
        B("napkin-holder-left", [430, 340, 310], [-590, -70, 1160]), B("napkin-holder-right", [430, 340, 310], [590, -70, 1160]),
        *[C(f"sauce-bottle-{i}", 330, 82, [x, -190, 1170], segments=8) for i, x in enumerate([-350, -120, 120, 350])],
        B("tray-return", [700, 580, 110], [0, 650, 100]), B("splash-guard", [1710, 55, 260], [0, 355, 1120]),
    ]),
    A(FOOD, "picnic-table-with-umbrella", "Picnic table with umbrella", "Family dining table with two bench seats, umbrella mast, and a broad shade canopy.", "#9d7b58", [
        B("tabletop", [1800, 940, 100], [0, 0, 890]), B("table-pedestal", [220, 220, 800], [0, 0, 440]),
        B("bench-front", [1760, 310, 95], [0, -850, 470]), B("bench-back", [1760, 310, 95], [0, 850, 470]),
        *[B(f"bench-leg-{i}", [90, 90, 430], [x, y, 215]) for i, (x, y) in enumerate([(-650, -850), (650, -850), (-650, 850), (650, 850)])],
        C("umbrella-mast", 1870, 48, [0, 0, 970], segments=8), B("umbrella-canopy", [2350, 2200, 120], [0, 0, 1940]),
    ]),
    A(FOOD, "park-water-fountain", "Park drinking fountain", "Freestanding guest fountain with a raised bowl, two push-button stations, and a bottle-fill spout.", "#718b88", [
        B("pedestal", [480, 500, 810], [0, 0, 405]), C("bowl", 110, 410, [0, 0, 850], segments=12),
        B("backsplash", [800, 100, 740], [0, 240, 1030]),
        *[C(f"bubbler-post-{i}", 160, 30, [x, -140, 1000], segments=8) for i, x in enumerate([-200, 200])],
        *[B(f"push-button-{i}", [100, 50, 75], [x, -210, 950]) for i, x in enumerate([-240, 240])],
        C("bottle-fill-spout", 230, 32, [0, 220, 1380], [90, 0, 0], 8),
    ]),

    A(OPS, "family-plaza-shade-pavilion", "Family plaza shade pavilion", "Four-post plaza shelter with two gently pitched canopy panels and a raised ridge mast.", "#7d8d84", [
        *[B(f"corner-post-{i}", [105, 105, 2650], [x, y, 1325]) for i, (x, y) in enumerate([(-1450, -1050), (1450, -1050), (-1450, 1050), (1450, 1050)])],
        B("center-mast", [140, 140, 3100], [0, 0, 1550]),
        B("canopy-panel-left", [1830, 2440, 105], [-720, 0, 2830], [0, -8, 0]),
        B("canopy-panel-right", [1830, 2440, 105], [720, 0, 2830], [0, 8, 0]),
        *[C(f"anchor-foot-{i}", 80, 220, [x, y, 40], segments=10) for i, (x, y) in enumerate([(-1450, -1050), (1450, -1050), (-1450, 1050), (1450, 1050)])],
    ]),
    A(OPS, "family-rest-bench", "Family rest bench", "Wide plaza bench with back slats, arm dividers, and a shaded stroller-clear zone underneath.", "#8c785f", [
        B("seat", [2200, 500, 100], [0, 0, 570]), *[B(f"seat-slat-{i}", [2100, 75, 65], [0, -180 + i * 120, 610]) for i in range(4)],
        *[B(f"back-slat-{i}", [2200, 70, 105], [0, 220, 790 + i * 160]) for i in range(4)],
        *[B(f"leg-{i}", [100, 560, 700], [x, 0, 350]) for i, x in enumerate([-850, 850])],
        *[B(f"arm-rest-{i}", [90, 540, 90], [x, 0, 940]) for i, x in enumerate([-400, 400])],
    ]),
    A(OPS, "stroller-service-station", "Stroller service station", "Guest support stand with parking rail, compact air pump, repair shelf, and a wheel service cradle.", "#738b81", [
        B("backboard", [1420, 100, 1760], [0, 420, 880]), B("service-shelf", [1540, 680, 110], [0, 0, 510]),
        C("pump-cylinder", 780, 105, [-470, 150, 620], segments=10), C("pump-handle", 250, 32, [-470, 150, 1420], [90, 0, 0], 8),
        B("wheel-cradle-left", [150, 700, 350], [320, -150, 250]), B("wheel-cradle-right", [150, 700, 350], [700, -150, 250]),
        *[C(f"parking-rail-{i}", 980, 30, [x, 180, 0], [0, 90, 0], 8) for i, x in enumerate([-800, 0, 800])],
        B("repair-tray", [680, 430, 80], [550, -90, 670]),
    ]),
    A(OPS, "parade-rope-stanchion", "Parade rope stanchion pair", "Portable crowd-control rope set with two weighted posts, a cross-span rail, and a central clip.", "#b5955f", [
        *[C(f"weighted-base-{i}", 100, 210, [x, 0, 50], segments=12) for i, x in enumerate([-1150, 1150])],
        *[C(f"post-{i}", 1020, 48, [x, 0, 610], segments=8) for i, x in enumerate([-1150, 1150])],
        B("rope-span", [2300, 90, 90], [0, 0, 1050]), C("center-clip", 120, 75, [0, 0, 1050], segments=8),
        *[B(f"base-inset-{i}", [250, 250, 60], [x, 0, 130]) for i, x in enumerate([-1150, 1150])],
    ]),
    A(OPS, "park-waste-sorting-station", "Park waste sorting station", "Three-stream visitor waste point with distinct lid openings, a shared roof, and a trolley-clear front.", "#71877e", [
        *[B(f"bin-{i}", [620, 620, 920], [x, 0, 460]) for i, x in enumerate([-700, 0, 700])],
        *[B(f"lid-{i}", [650, 650, 95], [x, 0, 970]) for i, x in enumerate([-700, 0, 700])],
        *[C(f"opening-rim-{i}", 45, 150, [x, -10, 1030], segments=10) for i, x in enumerate([-700, 0, 700])],
        B("shared-canopy", [2250, 850, 100], [0, 0, 1620]),
        *[B(f"support-{i}", [75, 75, 580], [x, 330, 1320]) for i, x in enumerate([-1050, 1050])],
    ]),
    A(OPS, "park-pathway-bollard-light", "Park pathway bollard light", "Low path marker with a broad anchor foot, fluted post, and a down-shielded cap.", "#d2a254", [
        C("anchor-foot", 90, 220, [0, 0, 45], segments=12), C("bollard-post", 740, 105, [0, 0, 90], segments=10),
        C("light-cap", 150, 150, [0, 0, 780], segments=10), B("glare-shield", [330, 330, 70], [0, 0, 860]),
        *[B(f"vertical-flute-{i}", [28, 28, 480], [x, y, 400]) for i, (x, y) in enumerate([(-60, -60), (60, -60), (-60, 60), (60, 60)])],
    ]),
    A(OPS, "character-meet-backdrop", "Character meet-and-greet backdrop", "Photo-op backdrop with a decorative portal, shallow stage, curtain wings, and two waiting marks.", "#a47783", [
        B("stage", [2400, 1200, 180], [0, 0, 90]), B("backdrop", [2050, 130, 1770], [0, 480, 1065]),
        B("portal-left", [220, 170, 1660], [-650, 360, 1010]), B("portal-right", [220, 170, 1660], [650, 360, 1010]),
        B("portal-top", [1510, 170, 230], [0, 360, 1900]),
        *[B(f"curtain-wing-{i}", [260, 160, 1580], [x, 300, 890], [0, 0, angle]) for i, (x, angle) in enumerate([(-1060, -7), (1060, 7)])],
        *[C(f"waiting-mark-{i}", 35, 240, [x, -650, 18], segments=10) for i, x in enumerate([-620, 620])],
    ]),
    A(OPS, "character-meet-photo-easel", "Character meet photo easel", "Portable guest photo display with a tripod back, framed sample print, and a low caption shelf.", "#987d65", [
        B("display-frame", [1120, 150, 1460], [0, 0, 1330]), B("sample-panel", [900, 55, 1160], [0, -100, 1330]),
        B("caption-shelf", [1360, 450, 90], [0, -120, 490]),
        *[B(f"easel-leg-{i}", [80, 90, 1520], [x, y, 760], [angle, 0, 0]) for i, (x, y, angle) in enumerate([(-500, 0, -10), (500, 0, -10), (0, 430, 12)])],
        *[B(f"frame-corner-{i}", [150, 130, 150], [x, -95, z]) for i, (x, z) in enumerate([(-490, 740), (490, 740), (-490, 1920), (490, 1920)])],
    ]),
    A(OPS, "park-maintenance-golf-cart", "Park maintenance cart", "Compact utility cart with open operator cab, short cargo bed, front bumper, and four treaded wheels.", "#7e8a62", [
        B("chassis", [1950, 1030, 190], [0, 0, 330]), B("cargo-bed", [860, 960, 490], [-500, 0, 680]),
        B("hood", [770, 860, 440], [620, 0, 620]), B("operator-floor", [510, 880, 125], [240, 0, 500]),
        B("front-screen", [80, 900, 650], [580, 0, 930], [0, -8, 0]), B("roof", [1350, 1160, 110], [130, 0, 1450]),
        *[B(f"cab-post-{i}", [75, 75, 860], [x, y, 1030]) for i, (x, y) in enumerate([(-380, -390), (-380, 390), (600, -390), (600, 390)])],
        *[C(f"wheel-{i}", 125, 285, [x, y, 285], [90, 0, 0], 10) for i, (x, y) in enumerate([(-630, -560), (630, -560), (-630, 560), (630, 560)])],
        B("front-bumper", [240, 1120, 160], [1100, 0, 230]),
    ]),
    A(OPS, "ride-maintenance-tool-cart", "Ride maintenance tool cart", "Workshop cart with locking drawers, a parts tray, side handle, and four casters for attraction back-of-house scenes.", "#78877f", [
        B("cabinet", [1150, 720, 960], [0, 0, 560]), B("top-tray", [1280, 850, 140], [0, 0, 1110]),
        *[B(f"drawer-{i}", [1040, 45, 145], [0, -370, 300 + i * 205]) for i in range(4)],
        B("side-handle", [80, 600, 80], [615, 0, 1030]), B("parts-bin", [550, 470, 200], [-250, 80, 1270]),
        *[C(f"caster-{i}", 55, 82, [x, y, 80], segments=8) for i, (x, y) in enumerate([(-410, -270), (410, -270), (-410, 270), (410, 270)])],
    ]),
    A(OPS, "park-operations-radio-rack", "Park operations radio rack", "Back-of-house charging stand with six radio cradles, overhead status strip, and cable-routing shelf.", "#6f8581", [
        B("backplate", [1520, 130, 1800], [0, 350, 900]), B("base", [1660, 660, 160], [0, 0, 80]),
        *[B(f"charging-cradle-{i}", [180, 210, 460], [-600 + i * 240, 200, 630]) for i in range(6)],
        B("status-strip", [1450, 170, 180], [0, 200, 1500]), B("cable-shelf", [1420, 500, 95], [0, 0, 260]),
        *[C(f"status-indicator-{i}", 55, 42, [-570 + i * 228, 100, 1600], segments=8) for i in range(6)],
    ]),
]

ORIGIN_OFFSETS_MM = {
    "character-meet-photo-easel": -3.732,
    "drop-tower-seat-ring": -250,
    "first-aid-response-cart": -85,
    "junior-coaster-track-section": 10,
    "junior-coaster-train-car": -15,
    "log-flume-boat": -95,
    "parade-rope-stanchion": -50,
    "park-observation-wheel": 1.096,
    "park-pathway-bollard-light": -45,
    "pirate-ship-ride-car": -120,
    "refillable-cup-rack": -48,
    "ride-maintenance-tool-cart": -80,
    "ride-photo-camera": 14.219,
    "splash-pad-jet-column": -45,
    "stroller-service-station": 30,
    "tea-cup-spinner-car": -55,
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
    description = item["description"] + " Editable overall scale and asset color."
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
    return f'''// Original amusement-park scene asset. Millimetres, Z up, base origin.
meta({{
  name: {fmt(item["id"])},
  license: "CC0-1.0",
  title: {fmt(item["title"])},
  description: {fmt(description)},
  tags: ["amusement park", "theme park", "guest experience", "low poly", "CC0", {fmt(item["group"].lower())}],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
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
        "title": "Amusement park",
        "description": "Guest precinct and ride-scene props for park entry, family attractions, midway games, concessions, rest areas, and operations.",
    }, indent=2) + "\n", encoding="utf-8")
    grouped = defaultdict(list)
    for item in ASSETS:
        grouped[item["group"]].append(item)
    lines = [
        "# Amusement park kit", "",
        "Seventy original low-poly props for an amusement-park guest precinct and its supporting operations. Sources use millimetres and Z up. Each asset exposes overall scale and asset color, uses one material, and declares a 1,800-triangle ceiling. All geometry is dedicated to the public domain under CC0 1.0.", "",
    ]
    for group, items in grouped.items():
        lines.extend([f"## {group}", "", ", ".join(f"`{item['id']}`" for item in items) + ".", ""])
    lines.extend([
        "## Preview and verification", "",
        "The [amusement-park wave bundle](../../../artifacts/catalog-demos/amusement-park-wave-20261103/README.md) contains the reproducible source generator, catalog audit, rendered previews, parameter check, and inspected MP4 walkthrough.", "",
        "These are generic visualization props. They do not specify ride structure, restraints, barriers, controls, accessibility compliance, food equipment ratings, or operating procedures. Catalog validation does not establish attraction safety, code compliance, or operational acceptance.", "",
    ])
    (KIT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {len(ASSETS)} assets to {KIT}")


if __name__ == "__main__":
    main()
