#!/usr/bin/env python3
"""Generate original, generic low-poly EV charging infrastructure props."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT_ID = 'ev-charging-infrastructure'
KIT = ROOT / 'catalog' / 'kits' / KIT_ID


ASSETS = [
    ('home-ac-wallbox', 'Home AC wallbox', 'Compact wall-mounted AC charger with a status screen, cable hook, and mounting plate.', '#65747b', 'wallbox'),
    ('dual-outlet-wallbox', 'Dual-outlet wallbox', 'Workplace wall charger with two cable outlets, paired status windows, and mounting rails.', '#576d77', 'dual-wallbox'),
    ('curbside-ac-charger-post', 'Curbside AC charger post', 'Slim public AC post with a readable front panel, paired cable ports, and a broad base.', '#526973', 'ac-post'),
    ('destination-charging-pedestal', 'Destination charging pedestal', 'Parking-lot charger pedestal with a sheltered display head and side cable holsters.', '#617578', 'destination-pedestal'),
    ('streetlight-charger-arm', 'Streetlight charger arm', 'Streetlight pole with a compact charging head, side arm, and grounded base collar.', '#6d7774', 'streetlight-charger'),
    ('ac-charging-bollard', 'AC charging bollard', 'Short protective charging post with an inset status panel and a pair of plug holders.', '#7b6956', 'ac-bollard'),
    ('dual-port-ac-pedestal', 'Dual-port AC pedestal', 'Twin-sided AC pedestal with two front panels and two hanging cable leads.', '#60757a', 'dual-ac-pedestal'),
    ('curbside-lamp-charger', 'Curbside lamp charger', 'Short area-light mast with an integrated side-mounted charger and compact light head.', '#6c7773', 'lamp-charger'),
    ('compact-dc-fast-charger', 'Compact DC fast charger', 'Floor-standing DC charger with a front display, service door, and paired charging leads.', '#536c77', 'compact-dc'),
    ('dual-connector-dc-dispenser', 'Dual-connector DC dispenser', 'Public DC charging dispenser with two plug cradles, a central status display, and cable loops.', '#536a75', 'dual-dispenser'),
    ('high-power-charge-dispenser', 'High-power charge dispenser', 'Tall high-power dispenser with a broad screen, paired cable outlets, and service plinth.', '#394f5a', 'high-power-dispenser'),
    ('remote-charger-power-cabinet', 'Remote charger power cabinet', 'Outdoor power cabinet with divided service doors, top vent slots, and cable-entry base.', '#6b7574', 'power-cabinet'),
    ('modular-charger-power-stack', 'Modular charger power stack', 'Stacked converter modules with repeated front drawers, service handles, and a base frame.', '#68777a', 'module-stack'),
    ('outdoor-charger-switchboard', 'Outdoor charger switchboard', 'Site switchboard enclosure with adjacent electrical bays, instrument windows, and cable glands.', '#737a70', 'switchboard'),
    ('fleet-depot-dc-dispenser', 'Fleet depot DC dispenser', 'Fleet charger post with twin high-reach cables, overhead cable guides, and a reinforced foot.', '#5b6870', 'fleet-dispenser'),
    ('bus-depot-pantograph-post', 'Bus depot pantograph post', 'Tall depot mast with an offset beam and a suspended charging-head support.', '#6b7470', 'pantograph-post'),
    ('overhead-pantograph-head', 'Overhead pantograph head', 'Compact overhead charging head with contact bar, hinge blocks, and a mounting yoke.', '#5e6d70', 'pantograph-head'),
    ('mobile-fast-charge-cart', 'Mobile fast-charge cart', 'Portable charging cart with a compact power enclosure, cable reel, handle, and casters.', '#667570', 'mobile-cart'),
    ('ccs-combo-2-connector', 'CCS Combo 2 connector', 'Generic CCS Combo 2 plug body with a shaped grip, strain relief, and cable tail.', '#424f55', 'connector-ccs2'),
    ('ccs-combo-1-connector', 'CCS Combo 1 connector', 'Generic CCS Combo 1 plug body with a broad grip shell, lower contact block, and cable tail.', '#4a555b', 'connector-ccs1'),
    ('nacs-connector', 'NACS connector', 'Compact generic NACS plug with a tapered nose, grip ribs, and flexible cable stub.', '#39464b', 'connector-nacs'),
    ('chademo-connector', 'CHAdeMO connector', 'Generic CHAdeMO plug with a rounded hand shell, broad coupling nose, and cable strain relief.', '#4c565a', 'connector-chademo'),
    ('j1772-ac-connector', 'J1772 AC connector', 'Generic J1772 AC plug with a short tapered nose, hand grip, and rear cable stub.', '#555c5e', 'connector-j1772'),
    ('coiled-charging-cable-reel', 'Coiled charging cable reel', 'Wall-mounted cable reel with side plates, a central drum, and a guided cable outlet.', '#596b70', 'cable-reel'),
    ('liquid-cooled-charging-cable', 'Liquid-cooled charging cable', 'Thick high-current cable segment with cooling-line collars and a reinforced connector end.', '#4c6269', 'cooled-cable'),
    ('overhead-cable-management-boom', 'Overhead cable management boom', 'Pedestal-mounted swing arm with a hanging cable guide and balancing weight.', '#68736d', 'cable-boom'),
    ('charger-cable-retractor', 'Charger cable retractor', 'Compact overhead retractor body with an arm, pulley housing, and vertical cable drop.', '#626f70', 'cable-retractor'),
    ('charger-cable-holster-bollard', 'Cable holster bollard', 'Protective post with a raised connector cradle, cable loop, and heavy base plate.', '#777263', 'holster-bollard'),
    ('wall-mounted-connector-holster', 'Wall-mounted connector holster', 'Mounting plate and open-front plug cradle for a parked charging connector.', '#5d6c70', 'wall-holster'),
    ('parking-cable-protection-ramp', 'Parking cable protection ramp', 'Low-profile cable bridge with two raised covers, end slopes, and ground anchors.', '#6a6e68', 'cable-ramp'),
    ('ev-service-disconnect-cabinet', 'EV service disconnect cabinet', 'Outdoor service disconnect with a guarded handle, meter window, and lower cable entry.', '#6e756e', 'disconnect-cabinet'),
    ('ev-metering-pedestal', 'EV metering pedestal', 'Utility metering post with a meter head, service panel, and protective plinth.', '#65716f', 'meter-pedestal'),
    ('ev-site-distribution-panel', 'EV site distribution panel', 'Multi-bay panelboard with grouped breaker doors, indicator windows, and conduit stubs.', '#707873', 'distribution-panel'),
    ('site-energy-management-controller', 'Site energy management controller', 'Wall enclosure with a control screen, antenna pair, and cable glands.', '#55676b', 'energy-controller'),
    ('charging-payment-terminal', 'Charging payment terminal', 'Public payment pedestal with a raised display, keypad panel, and card reader slot.', '#495d66', 'payment-terminal'),
    ('rfid-access-reader-pedestal', 'RFID access reader pedestal', 'Short access pedestal with a reader face, indicator cap, and bolted floor plate.', '#566b70', 'rfid-pedestal'),
    ('charger-status-display-post', 'Charger status display post', 'Wayfinding-height display post with a framed status screen and a slim base.', '#586c71', 'status-post'),
    ('ev-emergency-stop-station', 'EV emergency-stop station', 'Protected emergency control post with an overhanging guard and prominent actuator.', '#a3443d', 'emergency-stop'),
    ('charger-load-management-panel', 'Charger load-management panel', 'Wall panel with a central controller display, service door, and connection terminals.', '#68746f', 'load-panel'),
    ('overhead-cable-balance-arm', 'Overhead cable balance arm', 'Support mast and balanced arm routing two charging leads above a parking bay.', '#69766f', 'balance-arm'),
    ('fleet-charging-canopy', 'Fleet charging canopy', 'Open fleet shelter with repeated charger bays, roof frame, and protective corner posts.', '#6e7770', 'fleet-canopy'),
    ('solar-ev-carport', 'Solar EV carport', 'Parking shelter with tilted panel rows, long-span rafters, and paired support frames.', '#526d73', 'solar-carport'),
    ('charger-canopy-column-base', 'Charger canopy column base', 'Steel column shoe with anchor plates, gussets, and a tall support post.', '#74776e', 'canopy-base'),
    ('charging-island-plinth', 'Charging island plinth', 'Raised site island with two charger mounting pads, edge curb, and corner markers.', '#85827a', 'charging-plinth'),
    ('parking-wheel-stop', 'Parking wheel stop', 'Low parking barrier with beveled ends and recessed anchor locations.', '#766d5d', 'wheel-stop'),
    ('ev-parking-bay-sign', 'EV parking bay sign', 'Single-post parking sign with a rectangular face plate and a broad ground socket.', '#5f756e', 'bay-sign'),
    ('charging-station-direction-sign', 'Charging station direction sign', 'Roadside direction sign with a two-panel face, support post, and ground sleeve.', '#64756c', 'direction-sign'),
    ('ev-charger-protection-bollard', 'Charger protection bollard', 'Heavy tubular guard post with a protective cap and square anchor plate.', '#9d6943', 'protection-bollard'),
    ('battery-buffer-charger-container', 'Battery-buffer charger container', 'Containerized buffer cabinet with access doors, vent banks, and a cable service side.', '#66716b', 'buffer-container'),
    ('vehicle-to-grid-power-cabinet', 'Vehicle-to-grid power cabinet', 'Bidirectional power cabinet with converter bays, a control window, and bus-cable exits.', '#5c6d71', 'v2g-cabinet'),
]


def B(name, x, y, z, w, d, h):
    return ('box', name, x, y, z, w, d, h)


def C(name, x, y, z, h, r, segments=10):
    return ('cylinder', name, x, y, z, h, r, segments)


def HX(name, x, y, z, length, radius, segments=8):
    return ('horizontal-x', name, x, y, z, length, radius, segments)


def HY(name, x, y, z, length, radius, segments=8):
    return ('horizontal-y', name, x, y, z, length, radius, segments)


def cabinet(width, depth, height, *, screen=True, vents=4, doors=1, base=True):
    parts = [B('main-enclosure', 0, 0, 90 if base else 0, width, depth, height)]
    z0 = 90 if base else 0
    if base:
        parts.append(B('base-plinth', 0, 0, 0, width + 55, depth + 40, 90))
    parts.append(B('top-cap', 0, 0, z0 + height, width + 24, depth + 24, 22))
    if doors > 1:
        for i in range(doors):
            x = (i - (doors - 1) / 2) * width / doors
            parts.append(B(f'door-seam-{i + 1}', x, -depth / 2 - 3, z0 + 65, 5, 8, height - 120))
    else:
        parts.append(B('front-door', 0, -depth / 2 - 3, z0 + 65, width - 26, 8, height - 120))
    if screen:
        parts += [
            B('display-bezel', 0, -depth / 2 - 12, z0 + height * 0.68, width * 0.46, 22, height * 0.17),
            B('display-window', 0, -depth / 2 - 25, z0 + height * 0.69, width * 0.39, 7, height * 0.125),
            C('status-button', width * 0.34, -depth / 2 - 28, z0 + height * 0.48, 18, 12, 8),
        ]
    for i in range(vents):
        z = z0 + height * (0.2 + 0.075 * i)
        parts.append(B(f'vent-slot-{i + 1}', 0, -depth / 2 - 8, z, width * 0.58, 12, 12))
    return parts


def connector(kind):
    sizes = {
        'connector-ccs2': (112, 110, 132, 92, 80),
        'connector-ccs1': (118, 112, 128, 96, 84),
        'connector-nacs': (94, 94, 112, 74, 68),
        'connector-chademo': (128, 120, 142, 104, 92),
        'connector-j1772': (98, 92, 118, 82, 70),
    }
    w, d, h, nose, grip = sizes[kind]
    parts = [
        B('hand-grip', 0, 15, 0, w, d, h),
        B('front-coupling', 0, -d / 2 - 32, h * 0.22, w * 0.78, 64, h * 0.58),
        HY('connector-nose', 0, -d / 2 - nose / 2 - 20, h * 0.5, nose, w * 0.28, 10),
        HY('strain-relief', 0, d / 2 + 46, h * 0.5, 92, grip * 0.32, 8),
        HY('cable-stub', 0, d / 2 + 145, h * 0.5, 210, grip * 0.21, 8),
        B('grip-ridge-top', 0, 12, h + 10, w * 0.64, d * 0.46, 15),
    ]
    if kind in {'connector-ccs2', 'connector-ccs1', 'connector-chademo'}:
        parts.append(B('lower-contact-block', 0, -d / 2 - 22, 0, w * 0.62, 50, 42))
    return parts


def parts_for(profile, index):
    if profile == 'wallbox':
        return [B('mounting-plate', 0, 100, 0, 340, 28, 620), *cabinet(310, 210, 520, vents=3, base=False), HY('cable-hook', 220, 30, 155, 80, 24), B('side-holster', 195, -40, 90, 42, 100, 130)]
    if profile == 'dual-wallbox':
        return [B('mounting-rail', 0, 105, 0, 460, 30, 720), *cabinet(420, 220, 590, vents=3, base=False), B('second-display-bezel', 125, -132, 470, 100, 22, 90), HY('left-holster', -250, -15, 95, 90, 28), HY('right-holster', 250, -15, 95, 90, 28)]
    if profile in {'ac-post', 'destination-pedestal', 'ac-bollard', 'dual-ac-pedestal', 'status-post'}:
        widths = {'ac-post': 300, 'destination-pedestal': 360, 'ac-bollard': 290, 'dual-ac-pedestal': 420, 'status-post': 330}
        heights = {'ac-post': 1550, 'destination-pedestal': 1650, 'ac-bollard': 920, 'dual-ac-pedestal': 1700, 'status-post': 1780}
        w, h = widths[profile], heights[profile]
        parts = [B('ground-plate', 0, 0, 0, w + 150, 320, 40), B('pedestal-column', 0, 0, 40, w * 0.55, 240, h - 80)]
        parts += cabinet(w, 240, 380 if profile == 'ac-bollard' else 520, vents=2, base=False)
        parts += [B('head-cap', 0, 0, h - 40, w + 40, 300, 45), HY('left-connector-cradle', -w * 0.67, -30, 300, 105, 30), HY('right-connector-cradle', w * 0.67, -30, 300, 105, 30)]
        if profile == 'dual-ac-pedestal':
            parts.extend([B('rear-control-panel', 0, 135, 650, w * 0.78, 20, 410), HY('left-cable', -280, -120, 260, 650, 16), HY('right-cable', 280, -120, 260, 650, 16)])
        elif profile != 'status-post':
            parts.extend([HY('cable-tail', 220, -170, 220, 480, 18), HY('cable-tail-second', -220, -170, 220, 450, 16)])
        return parts
    if profile in {'streetlight-charger', 'lamp-charger'}:
        height = 3900 if profile == 'streetlight-charger' else 3100
        parts = [C('mast-base', 0, 0, 0, 360, 135, 10), C('lamp-mast', 0, 0, 330, height - 420, 54, 10), HX('light-arm', 90, 0, height - 120, 710, 40, 8), B('light-head', 430, 0, height - 250, 260, 240, 110), B('charger-box', -95, -95, 900, 240, 210, 580), B('charger-screen', -95, -208, 1260, 170, 18, 130), HY('cable-holster', 25, -210, 890, 80, 26)]
        return parts
    if profile in {'compact-dc', 'dual-dispenser', 'high-power-dispenser', 'fleet-dispenser'}:
        dims = {'compact-dc': (610, 460, 1740), 'dual-dispenser': (560, 390, 1880), 'high-power-dispenser': (760, 500, 2040), 'fleet-dispenser': (640, 430, 1900)}
        w, d, h = dims[profile]
        parts = cabinet(w, d, h - 120, vents=5, doors=2 if profile == 'high-power-dispenser' else 1)
        parts += [B('roof-visor', 0, -d * 0.15, h - 30, w + 80, d + 80, 42), HY('left-connector-cradle', -w * 0.58, -d / 2 - 70, 470, 130, 38), HY('right-connector-cradle', w * 0.58, -d / 2 - 70, 470, 130, 38)]
        parts += [HY('left-charging-cable', -w * 0.58, -d / 2 - 270, 260, 650, 22), HY('right-charging-cable', w * 0.58, -d / 2 - 270, 260, 650, 22)]
        return parts
    if profile in {'power-cabinet', 'switchboard', 'disconnect-cabinet', 'distribution-panel', 'load-panel', 'v2g-cabinet'}:
        dims = {'power-cabinet': (1150, 620, 2060), 'switchboard': (1680, 730, 2200), 'disconnect-cabinet': (820, 480, 1820), 'distribution-panel': (1420, 600, 2050), 'load-panel': (680, 260, 960), 'v2g-cabinet': (1040, 560, 1980)}
        w, d, h = dims[profile]
        parts = cabinet(w, d, h - 120, screen=profile != 'power-cabinet', vents=5, doors=3 if profile in {'switchboard', 'distribution-panel'} else 2)
        parts += [B('cable-entry-skirt', 0, 0, 30, w * 0.82, d * 0.9, 90), C('ground-terminal', w * 0.35, 0, 25, 50, 28, 8)]
        if profile == 'disconnect-cabinet':
            parts += [B('handle-guard', 250, -d / 2 - 20, 800, 95, 35, 270), C('disconnect-handle', 250, -d / 2 - 50, 925, 35, 22, 8)]
        if profile in {'switchboard', 'distribution-panel'}:
            parts += [C('conduit-left', -w * 0.35, 0, 0, 210, 38, 8), C('conduit-right', w * 0.35, 0, 0, 210, 38, 8)]
        return parts
    if profile in {'module-stack', 'energy-controller', 'payment-terminal', 'rfid-pedestal', 'emergency-stop'}:
        if profile == 'module-stack':
            parts = [B('base-frame', 0, 0, 0, 920, 660, 100)]
            for i in range(4):
                z = 100 + i * 405
                parts += [B(f'power-module-{i + 1}', 0, 0, z, 840, 600, 365), B(f'module-front-{i + 1}', 0, -310, z + 35, 790, 24, 295), B(f'module-handle-{i + 1}', 280, -340, z + 180, 105, 32, 35)]
            return parts
        if profile == 'energy-controller':
            return [B('mounting-plate', 0, 45, 0, 560, 30, 780), *cabinet(510, 300, 730, vents=2, base=False), C('antenna-left', -180, 80, 770, 330, 18, 8), C('antenna-right', 180, 80, 770, 330, 18, 8), B('cable-gland-strip', 0, -20, 20, 420, 70, 80)]
        if profile == 'payment-terminal':
            return [B('terminal-base', 0, 0, 0, 440, 420, 65), B('support-column', 0, 0, 65, 190, 180, 970), B('screen-bezel', 0, -106, 830, 300, 45, 260), B('screen-window', 0, -133, 870, 250, 12, 180), B('keypad-panel', 0, -108, 550, 250, 44, 160), B('card-slot', 130, -140, 490, 84, 20, 35), C('contactless-reader', -120, -142, 470, 22, 35, 8), B('weather-hood', 0, -100, 1100, 370, 290, 48)]
        if profile == 'rfid-pedestal':
            return [B('base-plate', 0, 0, 0, 360, 360, 42), B('post', 0, 0, 42, 180, 170, 900), B('reader-face', 0, -105, 700, 250, 38, 220), B('reader-window', 0, -129, 740, 170, 12, 105), C('status-lamp', 0, -145, 620, 30, 26, 8), B('cap', 0, 0, 942, 230, 210, 38)]
        return [B('ground-plate', 0, 0, 0, 420, 420, 50), B('control-post', 0, 0, 50, 230, 230, 1050), B('guard-hood', 0, -145, 930, 330, 130, 170), C('actuator-base', 0, -220, 620, 100, 80, 10), C('stop-actuator', 0, -235, 700, 52, 54, 10), B('label-frame', 0, -130, 835, 160, 18, 54)]
    if profile == 'pantograph-post':
        return [C('foundation', 0, 0, 0, 260, 190, 10), C('support-mast', 0, 0, 250, 5300, 88, 10), HX('cantilever-beam', 520, 0, 5050, 1360, 62, 8), C('beam-stay', -80, 0, 4740, 480, 32, 8), B('head-mount', 1090, 0, 4790, 280, 350, 220), B('contact-head', 1270, 0, 4600, 740, 420, 210), HX('contact-bar', 1270, -170, 4560, 680, 26, 8), C('hinge-pin', 1010, 0, 4730, 210, 48, 8)]
    if profile == 'pantograph-head':
        return [B('mounting-yoke-left', -270, 0, 0, 90, 320, 330), B('mounting-yoke-right', 270, 0, 0, 90, 320, 330), B('head-housing', 0, 0, 120, 840, 460, 320), HX('contact-rail', 0, -250, 75, 770, 34, 8), C('pivot-left', -300, 0, 310, 90, 48, 8), C('pivot-right', 300, 0, 310, 90, 48, 8), B('cover-panel', 0, 0, 450, 720, 350, 50)]
    if profile == 'mobile-cart':
        parts = [B('cart-chassis', 0, 0, 180, 820, 600, 90), *cabinet(650, 510, 1160, vents=4, base=False), C('left-wheel', -300, -360, 30, 95, 68, 10), C('right-wheel', 300, -360, 30, 95, 68, 10), HX('push-handle', 0, 350, 1070, 520, 30), HY('cable-reel', 0, 360, 460, 160, 110), HY('cable-tail', 0, 530, 440, 440, 20)]
        return parts
    if profile.startswith('connector-'):
        return connector(profile)
    if profile == 'cable-reel':
        return [B('wall-mount-plate', 0, 60, 0, 450, 60, 600), HY('drum-axle', 0, 0, 320, 350, 56), C('spool-core', 0, 0, 180, 280, 148, 12), HY('spool-left-flange', 0, -190, 320, 28, 260), HY('spool-right-flange', 0, 190, 320, 28, 260), HY('cable-outlet-guide', 0, -280, 90, 220, 35), HY('cable-tail', 0, -420, 90, 500, 18)]
    if profile == 'cooled-cable':
        return [HY('main-cable', 0, 0, 42, 1900, 34), HY('coolant-line-a', -48, 0, 42, 1780, 12), HY('coolant-line-b', 48, 0, 42, 1780, 12), B('connector-shell', 0, -1120, 15, 180, 270, 145), B('strain-guard', 0, 970, 0, 115, 130, 100), *[HY(f'coolant-collar-{i}', 0, -650 + i * 325, 58, 34, 52) for i in range(5)]]
    if profile in {'cable-boom', 'cable-retractor', 'balance-arm'}:
        height = 2850 if profile != 'balance-arm' else 3400
        parts = [B('base-plate', 0, 0, 0, 520, 460, 60), C('support-mast', 0, 0, 60, height - 140, 64, 10), HX('swing-arm', 390, 0, height - 180, 1040, 46), C('arm-pivot', 0, 0, height - 230, 240, 78, 10)]
        if profile == 'cable-retractor':
            parts += [B('retractor-housing', 820, 0, height - 330, 340, 280, 200), C('pulley', 820, -180, height - 405, 90, 78, 8), HY('hanging-cable', 820, -260, 800, 1000, 18)]
        elif profile == 'balance-arm':
            parts += [HX('balance-counterweight', -220, 0, height - 180, 360, 75), B('cable-guide', 760, 0, height - 350, 210, 150, 90), HY('left-cable-drop', 690, -90, 950, 1150, 18), HY('right-cable-drop', 920, -90, 950, 1150, 18)]
        else:
            parts += [B('cable-guide', 790, 0, height - 360, 220, 180, 90), HY('hanging-cable', 790, -130, 900, 1000, 18), C('balance-weight', 540, 0, height - 500, 150, 86, 8)]
        return parts
    if profile == 'holster-bollard':
        return [C('anchor-foot', 0, 0, 0, 85, 170, 10), C('bollard-post', 0, 0, 80, 1050, 88, 10), C('cap', 0, 0, 1125, 90, 98, 10), B('cradle-support', 130, -80, 670, 290, 100, 65), B('connector-cradle', 155, -180, 690, 190, 95, 180), HY('cable-guide', -120, -120, 570, 120, 32)]
    if profile == 'wall-holster':
        return [B('mounting-plate', 0, 25, 0, 280, 40, 340), B('cradle-back', 0, -30, 65, 210, 70, 190), B('cradle-left', -92, -95, 65, 38, 130, 190), B('cradle-right', 92, -95, 65, 38, 130, 190), B('cradle-lip', 0, -120, 62, 200, 32, 42), HY('cable-hook', 0, -165, 38, 120, 20)]
    if profile == 'cable-ramp':
        return [B('ramp-base', 0, 0, 0, 1240, 360, 68), B('cover-left', -320, 0, 68, 510, 240, 82), B('cover-right', 320, 0, 68, 510, 240, 82), B('center-divider', 0, 0, 68, 65, 360, 34), B('end-slope-left', -610, 0, 0, 110, 360, 82), B('end-slope-right', 610, 0, 0, 110, 360, 82), C('anchor-left', -520, 0, 0, 75, 28, 8), C('anchor-right', 520, 0, 0, 75, 28, 8)]
    if profile == 'meter-pedestal':
        return [B('base-skirt', 0, 0, 0, 460, 390, 110), B('pedestal-body', 0, 0, 110, 350, 290, 1040), B('meter-head', 0, 0, 1150, 440, 360, 500), B('meter-window', 0, -190, 1320, 270, 32, 205), C('meter-dial', 0, -214, 1430, 28, 56, 10), B('service-door', 0, -158, 350, 265, 25, 390), C('cable-riser', 0, 0, 0, 250, 48, 8)]
    if profile == 'fleet-canopy':
        parts = [B('left-column-front', -1900, -620, 0, 150, 150, 3600), B('left-column-rear', -1900, 620, 0, 150, 150, 3600), B('right-column-front', 1900, -620, 0, 150, 150, 3600), B('right-column-rear', 1900, 620, 0, 150, 150, 3600), B('front-rafter', 0, -620, 3600, 4100, 1250, 130), B('rear-rafter', 0, 620, 3600, 4100, 1250, 130), HX('roof-spine', 0, 0, 3730, 4300, 82), *[B(f'bay-divider-{i}', -1550 + i * 1030, 0, 0, 38, 1400, 2400) for i in range(4)]]
        for i in range(4):
            x = -1500 + i * 1000
            parts += [B(f'charger-post-{i + 1}', x, 0, 0, 210, 240, 2050), HY(f'cable-drop-{i + 1}', x + 165, -170, 1120, 700, 17)]
        return parts
    if profile == 'solar-carport':
        parts = [B('post-left-front', -1900, -650, 0, 140, 150, 3100), B('post-left-rear', -1900, 650, 0, 140, 150, 3100), B('post-right-front', 1900, -650, 0, 140, 150, 3100), B('post-right-rear', 1900, 650, 0, 140, 150, 3100), B('front-beam', 0, -650, 3100, 4150, 135, 140), B('rear-beam', 0, 650, 3500, 4150, 135, 140), HX('panel-rafter-a', 0, -390, 3260, 4020, 50), HX('panel-rafter-b', 0, 50, 3380, 4020, 50), HX('panel-rafter-c', 0, 470, 3460, 4020, 50)]
        for i in range(6):
            x = -1600 + i * 640
            parts.append(B(f'pv-panel-{i + 1}', x, 0, 3340 + (x / 1900) * 145, 600, 1090, 32))
        return parts
    if profile == 'canopy-base':
        return [B('base-plate', 0, 0, 0, 520, 520, 55), B('column-shoe', 0, 0, 55, 280, 280, 210), B('column-post', 0, 0, 265, 240, 240, 2400), *[B(f'gusset-{i}', x, y, 60, 90, 210, 320) for i, (x, y) in enumerate([(-145, 0), (145, 0), (0, -145), (0, 145)])], *[C(f'anchor-bolt-{i}', x, y, 0, 80, 27, 8) for i, (x, y) in enumerate([(-205, -205), (205, -205), (-205, 205), (205, 205)])]]
    if profile == 'charging-plinth':
        return [B('island-curb', 0, 0, 0, 2600, 820, 180), B('raised-deck', 0, 0, 180, 2400, 620, 120), B('left-mount-pad', -700, 0, 300, 480, 470, 180), B('right-mount-pad', 700, 0, 300, 480, 470, 180), *[C(f'corner-marker-{i}', x, y, 300, 120, 55, 8) for i, (x, y) in enumerate([(-1150, -270), (1150, -270), (-1150, 270), (1150, 270)])]]
    if profile == 'wheel-stop':
        return [B('stop-body', 0, 0, 0, 1740, 170, 150), B('top-face', 0, 0, 150, 1480, 145, 35), *[C(f'anchor-{i}', x, 0, 0, 190, 24, 8) for i, x in enumerate([-620, 620])], B('end-left', -820, 0, 0, 100, 180, 115), B('end-right', 820, 0, 0, 100, 180, 115)]
    if profile in {'bay-sign', 'direction-sign'}:
        wide = 740 if profile == 'direction-sign' else 560
        parts = [B('ground-sleeve', 0, 0, 0, 280, 260, 220), C('sign-post', 0, 0, 220, 2500, 48, 8), B('sign-panel', 0, -20, 1840, wide, 70, 560), B('sign-face', 0, -62, 1890, wide - 44, 18, 450), B('top-cap', 0, 0, 2780, 140, 140, 28)]
        if profile == 'direction-sign':
            parts += [B('lower-arrow-panel', 0, -22, 1180, 620, 65, 230), HX('arrow-shaft', 0, -75, 1295, 300, 30, 8)]
        return parts
    if profile == 'protection-bollard':
        return [C('anchor-flange', 0, 0, 0, 60, 150, 10), C('guard-post', 0, 0, 58, 930, 72, 10), C('top-cap', 0, 0, 988, 68, 80, 10), *[C(f'base-anchor-{i}', x, y, 0, 75, 22, 8) for i, (x, y) in enumerate([(-94, -94), (94, -94), (-94, 94), (94, 94)])]]
    if profile == 'buffer-container':
        parts = [B('container-skid', 0, 0, 0, 3200, 1700, 160), B('container-body', 0, 0, 160, 3000, 1500, 2250), B('roof-cap', 0, 0, 2410, 3080, 1580, 85), B('front-service-door', 0, -770, 250, 980, 22, 2040), B('right-service-door', 780, -770, 250, 420, 22, 2040)]
        for i in range(8):
            parts += [B(f'vent-louver-{i + 1}', -920 + (i % 4) * 240, -790, 480 + (i // 4) * 280, 180, 40, 100)]
        parts += [C('cable-port-left', -1380, -785, 175, 190, 62, 8), C('cable-port-right', 1380, -785, 175, 190, 62, 8)]
        return parts
    raise ValueError(f'no geometry recipe for {profile}')


def source_for(spec, index):
    asset_id, title, description, color, profile = spec
    parts = parts_for(profile, index)
    kinds = {part[0] for part in parts}
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.',
        '',
        'meta({',
        f'  name: {json.dumps(asset_id)},',
        "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(description + " Knobs: overall scale and asset color.")},',
        "  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],",
        f'  kit: {json.dumps(KIT_ID)},',
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],",
        '  triangleBudget: 2400,',
        '});',
        '',
        "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(color)}, {{ label: 'Asset color' }});",
    ]
    if 'box' in kinds:
        lines.append('const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);')
    if 'cylinder' in kinds:
        lines.append('const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);')
    if 'horizontal-x' in kinds:
        lines.append('const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);')
    if 'horizontal-y' in kinds:
        lines.append('const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);')
    lines.extend(['', f'const p=assembly({json.dumps(asset_id)});'])
    helpers = {'box': 'b', 'cylinder': 'c', 'horizontal-x': 'hx', 'horizontal-y': 'hy'}
    for part in parts:
        kind, name, *args = part
        lines.append(f'p.part({json.dumps(name)}, {helpers[kind]}({", ".join(map(str, args))}).color(color));')
    lines.extend(['', 'return p.model();', ''])
    return '\n'.join(lines)


ids = [row[0] for row in ASSETS]
if len(ids) != len(set(ids)):
    raise ValueError('duplicate EV charging asset ids')
existing = ROOT / 'catalog' / 'index.json'
if existing.exists():
    existing_ids = {row['id'] for row in json.loads(existing.read_text())['assets']}
    collisions = sorted(existing_ids.intersection(ids))
    if collisions:
        raise ValueError(f'asset ids already exist: {collisions}')

KIT.mkdir(parents=True, exist_ok=True)
KIT.joinpath('kit.json').write_text(json.dumps({
    'title': 'EV charging infrastructure',
    'description': 'Original generic props for AC and DC charging, connectors, power cabinets, parking fixtures, fleet depots, and charging canopies.',
}, indent=2) + '\n')
for index, spec in enumerate(ASSETS):
    KIT.joinpath(f'{spec[0]}.kcad.ts').write_text(source_for(spec, index))

settings = {
    'kit': KIT_ID,
    'generatedOn': '2026-11-03',
    'assetCount': len(ASSETS),
    'sourceCommand': 'python3 artifacts/catalog-demos/ev-charging-wave-20261103/generate_ev_charging_assets.py',
    'catalogCommand': 'npx tsx scripts/buildAssetCatalog.ts',
    'previewCommand': 'npx tsx scripts/renderCatalogPreviews.ts',
    'knobs': {'scale': {'default': 1, 'min': 0.7, 'max': 1.3, 'step': 0.05}, 'color': 'asset-specific hex color'},
    'triangleBudget': 2400,
    'materialCount': 1,
    'verificationScope': {
        'covered': ['local source and index', 'low-poly mesh export', 'triangle and material audit', 'catalog integration suite', 'preview files and URLs', 'local generated catalog pages', 'current public website snapshot'],
        'notCovered': ['deployed behavior for this branch', 'electrical engineering', 'charging performance', 'safety certification', 'site suitability', 'physical acceptance'],
    },
    'assets': [{'id': row[0], 'title': row[1], 'profile': row[4]} for row in ASSETS],
}
BUNDLE.mkdir(parents=True, exist_ok=True)
(BUNDLE / 'settings.json').write_text(json.dumps(settings, indent=2) + '\n')
print(f'generated {len(ASSETS)} assets in {KIT}')
