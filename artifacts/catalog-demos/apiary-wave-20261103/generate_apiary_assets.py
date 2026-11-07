#!/usr/bin/env python3
"""Generate original, low-poly apiary scene props for the kernelCAD catalog."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT_ID = "apiary"
KIT = ROOT / "catalog" / "kits" / KIT_ID
KIT.mkdir(parents=True, exist_ok=True)


def B(name, x, y, z, w, d, h):
    return ("box", name, x, y, z, w, d, h)


def C(name, x, y, z, h, r, sides=8):
    return ("cylinder", name, x, y, z, h, r, sides)


ASSETS = [
    ("langstroth-hive", "Langstroth hive", "Stacked hive body, honey super, cover, entrance and raised stand.", "#b89358", [B("stand-left", -250, 0, 0, 55, 520, 120), B("stand-right", 250, 0, 0, 55, 520, 120), B("bottom-board", 0, 0, 120, 620, 520, 60), B("brood-box", 0, 0, 180, 600, 500, 430), B("honey-super", 0, 0, 610, 590, 490, 280), B("telescoping-cover", 0, 0, 890, 660, 560, 70), B("entrance-strip", 0, -255, 150, 440, 35, 55)]),
    ("top-bar-hive", "Top-bar hive", "Long low hive body with parallel top bars, end supports and a removable roof.", "#9a7949", [B("leg-left", -360, 0, 0, 55, 70, 440), B("leg-right", 360, 0, 0, 55, 70, 440), B("body", 0, 0, 440, 1050, 440, 300), B("landing", 0, -250, 420, 1120, 90, 45), *[B(f"top-bar-{i}", -420 + i * 70, 0, 740, 45, 455, 35) for i in range(13)], B("roof", 0, 0, 790, 1140, 520, 70)]),
    ("nuc-hive-box", "Nucleus hive box", "Compact nucleus colony box with lid, handholds, entrance and bottom board.", "#9f8156", [B("base", 0, 0, 0, 430, 360, 50), B("body", 0, 0, 50, 400, 330, 390), B("rim", 0, 0, 440, 430, 360, 35), B("lid", 0, 0, 475, 470, 400, 70), B("handle-left", -225, 0, 230, 35, 150, 110), B("handle-right", 225, 0, 230, 35, 150, 110), B("entrance", 0, -180, 70, 220, 20, 45)]),
    ("observation-hive", "Observation hive", "Framed vertical viewing hive with stacked inspection panels, base and carry handle.", "#8a7652", [B("base", 0, 0, 0, 520, 330, 80), B("left-rail", -220, 0, 80, 45, 250, 980), B("right-rail", 220, 0, 80, 45, 250, 980), B("back", 0, 100, 80, 440, 35, 960), B("lower-panel", 0, -45, 130, 390, 30, 280), B("middle-panel", 0, -45, 440, 390, 30, 280), B("upper-panel", 0, -45, 750, 390, 30, 280), B("top", 0, 0, 1040, 520, 330, 65), B("carry-handle", 0, 0, 1105, 250, 65, 45)]),
    ("hive-stand", "Hive stand", "Raised hive support with four feet, paired rails and a broad landing deck.", "#77705f", [*[B(f"leg-{x}-{y}", x, y, 0, 70, 70, 300) for x in (-250, 250) for y in (-180, 180)], B("rail-front", 0, -180, 250, 570, 70, 70), B("rail-back", 0, 180, 250, 570, 70, 70), B("cross-rail-left", -250, 0, 250, 70, 430, 70), B("cross-rail-right", 250, 0, 250, 70, 430, 70), B("deck", 0, 0, 320, 700, 520, 55)]),
    ("screened-bottom-board", "Screened bottom board", "Hive floor assembly with screen grid, side rails and front entrance ledge.", "#77786d", [B("floor", 0, 0, 30, 660, 500, 45), B("rail-left", -315, 0, 70, 35, 520, 80), B("rail-right", 315, 0, 70, 35, 520, 80), B("screen-bar-a", -180, 0, 80, 18, 440, 12), B("screen-bar-b", -90, 0, 80, 18, 440, 12), B("screen-bar-c", 0, 0, 80, 18, 440, 12), B("screen-bar-d", 90, 0, 80, 18, 440, 12), B("screen-bar-e", 180, 0, 80, 18, 440, 12), B("entrance-ledge", 0, -290, 25, 760, 100, 35)]),
    ("migratory-hive-cover", "Migratory hive cover", "Flat transport cover with overhanging rim, center ribs and lift tabs.", "#8c7b60", [B("cover-panel", 0, 0, 40, 720, 620, 50), B("front-rim", 0, -300, 0, 760, 30, 85), B("back-rim", 0, 300, 0, 760, 30, 85), B("left-rim", -365, 0, 0, 30, 570, 85), B("right-rim", 365, 0, 0, 30, 570, 85), B("rib-left", -190, 0, 90, 45, 560, 35), B("rib-right", 190, 0, 90, 45, 560, 35), B("handle-left", -250, 0, 110, 80, 50, 35), B("handle-right", 250, 0, 110, 80, 50, 35)]),
    ("inner-hive-cover", "Inner hive cover", "Thin inner cover board with raised perimeter rim and central ventilation collar.", "#9b835d", [B("board", 0, 0, 25, 620, 520, 35), B("rim-front", 0, -245, 0, 650, 25, 65), B("rim-back", 0, 245, 0, 650, 25, 65), B("rim-left", -312, 0, 0, 25, 470, 65), B("rim-right", 312, 0, 0, 25, 470, 65), C("vent-collar", 0, 0, 60, 45, 75), B("grip", 0, 0, 105, 180, 70, 30)]),
    ("entrance-reducer", "Hive entrance reducer", "Removable entrance strip with two opening blocks and a broad center bar.", "#89765a", [B("strip", 0, 0, 0, 620, 70, 38), B("left-block", -230, 0, 38, 90, 70, 48), B("right-block", 230, 0, 38, 90, 70, 48), B("center-bar", 0, 0, 38, 260, 70, 26), B("lift-tab-left", -300, 0, 38, 30, 95, 45), B("lift-tab-right", 300, 0, 38, 30, 95, 45)]),
    ("hive-frame", "Hive frame", "Wooden beehive frame with top bar, side rails, bottom bar and hanging ears.", "#b08c54", [B("top-bar", 0, 0, 720, 500, 38, 42), B("ear-left", -280, 0, 720, 65, 50, 30), B("ear-right", 280, 0, 720, 65, 50, 30), B("side-left", -220, 0, 45, 35, 32, 675), B("side-right", 220, 0, 45, 35, 32, 675), B("bottom-bar", 0, 0, 25, 470, 35, 35)]),
    ("foundation-frame", "Foundation frame", "Hive frame holding a thin foundation sheet between its rails.", "#b0915b", [B("top-bar", 0, 0, 720, 500, 38, 42), B("ear-left", -280, 0, 720, 65, 50, 30), B("ear-right", 280, 0, 720, 65, 50, 30), B("side-left", -220, 0, 45, 35, 32, 675), B("side-right", 220, 0, 45, 35, 32, 675), B("foundation", 0, 0, 80, 400, 12, 560), B("bottom-bar", 0, 0, 25, 470, 35, 35)]),
    ("queen-excluder", "Queen excluder", "Flat framed excluder grid with a dense array of narrow parallel bars.", "#8f846d", [B("frame-front", 0, -245, 0, 620, 30, 32), B("frame-back", 0, 245, 0, 620, 30, 32), B("frame-left", -295, 0, 0, 30, 460, 32), B("frame-right", 295, 0, 0, 30, 460, 32), *[B(f"grid-{i}", -250 + i * 50, 0, 20, 14, 460, 14) for i in range(11)]]),
    ("frame-rest", "Hive frame rest", "Crossbar accessory with two raised ledges that hold removed hive frames.", "#98784c", [B("beam", 0, 0, 0, 740, 80, 55), B("left-ledge", -240, 0, 55, 170, 110, 45), B("right-ledge", 240, 0, 55, 170, 110, 45), B("center-stop", 0, 0, 55, 45, 100, 65), B("left-foot", -290, 0, -55, 90, 150, 55), B("right-foot", 290, 0, -55, 90, 150, 55)]),
    ("frame-grip", "Frame grip", "Hand tool with paired clamping jaws, pivot block and long grip handles.", "#7e7060", [B("jaw-left", -70, 0, 250, 28, 220, 260), B("jaw-right", 70, 0, 250, 28, 220, 260), C("pivot", 0, 0, 190, 55, 52), B("handle-left", -110, 0, 80, 34, 45, 160), B("handle-right", 110, 0, 80, 34, 45, 160), B("grip-left", -150, 0, 0, 50, 70, 90), B("grip-right", 150, 0, 0, 50, 70, 90)]),
    ("bee-smoker", "Bee smoker", "Low-poly smoker with fire pot, perforated-look cap, spout and bellows body.", "#777a79", [C("fire-pot", 0, 0, 150, 300, 145), C("base-ring", 0, 0, 120, 35, 155), C("cap", 0, 0, 450, 70, 165), B("spout", 0, -130, 330, 110, 230, 70), B("spout-tip", 0, -310, 330, 150, 50, 45), B("bellows-back", 150, 0, 170, 60, 210, 250), B("bellows-front", 220, 0, 170, 35, 180, 210), B("handle", 0, 0, 0, 190, 140, 55)]),
    ("beekeeper-veil-hood", "Beekeeper veil hood", "Hat brim and crown framed by a squared mesh veil and lower neck band.", "#d1cbb4", [B("brim", 0, 0, 310, 380, 380, 35), B("crown", 0, 0, 420, 230, 230, 170), B("veil-front", 0, -175, 90, 330, 20, 220), B("veil-back", 0, 175, 90, 330, 20, 220), B("veil-left", -155, 0, 90, 20, 330, 220), B("veil-right", 155, 0, 90, 20, 330, 220), B("neck-band", 0, 0, 65, 350, 350, 30)]),
    ("beekeeper-jacket", "Beekeeper jacket", "Protective jacket form with torso, sleeves, collar and integrated hood ring.", "#d7d1be", [B("torso", 0, 0, 380, 480, 250, 570), B("sleeve-left", -300, 0, 400, 140, 170, 500), B("sleeve-right", 300, 0, 400, 140, 170, 500), B("cuff-left", -300, 0, 120, 155, 185, 50), B("cuff-right", 300, 0, 120, 155, 185, 50), B("collar", 0, -5, 660, 210, 200, 60), C("hood-rim", 0, 0, 720, 40, 145)]),
    ("beekeeper-gloves", "Beekeeper gloves", "Pair of gauntlet gloves with broad cuffs and separated low-poly fingers.", "#d8d0b8", [*[B(f"palm-{side}", x, 0, 130, 150, 65, 150) for side, x in (("left", -140), ("right", 140))], *[B(f"finger-{side}-{i}", center + offset, 0, 0, 38, 52, 145) for side, center in (("left", -140), ("right", 140)) for i, offset in enumerate((-48, -16, 16, 48))], B("cuff-left", -140, 0, 280, 210, 105, 65), B("cuff-right", 140, 0, 280, 210, 105, 65)]),
    ("bee-brush", "Bee brush", "Long-handled frame brush with a broad ferrule and a compact bristle block.", "#9b815c", [B("handle", 0, 0, 0, 45, 55, 300), B("ferrule", 0, 0, 300, 110, 60, 45), B("bristles", 0, 0, 345, 145, 95, 42), *[B(f"bristle-{i}", -55 + i * 22, 0, 385, 8, 78, 35) for i in range(6)]]),
    ("hive-tool", "Hive tool", "Compact flat hive tool with a broad scraper end and raised pry hook.", "#777b7d", [B("shaft", 0, 0, 0, 55, 40, 300), B("scraper", 0, 0, 300, 210, 48, 45), B("hook-base", 0, 0, 0, 110, 55, 45), B("hook-tip", 35, 0, -45, 45, 55, 110), B("grip-rib-a", 0, 28, 70, 65, 15, 30), B("grip-rib-b", 0, 28, 145, 65, 15, 30)]),
    ("uncapping-fork", "Uncapping fork", "Hand uncapping fork with a grip, narrow neck and row of short tines.", "#9b8b70", [B("handle", 0, 0, 0, 70, 65, 240), B("neck", 0, 0, 240, 40, 35, 115), B("head", 0, 0, 355, 230, 40, 30), *[B(f"tine-{i}", -95 + i * 24, 0, 385, 10, 22, 92) for i in range(9)]]),
    ("uncapping-knife", "Uncapping knife", "Long straight uncapping blade with broad handle and a small guard collar.", "#85898a", [B("blade", 0, 0, 230, 40, 18, 290), B("blade-tip", 0, 0, 500, 40, 18, 45), B("guard", 0, 0, 210, 100, 55, 25), B("handle", 0, 0, 0, 70, 65, 210), B("pommel", 0, 0, -20, 85, 75, 30)]),
    ("queen-cage", "Queen introduction cage", "Small ventilated queen cage with end plugs, hanging loop and cross bars.", "#b79b68", [B("cage-body", 0, 0, 20, 180, 90, 230), B("end-low", 0, 0, 0, 190, 100, 25), B("end-high", 0, 0, 250, 190, 100, 25), *[B(f"vent-{i}", -65 + i * 43, -50, 45, 16, 12, 180) for i in range(4)], B("hanging-loop", 0, 0, 275, 85, 35, 45)]),
    ("queen-marking-tube", "Queen marking tube", "Vertical queen-marking tube with padded base cup and sliding plunger handle.", "#9b8865", [C("tube", 0, 0, 70, 240, 70), C("base-cup", 0, 0, 20, 60, 85), B("plunger-rod", 0, 0, 310, 24, 24, 100), B("plunger-handle", 0, 0, 410, 100, 70, 30), C("top-rim", 0, 0, 300, 25, 80)]),
    ("queen-catching-clip", "Queen catching clip", "Lightweight queen-catching clip with two long arms, hinge and rounded tips.", "#9d916f", [B("arm-left", -75, 0, 100, 28, 36, 240), B("arm-right", 75, 0, 100, 28, 36, 240), C("hinge", 0, 0, 80, 50, 45), B("handle-left", -75, 0, 0, 55, 45, 75), B("handle-right", 75, 0, 0, 55, 45, 75), B("tip-left", -75, 0, 330, 55, 55, 35), B("tip-right", 75, 0, 330, 55, 55, 35)]),
    ("swarm-trap", "Swarm trap box", "Tall bait-hive box with rain cover, entrance landing and hanging brackets.", "#9c8155", [B("body", 0, 0, 100, 380, 330, 650), B("base", 0, 0, 70, 420, 370, 60), B("roof", 0, 0, 750, 460, 410, 75), B("entrance", 0, -170, 140, 160, 25, 60), B("landing", 0, -215, 100, 250, 110, 35), B("hanger-left", -130, 0, 825, 45, 45, 110), B("hanger-right", 130, 0, 825, 45, 45, 110)]),
    ("nuc-carrier", "Nucleus hive carrier", "Compact carrier frame with side handles, bottom slats and corner uprights.", "#88765a", [B("base", 0, 0, 0, 500, 420, 45), B("rail-left", -260, 0, 40, 45, 440, 280), B("rail-right", 260, 0, 40, 45, 440, 280), B("handle-left", -300, 0, 320, 110, 80, 45), B("handle-right", 300, 0, 320, 110, 80, 45), B("cross-front", 0, -200, 220, 580, 45, 45), B("cross-back", 0, 200, 220, 580, 45, 45)]),
    ("frame-carrier", "Hive frame carrier", "Portable frame rack with paired side rails, end handles and protective crossbars.", "#8f7952", [B("bottom", 0, 0, 0, 620, 430, 55), B("side-left", -295, 0, 55, 40, 430, 480), B("side-right", 295, 0, 55, 40, 430, 480), B("handle-left", -350, 0, 535, 100, 70, 40), B("handle-right", 350, 0, 535, 100, 70, 40), B("cross-front", 0, -210, 490, 650, 35, 35), B("cross-back", 0, 210, 490, 650, 35, 35)]),
    ("bee-escape-board", "Bee escape board", "Flat escape-board frame with a center panel and four raised tunnel blocks.", "#918064", [B("board", 0, 0, 25, 620, 500, 35), B("rim-front", 0, -245, 0, 650, 25, 70), B("rim-back", 0, 245, 0, 650, 25, 70), B("rim-left", -312, 0, 0, 25, 470, 70), B("rim-right", 312, 0, 0, 25, 470, 70), *[B(f"escape-tunnel-{i}", x, y, 60, 130, 100, 90) for i, (x, y) in enumerate(((-145, -110), (145, -110), (-145, 110), (145, 110)))]]),
    ("top-feeder", "Hive top feeder", "Shallow top feeder with outer rim, central access well and removable cover.", "#8b7855", [B("pan", 0, 0, 25, 620, 520, 85), B("rim-front", 0, -245, 110, 650, 25, 80), B("rim-back", 0, 245, 110, 650, 25, 80), B("rim-left", -312, 0, 110, 25, 470, 80), B("rim-right", 312, 0, 110, 25, 470, 80), B("access-well", 0, 0, 110, 210, 200, 120), B("cover", 0, 0, 230, 250, 230, 25)]),
    ("entrance-feeder", "Hive entrance feeder", "Small front-mounted feeder tray with clear-look reservoir and landing ledge.", "#a48a5f", [B("tray", 0, 0, 0, 300, 180, 60), B("front-lip", 0, -100, 60, 340, 25, 80), C("reservoir", 0, 40, 60, 250, 55), C("reservoir-cap", 0, 40, 310, 30, 65), B("mount-left", -120, 100, 60, 45, 100, 100), B("mount-right", 120, 100, 60, 45, 100, 100)]),
    ("pollen-trap", "Hive pollen trap", "Entrance trap box with a removable drawer, comb grid and front landing board.", "#8a795d", [B("trap-body", 0, 0, 70, 430, 300, 190), B("base", 0, 0, 40, 470, 330, 30), B("grid", 0, -160, 100, 360, 18, 130), *[B(f"grid-bar-{i}", -150 + i * 50, -174, 100, 12, 15, 130) for i in range(7)], B("drawer", 0, 0, 0, 350, 260, 45), B("landing", 0, -220, 40, 560, 110, 30)]),
    ("mouse-guard", "Hive mouse guard", "Narrow hive entrance guard plate with a row of evenly spaced vertical bars.", "#7d817e", [B("plate", 0, 0, 0, 620, 32, 65), B("top-rail", 0, 0, 65, 620, 30, 25), B("bottom-rail", 0, 0, -20, 620, 30, 25), *[B(f"guard-bar-{i}", -270 + i * 60, 0, 0, 18, 28, 90) for i in range(10)]]),
    ("apiary-waterer", "Apiary waterer", "Shallow water tray with raised reservoir, support ring and landing rim.", "#899084", [C("tray", 0, 0, 0, 65, 200), C("reservoir", 0, 0, 65, 280, 95), C("neck", 0, 0, 345, 45, 110), C("cap", 0, 0, 390, 35, 120), B("landing-front", 0, -210, 20, 420, 80, 30), B("landing-back", 0, 210, 20, 420, 80, 30)]),
    ("hive-scale", "Apiary hive scale", "Low platform scale with four feet, support deck and compact readout pedestal.", "#6f7775", [B("platform", 0, 0, 100, 600, 520, 50), *[B(f"foot-{x}-{y}", x, y, 0, 90, 90, 100) for x in (-230, 230) for y in (-190, 190)], B("readout-post", 0, -240, 150, 55, 50, 180), B("readout", 0, -255, 330, 180, 70, 95), B("screen", 0, -293, 360, 90, 12, 35)]),
    ("hive-inspection-mirror", "Hive inspection mirror", "Hand inspection mirror with grip, neck joint and framed rectangular viewing plate.", "#7d837f", [B("handle", 0, 0, 0, 60, 60, 330), B("grip-cap", 0, 0, -30, 90, 85, 35), B("neck", 0, 0, 330, 38, 38, 110), B("back-plate", 0, -15, 440, 290, 40, 210), B("mirror-face", 0, -40, 450, 245, 15, 165), B("frame-top", 0, -50, 540, 300, 25, 28), B("frame-bottom", 0, -50, 440, 300, 25, 28)]),
    ("apiary-sign", "Apiary sign", "Outdoor apiary marker with framed sign panel, two posts and weighted feet.", "#987a4f", [B("panel", 0, 0, 620, 660, 55, 360), B("top-frame", 0, 0, 990, 700, 75, 55), B("post-left", -250, 0, 50, 55, 55, 570), B("post-right", 250, 0, 50, 55, 55, 570), B("foot-left", -250, 0, 0, 180, 180, 50), B("foot-right", 250, 0, 0, 180, 180, 50)]),
    ("apiary-gate", "Apiary gate", "Simple yard gate with two posts, cross rails and a hinged-looking framed panel.", "#7e765f", [B("post-left", -500, 0, 35, 75, 75, 1120), B("post-right", 500, 0, 35, 75, 75, 1120), B("gate-top", 0, 0, 980, 980, 55, 55), B("gate-bottom", 0, 0, 120, 980, 55, 55), B("gate-rail-a", 0, 0, 350, 900, 45, 45), B("gate-rail-b", 0, 0, 650, 900, 45, 45), B("gate-brace", 0, 0, 100, 50, 60, 850), B("post-cap-left", -500, 0, 1155, 110, 110, 35), B("post-cap-right", 500, 0, 1155, 110, 110, 35)]),
    ("apiary-shade-canopy", "Apiary shade canopy", "Open four-post shade shelter with top frame, roof slats and cross braces.", "#8e856b", [*[B(f"post-{x}-{y}", x, y, 0, 55, 55, 1050) for x in (-400, 400) for y in (-300, 300)], B("beam-front", 0, -300, 1030, 850, 60, 65), B("beam-back", 0, 300, 1030, 850, 60, 65), B("beam-left", -400, 0, 1030, 60, 650, 65), B("beam-right", 400, 0, 1030, 60, 650, 65), *[B(f"roof-slat-{i}", -320 + i * 160, 0, 1100, 55, 650, 35) for i in range(5)]]),
    ("honey-extractor", "Manual honey extractor", "Low-poly radial extractor drum with lid, center spindle, legs and hand crank.", "#858b8a", [C("drum", 0, 0, 250, 500, 250), C("base-ring", 0, 0, 210, 45, 265), C("lid", 0, 0, 750, 45, 270), C("spindle", 0, 0, 795, 240, 32), B("crank-arm", 0, -90, 900, 260, 35, 35), C("crank-grip", 130, -90, 900, 100, 28), *[B(f"leg-{i}", x, y, 0, 45, 45, 250) for i, (x, y) in enumerate(((-190, -190), (190, -190), (0, 190)))], B("drain-spout", 0, -255, 315, 115, 90, 45)]),
    ("uncapping-tank", "Uncapping tank", "Open rectangular uncapping tank with rim, ledge and elevated collection legs.", "#8e8e84", [B("tank", 0, 0, 150, 620, 440, 250), B("rim-front", 0, -220, 400, 650, 35, 55), B("rim-back", 0, 220, 400, 650, 35, 55), B("rim-left", -310, 0, 400, 35, 405, 55), B("rim-right", 310, 0, 400, 35, 405, 55), B("frame-ledge-left", -390, 0, 440, 180, 60, 45), B("frame-ledge-right", 390, 0, 440, 180, 60, 45), *[B(f"leg-{x}", x, 0, 0, 55, 55, 150) for x in (-240, 240)]]),
    ("honey-settling-tank", "Honey settling tank", "Tall settling vessel with domed-look lid, support feet and a lower drain valve.", "#9d8e67", [C("vessel", 0, 0, 80, 500, 210), C("base-ring", 0, 0, 45, 45, 230), C("lid", 0, 0, 580, 60, 225), C("lid-handle", 0, 0, 640, 70, 28), B("valve-body", 0, -210, 170, 110, 90, 80), C("valve-handle", 0, -260, 195, 28, 55), *[B(f"foot-{i}", x, y, 0, 65, 65, 85) for i, (x, y) in enumerate(((-150, -150), (150, -150), (-150, 150), (150, 150)))]]),
    ("honey-bucket", "Honey pail", "Straight sided honey pail with lid, rim, bail handle and small bottom feet.", "#a28d5e", [C("pail", 0, 0, 35, 280, 140), C("bottom", 0, 0, 0, 35, 145), C("lid", 0, 0, 315, 35, 150), C("lid-knob", 0, 0, 350, 35, 25), B("bail", 0, 0, 390, 300, 28, 18), *[B(f"foot-{i}", x, y, 0, 45, 45, 35) for i, (x, y) in enumerate(((-95, -95), (95, -95), (-95, 95), (95, 95)))]]),
    ("honey-strainer", "Honey strainer", "Stacking filter basket with broad rim, lower tapered-look body and support tabs.", "#858d8b", [C("basket", 0, 0, 25, 180, 170), C("rim", 0, 0, 205, 35, 195), *[B(f"screen-bar-{i}", -120 + i * 40, 0, 35, 8, 250, 150) for i in range(7)], B("tab-left", -210, 0, 205, 85, 55, 25), B("tab-right", 210, 0, 205, 85, 55, 25)]),
    ("bottling-stand", "Honey bottling stand", "Small bottling platform with raised support rails, bottle seat and valve clearance.", "#927c55", [B("base", 0, 0, 0, 560, 430, 55), B("back-post", 0, 180, 55, 60, 70, 390), B("top-rail", 0, 180, 430, 460, 60, 55), B("left-guide", -180, -20, 55, 45, 220, 130), B("right-guide", 180, -20, 55, 45, 220, 130), B("bottle-stop", 0, -175, 55, 350, 35, 85), B("front-feet", 0, -170, 0, 420, 45, 45)]),
    ("honey-jar", "Honey jar", "Simple straight sided jar with a shoulder rim, screw lid and small label panel.", "#ab945b", [C("jar-body", 0, 0, 25, 220, 75), C("shoulder", 0, 0, 245, 45, 60), C("neck", 0, 0, 290, 70, 45), C("lid", 0, 0, 360, 45, 55), B("label", 0, -73, 110, 95, 10, 80)]),
    ("honey-squeeze-bottle", "Honey squeeze bottle", "Soft sided bottle form with tapered shoulder, narrow nozzle and cap.", "#b2934e", [C("body", 0, 0, 30, 230, 80), C("shoulder", 0, 0, 260, 60, 65), C("neck", 0, 0, 320, 75, 38), C("nozzle", 0, 0, 395, 85, 20), C("cap", 0, 0, 480, 40, 30), B("label", 0, -80, 120, 85, 12, 80)]),
    ("beeswax-block", "Beeswax block", "Rectangular low-poly beeswax cake with shallow mold ribs and end tabs.", "#d2a64f", [B("block", 0, 0, 80, 420, 290, 150), B("top", 0, 0, 230, 400, 270, 30), B("rib-left", -160, 0, 230, 22, 270, 25), B("rib-right", 160, 0, 230, 22, 270, 25), B("tab-front", 0, -160, 90, 130, 30, 50), B("tab-back", 0, 160, 90, 130, 30, 50)]),
    ("comb-section-box", "Comb section box", "Small presentation box frame with top rim, lower tray and open-look center panel.", "#b29054", [B("base", 0, 0, 0, 260, 220, 35), B("left", -115, 0, 35, 30, 220, 240), B("right", 115, 0, 35, 30, 220, 240), B("front", 0, -95, 35, 230, 30, 240), B("back", 0, 95, 35, 230, 30, 240), B("top-rim", 0, 0, 275, 270, 230, 35), B("comb-panel", 0, 0, 110, 160, 12, 130)]),
    ("solar-wax-melter", "Solar wax melter", "Angled-look insulated solar melter box with hinged lid frame, tray and support feet.", "#8e7c57", [B("body", 0, 0, 120, 600, 420, 260), B("lid-frame", 0, 0, 390, 650, 470, 55), B("lid-panel", 0, 0, 445, 590, 410, 24), B("tray", 0, 0, 150, 470, 300, 30), B("front-support-left", -230, -150, 0, 55, 55, 120), B("front-support-right", 230, -150, 0, 55, 55, 120), B("rear-support-left", -230, 150, 0, 55, 55, 180), B("rear-support-right", 230, 150, 0, 55, 55, 180), B("wax-drain", 0, -220, 160, 120, 65, 45)]),
]

if len(ASSETS) != 50:
    raise SystemExit(f"expected 50 assets, got {len(ASSETS)}")


def render(asset):
    asset_id, title, description, color, parts = asset
    has_cylinder = any(part[0] == "cylinder" for part in parts)
    lines = [
        "// SPDX-License-Identifier: CC0-1.0",
        "// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.",
        "",
        "meta({",
        f"  name: {json.dumps(asset_id)},",
        "  license: 'CC0-1.0',",
        f"  title: {json.dumps(title)},",
        f"  description: {json.dumps(description + ' Stylized scene geometry. Knobs: overall scale and asset color.')},",
        "  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],",
        "  kit: 'apiary',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],",
        "  triangleBudget: 1800,",
        "});",
        "",
        "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(color)}, {{ label: 'Asset color' }});",
        "const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);",
    ]
    if has_cylinder:
        lines.append("const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);")
    lines.extend(["", f"const p=assembly({json.dumps(asset_id)});"])
    min_z = min(part[4] for part in parts)
    for part in parts:
        if part[0] == "box":
            _, name, x, y, z, width, depth, height = part
            lines.append(f"p.part({json.dumps(name)},b({x},{y},{z - min_z},{width},{depth},{height}).color(color));")
        else:
            _, name, x, y, z, height, radius, sides = part
            lines.append(f"p.part({json.dumps(name)},c({x},{y},{z - min_z},{height},{radius},{sides}).color(color));")
    lines.extend(["", "return p.model();", ""])
    return "\n".join(lines)


for asset in ASSETS:
    (KIT / f"{asset[0]}.kcad.ts").write_text(render(asset))

(KIT / "kit.json").write_text(json.dumps({
    "title": "Apiary",
    "description": "Original low-poly beekeeping, hive-yard and honey-handling scene props with editable scale and color controls.",
}, indent=2) + "\n")

print(f"generated {len(ASSETS)} apiary assets")
