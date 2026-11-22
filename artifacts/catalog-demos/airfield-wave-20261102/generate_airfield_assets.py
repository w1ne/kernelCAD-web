#!/usr/bin/env python3
"""Generate 40 original, parametric airfield scene props for kernelCAD."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / 'catalog' / 'kits' / 'airfield'

ASSETS = [
    ('single-engine-trainer', 'Single-engine trainer', 'Light training aircraft with a high wing, cockpit canopy, nose propeller and tricycle landing gear.', 'plane', '#d5b64d', dict(length=850, span=1120, body_width=84, engines=1, prop=True, high_wing=True)),
    ('twin-engine-trainer', 'Twin-engine trainer', 'Compact twin-propeller trainer with tapered wings, twin nacelles and a low tailplane.', 'plane', '#537b89', dict(length=920, span=1220, body_width=94, engines=2, prop=True)),
    ('regional-jet', 'Regional jet', 'Small passenger jet with swept wings, two under-wing engines and a three-wheel landing gear.', 'plane', '#7195ad', dict(length=1080, span=1180, body_width=108, engines=2)),
    ('narrowbody-airliner', 'Narrowbody airliner', 'Single-aisle airliner with swept wings, under-wing engines, tail fin and landing gear.', 'plane', '#7f9eb0', dict(length=1330, span=1430, body_width=132, engines=2)),
    ('widebody-airliner', 'Widebody airliner', 'Wide-body passenger aircraft with a broad fuselage, four engine nacelles and a wide main wing.', 'plane', '#8399a7', dict(length=1550, span=1660, body_width=190, engines=4)),
    ('cargo-aircraft', 'Cargo aircraft', 'High-tail freighter with a broad fuselage, raised wing and four under-wing engines.', 'plane', '#8c8060', dict(length=1480, span=1600, body_width=180, engines=4, high_wing=True, cargo=True)),
    ('private-jet', 'Private jet', 'Long-range business jet with a narrow cabin, swept wings and two rear-mounted engines.', 'plane', '#a7a9a2', dict(length=1050, span=980, body_width=96, engines=2, rear_engines=True)),
    ('amphibious-seaplane', 'Amphibious seaplane', 'Twin-engine seaplane with a high wing, twin floats and water-ready hull profile.', 'plane', '#688b82', dict(length=1010, span=1280, body_width=104, engines=2, prop=True, high_wing=True, floats=True)),
    ('high-wing-bush-plane', 'High-wing bush plane', 'Short-field utility aircraft with a high wing, large wheels and a single nose propeller.', 'plane', '#9a8054', dict(length=820, span=1050, body_width=88, engines=1, prop=True, high_wing=True, bush=True)),
    ('sailplane', 'Sailplane', 'Slender glider fuselage and long tapered wings with a compact tailplane and small wheel.', 'plane', '#a0a6a1', dict(length=900, span=1850, body_width=62, engines=0, glider=True)),
    ('biplane', 'Biplane', 'Open-cockpit biplane with two stacked wings, interplane struts, propeller and fixed landing gear.', 'plane', '#b25e40', dict(length=760, span=940, body_width=78, engines=1, prop=True, biplane=True)),
    ('ultralight-trike', 'Ultralight trike', 'Minimal weight-shift aircraft with a triangular wing, open frame, seat and three small wheels.', 'plane', '#b68b43', dict(length=660, span=1040, body_width=58, engines=1, prop=True, high_wing=True, ultralight=True)),
    ('utility-helicopter', 'Utility helicopter', 'Utility helicopter with a glazed cabin, tail boom, two-blade rotor and paired landing skids.', 'helicopter', '#778b75', dict(length=640, width=260, rotor=960, cabin=190)),
    ('rescue-helicopter', 'Rescue helicopter', 'Rescue helicopter with a wide cabin, tail rotor, landing skids and side-mounted hoist arm.', 'helicopter', '#c57945', dict(length=720, width=300, rotor=1080, cabin=215, hoist=True)),
    ('firefighting-helicopter', 'Firefighting helicopter', 'Heavy-lift helicopter with a long rotor, reinforced skids and a suspended water bucket.', 'helicopter', '#b94e3f', dict(length=800, width=330, rotor=1200, cabin=240, bucket=True)),
    ('baggage-tractor', 'Baggage tractor', 'Compact electric apron tractor with a forward cab, low chassis, tow coupling and four wheels.', 'vehicle', '#c3a542', dict(style='tractor', length=300, width=180, height=170)),
    ('baggage-cart-train', 'Baggage cart train', 'Apron tractor towing three low-sided baggage trailers with paired axles.', 'vehicle', '#a58b53', dict(style='cart-train', length=420, width=175, height=165)),
    ('pushback-tug', 'Pushback tug', 'Low-profile aircraft pushback tug with a broad wheelbase, raised cab and nose-wheel cradle.', 'vehicle', '#c27b44', dict(style='pushback', length=480, width=280, height=180)),
    ('passenger-boarding-stairs', 'Passenger boarding stairs', 'Towable mobile stairway with a stepped flight, upper landing, handrails and four wheels.', 'vehicle', '#a18a50', dict(style='stairs', length=460, width=220, height=430)),
    ('belt-loader', 'Belt loader', 'Compact baggage loader with an inclined conveyor belt, support frame and low service chassis.', 'vehicle', '#718b65', dict(style='loader', length=470, width=190, height=350)),
    ('catering-truck', 'Catering truck', 'High-sided catering vehicle with a box body, cab, rear stabilizers and raised service platform.', 'vehicle', '#8196a2', dict(style='catering', length=610, width=220, height=440)),
    ('apron-shuttle-bus', 'Apron shuttle bus', 'Long low-floor airport shuttle bus with a broad passenger cabin and three wheel pairs.', 'vehicle', '#87939a', dict(style='bus', length=720, width=225, height=300)),
    ('aircraft-fuel-truck', 'Aircraft fuel truck', 'Refueling tanker with a rounded tank, cab, rear hose reel and ground-service chassis.', 'vehicle', '#9d8050', dict(style='fuel', length=650, width=230, height=350)),
    ('airport-fire-engine', 'Airport fire engine', 'Airport rescue truck with a tall cab, equipment body, roof monitor and heavy wheels.', 'vehicle', '#b65343', dict(style='fire', length=650, width=260, height=380)),
    ('deicing-truck', 'De-icing truck', 'De-icing service vehicle with a fluid tank, telescoping boom and raised operator basket.', 'vehicle', '#7c8990', dict(style='deicing', length=610, width=230, height=470)),
    ('lavatory-service-truck', 'Lavatory service truck', 'Compact sanitary service vehicle with a tank body, rear hose and low access step.', 'vehicle', '#64858a', dict(style='lavatory', length=560, width=215, height=330)),
    ('runway-sweeper', 'Runway sweeper', 'Apron sweeper vehicle with a front rotary brush, operator cab and rear equipment housing.', 'vehicle', '#9d8750', dict(style='sweeper', length=520, width=220, height=300)),
    ('aircraft-maintenance-lift', 'Aircraft maintenance lift', 'Self-propelled scissor lift with a guarded service platform, crossed arms and compact chassis.', 'vehicle', '#b68b43', dict(style='lift', length=430, width=210, height=520)),
    ('airport-control-tower', 'Airport control tower', 'Air traffic control tower with a tapered shaft, glazed cab and broad roof cap.', 'fixture', '#82949a', dict(style='tower')),
    ('aircraft-hangar', 'Aircraft hangar', 'Large apron hangar with a wide front opening, deep roof, side walls and upper roof ridge.', 'fixture', '#a0a29b', dict(style='hangar')),
    ('terminal-gate-front', 'Terminal gate front', 'Terminal concourse facade with a wide gate opening, upper canopy and side service blocks.', 'fixture', '#9b9d99', dict(style='gate')),
    ('passenger-jet-bridge', 'Passenger jet bridge', 'Telescoping passenger bridge with a terminal connector, support column and aircraft docking head.', 'fixture', '#8d9695', dict(style='jet-bridge')),
    ('runway-edge-light', 'Runway edge light', 'Low runway-edge fixture with a broad ground plate, short stem and raised light housing.', 'fixture', '#b4a05e', dict(style='edge-light')),
    ('runway-threshold-light-array', 'Runway threshold light array', 'Portable low-profile array of evenly spaced runway threshold lamp housings.', 'fixture', '#a4935b', dict(style='threshold')),
    ('taxiway-guidance-sign', 'Taxiway guidance sign', 'Freestanding airfield guidance sign with a wide panel, two posts and weighted feet.', 'fixture', '#a88f4d', dict(style='sign')),
    ('windsock-mast', 'Windsock mast', 'Airfield windsock on a tall mast with a circular support frame and tapered fabric sleeve.', 'fixture', '#9c7c49', dict(style='windsock')),
    ('approach-lighting-array', 'Approach lighting array', 'Approach-light runway fixture with a long crossbar, center mast and side braces.', 'fixture', '#a3925a', dict(style='approach')),
    ('precision-approach-indicator', 'Precision approach indicator', 'Four-unit visual approach indicator bar on a low ground stand.', 'fixture', '#a89051', dict(style='papi')),
    ('aircraft-uld-container', 'Aircraft ULD container', 'Rounded-corner air cargo unit load device with a raised roof and pallet base.', 'fixture', '#8b9697', dict(style='uld')),
    ('aircraft-wheel-chocks', 'Aircraft wheel chocks', 'Paired triangular wheel chocks with connecting safety rope and broad ground contact.', 'fixture', '#bf9d4e', dict(style='chocks')),
]


def n(value):
    return f'{value:.3f}'.rstrip('0').rstrip('.') if isinstance(value, float) else str(value)


def box_expr(x, y, z, tx=0, ty=0, tz=0):
    return f'box({n(x)}, {n(y)}, {n(z)}, true).translate({n(tx)}, {n(ty)}, {n(tz)})'


def rotated_box_expr(x, y, z, tx, ty, tz, axis, degrees):
    axis_text = ', '.join(n(value) for value in axis)
    return f'box({n(x)}, {n(y)}, {n(z)}, true).rotate([{axis_text}], {n(degrees)}).translate({n(tx)}, {n(ty)}, {n(tz)})'


def sphere_expr(radius, sx, sy, sz, tx=0, ty=0, tz=0):
    return f'sphere({n(radius)}).scale([{n(sx)}, {n(sy)}, {n(sz)}]).translate({n(tx)}, {n(ty)}, {n(tz)})'


def cylinder_y_expr(height, radius, tx, center_y, tz):
    start_y = center_y + height / 2
    return f'cylinder({n(height)}, {n(radius)}, 8).rotate([1, 0, 0], 90).translate({n(tx)}, {n(start_y)}, {n(tz)})'


def cylinder_x_expr(length, radius, center_x, ty, tz):
    start_x = center_x - length / 2
    return f'cylinder({n(length)}, {n(radius)}, 8).rotate([0, 1, 0], 90).translate({n(start_x)}, {n(ty)}, {n(tz)})'


def polygon_expr(points, thickness, z):
    coords = ', '.join(f'[{n(x)}, {n(y)}]' for x, y in points)
    return f'extrudePolygon([{coords}], {n(thickness)}).translate(0, 0, {n(z)})'


def plane_parts(spec):
    parts = []
    length = spec['length']
    span = spec['span']
    width = spec['body_width']
    body_height = width * 0.72
    body_z = 190
    radius = width / 2
    parts.append(('fuselage', sphere_expr(radius, length / width, 1.0, body_height / width, 0, 0, body_z)))
    if spec.get('cargo'):
        parts.append(('cargo-nose', sphere_expr(width * 0.37, 1.42, 0.82, 0.77, length * 0.24, 0, body_z)))
    canopy_x = length * (0.12 if spec.get('cargo') else 0.17)
    parts.append(('cockpit-canopy', sphere_expr(width * 0.31, 1.05, 0.82, 0.6, canopy_x, 0, body_z + body_height * 0.43)))
    wing_z = body_z + body_height * 0.18 if spec.get('high_wing') else body_z - body_height * 0.11
    main_points = [(-length * 0.2, -span * 0.5), (length * 0.14, -span * 0.5), (length * 0.02, 0), (length * 0.14, span * 0.5), (-length * 0.2, span * 0.5), (-length * 0.06, 0)]
    parts.append(('main-wing', polygon_expr(main_points, 16, wing_z)))
    tail_span = span * 0.34
    tail_points = [(-length * 0.35, -tail_span * 0.5), (-length * 0.22, -tail_span * 0.5), (-length * 0.27, 0), (-length * 0.22, tail_span * 0.5), (-length * 0.35, tail_span * 0.5), (-length * 0.31, 0)]
    parts.append(('tailplane', polygon_expr(tail_points, 14, body_z + body_height * 0.25)))
    parts.append(('vertical-tail', box_expr(length * 0.16, 16, width * 0.8, -length * 0.34, 0, body_z + body_height * 0.55)))
    if spec.get('biplane'):
        parts.append(('upper-wing', polygon_expr(main_points, 14, body_z + 145)))
        for side, y in [('left', -span * 0.26), ('right', span * 0.26)]:
            parts.append((f'{side}-interplane-strut', box_expr(14, 14, 145, -length * 0.06, y, body_z + 76)))
    if spec.get('high_wing'):
        for side, y in [('left', -span * 0.18), ('right', span * 0.18)]:
            parts.append((f'{side}-wing-strut', box_expr(12, 12, body_height * 0.95, -length * 0.03, y, body_z - body_height * 0.1)))
    engine_positions = []
    if spec['engines'] == 1 and spec.get('prop'):
        engine_positions = [(length * 0.4, 0)]
    elif spec['engines'] > 0:
        positions = [-0.34, 0.34] if spec['engines'] == 2 else [-0.36, -0.2, 0.2, 0.36]
        engine_positions = [(length * (-0.04 if spec.get('rear_engines') else 0.02), span * pos) for pos in positions]
    for index, (x, y) in enumerate(engine_positions):
        name = f'engine-{index + 1}'
        if spec.get('prop'):
            parts.append((name, sphere_expr(width * 0.18, 1.25, 0.7, 0.7, x, y, wing_z - 35)))
            prop_x = x + length * 0.1 if spec.get('engines') == 1 else x + length * 0.075
            parts.append((f'{name}-prop-hub', sphere_expr(width * 0.085, 0.72, 0.72, 0.72, prop_x, y, wing_z - 35)))
            blade_len = width * (1.05 if spec.get('engines') == 1 else 0.76)
            for blade_index, angle in enumerate([0, 120, 240]):
                parts.append((f'{name}-blade-{blade_index + 1}', f'{box_expr(8, blade_len, 10).replace(".translate(0, 0, 0)", f".rotate([1, 0, 0], {angle}).translate({n(prop_x)}, {n(y)}, {n(wing_z - 35)})")}'))
        else:
            parts.append((name, sphere_expr(width * 0.2, 1.85, 0.58, 0.58, x, y, wing_z - 34)))
    if spec.get('floats'):
        for side, y in [('left', -span * 0.19), ('right', span * 0.19)]:
            float_z = 62
            float_radius_z = width * 0.22 * 0.48
            float_top = float_z + float_radius_z
            support_height = wing_z - float_top
            parts.append((f'{side}-float', sphere_expr(width * 0.22, 3.4, 0.48, 0.48, -length * 0.03, y, float_z)))
            parts.append((f'{side}-float-strut', box_expr(12, 12, support_height, -length * 0.02, y, (wing_z + float_top) / 2)))
    if spec.get('ultralight'):
        parts.append(('open-frame', box_expr(length * 0.36, 16, 145, -length * 0.2, 0, 112)))
        parts.append(('seat', box_expr(70, 78, 70, -length * 0.09, 0, 145)))
        parts.append(('nose-gear-strut', box_expr(12, 12, 94, length * 0.28, 0, 67)))
        parts.append(('nose-wheel', cylinder_y_expr(14, 20, length * 0.28, 0, 20)))
        for side, y in [('left', -span * 0.12), ('right', span * 0.12)]:
            parts.append((f'{side}-main-gear-strut', box_expr(12, 12, 62, -length * 0.16, y, 51)))
            parts.append((f'{side}-main-wheel', cylinder_y_expr(14, 20, -length * 0.16, y, 20)))
    elif not spec.get('glider'):
        nose_radius = 17
        nose_top = body_z - body_height * 0.5 + 6
        nose_height = nose_top - nose_radius * 2
        parts.append(('nose-gear-strut', box_expr(12, 12, nose_height, length * 0.31, 0, (nose_top + nose_radius * 2) / 2)))
        parts.append(('nose-wheel', cylinder_y_expr(18, nose_radius, length * 0.31, 0, nose_radius)))
        main_radius = 22 if spec.get('bush') else 17
        main_top = wing_z + 4
        main_height = main_top - main_radius * 2
        for side, y in [('left', -span * 0.14), ('right', span * 0.14)]:
            parts.append((f'{side}-main-gear-strut', box_expr(14, 14, main_height, -length * 0.07, y, (main_top + main_radius * 2) / 2)))
            parts.append((f'{side}-main-wheel', cylinder_y_expr(18, main_radius, -length * 0.07, y, main_radius)))
    else:
        glider_radius = 14
        glider_top = body_z - body_height * 0.5 + 4
        parts.append(('glider-wheel-strut', box_expr(10, 10, glider_top - glider_radius * 2, length * 0.03, 0, (glider_top + glider_radius * 2) / 2)))
        parts.append(('glider-wheel', cylinder_y_expr(16, glider_radius, length * 0.03, 0, glider_radius)))
    if spec.get('bush'):
        for side, y in [('left', -span * 0.13), ('right', span * 0.13)]:
            parts.append((f'{side}-wing-support', box_expr(12, 12, 130, -length * 0.02, y, body_z + 12)))
    return parts


def helicopter_parts(spec):
    parts = []
    length = spec['length']
    width = spec['width']
    rotor = spec['rotor']
    body_z = 168
    parts.append(('cabin', sphere_expr(spec['cabin'] / 2, length / spec['cabin'] * 1.45, width / spec['cabin'], 0.75, 0, 0, body_z)))
    parts.append(('cockpit', sphere_expr(width * 0.43, 0.82, 0.87, 0.63, length * 0.29, 0, body_z + 20)))
    parts.append(('tail-boom', box_expr(length * 0.68, 38, 42, -length * 0.61, 0, body_z + 16)))
    parts.append(('tail-fin', box_expr(length * 0.15, 18, 105, -length * 0.9, 0, body_z - 8)))
    parts.append(('tail-plane', box_expr(length * 0.22, width * 0.75, 16, -length * 0.62, 0, body_z + 12)))
    parts.append(('rotor-mast', f'cylinder(100, 12, 8).translate(0, 0, {n(body_z + 20)})'))
    parts.append(('main-rotor-blade-a', box_expr(rotor * 0.83, 26, 9, 0, 0, body_z + 126)))
    parts.append(('main-rotor-blade-b', f'{box_expr(rotor * 0.83, 26, 9).replace(".translate(0, 0, 0)", f".rotate([0, 0, 1], 90).translate(0, 0, {n(body_z + 126)})")}'))
    parts.append(('tail-rotor-hub', cylinder_x_expr(24, 14, -length * 0.91, 0, body_z + 42)))
    parts.append(('tail-rotor-blade-a', box_expr(9, 12, 92, -length * 0.93, 0, body_z + 42)))
    parts.append(('tail-rotor-blade-b', f'{box_expr(9, 12, 92).replace(".translate(0, 0, 0)", f".rotate([1, 0, 0], 90).translate({n(-length * 0.93)}, 0, {n(body_z + 42)})")}'))
    body_bottom = body_z - spec['cabin'] * 0.375
    support_height = body_bottom - 12
    support_center = (body_bottom + 12) / 2
    for side, y in [('left', -width * 0.43), ('right', width * 0.43)]:
        parts.append((f'{side}-skid-support-front', box_expr(12, 12, support_height, length * 0.18, y, support_center)))
        parts.append((f'{side}-skid-support-rear', box_expr(12, 12, support_height, -length * 0.24, y, support_center)))
        parts.append((f'{side}-skid', box_expr(length * 0.86, 14, 12, 0, y, 6)))
    if spec.get('hoist'):
        parts.append(('hoist-arm', box_expr(length * 0.33, 12, 12, length * 0.13, width * 0.58, body_z + 10)))
        parts.append(('hoist-cable', f'cylinder(115, 4, 8).translate({n(length * 0.23)}, {n(width * 0.58)}, 55)'))
        parts.append(('hoist-hook', sphere_expr(12, 0.8, 0.8, 1.2, length * 0.23, width * 0.58, 25)))
    if spec.get('bucket'):
        parts.append(('bucket-cable', f'cylinder(130, 4, 8).translate({n(-length * 0.06)}, 0, 18)'))
        parts.append(('water-bucket', f'cylinder(62, 48, 8).translate({n(-length * 0.06)}, 0, 0)'))
    return parts


def vehicle_parts(spec):
    parts = []
    style = spec['style']
    length = spec['length']
    width = spec['width']
    height = spec['height']
    wheel_r = 31 if height < 350 else 38
    parts.append(('chassis', box_expr(length * 0.85, width * 0.88, 42, 0, 0, wheel_r + 18)))
    if style == 'bus':
        parts.append(('passenger-cabin', box_expr(length * 0.92, width * 0.9, height * 0.65, -length * 0.02, 0, wheel_r + 42 + height * 0.33)))
        parts.append(('front-windscreen', box_expr(12, width * 0.76, height * 0.3, length * 0.43, 0, wheel_r + 63 + height * 0.34)))
    elif style in ('fuel', 'fire', 'catering', 'deicing', 'lavatory', 'sweeper'):
        parts.append(('cab', box_expr(length * 0.25, width * 0.82, height * 0.54, length * 0.3, 0, wheel_r + 45 + height * 0.27)))
        if style == 'fuel':
            parts.append(('tanker', sphere_expr(width * 0.46, length / width * 0.62, 1.0, 0.82, -length * 0.13, 0, wheel_r + height * 0.43)))
            parts.append(('hose-reel', cylinder_y_expr(22, 26, -length * 0.35, width * 0.48, wheel_r + height * 0.36)))
        elif style == 'fire':
            parts.append(('equipment-body', box_expr(length * 0.48, width * 0.86, height * 0.62, -length * 0.18, 0, wheel_r + 48 + height * 0.31)))
            parts.append(('roof-monitor', f'cylinder(48, 17, 8).translate({n(-length * 0.18)}, 0, {n(wheel_r + 48 + height * 0.62)})'))
            parts.append(('monitor-nozzle', box_expr(88, 16, 14, -length * 0.18 + 40, 0, wheel_r + 48 + height * 0.62 + 53)))
        elif style == 'catering':
            parts.append(('service-box', box_expr(length * 0.48, width * 0.9, height * 0.56, -length * 0.17, 0, wheel_r + 58 + height * 0.28)))
            parts.append(('lift-platform', box_expr(length * 0.31, width * 0.91, 20, -length * 0.28, 0, wheel_r + height + 52)))
            parts.append(('lift-mast', box_expr(18, 18, height * 0.3, -length * 0.44, 0, wheel_r + height * 0.62)))
        elif style == 'deicing':
            parts.append(('fluid-tank', sphere_expr(width * 0.43, 1.45, 0.96, 0.86, -length * 0.16, 0, wheel_r + height * 0.2)))
            parts.append(('boom-base', box_expr(20, 20, height * 0.48, -length * 0.22, 0, wheel_r + height * 0.55)))
            parts.append(('boom-arm', rotated_box_expr(length * 0.42, 18, 18, -length * 0.01, 0, wheel_r + height * 0.86, [0, 1, 0], -32)))
            parts.append(('operator-basket', box_expr(72, 72, 72, length * 0.18, 0, wheel_r + height + 42)))
        elif style == 'lavatory':
            parts.append(('service-tank', sphere_expr(width * 0.43, 1.3, 0.92, 0.8, -length * 0.16, 0, wheel_r + height * 0.4)))
            parts.append(('rear-hose', cylinder_y_expr(20, 26, -length * 0.41, width * 0.52, wheel_r + height * 0.28)))
            parts.append(('access-step', box_expr(88, width * 0.92, 16, -length * 0.23, 0, wheel_r + 28)))
        else:
            parts.append(('equipment-body', box_expr(length * 0.42, width * 0.85, height * 0.48, -length * 0.2, 0, wheel_r + 48 + height * 0.24)))
            parts.append(('front-brush', cylinder_y_expr(24, 58, length * 0.42, 0, 58)))
            parts.append(('brush-arm', box_expr(length * 0.2, 16, 14, length * 0.39, 0, wheel_r + 44)))
    elif style == 'stairs':
        parts.append(('base-platform', box_expr(length * 0.82, width * 0.78, 28, -length * 0.02, 0, wheel_r + 30)))
        parts.append(('upper-landing', box_expr(length * 0.27, width * 0.72, 24, -length * 0.28, 0, wheel_r + height - 12)))
        for step in range(7):
            parts.append((f'step-{step + 1:02d}', box_expr(length * 0.38, width * 0.46, 16, length * 0.18 - step * 19, 0, wheel_r + 54 + step * 43)))
        parts.append(('left-handrail', rotated_box_expr(length * 0.52, 10, 10, -length * 0.06, -width * 0.27, wheel_r + height * 0.68, [0, 1, 0], -31)))
        parts.append(('right-handrail', rotated_box_expr(length * 0.52, 10, 10, -length * 0.06, width * 0.27, wheel_r + height * 0.68, [0, 1, 0], -31)))
    elif style == 'loader':
        parts.append(('operator-cab', box_expr(length * 0.22, width * 0.74, height * 0.32, length * 0.27, 0, wheel_r + 66)))
        parts.append(('conveyor-frame', rotated_box_expr(length * 0.83, width * 0.32, 22, -length * 0.04, 0, wheel_r + height * 0.53, [0, 1, 0], -28)))
        parts.append(('conveyor-belt', rotated_box_expr(length * 0.8, width * 0.38, 10, -length * 0.04, 0, wheel_r + height * 0.56, [0, 1, 0], -28)))
        parts.append(('loader-support', box_expr(18, 18, height * 0.36, -length * 0.07, 0, wheel_r + height * 0.23)))
    elif style == 'lift':
        parts.append(('lower-platform', box_expr(length * 0.7, width * 0.78, 28, 0, 0, wheel_r + 20)))
        arm_center = wheel_r + height * 0.43
        parts.append(('scissor-arm-left', rotated_box_expr(height * 0.96, 18, 18, 0, 0, arm_center, [0, 1, 0], 50)))
        parts.append(('scissor-arm-right', rotated_box_expr(height * 0.96, 18, 18, 0, 0, arm_center, [0, 1, 0], -50)))
        parts.append(('scissor-pivot', cylinder_y_expr(24, 18, 0, 0, arm_center)))
        parts.append(('upper-platform', box_expr(length * 0.68, width * 0.78, 20, 0, 0, wheel_r + height * 0.81)))
        parts.append(('guardrail-front', box_expr(12, width * 0.78, 76, length * 0.32, 0, wheel_r + height * 0.81 + 42)))
    elif style == 'cart-train':
        parts.append(('tractor-cab', box_expr(length * 0.31, width * 0.85, height * 0.48, length * 0.23, 0, wheel_r + 42 + height * 0.24)))
        for trailer in range(3):
            x = -length * 0.2 - trailer * length * 0.48
            trailer_radius = wheel_r * 0.63
            trailer_bed_center = trailer_radius + 18
            parts.append((f'trailer-{trailer + 1}-bed', box_expr(length * 0.34, width * 0.94, 36, x, 0, trailer_bed_center)))
            parts.append((f'trailer-{trailer + 1}-load', box_expr(length * 0.24, width * 0.78, height * 0.4, x, 0, trailer_radius + 36 + height * 0.2)))
            for side, y in [('left', -width * 0.47), ('right', width * 0.47)]:
                parts.append((f'trailer-{trailer + 1}-{side}-wheel', cylinder_y_expr(14, trailer_radius, x, y + 7, trailer_radius)))
    else:
        parts.append(('operator-cab', box_expr(length * 0.27, width * 0.82, height * 0.56, length * 0.24, 0, wheel_r + 48 + height * 0.28)))
        parts.append(('rear-body', box_expr(length * 0.37, width * 0.84, height * 0.42, -length * 0.23, 0, wheel_r + 44 + height * 0.21)))
        parts.append(('tow-bar', box_expr(length * 0.27, 18, 16, -length * 0.48, 0, wheel_r + 18)))
        if style == 'pushback':
            parts.append(('nose-wheel-cradle', box_expr(length * 0.22, width * 0.62, 24, length * 0.48, 0, wheel_r + 43)))
        if style == 'tractor':
            parts.append(('front-hood', box_expr(length * 0.32, width * 0.72, height * 0.26, length * 0.36, 0, wheel_r + 42)))
    if style not in ('cart-train',):
        axle_xs = [-length * 0.31, length * 0.31]
        if style == 'bus':
            axle_xs.append(0)
        for axle, x in enumerate(axle_xs):
            for side, y in [('left', -width * 0.52), ('right', width * 0.52)]:
                parts.append((f'wheel-{axle + 1}-{side}', cylinder_y_expr(16, wheel_r, x, y + 8, wheel_r)))
    return parts


def fixture_parts(spec):
    style = spec['style']
    parts = []
    if style == 'tower':
        parts += [('base', box_expr(230, 230, 140, 0, 0, 70)), ('shaft', box_expr(150, 150, 540, 0, 0, 410)), ('control-cab', box_expr(300, 280, 130, 0, 0, 745)), ('roof-cap', box_expr(330, 310, 24, 0, 0, 822))]
        for side, x in [('left', -104), ('right', 104)]:
            parts.append((f'{side}-cab-window-band', box_expr(18, 232, 72, x, 0, 745)))
    elif style == 'hangar':
        parts += [('left-wall', box_expr(24, 540, 300, -330, 0, 150)), ('right-wall', box_expr(24, 540, 300, 330, 0, 150)), ('rear-wall', box_expr(660, 24, 300, 0, -258, 150)), ('roof', box_expr(700, 600, 34, 0, 0, 317)), ('ridge', box_expr(700, 24, 36, 0, 0, 352)), ('door-header', box_expr(510, 28, 36, 0, 274, 282))]
    elif style == 'gate':
        parts += [('left-pier', box_expr(76, 74, 280, -260, 0, 140)), ('right-pier', box_expr(76, 74, 280, 260, 0, 140)), ('gate-canopy', box_expr(620, 120, 48, 0, 0, 304)), ('concourse-roof', box_expr(850, 420, 38, 0, -185, 332)), ('gate-apron', box_expr(500, 150, 18, 0, 80, 10))]
    elif style == 'jet-bridge':
        parts += [('terminal-base', box_expr(240, 220, 190, -280, 0, 95)), ('terminal-connector', box_expr(170, 155, 135, -220, 0, 248)), ('telescoping-section', box_expr(370, 130, 118, 30, 0, 230)), ('docking-head', box_expr(165, 190, 142, 285, 0, 240)), ('support-column', box_expr(40, 40, 205, 20, 0, 105)), ('support-wheel-base', box_expr(180, 118, 22, 20, 0, 12))]
        parts.append(('support-wheel-left', cylinder_y_expr(16, 28, 20, -51, 28)))
        parts.append(('support-wheel-right', cylinder_y_expr(16, 28, 20, 59, 28)))
    elif style == 'edge-light':
        parts += [('ground-plate', box_expr(92, 72, 12, 0, 0, 6)), ('light-stem', 'cylinder(50, 11, 8).translate(0, 0, 12)'), ('lamp-housing', sphere_expr(24, 1.1, 1.1, 0.72, 0, 0, 62))]
    elif style == 'threshold':
        parts.append(('base-bar', box_expr(420, 56, 14, 0, 0, 7)))
        for index in range(9):
            x = -190 + index * 47.5
            parts.append((f'left-light-{index + 1:02d}', f'cylinder(30, 11, 8).translate({n(x)}, -27, 14)'))
            parts.append((f'right-light-{index + 1:02d}', f'cylinder(30, 11, 8).translate({n(x)}, 27, 14)'))
    elif style == 'sign':
        parts += [('panel', box_expr(270, 38, 116, 0, 0, 225)), ('left-post', box_expr(14, 14, 192, -96, 0, 96)), ('right-post', box_expr(14, 14, 192, 96, 0, 96)), ('left-foot', box_expr(60, 54, 16, -96, 0, 8)), ('right-foot', box_expr(60, 54, 16, 96, 0, 8))]
    elif style == 'windsock':
        parts += [('mast', 'cylinder(520, 8, 8)'), ('support-ring', 'cylinder(10, 68, 12).subtract(cylinder(12, 54, 12).translate(0, 0, -1)).translate(0, 0, 472)'), ('sock-tail', sphere_expr(52, 2.0, 0.3, 0.3, 100, 0, 472)), ('sock-mouth', cylinder_x_expr(32, 45, 43, 0, 472))]
        for side, x, y in [('left', -48, 0), ('right', 48, 0), ('front', 0, -48), ('back', 0, 48)]:
            parts.append((f'{side}-ring-support', box_expr(8, 8, 46, x, y, 494)))
    elif style == 'approach':
        parts += [('center-mast', 'cylinder(190, 12, 8)'), ('crossbar', box_expr(18, 330, 18, 0, 0, 188)), ('center-light', sphere_expr(22, 1, 1, 0.7, 0, 0, 205))]
        for side, y in [('left', -122), ('right', 122)]:
            parts.append((f'{side}-brace', box_expr(18, 18, 144, 0, y, 108)))
            parts.append((f'{side}-end-light', sphere_expr(18, 0.9, 0.9, 0.7, 0, y, 202)))
    elif style == 'papi':
        parts.append(('base-rail', box_expr(290, 45, 18, 0, 0, 9)))
        for index in range(4):
            x = -108 + index * 72
            parts.append((f'lamp-{index + 1}', box_expr(48, 40, 62, x, 0, 49)))
            parts.append((f'lamp-bracket-{index + 1}', box_expr(16, 16, 34, x, 0, 18)))
    elif style == 'uld':
        parts += [('pallet', box_expr(240, 210, 22, 0, 0, 11)), ('cargo-body', box_expr(228, 198, 196, 0, 0, 120)), ('roof', box_expr(196, 178, 26, 0, 0, 231)), ('front-lip', box_expr(240, 18, 22, 0, 104, 29))]
    elif style == 'chocks':
        for side, y in [('left', -58), ('right', 58)]:
            points = [(-70, 0), (70, 0), (70, 48)]
            parts.append((f'{side}-chock', f'{polygon_expr(points, 42, 0).replace(".translate(0, 0, 0)", f".rotate([1, 0, 0], 90).translate(0, {n(y)}, 0)")}'))
        parts.append(('safety-rope', cylinder_x_expr(150, 5, 0, 0, 18)))
    return parts


def model_source(asset):
    asset_id, title, description, kind, color, spec = asset
    if kind == 'plane':
        parts = plane_parts(spec)
    elif kind == 'helicopter':
        parts = helicopter_parts(spec)
    elif kind == 'vehicle':
        parts = vehicle_parts(spec)
    else:
        parts = fixture_parts(spec)
    lines = [
        'meta({',
        f"  name: '{asset_id}',",
        "  license: 'CC0-1.0',",
        f"  title: '{title}',",
        f"  description: '{description}',",
        "  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],",
        "  kit: 'airfield',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],",
        '  triangleBudget: 1800',
        '});',
        '',
        "const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });",
        f"const color = param('color', '{color}', {{ label: 'Asset color' }});",
        f'const p = assembly("{asset_id}");',
    ]
    for name, expression in parts:
        lines.append(f'p.part("{name}", {expression}.scale(scale).color(color));')
    lines += ['', 'return p.model();', '']
    return '\n'.join(lines)


def main():
    KIT.mkdir(parents=True, exist_ok=True)
    (KIT / 'kit.json').write_text(json.dumps({
        'title': 'Airfield',
        'description': 'Original low-poly aircraft, apron service vehicles and airport fixtures with editable size and color controls.'
    }, indent=2) + '\n')
    for asset in ASSETS:
        (KIT / f'{asset[0]}.kcad.ts').write_text(model_source(asset))
    print(f'generated {len(ASSETS)} airfield assets in {KIT}')


if __name__ == '__main__':
    main()
