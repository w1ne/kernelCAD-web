#!/usr/bin/env python3
"""Generate 50 original parametric beverage-bottling scene assets."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT_ID = 'beverage-bottling-line'
KIT = ROOT / 'catalog' / 'kits' / KIT_ID
BODY = '#a6b3b4'
ACCENT = '#e3a23d'


def B(name, x, y, z, width, depth, height, zone='body'):
    return ('box', name, x, y, z, width, depth, height, zone)


def C(name, x, y, z, height, radius, segments=10, zone='body'):
    return ('cylinder', name, x, y, z, height, radius, segments, zone)


def CX(name, x, y, z, length, radius, segments=10, zone='body'):
    return ('x-cylinder', name, x, y, z, length, radius, segments, zone)


ASSETS = [
    ('preform-bulk-bin', 'PET preform bulk bin', 'Ventilated bulk hopper for empty PET preforms with a steep throat and inspection lid.', 'structure', [
        B('foot-left', -300, -250, 0, 90, 90, 100, 'accent'), B('foot-right', 300, -250, 0, 90, 90, 100, 'accent'),
        B('foot-back-left', -300, 250, 0, 90, 90, 100, 'accent'), B('foot-back-right', 300, 250, 0, 90, 90, 100, 'accent'),
        B('hopper-body', 0, 0, 100, 720, 620, 500), B('sloped-throat', 0, 0, 0, 390, 330, 100),
        B('inspection-lid', 0, 0, 610, 760, 660, 55, 'accent'), B('outlet-collar', 0, 0, 0, 170, 150, 150),
    ]),
    ('preform-elevator', 'Preform elevator', 'Enclosed cleated elevator that lifts preforms to an overhead unscrambler feed.', 'structure', [
        B('base-frame', 0, 0, 0, 500, 620, 45, 'accent'), B('lower-guard', 0, 0, 65, 310, 440, 500),
        B('inclined-elevator-cover', 70, 0, 420, 330, 400, 850), B('upper-discharge', 70, 0, 1070, 370, 440, 180),
        B('side-rail-a', -125, 0, 80, 55, 520, 950, 'accent'), B('side-rail-b', 265, 0, 80, 55, 520, 950, 'accent'),
        C('drive-motor', -200, 0, 80, 180, 105, 12), C('upper-pulley', 70, 0, 970, 100, 88, 12, 'accent'),
        *[B(f'cleat-{i}', 70, -170 + i * 85, 130 + i * 150, 255, 48, 40, 'accent') for i in range(5)],
    ]),
    ('preform-orienter-bowl', 'Preform orienter bowl', 'Vibratory bowl with a spiral rim track, central cone, and single-file discharge rail.', 'structure', [
        C('bowl-skirt', 0, 0, 0, 170, 390, 14), C('bowl-rim', 0, 0, 145, 70, 420, 14, 'accent'),
        C('central-cone', 0, 0, 165, 220, 210, 10), C('vibrator-base', 0, 0, 0, 70, 260, 12),
        B('discharge-track', 470, 0, 175, 440, 110, 55, 'accent'), B('track-side-a', 470, -65, 205, 440, 18, 75),
        B('track-side-b', 470, 65, 205, 440, 18, 75), B('motor-box', -210, 0, 60, 190, 180, 170),
    ]),
    ('pet-blow-molder', 'PET stretch blow molder', 'Guarded stretch-blow station with preform heating bays and paired bottle mold nests.', 'structure', [
        B('base', 0, 0, 0, 1350, 720, 50, 'accent'), B('machine-body', 0, 0, 540, 1150, 620, 970),
        B('service-door-left', -370, -325, 520, 380, 28, 780, 'accent'), B('service-door-right', 50, -325, 520, 380, 28, 780, 'accent'),
        B('heating-tunnel', 450, 80, 610, 300, 380, 600), B('control-pedestal', 750, -250, 390, 180, 140, 680, 'accent'),
        *[C(f'mold-column-{i}', -370 + i * 185, 0, 70, 800, 34, 8, 'accent') for i in range(5)],
        *[B(f'mold-station-{i}', -370 + i * 185, 270, 180, 105, 125, 350) for i in range(5)],
        B('top-crossbeam', 0, 0, 1050, 1260, 80, 65, 'accent'),
    ]),
    ('neck-handling-air-conveyor', 'Bottle neck-handling air conveyor', 'Raised guide track and four support columns carry bottles by their neck rings over a clear floor path.', 'structure', [
        B('top-spine', 0, 0, 1230, 1700, 120, 70, 'accent'),
        *[B(f'support-column-{i}', -650 + i * 430, 0, 0, 55, 55, 1230) for i in range(4)],
        B('neck-guide-front', 0, -130, 1040, 1650, 25, 70), B('neck-guide-back', 0, 130, 1040, 1650, 25, 70),
        B('air-rail', 0, 0, 990, 1650, 90, 28, 'accent'),
        *[C(f'guide-spacer-{i}', -600 + i * 240, 0, 1010, 45, 26, 8) for i in range(6)],
    ]),
    ('bottle-infeed-conveyor', 'Bottle infeed conveyor', 'Narrow belt with adjustable guides and a dead-plate transfer into the rinser.', 'structure', [
        B('belt', 0, 0, 700, 1500, 230, 50, 'accent'), B('side-frame-front', 0, -145, 660, 1500, 40, 80),
        B('side-frame-back', 0, 145, 660, 1500, 40, 80), B('guide-front', 0, -80, 760, 1500, 18, 52),
        B('guide-back', 0, 80, 760, 1500, 18, 52),
        *[B(f'leg-{i}', -570 + i * 380, 0, 0, 55, 55, 650) for i in range(4)],
        *[CX(f'drive-roller-{i}', -670 + i * 1340, 0, 700, 40, 37, 10, 'accent') for i in range(2)],
        B('transfer-plate', 790, 0, 700, 90, 340, 35),
    ]),
    ('bottle-unscrambler', 'Bottle unscrambler', 'Rotary bowl and discharge starwheel orient empty bottles before the line infeed.', 'structure', [
        C('support-base', 0, 0, 0, 120, 460, 12), C('turntable', 0, 0, 120, 95, 420, 16, 'accent'),
        C('outer-rim', 0, 0, 195, 115, 470, 16), C('center-column', 0, 0, 200, 650, 85, 10),
        B('discharge-lane', 520, 0, 250, 530, 150, 55, 'accent'), B('lane-guide-a', 520, -88, 265, 530, 18, 95),
        B('lane-guide-b', 520, 88, 265, 530, 18, 95), C('drive-motor', -280, 0, 35, 235, 105, 12),
        *[B(f'bowl-cleat-{i}', -130 + i * 52, 0, 220, 25, 300, 50) for i in range(6)],
    ]),
    ('bottle-rinser-carousel', 'Bottle rinser carousel', 'Rotary bottle rinser with an infeed starwheel, spray turret, and catch basin.', 'structure', [
        C('catch-basin', 0, 0, 0, 130, 480, 14), C('rotary-table', 0, 0, 130, 90, 370, 16, 'accent'),
        C('rinse-turret', 0, 0, 220, 690, 130, 12), C('top-drive', 0, 0, 910, 140, 180, 12),
        B('infeed-lane', -500, 0, 255, 420, 150, 45, 'accent'), B('outfeed-lane', 500, 0, 255, 420, 150, 45, 'accent'),
        *[C(f'rinse-nozzle-{i}', -330 + i * 110, -220, 570, 135, 22, 8, 'accent') for i in range(7)],
        *[B(f'support-{i}', -300 + i * 200, 0, 0, 55, 55, 430) for i in range(4)],
        B('spray-guard', 0, 0, 580, 900, 640, 48),
    ]),
    ('air-rinse-enclosure', 'Air rinse enclosure', 'Compact enclosure around an ionized-air bottle rinse with access doors and extraction hood.', 'structure', [
        B('base-tray', 0, 0, 0, 1250, 780, 60, 'accent'), B('left-panel', -540, 0, 60, 90, 720, 760),
        B('right-panel', 540, 0, 60, 90, 720, 760), B('rear-panel', 0, 330, 60, 1020, 80, 760),
        B('roof', 0, 0, 820, 1180, 780, 70), B('front-door-left', -280, -350, 80, 450, 35, 680, 'accent'),
        B('front-door-right', 280, -350, 80, 450, 35, 680, 'accent'),
        *[C(f'air-jet-{i}', -390 + i * 130, 0, 500, 180, 28, 8) for i in range(7)],
        C('exhaust-stack', 0, 260, 870, 210, 110, 10, 'accent'),
    ]),
    ('rinse-water-recovery-tank', 'Rinse-water recovery tank', 'Small recovery tank with screened inlet, pump stand, level column, and return nozzle.', 'prop', [
        C('tank-shell', 0, 0, 30, 620, 285, 12), C('cover', 0, 0, 650, 65, 310, 12, 'accent'),
        C('inlet-screen', -330, 0, 370, 150, 70, 10), C('return-nozzle', 0, 330, 520, 170, 45, 10),
        C('pump', 250, -220, 25, 160, 92, 10), B('pump-motor', 250, -220, 185, 190, 160, 130),
        B('support-a', -170, 0, 0, 60, 60, 30, 'accent'), B('support-b', 170, 0, 0, 60, 60, 30, 'accent'),
        B('level-column', -210, -310, 130, 42, 28, 410, 'accent'),
    ]),
    ('rotary-filler', 'Rotary bottle filler', 'Filling carousel with a covered product bowl, dosing valves, guard skirt, and discharge deck.', 'structure', [
        C('base-skirt', 0, 0, 0, 180, 530, 16, 'accent'), C('filler-table', 0, 0, 180, 140, 430, 16),
        C('product-bowl', 0, 0, 320, 210, 300, 14), C('top-cover', 0, 0, 530, 75, 340, 14, 'accent'),
        C('center-drive', 0, 0, 605, 410, 95, 12), B('infeed-deck', -550, 0, 250, 380, 220, 55),
        B('outfeed-deck', 550, 0, 250, 380, 220, 55), B('operator-rail', 0, -580, 250, 1040, 42, 45, 'accent'),
        *[C(f'fill-valve-{i}', 360 * math.cos(i * 3.14159 / 6), 360 * math.sin(i * 3.14159 / 6), 450, 230, 27, 8) for i in range(12)],
        *[B(f'leg-{i}', -350 + i * 230, 0, 0, 55, 55, 250) for i in range(4)],
    ]),
    ('filler-valve-head', 'Filler valve head', 'Single sanitary fill valve with spring bonnet, bottle centering bell, and product inlet port.', 'prop', [
        C('valve-body', 0, 0, 190, 270, 85, 12), C('bonnet', 0, 0, 460, 120, 65, 10, 'accent'),
        C('stem', 0, 0, 90, 110, 26, 8), C('centering-bell', 0, 0, 0, 80, 155, 12),
        C('product-port', 0, -95, 330, 145, 36, 10), B('mounting-tab', 0, 0, 565, 145, 145, 38, 'accent'),
        *[B(f'clamp-ear-{i}', x, 0, 420, 30, 45, 70) for i, x in enumerate((-92, 92))],
    ]),
    ('fill-level-inspection-lamp', 'Fill-level inspection lamp', 'Backlit inspection panel and bottle guide rails for a manual fill-level check.', 'prop', [
        B('base', 0, 0, 0, 550, 340, 45, 'accent'), B('light-panel', 0, 0, 630, 500, 110, 820),
        B('diffuser-face', 0, -62, 635, 430, 20, 750, 'accent'), B('top-hood', 0, 0, 1060, 590, 330, 70),
        B('side-support-left', -235, 0, 65, 45, 65, 500), B('side-support-right', 235, 0, 65, 65, 65, 500),
        B('bottle-guide-front', 0, -160, 175, 600, 28, 45, 'accent'), B('bottle-guide-back', 0, 160, 175, 600, 28, 45, 'accent'),
        C('inspection-knob', 240, -145, 450, 35, 24, 8),
    ]),
    ('cap-feed-hopper', 'Bottle-cap feed hopper', 'Covered hopper and metering throat that supplies plastic closures to an orienter.', 'prop', [
        B('stand', 0, 0, 20, 600, 470, 50, 'accent'), B('hopper', 0, 0, 250, 520, 440, 410),
        B('throat', 0, 0, 90, 260, 260, 160), B('lid', 0, 0, 470, 560, 480, 50, 'accent'),
        B('inspection-door', 0, -225, 300, 240, 24, 190), C('vibrator-motor', 0, 0, 45, 85, 95, 10),
        *[B(f'leg-{i}', x, y, 0, 55, 55, 220) for i, (x, y) in enumerate(((-240, -175), (240, -175), (-240, 175), (240, 175)))],
    ]),
    ('cap-elevator', 'Bottle-cap elevator', 'Enclosed cleated elevator lifts closures from the hopper to an overhead cap sorter.', 'structure', [
        B('base', 0, 0, 0, 420, 560, 45, 'accent'), B('lower-guard', 0, 0, 65, 300, 450, 400),
        B('elevator-shroud', 70, 0, 300, 320, 360, 850), B('top-discharge', 70, 0, 1000, 390, 410, 220),
        B('side-rail-a', -120, 0, 55, 48, 500, 1100, 'accent'), B('side-rail-b', 260, 0, 55, 48, 500, 1100, 'accent'),
        C('drive', -190, 0, 30, 155, 98, 10),
        *[B(f'cleat-{i}', 70, -145 + i * 72, 100 + i * 155, 245, 42, 38, 'accent') for i in range(6)],
    ]),
    ('cap-orienter', 'Bottle-cap orienter', 'Vibratory cap bowl with a guarded spiral track and single-file cap exit.', 'structure', [
        C('bowl-base', 0, 0, 0, 90, 360, 14, 'accent'), C('bowl-body', 0, 0, 90, 170, 390, 14),
        C('center-hub', 0, 0, 260, 230, 95, 10, 'accent'), C('upper-ring', 0, 0, 245, 60, 330, 14),
        B('exit-track', 435, 0, 240, 410, 105, 52, 'accent'), B('guide-front', 435, -58, 270, 410, 18, 78),
        B('guide-back', 435, 58, 270, 410, 18, 78), B('drive-box', -230, 0, 30, 220, 180, 180),
        *[B(f'track-tab-{i}', -110 + i * 70, -250, 210 + i * 18, 65, 35, 18, 'accent') for i in range(5)],
    ]),
    ('cap-delivery-chute', 'Closure delivery chute', 'Covered gravity chute with inspection lid, clear side slot, and capper handoff nose.', 'prop', [
        B('chute-floor', 0, 0, 160, 760, 250, 50, 'accent'), B('side-left', 0, -128, 210, 760, 24, 150),
        B('side-right', 0, 128, 210, 760, 24, 150), B('cover', 0, 0, 365, 760, 245, 35),
        B('inlet-funnel', -390, 0, 170, 180, 320, 230), B('handoff-nose', 405, 0, 125, 115, 190, 95, 'accent'),
        *[B(f'mount-tab-{i}', -250 + i * 250, 0, 0, 80, 90, 160) for i in range(3)],
    ]),
    ('rotary-capper', 'Rotary bottle capper', 'Capping turret with torque-head ring, bottle table, cap-feed hood, and guarded discharge.', 'structure', [
        C('base-skirt', 0, 0, 0, 160, 490, 16, 'accent'), C('bottle-table', 0, 0, 160, 130, 390, 16),
        C('turret-column', 0, 0, 290, 710, 145, 12), C('top-plate', 0, 0, 1000, 75, 310, 12, 'accent'),
        B('cap-feed-hood', 0, 360, 800, 620, 240, 260), B('infeed-deck', -510, 0, 235, 390, 210, 50, 'accent'),
        B('outfeed-deck', 510, 0, 235, 390, 210, 50, 'accent'), B('front-guard', 0, -510, 250, 950, 32, 500),
        *[C(f'capper-head-{i}', 330 * math.cos(i * 3.14159 / 4), 330 * math.sin(i * 3.14159 / 4), 730, 190, 34, 8, 'accent') for i in range(8)],
        *[B(f'leg-{i}', -330 + i * 220, 0, 0, 48, 48, 230) for i in range(4)],
    ]),
    ('cap-torque-head', 'Cap torque head', 'Compact capping chuck with drive housing, adjustable spindle, and closure grip ring.', 'prop', [
        C('spindle', 0, 0, 0, 310, 34, 10), C('chuck', 0, 0, 310, 100, 90, 12, 'accent'),
        C('grip-ring', 0, 0, 300, 35, 106, 12), B('drive-body', 0, 0, 480, 220, 220, 230),
        B('mount-plate', 0, 0, 710, 330, 310, 50, 'accent'), B('air-port', 160, 0, 545, 95, 75, 65),
        *[B(f'bolt-tab-{i}', x, y, 710, 50, 50, 75) for i, (x, y) in enumerate(((-145, -135), (145, -135), (-145, 135), (145, 135)))],
    ]),
    ('tamper-band-shrink-station', 'Tamper-band shrink station', 'Bottle neck band station with a compact heat ring, guide rails, and exhaust hood.', 'structure', [
        B('base', 0, 0, 0, 820, 720, 50, 'accent'), B('heat-ring', 0, 0, 520, 250, 230, 280),
        B('opening-frame', 0, 0, 730, 480, 320, 45, 'accent'), B('side-panel-left', -310, 0, 65, 75, 520, 650),
        B('side-panel-right', 310, 0, 65, 75, 520, 650), B('top-hood', 0, 0, 780, 700, 610, 80),
        C('exhaust-fan', 0, 230, 860, 170, 92, 10), B('infeed-guide', -420, 0, 250, 300, 210, 45),
        B('outfeed-guide', 420, 0, 250, 300, 210, 45),
    ]),
    ('label-reel-stand', 'Label reel stand', 'Freestanding unwind and rewind reels with a tensioning roller and web guide.', 'prop', [
        B('base', 0, 0, 20, 500, 420, 50, 'accent'), B('upright', 0, 0, 70, 60, 60, 850),
        C('unwind-reel', -190, 0, 520, 45, 170, 12), C('rewind-reel', 190, 0, 520, 45, 125, 12, 'accent'),
        CX('top-web-roller', 0, 0, 810, 360, 38, 10), CX('lower-web-roller', 0, 0, 300, 300, 32, 10),
        B('tension-arm', 0, 0, 425, 380, 35, 35, 'accent'), C('adjustment-knob', 0, -60, 430, 50, 45, 10),
        *[B(f'foot-{i}', x, y, 0, 70, 70, 65) for i, (x, y) in enumerate(((-190, -150), (190, -150), (-190, 150), (190, 150)))],
    ]),
    ('wraparound-labeler', 'Wraparound bottle labeler', 'Roll-fed label station with a vacuum drum, applicator plate, bottle wrap belt, and control box.', 'structure', [
        B('base-frame', 0, 0, 0, 1100, 700, 55, 'accent'), B('bottle-deck', 0, 0, 300, 1100, 250, 50),
        B('left-column', -440, 0, 75, 75, 75, 850), B('right-column', 440, 0, 75, 75, 75, 850),
        B('top-beam', 0, 0, 925, 1000, 90, 60), C('label-roll', -230, 210, 620, 50, 145, 12, 'accent'),
        C('vacuum-drum', 150, 0, 430, 320, 95, 12), CX('pressure-roller', 340, 0, 390, 85, 62, 10),
        B('control-box', 520, -200, 520, 230, 170, 390, 'accent'), B('web-guide', -40, 190, 650, 500, 24, 38),
    ]),
    ('pressure-sensitive-labeler', 'Pressure-sensitive labeler', 'Front-and-back label applicators with tamp pads, web rolls, bottle guides, and HMI stand.', 'structure', [
        B('base', 0, 0, 0, 1160, 680, 55, 'accent'), B('conveyor', 0, 0, 280, 1160, 190, 48),
        B('mast-front', 0, -260, 75, 70, 70, 900), B('mast-back', 0, 260, 75, 70, 70, 900),
        C('front-roll', -220, -260, 610, 50, 135, 12, 'accent'), C('back-roll', -220, 260, 610, 50, 135, 12, 'accent'),
        B('front-tamp-pad', 150, -210, 470, 250, 120, 150), B('back-tamp-pad', 150, 210, 470, 250, 120, 150),
        B('hmi-post', 470, -330, 70, 60, 60, 690, 'accent'), B('hmi-screen', 470, -345, 690, 180, 40, 135),
        *[B(f'guide-{i}', -400 + i * 260, 0, 330, 35, 240, 45) for i in range(4)],
    ]),
    ('sleeve-label-applicator', 'Shrink-sleeve applicator', 'Sleeve web former and cutting head positioned over a centered bottle conveyor.', 'structure', [
        B('base', 0, 0, 0, 1050, 650, 50, 'accent'), B('conveyor', 0, 0, 250, 1050, 200, 50),
        B('portal-left', -360, 0, 70, 65, 65, 850), B('portal-right', 360, 0, 70, 65, 65, 850),
        B('portal-top', 0, 0, 920, 800, 70, 55), C('film-roll', -180, 220, 660, 50, 125, 12, 'accent'),
        B('forming-shoulder', 70, 0, 460, 220, 250, 110), C('cutting-collar', 0, 0, 790, 80, 150, 12),
        B('control-pod', 500, -200, 500, 190, 160, 300, 'accent'),
        *[CX(f'feed-roller-{i}', 0, -170 + i * 110, 520 + i * 90, 140, 45, 10) for i in range(4)],
    ]),
    ('sleeve-shrink-tunnel', 'Bottle sleeve shrink tunnel', 'Heated tunnel with insulated hood, bottle openings, ventilation fan, and guarded conveyor.', 'structure', [
        B('conveyor-bed', 0, 0, 250, 1450, 300, 65, 'accent'), B('tunnel-shell', 0, 0, 430, 980, 560, 420),
        B('roof', 0, 0, 850, 1020, 600, 65), B('opening-front', -500, 0, 460, 90, 410, 340, 'accent'),
        B('opening-back', 500, 0, 460, 90, 410, 340, 'accent'),
        *[C(f'vent-{i}', -250 + i * 250, 180, 915, 105, 65, 10) for i in range(3)],
        *[B(f'leg-{i}', -560 + i * 370, 0, 0, 55, 55, 250) for i in range(4)],
        B('temperature-panel', 610, -240, 560, 170, 70, 250, 'accent'),
    ]),
    ('bottle-date-coder', 'Bottle date coder', 'Compact inkjet coding head and touchscreen stand beside a moving-bottle guide.', 'prop', [
        B('base', 0, 0, 0, 500, 340, 50, 'accent'), B('pedestal', 0, 0, 70, 75, 75, 540),
        B('controller', 0, -60, 610, 260, 120, 220), B('screen', 0, -130, 690, 190, 25, 100, 'accent'),
        B('print-arm', 170, 0, 450, 340, 45, 45), B('print-head', 330, 0, 410, 120, 100, 180),
        C('adjustment-wheel', 170, -55, 370, 45, 42, 10, 'accent'), B('photoeye', 360, 0, 220, 90, 85, 70),
        B('cable-cover', -180, 0, 70, 35, 50, 550, 'accent'),
    ]),
    ('vision-inspection-arch', 'Bottle vision inspection arch', 'Inspection portal with overhead camera, backlights, side cameras, and a guarded conveyor gap.', 'structure', [
        B('base-left', -420, 0, 0, 250, 600, 55, 'accent'), B('base-right', 420, 0, 0, 250, 600, 55, 'accent'),
        B('column-left', -420, 0, 75, 60, 60, 820), B('column-right', 420, 0, 75, 60, 60, 820),
        B('camera-beam', 0, 0, 895, 920, 80, 70, 'accent'), B('top-camera', 0, -100, 750, 190, 170, 150),
        *[B(f'side-camera-{i}', x, -100, 490, 150, 140, 120) for i, x in enumerate((-390, 390))],
        B('backlight', 0, 235, 500, 600, 40, 330), B('reject-sensor', 330, -150, 360, 85, 75, 85, 'accent'),
        B('conveyor-left', -650, 0, 260, 400, 270, 45), B('conveyor-right', 650, 0, 260, 400, 270, 45),
    ]),
    ('bottle-reject-pusher', 'Bottle reject pusher', 'Side-mounted pneumatic pusher diverts a failed bottle into a padded reject chute.', 'prop', [
        B('conveyor-bed', 0, 0, 330, 950, 280, 50, 'accent'), B('side-frame', 0, -165, 290, 950, 38, 65),
        B('pneumatic-cylinder', 0, 250, 520, 340, 115, 130), CX('piston-rod', 0, 145, 525, 260, 26, 8, 'accent'),
        B('pusher-pad', 0, 10, 505, 170, 225, 110), B('reject-chute', 0, 520, 185, 700, 210, 45, 'accent'),
        *[B(f'leg-{i}', -340 + i * 340, 0, 0, 52, 52, 285) for i in range(3)],
        B('valve-block', -230, 250, 490, 150, 120, 120, 'accent'),
    ]),
    ('bottle-accumulation-table', 'Bottle accumulation table', 'Low-speed round accumulation table with entry rail, exit lane, and central drive.', 'structure', [
        C('table-top', 0, 0, 260, 90, 610, 16, 'accent'), C('central-drive', 0, 0, 75, 185, 180, 12),
        C('turntable-rim', 0, 0, 330, 45, 625, 16), B('infeed-lane', -690, 0, 280, 390, 160, 40),
        B('outfeed-lane', 690, 0, 280, 390, 160, 40, 'accent'),
        *[B(f'leg-{i}', 360 * math.cos(i * 3.14159 / 2), 360 * math.sin(i * 3.14159 / 2), 0, 58, 58, 260) for i in range(4)],
        *[B(f'outer-guide-{i}', -400 + i * 160, 610, 350, 150, 30, 45, 'accent') for i in range(6)],
    ]),
    ('case-erector', 'Corrugated case erector', 'Magazine-fed case erector with squaring frame, suction pick head, and bottom-flap folding rails.', 'structure', [
        B('base', 0, 0, 0, 1180, 760, 50, 'accent'), B('case-magazine', -420, 0, 420, 300, 520, 780),
        B('pick-head', -80, 0, 760, 300, 300, 120), B('squaring-frame-front', 220, -290, 100, 80, 80, 700),
        B('squaring-frame-back', 220, 290, 100, 80, 80, 700), B('top-beam', 220, 0, 800, 620, 80, 60, 'accent'),
        B('case-platform', 260, 0, 220, 450, 470, 55),
        *[B(f'folding-rail-{i}', 260, -180 + i * 120, 310, 480, 28, 65, 'accent') for i in range(4)],
        B('control-post', 540, -260, 80, 60, 60, 680), B('hmi', 540, -285, 590, 180, 45, 125, 'accent'),
    ]),
    ('carton-bottom-sealer', 'Carton bottom sealer', 'Drive-belt case sealer closes erected carton flaps before bottle loading.', 'structure', [
        B('base-frame', 0, 0, 0, 1300, 750, 50, 'accent'), B('infeed-bed', -360, 0, 320, 520, 520, 55),
        B('outfeed-bed', 360, 0, 320, 520, 520, 55), B('top-crossbeam', 0, 0, 930, 740, 100, 65, 'accent'),
        B('tower-left', -300, 0, 80, 70, 70, 800), B('tower-right', 300, 0, 80, 70, 70, 800),
        B('tape-head', 0, 0, 740, 240, 320, 170), C('tape-roll', 0, -190, 680, 65, 110, 12, 'accent'),
        *[B(f'guide-{i}', -480 + i * 320, 0, 390, 40, 590, 60) for i in range(4)],
    ]),
    ('bottle-case-packer', 'Bottle case packer', 'Guarded pick-and-place case packer with bottle grouping lanes and carton lift table.', 'structure', [
        B('base', 0, 0, 0, 1450, 920, 55, 'accent'), B('infeed-conveyor', -470, 0, 310, 520, 230, 50),
        B('case-conveyor', 470, 0, 260, 600, 560, 50), B('left-post', -300, 0, 75, 70, 70, 1130),
        B('right-post', 300, 0, 75, 70, 70, 1130), B('gantry-beam', 0, 0, 1205, 700, 90, 70, 'accent'),
        B('lift-carriage', 0, 0, 830, 280, 250, 320), B('gripper-plate', 0, 0, 760, 440, 380, 60, 'accent'),
        *[C(f'gripper-{i}', -150 + (i % 3) * 150, -100 + (i // 3) * 200, 650, 110, 34, 8) for i in range(6)],
        B('guard-front', 0, -455, 80, 1280, 30, 760), B('control-box', 520, -360, 630, 190, 100, 300, 'accent'),
    ]),
    ('shrink-bundle-wrapper', 'Bottle bundle shrink wrapper', 'Film-feed frame gathers multipacks and wraps them before the shrink tunnel.', 'structure', [
        B('base', 0, 0, 0, 1330, 780, 55, 'accent'), B('product-bed', 0, 0, 300, 1300, 390, 50),
        B('portal-left', -450, 0, 70, 60, 60, 760), B('portal-right', 450, 0, 70, 60, 60, 760),
        B('portal-top', 0, 0, 830, 960, 70, 55), C('film-reel', -250, 220, 580, 55, 145, 12, 'accent'),
        CX('film-roller-a', -50, 190, 570, 360, 38, 10), CX('film-roller-b', 230, 190, 390, 360, 38, 10),
        B('film-cut-bar', 160, 0, 510, 55, 540, 45, 'accent'), B('control-pod', 560, -250, 460, 180, 150, 280),
        *[B(f'leg-{i}', -390 + i * 260, 0, 0, 52, 52, 290) for i in range(4)],
    ]),
    ('carton-roller-conveyor', 'Carton roller conveyor', 'Wide gravity roller conveyor transfers sealed cartons between packing stations.', 'structure', [
        B('side-frame-front', 0, -270, 360, 1650, 45, 80, 'accent'), B('side-frame-back', 0, 270, 360, 1650, 45, 80, 'accent'),
        *[CX(f'roller-{i}', -720 + i * 120, 0, 420, 520, 30, 8) for i in range(13)],
        *[B(f'leg-{i}', -600 + i * 400, 0, 0, 65, 65, 340) for i in range(4)],
        *[B(f'crossbar-{i}', -600 + i * 400, 0, 300, 560, 45, 38) for i in range(4)],
        B('end-stop', 830, 0, 390, 50, 520, 105),
    ]),
    ('case-taper', 'Case taper', 'Adjustable side-belt carton taper with upper tape head and centering rails.', 'structure', [
        B('base', 0, 0, 0, 1180, 760, 50, 'accent'), B('infeed-belt', -260, 0, 310, 520, 560, 55),
        B('outfeed-belt', 320, 0, 310, 520, 560, 55), B('upright-front', 0, -280, 80, 70, 70, 820),
        B('upright-back', 0, 280, 80, 70, 70, 820), B('bridge', 0, 0, 900, 140, 700, 70, 'accent'),
        B('tape-head', 0, 0, 660, 250, 360, 210), C('tape-roll', 0, -220, 650, 75, 110, 12, 'accent'),
        B('adjuster-front', 230, -230, 460, 360, 40, 45), B('adjuster-back', 230, 230, 460, 360, 40, 45),
        B('hmi-post', 500, -330, 70, 55, 55, 600), B('hmi', 500, -350, 580, 170, 35, 120, 'accent'),
    ]),
    ('case-checkweigher', 'Packed-case checkweigher', 'Short in-line weigh belt with isolated weigh section, reject output, and status tower.', 'structure', [
        B('left-bed', -330, 0, 290, 580, 620, 55), B('weigh-bed', 0, 0, 265, 440, 620, 70, 'accent'),
        B('right-bed', 330, 0, 290, 580, 620, 55), B('frame-front', 0, -320, 220, 1260, 45, 75),
        B('frame-back', 0, 320, 220, 1260, 45, 75),
        *[B(f'load-cell-{i}', x, y, 120, 90, 90, 150, 'accent') for i, (x, y) in enumerate(((-150, -230), (150, -230), (-150, 230), (150, 230)))],
        B('hmi-post', 420, -390, 65, 55, 55, 620), B('hmi', 420, -420, 595, 180, 45, 130),
        C('status-lamp', 420, -390, 700, 80, 38, 8, 'accent'),
        *[B(f'leg-{i}', -430 + i * 430, 0, 0, 55, 55, 210) for i in range(3)],
    ]),
    ('case-labeler', 'Case label applicator', 'Print-and-apply head places a shipping label on the face of a moving carton.', 'prop', [
        B('floor-base', 0, 0, 0, 600, 470, 55, 'accent'), B('mast', 0, 0, 75, 75, 75, 920),
        B('printer-body', 160, 0, 600, 320, 220, 290), B('display', 190, -120, 760, 190, 25, 105, 'accent'),
        C('label-roll', 100, 155, 800, 55, 120, 12), CX('peel-roller', 330, 0, 520, 120, 38, 10, 'accent'),
        B('apply-pad', 390, 0, 410, 150, 260, 90), B('air-regulator', -150, -100, 250, 120, 90, 120, 'accent'),
        B('mounting-arm', 210, 0, 500, 300, 45, 45),
    ]),
    ('case-layer-palletizer', 'Case layer palletizer', 'Layer-forming head lifts a complete case pattern and builds a pallet stack under a safety frame.', 'structure', [
        B('floor-rails', 0, -500, 0, 1600, 70, 55, 'accent'), B('floor-rail-back', 0, 500, 0, 1600, 70, 55, 'accent'),
        B('column-left', -620, 0, 75, 90, 90, 1900), B('column-right', 620, 0, 75, 90, 90, 1900),
        B('top-bridge', 0, 0, 1930, 1320, 100, 95), B('lift-carriage', 0, 0, 1280, 380, 420, 500, 'accent'),
        B('layer-plate', 0, 0, 1215, 1180, 920, 60), B('infeed-bed', -870, 0, 300, 520, 900, 60),
        B('pallet-deck', 870, 0, 60, 780, 1100, 80, 'accent'), B('operator-gate', 0, -575, 100, 1350, 30, 1150),
        B('control-console', 780, -590, 420, 180, 95, 650),
    ]),
    ('slip-sheet-dispenser', 'Pallet slip-sheet dispenser', 'Magazine and vacuum pick head feed a separator sheet to the palletizing station.', 'prop', [
        B('base', 0, 0, 0, 720, 620, 55, 'accent'), B('sheet-stack', 0, 0, 150, 560, 460, 280),
        B('magazine-post-left', -300, 0, 75, 55, 55, 850), B('magazine-post-right', 300, 0, 75, 55, 55, 850),
        B('top-beam', 0, 0, 900, 660, 70, 60), B('pick-head', 0, 0, 700, 400, 330, 110, 'accent'),
        *[C(f'vacuum-cup-{i}', x, y, 630, 80, 33, 8) for i, (x, y) in enumerate(((-130, -100), (130, -100), (-130, 100), (130, 100)))],
        B('outfeed-shelf', 0, 470, 310, 760, 240, 55), C('vacuum-pump', -260, -240, 80, 155, 70, 10),
    ]),
    ('stretch-wrapper', 'Pallet stretch wrapper', 'Turntable wrapper with film carriage, mast rollers, and adjustable load-height sensor.', 'structure', [
        C('turntable', 0, 0, 0, 95, 650, 16, 'accent'), C('turntable-hub', 0, 0, 95, 85, 170, 12),
        B('mast-base', 650, 0, 20, 240, 250, 50, 'accent'), B('mast', 650, 0, 70, 85, 85, 1730),
        B('film-carriage', 560, 0, 600, 250, 250, 420), C('film-roll', 470, -155, 710, 80, 140, 12, 'accent'),
        *[CX(f'film-roller-{i}', 600, -100, 680 + i * 110, 120, 35, 10) for i in range(3)],
        B('control-box', 760, -190, 450, 180, 150, 340, 'accent'), C('photoeye', 600, 100, 1570, 70, 38, 8),
    ]),
    ('empty-bottle-divider-tray', 'Empty bottle divider tray', 'Washable compartment tray spaces glass bottles for returnable-container handling.', 'item', [
        B('tray-floor', 0, 0, 20, 760, 560, 40, 'accent'), B('rim-front', 0, -270, 60, 760, 35, 80),
        B('rim-back', 0, 270, 60, 760, 35, 80), B('rim-left', -365, 0, 60, 35, 505, 80), B('rim-right', 365, 0, 60, 35, 505, 80),
        *[B(f'divider-x-{i}', -240 + i * 160, 0, 60, 20, 500, 55) for i in range(4)],
        *[B(f'divider-y-{i}', 0, -180 + i * 120, 60, 730, 18, 55) for i in range(3)],
        *[B(f'foot-{i}', x, y, 0, 70, 70, 25, 'accent') for i, (x, y) in enumerate(((-300, -200), (300, -200), (-300, 200), (300, 200)))],
    ]),
    ('corrugated-case-stack', 'Corrugated case stack', 'Neat stack of knocked-down corrugated cases staged beside a case erector.', 'item', [
        *[B(f'case-{i}-body', 0, 0, i * 150, 730, 520, 115) for i in range(5)],
        *[B(f'case-{i}-flap-front', 0, -285, i * 150, 730, 45, 18, 'accent') for i in range(5)],
        *[B(f'case-{i}-flap-back', 0, 285, i * 150, 730, 45, 18, 'accent') for i in range(5)],
        B('stack-label', 250, -265, 610, 185, 25, 95, 'accent'), B('corner-protector-left', -345, 0, 0, 25, 25, 760),
        B('corner-protector-right', 345, 0, 0, 25, 25, 760),
    ]),
    ('beverage-blend-tank', 'Beverage blend tank', 'Agitated blend tank with jacket band, manway, sight glass, and sanitary outlet.', 'structure', [
        C('vessel-shell', 0, 0, 70, 1050, 390, 14), C('top-head', 0, 0, 1120, 110, 360, 14),
        C('bottom-head', 0, 0, 0, 80, 350, 14), C('jacket-band', 0, 0, 360, 430, 415, 14, 'accent'),
        C('manway', 0, -410, 990, 70, 145, 12), C('agitator-drive', 0, 0, 1230, 250, 145, 12, 'accent'),
        C('shaft', 0, 0, 300, 810, 32, 8), B('impeller-a', 0, 0, 540, 430, 35, 28, 'accent'),
        B('impeller-b', 0, 0, 820, 330, 35, 28, 'accent'), C('outlet', 0, -425, 95, 150, 50, 10),
        *[B(f'leg-{i}', 230 * math.cos(i * 3.14159 / 2), 230 * math.sin(i * 3.14159 / 2), 0, 75, 75, 280) for i in range(4)],
    ]),
    ('carbonation-vessel', 'Beverage carbonation vessel', 'Insulated pressure vessel with manway, sample valve, pressure gauge, and base ring.', 'structure', [
        C('shell', 0, 0, 70, 1260, 360, 14), C('top-cap', 0, 0, 1330, 100, 330, 14),
        C('bottom-cap', 0, 0, 0, 80, 330, 14), C('insulation-jacket', 0, 0, 500, 480, 378, 14, 'accent'),
        C('top-nozzle', 0, 0, 1430, 120, 58, 10), C('carbon-dioxide-port', 0, -380, 1130, 140, 42, 10),
        C('sample-valve', 0, 380, 370, 140, 35, 10), C('pressure-gauge', 130, -400, 1220, 50, 55, 10, 'accent'),
        *[B(f'leg-{i}', x, y, 0, 80, 80, 250) for i, (x, y) in enumerate(((-210, -210), (210, -210), (-210, 210), (210, 210)))],
        B('nameplate', 0, -382, 770, 190, 22, 120, 'accent'),
    ]),
    ('flash-pasteurizer', 'Flash pasteurizer skid', 'Plate heat exchanger and balance tank on a sanitary skid with return and product pumps.', 'structure', [
        B('skid-base', 0, 0, 0, 1450, 780, 55, 'accent'), B('exchanger-pack', -250, 0, 130, 300, 540, 780),
        *[B(f'plate-{i}', -250 + i * 26, 0, 150, 16, 500, 700, 'accent') for i in range(8)],
        C('balance-tank', 350, 0, 75, 580, 205, 12), C('tank-lid', 350, 0, 655, 55, 220, 12, 'accent'),
        C('product-pump', 680, -220, 35, 170, 90, 10), B('pump-motor', 680, -220, 210, 230, 180, 150),
        B('control-panel', 650, 240, 380, 250, 170, 440, 'accent'),
        *[C(f'process-pipe-{i}', -250 + i * 180, 360, 300 + (i % 2) * 190, 220, 35, 10) for i in range(5)],
        B('upper-header', 100, 330, 780, 820, 55, 55),
    ]),
    ('sanitary-filter-skid', 'Sanitary cartridge filter skid', 'Twin stainless cartridge housings with vent, drain, and sanitary pipe headers.', 'structure', [
        B('skid', 0, 0, 20, 1050, 650, 50, 'accent'),
        *[C(f'filter-housing-{i}', x, 0, 200, 720, 170, 12) for i, x in enumerate((-250, 250))],
        *[C(f'filter-lid-{i}', x, 0, 920, 55, 188, 12, 'accent') for i, x in enumerate((-250, 250))],
        C('inlet-header', 0, -260, 300, 1020, 40, 10), C('outlet-header', 0, 260, 700, 1020, 40, 10),
        *[B(f'branch-{i}', x, 0, 320, 42, 300, 400) for i, x in enumerate((-250, 250))],
        *[B(f'skid-foot-{i}', x, y, 0, 65, 65, 210) for i, (x, y) in enumerate(((-400, -250), (400, -250), (-400, 250), (400, 250)))],
        B('vent-manifold', 0, 0, 990, 800, 45, 42, 'accent'),
    ]),
    ('sanitary-lobe-pump', 'Sanitary rotary-lobe pump', 'Low-shear lobe pump with polished casing, motor, coupling guard, and cleanable feet.', 'prop', [
        B('base', 0, 0, 0, 660, 430, 50, 'accent'), C('pump-casing', -130, 0, 80, 255, 160, 12),
        C('front-cover', -130, -185, 215, 50, 155, 12, 'accent'), C('inlet', -130, 0, 330, 115, 62, 10),
        C('outlet', -130, 190, 205, 115, 62, 10), B('gearbox', 120, 0, 95, 240, 250, 200),
        B('motor', 350, 0, 110, 320, 280, 230), CX('coupling-guard', 65, 0, 200, 185, 72, 10, 'accent'),
        *[B(f'foot-{i}', x, y, 0, 75, 75, 95) for i, (x, y) in enumerate(((-260, -145), (260, -145), (-260, 145), (260, 145)))],
    ]),
    ('cip-supply-return-skid', 'CIP supply and return skid', 'Compact cleaning-in-place skid with two solution tanks, pump, heat exchanger, and pipe loop.', 'structure', [
        B('skid', 0, 0, 0, 1470, 780, 55, 'accent'),
        *[C(f'cip-tank-{i}', x, 170, 80, 610, 210, 12) for i, x in enumerate((-450, 250))],
        *[C(f'cip-lid-{i}', x, 170, 690, 55, 225, 12, 'accent') for i, x in enumerate((-450, 250))],
        C('return-pump', -10, -230, 50, 180, 96, 10), B('pump-motor', -10, -230, 230, 220, 190, 150),
        B('plate-exchanger', 590, -120, 120, 250, 360, 500),
        *[B(f'exchanger-plate-{i}', 500 + i * 25, -120, 135, 14, 320, 465, 'accent') for i in range(6)],
        C('supply-header', 0, -330, 560, 1100, 42, 10), C('return-header', 0, -400, 310, 1100, 42, 10),
        B('control-cabinet', 585, 260, 360, 210, 180, 430, 'accent'),
        *[C(f'valve-{i}', -390 + i * 210, -330, 600, 90, 40, 10) for i in range(5)],
    ]),
    ('cip-valve-manifold', 'CIP valve manifold', 'Sanitary valve cluster routes clean-in-place supply and return through color-coded branches.', 'prop', [
        C('supply-header', 0, 0, 30, 850, 48, 10), C('return-header', 0, 260, 30, 850, 48, 10),
        C('cross-header', 0, 130, 30, 850, 35, 10, 'accent'),
        *[C(f'branch-{i}', -300 + i * 200, 130, 30, 310, 30, 8) for i in range(4)],
        *[B(f'valve-actuator-{i}', -300 + i * 200, 130, 360, 110, 105, 95, 'accent') for i in range(4)],
        *[B(f'mount-foot-{i}', x, y, 0, 70, 70, 30) for i, (x, y) in enumerate(((-360, -90), (360, -90), (-360, 350), (360, 350)))],
        C('drain-leg', 0, 130, 0, 90, 42, 8),
    ]),
    ('inline-bottle-sample-station', 'In-line bottle sample station', 'Small sanitary sample point with bottle shelf, rinse sink, and product line valve.', 'prop', [
        B('base', 0, 0, 0, 600, 430, 50, 'accent'), B('upright', 0, 0, 70, 55, 55, 670),
        B('shelf', 0, -80, 480, 550, 240, 45), B('sample-bottle-holder', 0, -80, 525, 130, 130, 80, 'accent'),
        B('rinse-cup', 210, 120, 475, 150, 150, 55), C('sample-valve', 0, 170, 640, 120, 40, 10),
        C('sample-spout', 0, 100, 565, 100, 22, 8, 'accent'), B('drain-pan', 0, 150, 410, 380, 180, 30),
        B('line-guard', 0, 0, 680, 490, 30, 35, 'accent'), B('nameplate', 180, -40, 570, 120, 20, 70),
    ]),
]


def part_call(part):
    kind, name, *values = part
    zone = values.pop()
    color = 'accent' if zone == 'accent' else 'body'
    if kind == 'box':
        x, y, z, width, depth, height = values
        shape = f'boxPart({x}, {y}, {z}, {width}, {depth}, {height}, {color})'
    elif kind == 'cylinder':
        x, y, z, height, radius, segments = values
        shape = f'cylinderPart({x}, {y}, {z}, {height}, {radius}, {segments}, {color})'
    elif kind == 'x-cylinder':
        x, y, z, length, radius, segments = values
        shape = f'xCylinderPart({x}, {y}, {z}, {length}, {radius}, {segments}, {color})'
    else:
        raise ValueError(f'unknown geometry kind {kind}')
    return f"p.part({json.dumps(name)}, {shape});"


def render(asset):
    asset_id, title, description, category, parts = asset
    kinds = {part[0] for part in parts}
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.',
        'meta({',
        f'  name: {json.dumps(asset_id)},',
        "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(description + " Knobs: overall scale, equipment color, and safety accent.")},',
        "  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],",
        "  kit: 'beverage-bottling-line',",
        f"  category: '{category}',",
        "  origin: 'base',",
        "  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],",
        '  triangleBudget: 2200,',
        '});',
        '',
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });",
        f"const body = param('body', '{BODY}', {{ label: 'Equipment color' }});",
        f"const accent = param('accent', '{ACCENT}', {{ label: 'Safety accent' }});",
    ]
    if 'box' in kinds:
        lines.append('const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number,color=body) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale).color(color);')
    if 'cylinder' in kinds:
        lines.append('const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10,color=body) => cylinder(h,r,n).translate(x,y,z).scale(scale).color(color);')
    if 'x-cylinder' in kinds:
        lines.append('const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10,color=body) => cylinder(length,r,n).rotate([0,1,0],90).translate(x-length/2,y,z).scale(scale).color(color);')
    lines.extend(['', f'const p = assembly({json.dumps(asset_id)});'])
    lines.extend(part_call(part) for part in parts)
    lines.extend(['', 'return p.model();', ''])
    return '\n'.join(lines)


def main():
    if len(ASSETS) != 50:
        raise SystemExit(f'expected 50 assets, got {len(ASSETS)}')
    KIT.mkdir(parents=True, exist_ok=True)
    expected_ids = {asset[0] for asset in ASSETS}
    unexpected = sorted(path.stem.removesuffix('.kcad') for path in KIT.glob('*.kcad.ts') if path.stem.removesuffix('.kcad') not in expected_ids)
    if unexpected:
        raise SystemExit(f'refusing to overwrite unrelated kit sources: {unexpected}')
    for asset in ASSETS:
        (KIT / f'{asset[0]}.kcad.ts').write_text(render(asset))
    (KIT / 'kit.json').write_text(json.dumps({
        'title': 'Beverage bottling line',
        'description': 'Original low-poly props for container handling, rinse-fill-cap, labelling, inspection, case packing, pallet handling, beverage preparation, and clean-in-place scenes.',
    }, indent=2) + '\n')
    print(f'generated {len(ASSETS)} beverage-bottling-line assets')


if __name__ == '__main__':
    main()
