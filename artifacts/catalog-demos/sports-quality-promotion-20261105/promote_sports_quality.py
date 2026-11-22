#!/usr/bin/env python3
"""Promote the existing sports kit with material controls and useful details.

This is a one-time migration of the 40 existing ids. It preserves their
parametric scale controls, assigns editable color knobs by material, adds one
source-declared variant preset per asset, and refines sports-specific seams or
mesh where a plain ball or solid net panel hid the object's identity.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/sports"
OUT = Path(__file__).resolve().parent


# key, label, default, club/practice preset color
M = {
    "american-football": [
        ("pebbledLeather", "Pebbled leather", "#98552f", "#39759a"),
        ("ivoryLaces", "Ivory lacing", "#efe8d6", "#f4d247"),
        ("endStripePaint", "End stripe paint", "#e9e1d0", "#e9e1d0"),
    ],
    "badminton-racket": [
        ("graphiteFrame", "Graphite frame", "#596d62", "#2d536f"),
        ("nylonStrings", "Nylon strings", "#e8e4d8", "#e8e4d8"),
        ("gripRubber", "Grip rubber", "#343a38", "#d64a42"),
    ],
    "barbell": [
        ("chromedSteel", "Chrome steel", "#9da9ad", "#9da9ad"),
        ("bumperRubber", "Bumper plate rubber", "#30363a", "#3b6b8b"),
        ("knurlSteel", "Knurled grip steel", "#c0c7c6", "#d6ae3d"),
    ],
    "baseball-bat": [
        ("mapleWood", "Maple bat wood", "#9b7046", "#bd8b51"),
        ("gripTape", "Grip tape", "#30363a", "#c5443d"),
        ("endGrain", "End-grain wood", "#c39a64", "#c39a64"),
    ],
    "baseball-glove": [
        ("gloveLeather", "Glove leather", "#9a5938", "#73503e"),
        ("palmLining", "Palm lining", "#6c4632", "#6c4632"),
        ("laceCord", "Lace cord", "#ddb987", "#f0d6a2"),
    ],
    "baseball": [
        ("coverLeather", "Ball cover", "#eee9dd", "#f1eee5"),
        ("redStitching", "Red stitching", "#c73732", "#1e568c"),
    ],
    "basketball-hoop": [
        ("powderCoat", "Powder-coated steel", "#647987", "#496b52"),
        ("backboardPolycarbonate", "Backboard polycarbonate", "#d8e3df", "#d8e3df"),
        ("rimSteel", "Rim steel", "#d34a3b", "#e4a928"),
        ("netNylon", "Net nylon", "#eee8d8", "#eee8d8"),
    ],
    "basketball": [
        ("pebbledCover", "Pebbled ball cover", "#d47a32", "#3979a3"),
        ("channelRubber", "Channel rubber", "#302c29", "#272d32"),
    ],
    "batting-helmet": [
        ("helmetPolymer", "Helmet shell polymer", "#4c6f9d", "#d74336"),
        ("impactFoam", "Impact foam", "#292e33", "#292e33"),
        ("faceGuardSteel", "Face guard steel", "#aab4b5", "#aab4b5"),
    ],
    "cricket-bat": [
        ("willowWood", "Willow bat wood", "#9a754d", "#bc985d"),
        ("rubberGrip", "Rubber grip", "#303638", "#d04d40"),
        ("edgeTape", "Edge tape", "#e6e1d4", "#e6e1d4"),
    ],
    "cricket-wicket": [
        ("wicketTimber", "Wicket timber", "#b18b5f", "#8f744f"),
        ("groundRubber", "Ground rubber", "#5b625d", "#5b625d"),
        ("bailPaint", "Bail paint", "#e8e1d0", "#e8e1d0"),
    ],
    "dumbbell": [
        ("knurledSteel", "Knurled handle steel", "#aab4b8", "#aab4b8"),
        ("rubberWeight", "Rubber weights", "#30363a", "#496f83"),
    ],
    "exercise-ball": [
        ("vinylCover", "Exercise ball vinyl", "#7c9ab2", "#ce5948"),
        ("seamTape", "Reinforced seam tape", "#eee8dc", "#eee8dc"),
        ("valvePolymer", "Valve polymer", "#333b40", "#333b40"),
    ],
    "foam-roller": [
        ("evaFoam", "EVA roller foam", "#537d78", "#cf7140"),
        ("corePolymer", "Core polymer", "#263135", "#263135"),
    ],
    "golf-bag": [
        ("nylonFabric", "Bag nylon fabric", "#42675d", "#bd5e40"),
        ("rimAluminium", "Rim aluminium", "#aab4b5", "#aab4b5"),
        ("clubSteel", "Club steel", "#8b969a", "#8b969a"),
        ("strapWebbing", "Strap webbing", "#c2b9a3", "#e6d67a"),
    ],
    "golf-club": [
        ("stainlessSteel", "Club-head stainless steel", "#abb6b9", "#abb6b9"),
        ("graphiteShaft", "Graphite shaft", "#3c444a", "#3c444a"),
        ("gripRubber", "Grip rubber", "#242d32", "#c24f43"),
    ],
    "gym-bench": [
        ("vinylUpholstery", "Vinyl upholstery", "#344f5c", "#87463d"),
        ("frameSteel", "Frame steel", "#8e999d", "#8e999d"),
        ("footRubber", "Foot rubber", "#30363a", "#30363a"),
    ],
    "hockey-puck": [
        ("vulcanizedRubber", "Vulcanized puck rubber", "#383d42", "#3b6682"),
        ("faceRubber", "Face rubber", "#252a2e", "#252a2e"),
    ],
    "hockey-stick": [
        ("compositeShaft", "Composite shaft", "#8a6844", "#344c68"),
        ("bladeTape", "Blade tape", "#e7e0d0", "#d54c3e"),
        ("gripTape", "Grip tape", "#30363a", "#30363a"),
    ],
    "inline-skate": [
        ("syntheticBoot", "Synthetic boot fabric", "#465c70", "#c04d40"),
        ("aluminiumFrame", "Frame aluminium", "#9ea9ac", "#9ea9ac"),
        ("urethaneWheel", "Urethane wheels", "#d6d4ca", "#dc9e31"),
        ("moldedCuff", "Molded cuff polymer", "#35424d", "#35424d"),
    ],
    "jump-rope": [
        ("braidedNylon", "Braided nylon rope", "#bd5c4b", "#3875a0"),
        ("handlePolymer", "Handle polymer", "#4d5557", "#4d5557"),
        ("gripFoam", "Grip foam", "#d5c7a9", "#e3d18c"),
    ],
    "kettlebell": [
        ("castIron", "Cast iron body", "#555e63", "#3f687f"),
        ("handleSteel", "Handle steel", "#aab4b7", "#aab4b7"),
    ],
    "lacrosse-stick": [
        ("graphiteShaft", "Graphite shaft", "#59666b", "#3e6b8c"),
        ("headPolymer", "Head polymer", "#e4e1d8", "#d4a02f"),
        ("pocketNylon", "Pocket nylon", "#d5d2c7", "#d5d2c7"),
    ],
    "shuttlecock": [
        ("cork", "Cork tip", "#b6945d", "#b6945d"),
        ("featherNylon", "Skirt nylon", "#e8e4d8", "#d9e7e5"),
        ("crownTape", "Crown binding tape", "#d9b94a", "#d74f42"),
    ],
    "skateboard": [
        ("mapleDeck", "Maple deck", "#a75e3b", "#527c9c"),
        ("truckAluminium", "Truck aluminium", "#8d999d", "#8d999d"),
        ("urethaneWheel", "Urethane wheels", "#34383b", "#d8a932"),
    ],
    "soccer-ball": [
        ("ballCover", "Ball cover", "#ece8d6", "#e8e4d8"),
        ("panelPolymer", "Panel polymer", "#272c30", "#cf4939"),
    ],
    "soccer-goal": [
        ("goalAluminium", "Goal aluminium", "#dce2df", "#dce2df"),
        ("netNylon", "Net nylon", "#728078", "#e5e1d4"),
        ("groundRubber", "Ground rubber", "#343b3e", "#343b3e"),
    ],
    "sports-water-bottle": [
        ("stainlessSteel", "Bottle stainless steel", "#8fa1a6", "#3f8191"),
        ("capPolymer", "Cap polymer", "#30393c", "#30393c"),
        ("siliconeGrip", "Silicone grip band", "#d34c3d", "#e2b537"),
    ],
    "starting-block": [
        ("anodizedAluminium", "Anodized aluminium", "#8b989b", "#8b989b"),
        ("pedalRubber", "Pedal rubber", "#344b5b", "#ba4d3f"),
        ("trackMat", "Track mat", "#3a4042", "#3a4042"),
    ],
    "tennis-ball": [
        ("feltCover", "Felt cover", "#b6c84c", "#d9a63a"),
        ("seamTape", "Seam tape", "#f0ebdf", "#f0ebdf"),
    ],
    "tennis-net": [
        ("powderCoat", "Powder-coated steel", "#6d7471", "#526d56"),
        ("netNylon", "Net nylon", "#dddccf", "#e6e1d4"),
        ("baseRubber", "Base rubber", "#303638", "#303638"),
    ],
    "tennis-racket": [
        ("graphiteFrame", "Graphite frame", "#5b6870", "#357394"),
        ("nylonStrings", "Nylon strings", "#e7e3d7", "#e7e3d7"),
        ("gripTape", "Grip tape", "#343a3d", "#cf4d41"),
    ],
    "track-hurdle": [
        ("anodizedAluminium", "Anodized aluminium", "#a5b0b2", "#a5b0b2"),
        ("crossbarPolymer", "Crossbar polymer", "#d9c554", "#d84b40"),
        ("footRubber", "Foot rubber", "#333a3d", "#333a3d"),
    ],
    "treadmill": [
        ("frameSteel", "Frame steel", "#5b676c", "#496b52"),
        ("runningBeltRubber", "Running belt rubber", "#282d31", "#282d31"),
        ("consoleGlass", "Console glass", "#70a7b7", "#cf6345"),
    ],
    "trophy-cup": [
        ("goldPlating", "Gold-plated metal", "#c6a640", "#b9c1c1"),
        ("walnutBase", "Walnut base", "#765139", "#765139"),
        ("engravingInlay", "Engraving inlay", "#f0db88", "#e2e5de"),
    ],
    "volleyball-net": [
        ("powderCoat", "Powder-coated steel", "#697573", "#526c55"),
        ("meshNylon", "Mesh nylon", "#dddccf", "#e6e1d4"),
        ("safetyBand", "Top safety band", "#f0eee3", "#e4c64e"),
        ("baseRubber", "Base rubber", "#303638", "#303638"),
    ],
    "volleyball": [
        ("panelFabric", "Ball panel fabric", "#e7e2d6", "#3976a0"),
        ("seamTape", "Seam tape", "#3e88a5", "#efe5d4"),
        ("panelAccent", "Panel accent fabric", "#d3b642", "#d84b40"),
    ],
    "weight-plate": [
        ("castIron", "Cast iron plate", "#5b666b", "#46667a"),
        ("boreSteel", "Bore sleeve steel", "#b4bdbe", "#b4bdbe"),
        ("markingPaint", "Weight marking paint", "#d5d0bf", "#d5d0bf"),
    ],
    "yoga-block": [
        ("evaFoam", "EVA foam", "#8c6b78", "#587f75"),
        ("tractionFoam", "Textured grip foam", "#70535f", "#456a60"),
    ],
    "yoga-mat": [
        ("foamRubber", "Foam rubber mat", "#6b8978", "#587ca0"),
        ("carryWebbing", "Carry webbing", "#c2b49a", "#d7c154"),
        ("edgeBinding", "Edge binding", "#3d534b", "#3d534b"),
    ],
}


PART_RULES = {
    "american-football": [(r"ball", "pebbledLeather")],
    "badminton-racket": [(r"string", "nylonStrings"), (r"grip", "gripRubber"), (r"head-frame|throat|shaft", "graphiteFrame")],
    "barbell": [(r"plate", "bumperRubber"), (r"shaft", "chromedSteel")],
    "baseball-bat": [(r"grip", "gripTape"), (r"knob", "endGrain"), (r"barrel|taper", "mapleWood")],
    "baseball-glove": [(r"lace", "laceCord"), (r"palm", "palmLining"), (r"wrist|finger|thumb", "gloveLeather")],
    "baseball": [(r"ball", "coverLeather")],
    "basketball-hoop": [(r"net", "netNylon"), (r"rim", "rimSteel"), (r"backboard", "backboardPolycarbonate"), (r"base|upright|support", "powderCoat")],
    "basketball": [(r"ball", "pebbledCover")],
    "batting-helmet": [(r"padding|foam", "impactFoam"), (r"guard", "faceGuardSteel"), (r"shell|brim", "helmetPolymer")],
    "cricket-bat": [(r"grip|cap", "rubberGrip"), (r"blade|shoulder|handle", "willowWood")],
    "cricket-wicket": [(r"ground", "groundRubber"), (r"bail", "bailPaint"), (r"stump", "wicketTimber")],
    "dumbbell": [(r"handle", "knurledSteel"), (r"weight", "rubberWeight")],
    "exercise-ball": [(r"ball", "vinylCover")],
    "foam-roller": [(r"roller", "evaFoam")],
    "golf-bag": [(r"club", "clubSteel"), (r"strap", "strapWebbing"), (r"rim", "rimAluminium"), (r"bag-body", "nylonFabric"), (r"base", "nylonFabric")],
    "golf-club": [(r"grip", "gripRubber"), (r"shaft", "graphiteShaft"), (r"head", "stainlessSteel")],
    "gym-bench": [(r"pad", "vinylUpholstery"), (r"foot", "footRubber"), (r"leg|crossbar", "frameSteel")],
    "hockey-puck": [(r"puck", "vulcanizedRubber")],
    "hockey-stick": [(r"grip", "gripTape"), (r"blade|heel", "bladeTape"), (r"shaft", "compositeShaft")],
    "inline-skate": [(r"wheel", "urethaneWheel"), (r"chassis", "aluminiumFrame"), (r"cuff", "moldedCuff"), (r"boot", "syntheticBoot")],
    "jump-rope": [(r"grip", "gripFoam"), (r"handle", "handlePolymer"), (r"rope", "braidedNylon")],
    "kettlebell": [(r"handle|foot", "handleSteel"), (r"body", "castIron")],
    "lacrosse-stick": [(r"pocket", "pocketNylon"), (r"head", "headPolymer"), (r"shaft|throat", "graphiteShaft")],
    "shuttlecock": [(r"cork", "cork"), (r"crown", "crownTape"), (r"skirt", "featherNylon")],
    "skateboard": [(r"wheel", "urethaneWheel"), (r"truck", "truckAluminium"), (r"deck", "mapleDeck")],
    "soccer-ball": [(r"ball", "ballCover")],
    "soccer-goal": [(r"net", "netNylon"), (r"post|crossbar", "goalAluminium")],
    "sports-water-bottle": [(r"band", "siliconeGrip"), (r"cap", "capPolymer"), (r"body|shoulder|neck", "stainlessSteel")],
    "starting-block": [(r"pedal|heel-stop", "pedalRubber"), (r"base-rail", "anodizedAluminium")],
    "tennis-ball": [(r"ball", "feltCover")],
    "tennis-net": [(r"net-panel", "netNylon"), (r"base", "baseRubber"), (r"post|band", "powderCoat")],
    "tennis-racket": [(r"string", "nylonStrings"), (r"handle|butt-cap", "gripTape"), (r"head-frame|throat", "graphiteFrame")],
    "track-hurdle": [(r"foot", "footRubber"), (r"crossbar", "crossbarPolymer"), (r"upright", "anodizedAluminium")],
    "treadmill": [(r"belt|deck", "runningBeltRubber"), (r"screen", "consoleGlass"), (r"console|upright|foot", "frameSteel")],
    "trophy-cup": [(r"base", "walnutBase"), (r"rim", "engravingInlay"), (r"stem|bowl|handle", "goldPlating")],
    "volleyball-net": [(r"net-panel", "meshNylon"), (r"top-band", "safetyBand"), (r"base", "baseRubber"), (r"post", "powderCoat")],
    "volleyball": [(r"ball", "panelFabric")],
    "weight-plate": [(r"plate", "castIron")],
    "yoga-block": [(r"block", "evaFoam")],
    "yoga-mat": [(r"mat", "foamRubber"), (r"rolled-edge", "edgeBinding")],
}


DESCRIPTIONS = {
    "american-football": "Elongated pebbled football with pointed ends, contrasting end stripes and raised cross-laces across the crown.",
    "basketball": "Faceted orange basketball with two dark curved channel seams wrapping around the pebbled cover.",
    "baseball": "White faceted baseball with paired raised red seam lines tracing the familiar curved path.",
    "soccer-ball": "Ivory faceted soccer ball with contrasting pentagonal panel patches distributed over the spherical cover.",
    "tennis-ball": "Compact felt tennis ball with a continuous curved ivory seam around its spherical surface.",
    "volleyball": "Panelled volleyball with contrasting curved seam bands that divide its soft spherical cover.",
    "exercise-ball": "Large vinyl fitness ball with raised reinforcing seams and a distinct inflation valve.",
    "basketball-hoop": "Freestanding basketball hoop with a weighted base, clear backboard, red rim and tapered hanging net cords.",
    "soccer-goal": "Portable soccer goal with an aluminium frame and an open knotted-looking net grid across its roof, sides and floor.",
    "tennis-net": "Practice tennis net with taut vertical and horizontal mesh cords, a reinforced top band and grounded posts.",
    "volleyball-net": "Portable volleyball net with a dense open cord grid, pale safety band and weighted ground feet.",
    "lacrosse-stick": "Lacrosse stick with a long graphite shaft, molded open head and a visible crossed nylon pocket.",
    "sports-water-bottle": "Reusable sports bottle with a brushed steel body, polymer cap and contrasting silicone grip band.",
    "foam-roller": "Textured foam roller with a dark polymer core and contrasting end rings.",
    "hockey-puck": "Dense cylindrical hockey puck with a molded rubber sidewall and inset dark face band.",
    "weight-plate": "Cast-iron gym plate with a central sleeved bore and a contrasting painted weight marker.",
    "yoga-block": "Rectangular EVA yoga block with raised traction ribs across its broad support face.",
}


# Source-native additions that make the sport-specific construction legible in
# the small catalog preview. Small cylinders form low-poly raised seam strokes.
LINE_STROKE_HELPER = '''
const seamStroke = (name: string, a: [number, number, number], b: [number, number, number], radius: number, finish: string) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  const axis: [number, number, number] = [-dy, dx, 0];
  const angle = Math.acos(Math.max(-1, Math.min(1, dz / length))) * 180 / Math.PI;
  const shape = cylinder(length + 0.7, radius, 6).rotate(axis, angle).translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  p.part(name, shape.color(finish));
};
'''

LINE_HELPER = LINE_STROKE_HELPER + '''
const seamCurve = (prefix: string, pointAt: (t: number) => [number, number, number], count: number, radius: number, finish: string) => {
  for (let i = 0; i < count; i++) {
    const a = pointAt(2 * Math.PI * i / count), b = pointAt(2 * Math.PI * (i + 1) / count);
    seamStroke(`${prefix}-${i + 1}`, a, b, radius, finish);
  }
};
'''


DETAILS = {
    "american-football": '''
// Raised white cross-laces sit on the upper crown of the oblong leather shell.
p.part("lace-bar", box(32, 3.4, 2.6, true).translate(0, 0, 77).color(ivoryLaces));
for (let i = 0; i < 5; i++) p.part(`lace-${i + 1}`, box(2.6, 14, 2.8, true).translate(0, -19 + i * 9.5, 77).color(ivoryLaces));
p.part("end-stripe-front", box(4, 44, 6, true).translate(-56, 0, 39.36).color(endStripePaint));
p.part("end-stripe-back", box(4, 44, 6, true).translate(56, 0, 39.36).color(endStripePaint));
''',
    "barbell": '''
// A polished centre grip sleeve separates the working shaft from its bumper plates.
p.part("knurl-grip-sleeve", box(76, 18.4, 18.4, true).translate(0, 0, 78).color(knurlSteel));
''',
    "basketball": '''
// Two continuous, shallow torus channels divide the orange ball into familiar panels.
p.part("equator-channel", torus(61.8, 0.65, 12).translate(0, 0, 62).color(channelRubber));
p.part("meridian-channel", torus(61.8, 0.4, 12).rotateX(90).translate(0, 0, 62.25).color(channelRubber));
''',
    "baseball": '''
// Paired continuous red seam cords curve around the pale leather ball.
p.part("red-seam-left", torus(33.7, 0.65, 12).rotateX(42).translate(0, 0, 34).color(redStitching));
p.part("red-seam-right", torus(33.7, 0.65, 12).rotateX(-42).translate(0, 0, 34).color(redStitching));
''',
    "baseball-glove": '''
// Pale leather laces bridge the palm web and outer finger stalls.
for (let i = 0; i < 5; i++) p.part(`palm-web-lace-${i + 1}`, box(3.5, 3, 38, true).rotate([0, 1, 0], (i - 2) * 8).translate(-31 + i * 15.5, -48, 113).color(laceCord));
''',
    "batting-helmet": '''
// Two replaceable inner foam pads sit inside the protective shell at the temples.
p.part("left-temple-padding", box(22, 32, 11, true).translate(-42, -3, 37).color(impactFoam));
p.part("right-temple-padding", box(22, 32, 11, true).translate(42, -3, 37).color(impactFoam));
''',
    "cricket-bat": '''
// Narrow protective edge strips run along the blade shoulders.
p.part("left-edge-tape", box(2.2, 4, 168, true).translate(-40, -16, 100).color(edgeTape));
p.part("right-edge-tape", box(2.2, 4, 168, true).translate(40, -16, 100).color(edgeTape));
''',
    "soccer-ball": '''
// Raised pentagonal patches break up the ivory cover into a recognizable panel ball.
for (let i = 0; i < 5; i++) {
  const a = 2 * Math.PI * i / 5 + Math.PI / 10;
  const x = 24 * Math.cos(a), y = 24 * Math.sin(a);
  const z = 58 + Math.sqrt(58 * 58 - x * x - y * y) + 0.6;
  p.part(`pentagon-panel-${i + 1}`, sphere(8.8).scale([1, 1, 0.2]).translate(x, y, z).color(panelPolymer));
}
''',
    "tennis-ball": '''
// A smooth continuous seam traces a curved band around the felt ball.
p.part("curved-seam", torus(33.8, 0.65, 12).rotateX(58).translate(0, 0, 34).color(seamTape));
''',
    "volleyball": '''
// Two soft raised seam rings divide the pale fabric cover into broad panels.
p.part("panel-channel-a", torus(57.8, 0.65, 12).translate(0, 0, 58).color(seamTape));
p.part("panel-channel-b", torus(57.8, 0.4, 12).rotateX(90).translate(0, 0, 58.25).color(panelAccent));
''',
    "exercise-ball": '''
// A broad reinforcing seam and small inflation valve distinguish the fitness ball.
p.part("reinforced-seam", torus(63.4, 0.7, 12).translate(0, 0, 64).color(seamTape));
p.part("inflation-valve", cylinder(5, 5, 8).translate(0, -61, 60).color(valvePolymer));
''',
    "basketball-hoop": LINE_STROKE_HELPER + '''
// Tapered hanging nylon cords make the rim assembly read as a playable hoop.
for (let i = 0; i < 12; i++) {
  const a = 2 * Math.PI * i / 12, b = 2 * Math.PI * (i + 0.5) / 12;
  seamStroke(`net-cord-${i + 1}`, [56 * Math.cos(a), 56 * Math.sin(a), 236], [34 * Math.cos(b), 34 * Math.sin(b), 185], 1.1, netNylon);
}
''',
    "soccer-goal": '''
// Open mesh cords replace the solid panels while preserving the goal's frame.
for (let i = 0; i <= 9; i++) {
  const y = 0 + i * 10;
  p.part(`roof-mesh-long-${i + 1}`, box(282, 2.4, 2.4, true).translate(0, y, 205).color(netNylon));
  p.part(`floor-mesh-long-${i + 1}`, box(282, 2.4, 2.4, true).translate(0, y, 4).color(netNylon));
}
for (let i = 0; i <= 14; i++) {
  const x = -140 + i * 20;
  p.part(`roof-mesh-cross-${i + 1}`, box(2.4, 90, 2.4, true).translate(x, 42, 205).color(netNylon));
  p.part(`floor-mesh-cross-${i + 1}`, box(2.4, 90, 2.4, true).translate(x, 42, 4).color(netNylon));
  p.part(`left-mesh-cross-${i + 1}`, box(2.4, 2.4, 205, true).translate(-140, -3 + i * 6, 105).color(netNylon));
  p.part(`right-mesh-cross-${i + 1}`, box(2.4, 2.4, 205, true).translate(140, -3 + i * 6, 105).color(netNylon));
}
for (let i = 0; i <= 5; i++) {
  const z = 20 + i * 36;
  p.part(`left-mesh-height-${i + 1}`, box(2.4, 90, 2.4, true).translate(-140, 42, z).color(netNylon));
  p.part(`right-mesh-height-${i + 1}`, box(2.4, 90, 2.4, true).translate(140, 42, z).color(netNylon));
}
p.part("left-ground-pad", box(42, 44, 10, true).translate(-145, 0, 5).color(groundRubber));
p.part("right-ground-pad", box(42, 44, 10, true).translate(145, 0, 5).color(groundRubber));
''',
    "starting-block": '''
// A thin non-slip track pad sits beneath the aluminium rail.
p.part("track-grip-pad", box(230, 44, 2, true).translate(0, 0, 1).color(trackMat));
''',
    "yoga-mat": '''
// Webbing straps cross the rolled mat, with binding along the two long edges.
p.part("carry-strap-left", box(8, 205, 2, true).translate(-55, 0, 9).color(carryWebbing));
p.part("carry-strap-right", box(8, 205, 2, true).translate(55, 0, 9).color(carryWebbing));
p.part("edge-binding-front", box(296, 3, 1.5, true).translate(0, -102, 9).color(edgeBinding));
p.part("edge-binding-back", box(296, 3, 1.5, true).translate(0, 102, 9).color(edgeBinding));
''',
    "tennis-net": '''
// Thin nylon cords make the practice net open and visibly woven, not a flat slab.
for (let i = 0; i <= 18; i++) p.part(`mesh-vertical-${i + 1}`, box(2, 2.5, 116, true).translate(-210 + i * 23.3, 0, 85).color(netNylon));
for (let i = 0; i <= 6; i++) p.part(`mesh-horizontal-${i + 1}`, box(430, 2.5, 2, true).translate(0, 0, 30 + i * 18).color(netNylon));
''',
    "volleyball-net": '''
// A fine open nylon lattice is tensioned between the posts under the safety band.
for (let i = 0; i <= 18; i++) p.part(`mesh-vertical-${i + 1}`, box(2, 3, 180, true).translate(-175 + i * 19.4, 0, 105).color(meshNylon));
for (let i = 0; i <= 9; i++) p.part(`mesh-horizontal-${i + 1}`, box(358, 3, 2, true).translate(0, 0, 22 + i * 18).color(meshNylon));
''',
    "lacrosse-stick": '''
// Crossed nylon cords fill the shallow pocket of the open lacrosse head.
for (let i = 0; i < 7; i++) p.part(`pocket-longitudinal-${i + 1}`, box(2, 2, 78, true).translate(-30 + i * 10, 0, 618).color(pocketNylon));
for (let i = 0; i < 5; i++) p.part(`pocket-cross-${i + 1}`, box(52, 2, 2, true).translate(0, 0, 590 + i * 14).color(pocketNylon));
''',
    "sports-water-bottle": '''
// A soft silicone ring adds grip to the lower half of the steel bottle.
p.part("silicone-grip-band", cylinder(10, 40, 12).subtract(cylinder(12, 37, 12).translate(0, 0, -1)).translate(0, 0, 105).color(siliconeGrip));
''',
    "foam-roller": '''
// Contrasting end rings expose the roller's polymer core at each end.
for (const y of [-106, 106]) p.part(`core-end-ring-${y}`, cylinder(8, 49, 12).subtract(cylinder(10, 46, 12).translate(0, 0, -1)).rotate([1, 0, 0], 90).translate(0, y, 50).color(corePolymer));
''',
    "hockey-puck": '''
// A shallow face ring gives the molded rubber puck a distinct top surface.
p.part("face-inset-ring", cylinder(2, 29, 12).subtract(cylinder(3, 22, 12).translate(0, 0, -0.5)).translate(0, 0, 22).color(faceRubber));
''',
    "hockey-stick": '''
// Dark wrap bands mark the hand grip at the upper end of the composite shaft.
for (let i = 0; i < 4; i++) p.part(`grip-wrap-${i + 1}`, box(20, 22, 5, true).translate(0, 0, 538 + i * 18).color(gripTape));
''',
    "weight-plate": '''
// The bright sleeve lines the central bore while leaving its opening clear.
p.part("bore-sleeve", cylinder(8, 21.6, 16).subtract(cylinder(9, 17.2, 16).translate(0, 0, -0.5)).translate(0, 0, 7).color(boreSteel));
p.part("weight-mark", box(24, 4, 2, true).translate(0, -73, 11).color(markingPaint));
''',
    "yoga-block": '''
// Shallow traction ribs break up the broad EVA support face.
for (let i = 0; i < 5; i++) p.part(`traction-rib-${i + 1}`, box(152, 3, 2, true).translate(0, -38 + i * 19, 65).color(tractionFoam));
''',
    "golf-bag": '''
// Three low-profile clubs remain visible above the bag rim as distinct metal heads.
for (let i = 0; i < 3; i++) p.part(`club-head-${i + 1}`, box(18, 10, 8, true).translate(-28 + i * 28, -15 + i * 15, 570 + i * 6).color(clubSteel));
''',
}


def color_params(asset_id: str) -> tuple[str, list[str]]:
    rows = M[asset_id]
    declarations = [
        f"const {key} = param('{key}', '{default}', {{ label: '{label}' }});"
        for key, label, default, _ in rows
    ]
    preset_colors = ", ".join(f"{key}: '{variant}'" for key, _, _, variant in rows[:2])
    declarations.append(f"presets({{ clubColors: {{ {preset_colors} }} }});")
    return "\n".join(declarations), [key for key, *_ in rows]


def assigned_material(asset_id: str, part: str, keys: list[str]) -> str:
    for pattern, material in PART_RULES[asset_id]:
        if re.search(pattern, part):
            return material
    return keys[0]


def promote(asset_id: str, dry_run: bool) -> dict[str, object]:
    path = KIT / f"{asset_id}.kcad.ts"
    source = path.read_text(encoding="utf-8")
    if "param('color'" not in source or "presets(" in source:
        raise SystemExit(f"{asset_id}: expected original single-color source")

    if asset_id == "soccer-goal":
        source = re.sub(r"^\s*p\.part\(['\"]net-[^'\"]+['\"], .*\);\n", "", source, flags=re.M)
    if asset_id in {"tennis-net", "volleyball-net"}:
        source = re.sub(r"^\s*p\.part\(['\"]net-panel['\"], .*\);\n", "", source, flags=re.M)
    if asset_id == "lacrosse-stick":
        expected = "sphere(68).scale([0.72, 1.05, 0.14]).translate(0, 0, 618)"
        if expected not in source:
            raise SystemExit("lacrosse-stick: head source pattern changed")
        source = source.replace(
            expected,
            "sphere(68).scale([0.72, 1.05, 0.14]).subtract(sphere(53).scale([0.72, 1.05, 0.18])).rotateX(90).translate(0, 0, 618)",
        )

    old_sha = hashlib.sha256(source.encode()).hexdigest()
    param_block, keys = color_params(asset_id)
    source, count = re.subn(
        r"const color = param\('color',\s*'#[0-9a-fA-F]{6}',\s*\{ label: 'Asset color' \}\);",
        param_block,
        source,
        count=1,
    )
    if count != 1:
        raise SystemExit(f"{asset_id}: could not replace generic color knob")

    part_pattern = re.compile(r"^(\s*)p\.part\(['\"]([^'\"]+)['\"], (.+)\.color\(color\)\);$", re.M)
    seen: list[str] = []

    def recolor(match: re.Match[str]) -> str:
        indent, part, geometry = match.groups()
        material = assigned_material(asset_id, part, keys)
        seen.append(material)
        return f"{indent}p.part('{part}', {geometry}.color({material}));"

    source = part_pattern.sub(recolor, source)
    if not seen:
        raise SystemExit(f"{asset_id}: no colored parts matched")
    used = set(seen)
    for material in keys:
        if material not in used and material not in DETAILS.get(asset_id, ""):
            raise SystemExit(f"{asset_id}: declared but unused material knob {material}")

    description = DESCRIPTIONS.get(asset_id)
    if description is None:
        desc_match = re.search(r"description: '([^']*)'", source)
        if not desc_match:
            raise SystemExit(f"{asset_id}: no description found")
        description = desc_match.group(1)
    labels = ", ".join(row[1].lower() for row in M[asset_id])
    full_description = f"{description} Material controls: {labels}."
    source, count = re.subn(r"description: '[^']*'", "description: " + json.dumps(full_description), source, count=1)
    if count != 1:
        raise SystemExit(f"{asset_id}: could not update description")

    budget = 1400 if asset_id == "soccer-goal" else 900 if asset_id == "basketball-hoop" else 800 if asset_id in {"basketball", "baseball", "volleyball", "soccer-ball", "tennis-ball"} else 600
    source, count = re.subn(r"triangleBudget: \d+", f"triangleBudget: {budget}", source, count=1)
    if count != 1:
        raise SystemExit(f"{asset_id}: could not tune triangle budget")

    comment = f"// {M_TITLE(asset_id)}: {description} Low-poly sports prop in millimetres, Z up; materials: {labels}.\n"
    if not source.startswith("//"):
        source = comment + source
    else:
        lines = source.splitlines(keepends=True)
        insert_at = 1 if lines[0].startswith("// SPDX") else 0
        lines.insert(insert_at, comment)
        source = "".join(lines)

    detail = DETAILS.get(asset_id, "")
    if detail:
        needle = "return p.model();"
        if source.count(needle) != 1:
            raise SystemExit(f"{asset_id}: expected one model return")
        source = source.replace(needle, detail + "\n" + needle)
    if asset_id == "lacrosse-stick":
        for before, after in (
            (".translate(-30 + i * 10, 0, 618)", ".translate(-30 + i * 10, -10, 618)"),
            (".translate(0, 0, 590 + i * 14)", ".translate(0, -10, 590 + i * 14)"),
        ):
            if before not in source:
                raise SystemExit("lacrosse-stick: pocket source pattern changed")
            source = source.replace(before, after)

    new_sha = hashlib.sha256(source.encode()).hexdigest()
    if not dry_run:
        path.write_text(source, encoding="utf-8")
    return {
        "id": asset_id,
        "source": str(path.relative_to(ROOT)),
        "sha256Before": old_sha,
        "sha256After": new_sha,
        "colorKnobs": [{"name": row[0], "label": row[1], "default": row[2]} for row in M[asset_id]],
        "preset": "clubColors",
        "triangleBudget": budget,
        "partsRecolored": len(seen),
        "additionalGeometry": bool(detail),
        "description": description,
    }


def M_TITLE(asset_id: str) -> str:
    return asset_id.replace("-", " ").title()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    ids = {p.name.removesuffix(".kcad.ts") for p in KIT.glob("*.kcad.ts")}
    if set(M) != ids:
        missing = sorted(ids ^ set(M))
        raise SystemExit(f"sports asset/config ID mismatch: {missing}")
    if args.apply:
        before = OUT / "before"
        before.mkdir(exist_ok=True)
        import subprocess

        for asset_id in sorted(M):
            target = before / f"{asset_id}.png"
            if not target.exists():
                data = subprocess.check_output(["git", "show", f"HEAD:catalog/kits/sports/previews/{asset_id}.png"], cwd=ROOT)
                target.write_bytes(data)
    plan = [promote(asset_id, dry_run=not args.apply) for asset_id in sorted(M)]
    (OUT / "promotion-plan.json").write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    print(f"{'Applied' if args.apply else 'Planned'} promotion for {len(plan)} sports assets; {sum(len(row['colorKnobs']) for row in plan)} material knobs; {sum(row['additionalGeometry'] for row in plan)} geometry refinements")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
