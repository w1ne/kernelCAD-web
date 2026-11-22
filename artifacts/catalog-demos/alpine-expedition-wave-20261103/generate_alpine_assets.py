#!/usr/bin/env python3
"""Generate original, generic low-poly alpine expedition scene props."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT_ID = 'alpine-expedition'
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


ASSETS = [
    ('basecamp-dome-tent', 'Basecamp dome tent', 'Large expedition shelter with a raised floor, paired sloping fly panels, vestibule and crossed poles.', '#a64f37', [
        B('groundsheet', 0, 0, 0, 1900, 2300, 50),
        B('inner-tent', 0, 0, 50, 1450, 1750, 680),
        B('left-fly-panel', -235, 0, 630, 620, 2240, 38, ry=-38),
        B('right-fly-panel', 235, 0, 630, 620, 2240, 38, ry=38),
        B('vestibule', 0, -1260, 80, 1050, 650, 35, ry=-8),
        C('crossed-pole-left', 0, 0, 60, 1120, 22, 8),
    ]),
    ('four-season-tent', 'Four-season mountain tent', 'Compact storm shelter with a low profile, reinforced fly, front entrance and corner stakes.', '#c05836', [
        B('tent-floor', 0, 0, 0, 1550, 1880, 45),
        B('inner-body', 0, 0, 45, 1210, 1530, 545),
        B('left-fly', -180, 0, 505, 500, 1820, 32, ry=-42),
        B('right-fly', 180, 0, 505, 500, 1820, 32, ry=42),
        B('door-flap', 0, -785, 160, 540, 42, 390),
        *[C(f'corner-stake-{i}', x, y, 0, 160, 16, 8) for i, (x, y) in enumerate([(-820, -930), (820, -930), (-820, 930), (820, 930)])],
    ]),
    ('mountaineering-bivy', 'Mountaineering bivy sack', 'Single-person storm bivy with a raised head hood, tapered foot end and short support arch.', '#65764c', [
        B('sleeping-bag-body', 0, 0, 0, 820, 2080, 260),
        B('head-hood', 0, -760, 175, 800, 620, 410, rx=-12),
        B('foot-panel', 0, 840, 85, 700, 420, 170),
        HY('hood-ridge', 0, -730, 470, 740, 18, 8),
        B('zipper-flap', 310, -50, 240, 36, 1000, 24),
    ]),
    ('expedition-tarp', 'Expedition tarp shelter', 'Ridgeline tarp with two adjustable support masts, broad roof panels and ground anchors.', '#78804f', [
        B('left-roof-panel', -350, 0, 1190, 940, 2400, 36, ry=-12),
        B('right-roof-panel', 350, 0, 1190, 940, 2400, 36, ry=12),
        C('support-mast-left', -740, 0, 0, 1210, 34, 8),
        C('support-mast-right', 740, 0, 0, 1210, 34, 8),
        HX('ridgeline', 0, 0, 1210, 1500, 20, 8),
        *[C(f'ground-anchor-{i}', x, y, 0, 210, 20, 8) for i, (x, y) in enumerate([(-900, -1040), (900, -1040), (-900, 1040), (900, 1040)])],
    ]),
    ('tent-footprint', 'Tent footprint sheet', 'Rectangular groundsheet with reinforced corners and low edge loops for a mountain tent.', '#666f68', [
        B('sheet', 0, 0, 0, 1700, 2200, 18),
        *[R(f'corner-loop-{i}', x, y, 12, 24, 42, 12, 8) for i, (x, y) in enumerate([(-760, -1010), (760, -1010), (-760, 1010), (760, 1010)])],
        B('center-seam', 0, 0, 19, 18, 2180, 8),
    ]),
    ('tent-pole-bundle', 'Tent pole bundle', 'Grouped segmented tent poles with end ferrules and a compact elastic keeper strap.', '#a7a7a0', [
        *[HX(f'pole-{i}', 0, -190 + i * 125, 90, 1450, 18, 8) for i in range(4)],
        B('keeper-strap-front', 0, -220, 45, 80, 470, 30),
        B('keeper-strap-rear', 0, 220, 45, 80, 470, 30),
        *[C(f'end-ferrule-{i}', x, y, 84, 56, 22, 8) for i, (x, y) in enumerate([(-720, -190), (720, -190), (-720, 185), (720, 185)])],
    ]),
    ('snow-wall-shovel', 'Snow wall shovel', 'Compact snow shovel with a broad blade, angled shaft and transverse hand grip.', '#b35a32', [
        B('shovel-blade', 0, -230, 0, 390, 95, 420, rx=-8),
        C('shaft', 0, 0, 400, 780, 24, 8),
        B('blade-rib', 0, -284, 80, 45, 26, 260),
        HX('grip', 0, 0, 1200, 260, 25, 8),
        C('grip-center', 0, 0, 1160, 80, 38, 8),
    ]),
    ('camp-cot', 'Backcountry camp cot', 'Portable sleeping cot with a fabric deck, folding end frames, feet and side rails.', '#68764e', [
        B('cot-deck', 0, 0, 310, 720, 1980, 48),
        HX('left-side-rail', 0, -325, 285, 2060, 22, 8),
        HX('right-side-rail', 0, 325, 285, 2060, 22, 8),
        *[B(f'leg-{i}', x, y, 0, 35, 35, 310, ry=angle) for i, (x, y, angle) in enumerate([(-810, -300, -14), (-810, 300, 14), (810, -300, 14), (810, 300, -14)])],
        *[HY(f'end-crossbar-{i}', x, 0, 275, 710, 16, 8) for i, x in enumerate([-810, 810])],
    ]),
    ('insulated-sleeping-pad', 'Insulated sleeping pad', 'Low-profile inflatable pad with raised side rails and repeated transverse baffles.', '#a64b36', [
        B('pad-body', 0, 0, 0, 820, 1980, 95),
        *[B(f'baffle-{i}', 0, -850 + i * 220, 92, 760, 34, 35) for i in range(8)],
        B('head-pillow-zone', 0, -820, 96, 770, 280, 26),
        C('inflation-valve', 330, 840, 72, 60, 38, 8),
    ]),
    ('expedition-duffel', 'Expedition duffel bag', 'Rugged haul duffel with end caps, top grab handles and paired carry straps.', '#596b54', [
        B('bag-body', 0, 0, 90, 1180, 540, 490),
        C('left-end-cap', -590, 0, 105, 460, 260, 10),
        C('right-end-cap', 590, 0, 105, 460, 260, 10),
        *[B(f'carry-handle-{i}', x, 0, 580, 70, 300, 220) for i, x in enumerate([-300, 300])],
        *[B(f'compression-strap-{i}', x, 0, 220, 34, 570, 370) for i, x in enumerate([-480, 480])],
    ]),
    ('alpine-pack-cover', 'Alpine pack cover', 'Draped rain cover for a tall expedition pack with a rolled hem and side tension straps.', '#cf6337', [
        B('cover-dome', 0, 0, 30, 650, 450, 780),
        B('front-apron', 0, -238, 70, 625, 28, 570, rx=-8),
        *[B(f'side-strap-{i}', x, 0, 180, 26, 500, 40) for i, x in enumerate([-325, 325])],
        B('hem-band', 0, 0, 40, 690, 490, 36),
        C('cord-lock', 0, -270, 72, 54, 28, 8),
    ]),
    ('alpine-dry-bag', 'Alpine dry bag', 'Waterproof roll-top dry bag with a tapered fabric body, folded closure and buckle tabs.', '#36818a', [
        C('bag-body', 0, 0, 0, 750, 250, 12),
        C('rolled-top', 0, 0, 740, 80, 270, 12),
        B('fold-over-closure', 0, 0, 800, 490, 140, 42),
        *[B(f'buckle-tab-{i}', x, 0, 755, 40, 110, 90) for i, x in enumerate([-245, 245])],
        HX('carry-handle', 0, 0, 840, 280, 18, 8),
    ]),
    ('trail-gaiters', 'Trail gaiters', 'Pair of ankle gaiters with front hooks, instep straps and upper closure tabs.', '#62714c', [
        *[B(f'gaiter-shell-{i}', x, 0, 0, 220, 320, 360) for i, x in enumerate([-170, 170])],
        *[B(f'instep-strap-{i}', x, 0, 10, 290, 40, 24) for i, x in enumerate([-170, 170])],
        *[C(f'front-hook-{i}', x, -168, 245, 70, 18, 8) for i, x in enumerate([-170, 170])],
        *[B(f'closure-tab-{i}', x, 0, 355, 80, 120, 40) for i, x in enumerate([-170, 170])],
    ]),
    ('glacier-goggles', 'Glacier goggles', 'Wraparound glacier eyewear with a wide shield frame, nose bridge and adjustable head strap.', '#4c6572', [
        R('left-lens-frame', -135, 0, 0, 48, 126, 30, 14, 'y'),
        R('right-lens-frame', 135, 0, 0, 48, 126, 30, 14, 'y'),
        B('nose-bridge', 0, 0, 0, 60, 92, 34),
        HX('head-strap', 0, 105, 0, 690, 22, 8),
        *[B(f'side-temple-{i}', x, 55, 0, 155, 42, 30) for i, x in enumerate([-245, 245])],
    ]),
    ('alpine-helmet', 'Alpine climbing helmet', 'Lightweight climbing helmet with a faceted shell, short brim, crown ribs and chin strap.', '#e2b735', [
        C('helmet-shell', 0, 0, 60, 190, 175, 12),
        B('front-brim', 0, -135, 60, 280, 110, 42),
        *[B(f'crown-rib-{i}', x, 0, 235, 28, 250, 28) for i, x in enumerate([-95, 0, 95])],
        *[B(f'chin-strap-{i}', x, 0, 0, 20, 210, 250) for i, x in enumerate([-100, 100])],
        HX('chin-buckle', 0, -90, 35, 90, 18, 8),
    ]),
    ('climbing-harness', 'Climbing harness', 'Sit harness with a padded waist belt, two leg loops, tie-in points and gear loops.', '#c15439', [
        B('waist-belt', 0, 0, 8, 520, 150, 48),
        *[R(f'leg-loop-{i}', x, 0, 28, 40, 168, 34, 12) for i, x in enumerate([-180, 180])],
        B('tie-in-bridge', 0, -112, 18, 125, 40, 45),
        *[C(f'gear-loop-{i}', x, 60, 32, 35, 28, 8) for i, x in enumerate([-205, 205])],
        *[B(f'adjuster-{i}', x, 0, 60, 64, 38, 32) for i, x in enumerate([-110, 110])],
    ]),
    ('climbing-rope-coil', 'Climbing rope coil', 'Compact stack of dynamic climbing rope loops with two loose ends and a keeper strap.', '#d2b34c', [
        *[R(f'rope-loop-{i}', 0, 0, 24 + i * 26, 30, 310 - i * 7, 30, 14) for i in range(5)],
        B('keeper-strap', 0, -300, 40, 80, 75, 125),
        C('rope-end-one', 0, -330, 0, 150, 16, 8),
        C('rope-end-two', 120, 280, 0, 175, 16, 8),
    ]),
    ('rope-haul-bag', 'Rope haul bag', 'Tall haul bag with a reinforced base, closure collar, shoulder straps and attachment loops.', '#5d6b58', [
        C('bag-body', 0, 0, 0, 860, 255, 12),
        C('closure-collar', 0, 0, 850, 130, 245, 12),
        B('top-flap', 0, 0, 965, 480, 420, 44),
        *[B(f'shoulder-strap-{i}', x, 145, 300, 54, 48, 610, rx=-8) for i, x in enumerate([-155, 155])],
        *[R(f'haul-loop-{i}', x, 0, 950, 35, 55, 18, 10) for i, x in enumerate([-160, 160])],
    ]),
    ('locking-carabiner', 'Locking carabiner', 'Oval locking carabiner with a thick spine, gate bar and threaded sleeve.', '#7c8588', [
        R('carabiner-frame', 0, 0, 150, 48, 150, 38, 14, 'y'),
        B('gate-bar', 0, -30, 150, 34, 180, 30, ry=18),
        C('locking-sleeve', 0, -25, 245, 90, 42, 10),
        B('spine-reinforcement', -115, 0, 150, 36, 64, 180),
    ]),
    ('climbing-quickdraw', 'Climbing quickdraw', 'Quickdraw sling with two opposed carabiners and a stitched center webbing strap.', '#d3ac45', [
        R('upper-carabiner', 0, 0, 340, 42, 112, 28, 12, 'y'),
        R('lower-carabiner', 0, 0, 65, 42, 112, 28, 12, 'y'),
        B('webbing-sling', 0, 0, 195, 55, 34, 240),
        B('upper-gate', 75, -25, 360, 25, 155, 25, ry=16),
        B('lower-gate', -75, 25, 42, 25, 155, 25, ry=-16),
    ]),
    ('belay-device', 'Belay device', 'Tube-style belay device with twin rope slots, guide ears and a central attachment eye.', '#858c8c', [
        B('device-body', 0, 0, 0, 250, 190, 70),
        *[R(f'rope-slot-rim-{i}', x, 0, 0, 74, 63, 22, 10) for i, x in enumerate([-72, 72])],
        R('attachment-eye', 0, 0, 145, 34, 58, 18, 10, 'y'),
        B('guide-ear-left', -132, 0, 22, 32, 175, 84),
        B('guide-ear-right', 132, 0, 22, 32, 175, 84),
    ]),
    ('climbing-chalk-bag', 'Climbing chalk bag', 'Waist-mounted chalk pouch with a wide rim, drawcord collar and belt loop.', '#63704d', [
        C('pouch-body', 0, 0, 0, 300, 155, 12),
        C('rolled-rim', 0, 0, 290, 45, 170, 12),
        B('drawcord-tab', 140, 0, 170, 40, 45, 55),
        B('belt-loop', 0, 130, 240, 170, 38, 80),
        B('front-pocket', 0, -145, 65, 175, 30, 100),
    ]),
    ('climbing-cam', 'Spring-loaded climbing cam', 'Four-lobe protection device with a center axle, trigger bar, stem and attachment sling.', '#b35c39', [
        *[C(f'cam-lobe-{i}', x, 0, 0, 42, 86, 10) for i, x in enumerate([-110, -36, 36, 110])],
        HX('axle', 0, 0, 26, 310, 24, 10),
        B('stem', 0, 0, 20, 48, 48, 340, ry=-8),
        HX('trigger-bar', 0, -82, 170, 220, 18, 8),
        R('attachment-loop', 0, 0, 390, 38, 62, 20, 10, 'y'),
    ]),
    ('nut-tool', 'Climbing nut tool', 'Long tapered nut-removal pick with a finger opening, grip scales and a narrow hook tip.', '#858b85', [
        B('tool-shaft', 0, 0, 0, 70, 70, 470, ry=-5),
        B('hook-tip', 0, 0, 435, 210, 55, 34, ry=16),
        R('finger-loop', 0, 0, 560, 32, 76, 20, 10, 'y'),
        *[B(f'grip-scale-{i}', x, -42, 90, 40, 20, 220) for i, x in enumerate([-38, 38])],
    ]),
    ('ice-axe', 'Mountaineering ice axe', 'Classic alpine axe with a long shaft, curved pick, adze and pointed lower spike.', '#727b7b', [
        C('shaft', 0, 0, 0, 820, 26, 8),
        HX('pick', 0, 0, 790, 390, 32, 8),
        B('pick-tip', -195, 0, 765, 95, 42, 82, ry=-20),
        B('adze', 200, 0, 750, 175, 170, 42),
        C('lower-spike', 0, 0, 0, 180, 32, 8),
        B('leash-strap', 0, 70, 310, 40, 30, 240),
    ]),
    ('ice-screw', 'Ice screw', 'Tubular ice screw with a threaded body, hanger eye and folding crank handle.', '#89918e', [
        C('screw-tube', 0, 0, 0, 240, 34, 10),
        C('cutting-tip', 0, 0, 0, 80, 42, 10),
        R('hanger-eye', 0, 0, 300, 34, 67, 20, 10, 'y'),
        HX('folding-crank', 0, 0, 320, 210, 22, 8),
        *[B(f'thread-rib-{i}', 0, 0, 30 + i * 25, 80, 80, 12, ry=10) for i in range(6)],
    ]),
    ('glacier-picket', 'Glacier snow picket', 'Long snow picket with a tapered tip, attachment holes and a top sling eye.', '#7c8785', [
        B('picket-web', 0, 0, 0, 90, 36, 720, ry=-2),
        B('reinforced-head', 0, 0, 685, 145, 50, 70),
        *[R(f'attachment-hole-rim-{i}', 0, 0, 120 + i * 115, 18, 27, 10, 8, 'y') for i in range(4)],
        R('top-eye', 0, 0, 820, 25, 56, 16, 8, 'y'),
        B('lower-tip', 0, 0, 0, 50, 36, 140, ry=-5),
    ]),
    ('snowshoes', 'Alpine snowshoes', 'Pair of framed snowshoes with bindings, crossbars and raised toe loops.', '#7f8a84', [
        *[R(f'shoe-frame-{i}', x, 0, 14, 36, 205, 22, 12) for i, x in enumerate([-230, 230])],
        *[B(f'deck-binding-{i}', x, 0, 28, 148, 360, 30) for i, x in enumerate([-230, 230])],
        *[HY(f'crossbar-{i}', x, 0, 23, 340, 14, 8) for i, x in enumerate([-230, 230])],
        *[R(f'toe-loop-{i}', x, -135, 55, 24, 92, 16, 10, 'y') for i, x in enumerate([-230, 230])],
    ]),
    ('crampons', 'Mountaineering crampons', 'Pair of boot crampons with broad foot plates, binding bars and forward-facing points.', '#828987', [
        *[B(f'foot-plate-{i}', x, 0, 28, 150, 330, 28) for i, x in enumerate([-190, 190])],
        *[B(f'front-point-{i}', x, -210, 15, 36, 150, 38, ry=-15) for i, x in enumerate([-280, -190, -100, 100, 190, 280])],
        *[B(f'rear-point-{i}', x, 210, 15, 34, 120, 34, ry=14) for i, x in enumerate([-250, -130, 130, 250])],
        *[HY(f'binding-bar-{i}', x, 0, 54, 360, 14, 8) for i, x in enumerate([-190, 190])],
    ]),
    ('ski-touring-skins', 'Ski touring skins', 'Pair of climbing skins with tapered tails, tip loops and adjustable tail clips.', '#596d58', [
        *[B(f'skin-strip-{i}', x, 0, 0, 120, 1650, 24) for i, x in enumerate([-105, 105])],
        *[R(f'tip-loop-{i}', x, -840, 12, 24, 56, 14, 10, 'y') for i, x in enumerate([-105, 105])],
        *[B(f'tail-clip-{i}', x, 825, 0, 150, 110, 44) for i, x in enumerate([-105, 105])],
        *[B(f'backing-tab-{i}', x, 0, 28, 46, 900, 18) for i, x in enumerate([-105, 105])],
    ]),
    ('avalanche-probe', 'Avalanche probe', 'Collapsible avalanche probe with joined tube segments, a grip cap and tapered tip.', '#d45736', [
        C('probe-shaft', 0, 0, 0, 1750, 20, 8),
        C('handle-cap', 0, 0, 1730, 90, 34, 8),
        C('probe-tip', 0, 0, 0, 150, 30, 8),
        *[B(f'segment-collar-{i}', 0, 0, 250 + i * 235, 42, 42, 22) for i in range(6)],
        B('depth-mark-band', 0, 0, 960, 32, 32, 24),
    ]),
    ('avalanche-shovel', 'Avalanche shovel', 'Collapsible avalanche shovel with a deep blade, reinforced socket and T-grip handle.', '#d66336', [
        B('shovel-blade', 0, -170, 0, 390, 80, 360, rx=-8),
        B('blade-side-left', -190, -165, 155, 32, 90, 270),
        B('blade-side-right', 190, -165, 155, 32, 90, 270),
        C('shaft', 0, 0, 315, 660, 24, 8),
        B('socket', 0, 0, 275, 94, 80, 110),
        HX('t-grip', 0, 0, 1010, 250, 28, 8),
    ]),
    ('avalanche-transceiver', 'Avalanche transceiver', 'Handheld avalanche beacon with a sloped display face, toggle control and carry clip.', '#e0ad34', [
        B('beacon-body', 0, 0, 0, 170, 310, 58),
        B('display-panel', 0, -165, 20, 120, 24, 78),
        *[C(f'control-{i}', x, -190, 15, 28, 18, 8) for i, x in enumerate([-52, 0, 52])],
        B('belt-clip', 0, 145, 35, 130, 28, 90),
        C('speaker-grille', 0, -165, 4, 25, 46, 8),
    ]),
    ('snow-anchor', 'Snow deadman anchor', 'Buried deadman anchor plate with a central cable eye and raised orientation rib.', '#82908b', [
        B('anchor-plate', 0, 0, 0, 380, 230, 32, ry=-8),
        B('center-rib', 0, 0, 28, 40, 210, 48),
        R('cable-eye', 0, -150, 60, 28, 66, 18, 10, 'y'),
        HX('anchor-cable', 0, -160, 60, 280, 13, 8),
        *[B(f'edge-lip-{i}', x, 0, 22, 30, 230, 34) for i, x in enumerate([-175, 175])],
    ]),
    ('snow-saw', 'Snow pit saw', 'Long snow saw blade with a tooth row, stiffening spine and molded grip handle.', '#767e7c', [
        B('saw-blade', 0, 0, 0, 920, 36, 18),
        *[B(f'saw-tooth-{i}', -430 + i * 44, 0, -12, 25, 42, 22, ry=24) for i in range(20)],
        B('blade-spine', 0, 0, 24, 920, 22, 26),
        B('handle', 510, 0, 0, 230, 78, 80),
        R('handle-loop', 610, 0, 40, 25, 56, 16, 10, 'y'),
    ]),
    ('rescue-pulley', 'Alpine rescue pulley', 'Compact rescue pulley with a side plate, large sheave, axle pin and rope attachment eye.', '#c45938', [
        R('sheave', 0, 0, 85, 48, 145, 28, 14, 'y'),
        B('side-plate-front', 0, -55, 55, 295, 34, 205),
        B('side-plate-rear', 0, 55, 55, 295, 34, 205),
        C('axle-pin', 0, -80, 58, 70, 42, 10),
        R('attachment-eye-top', 0, 0, 235, 32, 62, 18, 10, 'y'),
        R('attachment-eye-bottom', 0, 0, 0, 28, 56, 16, 10, 'y'),
    ]),
    ('alpine-rescue-stretcher', 'Alpine rescue stretcher', 'Basket stretcher with a deep bed, perimeter rails, cross straps and carry handles.', '#d0a641', [
        B('stretcher-bed', 0, 0, 95, 620, 2080, 115),
        *[HX(f'perimeter-rail-{i}', 0, y, 150, 2240, 24, 8) for i, y in enumerate([-300, 300])],
        *[HY(f'cross-strap-{i}', x, 0, 164, 580, 14, 8) for i, x in enumerate([-780, -260, 260, 780])],
        *[HX(f'carry-handle-{i}', x, 0, 95, 280, 28, 8) for i, x in enumerate([-410, 410])],
        *[B(f'end-wall-{i}', x, 0, 150, 42, 620, 180) for i, x in enumerate([-1070, 1070])],
    ]),
    ('rescue-bivy', 'Emergency rescue bivy', 'Bright emergency bivy sack with a sealed foot, raised head hood and reflective-look side bands.', '#d34d36', [
        B('bivy-shell', 0, 0, 0, 900, 2100, 280),
        B('hood', 0, -780, 170, 880, 560, 400, rx=-10),
        B('foot-seal', 0, 930, 70, 780, 240, 120),
        *[B(f'side-band-{i}', x, 0, 275, 26, 1600, 28) for i, x in enumerate([-430, 430])],
        B('entry-flap', 0, -930, 210, 500, 36, 240),
    ]),
    ('expedition-radio', 'Expedition field radio', 'Rugged handheld VHF-style field radio with antenna, channel knob, speaker and push-to-talk key.', '#657353', [
        B('radio-body', 0, 0, 0, 170, 105, 360),
        B('front-face', 0, -58, 30, 145, 18, 290),
        C('antenna', 56, 18, 340, 310, 12, 8),
        C('channel-knob', -46, -82, 325, 58, 25, 8),
        B('speaker-grid', 0, -78, 220, 105, 22, 92),
        B('push-to-talk', 94, 0, 210, 30, 32, 122),
    ]),
    ('handheld-gps', 'Handheld GPS receiver', 'Outdoor GPS receiver with a raised screen, directional keypad, side keys and top antenna.', '#c35b36', [
        B('receiver-body', 0, 0, 0, 190, 115, 360),
        B('screen-bezel', 0, -64, 170, 150, 22, 125),
        B('screen', 0, -80, 175, 112, 12, 82),
        *[C(f'key-{i}', x, -83, 55, 28, 15, 8) for i, x in enumerate([-48, 0, 48])],
        C('top-antenna', 0, 25, 345, 190, 18, 8),
        *[B(f'side-key-{i}', x, 0, 150, 25, 68, 42) for i, x in enumerate([-105, 105])],
    ]),
    ('satellite-messenger', 'Satellite messenger', 'Compact satellite messenger with a textured face, status screen, call button and lanyard loop.', '#e0b23a', [
        B('messenger-body', 0, 0, 0, 150, 250, 48),
        B('status-window', 0, -129, 19, 96, 20, 84),
        C('check-in-button', -42, -151, 15, 24, 19, 8),
        C('sos-button', 42, -151, 15, 24, 19, 8),
        R('lanyard-eye', 0, 0, 0, 30, 58, 18, 10, 'y'),
        B('antenna-panel', 0, 116, 25, 100, 18, 38),
    ]),
    ('expedition-headlamp', 'Expedition headlamp', 'Wide-beam headlamp with an adjustable elastic band, central lamp housing and side buckles.', '#d4ad3e', [
        B('lamp-housing', 0, -70, 0, 210, 100, 115),
        C('lamp-lens', 0, -126, 25, 80, 56, 10),
        *[B(f'headband-{i}', x, 0, 32, 710, 34, 58) for i, x in enumerate([-285, 285])],
        *[B(f'band-buckle-{i}', x, 0, 32, 52, 84, 72) for i, x in enumerate([-205, 205])],
        B('top-adjuster', 0, 0, 70, 130, 38, 28),
    ]),
    ('expedition-solar-panel', 'Folding expedition solar panel', 'Portable two-leaf solar charger with a hinge spine, raised kickstand and panel grid.', '#536d78', [
        *[B(f'panel-leaf-{i}', x, 0, 0, 520, 700, 38) for i, x in enumerate([-270, 270])],
        B('hinge-spine', 0, 0, 15, 40, 720, 48),
        *[B(f'cell-row-{i}', 0, -275 + i * 180, 40, 1010, 18, 10) for i in range(4)],
        *[B(f'cell-column-{i}', -390 + i * 260, 0, 40, 18, 660, 10) for i in range(4)],
        B('kickstand', 0, 280, 0, 830, 40, 350, ry=18),
    ]),
    ('expedition-power-bank', 'Expedition power bank', 'Weather-resistant battery bank with a raised port panel, corner guards and tether eye.', '#4f6470', [
        B('battery-case', 0, 0, 0, 360, 210, 100),
        B('port-panel', 0, -112, 32, 240, 18, 48),
        *[C(f'port-{i}', x, -132, 45, 20, 15, 8) for i, x in enumerate([-75, 0, 75])],
        *[B(f'corner-guard-{i}', x, y, 10, 55, 48, 120) for i, (x, y) in enumerate([(-152, -80), (152, -80), (-152, 80), (152, 80)])],
        R('tether-eye', 0, 115, 50, 24, 46, 14, 8),
    ]),
    ('expedition-water-filter', 'Expedition squeeze water filter', 'Inline squeeze filter with a bottle-thread cap, protective end collars and short hose connector.', '#566f62', [
        C('filter-body', 0, 0, 0, 270, 72, 12),
        C('top-cap', 0, 0, 270, 75, 82, 12),
        C('bottom-cap', 0, 0, 0, 45, 84, 12),
        HY('hose-connector', 0, 85, 305, 150, 24, 8),
        B('flow-arrow-panel', 0, -74, 140, 100, 16, 38),
    ]),
    ('hydration-reservoir', 'Hydration reservoir', 'Flat hydration bladder with a wide fill cap, hose port, drinking tube and bite valve.', '#4f7e87', [
        B('bladder-body', 0, 0, 0, 420, 660, 84),
        B('top-seam', 0, 0, 84, 430, 38, 22),
        C('fill-cap', 0, -340, 60, 65, 72, 10),
        HX('drink-tube', 0, 345, 35, 650, 16, 8),
        C('bite-valve', 320, 345, 15, 85, 24, 8),
        B('hose-clip', 0, 285, 72, 95, 36, 28),
    ]),
    ('insulated-flask', 'Insulated mountain flask', 'Double-wall flask with a shoulder, screw cap, protective base and carry loop.', '#7a8582', [
        C('flask-body', 0, 0, 0, 360, 92, 12),
        C('neck', 0, 0, 355, 75, 58, 10),
        C('screw-cap', 0, 0, 420, 84, 68, 10),
        C('base-guard', 0, 0, 0, 48, 98, 10),
        R('carry-loop', 95, 0, 450, 28, 48, 14, 8, 'y'),
    ]),
    ('bear-canister', 'Bear-resistant food canister', 'Wide screw-top food canister with a ribbed body, locking lid and side hand grips.', '#cfbf58', [
        C('canister-body', 0, 0, 0, 380, 190, 12),
        C('locking-lid', 0, 0, 370, 80, 205, 12),
        *[B(f'rib-{i}', 0, 0, 65 + i * 70, 396, 28, 22) for i in range(4)],
        *[B(f'hand-grip-{i}', x, 0, 205, 55, 80, 76) for i, x in enumerate([-180, 180])],
        B('lid-tab', 0, -190, 410, 82, 32, 38),
    ]),
    ('summit-marker-post', 'Summit marker post', 'Trail summit marker with a broad base, upright post, direction plaque and small cap.', '#b95237', [
        B('base-plate', 0, 0, 0, 440, 360, 64),
        C('marker-post', 0, 0, 64, 1240, 38, 8),
        B('direction-plaque', 0, -35, 970, 530, 60, 220),
        B('arrow-board', 0, -75, 1010, 230, 26, 70),
        C('post-cap', 0, 0, 1304, 48, 48, 8),
    ]),
    ('mountain-weather-meter', 'Mountain weather meter', 'Portable wind and weather meter with a compact base, mast, wind cups and direction vane.', '#75827a', [
        B('base-foot', 0, 0, 0, 250, 250, 48),
        C('mast', 0, 0, 48, 780, 28, 8),
        C('sensor-hub', 0, 0, 810, 70, 66, 8),
        *[C(f'wind-arm-{i}', x, y, 830, 36, 16, 8) for i, (x, y) in enumerate([(130, 0), (-65, 112), (-65, -112)])],
        *[C(f'wind-cup-{i}', x, y, 800, 90, 34, 8) for i, (x, y) in enumerate([(180, 0), (-90, 156), (-90, -156)])],
        HX('direction-vane', 0, 0, 890, 310, 24, 8),
        B('vane-fin', 130, 0, 840, 30, 24, 110),
    ]),
]


def number(value):
    return repr(value)


def source_for(asset_id, title, description, color, parts):
    kinds = {part[0] for part in parts}
    base_z = min(low_z(part) for part in parts)
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original generic alpine expedition scene prop, millimetres, Z up, base at z = 0.',
        '',
        'meta({',
        f'  name: {json.dumps(asset_id)},',
        "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(description + " Knobs: overall scale and asset color.")},',
        f'  tags: {json.dumps(["alpine expedition", "mountaineering", title.lower(), "low poly", "scene prop", "CC0"])},',
        f"  kit: '{KIT_ID}',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['alpine', 'mountaineering', 'outdoor', 'expedition', 'scene'],",
        '  triangleBudget: 2400,',
        '});',
        '',
        "const scale = param('scale', 1, { min: 0.75, max: 1.25, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(color)}, {{ label: 'Asset color' }});",
        f'const baseZ = {repr(base_z)};',
        'const p = assembly(' + json.dumps(asset_id) + ');',
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
    lines.append('')
    helpers = {'box': 'b', 'cylinder': 'c', 'horizontal-x': 'hx', 'horizontal-y': 'hy', 'ring': 'ring'}
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
    raise ValueError('expected exactly 50 distinct alpine expedition assets')
if any(not asset[4] for asset in ASSETS):
    raise ValueError('every alpine expedition asset must have visible geometry')
index_path = ROOT / 'catalog' / 'index.json'
if index_path.exists():
    existing_ids = {row['id']: row['kit'] for row in json.loads(index_path.read_text())['assets']}
    collisions = sorted(asset_id for asset_id in ids if asset_id in existing_ids and existing_ids[asset_id] != KIT_ID)
    if collisions:
        raise ValueError(f'asset ids already exist: {collisions}')

KIT.joinpath('kit.json').write_text(json.dumps({
    'title': 'Alpine expedition',
    'description': 'Original low-poly mountaineering, climbing, snow safety, expedition shelter, navigation, and backcountry support props with editable size and color controls.',
}, indent=2) + '\n')
for asset_id, title, description, color, parts in ASSETS:
    (KIT / f'{asset_id}.kcad.ts').write_text(source_for(asset_id, title, description, color, parts))

settings = {
    'kit': KIT_ID,
    'generatedOn': '2026-11-03',
    'assetCount': len(ASSETS),
    'sourceCommand': 'python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/generate_alpine_assets.py',
    'catalogCommand': 'npx tsx scripts/buildAssetCatalog.ts',
    'previewCommand': 'npx tsx scripts/renderCatalogPreviews.ts',
    'knobs': {
        'scale': {'default': 1, 'min': 0.75, 'max': 1.25, 'step': 0.05},
        'color': 'asset-specific hex color; one material per asset',
    },
    'triangleBudget': 2400,
    'materialCount': 1,
    'grounding': 'A measured analytic minimum-Z offset is applied to all geometry before scale so each source rests at z = 0.',
    'verificationScope': {
        'covered': ['source and metadata', 'generated index and source hashes', 'mesh triangle and material audit', 'catalog integration suite', 'preview images and indexed paths', 'local generated catalog pages', 'current public homepage snapshot', 'npm tarball contents and export boundary'],
        'notCovered': ['deployed behavior for this unmerged branch', 'climbing or rescue safety', 'load rating or product performance', 'weather protection', 'regulatory compliance', 'physical acceptance'],
    },
    'assets': [{'id': asset[0], 'title': asset[1], 'partCount': len(asset[4]), 'groundOffsetMm': min(low_z(part) for part in asset[4])} for asset in ASSETS],
}
BUNDLE.mkdir(parents=True, exist_ok=True)
(BUNDLE / 'settings.json').write_text(json.dumps(settings, indent=2) + '\n')
print(f'generated {len(ASSETS)} assets in {KIT}')
