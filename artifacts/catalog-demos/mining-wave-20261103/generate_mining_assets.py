#!/usr/bin/env python3
"""Generate original low-poly mining and mineral-processing scene props."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT_ID = 'mining'
KIT = ROOT / 'catalog' / 'kits' / KIT_ID
KIT.mkdir(parents=True, exist_ok=True)


def B(name, x, y, z, w, d, h):
    return ('box', name, x, y, z, w, d, h)


def C(name, x, y, z, h, r, segments=10):
    return ('cylinder', name, x, y, z, h, r, segments)


def HX(name, x, y, z, length, radius, segments=10):
    return ('horizontal-x', name, x, y, z, length, radius, segments)


def HY(name, x, y, z, length, radius, segments=10):
    return ('horizontal-y', name, x, y, z, length, radius, segments)


ASSETS = [
    ('shaft-headframe', 'Mine shaft headframe', 'Steel-look headframe with paired uprights, winding sheaves, and a raised service deck.', '#686d69', [
        B('base-skid', 0, 0, 0, 760, 560, 70), B('tower-left', -250, 0, 70, 70, 80, 880), B('tower-right', 250, 0, 70, 70, 80, 880),
        B('upper-crossbeam', 0, 0, 900, 650, 100, 85), B('rear-brace', 0, 220, 470, 590, 55, 45),
        HY('sheave-left', -165, 0, 1010, 100, 125, 12), HY('sheave-right', 165, 0, 1010, 100, 125, 12), B('operator-platform', 0, -110, 720, 720, 250, 45),
    ]),
    ('mine-skip', 'Mine skip conveyance', 'Compact ore skip with reinforced side walls, guide rails, a top bail, and a discharge gate.', '#786e58', [
        B('floor', 0, 0, 35, 520, 430, 65), B('side-left', -225, 0, 100, 60, 420, 530), B('side-right', 225, 0, 100, 60, 420, 530),
        B('front-wall', 0, -180, 100, 420, 55, 530), B('back-wall', 0, 180, 100, 420, 55, 530), B('guide-left', -280, 0, 30, 35, 35, 690),
        B('guide-right', 280, 0, 30, 35, 35, 690), C('lifting-pin', 0, 0, 630, 65, 85, 10), B('gate', 0, -225, 70, 350, 35, 90),
    ]),
    ('mine-locomotive', 'Underground mine locomotive', 'Low-profile mine locomotive with enclosed cab, buffer ends, chassis, and paired wheel trucks.', '#a26b40', [
        B('chassis', 0, 0, 70, 900, 350, 140), B('cab', -190, 0, 210, 360, 320, 360), B('cab-roof', -190, 0, 570, 420, 370, 55),
        B('front-buffer', 455, 0, 120, 55, 440, 90), B('rear-buffer', -455, 0, 120, 55, 440, 90),
        HY('front-wheel-near', 270, -190, 115, 90, 110, 8), HY('front-wheel-far', 270, 190, 115, 90, 110, 8),
        HY('rear-wheel-near', -270, -190, 115, 90, 110, 8), HY('rear-wheel-far', -270, 190, 115, 90, 110, 8), B('battery-box', 80, 0, 180, 220, 270, 180),
    ]),
    ('underground-shuttle-car', 'Underground shuttle car', 'Low ore shuttle with a deep haul body, operator enclosure, front bumper, and wheel guards.', '#b17a38', [
        B('chassis', 0, 0, 65, 1150, 460, 130), B('ore-body', -70, 0, 180, 760, 430, 380), B('body-rim', -70, 0, 560, 800, 470, 45),
        B('operator-cab', 470, 0, 160, 260, 340, 360), B('cab-roof', 470, 0, 520, 300, 380, 50),
        C('front-wheel-set', 385, 0, 0, 90, 175, 8), C('rear-wheel-set', -405, 0, 0, 90, 175, 8), B('front-bumper', 650, 0, 95, 70, 520, 110),
    ]),
    ('continuous-miner', 'Continuous miner', 'Low tracked mining machine with cutting head, operator canopy, cutter drum, and trailing cable reel.', '#c19b42', [
        B('left-track', -90, -245, 35, 950, 145, 95), B('right-track', -90, 245, 35, 950, 145, 95), B('main-body', -90, 0, 130, 700, 360, 190),
        B('operator-canopy', 175, 0, 330, 360, 360, 55), HY('cutting-drum', 440, 0, 225, 350, 155, 12), B('cutter-boom', 330, 0, 190, 330, 160, 110),
        C('cable-reel', -450, 0, 180, 100, 125, 10), B('rear-control-box', -460, 0, 165, 160, 280, 210),
    ]),
    ('longwall-shearer', 'Longwall shearer', 'Armored face shearer with twin cutter drums, central drive housing, and low guide shoes.', '#77766a', [
        B('shearer-body', 0, 0, 120, 820, 310, 175), B('guide-shoe-left', -40, -250, 45, 940, 70, 80), B('guide-shoe-right', -40, 250, 45, 940, 70, 80),
        C('cutter-left', 395, -235, 150, 160, 145, 10), C('cutter-right', 395, 235, 150, 160, 145, 10),
        B('gearbox-left', -330, -170, 145, 180, 150, 160), B('gearbox-right', -330, 170, 145, 180, 150, 160), B('cable-arm', -440, 0, 265, 170, 75, 60),
    ]),
    ('roof-bolting-rig', 'Underground roof-bolting rig', 'Compact bolting vehicle with protected cab, tracked base, feed mast, and paired drill heads.', '#d3a64c', [
        B('left-track', -80, -230, 35, 760, 135, 90), B('right-track', -80, 230, 35, 760, 135, 90), B('chassis', -60, 0, 120, 780, 390, 170),
        B('cab', -300, 0, 290, 300, 330, 300), B('cab-roof', -300, 0, 590, 340, 370, 50),
        B('feed-mast', 300, 0, 285, 130, 150, 510), C('drill-head-left', 280, -125, 690, 125, 48, 8), C('drill-head-right', 280, 125, 690, 125, 48, 8),
    ]),
    ('rotary-blasthole-drill', 'Rotary blasthole drill rig', 'Surface drill rig with crawler base, elevated deck, tall feed mast, drill string, and operator cabin.', '#d49a38', [
        B('left-crawler', -80, -300, 35, 1050, 175, 105), B('right-crawler', -80, 300, 35, 1050, 175, 105), B('main-deck', -50, 0, 150, 920, 580, 170),
        B('operator-cab', -330, 145, 320, 300, 260, 360), B('cab-roof', -330, 145, 680, 340, 300, 50),
        B('drill-mast', 300, 0, 300, 185, 220, 1250), C('drill-string', 300, 0, 60, 300, 50, 8), B('hose-rack', 40, -280, 325, 280, 80, 270),
    ]),
    ('core-drill-rig', 'Exploration core drill rig', 'Portable exploration drill with anchor frame, mast, crown block, rod rack, and control cabinet.', '#87917e', [
        B('base-frame', 0, 0, 20, 780, 640, 80), B('left-upright', -260, 0, 100, 70, 90, 950), B('right-upright', 260, 0, 100, 70, 90, 950),
        B('crosshead', 0, 0, 930, 620, 130, 80), C('drill-spindle', 0, 0, 230, 640, 115, 10),
        B('control-cabinet', -420, 0, 100, 180, 280, 360), B('rod-rack', 420, 0, 90, 150, 310, 580), C('hydraulic-pack', 0, -260, 100, 220, 105, 10),
    ]),
    ('mine-ventilation-fan', 'Mine ventilation fan station', 'Compact fan station with intake plenum, motor block, guarded housing, and raised support frame.', '#638078', [
        B('base-skid', 0, 0, 0, 850, 550, 60), B('left-support', -290, 0, 60, 70, 500, 280), B('right-support', 290, 0, 60, 70, 500, 280),
        C('fan-housing', 0, 0, 180, 360, 245, 12), C('inlet-ring', 0, 0, 540, 65, 285, 12),
        B('motor', -390, 0, 140, 240, 260, 230), B('outlet-plenum', 0, 0, 545, 540, 540, 100), B('service-platform', 0, -355, 280, 800, 110, 45),
    ]),
    ('mine-refuge-chamber', 'Mine refuge chamber', 'Underground refuge pod with reinforced shell, access door, roof rails, and external air bottles.', '#71816e', [
        B('floor-skid', 0, 0, 0, 1050, 610, 70), B('pod-body', 0, 0, 70, 980, 540, 520), B('roof-cap', 0, 0, 590, 1020, 580, 80),
        B('entry-door', 0, -285, 125, 310, 35, 400), B('window-panel', 290, -286, 340, 180, 28, 115),
        C('air-bottle-left', -360, 360, 80, 530, 82, 10), C('air-bottle-right', -130, 360, 80, 530, 82, 10), B('roof-rail', 0, 300, 680, 960, 35, 40),
    ]),
    ('mine-survey-tripod', 'Mine survey tripod', 'Survey tripod with three sturdy legs, rotating instrument platform, telescope block, and control panel.', '#b7874e', [
        B('leg-front', 0, -170, 0, 80, 90, 760), B('leg-left', -180, 130, 0, 80, 90, 760), B('leg-right', 180, 130, 0, 80, 90, 760),
        C('mounting-plate', 0, 0, 755, 70, 180, 10), B('instrument-body', 0, 0, 825, 330, 230, 155),
        C('telescope', 160, 0, 850, 80, 65, 10), B('display', 0, -125, 890, 130, 28, 80), B('carry-handle', 0, 0, 980, 210, 90, 35),
    ]),
    ('ore-pass-grizzly', 'Ore-pass grizzly gate', 'Heavy inclined-look grizzly panel in a service frame with parallel bars and side drive housings.', '#777d73', [
        B('lower-frame', 0, 0, 0, 1020, 700, 80), B('side-left', -465, 0, 70, 90, 700, 480), B('side-right', 465, 0, 70, 90, 700, 480),
        *[B(f'grizzly-bar-{i}', -340 + i * 85, 0, 130, 34, 620, 390) for i in range(9)],
        C('drive-left', -500, 0, 120, 180, 90, 8), C('drive-right', 500, 0, 120, 180, 90, 8), B('upper-crossbar', 0, 0, 500, 1120, 80, 75),
    ]),
    ('run-of-mine-hopper', 'Run-of-mine feed hopper', 'Large feed hopper with reinforced rim, four support legs, and a central discharge throat.', '#787469', [
        B('throat', 0, 0, 40, 420, 380, 210), B('hopper-front', 0, -250, 180, 880, 80, 440), B('hopper-back', 0, 250, 180, 880, 80, 440),
        B('hopper-left', -400, 0, 180, 80, 420, 440), B('hopper-right', 400, 0, 180, 80, 420, 440),
        B('leg-left-front', -360, -220, 0, 80, 80, 180), B('leg-right-front', 360, -220, 0, 80, 80, 180),
        B('leg-left-back', -360, 220, 0, 80, 80, 180), B('leg-right-back', 360, 220, 0, 80, 80, 180), C('gate-shaft', 0, 0, 0, 95, 155, 8),
    ]),
    ('jaw-crusher-module', 'Jaw crusher module', 'Primary jaw crusher on a skid with feed throat, paired jaw blocks, flywheel housings, and drive motor.', '#6e7770', [
        B('base-skid', 0, 0, 0, 1100, 620, 90), B('frame-left', -370, 0, 90, 105, 500, 700), B('frame-right', 370, 0, 90, 105, 500, 700),
        B('feed-wall-front', 0, -250, 700, 790, 55, 260), B('feed-wall-back', 0, 250, 700, 790, 55, 260),
        B('feed-wall-left', -365, 0, 700, 60, 445, 260), B('feed-wall-right', 365, 0, 700, 60, 445, 260),
        B('fixed-jaw', -120, 0, 180, 100, 410, 450), B('swing-jaw', 100, 0, 180, 95, 410, 400),
        HY('flywheel-left', -505, 0, 355, 105, 160, 10), HY('flywheel-right', 505, 0, 355, 105, 160, 10), B('drive-motor', 0, -400, 100, 360, 190, 190),
    ]),
    ('cone-crusher-module', 'Cone crusher module', 'Cone crushing station with feed hopper, nested crusher body, access deck, and drive cabinet.', '#65756f', [
        B('base-skid', 0, 0, 0, 920, 720, 80), B('support-left', -310, 0, 80, 110, 600, 650), B('support-right', 310, 0, 80, 110, 600, 650),
        C('crusher-shell', 0, 0, 170, 520, 285, 12), C('inner-cone', 0, 0, 280, 410, 180, 10), C('top-bowl', 0, 0, 670, 95, 340, 12),
        B('feed-box', 0, 0, 760, 620, 580, 150), B('service-deck', 0, 400, 570, 1050, 180, 45), B('drive-cabinet', -500, -280, 90, 180, 200, 360),
    ]),
    ('gyratory-crusher-station', 'Gyratory crusher station', 'Tall primary crusher station with portal frame, upper feed ring, main shell, and discharge opening.', '#6d736d', [
        B('foundation', 0, 0, 0, 1280, 980, 110), B('column-left', -480, 0, 110, 145, 760, 1050), B('column-right', 480, 0, 110, 145, 760, 1050),
        B('rear-column', 0, 360, 110, 900, 150, 1050), C('crusher-shell', 0, 0, 140, 790, 360, 12), C('feed-ring', 0, 0, 900, 170, 520, 12),
        B('top-bridge', 0, 0, 1060, 1160, 220, 100), B('discharge-chute', 0, -430, 160, 480, 220, 260),
    ]),
    ('impact-crusher-module', 'Impact crusher module', 'Impact crusher housing with feed chute, inspection doors, drive motor, and a raised maintenance rail.', '#8a6d47', [
        B('base-frame', 0, 0, 0, 1180, 720, 90), B('crusher-housing', 0, 0, 210, 760, 610, 520), B('feed-chute', 0, 0, 730, 520, 460, 300),
        B('access-door-left', -395, -100, 300, 35, 270, 280), B('access-door-right', 395, -100, 300, 35, 270, 280),
        C('rotor-cap', 0, 0, 310, 170, 220, 12), B('motor', -550, 0, 105, 300, 340, 270), B('service-rail', 0, 390, 770, 1020, 45, 45),
    ]),
    ('rock-breaker-boom', 'Crusher rock-breaker boom', 'Pedestal-mounted breaker boom with segmented arm, hydraulic cylinders, and hammer tool.', '#b1873d', [
        B('base-plinth', 0, 0, 0, 500, 470, 90), C('turntable', 0, 0, 90, 130, 220, 10),
        B('pedestal', 0, 0, 220, 240, 240, 300), B('boom-lower', 190, 0, 430, 500, 150, 135),
        B('boom-upper', 480, 0, 560, 470, 125, 115), B('hydraulic-cylinder', 280, -115, 470, 330, 50, 65),
        B('hammer-body', 760, 0, 470, 140, 135, 320), C('tool-tip', 760, 0, 405, 90, 58, 8), B('hose-pack', 280, 110, 360, 330, 45, 45),
    ]),
    ('grizzly-scalping-deck', 'Grizzly scalping deck', 'Scalping screen with replaceable parallel bars, reinforced side rails, and shaker drive blocks.', '#777c73', [
        B('lower-frame', 0, 0, 0, 1220, 780, 75), B('side-left', 0, -360, 70, 1220, 75, 140), B('side-right', 0, 360, 70, 1220, 75, 140),
        *[B(f'bar-{i}', -500 + i * 125, 0, 180, 55, 620, 340) for i in range(9)],
        B('crossbeam-front', -550, 0, 100, 80, 760, 95), B('crossbeam-back', 550, 0, 100, 80, 760, 95),
        C('vibrator-left', -430, 0, 340, 100, 80, 8), C('vibrator-right', 430, 0, 340, 100, 80, 8),
    ]),
    ('double-deck-screen', 'Double-deck vibrating screen', 'Two-level screening unit with framed decks, support springs, discharge lips, and paired exciters.', '#6c7975', [
        B('base-frame', 0, 0, 0, 1320, 780, 65), B('deck-lower', 0, 0, 330, 1260, 700, 75), B('deck-upper', 0, 0, 690, 1260, 700, 75),
        B('side-left', 0, -360, 150, 1280, 65, 720), B('side-right', 0, 360, 150, 1280, 65, 720),
        B('discharge-lower', 650, 0, 285, 220, 750, 75), B('discharge-upper', 650, 0, 645, 220, 750, 75),
        C('exciter-left', 0, -410, 500, 140, 95, 8), C('exciter-right', 0, 410, 500, 140, 95, 8),
    ]),
    ('trommel-screen', 'Rotary trommel screen', 'Trommel screening unit with perforated-look drum, support frame, feed box, and drive enclosure.', '#7c7869', [
        B('base-skid', 0, 0, 0, 1160, 700, 65), B('support-left', -360, 0, 65, 100, 620, 440), B('support-right', 360, 0, 65, 100, 620, 440),
        C('drum-front-ring', -280, 0, 300, 110, 310, 12), C('drum-body', 0, 0, 300, 560, 260, 12), C('drum-rear-ring', 280, 0, 300, 110, 310, 12),
        B('feed-box', -560, 0, 260, 260, 520, 300), B('drive-guard', 80, -390, 160, 330, 200, 240), B('oversize-chute', 520, 0, 120, 240, 520, 230),
    ]),
    ('apron-feeder', 'Heavy-duty apron feeder', 'Low feeder with overlapping pan plates, side chains, head sprocket housings, and a feed skirt.', '#776c55', [
        B('left-rail', 0, -310, 0, 1320, 75, 220), B('right-rail', 0, 310, 0, 1320, 75, 220),
        *[B(f'apron-pan-{i}', -500 + i * 125, 0, 115, 118, 555, 45) for i in range(9)],
        HY('head-sprocket-left', 570, -310, 150, 115, 125, 8), HY('head-sprocket-right', 570, 310, 150, 115, 125, 8),
        B('feed-skirt-left', -350, -360, 260, 500, 45, 360), B('feed-skirt-right', -350, 360, 260, 500, 45, 360), B('drive-motor', 650, 0, 95, 250, 230, 180),
    ]),
    ('crusher-transfer-chute', 'Crusher transfer chute', 'Enclosed transfer chute with upper feed throat, lower discharge neck, support legs, and inspection cover.', '#716f64', [
        B('top-flange', 0, 0, 640, 760, 600, 65), B('front-wall', 0, -250, 340, 720, 55, 560), B('back-wall', 0, 250, 340, 720, 55, 560),
        B('left-wall', -330, 0, 340, 55, 450, 560), B('right-wall', 330, 0, 340, 55, 450, 560),
        B('discharge-neck', 0, 0, 80, 330, 330, 260), B('inspection-cover', 0, -290, 445, 250, 35, 180),
        B('leg-left', -360, -260, 0, 65, 65, 280), B('leg-right', 360, 260, 0, 65, 65, 280), C('access-boss', 0, -320, 500, 70, 70, 8),
    ]),
    ('crusher-discharge-conveyor', 'Crusher discharge conveyor', 'Short transfer conveyor with guarded belt, support frames, head and tail drums, and a drive unit.', '#7c7059', [
        B('belt', 0, 0, 180, 1450, 430, 60), B('left-stringer', 0, -190, 80, 1450, 55, 100), B('right-stringer', 0, 190, 80, 1450, 55, 100),
        B('leg-left', -440, -190, 0, 75, 75, 240), B('leg-right', -440, 190, 0, 75, 75, 240), B('head-leg-left', 440, -190, 0, 75, 75, 360), B('head-leg-right', 440, 190, 0, 75, 75, 360),
        HY('tail-drum', -730, 0, 180, 430, 70, 12), HY('head-drum', 730, 0, 270, 430, 70, 12), B('drive-guard', 600, 280, 230, 250, 190, 230),
    ]),
    ('overland-conveyor-bridge', 'Overland conveyor bridge', 'Elevated conveyor gallery with long belt trough, portal supports, and crossed structural braces.', '#737b70', [
        B('belt', 0, 0, 490, 1800, 270, 70), B('left-stringer', 0, -150, 430, 1800, 55, 90), B('right-stringer', 0, 150, 430, 1800, 55, 90),
        *[B(f'portal-leg-{x}-{y}', x, y, 0, 70, 70, 430) for x in (-610, 610) for y in (-190, 190)],
        B('portal-top-left', -610, 0, 420, 80, 430, 70), B('portal-top-right', 610, 0, 420, 80, 430, 70),
        B('cross-brace-front', 0, -180, 180, 1180, 40, 40), B('cross-brace-back', 0, 180, 180, 1180, 40, 40),
        HY('idler-left', -600, 0, 455, 320, 55, 10), HY('idler-right', 600, 0, 455, 320, 55, 10),
    ]),
    ('conveyor-take-up-station', 'Conveyor take-up station', 'Belt take-up frame with paired guide rails, tension carriage, counterweight block, and return drum.', '#727970', [
        B('base', 0, 0, 0, 1050, 680, 70), B('rail-left', 0, -250, 70, 900, 65, 100), B('rail-right', 0, 250, 70, 900, 65, 100),
        B('tower-left', -390, -250, 170, 75, 75, 600), B('tower-right', -390, 250, 170, 75, 75, 600),
        B('counterweight', 0, 0, 80, 400, 430, 350), B('carriage', 360, 0, 210, 260, 500, 180),
        HY('take-up-drum', 440, 0, 450, 540, 95, 10), B('guardrail', -390, 0, 790, 820, 45, 45),
    ]),
    ('radial-stacker', 'Radial stacker conveyor', 'Mobile radial stacker with long trussed boom, wheeled pivot base, feed hopper, and discharge hood.', '#b0833f', [
        B('pivot-base', -500, 0, 0, 460, 560, 120), B('left-wheel', -520, -330, 0, 250, 90, 180), B('right-wheel', -520, 330, 0, 250, 90, 180),
        B('boom-belt', 180, 0, 600, 1450, 270, 65), B('boom-left-truss', 180, -150, 500, 1450, 50, 70), B('boom-right-truss', 180, 150, 500, 1450, 50, 70),
        B('support-leg', 50, 0, 80, 80, 90, 490), B('feed-hopper', -460, 0, 360, 330, 400, 280), B('discharge-hood', 920, 0, 590, 200, 360, 160),
        C('pivot-bearing', -500, 0, 120, 120, 170, 10),
    ]),
    ('stacker-reclaimer-boom', 'Stacker reclaimer boom', 'Yard boom assembly with turntable, trussed conveyor, support portal, and bucket-wheel end housing.', '#7e7158', [
        B('foundation', 0, 0, 0, 700, 620, 90), C('turntable', 0, 0, 90, 170, 290, 12),
        B('portal-left', -180, 0, 260, 90, 90, 610), B('portal-right', 180, 0, 260, 90, 90, 610), B('portal-top', 0, 0, 850, 500, 110, 85),
        B('boom-belt', 450, 0, 770, 1100, 220, 65), B('boom-truss', 450, 0, 600, 1050, 60, 220),
        C('bucket-wheel', 1000, 0, 530, 250, 240, 12), B('counterweight', -500, 0, 200, 300, 440, 360), B('operator-cab', 0, -300, 650, 250, 180, 260),
    ]),
    ('ore-sorting-arch', 'Ore sorting sensor arch', 'Conveyor inspection arch with sensor heads, side cabinets, belt, and an overhead scanning bar.', '#62736e', [
        B('belt', 0, 0, 125, 1100, 420, 60), B('left-leg', 0, -280, 185, 75, 75, 610), B('right-leg', 0, 280, 185, 75, 75, 610),
        B('crossbar', 0, 0, 760, 700, 90, 85), B('sensor-left', -170, 0, 630, 150, 190, 130), B('sensor-right', 170, 0, 630, 150, 190, 130),
        B('control-cabinet', -490, -300, 130, 190, 160, 350), B('guard-left', 0, -250, 130, 980, 35, 95), B('guard-right', 0, 250, 130, 980, 35, 95), C('scan-beacon', 0, 0, 845, 75, 45, 8),
    ]),
    ('belt-magnet-separator', 'Overband belt magnet separator', 'Overband magnetic separator above a short ore belt with suspended magnet housing and support portal.', '#73766c', [
        B('conveyor-belt', 0, 0, 150, 1120, 480, 55), B('left-stringer', 0, -220, 90, 1120, 55, 100), B('right-stringer', 0, 220, 90, 1120, 55, 100),
        B('portal-left', -100, -300, 235, 65, 65, 560), B('portal-right', -100, 300, 235, 65, 65, 560), B('portal-top', -100, 0, 780, 700, 70, 70),
        B('magnet-housing', -100, 0, 590, 360, 350, 150), C('coil-cap', -100, 0, 740, 60, 180, 10),
        B('control-box', 420, -290, 110, 190, 150, 290), HY('belt-drum', 520, 0, 150, 500, 70, 10),
    ]),
    ('metal-detector-arch', 'Conveyor metal detector arch', 'Inspection conveyor with detector arch, belt guides, control cabinet, and adjustable sensor head.', '#6d776f', [
        B('belt', 0, 0, 120, 1020, 410, 60), B('left-leg', 0, -270, 180, 70, 70, 520), B('right-leg', 0, 270, 180, 70, 70, 520),
        B('arch-top', 0, 0, 700, 670, 80, 75), B('sensor-left', 0, -300, 450, 80, 70, 470), B('sensor-right', 0, 300, 450, 80, 70, 470),
        B('control-cabinet', -420, -300, 130, 190, 150, 320), B('signal-head', 0, 0, 775, 120, 110, 100),
        HY('tail-roller', -500, 0, 130, 420, 60, 10), HY('head-roller', 500, 0, 130, 420, 60, 10),
    ]),
    ('high-pressure-grinding-rolls', 'High-pressure grinding rolls', 'Roll press with paired compression rolls, rigid side frames, feed hopper, and hydraulic drive blocks.', '#6a7771', [
        B('base-frame', 0, 0, 0, 1060, 760, 90), B('left-frame', -390, 0, 90, 120, 620, 750), B('right-frame', 390, 0, 90, 120, 620, 750),
        HY('roll-left', -150, 0, 465, 590, 215, 12), HY('roll-right', 150, 0, 465, 590, 215, 12),
        B('feed-hopper', 0, 0, 760, 650, 570, 180), B('hydraulic-left', 0, -360, 630, 190, 110, 110), B('hydraulic-right', 0, 360, 630, 190, 110, 110),
        B('drive-left', -550, 0, 120, 170, 400, 320), B('drive-right', 550, 0, 120, 170, 400, 320),
    ]),
    ('sag-mill', 'SAG grinding mill', 'Large grinding-mill shell on support piers with trunnion housings, girth drive ring, and feed end.', '#72756d', [
        HX('shell', 0, 0, 520, 1120, 260, 12), HX('feed-trunnion', -610, 0, 520, 240, 135, 12), HX('discharge-trunnion', 610, 0, 520, 240, 135, 12),
        B('pier-left', -370, 0, 0, 180, 660, 280), B('pier-right', 370, 0, 0, 180, 660, 280),
        HX('girth-drive', 170, 0, 520, 100, 315, 12), B('motor-left', 0, -450, 90, 320, 240, 260), B('feed-chute', -760, 0, 390, 260, 300, 220),
        B('discharge-launder', 760, 0, 190, 250, 680, 150),
    ]),
    ('ball-mill', 'Ball mill assembly', 'Mill assembly with compact drum shell, trunnion ends, bearing saddles, motor bed, and feed chute.', '#6d7670', [
        HX('shell', 0, 0, 455, 920, 225, 12), HX('feed-trunnion', -510, 0, 455, 220, 115, 10), HX('discharge-trunnion', 510, 0, 455, 220, 115, 10),
        B('bearing-left', -360, 0, 90, 180, 650, 190), B('bearing-right', 360, 0, 90, 180, 650, 190),
        HX('girth-ring', 120, 0, 455, 90, 280, 12), B('motor', 0, -440, 90, 330, 230, 250), B('feed-chute', -680, 0, 250, 230, 290, 180),
        B('discharge-box', 680, 0, 80, 220, 620, 180),
    ]),
    ('mill-relining-machine', 'Mill relining machine', 'Service platform and hydraulic liner handler with low chassis, lift mast, boom, and guarded operator station.', '#b28a45', [
        B('chassis', 0, 0, 40, 920, 560, 120), B('left-wheel', -280, -320, 20, 230, 90, 170), B('right-wheel', -280, 320, 20, 230, 90, 170),
        B('operator-cab', -300, 0, 160, 260, 330, 290), B('cab-roof', -300, 0, 450, 300, 370, 45),
        B('lift-mast', 220, 0, 155, 180, 190, 620), B('handler-boom', 510, 0, 650, 440, 160, 120),
        C('tool-head', 750, 0, 590, 150, 105, 10), B('counterweight', -470, 0, 80, 220, 420, 180),
    ]),
    ('mill-feed-chute', 'Mill feed chute', 'Wear-lined transfer chute with feed collar, sloped body panels, support saddle, and inspection hatch.', '#736f61', [
        B('top-collar', 0, 0, 620, 600, 580, 70), B('front-panel', 0, -230, 340, 550, 60, 520), B('rear-panel', 0, 230, 340, 550, 60, 520),
        B('left-panel', -245, 0, 340, 60, 400, 520), B('right-panel', 245, 0, 340, 60, 400, 520), B('outlet-neck', 0, 0, 75, 360, 340, 180),
        B('saddle-left', -330, 0, 0, 75, 520, 240), B('saddle-right', 330, 0, 0, 75, 520, 240),
        B('inspection-hatch', 0, -270, 420, 220, 30, 170), C('access-boss', 0, -300, 500, 70, 68, 8),
    ]),
    ('hydrocyclone-cluster', 'Hydrocyclone cluster', 'Cyclone manifold with multiple compact separators, feed header, support frame, and underflow collection box.', '#7f7970', [
        B('base-frame', 0, 0, 0, 1050, 680, 70), B('header-left', -390, 0, 720, 90, 650, 80), B('header-right', 390, 0, 720, 90, 650, 80),
        *[C(f'cyclone-{i}', -250 + i * 125, 0, 250, 470, 78, 8) for i in range(5)],
        B('underflow-box', 0, 0, 100, 900, 480, 120), B('crossbeam', 0, 0, 680, 980, 65, 75),
        C('feed-header', 0, -365, 690, 100, 48, 8), B('service-platform', 0, 365, 380, 1000, 140, 45),
    ]),
    ('flotation-cell-bank', 'Flotation cell bank', 'Three-cell flotation bank with connected tank bodies, central drive housings, and access walkway.', '#617b77', [
        B('base-skid', 0, 0, 0, 1420, 620, 75),
        *[C(f'cell-{i}', -440 + i * 440, 0, 75, 470, 205, 10) for i in range(3)],
        *[B(f'motor-{i}', -440 + i * 440, 0, 545, 150, 150, 185) for i in range(3)],
        B('walkway', 0, 340, 575, 1410, 150, 55), B('front-rail', 0, 420, 635, 1370, 35, 40),
        C('launder-left', -650, 0, 560, 75, 245, 8), C('launder-right', 650, 0, 560, 75, 245, 8),
    ]),
    ('flotation-conditioning-tank', 'Flotation conditioning tank', 'Conditioning vessel with mixer gearbox, central shaft, paddle set, rim, and feed pipe.', '#697b73', [
        C('tank', 0, 0, 0, 610, 330, 12), C('rim', 0, 0, 600, 65, 355, 12), C('shaft', 0, 0, 170, 620, 34, 8),
        B('gearbox', 0, 0, 820, 240, 220, 165), B('mixer-arm-left', -145, 0, 400, 360, 50, 45), B('mixer-arm-right', 145, 0, 400, 360, 50, 45),
        B('paddle-left', -285, 0, 340, 70, 90, 210), B('paddle-right', 285, 0, 340, 70, 90, 210), C('feed-nozzle', 0, -370, 280, 130, 52, 8),
    ]),
    ('magnetic-separator-drum', 'Wet magnetic separator', 'Separator frame with feed trough, drum housing, collection launder, and drive block.', '#637a75', [
        B('base-frame', 0, 0, 0, 1050, 700, 70), B('side-left', -400, 0, 70, 75, 620, 620), B('side-right', 400, 0, 70, 75, 620, 620),
        C('separator-drum', 0, 0, 250, 360, 290, 12), B('feed-trough', -120, -330, 410, 620, 130, 95), B('tailings-launder', 170, 330, 180, 650, 140, 100),
        B('drive-motor', 460, 0, 160, 230, 270, 270), B('top-beam', 0, 0, 650, 900, 85, 70), B('service-platform', 0, 390, 350, 950, 140, 45),
    ]),
    ('spiral-concentrator', 'Spiral concentrator bank', 'Gravity separation bank with support column, stacked spiral trays, feed box, and concentrate launders.', '#697c77', [
        B('base-skid', 0, 0, 0, 860, 650, 70), C('central-column', 0, 0, 70, 1040, 65, 10),
        *[B(f'spiral-tray-{i}', 0, 0, 150 + i * 155, 700 - i * 32, 510 - i * 20, 35) for i in range(6)],
        B('feed-box', -350, 0, 970, 220, 230, 200), B('concentrate-launder', 360, 0, 75, 160, 620, 80),
        C('product-spout-a', 370, -280, 75, 140, 50, 8), C('product-spout-b', 370, 280, 75, 140, 50, 8),
    ]),
    ('thickener-bridge', 'Tailings thickener bridge', 'Circular thickener tank with peripheral rim, radial bridge, central drive, and rake-arm crossbar.', '#6a7872', [
        C('tank', 0, 0, 0, 170, 620, 16), C('tank-rim', 0, 0, 150, 60, 650, 16), B('bridge', 0, 0, 210, 1200, 70, 65),
        B('bridge-rail-left', 0, -85, 275, 1100, 25, 55), B('bridge-rail-right', 0, 85, 275, 1100, 25, 55),
        C('center-drive', 0, 0, 210, 200, 155, 12), B('drive-cover', 0, 0, 410, 260, 220, 130),
        B('rake-arm-left', -220, 0, 80, 450, 35, 35), B('rake-arm-right', 220, 0, 80, 450, 35, 35),
        B('walkway', 0, -560, 210, 300, 120, 45),
    ]),
    ('tailings-filter-press', 'Tailings filter press', 'Plate-and-frame filter press with paired end frames, stacked filter plates, hydraulic ram, and drip tray.', '#747970', [
        B('base-rail-left', 0, -260, 0, 1250, 75, 90), B('base-rail-right', 0, 260, 0, 1250, 75, 90),
        B('fixed-head', -560, 0, 90, 90, 600, 750), B('moving-head', 560, 0, 90, 90, 600, 750),
        *[B(f'filter-plate-{i}', -420 + i * 85, 0, 145, 35, 480, 610) for i in range(9)],
        C('hydraulic-ram', 640, 0, 385, 170, 95, 10), B('drip-tray', 0, 0, 100, 1060, 550, 45),
        B('upper-beam', 0, 0, 820, 1200, 100, 75), B('control-pedestal', -650, -350, 0, 150, 140, 380),
    ]),
    ('vacuum-disc-filter', 'Vacuum disc filter', 'Dewatering unit with trough, central shaft, filter-disc panels, support bearings, and vacuum header.', '#738079', [
        B('trough', 0, 0, 0, 1180, 600, 220), B('left-bearing', -430, 0, 220, 145, 670, 320), B('right-bearing', 430, 0, 220, 145, 670, 320),
        C('filter-shaft', 0, 0, 380, 100, 65, 10),
        *[B(f'filter-disc-{i}', -330 + i * 165, 0, 430, 60, 440, 390) for i in range(5)],
        B('vacuum-header', 0, -365, 330, 950, 55, 55), B('drive-motor', 600, 0, 235, 220, 230, 230),
        C('vacuum-receiver', 0, 390, 100, 350, 120, 10),
    ]),
    ('slurry-pump-skid', 'Slurry pump skid', 'Heavy-duty slurry pump with motor, guarded coupling, suction elbow, discharge riser, and base rails.', '#657a75', [
        B('base-skid', 0, 0, 0, 1250, 600, 70), B('motor', -300, 0, 90, 390, 340, 280), B('coupling-guard', 60, 0, 120, 170, 210, 130),
        C('pump-casing', 260, 0, 90, 320, 210, 12), C('suction-flange', 260, -250, 180, 90, 165, 12),
        B('discharge-riser', 260, 205, 400, 125, 125, 290), B('discharge-flange', 260, 205, 670, 210, 210, 55),
        B('motor-foot-left', -390, -230, 65, 140, 80, 55), B('motor-foot-right', -390, 230, 65, 140, 80, 55),
    ]),
    ('mine-sump-pump', 'Mine sump pump', 'Submersible mine pump with screened intake, motor housing, lifting bail, cable, and discharge outlet.', '#606b64', [
        C('motor-body', 0, 0, 80, 470, 160, 12), C('pump-head', 0, 0, 550, 100, 130, 10),
        B('intake-foot', 0, 0, 25, 280, 280, 55), B('screen-guard-front', 0, -145, 55, 235, 28, 260), B('screen-guard-back', 0, 145, 55, 235, 28, 260),
        B('handle-left', -95, 0, 555, 35, 40, 155), B('handle-right', 95, 0, 555, 35, 40, 155),
        C('discharge-nozzle', 0, -180, 520, 130, 70, 8), B('power-cable', 120, 0, 645, 32, 32, 240), C('cable-entry', 120, 0, 850, 55, 42, 8),
    ]),
    ('tailings-stack-conveyor', 'Tailings stack conveyor', 'Long tailings conveyor with trussed support, raised discharge end, belt, and transfer hood.', '#77766c', [
        B('belt', 0, 0, 480, 1700, 300, 65), B('left-stringer', 0, -165, 410, 1680, 55, 80), B('right-stringer', 0, 165, 410, 1680, 55, 80),
        B('support-left', -500, -165, 0, 90, 90, 410), B('support-right', -500, 165, 0, 90, 90, 410),
        B('head-support-left', 500, -165, 0, 90, 90, 650), B('head-support-right', 500, 165, 0, 90, 90, 650),
        B('truss-web', 0, 0, 220, 1300, 55, 220), B('discharge-hood', 780, 0, 460, 220, 410, 200),
        HY('head-drum', 820, 0, 465, 420, 60, 10),
    ]),
    ('assay-sample-divider', 'Assay sample divider', 'Bench sample divider with feed hopper, splitting chute, collection bins, and compact drive enclosure.', '#847a62', [
        B('base', 0, 0, 0, 740, 520, 70), B('left-bin', -210, -120, 70, 280, 220, 230), B('right-bin', 210, -120, 70, 280, 220, 230),
        B('support-post-left', -255, 0, 300, 65, 65, 300), B('support-post-right', 255, 0, 300, 65, 65, 300),
        B('splitter-housing', 0, 0, 365, 380, 300, 160), B('feed-hopper', 0, 0, 525, 300, 240, 240),
        C('rotary-splitter', 0, 0, 290, 75, 145, 10), B('drive-box', 0, 225, 190, 170, 130, 210),
        B('collection-lip', 0, -260, 90, 550, 45, 55),
    ]),
    ('core-tray-rack', 'Exploration core tray rack', 'Stackable core sample rack with three levels, long trays, end uprights, and top bracing.', '#8b7656', [
        B('base-left', -430, 0, 0, 70, 420, 85), B('base-right', 430, 0, 0, 70, 420, 85), B('base-crossbar', 0, 0, 0, 920, 70, 70),
        *[B(f'core-tray-{level}', 0, 0, 110 + level * 240, 850, 360, 75) for level in range(3)],
        *[B(f'core-channel-{level}-{i}', -350 + i * 140, 0, 150 + level * 240, 28, 330, 25) for level in range(3) for i in range(5)],
        B('upright-left', -430, 0, 75, 60, 70, 800), B('upright-right', 430, 0, 75, 60, 70, 800),
        B('top-crossbar', 0, 0, 850, 920, 70, 65), C('lifting-eye-left', -430, 0, 915, 45, 35, 8), C('lifting-eye-right', 430, 0, 915, 45, 35, 8),
    ]),
]

ids = [spec[0] for spec in ASSETS]
if len(ids) != len(set(ids)):
    raise ValueError('duplicate ids in mining asset specifications')
if not all(
    any(part[0] == 'box' for part in spec[4])
    and any(part[0] in {'cylinder', 'horizontal-x', 'horizontal-y'} for part in spec[4])
    for spec in ASSETS
):
    raise ValueError('each asset must use a box and a cylinder so catalog lint stays clean')
existing_index = ROOT / 'catalog' / 'index.json'
if existing_index.exists():
    existing_ids = {row['id'] for row in json.loads(existing_index.read_text())['assets'] if row['kit'] != KIT_ID}
    collisions = sorted(existing_ids.intersection(ids))
    if collisions:
        raise ValueError(f'asset ids already exist in other kits: {collisions}')


def source_for(spec):
    asset_id, title, description, color, parts = spec
    full_description = f'{description} Knobs: overall scale and asset color.'
    def lowest_surface(part):
        kind, _name, *args = part
        if kind in {'box', 'cylinder'}:
            return args[2]
        return args[2] - args[4]

    base_z = min(lowest_surface(part) for part in parts)
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.',
        '',
        'meta({',
        f'  name: {json.dumps(asset_id)},',
        "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(full_description)},',
        "  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],",
        "  kit: 'mining',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],",
        '  triangleBudget: 1800,',
        '});',
        '',
        "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(color)}, {{ label: 'Asset color' }});",
        f'const baseZ={base_z};',
        'const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);',
    ]
    if any(part[0] == 'cylinder' for part in parts):
        lines.append('const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);')
    if any(part[0] == 'horizontal-x' for part in parts):
        lines.append('const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);')
    if any(part[0] == 'horizontal-y' for part in parts):
        lines.append('const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);')
    lines.extend(['', f'const p=assembly({json.dumps(asset_id)});'])
    for part in parts:
        kind, name, *args = part
        helper = {'box': 'b', 'cylinder': 'c', 'horizontal-x': 'hx', 'horizontal-y': 'hy'}[kind]
        lines.append(f'p.part({json.dumps(name)}, {helper}({", ".join(map(str, args))}).color(color));')
    lines.extend(['', 'return p.model();', ''])
    return '\n'.join(lines)


kit_data = {
    'title': 'Mining and mineral processing',
    'description': 'Original low-poly surface mining, underground equipment, and mineral-processing plant props.',
}
(KIT / 'kit.json').write_text(json.dumps(kit_data, indent=2) + '\n')
for spec in ASSETS:
    asset_id = spec[0]
    (KIT / f'{asset_id}.kcad.ts').write_text(source_for(spec))

settings = {
    'kit': KIT_ID,
    'generatedOn': '2026-11-03',
    'assetCount': len(ASSETS),
    'demo': {
        'source': 'capture_mining_demo.py',
        'output': 'mining-kit.mp4',
        'codec': 'H.264 / libx264',
        'width': 1280,
        'height': 720,
        'frameRate': 24,
        'frameHoldSeconds': 3,
        'frameCount': 10,
        'pixelFormat': 'yuv420p',
        'quality': 'CRF 25',
        'previewFrames': 7,
        'assetsPerPreviewFrame': 8,
    },
    'sourceCommand': 'python3 artifacts/catalog-demos/mining-wave-20261103/generate_mining_assets.py',
    'catalogCommand': 'npx tsx scripts/buildAssetCatalog.ts',
    'previewCommand': 'npx tsx scripts/renderCatalogPreviews.ts',
    'knobs': {'scale': {'default': 1, 'min': 0.7, 'max': 1.3, 'step': 0.05}, 'color': 'asset-specific hex color'},
    'triangleBudget': 1800,
    'materialCount': 1,
    'verificationScope': {
        'covered': ['local source and index', 'low-poly mesh export', 'triangle and material audit', 'catalog integration suite', 'preview files and URLs', 'local generated catalog pages', 'current public website snapshot'],
        'notCovered': ['deployed behavior for this branch', 'equipment operating performance', 'structural suitability', 'safety certification', 'physical acceptance'],
    },
    'assets': [
        {'id': spec[0], 'title': spec[1], 'defaultColor': spec[3], 'parts': len(spec[4])}
        for spec in ASSETS
    ],
}
bundle = ROOT / 'artifacts' / 'catalog-demos' / 'mining-wave-20261103'
bundle.mkdir(parents=True, exist_ok=True)
(bundle / 'settings.json').write_text(json.dumps(settings, indent=2) + '\n')
print(f'generated {len(ASSETS)} assets in {KIT}')
