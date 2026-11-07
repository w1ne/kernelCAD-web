#!/usr/bin/env python3
"""Generate original, generic low-poly data-center infrastructure props."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT_ID = 'data-center-infrastructure'
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


# id, title, short description, default color, geometry profile
ASSETS = [
    ('enclosed-it-rack', 'Enclosed IT rack', 'Full-height rack cabinet with front door frame, side panels, rails, and leveling feet.', '#53616d', 'rack-enclosed'),
    ('open-frame-it-rack', 'Open-frame IT rack', 'Four-post equipment rack with adjustable rails, cross-bracing, and base frame.', '#68747a', 'rack-open'),
    ('wall-mount-network-cabinet', 'Wall-mount network cabinet', 'Compact wall cabinet with framed door, mounting ears, and cable-entry plate.', '#64717a', 'rack-wall'),
    ('high-density-server-chassis', 'High-density server chassis', 'Short-depth compute chassis with front drive bays, status strip, and slide rails.', '#737b80', 'server'),
    ('blade-server-enclosure', 'Blade server enclosure', 'Modular blade enclosure with repeated vertical sleds and rear service rails.', '#707a82', 'blade'),
    ('storage-array-chassis', 'Storage array chassis', 'Rack storage chassis with drive carriers, controller bays, and paired handles.', '#586775', 'storage'),
    ('top-of-rack-network-switch', 'Top-of-rack network switch', 'Rack switch body with a repeated front port row, indicator strip, and mounting ears.', '#626c75', 'switch'),
    ('fiber-patch-panel', 'Fiber patch panel', 'Slim fiber distribution panel with paired connector rows and mounting flanges.', '#4d5965', 'patch'),
    ('rack-kvm-console', 'Rack KVM console', 'Pull-out console tray with display housing, keyboard surface, and rack ears.', '#616e78', 'kvm'),
    ('rack-blanking-panel', 'Rack blanking panel', 'Removable rack face panel with end brackets and a small grip tab.', '#6b7379', 'blanking'),
    ('vertical-cable-manager', 'Vertical cable manager', 'Rack-side cable channel with repeated fingers, covers, and mounting rails.', '#4d5e66', 'cable-manager'),
    ('overhead-cable-ladder', 'Overhead cable ladder', 'Suspended ladder tray with side rails, cross rungs, and ceiling hangers.', '#727a78', 'ladder'),
    ('overhead-power-busway', 'Overhead power busway', 'Enclosed busway segment with joined covers, hanger brackets, and end caps.', '#6e7470', 'busway'),
    ('busway-plug-in-unit', 'Busway plug-in unit', 'Compact plug-in tap box with operating handle and cable outlet gland.', '#8b7955', 'bus-plug'),
    ('rack-power-distribution-unit', 'Rack power distribution unit', 'Vertical rack PDU with repeated outlet sockets, feed cable, and mounting clips.', '#59676e', 'rack-pdu'),
    ('raised-floor-tile', 'Raised floor tile', 'Square access-floor panel with support pedestals and edge stringers.', '#777b78', 'floor-tile'),
    ('perforated-floor-tile', 'Perforated floor tile', 'Airflow floor panel with a dense low-relief grille and four support feet.', '#707977', 'floor-grille'),
    ('floor-cable-grommet', 'Floor cable grommet', 'Raised-floor cable pass-through with split collar and protective curb.', '#505d62', 'grommet'),
    ('hot-aisle-containment-door', 'Hot-aisle containment door', 'Aisle-end door assembly with uprights, clear-panel frame, and pull handle.', '#78858a', 'containment-door'),
    ('cold-aisle-roof-panel', 'Cold-aisle roof panel', 'Overhead containment canopy with a light frame and repeated ceiling panels.', '#69787d', 'containment-roof'),
    ('modular-ups-cabinet', 'Modular UPS cabinet', 'Power cabinet with modular front drawers, service display, and ventilation louvers.', '#65727b', 'cabinet'),
    ('monolithic-ups-cabinet', 'UPS cabinet', 'Floor UPS enclosure with control panel, service doors, and cooling slots.', '#5b6973', 'cabinet'),
    ('data-center-battery-cabinet', 'Data-center battery cabinet', 'Tall battery enclosure with repeated drawer fronts and isolated base plinth.', '#626b70', 'cabinet'),
    ('rack-mounted-battery-tray', 'Rack-mounted battery tray', 'Compact rack battery module with cell covers, front latch, and slide rails.', '#5a666e', 'battery-tray'),
    ('static-transfer-switch', 'Static transfer switch', 'Electrical transfer cabinet with paired source controls and status display.', '#77745f', 'cabinet'),
    ('maintenance-bypass-cabinet', 'Maintenance bypass cabinet', 'Bypass switchboard enclosure with interlock handle and labeled control area.', '#77745f', 'cabinet'),
    ('switchgear-lineup', 'Switchgear lineup', 'Joined electrical bays with breaker doors, instrument panels, and bus compartment.', '#667078', 'switchgear'),
    ('distribution-panelboard', 'Distribution panelboard', 'Panelboard enclosure with hinged door, breaker rows, and cable entry gland.', '#788087', 'panelboard'),
    ('dry-type-transformer', 'Dry-type transformer', 'Ventilated transformer block with cooling fins, terminal bushings, and base rails.', '#8b795a', 'transformer'),
    ('automatic-transfer-switch-cabinet', 'Automatic transfer switch cabinet', 'Transfer cabinet with controller window, source handles, and lower cable plate.', '#6c7478', 'cabinet'),
    ('standby-generator-enclosure', 'Standby generator enclosure', 'Packaged generator skid with acoustic canopy, exhaust stack, and service doors.', '#7c765d', 'generator'),
    ('day-fuel-tank', 'Generator day tank', 'Compact fuel reservoir with support feet, top fill neck, and level gauge.', '#827356', 'tank'),
    ('power-meter-pedestal', 'Power meter pedestal', 'Utility metering pedestal with display head, service door, and cable riser.', '#69767b', 'pedestal'),
    ('emergency-power-off-station', 'Emergency power-off station', 'Wall-mounted protected control station with actuator and guard hood.', '#b04b3e', 'epo'),
    ('in-row-cooler', 'In-row precision cooler', 'Row cooling cabinet with front intake grille, top return, and pipe stubs.', '#69777d', 'cooler'),
    ('perimeter-precision-cooler', 'Perimeter precision cooler', 'Room cooling unit with front grille, fan compartment, and service plinth.', '#67747a', 'cooler'),
    ('air-cooled-chiller', 'Air-cooled chiller', 'Outdoor chiller frame with multiple top fans, coil banks, and service panels.', '#657379', 'chiller'),
    ('cooling-tower-cell', 'Cooling tower cell', 'Open cooling-tower cell with basin, fan deck, fill pack, and water riser.', '#768079', 'tower'),
    ('coolant-distribution-unit', 'Coolant distribution unit', 'Liquid-cooling cabinet with pump bay, heat-exchanger block, and pipe connections.', '#56727a', 'cdu'),
    ('liquid-cooling-manifold', 'Liquid-cooling manifold', 'Supply and return headers with evenly spaced branch outlets and support feet.', '#637a7d', 'manifold'),
    ('rear-door-heat-exchanger', 'Rear-door heat exchanger', 'Rack-door cooling frame with serpentine-look tube runs and inlet connections.', '#5d7478', 'rear-door'),
    ('overhead-coolant-header', 'Overhead coolant header', 'Suspended supply and return pipes with branch drops and hanger brackets.', '#647b79', 'header'),
    ('condenser-pump-skid', 'Condenser pump skid', 'Pumping skid with paired motors, horizontal pump bodies, and manifold pipes.', '#727a6f', 'pump-skid'),
    ('data-center-plate-heat-exchanger', 'Data-center plate heat exchanger', 'Compact exchanger stack with tie bars, frame plates, and pipe flanges.', '#65767a', 'heat-exchanger'),
    ('floor-air-grille', 'Floor air grille', 'Low air-distribution grille with perimeter frame, louver bars, and support feet.', '#727b78', 'floor-grille'),
    ('ceiling-return-plenum', 'Ceiling return plenum', 'Ducted return-air box with support legs, branch collar, and access panel.', '#6e7b79', 'plenum'),
    ('environmental-sensor', 'Environmental sensor', 'Room sensor mast with compact head, directional cap, and mounting plate.', '#6d7773', 'sensor'),
    ('leak-detection-module', 'Leak detection module', 'Water-leak monitor enclosure with probe terminals and floor sensor puck.', '#78816d', 'leak'),
    ('clean-agent-cylinder-bank', 'Clean-agent cylinder bank', 'Suppression cylinder rack with manifold header, valve caps, and anchoring frame.', '#8a6c53', 'fire-bank'),
    ('data-center-security-camera', 'Data-center security camera', 'Compact fixed camera on a service mast with sunshield and mounting base.', '#5b666d', 'camera'),
]


def rack_parts(profile, index):
    width, depth, height = (760, 1100, 2200) if profile == 'rack-enclosed' else (720, 1000, 2100)
    if profile == 'rack-wall':
        width, depth, height = 600, 500, 820
    post = 45
    parts = [
        B('base-plinth', 0, 0, 0, width, depth, 80),
        B('top-frame', 0, 0, height - 90, width, depth, 70),
        B('front-left-post', -width / 2 + post / 2, -depth / 2 + post / 2, 80, post, post, height - 170),
        B('front-right-post', width / 2 - post / 2, -depth / 2 + post / 2, 80, post, post, height - 170),
        B('rear-left-post', -width / 2 + post / 2, depth / 2 - post / 2, 80, post, post, height - 170),
        B('rear-right-post', width / 2 - post / 2, depth / 2 - post / 2, 80, post, post, height - 170),
        B('front-rail-left', -width / 2 + 100, -depth / 2, 120, 55, 35, height - 240),
        B('front-rail-right', width / 2 - 100, -depth / 2, 120, 55, 35, height - 240),
        B('rear-crossbar', 0, depth / 2 - 35, height * 0.55, width - 90, 45, 65),
        C('leveling-foot-front-left', -width / 2 + 45, -depth / 2 + 45, 0, 55, 32, 8),
        C('leveling-foot-front-right', width / 2 - 45, -depth / 2 + 45, 0, 55, 32, 8),
    ]
    if profile == 'rack-enclosed':
        parts += [
            B('left-side-panel', -width / 2 + 22, 0, 90, 28, depth - 110, height - 180),
            B('right-side-panel', width / 2 - 22, 0, 90, 28, depth - 110, height - 180),
            B('rear-door', 0, depth / 2 - 25, 100, width - 95, 30, height - 200),
            B('front-door', 0, -depth / 2 + 25, 100, width - 95, 30, height - 200),
            B('door-handle', width * 0.32, -depth / 2 - 12, height * 0.42, 28, 25, 260),
        ]
    elif profile == 'rack-wall':
        parts += [
            B('rear-mounting-plate', 0, depth / 2 - 20, 100, width - 85, 35, height - 200),
            B('front-door', 0, -depth / 2 + 20, 120, width - 100, 24, height - 230),
            B('left-mounting-ear', -width / 2 - 35, depth / 2 - 20, height * 0.45, 50, 35, height * 0.7),
            B('right-mounting-ear', width / 2 + 35, depth / 2 - 20, height * 0.45, 50, 35, height * 0.7),
            C('door-lock', width * 0.3, -depth / 2 - 18, height * 0.5, 32, 22, 8),
        ]
    else:
        parts += [
            B('left-side-brace', -width / 2 + 35, 0, height * 0.2, 35, 45, height * 0.62),
            B('right-side-brace', width / 2 - 35, 0, height * 0.2, 35, 45, height * 0.62),
            B('cross-brace-a', 0, 0, height * 0.38, width - 100, 35, 38),
            B('cross-brace-b', 0, 0, height * 0.58, width - 100, 35, 38),
            *[B(f'equipment-rail-{i}', 0, -depth / 2 + 110 + i * 210, 150 + (i % 2) * 40, width - 120, 36, 45) for i in range(5)],
        ]
    return parts


def chassis_parts(profile, index):
    width, depth, height = 440, 760, 135
    bays = 8 if profile in {'server', 'storage'} else 10
    if profile == 'blade':
        width, depth, height, bays = 600, 800, 440, 6
    if profile == 'switch':
        width, depth, height, bays = 440, 600, 45, 20
    if profile == 'patch':
        width, depth, height, bays = 440, 65, 90, 12
    if profile == 'kvm':
        width, depth, height, bays = 440, 620, 80, 1
    if profile == 'blanking':
        width, depth, height, bays = 440, 32, 90, 1
    parts = [
        B('chassis-shell', 0, 0, 0, width, depth, height),
        B('front-face', 0, -depth / 2 - 12, 10, width - 28, 24, height - 20),
        B('left-mounting-ear', -width / 2 - 24, 0, 0, 32, depth, height),
        B('right-mounting-ear', width / 2 + 24, 0, 0, 32, depth, height),
        HX('slide-rail-left', 0, -depth * 0.34, 35, width + 120, 12, 8),
        HX('slide-rail-right', 0, depth * 0.34, 35, width + 120, 12, 8),
    ]
    if profile == 'blade':
        parts += [*[B(f'blade-sled-{i}', -width * 0.4 + i * width * 0.16, -depth * 0.28, 30, width * 0.14, depth * 0.55, height - 65) for i in range(bays)], B('service-handle', 0, -depth / 2 - 25, 70, width * 0.75, 20, 35)]
    elif profile == 'kvm':
        parts += [B('display-housing', 0, -depth * 0.18, 95, width * 0.88, depth * 0.34, 300), B('keyboard-tray', 0, -depth * 0.42, 18, width * 0.86, depth * 0.25, 24), C('hinge-left', -width * 0.38, -depth * 0.27, 70, 28, 18, 8), C('hinge-right', width * 0.38, -depth * 0.27, 70, 28, 18, 8)]
    else:
        for i in range(bays):
            x = -width * 0.42 + i * (width * 0.84 / max(1, bays - 1))
            if profile == 'switch':
                parts.append(HY(f'network-port-{i}', x, -depth / 2 - 16, height * 0.5, 26, 8, 8))
            elif profile == 'patch':
                parts.append(HY(f'fiber-coupler-{i}', x, -depth / 2 - 17, height * 0.56, 28, 10, 8))
            else:
                parts.append(B(f'drive-carrier-{i}', x, -depth / 2 - 18, 18, width * 0.075, 28, height - 36))
        parts += [C('status-control', width * 0.38, -depth / 2 - 18, height * 0.48, 24, 12, 8)]
    return parts


def parts_for(profile, index):
    if profile.startswith('rack-'):
        return rack_parts(profile, index)
    if profile in {'server', 'blade', 'storage', 'switch', 'patch', 'kvm', 'blanking'}:
        return chassis_parts(profile, index)
    if profile == 'battery-tray':
        return [B('tray-shell', 0, 0, 0, 430, 690, 155), B('front-cover', 0, -355, 16, 390, 30, 120), *[B(f'cell-cover-{i}', -150 + i * 100, 35, 155, 75, 520, 180) for i in range(4)], HX('slide-rail-left', 0, -250, 55, 520, 16, 8), HX('slide-rail-right', 0, 250, 55, 520, 16, 8), C('terminal-post-positive', -160, -390, 135, 22, 16, 8), C('terminal-post-negative', 160, -390, 135, 22, 16, 8)]
    if profile == 'cable-manager':
        return [B('back-channel', 0, 0, 0, 280, 160, 2050), B('mounting-left', -170, 0, 0, 38, 280, 2050), B('mounting-right', 170, 0, 0, 38, 280, 2050), *[B(f'cable-finger-{i}', 0, -90, 100 + i * 125, 430, 50, 28) for i in range(15)], C('anchor-boss', 0, 0, 0, 42, 58, 8)]
    if profile == 'ladder':
        return [B('left-side-rail', 0, -260, 0, 2400, 65, 55), B('right-side-rail', 0, 260, 0, 2400, 65, 55), *[B(f'cross-rung-{i}', -1080 + i * 180, 0, 8, 60, 455, 38) for i in range(13)], B('hanger-left', -850, 0, 55, 80, 620, 300), B('hanger-right', 850, 0, 55, 80, 620, 300), C('hanger-cap-left', -850, 0, 355, 55, 50, 8), C('hanger-cap-right', 850, 0, 355, 55, 50, 8)]
    if profile == 'busway':
        return [B('busway-housing', 0, 0, 0, 2400, 180, 210), *[B(f'cover-joint-{i}', -900 + i * 600, 0, 210, 55, 205, 24) for i in range(4)], B('end-cap-left', -1220, 0, 15, 70, 210, 180), B('end-cap-right', 1220, 0, 15, 70, 210, 180), B('hanger', 0, 0, 210, 90, 560, 250), C('hanger-bolt', 0, 0, 440, 90, 24, 8)]
    if profile == 'bus-plug':
        return [B('tap-box', 0, 0, 0, 300, 280, 460), B('cover', 0, -150, 25, 255, 35, 405), B('handle', 0, -205, 250, 90, 85, 40), C('cable-gland', 0, 0, 0, 80, 55, 10), C('interlock-knob', 90, -205, 235, 36, 18, 8)]
    if profile == 'rack-pdu':
        return [B('pdu-channel', 0, 0, 0, 150, 135, 1980), B('front-strip', 0, -80, 35, 120, 28, 1900), *[HY(f'outlet-{i}', 0, -106, 100 + i * 135, 36, 18, 8) for i in range(13)], B('mounting-tab-top', 0, 85, 1830, 180, 40, 90), B('mounting-tab-bottom', 0, 85, 80, 180, 40, 90), C('feed-connector', 0, 0, 0, 65, 38, 8)]
    if profile in {'floor-tile', 'floor-grille'}:
        parts = [B('tile-panel', 0, 0, 0, 600, 600, 45), B('edge-frame', 0, 0, 45, 590, 590, 22), *[C(f'pedestal-{i}', x, y, 0, 150, 32, 8) for i, (x, y) in enumerate([(-250, -250), (250, -250), (-250, 250), (250, 250)])]]
        if profile == 'floor-grille':
            parts += [*[B(f'air-slot-bar-{i}', -245 + i * 70, 0, 68, 30, 490, 14) for i in range(8)], C('lift-ring', 250, 250, 67, 20, 10, 8)]
        else:
            parts += [B('stringer-x', 0, 0, 145, 600, 28, 28), B('stringer-y', 0, 0, 145, 28, 600, 28), C('corner-fastener', -260, -260, 46, 15, 8, 8)]
        return parts
    if profile == 'grommet':
        return [B('floor-curb', 0, 0, 0, 440, 360, 55), B('split-collar-left', -72, 0, 55, 280, 80, 65), B('split-collar-right', 72, 0, 55, 280, 80, 65), C('cable-pass-ring', 0, 0, 55, 75, 85, 12), C('clamp-boss', -150, 0, 55, 45, 24, 8)]
    if profile in {'containment-door', 'containment-roof'}:
        if profile == 'containment-door':
            return [B('left-jamb', -620, 0, 0, 75, 100, 2250), B('right-jamb', 620, 0, 0, 75, 100, 2250), B('header', 0, 0, 2175, 1320, 100, 75), B('door-panel-left', -300, 0, 120, 500, 35, 1920), B('door-panel-right', 300, 0, 120, 500, 35, 1920), B('pull-handle', 0, -45, 950, 35, 60, 240), C('hinge-top', -590, 0, 1750, 65, 28, 8)]
        return [B('canopy-frame-front', 0, -700, 0, 1400, 65, 90), B('canopy-frame-rear', 0, 700, 0, 1400, 65, 90), B('canopy-left-beam', -670, 0, 0, 65, 1400, 90), B('canopy-right-beam', 670, 0, 0, 65, 1400, 90), *[B(f'roof-panel-{i}', -500 + i * 250, 0, 90, 235, 1320, 28) for i in range(5)], C('support-post-front', -650, -680, 0, 2200, 26, 8), C('support-post-rear', 650, 680, 0, 2200, 26, 8)]
    if profile == 'cabinet':
        w, d, h = 760 + (index % 3) * 90, 720 + (index % 4) * 60, 1680 + (index % 4) * 120
        return [B('base-plinth', 0, 0, 0, w + 80, d + 70, 100), B('cabinet-shell', 0, 0, 100, w, d, h - 100), B('front-door', 0, -d / 2 - 15, 165, w - 90, 30, h - 220), *[B(f'vent-louver-{i}', 0, -d / 2 - 34, 330 + i * 72, w * 0.42, 18, 24) for i in range(6)], B('operator-display', -w * 0.27, -d / 2 - 32, h * 0.72, 155, 24, 115), B('door-handle', w * 0.36, -d / 2 - 28, h * 0.43, 35, 30, 260), C('control-knob', -w * 0.27, -d / 2 - 56, h * 0.64, 38, 22, 8), C('cable-entry', 0, 0, 0, 70, 42, 10)]
    if profile == 'switchgear':
        parts = [B('lineup-base', 0, 0, 0, 2500, 900, 110)]
        for i in range(4):
            x = -900 + i * 600
            parts += [B(f'bay-{i}', x, 0, 110, 560, 820, 1950), B(f'breaker-door-{i}', x, -425, 280, 520, 30, 1350), B(f'instrument-panel-{i}', x, -450, 1680, 390, 25, 200), C(f'selector-{i}', x + 170, -485, 1710, 35, 18, 8)]
        return parts
    if profile == 'panelboard':
        return [B('wall-enclosure', 0, 0, 0, 760, 300, 1300), B('door', 0, -165, 90, 700, 32, 1120), B('interior-deadfront', 0, -188, 250, 560, 22, 780), *[B(f'breaker-row-{i}', 0, -210, 350 + i * 160, 460, 26, 105) for i in range(4)], C('cable-entry', 0, 0, 0, 65, 58, 10), C('door-latch', 300, -195, 650, 46, 24, 8)]
    if profile == 'transformer':
        return [B('base-frame', 0, 0, 0, 1200, 1000, 100), B('transformer-core', 0, 0, 100, 760, 680, 800), *[B(f'cooling-fin-{i}', -500 + i * 125, 0, 180, 48, 880, 620) for i in range(9)], *[C(f'terminal-bushing-{i}', -250 + i * 250, 0, 900, 190, 72, 10) for i in range(3)], B('terminal-cover', 0, 0, 1050, 930, 850, 60)]
    if profile == 'generator':
        return [B('skid', 0, 0, 0, 2600, 1150, 130), B('acoustic-canopy', 0, 0, 130, 2400, 1000, 1300), B('service-door-left', -700, -520, 260, 420, 35, 1040), B('service-door-right', 350, -520, 260, 420, 35, 1040), HX('engine-block', -120, 0, 440, 1450, 260, 12), HX('alternator', 700, 0, 440, 650, 310, 12), C('exhaust-stack', 900, 300, 1430, 400, 65, 10), C('service-filter', -800, 0, 1450, 220, 95, 10)]
    if profile == 'tank':
        return [B('support-skid', 0, 0, 0, 1050, 800, 100), C('reservoir', 0, 0, 100, 1050, 370, 12), C('fill-neck', 0, 0, 1150, 130, 65, 10), C('level-gauge', 330, -250, 760, 450, 38, 8), B('access-platform', 0, 0, 1100, 740, 560, 45), C('drain-valve', 0, -430, 120, 140, 35, 8)]
    if profile == 'pedestal':
        return [B('base-plate', 0, 0, 0, 460, 460, 80), B('riser', 0, 0, 80, 180, 180, 1020), B('meter-head', 0, 0, 1100, 520, 380, 500), B('display-window', 0, -205, 1320, 280, 30, 160), B('service-door', 0, 205, 460, 420, 30, 520), C('cable-port', 0, 0, 0, 65, 52, 8)]
    if profile == 'epo':
        return [B('back-plate', 0, 0, 0, 320, 85, 420), B('control-body', 0, -65, 60, 250, 150, 300), B('guard-hood', 0, -140, 185, 260, 55, 185), C('actuator-base', 0, -165, 140, 115, 82, 10), C('push-button', 0, -165, 235, 70, 58, 10), B('label-panel', 0, -155, 325, 220, 28, 46)]
    if profile in {'cooler', 'chiller', 'tower', 'cdu'}:
        if profile == 'cooler':
            return [B('base-plinth', 0, 0, 0, 900, 900, 90), B('cooler-cabinet', 0, 0, 90, 820, 820, 1900), *[B(f'intake-louver-{i}', 0, -430, 220 + i * 125, 610, 26, 54) for i in range(10)], C('top-fan-left', -220, 160, 1990, 75, 165, 12), C('top-fan-right', 220, 160, 1990, 75, 165, 12), HY('pipe-stub-supply', 0, 470, 460, 130, 72, 10), HY('pipe-stub-return', 0, 470, 680, 130, 72, 10)]
        if profile == 'chiller':
            return [B('chiller-skid', 0, 0, 0, 3200, 1500, 130), B('coil-bank-left', -1050, 0, 130, 850, 1350, 700), B('coil-bank-right', 1050, 0, 130, 850, 1350, 700), *[C(f'condenser-fan-{i}', -1100 + (i % 3) * 1100, -400 + (i // 3) * 800, 830, 65, 210, 12) for i in range(6)], B('compressor-cover', 0, 0, 130, 900, 1100, 580), C('refrigerant-port', 0, 620, 220, 115, 55, 10)]
        if profile == 'tower':
            return [B('basin', 0, 0, 0, 1800, 1500, 300), B('fill-pack', 0, 0, 300, 1450, 1200, 900), *[B(f'frame-post-{i}', x, y, 300, 85, 85, 1500) for i, (x, y) in enumerate([(-780, -630), (780, -630), (-780, 630), (780, 630)])], B('fan-deck', 0, 0, 1800, 1800, 1500, 100), C('fan-stack', 0, 0, 1900, 220, 420, 12), C('water-riser', 650, 0, 300, 1500, 55, 10)]
        return [B('cdu-skid', 0, 0, 0, 1450, 850, 100), B('cdu-cabinet', 0, 0, 100, 1200, 760, 1600), B('service-door', 0, -395, 220, 800, 30, 1380), *[B(f'heat-exchanger-plate-{i}', -280 + i * 80, 120, 420, 38, 450, 800) for i in range(8)], HY('supply-connection', 0, 445, 520, 180, 78, 10), HY('return-connection', 0, 445, 840, 180, 78, 10), C('pump-motor', 430, 120, 450, 310, 125, 10)]
    if profile == 'manifold':
        return [B('support-base-left', -700, 0, 0, 180, 500, 80), B('support-base-right', 700, 0, 0, 180, 500, 80), HY('supply-header', 0, 0, 650, 1700, 85, 12), HY('return-header', 0, 0, 350, 1700, 85, 12), *[C(f'branch-drop-{i}', -600 + i * 300, 0, 150, 500, 38, 8) for i in range(5)], *[C(f'branch-valve-{i}', -600 + i * 300, -110, 480, 90, 52, 8) for i in range(5)]]
    if profile == 'rear-door':
        return [B('door-frame', 0, 0, 0, 760, 110, 2100), B('heat-exchanger-panel', 0, -80, 160, 660, 55, 1760), *[HY(f'tube-run-{i}', 0, -120, 260 + i * 180, 610, 22, 8) for i in range(9)], B('hinge-left', -410, 0, 150, 65, 160, 1750), B('hinge-right', 410, 0, 150, 65, 160, 1750), C('inlet-port', -300, 0, 80, 140, 55, 10), C('outlet-port', 300, 0, 80, 140, 55, 10)]
    if profile == 'header':
        return [B('hanger-left', -800, 0, 0, 110, 520, 420), B('hanger-right', 800, 0, 0, 110, 520, 420), HY('supply-main', 0, 0, 360, 1900, 65, 10), HY('return-main', 0, 0, 200, 1900, 65, 10), *[C(f'branch-drop-{i}', -700 + i * 350, 0, 150, 260, 30, 8) for i in range(5)], *[B(f'pipe-clamp-{i}', -700 + i * 350, 0, 415, 100, 200, 35) for i in range(5)]]
    if profile == 'pump-skid':
        return [B('base-skid', 0, 0, 0, 1900, 850, 110), *[B(f'motor-{i}', -480 + i * 960, 0, 110, 520, 430, 430) for i in range(2)], *[HX(f'pump-body-{i}', -480 + i * 960, -240, 360, 600, 170, 10) for i in range(2)], HY('suction-header', 0, 0, 225, 1700, 65, 10), HY('discharge-header', 0, 0, 620, 1700, 65, 10), *[C(f'pipe-support-{i}', -500 + i * 1000, 0, 110, 270, 35, 8) for i in range(2)]]
    if profile == 'heat-exchanger':
        return [B('support-skid', 0, 0, 0, 1100, 720, 100), B('plate-stack', 0, 0, 100, 650, 560, 930), *[B(f'plate-{i}', -290 + i * 42, 0, 160, 24, 540, 820) for i in range(14)], B('fixed-frame', -400, 0, 90, 85, 700, 1030), B('pressure-frame', 400, 0, 90, 85, 700, 1030), HY('inlet-flange', 0, -390, 300, 130, 80, 10), HY('outlet-flange', 0, 390, 680, 130, 80, 10)]
    if profile == 'plenum':
        return [B('duct-body', 0, 0, 240, 1500, 900, 650), B('service-panel', 0, -465, 300, 700, 30, 480), *[B(f'support-leg-{i}', x, y, 0, 90, 90, 240) for i, (x, y) in enumerate([(-650, -350), (650, -350), (-650, 350), (650, 350)])], C('branch-collar', 0, 0, 890, 360, 210, 12), B('hanger-strap-left', -520, 0, 810, 50, 1050, 80), B('hanger-strap-right', 520, 0, 810, 50, 1050, 80)]
    if profile == 'sensor':
        return [B('mount-plate', 0, 0, 0, 210, 210, 35), B('mast', 0, 0, 35, 48, 48, 920), B('sensor-head', 0, 0, 955, 220, 155, 220), C('vent-cap', 0, 0, 1175, 80, 95, 10), C('probe-tip', 0, -90, 915, 120, 22, 8)]
    if profile == 'leak':
        return [B('monitor-box', 0, 0, 0, 460, 300, 250), B('control-face', 0, -160, 40, 400, 24, 170), C('probe-terminal-left', -120, -190, 130, 65, 30, 8), C('probe-terminal-right', 120, -190, 130, 65, 30, 8), B('floor-sensor-puck', 420, 0, 0, 180, 180, 40), HY('sensor-cable', 250, 0, 25, 500, 14, 8)]
    if profile == 'fire-bank':
        return [B('cylinder-rack-base', 0, 0, 0, 1800, 640, 100), B('upper-restraint', 0, 0, 1320, 1780, 100, 90), B('lower-restraint', 0, 0, 420, 1780, 100, 90), *[C(f'agent-cylinder-{i}', -700 + i * 350, 0, 100, 1250, 125, 12) for i in range(5)], HY('manifold-header', 0, -280, 1320, 1600, 52, 10), *[C(f'valve-cap-{i}', -700 + i * 350, -280, 1372, 100, 42, 8) for i in range(5)]]
    if profile == 'camera':
        return [B('mounting-base', 0, 0, 0, 300, 300, 55), C('mast', 0, 0, 55, 950, 48, 8), HX('camera-housing', 0, -30, 1030, 330, 82, 10), B('sunshield', 0, -30, 1110, 380, 200, 26), C('lens-barrel', 0, -190, 1030, 135, 45, 10), B('bracket', 0, 0, 880, 220, 110, 45)]
    raise ValueError(f'unknown profile {profile}')


def low_surface(part):
    kind, _name, *args = part
    return args[2] if kind in {'box', 'cylinder'} else args[2] - args[4]


def source_for(asset_id, title, description, color, profile, index):
    parts = parts_for(profile, index)
    base_z = min(low_surface(part) for part in parts)
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original generic data-center scene prop, millimetres, Z up, base at z = 0.',
        '', 'meta({',
        f'  name: {json.dumps(asset_id)},',
        "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(description + " Knobs: overall scale and asset color.")},',
        "  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],",
        f"  kit: '{KIT_ID}',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],",
        '  triangleBudget: 2200,',
        '});', '',
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
    helpers = {'box': 'b', 'cylinder': 'c', 'horizontal-x': 'hx', 'horizontal-y': 'hy'}
    for part in parts:
        kind, name, *args = part
        lines.append(f'p.part({json.dumps(name)}, {helpers[kind]}({", ".join(map(str, args))}).color(color));')
    lines.extend(['', 'return p.model();', ''])
    return '\n'.join(lines)


def generate_assets() -> None:
    ids = [row[0] for row in ASSETS]
    if len(ids) != len(set(ids)):
        raise ValueError('duplicate data-center asset ids')
    if any(row[4] == '' for row in ASSETS):
        raise ValueError('each data-center asset needs a geometry profile')
    existing = ROOT / 'catalog' / 'index.json'
    if existing.exists():
        existing_ids = {row['id'] for row in json.loads(existing.read_text())['assets']}
        collisions = sorted(existing_ids.intersection(ids))
        if collisions:
            raise ValueError(f'asset ids already exist: {collisions}')

    KIT.joinpath('kit.json').write_text(json.dumps({
        'title': 'Data-center infrastructure',
        'description': 'Original generic props for IT racks, power distribution, thermal management, containment, monitoring, and facility safety.',
    }, indent=2) + '\n')
    for index, spec in enumerate(ASSETS):
        asset_id, title, description, color, profile = spec
        (KIT / f'{asset_id}.kcad.ts').write_text(source_for(*spec, index))

    settings = {
        'kit': KIT_ID,
        'generatedOn': '2026-11-03',
        'assetCount': len(ASSETS),
        'sourceCommand': 'python3 artifacts/catalog-demos/data-center-wave-20261103/generate_data_center_assets.py',
        'catalogCommand': 'npx tsx scripts/buildAssetCatalog.ts',
        'previewCommand': 'npx tsx scripts/renderCatalogPreviews.ts',
        'knobs': {'scale': {'default': 1, 'min': 0.7, 'max': 1.3, 'step': 0.05}, 'color': 'asset-specific hex color'},
        'triangleBudget': 2200,
        'materialCount': 1,
        'verificationScope': {
            'covered': ['local source and index', 'low-poly mesh export', 'triangle and material audit', 'catalog integration suite', 'preview files and URLs', 'local generated catalog pages', 'current public website snapshot', 'built npm tarball contents'],
            'notCovered': ['deployed behavior for this branch', 'data-center capacity or reliability', 'power and cooling engineering', 'safety certification', 'site suitability', 'physical acceptance'],
        },
        'assets': [{'id': row[0], 'title': row[1], 'profile': row[4]} for row in ASSETS],
    }
    bundle = ROOT / 'artifacts' / 'catalog-demos' / 'data-center-wave-20261103'
    bundle.mkdir(parents=True, exist_ok=True)
    (bundle / 'settings.json').write_text(json.dumps(settings, indent=2) + '\n')
    print(f'generated {len(ASSETS)} assets in {KIT}')


if __name__ == '__main__':
    generate_assets()
