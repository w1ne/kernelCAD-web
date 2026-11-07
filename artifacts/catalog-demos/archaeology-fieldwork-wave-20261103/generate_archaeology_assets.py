#!/usr/bin/env python3
"""Generate original, generic low-poly archaeology fieldwork scene props."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT_ID = 'archaeology-fieldwork'
KIT = ROOT / 'catalog' / 'kits' / KIT_ID
KIT.mkdir(parents=True, exist_ok=True)


def B(name, x, y, z, w, d, h, rx=0, ry=0, rz=0):
    return ('box', name, x, y, z, w, d, h, rx, ry, rz)


def C(name, x, y, z, h, r, segments=10):
    return ('cylinder', name, x, y, z, h, r, segments)


def HX(name, x, y, z, length, radius, segments=10):
    return ('horizontal-x', name, x, y, z, length, radius, segments)


def HY(name, x, y, z, length, radius, segments=10):
    return ('horizontal-y', name, x, y, z, length, radius, segments)


def R(name, x, y, z, height, radius, wall, segments=12, axis='z'):
    return ('ring', name, x, y, z, height, radius, wall, segments, axis)


def low_z(part):
    kind, _name, *args = part
    if kind == 'box':
        _x, _y, z, width, depth, height, rx, ry, rz = args
        angles = [math.radians(angle) for angle in (rx, ry, rz)]
        cx, sx = math.cos(angles[0]), math.sin(angles[0])
        cy, sy = math.cos(angles[1]), math.sin(angles[1])
        cz, sz = math.cos(angles[2]), math.sin(angles[2])
        rx_matrix = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
        ry_matrix = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
        rz_matrix = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]

        def multiply(left, right):
            return [[sum(left[row][k] * right[k][col] for k in range(3)) for col in range(3)] for row in range(3)]

        rotation = multiply(rz_matrix, multiply(ry_matrix, rx_matrix))
        half_z = sum(abs(rotation[2][axis]) * size / 2 for axis, size in enumerate((width, depth, height)))
        return z + height / 2 - half_z
    if kind == 'cylinder':
        return args[2]
    if kind in {'horizontal-x', 'horizontal-y'}:
        return args[2] - args[4]
    if kind == 'ring':
        z, height, radius, _wall, _segments, axis = args[2:]
        return z - (height / 2 if axis == 'z' else radius)
    raise ValueError(f'unknown geometry kind {kind}')


ASSETS = []


def add(asset_id, title, description, color, *parts):
    ASSETS.append((asset_id, title, description, color, list(parts)))


# Survey and excavation-unit layout.
add('excavation-grid', 'Excavation grid ropes', 'Four taut survey lines and corner pins mark a square excavation unit.', '#c69b54',
    HX('north-grid-line', 0, -600, 8, 1200, 8, 6), HX('south-grid-line', 0, 600, 8, 1200, 8, 6),
    HY('west-grid-line', -600, 0, 8, 1200, 8, 6), HY('east-grid-line', 600, 0, 8, 1200, 8, 6),
    *[C(f'corner-pin-{i}', x, y, 0, 90, 18, 8) for i, (x, y) in enumerate([(-600, -600), (600, -600), (-600, 600), (600, 600)])])
add('survey-stake', 'Survey stake', 'Short pointed field stake with a broad head for marking a measured position.', '#b56a37',
    C('stake-shaft', 0, 0, 0, 360, 22, 8), C('stake-head', 0, 0, 330, 55, 38, 8), B('head-tab', 0, 0, 365, 125, 32, 30))
add('boundary-flag', 'Survey boundary flag', 'Bright survey marker flag mounted on a narrow ground stake.', '#d65b38',
    C('flag-stake', 0, 0, 0, 650, 14, 8), B('flag-cloth', 68, 0, 520, 136, 18, 115, 0, 0, -12), C('ground-ferrule', 0, 0, 0, 75, 24, 8))
add('tape-measure', 'Field tape measure', 'Compact tape case with a winding hub, lock button and short measuring blade.', '#df8d35',
    B('case', 0, 0, 0, 180, 90, 165), C('side-hub', 0, -51, 78, 24, 44, 10), B('lock-button', 0, -42, 166, 50, 35, 24), B('tape-blade', 140, 0, 60, 165, 18, 12), B('hook', 221, 0, 45, 24, 44, 38))
add('folding-rule', 'Folding measuring rule', 'Three linked flat rule sections with hinge blocks at their joints.', '#e2c85c',
    B('rule-left', -180, 0, 0, 360, 30, 22, 0, 0, -12), B('rule-center', 180, 38, 0, 360, 30, 22), B('rule-right', 540, 0, 0, 360, 30, 22, 0, 0, 12),
    *[C(f'hinge-{i}', x, y, 10, 42, 18, 8) for i, (x, y) in enumerate([(0, 0), (360, 38)])])
add('plumb-bob', 'Plumb bob', 'Weighted survey bob hanging from a short line and top eye.', '#8b9390',
    C('bob-body', 0, 0, 0, 160, 48, 10), C('lower-weight', 0, 0, -1, 90, 20, 8), C('line', 0, 0, 158, 240, 4, 6), R('top-eye', 0, 0, 394, 20, 22, 8, 8))
add('line-level', 'String line level', 'Small tubular level with a raised center vial and hanging end hooks.', '#7a9691',
    HX('level-body', 0, 0, 0, 190, 20, 10), B('vial-window', 0, 0, 24, 66, 24, 16), *[R(f'end-hook-{i}', x, 0, -3, 28, 25, 7, 8, 'y') for i, x in enumerate([-85, 85])])
add('survey-compass', 'Survey compass', 'Pocket survey compass with a polygon bezel, center pivot and visible direction needle.', '#718c73',
    C('compass-case', 0, 0, 0, 34, 118, 12), R('bezel', 0, 0, 15, 18, 118, 12, 12), B('needle-long', 0, 0, 40, 12, 160, 7, 0, 0, 0), B('needle-short', 0, 0, 42, 84, 12, 7, 0, 0, 90), C('pivot', 0, 0, 43, 12, 16, 8))
add('north-arrow-marker', 'North arrow marker', 'Portable four-point orientation marker on a low circular base.', '#c4a64c',
    C('base', 0, 0, 0, 26, 112, 10), C('pivot', 0, 0, 26, 72, 25, 8), B('north-point', 0, 64, 74, 28, 128, 18), B('south-point', 0, -64, 74, 28, 128, 18), B('east-point', 64, 0, 74, 128, 28, 18), B('west-point', -64, 0, 74, 128, 28, 18))
add('total-station', 'Survey total station', 'Tripod-mounted survey instrument with a compact body, telescope barrel and adjustment knobs.', '#b77b3d',
    *[B(f'tripod-leg-{i}', x, y, 0, 42, 42, 600, rx=angle_x, ry=angle_y) for i, (x, y, angle_x, angle_y) in enumerate([(-210, -170, -12, 18), (210, -170, -12, -18), (0, 220, 15, 0)])],
    C('head-column', 0, 0, 560, 120, 42, 8), B('instrument-body', 0, 0, 680, 260, 190, 190), HX('telescope', 0, -115, 745, 260, 36, 10), *[C(f'adjustment-knob-{i}', x, y, 685, 42, 24, 8) for i, (x, y) in enumerate([(-155, 0), (155, 0)])])
add('grade-rod', 'Survey grade rod', 'Tall marked staff with a reinforced shoe and cross-grip at the top.', '#d7a44a',
    B('rod', 0, 0, 0, 70, 50, 1450), *[B(f'graduation-band-{i}', 0, -27, 90 + i * 125, 48, 5, 14) for i in range(10)], B('shoe', 0, 0, 0, 95, 68, 80), HX('top-grip', 0, 0, 1410, 180, 24, 8))

# Hand tools used for careful soil removal and cleaning.
add('archaeologist-trowel', 'Archaeologist trowel', 'Short-handled pointed excavation trowel with a broad blade and raised ferrule.', '#83928a',
    HX('handle', -190, 0, 28, 170, 28, 8), HX('handle-cap', -275, 0, 28, 28, 30, 8), HX('ferrule', -82, 0, 28, 70, 38, 8),
    B('blade', 18, 0, 3, 245, 180, 18), B('blade-tip', 174, 0, 3, 105, 88, 16))
add('margin-trowel', 'Margin trowel', 'Narrow rectangular masonry-style blade on a short grip for fine excavation work.', '#89918c',
    HX('handle', -170, 0, 24, 170, 27, 8), HX('neck', -62, 0, 24, 80, 24, 8), B('narrow-blade', 70, 0, 3, 230, 88, 18), B('shoulder', -8, 0, 3, 78, 126, 24))
add('pointing-trowel', 'Pointing trowel', 'Triangular pointed hand trowel with a rounded grip and narrow tang.', '#9b9d94',
    HX('handle', -155, 0, 24, 155, 28, 8), HX('grip-cap', -236, 0, 24, 34, 30, 8), HX('tang', -54, 0, 24, 96, 18, 8),
    B('blade', 74, 0, 3, 172, 125, 18), B('point', 174, 0, 3, 78, 58, 16))
add('round-point-shovel', 'Round point shovel', 'Full-size digging shovel with a rounded blade, socket, long shaft and D grip.', '#a9a49a',
    B('blade', 0, -10, 0, 270, 92, 410, 0, -5), B('shoulder', 0, -10, 355, 320, 105, 58), C('shaft', 0, 0, 380, 750, 24, 8), HX('d-grip-top', 0, 0, 1150, 190, 24, 8), HY('d-grip-side-left', -80, 0, 1085, 130, 18, 8), HY('d-grip-side-right', 80, 0, 1085, 130, 18, 8))
add('square-point-shovel', 'Square point shovel', 'Flat-edged transfer shovel with a broad blade, straight shaft and cross-grip.', '#9d9a8f',
    B('blade', 0, 0, 0, 330, 72, 360), B('blade-lip', 0, 0, 330, 355, 105, 50), C('shaft', 0, 0, 380, 720, 24, 8), HX('cross-grip', 0, 0, 1100, 180, 25, 8))
add('trenching-spade', 'Trenching spade', 'Long narrow trenching blade with a straight socket and extended handle.', '#8e9a90',
    B('narrow-blade', 0, 0, 0, 140, 66, 430), B('blade-rib', 0, -36, 60, 22, 25, 300), C('shaft', 0, 0, 405, 830, 22, 8), HX('grip', 0, 0, 1200, 160, 24, 8))
add('excavation-pick', 'Excavation pick', 'Compact pick with a crosswise head, pointed end and short straight handle.', '#7d8680',
    C('handle', 0, 0, 0, 510, 24, 8), HX('head', 0, 0, 530, 350, 28, 8), B('point', -195, 0, 520, 105, 34, 38, 0, 0, -16), B('adze-end', 180, 0, 500, 95, 42, 32, 0, 0, 12))
add('mattock', 'Excavation mattock', 'Broad adze mattock head on a long field handle.', '#85867d',
    C('handle', 0, 0, 0, 760, 26, 8), HX('head', 0, 0, 755, 390, 32, 8), B('adze-blade', -208, 0, 700, 120, 180, 38), B('pick-tip', 198, 0, 715, 94, 42, 44, 0, 0, 14))
add('soil-knife', 'Soil profile knife', 'Narrow profile knife with a guarded handle, straight blade and lanyard eye.', '#c68f42',
    B('handle', 0, 0, 0, 64, 72, 190), R('lanyard-eye', 0, 0, 176, 26, 34, 10, 8), B('blade', 0, 0, 190, 22, 54, 280), B('blade-point', 0, 0, 460, 16, 48, 58, 0, 0, 8))
add('masonry-chisel', 'Masonry chisel', 'Short steel chisel with a protective hand guard and widened striking cap.', '#92958d',
    C('blade', 0, 0, 0, 300, 20, 8), C('bevel', 0, 0, 0, 48, 14, 8), B('hand-guard', 0, 0, 275, 115, 72, 48), C('striking-cap', 0, 0, 325, 76, 32, 8))
add('soft-finds-brush', 'Soft finds brush', 'Wide soft-bristle brush with a short wooden handle and flared brush head.', '#b58048',
    HX('handle', -145, 0, 30, 230, 22, 8), HX('neck', -12, 0, 30, 70, 28, 8), B('brush-block', 62, 0, 5, 132, 174, 24),
    *[HX(f'bristle-bundle-{i}', 139, y, 14, 76, 7, 6) for i, y in enumerate([-66, -44, -22, 0, 22, 44, 66])])
add('detail-paintbrush', 'Detailing brush', 'Fine pointed cleaning brush with a tapered grip, ferrule and slim bristle bundle.', '#d1a14e',
    HX('handle', -125, 0, 22, 230, 17, 8), HX('ferrule', 14, 0, 22, 52, 22, 8), HX('bristles', 112, 0, 22, 154, 12, 8), HX('bristle-tip', 195, 0, 22, 28, 7, 8), C('handle-end', -238, 0, 7, 30, 19, 8))
add('wire-cleaning-brush', 'Wire cleaning brush', 'Small stiff cleaning brush with a flat back, metal bristles and a hanging eye.', '#858983',
    B('handle', 0, 0, 0, 180, 48, 48), R('hanging-eye', 0, 0, 18, 20, 30, 8, 8), B('brush-block', 0, 0, 42, 170, 78, 28), *[C(f'wire-row-{i}', -60 + i * 24, 0, 66, 75, 5, 6) for i in range(6)])
add('hand-broom', 'Hand broom', 'Short whisk broom with a tapered handle, bound neck and fan of coarse bristles.', '#a9804d',
    C('handle', 0, 0, 0, 180, 20, 8), B('bound-neck', 0, 0, 158, 70, 62, 78), *[B(f'bristle-{i}', x, 0, 202, 22, 38, 125, 0, 0, angle) for i, (x, angle) in enumerate([(-56, -18), (-28, -9), (0, 0), (28, 9), (56, 18)])])
add('dustpan-and-brush', 'Dustpan and brush', 'Field dustpan with a raised lip and a compact cleaning brush resting beside it.', '#78887d',
    B('pan-base', 0, -80, 0, 270, 220, 22), B('pan-back', 0, 26, 14, 270, 20, 135), B('pan-left-wall', -126, -75, 20, 18, 195, 62), B('pan-right-wall', 126, -75, 20, 18, 195, 62), B('pan-handle', 0, 210, 18, 48, 210, 38), B('brush-handle', 142, -70, 4, 42, 185, 34, 0, 0, -22), B('brush-head', 205, -76, 0, 85, 105, 48))
add('detail-scoop', 'Soil detail scoop', 'Small flat soil scoop with raised side cheeks and a short grip.', '#969b91',
    HX('handle', -145, 0, 22, 180, 20, 8), HX('neck', -43, 0, 22, 72, 28, 8), B('scoop-pan', 92, 0, 3, 190, 170, 18), B('left-cheek', 92, -78, 15, 190, 14, 42), B('right-cheek', 92, 78, 15, 190, 14, 42))

# Soil screening and sample processing.
add('shaker-screen', 'Archaeology shaker screen', 'Large raised wooden frame with crossbars and four short support legs.', '#a37a4c',
    *[B(f'frame-rail-{i}', x, y, 370, w, d, 65) for i, (x, y, w, d) in enumerate([(0, -320, 760, 48), (0, 320, 760, 48), (-356, 0, 48, 640), (356, 0, 48, 640)])],
    *[HX(f'mesh-bar-x-{i}', 0, -240 + i * 80, 402, 690, 6, 6) for i in range(7)], *[HY(f'mesh-bar-y-{i}', -280 + i * 80, 0, 402, 580, 6, 6) for i in range(8)],
    *[B(f'leg-{i}', x, y, 0, 38, 38, 375, rx=angle_x, ry=angle_y) for i, (x, y, angle_x, angle_y) in enumerate([(-300, -260, -10, -9), (300, -260, -10, 9), (-300, 260, 10, -9), (300, 260, 10, 9)])])
add('fine-mesh-sieve', 'Fine-mesh sample sieve', 'Round hand sieve with a deep side band, dense crossbars and a short grip.', '#8f968d',
    R('sieve-rim', 0, 0, 0, 42, 230, 24, 14), *[HX(f'mesh-x-{i}', 0, -160 + i * 40, 22, 420, 4, 6) for i in range(9)], *[HY(f'mesh-y-{i}', -160 + i * 40, 0, 22, 420, 4, 6) for i in range(9)], HX('handle', 0, -260, 20, 190, 18, 8))
add('water-screen-frame', 'Water screening frame', 'Raised rectangular wash screen with corner legs, side rails and drainage basin.', '#718d8c',
    *[B(f'frame-rail-{i}', x, y, 460, w, d, 55) for i, (x, y, w, d) in enumerate([(0, -280, 700, 45), (0, 280, 700, 45), (-328, 0, 45, 520), (328, 0, 45, 520)])],
    *[B(f'leg-{i}', x, y, 0, 44, 44, 475) for i, (x, y) in enumerate([(-300, -250), (300, -250), (-300, 250), (300, 250)])], B('drain-tray', 0, 0, 330, 600, 440, 28), *[HX(f'mesh-bar-{i}', 0, -180 + i * 60, 490, 610, 5, 6) for i in range(7)])
add('nested-sieves', 'Nested field sieves', 'Stack of three shallow round sieves with visible rims and different diameters.', '#929990',
    *[R(f'sieve-{i}', 0, 0, i * 34, 38, radius, 18, 12) for i, radius in enumerate([230, 196, 162])], C('center-post', 0, 0, 0, 130, 14, 8))
add('sediment-bucket', 'Sediment bucket', 'Open field bucket with a reinforced rim, flat base and swing handle.', '#799187',
    C('bucket-body', 0, 0, 0, 340, 190, 12), R('bucket-rim', 0, 0, 325, 32, 205, 16, 12), R('base-band', 0, 0, 0, 30, 194, 14, 12), R('handle-left', -185, 0, 335, 22, 28, 8, 8, 'y'), R('handle-right', 185, 0, 335, 22, 28, 8, 8, 'y'), HX('handle-grip', 0, 0, 490, 390, 13, 8))
add('sample-scoop', 'Soil sample scoop', 'Long-handled sampling scoop with a shallow bowl and raised rim.', '#a4a297',
    C('shaft', 0, 0, 0, 360, 20, 8), HX('cross-grip', 0, 0, 340, 130, 21, 8), B('bowl', 0, 0, 365, 125, 175, 32), B('left-rim', -61, 0, 388, 14, 160, 42), B('right-rim', 61, 0, 388, 14, 160, 42), C('neck', 0, 0, 348, 55, 29, 8))
add('hand-auger', 'Hand soil auger', 'Manual soil auger with a T-handle, straight shaft and open helical-look cutting blades.', '#858d88',
    C('shaft', 0, 0, 0, 740, 20, 8), HX('t-handle', 0, 0, 720, 230, 24, 8), *[B(f'cutting-flight-{i}', 0, 0, 100 + i * 80, 138, 92, 16, 0, 0, i * 22) for i in range(4)], C('cutting-tip', 0, 0, 0, 120, 28, 8))
add('soil-core-sampler', 'Soil core sampler', 'Hollow field corer with a reinforced mouth, top grip and removable cap.', '#89928d',
    R('sample-tube', 0, 0, 0, 460, 50, 13, 10), R('mouth-rim', 0, 0, 440, 28, 58, 12, 10), B('handle-crossbar', 0, 0, 470, 190, 28, 28), C('top-cap', 0, 0, 455, 35, 54, 10), B('depth-window', 0, -27, 145, 18, 5, 155))
add('flotation-tank', 'Soil flotation tank', 'Open rectangular sample tank on a braced stand with a hose outlet and top rim.', '#72918e',
    B('tank-body', 0, 0, 110, 520, 420, 480), *[B(f'tank-rim-{i}', x, y, 575, w, d, 42) for i, (x, y, w, d) in enumerate([(0, -210, 560, 28), (0, 210, 560, 28), (-266, 0, 28, 392), (266, 0, 28, 392)])],
    *[B(f'stand-leg-{i}', x, y, 0, 38, 38, 160) for i, (x, y) in enumerate([(-220, -170), (220, -170), (-220, 170), (220, 170)])], HX('outlet', 290, 0, 270, 170, 28, 8), C('outlet-valve', 370, 0, 246, 48, 34, 8))
add('sample-wash-tray', 'Finds wash tray', 'Shallow rectangular washing tray with a raised perimeter and one drain opening.', '#7f9992',
    B('tray-floor', 0, 0, 0, 420, 300, 24), *[B(f'tray-wall-{i}', x, y, 20, w, d, 70) for i, (x, y, w, d) in enumerate([(0, -145, 420, 18), (0, 145, 420, 18), (-201, 0, 18, 290), (201, 0, 18, 290)])], R('drain', 172, 110, 0, 26, 20, 7, 8))
add('sorting-pan', 'Finds sorting pan', 'Wide shallow sorting pan with rounded polygon-style rim and central divider.', '#a28c63',
    B('pan-base', 0, 0, 0, 400, 300, 30), *[B(f'pan-wall-{i}', x, y, 25, w, d, 62) for i, (x, y, w, d) in enumerate([(0, -140, 400, 20), (0, 140, 400, 20), (-190, 0, 20, 280), (190, 0, 20, 280)])], B('divider', 0, 0, 35, 20, 270, 44))

# Recording and site photography props.
add('field-notebook', 'Field notebook', 'Hard-cover field notebook with a visible spine, elastic band and page block.', '#6d846c',
    B('page-block', 0, 0, 0, 240, 320, 38), B('front-cover', 0, -13, 38, 258, 330, 20), B('back-cover', 0, 13, -5, 258, 330, 16), B('spine', -125, 0, 18, 24, 345, 44), B('elastic-band', 90, 0, 59, 15, 338, 8))
add('context-clipboard', 'Excavation context clipboard', 'Field form board with a top clip and pencil loop for recording a soil context.', '#8c7355',
    B('board', 0, 0, 0, 300, 390, 20), B('paper', 0, 0, 22, 265, 340, 8), B('clip', 0, -174, 32, 88, 38, 22), C('clip-pivot', 0, -174, 45, 16, 16, 8), HX('pencil', 118, 0, 31, 180, 8, 6))
add('photo-scale-bar', 'Photo scale bar', 'Segmented rectangular scale bar with raised end stops for site photography.', '#c4b07a',
    B('bar-body', 0, 0, 0, 420, 52, 18), *[B(f'marker-{i}', -180 + i * 60, 0, 18, 28, 52, 12) for i in range(7)], *[B(f'end-stop-{i}', x, 0, 12, 18, 74, 24) for i, x in enumerate([-210, 210])])
add('photo-north-arrow', 'Photo north arrow', 'Compact direction arrow and base used to orient an excavation photograph.', '#d29a42',
    B('base', 0, 0, 0, 170, 120, 18), B('arrow-shaft', 0, 0, 20, 26, 110, 18), B('arrowhead', 0, 52, 28, 78, 48, 18, 0, 0, 0), B('tail', 0, -48, 26, 52, 35, 16))
add('photo-board', 'Excavation photo board', 'Portable board with a raised clamp, short grip and blank recording face.', '#71856e',
    B('board-face', 0, 0, 0, 330, 250, 24), B('top-rail', 0, -120, 28, 330, 20, 38), B('clip', 0, -130, 50, 86, 30, 18), HX('carry-handle', 0, 0, -22, 130, 14, 8))
add('site-camera', 'Field documentation camera', 'Compact field camera with a short lens barrel, raised viewfinder and grip.', '#667671',
    B('camera-body', 0, 0, 0, 240, 165, 150), R('lens-mount', 0, -90, 78, 20, 68, 12, 12, 'y'), C('lens', 0, -128, 77, 72, 48, 10), B('lens-rim', 0, -164, 76, 110, 22, 18), B('viewfinder', -70, 45, 152, 70, 54, 34), C('shutter-button', 82, -20, 151, 22, 18, 8), B('grip', 98, 0, 25, 36, 130, 110))
add('excavation-camera-tripod', 'Camera field tripod', 'Three-leg camera tripod with a compact pan head, center column and leveling plate.', '#838d88',
    *[B(f'tripod-leg-{i}', x, y, 0, 26, 26, 620, rx=angle_x, ry=angle_y) for i, (x, y, angle_x, angle_y) in enumerate([(-185, -140, -12, 16), (185, -140, -12, -16), (0, 205, 16, 0)])],
    C('center-column', 0, 0, 555, 150, 24, 8), B('leveling-plate', 0, 0, 690, 180, 145, 28), C('pan-head', 0, 0, 718, 62, 36, 8), HX('camera-plate', 0, 0, 775, 110, 16, 8))
add('field-loupe', 'Field magnifier', 'Hand lens with a circular frame, short stem and oval grip.', '#9c9f94',
    R('lens-frame', 150, 0, 38, 22, 88, 16, 12), B('stem', 36, 0, 20, 175, 36, 18), B('grip', -86, 0, 10, 105, 52, 20))

# Finds handling and labelled storage.
add('artifact-bag', 'Finds collection bag', 'Small field bag with a folded opening, side gussets and a blank label patch.', '#a78b68',
    B('bag-body', 0, 0, 0, 190, 65, 225), B('folded-mouth', 0, 0, 225, 205, 80, 24), B('label-patch', 0, -35, 115, 105, 8, 58), B('left-gusset', -92, 0, 12, 18, 62, 160), B('right-gusset', 92, 0, 12, 18, 62, 160))
add('sample-tag-set', 'Field sample tags', 'Three punched sample tags with short ties and blank faces.', '#d2bb73',
    *[B(f'tag-{i}', x, y, 0, 122, 76, 14, 0, 0, angle) for i, (x, y, angle) in enumerate([(-120, 40, -10), (0, 0, 0), (120, -40, 10)])],
    *[R(f'tie-eye-{i}', x, y, 7, 18, 16, 6, 8) for i, (x, y) in enumerate([(-163, 40), (-43, 0), (77, -40)])], *[C(f'tie-{i}', x, y, 12, 90, 4, 6) for i, (x, y) in enumerate([(-163, 40), (-43, 0), (77, -40)])])
add('specimen-jar-rack', 'Specimen jar rack', 'Portable rack with four capped sample jars and a broad carrying base.', '#78918a',
    B('rack-base', 0, 0, 0, 380, 180, 28), *[C(f'jar-{i}', x, y, 28, 180, 36, 8) for i, (x, y) in enumerate([(-132, -45), (-44, -45), (44, -45), (132, -45)])],
    *[C(f'jar-cap-{i}', x, y, 200, 34, 41, 8) for i, (x, y) in enumerate([(-132, -45), (-44, -45), (44, -45), (132, -45)])], *[B(f'rack-rail-{i}', 0, y, 110, 390, 18, 22) for i, y in enumerate([-80, -5])])
add('finds-tray', 'Finds sorting tray', 'Shallow compartmented tray with a raised rim and four open cells.', '#9d906c',
    B('tray-floor', 0, 0, 0, 420, 300, 24), *[B(f'rim-{i}', x, y, 20, w, d, 54) for i, (x, y, w, d) in enumerate([(0, -140, 420, 20), (0, 140, 420, 20), (-200, 0, 20, 280), (200, 0, 20, 280)])],
    B('center-long', 0, 0, 28, 18, 265, 26), B('center-cross', 0, 0, 28, 390, 18, 26))


def number(value):
    if isinstance(value, int) or float(value).is_integer():
        return str(int(value))
    return f'{value:.6f}'.rstrip('0').rstrip('.')


def source_for(asset_id, title, description, color, parts):
    kinds = {part[0] for part in parts}
    base_z = min(low_z(part) for part in parts)
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original generic archaeology fieldwork scene prop, millimetres, Z up, base at z = 0.',
        '',
        'meta({',
        f'  name: {json.dumps(asset_id)},',
        "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(description + " Knobs: overall scale and asset color.")},',
        f'  tags: {json.dumps(["archaeology", "excavation", "fieldwork", title.lower(), "low poly", "scene prop", "CC0"])},',
        f"  kit: '{KIT_ID}',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['archaeology', 'excavation', 'fieldwork', 'outdoor', 'education', 'scene'],",
        '  triangleBudget: 2400,',
        '});',
        '',
        "const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(color)}, {{ label: 'Asset color' }});",
        f'const baseZ = {number(base_z)};',
        f'const p = assembly({json.dumps(asset_id)});',
    ]
    if 'box' in kinds:
        lines.extend([
            'const b = (x: number, y: number, z: number, w: number, d: number, h: number, rx = 0, ry = 0, rz = 0) => {',
            '  let part = box(w, d, h, true);',
            '  if (rx) part = part.rotateX(rx);',
            '  if (ry) part = part.rotateY(ry);',
            '  if (rz) part = part.rotateZ(rz);',
            '  return part.translate(x, y, z + h / 2 - baseZ).scale(scale).color(color);',
            '};',
        ])
    if 'cylinder' in kinds:
        lines.append('const c = (x: number, y: number, z: number, h: number, r: number, n = 10) => cylinder(h, r, n).translate(x, y, z - baseZ).scale(scale).color(color);')
    if 'horizontal-x' in kinds:
        lines.append('const hx = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([1, 0, 0]).translate(x - length / 2, y, z - baseZ).scale(scale).color(color);')
    if 'horizontal-y' in kinds:
        lines.append('const hy = (x: number, y: number, z: number, length: number, r: number, n = 10) => cylinder(length, r, n).alongAxis([0, 1, 0]).translate(x, y - length / 2, z - baseZ).scale(scale).color(color);')
    if 'ring' in kinds:
        lines.extend([
            "const ring = (x: number, y: number, z: number, h: number, r: number, wall: number, n = 12, axis = 'z') => {",
            '  let part = cylinder(h, r, n).subtract(cylinder(h + 2, r - wall, n).translate(0, 0, -1)).translate(0, 0, -h / 2);',
            "  if (axis === 'x') part = part.rotateY(90);",
            "  if (axis === 'y') part = part.rotateX(90);",
            '  return part.translate(x, y, z - baseZ).scale(scale).color(color);',
            '};',
        ])
    helpers = {'box': 'b', 'cylinder': 'c', 'horizontal-x': 'hx', 'horizontal-y': 'hy', 'ring': 'ring'}
    lines.append('')
    for part in parts:
        kind, name, *args = part
        if kind == 'box':
            x, y, z, w, d, h, rx, ry, rz = args
            call = f'b({number(x)}, {number(y)}, {number(z)}, {number(w)}, {number(d)}, {number(h)}, {number(rx)}, {number(ry)}, {number(rz)})'
        elif kind == 'cylinder':
            x, y, z, h, radius, segments = args
            call = f'c({number(x)}, {number(y)}, {number(z)}, {number(h)}, {number(radius)}, {number(segments)})'
        elif kind == 'horizontal-x':
            x, y, z, length, radius, segments = args
            call = f'hx({number(x)}, {number(y)}, {number(z)}, {number(length)}, {number(radius)}, {number(segments)})'
        elif kind == 'horizontal-y':
            x, y, z, length, radius, segments = args
            call = f'hy({number(x)}, {number(y)}, {number(z)}, {number(length)}, {number(radius)}, {number(segments)})'
        else:
            x, y, z, h, radius, wall, segments, axis = args
            call = f'ring({number(x)}, {number(y)}, {number(z)}, {number(h)}, {number(radius)}, {number(wall)}, {number(segments)}, {json.dumps(axis)})'
        lines.append(f'p.part({json.dumps(name)}, {call});')
    lines.extend(['', 'return p.model();', ''])
    return '\n'.join(lines)


ids = [asset[0] for asset in ASSETS]
if len(ids) != 50 or len(ids) != len(set(ids)):
    raise ValueError(f'expected exactly 50 distinct archaeology fieldwork assets, got {len(ids)}')
if any(not asset[4] for asset in ASSETS):
    raise ValueError('every asset must have visible geometry')
index_path = ROOT / 'catalog' / 'index.json'
if index_path.exists():
    existing_ids = {row['id']: row['kit'] for row in json.loads(index_path.read_text())['assets']}
    collisions = sorted(asset_id for asset_id in ids if asset_id in existing_ids and existing_ids[asset_id] != KIT_ID)
    if collisions:
        raise ValueError(f'asset ids already exist: {collisions}')

KIT.joinpath('kit.json').write_text(json.dumps({
    'title': 'Archaeology fieldwork',
    'description': 'Original low-poly excavation, survey, screening, documentation, and finds-handling props with editable size and color controls.',
}, indent=2) + '\n')
for asset_id, title, description, color, parts in ASSETS:
    (KIT / f'{asset_id}.kcad.ts').write_text(source_for(asset_id, title, description, color, parts))

settings = {
    'kit': KIT_ID,
    'generatedOn': '2026-11-03',
    'assetCount': len(ASSETS),
    'sourceCommand': 'python3 artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/generate_archaeology_assets.py',
    'catalogCommand': 'npx tsx scripts/buildAssetCatalog.ts',
    'previewCommand': 'npx tsx scripts/renderCatalogPreviews.ts',
    'knobs': {
        'scale': {'default': 1, 'min': 0.75, 'max': 1.25, 'step': 0.05},
        'color': 'asset-specific hex color; one material per asset',
    },
    'triangleBudget': 2400,
    'materialCount': 1,
    'grounding': 'An analytic minimum-Z offset is applied to all geometry before scale so each source rests at z = 0.',
    'verificationScope': {
        'covered': ['source and metadata', 'generated index and source hashes', 'mesh triangle and material audit', 'catalog integration suite', 'preview images and indexed paths', 'local generated catalog pages', 'current public homepage snapshot', 'npm tarball contents and export boundary', 'MP4 playback and frame inspection'],
        'notCovered': ['deployed behavior for this unmerged branch', 'archaeological method approval', 'instrument calibration', 'historical interpretation', 'physical acceptance'],
    },
    'assets': [{'id': asset[0], 'title': asset[1], 'partCount': len(asset[4]), 'groundOffsetMm': low_z(asset[4][0]) if len(asset[4]) == 1 else min(low_z(part) for part in asset[4])} for asset in ASSETS],
}
BUNDLE.mkdir(parents=True, exist_ok=True)
(BUNDLE / 'settings.json').write_text(json.dumps(settings, indent=2) + '\n')
print(f'generated {len(ASSETS)} assets in {KIT}')
