#!/usr/bin/env python3
"""Generate 40 original, parametric solar-energy scene props for kernelCAD."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / 'catalog' / 'kits' / 'solar-energy'

# id, title, description, style, width, depth, height, default color
ASSETS = [
    ('rooftop-pv-module', 'Rooftop PV module', 'Single framed photovoltaic module with a raised cell grid and short roof rails.', 'module', 820, 470, 245, '#557c94'),
    ('rooftop-pv-array', 'Rooftop PV array', 'Six framed modules arranged as a compact two-row rooftop array.', 'array', 1760, 1080, 330, '#567d92'),
    ('ground-mount-pv-rack', 'Ground-mount PV rack', 'Tilted scene rack carrying a two-by-two group of framed solar modules.', 'rack', 1580, 1040, 620, '#6c8790'),
    ('single-axis-solar-tracker', 'Single-axis solar tracker', 'Long PV table on a central rotating shaft with end supports and drive box.', 'tracker', 2100, 780, 760, '#6c8790'),
    ('solar-carport-canopy', 'Solar carport canopy', 'Four-post parking canopy topped by a shallow six-module photovoltaic roof.', 'carport', 1900, 1380, 920, '#617c88'),
    ('solar-pergola-canopy', 'Solar pergola canopy', 'Compact four-post garden pergola with a four-module panel roof.', 'pergola', 1320, 1120, 710, '#687f82'),
    ('solar-roof-section', 'Solar roof section', 'Small pitched-roof display with framed panels, ridge cap and two mounting rails.', 'roof', 1180, 820, 430, '#7c7462'),
    ('flexible-solar-panel', 'Flexible solar panel', 'Thin flexible PV sheet with rounded low-profile border and edge grommets.', 'flex', 760, 430, 90, '#536d7a'),
    ('bifacial-pv-module', 'Bifacial PV module', 'Double-sided framed module on an open stand with visible rear cross-bracing.', 'bifacial', 900, 520, 370, '#5d7c89'),
    ('floating-solar-platform', 'Floating solar platform', 'Four-module floating PV raft carried by long buoyant pontoons and cross ties.', 'floating', 1520, 1060, 310, '#637e87'),
    ('balcony-solar-panel', 'Balcony solar panel', 'Compact PV panel attached to a freestanding balcony rail and support brackets.', 'balcony', 720, 440, 690, '#65808b'),
    ('pv-module-microinverter', 'PV module with microinverter', 'Single framed module with a compact inverter enclosure fixed beneath its back rail.', 'micro-panel', 820, 470, 300, '#557c94'),
    ('string-inverter', 'String inverter', 'Wall-mounted string inverter cabinet with cooling ribs, display and cable glands.', 'inverter', 520, 280, 720, '#78817f'),
    ('hybrid-inverter', 'Hybrid inverter', 'Hybrid conversion cabinet with deep side fins, front display and paired lower ports.', 'hybrid', 560, 320, 820, '#6f7f82'),
    ('microinverter-unit', 'Microinverter unit', 'Compact sealed microinverter case with mounting ears, cooling fins and cable ends.', 'microinverter', 310, 190, 105, '#65777d'),
    ('home-battery-wall', 'Home battery wall unit', 'Tall residential storage cabinet with segmented front cover and base plinth.', 'battery-wall', 560, 300, 1060, '#757e7d'),
    ('battery-cabinet', 'Battery cabinet', 'Floor-standing storage enclosure with double doors, vents and lower service panel.', 'battery-cabinet', 760, 420, 1120, '#737d7c'),
    ('battery-rack', 'Battery rack', 'Open four-level equipment rack carrying six modular storage blocks.', 'battery-rack', 880, 520, 1380, '#6d797a'),
    ('solar-charge-controller', 'Solar charge controller', 'Wall control unit with a raised display, button row and lower cable glands.', 'controller', 360, 210, 430, '#637e82'),
    ('pv-combiner-box', 'PV combiner box', 'Weatherproof string combiner enclosure with front cover and top cable entries.', 'combiner', 490, 240, 520, '#78827e'),
    ('dc-disconnect-switch', 'DC disconnect switch', 'Compact DC isolation cabinet with a projecting rotary handle and cable ports.', 'disconnect', 350, 220, 500, '#a47747'),
    ('ac-disconnect-switch', 'AC disconnect switch', 'Utility-side isolation enclosure with external lever, cover seam and conduit stubs.', 'disconnect', 370, 230, 540, '#9d7145'),
    ('pv-junction-box', 'PV junction box', 'Low-profile sealed junction enclosure with lid rim and four cable glands.', 'junction', 300, 210, 125, '#687b79'),
    ('solar-electric-meter', 'Solar electric meter', 'Meter pedestal with a round meter face, upper enclosure and conduit base.', 'meter', 360, 260, 920, '#77817d'),
    ('solar-main-panel', 'Solar main breaker panel', 'Tall electrical panel enclosure with a divided door and two rows of knockouts.', 'main-panel', 560, 280, 1020, '#767d7b'),
    ('pad-mount-transformer', 'Pad-mount transformer', 'Ground transformer cabinet with radiator fins, lifting lugs and porcelain bushings.', 'transformer', 1220, 840, 1160, '#747e7a'),
    ('pole-mount-transformer', 'Pole-mount transformer', 'Utility pole carrying a cylindrical transformer tank and crossarm insulators.', 'pole-transformer', 440, 420, 1520, '#78817a'),
    ('solar-weather-station', 'Solar weather station', 'Compact instrument mast with a crossarm, sensor housings and wind vane.', 'weather', 560, 500, 1320, '#687d7f'),
    ('solar-data-logger', 'Solar data logger', 'Small telemetry enclosure mounted to a short pedestal with antenna and status bar.', 'logger', 340, 280, 620, '#71807e'),
    ('plane-of-array-irradiance-sensor', 'Plane-of-array irradiance sensor', 'Low sun-sensor head on an adjustable stand with a wide circular sensing plate.', 'irradiance', 420, 420, 510, '#75817b'),
    ('solar-wind-sensor-mast', 'Solar wind sensor mast', 'Slim mast with three-cup anemometer, wind vane and compact mounting base.', 'wind', 480, 450, 1240, '#6d817e'),
    ('pv-cable-tray', 'PV cable tray section', 'Straight open cable tray with side lips, floor rungs and end splice plates.', 'tray', 1480, 260, 160, '#737e7b'),
    ('roof-flashing-mount', 'Roof flashing mount', 'Low-profile roof foot with weather plate, standoff post and two mounting rails.', 'mount', 480, 420, 330, '#8b8066'),
    ('pv-ballast-block', 'PV ballast block', 'Pair of weighted support blocks with short rails for a flat-roof PV module.', 'ballast', 760, 520, 360, '#827b6a'),
    ('solar-panel-end-clamp', 'Solar panel end clamp', 'Small adjustable rail clamp with a slotted base and raised pressure jaw.', 'clamp', 150, 110, 92, '#7b817a'),
    ('pv-panel-cleaning-robot', 'PV panel cleaning robot', 'Compact tracked cleaning carriage spanning two panel rails with a broad brush bar.', 'robot', 520, 330, 190, '#a57b48'),
    ('solar-panel-wash-cart', 'Solar panel wash cart', 'Two-wheel service cart with a water tank, hose reel, handle and cleaning wand.', 'wash-cart', 660, 420, 760, '#7b846d'),
    ('pv-module-transport-cart', 'PV module transport cart', 'Four-wheel A-frame trolley carrying two upright framed solar modules.', 'module-cart', 820, 540, 1120, '#777f78'),
    ('utility-inverter-station', 'Utility inverter station', 'Containerized inverter station with service doors, ventilation louvers and cable plinth.', 'station', 1480, 900, 1120, '#737d78'),
    ('solar-battery-container', 'Solar battery container', 'Large storage enclosure with paired access doors, end vents and corner lifting blocks.', 'battery-container', 1740, 920, 1360, '#737d78'),
]


def n(value):
    return f'{value:.3f}'.rstrip('0').rstrip('.') if isinstance(value, float) else str(value)


def bx(w, d, h, x=0, y=0, z=0):
    return f'box({n(w)}, {n(d)}, {n(h)}, true).translate({n(x)}, {n(y)}, {n(z)})'


def cyl_z(h, r, x=0, y=0, z=0, sides=8):
    return f'cylinder({n(h)}, {n(r)}, {sides}).translate({n(x)}, {n(y)}, {n(z)})'


def cyl_x(length, r, x0, y=0, z=0):
    return f'cylinder({n(length)}, {n(r)}, 8).rotate([0, 1, 0], 90).translate({n(x0)}, {n(y)}, {n(z)})'


def cyl_y(length, r, x=0, y0=0, z=0):
    return f'cylinder({n(length)}, {n(r)}, 8).rotate([1, 0, 0], 90).translate({n(x)}, {n(y0 + length)}, {n(z)})'


def add(parts, name, expr):
    parts.append((name, expr))


def panel(parts, prefix, x, y, z, w, d, thickness=22, grid=True):
    add(parts, f'{prefix}-frame', bx(w + 18, d + 18, 22, x, y, z - 10))
    add(parts, f'{prefix}-surface', bx(w, d, thickness, x, y, z + 11))
    if grid:
        for i, off in enumerate((-w * 0.25, 0, w * 0.25)):
            add(parts, f'{prefix}-cell-bar-x-{i}', bx(4, d - 20, 2, x + off, y, z + 23))
        for i, off in enumerate((-d * 0.25, 0, d * 0.25)):
            add(parts, f'{prefix}-cell-bar-y-{i}', bx(w - 20, 4, 2, x, y + off, z + 23))


def module_support(parts, prefix, x, y, z, w, d, leg_height=150):
    add(parts, f'{prefix}-rail-left', bx(w + 26, 22, 30, x, y - d * 0.34, z - 20))
    add(parts, f'{prefix}-rail-right', bx(w + 26, 22, 30, x, y + d * 0.34, z - 20))
    for i, xx in enumerate((x - w * 0.36, x + w * 0.36)):
        for j, yy in enumerate((y - d * 0.34, y + d * 0.34)):
            add(parts, f'{prefix}-leg-{i}-{j}', bx(28, 28, leg_height, xx, yy, (z - leg_height / 2 - 8)))


def cabinet(parts, prefix, w, d, h, vents=4, doors=1):
    add(parts, f'{prefix}-plinth', bx(w + 28, d + 28, 36, 0, 0, 18))
    add(parts, f'{prefix}-body', bx(w, d, h - 42, 0, 0, h / 2 + 18))
    front_y = d / 2 + 3
    door_w = (w - 24) / doors
    for i in range(doors):
        x = -w / 2 + door_w / 2 + 12 + i * door_w
        add(parts, f'{prefix}-door-{i + 1}', bx(door_w - 8, 8, h - 86, x, front_y, h / 2 + 14))
        add(parts, f'{prefix}-handle-{i + 1}', bx(12, 18, 72, x + door_w * 0.36, front_y + 11, h / 2 + 18))
    for i in range(vents):
        z = 100 + i * max(28, (h - 300) / max(1, vents - 1))
        add(parts, f'{prefix}-vent-{i + 1}', bx(w * 0.48, 10, 8, 0, front_y + 9, z))


def recipe(style, w, d, h):
    parts = []
    if style in ('module', 'bifacial', 'micro-panel'):
        panel(parts, 'pv', 0, 0, 190, w * 0.78, d * 0.72)
        module_support(parts, 'rack', 0, 0, 190, w * 0.78, d * 0.72, 150)
        if style == 'bifacial':
            add(parts, 'rear-crossbar', bx(w * 0.78, 24, 24, 0, 0, 82))
            add(parts, 'rear-center-brace', bx(24, 24, 145, 0, 0, 98))
        if style == 'micro-panel':
            add(parts, 'microinverter-case', bx(w * 0.24, d * 0.22, 48, 0, 0, 145))
            add(parts, 'microinverter-port-left', cyl_z(22, 13, -w * 0.12, 0, 116))
            add(parts, 'microinverter-port-right', cyl_z(22, 13, w * 0.12, 0, 116))
    elif style == 'array':
        for i, x in enumerate((-w * 0.24, w * 0.24)):
            for j, y in enumerate((-d * 0.24, d * 0.24, d * 0.46)):
                panel(parts, f'module-{i}-{j}', x, y, 260, w * 0.34, d * 0.26, grid=False)
        for y in (-d * 0.38, 0, d * 0.38):
            add(parts, f'array-rail-{n(y)}', bx(w * 0.88, 24, 32, 0, y, 218))
        for x in (-w * 0.38, w * 0.38):
            for y in (-d * 0.4, d * 0.4):
                add(parts, f'array-post-{n(x)}-{n(y)}', bx(30, 30, 195, x, y, 105))
    elif style == 'rack':
        panel(parts, 'rack-pv', 0, 0, h * 0.68, w * 0.72, d * 0.64, grid=False)
        for side, y in enumerate((-d * 0.32, d * 0.32)):
            add(parts, f'a-frame-foot-{side}', bx(w * 0.7, 44, 32, 0, y, 16))
            add(parts, f'a-frame-upright-{side}', bx(34, 34, h * 0.62, 0, y, h * 0.31))
        add(parts, 'tracker-axis', cyl_x(w * 0.8, 28, -w * 0.4, 0, h * 0.49))
        add(parts, 'drive-enclosure', bx(140, 110, 120, w * 0.3, 0, 90))
    elif style == 'tracker':
        panel(parts, 'tracker-table', 0, 0, h * 0.7, w * 0.82, d * 0.68, grid=False)
        add(parts, 'torque-tube', cyl_x(w * 0.9, 32, -w * 0.45, 0, h * 0.49))
        for i, x in enumerate((-w * 0.4, 0, w * 0.4)):
            add(parts, f'tracker-pier-{i}', bx(95, 95, h * 0.5, x, 0, h * 0.25))
        add(parts, 'tracker-drive', bx(170, 150, 130, w * 0.36, 0, h * 0.12 + 70))
    elif style in ('carport', 'pergola'):
        post = 72 if style == 'carport' else 54
        roof_z = h - 110
        for i, x in enumerate((-w * 0.39, w * 0.39)):
            for j, y in enumerate((-d * 0.38, d * 0.38)):
                add(parts, f'canopy-post-{i}-{j}', bx(post, post, roof_z, x, y, roof_z / 2))
        add(parts, 'canopy-front-beam', bx(w, 72, 64, 0, -d * 0.38, roof_z + 34))
        add(parts, 'canopy-back-beam', bx(w, 72, 64, 0, d * 0.38, roof_z + 34))
        rows, cols = (2, 3) if style == 'carport' else (2, 2)
        for i in range(cols):
            for j in range(rows):
                x = (i - (cols - 1) / 2) * w * 0.27
                y = (j - (rows - 1) / 2) * d * 0.28
                panel(parts, f'canopy-pv-{i}-{j}', x, y, roof_z + 90, w * 0.25, d * 0.25, grid=False)
    elif style == 'roof':
        add(parts, 'roof-deck', bx(w, d, 64, 0, 0, 50))
        add(parts, 'ridge-cap', bx(w + 24, 52, 50, 0, 0, 116))
        for i, x in enumerate((-w * 0.27, w * 0.27)):
            panel(parts, f'roof-module-{i}', x, -d * 0.12, 220, w * 0.32, d * 0.42, grid=False)
        for i, y in enumerate((-d * 0.3, d * 0.3)):
            add(parts, f'roof-rail-{i}', bx(w * 0.84, 30, 24, 0, y, 144))
    elif style == 'flex':
        add(parts, 'flexible-sheet', bx(w, d, 18, 0, 0, 25))
        add(parts, 'edge-border', bx(w + 18, d + 18, 8, 0, 0, 10))
        for i, x in enumerate((-w * 0.42, w * 0.42)):
            for j, y in enumerate((-d * 0.42, d * 0.42)):
                add(parts, f'grommet-{i}-{j}', cyl_z(14, 18, x, y, 0))
        for i in range(1, 4):
            add(parts, f'flex-cell-line-{i}', bx(w - 26, 3, 2, 0, -d * 0.4 + i * d * 0.2, 35))
    elif style == 'floating':
        for i, x in enumerate((-w * 0.34, w * 0.34)):
            add(parts, f'float-pontoon-{i}', cyl_x(w * 0.94, 86, -w * 0.47, x * 0.25, 86))
        for i, x in enumerate((-w * 0.25, w * 0.25)):
            for j, y in enumerate((-d * 0.23, d * 0.23)):
                panel(parts, f'floating-module-{i}-{j}', x, y, 235, w * 0.34, d * 0.28, grid=False)
        for i, y in enumerate((-d * 0.4, d * 0.4)):
            add(parts, f'raft-cross-tie-{i}', bx(w * 0.88, 34, 36, 0, y, 125))
    elif style == 'balcony':
        add(parts, 'balcony-floor', bx(w * 0.98, 90, 40, 0, -d * 0.33, 20))
        for i, x in enumerate((-w * 0.4, -w * 0.2, 0, w * 0.2, w * 0.4)):
            add(parts, f'balcony-post-{i}', bx(24, 24, h * 0.65, x, -d * 0.33, h * 0.33))
        add(parts, 'balcony-top-rail', bx(w, 30, 28, 0, -d * 0.33, h * 0.68))
        panel(parts, 'balcony-module', 0, d * 0.12, h * 0.55, w * 0.72, d * 0.42, grid=False)
        for i, x in enumerate((-w * 0.32, w * 0.32)):
            add(parts, f'balcony-bracket-{i}', bx(34, d * 0.54, 28, x, 0, h * 0.3))
    elif style in ('inverter', 'hybrid'):
        cabinet(parts, style, w * 0.72, d * 0.62, h * 0.75, vents=5, doors=1)
        for i in range(7):
            add(parts, f'{style}-cooling-fin-{i}', bx(22, d * 0.72, h * 0.42, -w * 0.43 + i * w * 0.14, 0, h * 0.68))
        add(parts, f'{style}-display', bx(w * 0.22, 14, h * 0.13, w * 0.18, d * 0.34, h * 0.72))
        for i, x in enumerate((-w * 0.2, 0, w * 0.2)):
            add(parts, f'{style}-cable-port-{i}', cyl_z(36, 20, x, -d * 0.16, 0))
    elif style == 'microinverter':
        add(parts, 'microinverter-body', bx(w * 0.76, d * 0.82, h * 0.72, 0, 0, h * 0.42))
        for i in range(5):
            add(parts, f'heat-fin-{i}', bx(w * 0.72, 12, 8, 0, -d * 0.32 + i * d * 0.16, h * 0.86))
        for i, x in enumerate((-w * 0.4, w * 0.4)):
            add(parts, f'mount-ear-{i}', bx(48, d * 0.45, 18, x, 0, 25))
        for i, x in enumerate((-w * 0.28, w * 0.28)):
            add(parts, f'lead-{i}', cyl_x(w * 0.22, 11, x, 0, 18))
    elif style in ('battery-wall', 'battery-cabinet', 'combiner', 'junction', 'disconnect', 'controller', 'logger', 'main-panel', 'battery-container', 'station'):
        if style == 'battery-wall':
            cabinet(parts, 'battery', w * 0.8, d * 0.68, h * 0.88, vents=5, doors=1)
            for i in range(4):
                add(parts, f'battery-seam-{i}', bx(w * 0.72, 8, 12, 0, d * 0.35, h * 0.2 + i * h * 0.15))
        elif style == 'battery-cabinet':
            cabinet(parts, 'battery-cabinet', w * 0.86, d * 0.7, h * 0.88, vents=6, doors=2)
            add(parts, 'service-label-plate', bx(w * 0.18, 12, 90, w * 0.28, d * 0.36, h * 0.72))
        elif style == 'battery-container':
            cabinet(parts, 'battery-container', w * 0.9, d * 0.86, h * 0.82, vents=7, doors=2)
            for i, x in enumerate((-w * 0.42, w * 0.42)):
                add(parts, f'lifting-corner-{i}', bx(120, d * 0.9, 120, x, 0, h * 0.92))
            for i, y in enumerate((-d * 0.38, d * 0.38)):
                add(parts, f'cooling-unit-{i}', bx(w * 0.18, 90, h * 0.34, 0, y, h * 0.42))
        elif style == 'station':
            cabinet(parts, 'station', w * 0.88, d * 0.82, h * 0.72, vents=6, doors=2)
            for i, x in enumerate((-w * 0.36, w * 0.36)):
                add(parts, f'station-end-vent-{i}', bx(120, d * 0.6, h * 0.32, x, 0, h * 0.45))
            add(parts, 'station-cable-plinth', bx(w * 0.95, d * 0.95, 95, 0, 0, 48))
        elif style == 'combiner':
            cabinet(parts, 'combiner', w * 0.86, d * 0.72, h * 0.82, vents=3, doors=1)
            for i, x in enumerate((-w * 0.28, -w * 0.09, w * 0.09, w * 0.28)):
                add(parts, f'cable-entry-{i}', cyl_z(34, 18, x, 0, h * 0.82))
        elif style == 'junction':
            cabinet(parts, 'junction', w * 0.9, d * 0.84, h * 0.78, vents=0, doors=1)
            for i, x in enumerate((-w * 0.31, -w * 0.1, w * 0.1, w * 0.31)):
                add(parts, f'junction-gland-{i}', cyl_z(32, 18, x, 0, 0))
        elif style == 'disconnect':
            cabinet(parts, 'disconnect', w * 0.9, d * 0.76, h * 0.86, vents=2, doors=1)
            add(parts, 'disconnect-handle-base', cyl_y(20, 42, 0, d * 0.38, h * 0.62))
            add(parts, 'disconnect-lever', bx(26, 24, 128, 0, d * 0.44, h * 0.66))
            for i, x in enumerate((-w * 0.28, w * 0.28)):
                add(parts, f'conduit-{i}', cyl_z(62, 24, x, 0, 0))
        elif style == 'controller':
            cabinet(parts, 'controller', w * 0.82, d * 0.72, h * 0.8, vents=3, doors=1)
            add(parts, 'controller-screen', bx(w * 0.36, 14, h * 0.18, 0, d * 0.42, h * 0.68))
            for i in range(3):
                add(parts, f'controller-button-{i}', cyl_y(18, 12, -w * 0.22 + i * w * 0.22, d * 0.39, h * 0.42))
        elif style == 'logger':
            cabinet(parts, 'logger', w * 0.82, d * 0.72, h * 0.56, vents=2, doors=1)
            add(parts, 'logger-mast', cyl_z(h * 0.34, 16, 0, 0, h * 0.56))
            add(parts, 'logger-antenna-cap', cyl_z(32, 48, 0, 0, h * 0.87))
        else:
            cabinet(parts, 'main-panel', w * 0.86, d * 0.7, h * 0.88, vents=5, doors=1)
            for i in range(6):
                add(parts, f'breaker-knockout-{i}', bx(24, 12, 24, -w * 0.28 + i * w * 0.11, d * 0.36, h * 0.24))
    elif style == 'battery-rack':
        for x in (-w * 0.42, w * 0.42):
            add(parts, f'rack-upright-{n(x)}', bx(36, 36, h, x, 0, h / 2))
        for level in range(4):
            z = 110 + level * (h - 250) / 3
            add(parts, f'rack-shelf-{level}', bx(w, d, 42, 0, 0, z))
            for i, x in enumerate((-w * 0.25, w * 0.25)):
                add(parts, f'battery-{level}-{i}', bx(w * 0.38, d * 0.72, 210, x, 0, z + 126))
    elif style in ('meter', 'irradiance', 'weather', 'wind'):
        add(parts, 'instrument-base', bx(w * 0.5, d * 0.5, 54, 0, 0, 27))
        mast_h = h * (0.78 if style == 'meter' else 0.82)
        add(parts, 'instrument-mast', cyl_z(mast_h, 24, 0, 0, 54))
        if style == 'meter':
            add(parts, 'meter-enclosure', bx(w * 0.88, d * 0.72, h * 0.37, 0, 0, h * 0.68))
            add(parts, 'meter-ring', cyl_y(36, w * 0.2, 0, d * 0.32, h * 0.68))
            add(parts, 'meter-face', cyl_y(12, w * 0.16, 0, d * 0.37, h * 0.68))
        elif style == 'irradiance':
            add(parts, 'sensor-arm', bx(w * 0.8, 28, 26, w * 0.1, 0, h * 0.8))
            add(parts, 'sensor-disc', cyl_z(40, w * 0.26, w * 0.36, 0, h * 0.82))
            add(parts, 'sensor-cap', cyl_z(18, w * 0.16, w * 0.36, 0, h * 0.86))
        elif style == 'weather':
            add(parts, 'weather-crossarm', bx(w * 0.9, 24, 24, 0, 0, h * 0.8))
            for i, x in enumerate((-w * 0.34, 0, w * 0.34)):
                add(parts, f'sensor-pod-{i}', bx(100, 100, 100, x, 0, h * 0.86))
            add(parts, 'wind-vane-fin', bx(220, 26, 70, 0, -d * 0.3, h * 0.96))
        else:
            add(parts, 'wind-crossarm', bx(w * 0.76, 22, 22, 0, 0, h * 0.84))
            add(parts, 'anemometer-hub', cyl_z(40, 28, 0, 0, h * 0.9))
            for i, (x, y) in enumerate(((w * 0.2, 0), (-w * 0.1, d * 0.18), (-w * 0.1, -d * 0.18))):
                add(parts, f'anemometer-cup-arm-{i}', bx(140, 18, 18, x, y, h * 0.95))
                add(parts, f'anemometer-cup-{i}', cyl_z(44, 25, x + (40 if x >= 0 else -40), y, h * 0.94))
            add(parts, 'wind-vane', bx(190, 22, 68, 0, 0, h * 0.98))
    elif style == 'transformer':
        add(parts, 'transformer-pad', bx(w * 0.94, d * 0.94, 76, 0, 0, 38))
        add(parts, 'transformer-tank', bx(w * 0.72, d * 0.65, h * 0.6, 0, 0, h * 0.4))
        for i in range(9):
            x = -w * 0.43 + i * w * 0.1075
            add(parts, f'radiator-fin-front-{i}', bx(28, d * 0.23, h * 0.5, x, d * 0.42, h * 0.39))
            add(parts, f'radiator-fin-back-{i}', bx(28, d * 0.23, h * 0.5, x, -d * 0.42, h * 0.39))
        for i, x in enumerate((-w * 0.22, 0, w * 0.22)):
            add(parts, f'bushing-base-{i}', cyl_z(46, 62, x, 0, h * 0.71))
            add(parts, f'porcelain-bushing-{i}', cyl_z(h * 0.16, 38, x, 0, h * 0.75, 10))
            add(parts, f'bushing-cap-{i}', cyl_z(32, 52, x, 0, h * 0.91))
        add(parts, 'lifting-lug-left', bx(90, d * 0.7, 58, -w * 0.38, 0, h * 0.72))
        add(parts, 'lifting-lug-right', bx(90, d * 0.7, 58, w * 0.38, 0, h * 0.72))
    elif style == 'pole-transformer':
        add(parts, 'utility-pole', cyl_z(h * 0.86, 46, 0, 0, 0))
        add(parts, 'transformer-tank', cyl_z(h * 0.28, w * 0.3, 0, 0, h * 0.56, 12))
        add(parts, 'crossarm', bx(w, 56, 54, 0, 0, h * 0.86))
        for i, x in enumerate((-w * 0.35, 0, w * 0.35)):
            add(parts, f'insulator-{i}', cyl_z(100, 36, x, 0, h * 0.9))
    elif style == 'tray':
        add(parts, 'tray-floor', bx(w, d * 0.7, 18, 0, 0, 9))
        add(parts, 'tray-left-lip', bx(w, 20, h, 0, -d * 0.37, h / 2))
        add(parts, 'tray-right-lip', bx(w, 20, h, 0, d * 0.37, h / 2))
        for i in range(8):
            x = -w * 0.42 + i * w * 0.12
            add(parts, f'tray-rung-{i}', bx(22, d * 0.68, 20, x, 0, 20))
        for x in (-w * 0.48, w * 0.48):
            add(parts, f'tray-end-splice-{n(x)}', bx(90, d * 0.88, h + 36, x, 0, h / 2))
    elif style == 'mount':
        add(parts, 'flashing-plate', bx(w, d, 30, 0, 0, 15))
        add(parts, 'standoff', bx(42, 42, h * 0.7, 0, 0, h * 0.35 + 24))
        for i, y in enumerate((-d * 0.3, d * 0.3)):
            add(parts, f'mount-rail-{i}', bx(w * 0.92, 28, 28, 0, y, h * 0.76))
        for i, x in enumerate((-w * 0.38, w * 0.38)):
            add(parts, f'rail-clamp-{i}', bx(46, 52, 54, x, 0, h * 0.86))
    elif style == 'ballast':
        add(parts, 'ballast-left', bx(w * 0.38, d * 0.86, 135, -w * 0.28, 0, 67.5))
        add(parts, 'ballast-right', bx(w * 0.38, d * 0.86, 135, w * 0.28, 0, 67.5))
        panel(parts, 'ballast-pv', 0, 0, h * 0.72, w * 0.7, d * 0.62, grid=False)
        for y in (-d * 0.32, d * 0.32):
            add(parts, f'ballast-rail-{n(y)}', bx(w * 0.82, 26, 26, 0, y, h * 0.58))
    elif style == 'clamp':
        add(parts, 'clamp-base', bx(w, d, 28, 0, 0, 14))
        add(parts, 'slotted-foot', bx(w * 0.64, d * 0.66, 18, 0, 0, 37))
        add(parts, 'clamp-jaw', bx(w * 0.35, d * 0.52, h * 0.72, 0, 0, h * 0.48))
        add(parts, 'pressure-cap', bx(w * 0.7, d * 0.72, 22, 0, 0, h - 11))
        add(parts, 'clamp-bolt', cyl_z(48, 12, 0, 0, 24))
    elif style == 'robot':
        add(parts, 'cleaning-robot-body', bx(w * 0.82, d * 0.68, h * 0.55, 0, 0, h * 0.5))
        for y in (-d * 0.42, d * 0.42):
            add(parts, f'robot-track-{n(y)}', bx(w * 0.92, 34, 42, 0, y, 30))
        add(parts, 'brush-shaft', cyl_x(w * 0.92, 22, -w * 0.46, 0, 12))
        add(parts, 'brush-bar', bx(w * 0.9, 36, 34, 0, d * 0.36, 20))
        add(parts, 'handle-rail', bx(w * 0.56, 24, 28, -w * 0.25, 0, h * 0.88))
    elif style == 'wash-cart':
        add(parts, 'cart-platform', bx(w * 0.8, d * 0.62, 48, 0, 0, 80))
        add(parts, 'water-tank', bx(w * 0.42, d * 0.5, h * 0.54, -w * 0.08, 0, h * 0.42))
        for i, x in enumerate((-w * 0.36, w * 0.36)):
            add(parts, f'cart-wheel-{i}', cyl_y(34, 72, x, -d * 0.5, 72))
        add(parts, 'push-handle', bx(28, d * 0.9, h * 0.48, -w * 0.42, 0, h * 0.72))
        add(parts, 'hose-reel', cyl_y(90, 88, w * 0.24, d * 0.26, h * 0.44))
        add(parts, 'cleaning-wand', bx(24, 30, h * 0.66, w * 0.38, d * 0.26, h * 0.44))
    elif style == 'module-cart':
        add(parts, 'cart-base', bx(w * 0.84, d * 0.74, 48, 0, 0, 85))
        for i, x in enumerate((-w * 0.37, w * 0.37)):
            add(parts, f'cart-wheel-{i}', cyl_y(32, 78, x, -d * 0.46, 76))
            add(parts, f'cart-frame-{i}', bx(34, 36, h * 0.78, x, 0, h * 0.39))
        for i, y in enumerate((-d * 0.24, d * 0.24)):
            panel(parts, f'cart-module-{i}', 0, y, h * 0.59, w * 0.56, d * 0.32, grid=False)
        add(parts, 'cart-crossbar', bx(w * 0.84, 34, 30, 0, 0, h * 0.15))
    else:
        raise ValueError(f'unknown style: {style}')
    return parts


def source(asset):
    asset_id, title, description, style, w, d, h, color = asset
    lines = [
        'meta({',
        f"  name: '{asset_id}',",
        "  license: 'CC0-1.0',",
        f"  title: '{title}',",
        f"  description: '{description}',",
        "  tags: ['solar energy', 'photovoltaic', 'renewable energy', 'low poly', 'scene prop', 'CC0'],",
        "  kit: 'solar-energy',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],",
        '  triangleBudget: 1800',
        '});',
        "",
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });",
        f"const color = param('color', '{color}', {{ label: 'Asset color' }});",
        f'const p = assembly("{asset_id}");',
    ]
    for name, expr in recipe(style, w, d, h):
        lines.append(f'p.part("{name}", {expr}.scale(scale).color(color));')
    lines.extend(['', 'return p.model();', ''])
    return '\n'.join(lines)


def main():
    KIT.mkdir(parents=True, exist_ok=True)
    (KIT / 'kit.json').write_text(json.dumps({
        'title': 'Solar Energy',
        'description': 'Original low-poly photovoltaic arrays, mounting, storage, conversion, grid and service props with editable size and color controls.'
    }, indent=2) + '\n')
    for asset in ASSETS:
        (KIT / f'{asset[0]}.kcad.ts').write_text(source(asset))
    print(f'generated {len(ASSETS)} solar-energy assets in {KIT}')


if __name__ == '__main__':
    main()
