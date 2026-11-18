#!/usr/bin/env python3
"""Generate original, parameterized kernelCAD retail fixture models."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / 'catalog' / 'kits' / 'retail-store'
KIT.mkdir(parents=True, exist_ok=True)
for stale in KIT.glob('*.kcad.ts'):
    stale.unlink()


def B(name, x, y, z, w, d, h):
    return (name, f'b({x}, {y}, {z}, {w}, {d}, {h})')


def C(name, x, y, z, h, r, sides=8):
    return (name, f'c({x}, {y}, {z}, {h}, {r}, {sides})')


def X(name, x, y, z, h, r, sides=8):
    return (name, f'cx({x}, {y}, {z}, {h}, {r}, {sides})')


ASSETS = [
    ('checkout-counter', 'Checkout counter', 'Retail checkout counter with customer ledge, cashier worktop, front kick panel and bagging return.', '#53697a', [
        B('base', 0, 0, 240, 1500, 700, 480), B('customer-ledge', -40, -390, 510, 1700, 180, 40),
        B('worktop', 30, 0, 500, 1350, 640, 60), B('bagging-return', 1040, 0, 475, 360, 690, 70),
        C('scanner-window', 520, -180, 530, 18, 90, 8), B('front-panel', -40, 356, 265, 1340, 14, 350),
    ]),
    ('checkout-conveyor', 'Checkout conveyor lane', 'Short checkout belt with side rails, cashier end, scanner deck and a bagging platform.', '#46545e', [
        B('belt-base', 0, 0, 310, 1500, 550, 620), B('belt-surface', -180, 0, 625, 1000, 470, 30),
        B('rail-left', -180, -244, 674, 1040, 24, 70), B('rail-right', -180, 244, 674, 1040, 24, 70),
        B('cashier-end', 510, 0, 420, 380, 600, 840), B('bagging-deck', 910, 0, 410, 440, 620, 820),
        C('scanner', 270, 0, 650, 25, 50, 8),
    ]),
    ('self-checkout-kiosk', 'Self-checkout kiosk', 'Compact self-checkout pedestal with tilted display housing, scanner deck, bag hook and payment shelf.', '#556b73', [
        B('foot', 0, 0, 30, 570, 500, 60), B('pedestal', 0, 0, 360, 250, 220, 660),
        B('scanner-deck', 0, -140, 725, 510, 330, 70), B('display', 0, 40, 900, 500, 100, 300),
        B('screen', 0, -18, 910, 390, 18, 205), C('scanner-window', 0, -160, 765, 12, 72, 8),
        B('bag-hook', 235, 105, 490, 170, 26, 24),
    ]),
    ('assisted-checkout-till', 'Assisted checkout till', 'Cashier station with a register housing, customer-facing display, receipt printer and till top.', '#596776', [
        B('register-base', 0, 0, 45, 500, 350, 90), B('register-body', 0, 0, 190, 410, 280, 300),
        B('keypad-deck', -40, -70, 365, 260, 170, 45), B('customer-display', 60, 110, 465, 240, 40, 130),
        B('display-screen', 60, 84, 470, 190, 12, 90), C('receipt-roll', -150, 50, 345, 70, 35, 10),
    ]),
    ('cash-drawer', 'Cash drawer', 'Retail till drawer with broad faceplate, recessed pull and compact lock cylinder.', '#60676c', [
        B('drawer-box', 0, 0, 80, 430, 440, 160), B('faceplate', 0, -226, 90, 450, 22, 138),
        B('pull', 0, -246, 105, 100, 12, 24), C('lock', 150, -246, 105, 12, 16, 8),
    ]),
    ('barcode-scanner', 'Barcode scanner', 'Countertop barcode scanner with a sloped reading window, raised side housing and low base.', '#3e4a51', [
        B('base', 0, 0, 36, 310, 240, 72), B('scanner-head', 0, 0, 112, 260, 210, 90),
        B('front-window', 0, -108, 145, 185, 12, 52), B('side-window', 136, 0, 144, 12, 135, 44),
        C('status-light', 110, 60, 158, 18, 10, 8),
    ]),
    ('payment-terminal', 'Payment terminal', 'Handheld payment pin pad with angled display, keypad block, contactless area and stand.', '#42515d', [
        B('base', 0, 0, 25, 210, 190, 50), B('housing', 0, 0, 105, 180, 155, 150),
        B('screen', 0, -82, 160, 132, 12, 65), B('keypad', 0, 36, 166, 126, 75, 40),
        C('contactless-mark', 0, -6, 165, 10, 24, 8),
    ]),
    ('receipt-printer', 'Receipt printer', 'Small point-of-sale receipt printer with paper slot, lid seam and roll cover.', '#596167', [
        B('base', 0, 0, 48, 255, 235, 96), B('cover', 0, 0, 128, 250, 230, 65),
        B('paper-slot', 0, -120, 165, 180, 12, 14), C('status-button', 91, -122, 167, 15, 10, 8),
    ]),
    ('checkout-bagging-stand', 'Bagging stand', 'Freestanding bagging station with broad work surface, four legs and lower storage brace.', '#806a50', [
        B('top', 0, 0, 780, 850, 620, 70), B('lower-brace', 0, 0, 310, 570, 480, 36),
        *[B(f'leg-{x}-{y}', x, y, 390, 48, 48, 780) for x in (-370, 370) for y in (-245, 245)],
        C('bag-holder', 0, 0, 815, 50, 58, 10),
    ]),
    ('checkout-divider', 'Checkout divider', 'Low polygon checkout divider with long body, raised grip fin and beveled-looking end blocks.', '#df973e', [
        B('body', 0, 0, 26, 260, 62, 52), B('grip-fin', 0, 0, 64, 24, 54, 32),
        B('end-left', -112, 0, 42, 38, 76, 84), B('end-right', 112, 0, 42, 38, 76, 84),
        C('top-button', 0, 0, 80, 10, 12, 8),
    ]),
    ('queue-barrier', 'Queue barrier', 'Short retractable queue barrier with square weighted feet, posts and a taut cross strap.', '#55595d', [
        B('foot-left', -500, 0, 24, 280, 280, 48), B('foot-right', 500, 0, 24, 280, 280, 48),
        C('post-left', -500, 0, 48, 930, 42, 10), C('post-right', 500, 0, 48, 930, 42, 10),
        B('strap', 0, 0, 900, 1000, 20, 42), C('cap-left', -500, 0, 975, 25, 55, 10), C('cap-right', 500, 0, 975, 25, 55, 10),
    ]),
    ('queue-stanchion', 'Queue stanchion', 'Single retail queue post with a broad weighted base, slender pole and four-way strap cap.', '#5a5b58', [
        C('base', 0, 0, 0, 55, 175, 12), C('pole', 0, 0, 55, 875, 28, 10),
        C('top-cap', 0, 0, 930, 58, 64, 10), B('strap-slot', 0, 0, 960, 160, 18, 16),
    ]),
    ('gondola-shelf', 'Gondola shelf', 'Double-sided supermarket gondola with perforated-look back panel, six shelves and stabilizing feet.', '#59707a', [
        B('back-panel', 0, 0, 1000, 1800, 54, 2000),
        *[B(f'shelf-{i}', 0, side * 260, 330 + i * 300, 1800, 540, 45) for side in (-1, 1) for i in range(3)],
        *[B(f'upright-{x}', x, 0, 1000, 50, 70, 2000) for x in (-840, 840)],
        *[B(f'foot-{x}', x, 0, 34, 220, 740, 68) for x in (-730, 730)],
    ]),
    ('wall-shelf-unit', 'Wall shelf unit', 'Single-sided wall shelving with four adjustable decks, side uprights and a header board.', '#806e5b', [
        B('back', 0, 0, 1040, 1400, 48, 2080),
        *[B(f'deck-{i}', 0, -180, 330 + i * 390, 1420, 510, 50) for i in range(4)],
        *[B(f'side-{x}', x, -180, 1040, 52, 500, 2080) for x in (-674, 674)],
        B('header', 0, -160, 2160, 1400, 100, 160), C('foot', 0, 0, 0, 48, 80, 8),
    ]),
    ('shelf-endcap', 'Shelf endcap display', 'Gondola endcap with stepped product decks, tall rear board and sign panel.', '#64747a', [
        B('rear-board', 0, 240, 960, 900, 50, 1920),
        *[B(f'deck-{i}', 0, -130 + i * 45, 270 + i * 300, 920, 460 - i * 60, 48) for i in range(4)],
        B('header', 0, 205, 2040, 880, 70, 180), *[B(f'leg-{x}', x, 0, 500, 42, 52, 1000) for x in (-405, 405)],
        C('base-cap', 0, 0, 0, 30, 62, 8),
    ]),
    ('produce-display-table', 'Produce display table', 'Tiered produce island with three broad sloped-look display decks and a stout lower frame.', '#6c7954', [
        B('lower-deck', 0, 0, 560, 1900, 900, 70), B('middle-deck', 0, -120, 880, 1750, 700, 70),
        B('upper-deck', 0, -230, 1200, 1550, 500, 70), B('front-apron', 0, -465, 645, 1780, 32, 170),
        *[B(f'leg-{x}-{y}', x, y, 265, 65, 65, 530) for x in (-820, 820) for y in (-350, 350)], C('corner-cap', 0, 0, 1370, 40, 48, 8),
    ]),
    ('bakery-display-case', 'Bakery display case', 'Counter-height bakery case with lower cabinet, display plinth, glass-frame posts and canopy.', '#8b7158', [
        B('cabinet', 0, 0, 390, 1500, 650, 780), B('display-deck', 0, -20, 805, 1480, 580, 50),
        B('canopy', 0, 0, 1380, 1540, 680, 50),
        *[B(f'post-{x}-{y}', x, y, 1090, 36, 36, 540) for x in (-710, 710) for y in (-275, 275)],
        B('front-rail', 0, -310, 1080, 1460, 28, 36), C('corner-trim', 0, 0, 1470, 30, 32, 8),
    ]),
    ('refrigerated-display-case', 'Refrigerated display case', 'Open-front chilled display with insulated base, three shelf decks and a raised top canopy.', '#687a7c', [
        B('base-cabinet', 0, 0, 360, 1800, 850, 720), B('bottom-deck', 0, -100, 760, 1720, 650, 48),
        *[B(f'shelf-{i}', 0, -140, 890 + i * 300, 1720, 590, 42) for i in range(3)],
        B('canopy', 0, 0, 1800, 1880, 900, 90), *[B(f'front-upright-{x}', x, -350, 1260, 42, 42, 950) for x in (-840, 840)],
        C('temperature-dial', 830, 437, 400, 22, 28, 8),
    ]),
    ('upright-drink-cooler', 'Upright drink cooler', 'Tall single-door beverage cooler with framed door, handle, compressor plinth and top header.', '#536d78', [
        B('cabinet', 0, 0, 950, 780, 700, 1900), B('door-frame', 0, -365, 1120, 710, 22, 1460),
        B('door-window', 0, -382, 1120, 590, 12, 1280), B('handle', 300, -410, 1120, 34, 36, 530),
        *[B(f'inner-shelf-{i}', 0, -280, 540 + i * 320, 570, 510, 28) for i in range(4)],
        B('top-header', 0, -40, 1950, 780, 620, 100), C('compressor-grille', 0, 0, 0, 65, 260, 8),
    ]),
    ('chest-freezer', 'Chest freezer', 'Lidded chest freezer with raised sliding cover rails, insulated tub and recessed foot plinth.', '#cad2d2', [
        B('plinth', 0, 0, 80, 1480, 760, 160), B('tub', 0, 0, 400, 1400, 680, 640),
        B('lid-left', -340, 0, 750, 720, 700, 60), B('lid-right', 340, 0, 750, 720, 700, 60),
        B('handle', 0, -365, 735, 260, 24, 30), C('thermostat', 560, -355, 705, 32, 32, 8),
    ]),
    ('deli-service-case', 'Deli service case', 'Customer-facing deli counter with raised display deck, sneeze-guard frame and base cabinet.', '#858074', [
        B('base', 0, 0, 430, 1750, 700, 860), B('display-deck', 0, -80, 885, 1720, 620, 50),
        B('canopy', 0, 0, 1560, 1760, 720, 60),
        *[B(f'glass-post-{x}', x, -250, 1220, 34, 34, 680) for x in (-800, 0, 800)],
        B('customer-rail', 0, -365, 930, 1720, 24, 34), C('scale-platform', 570, 180, 920, 25, 105, 8),
    ]),
    ('bulk-food-bin', 'Bulk goods bin', 'Open-top bulk dispenser with tapered-look stand, front scoop tray and a shallow lid lip.', '#7f705a', [
        B('base', 0, 0, 420, 560, 560, 840), B('hopper', 0, 0, 910, 650, 650, 260),
        B('top-rim', 0, 0, 1050, 720, 720, 40), B('scoop-tray', 0, -360, 310, 390, 130, 120),
        B('scoop-lip', 0, -430, 365, 400, 24, 26), C('dispense-knob', 0, -310, 560, 65, 28, 8),
    ]),
    ('impulse-merchandiser', 'Impulse merchandiser', 'Narrow checkout-side impulse display with four shallow trays and a signboard mast.', '#bc7d3d', [
        B('base', 0, 0, 30, 430, 390, 60), B('backboard', 0, 150, 770, 400, 45, 1540),
        *[B(f'tray-{i}', 0, -40, 200 + i * 290, 440, 310, 90) for i in range(4)],
        B('header', 0, 150, 1620, 410, 65, 160), C('mast-cap', 0, 150, 1700, 24, 38, 8),
    ]),
    ('floor-display-stand', 'Floor display stand', 'Compact promotional floor stand with tiered shelves, side cheeks and broad header panel.', '#b67942', [
        B('foot', 0, 0, 40, 680, 620, 80), B('back', 0, 240, 650, 650, 50, 1300),
        *[B(f'shelf-{i}', 0, -100, 190 + i * 270, 670 - i * 35, 380 - i * 30, 42) for i in range(4)],
        B('header', 0, 240, 1410, 660, 90, 220), C('top-bolt', 0, 0, 1530, 24, 18, 8),
    ]),
    ('magazine-rack', 'Magazine rack', 'Angled multi-pocket magazine stand with four front lips, tall backboard and side supports.', '#6c5e50', [
        B('backboard', 0, 120, 700, 700, 55, 1400),
        *[B(f'pocket-{i}', 0, -120 + i * 58, 190 + i * 300, 680, 300, 95) for i in range(4)],
        *[B(f'side-{x}', x, 0, 710, 38, 350, 1420) for x in (-350, 350)], C('floor-foot', 0, 0, 0, 35, 60, 8),
    ]),
    ('clothing-rail', 'Clothing rail', 'Retail garment rail with straight hanging bar, four corner posts and stabilizing feet.', '#5c6264', [
        B('top-rail', 0, 0, 1510, 1500, 50, 50),
        *[B(f'post-{x}-{y}', x, y, 755, 42, 42, 1510) for x in (-700, 700) for y in (-205, 205)],
        *[B(f'foot-{x}', x, 0, 30, 220, 420, 60) for x in (-700, 700)], C('end-cap', 750, 0, 1510, 40, 36, 8),
    ]),
    ('wire-grid-display', 'Wire grid display', 'Freestanding wire-grid merchandise panel with side feet, cross rails and hanging peg bars.', '#60686a', [
        B('grid-frame', 0, 0, 850, 1200, 36, 1700),
        *[B(f'vertical-{i}', -500 + i * 200, -24, 850, 18, 18, 1660) for i in range(6)],
        *[B(f'horizontal-{i}', 0, -24, 160 + i * 230, 1160, 18, 18) for i in range(7)],
        *[B(f'foot-{x}', x, 0, 30, 260, 500, 60) for x in (-430, 430)], C('hook-mount', 0, 0, 1720, 36, 30, 8),
    ]),
    ('pallet-display', 'Promotional pallet display', 'Low promotional island with a pallet base, stacked riser blocks and a tall branded sign panel.', '#8c704c', [
        B('pallet-deck', 0, 0, 95, 1200, 1000, 190),
        *[B(f'runner-{x}', x, 0, 32, 135, 880, 64) for x in (-440, 0, 440)],
        B('display-base', 0, 0, 390, 1000, 800, 400), B('sign-mast', 0, 380, 1050, 55, 70, 900),
        B('sign-panel', 0, 380, 1560, 760, 70, 240), C('mast-cap', 0, 380, 1680, 28, 42, 8),
    ]),
    ('shopping-cart', 'Shopping cart', 'Low-poly wire basket cart with tubular frame, child seat panel, lower rack and four casters.', '#627178', [
        B('basket-floor', 0, -20, 610, 820, 530, 34), B('basket-front', 0, -270, 825, 820, 24, 430),
        B('basket-back', 0, 230, 860, 820, 24, 360),
        *[B(f'basket-side-{x}', x, -20, 815, 24, 500, 430) for x in (-400, 400)],
        B('handlebar', 0, 325, 1060, 620, 34, 38),
        *[B(f'handle-post-{x}', x, 280, 990, 26, 100, 180) for x in (-300, 300)],
        B('lower-rack', 0, -10, 300, 640, 380, 24),
        *[X(f'wheel-{x}-{y}', x, y, 78, 60, 78, 10) for x in (-390, 390) for y in (-250, 250)],
        *[B(f'wheel-mount-{x}-{y}', x, y, 385, 52, 76, 460) for x in (-390, 390) for y in (-250, 250)],
        *[B(f'frame-{x}', x, 0, 480, 24, 28, 840) for x in (-400, 400)],
    ]),
    ('handbasket', 'Hand basket', 'Compact hand basket with open-frame sides, reinforced rim and raised swing handle.', '#d18c42', [
        B('basket-base', 0, 0, 40, 460, 320, 80), B('rim', 0, 0, 330, 500, 360, 48),
        *[B(f'side-rib-x-{i}', -210 + i * 70, 0, 190, 16, 300, 280) for i in range(7)],
        *[B(f'side-rib-y-{i}', 0, -140 + i * 70, 190, 440, 16, 280) for i in range(5)],
        *[B(f'handle-side-{x}', x, 0, 470, 20, 22, 280) for x in (-220, 220)], B('handle-grip', 0, 0, 610, 450, 28, 26),
        C('pivot-cap', -220, 0, 325, 22, 22, 8),
    ]),
    ('shopping-basket', 'Shopping basket', 'Rigid shopping basket with deep molded body, broad top rim and two short swing handles.', '#b56c3b', [
        B('body', 0, 0, 180, 540, 380, 360), B('rim', 0, 0, 370, 600, 430, 46),
        B('handle-left', -220, 0, 500, 22, 28, 230), B('handle-right', 220, 0, 500, 22, 28, 230),
        B('grip', 0, 0, 615, 460, 30, 30), C('pivot-left', -230, 0, 350, 20, 22, 8), C('pivot-right', 230, 0, 350, 20, 22, 8),
    ]),
    ('flatbed-stock-trolley', 'Flatbed stock trolley', 'Warehouse-style retail flatbed trolley with deck, raised end handle and four swivel wheels.', '#59666b', [
        B('deck', 0, 0, 420, 1100, 700, 70), B('handle-upright', 0, 310, 760, 60, 55, 680),
        B('handle-grip', 0, 310, 1100, 430, 52, 54), B('toe-plate', 0, -330, 365, 1100, 70, 35),
        *[X(f'caster-{x}-{y}', x, y, 64, 80, 64, 10) for x in (-440, 440) for y in (-260, 260)],
        *[B(f'caster-mount-{x}-{y}', x, y, 259, 46, 46, 260) for x in (-440, 440) for y in (-260, 260)],
        *[C(f'corner-bumper-{x}-{y}', x, y, 455, 48, 38, 8) for x in (-480, 480) for y in (-280, 280)],
    ]),
    ('stock-ladder', 'Stock ladder', 'Compact rolling stock ladder with three broad treads, side rails, top platform and caster feet.', '#606d75', [
        B('top-platform', 0, 0, 850, 720, 530, 90),
        *[B(f'tread-{i}', 0, -190 + i * 90, 210 + i * 205, 650, 180, 54) for i in range(3)],
        *[B(f'rail-{x}', x, 0, 460, 52, 60, 920) for x in (-300, 300)],
        *[X(f'caster-{x}', x, 0, 44, 64, 44, 8) for x in (-280, 280)],
    ]),
    ('stock-hand-truck', 'Stock hand truck', 'Two-wheel stock hand truck with toe plate, tall spine, upper grip and chunky tires.', '#5f6870', [
        B('spine', 0, 0, 520, 70, 90, 1040), B('toe-plate', 0, -130, 45, 560, 360, 90),
        B('top-grip', 0, 0, 1100, 400, 52, 54),
        *[X(f'wheel-{x}', x, 0, 145, 70, 145, 12) for x in (-235, 235)],
        *[B(f'wheel-guard-{x}', x, 50, 240, 34, 90, 300) for x in (-180, 180)],
    ]),
    ('roll-cage-trolley', 'Roll cage trolley', 'Four-wheel roll cage with raised side grid, loading deck, swing door and pull handle.', '#626c70', [
        B('base-deck', 0, 0, 160, 900, 720, 140),
        *[B(f'post-{x}-{y}', x, y, 770, 35, 35, 1540) for x in (-420, 420) for y in (-330, 330)],
        *[B(f'crossbar-{i}', 0, 330, 230 + i * 210, 820, 22, 22) for i in range(6)],
        B('door-bar', 390, -330, 720, 22, 30, 1360), B('pull-handle', 420, -330, 720, 28, 80, 170),
        *[X(f'caster-{x}-{y}', x, y, 54, 72, 54, 8) for x in (-370, 370) for y in (-390, 390)],
        *[B(f'caster-mount-{x}-{y}', x, y, 138, 45, 90, 96) for x in (-370, 370) for y in (-350, 350)],
    ]),
    ('wooden-pallet', 'Wooden pallet', 'Reusable three-runner pallet with spaced top boards and open forklift entry gaps.', '#96774f', [
        *[B(f'top-board-{i}', 0, -360 + i * 180, 150, 1200, 112, 44) for i in range(5)],
        *[B(f'runner-{x}', x, 0, 78, 120, 950, 156) for x in (-440, 0, 440)],
        *[B(f'block-{x}-{y}', x, y, 26, 145, 180, 52) for x in (-440, 0, 440) for y in (-335, 335)],
        C('nail-head', -530, -360, 174, 10, 10, 8),
    ]),
    ('produce-crate-stack', 'Produce crate stack', 'Stack of four ventilated produce crates with hand slots and reinforced corner posts.', '#71945a', [
        *[B(f'crate-{i}', x, y, 170 + i * 350, 620, 520, 340) for i, (x, y) in enumerate([(-320, -260), (320, -260), (-320, 260), (320, 260)])],
        *[B(f'vent-{i}', -320 + (i % 2) * 640, -530, 175 + (i // 2) * 350, 260, 18, 60) for i in range(4)],
        C('stack-pin', 0, 0, 1370, 28, 26, 8),
    ]),
    ('bottle-return-kiosk', 'Bottle return kiosk', 'Bottle return fixture with tapered-looking intake hood, bin body, status panel and service door.', '#5a786b', [
        B('bin', 0, 0, 540, 920, 760, 1080), B('intake-hood', 0, -270, 1200, 720, 260, 220),
        B('opening', 0, -410, 1180, 430, 20, 115), B('control-panel', 305, -395, 980, 170, 24, 310),
        B('service-door', -240, -390, 480, 380, 22, 600), C('status-light', 305, -425, 1100, 28, 22, 8),
    ]),
    ('parcel-locker-bank', 'Parcel locker bank', 'Self-service parcel locker bank with mixed-size door bays, keypad column and top sign panel.', '#6e7d84', [
        B('back', 0, 60, 1250, 1600, 110, 2500),
        *[B(f'locker-{col}-{row}', -520 + col * 520, 0, 250 + row * 500, 500, 90, 470) for col in range(3) for row in range(4)],
        B('keypad-panel', 720, -100, 1120, 180, 100, 1100), B('header', 0, -5, 2570, 1600, 220, 140),
        *[C(f'lock-{col}-{row}', -650 + col * 520, -58, 260 + row * 500, 16, 16, 8) for col in range(3) for row in range(4)],
    ]),
    ('customer-service-desk', 'Customer service desk', 'Store service counter with lowered accessible return ledge, raised worktop and back display panel.', '#81705d', [
        B('main-counter', 0, 80, 470, 1900, 620, 940), B('customer-ledge', 0, -320, 500, 1950, 160, 60),
        B('accessible-return', 600, 180, 390, 650, 650, 780), B('back-display', 0, 350, 1240, 1850, 70, 520),
        B('screen', 300, 300, 1570, 360, 35, 280), C('call-button', -720, -420, 540, 22, 26, 8),
    ]),
    ('aisle-sign', 'Aisle sign', 'Single aisle marker with a broad hanging panel, two ceiling rods and compact end caps.', '#dfaa40', [
        B('sign-panel', 0, 0, 225, 720, 90, 420), B('top-border', 0, 0, 445, 760, 22, 30),
        B('bottom-border', 0, 0, 15, 760, 22, 30), C('rod-left', -270, 0, 445, 560, 15, 8), C('rod-right', 270, 0, 445, 560, 15, 8),
        C('cap', 0, 0, 471, 22, 24, 8),
    ]),
    ('hanging-wayfinding-sign', 'Hanging wayfinding sign', 'Double-sided overhead store direction sign with a long panel and two ceiling suspension rods.', '#54707a', [
        B('panel', 0, 0, 230, 1600, 100, 460), B('top-edge', 0, 0, 470, 1640, 125, 28),
        C('hanger-left', -570, 0, 468, 650, 18, 8), C('hanger-right', 570, 0, 468, 650, 18, 8),
        B('arrow-block', 0, -62, 222, 170, 18, 18),
    ]),
    ('price-check-scale', 'Price-check scale', 'Countertop produce scale with broad platform, raised readout head and four-key control pad.', '#6f777b', [
        B('base', 0, 0, 42, 380, 340, 84), B('weigh-platform', 0, 0, 105, 330, 290, 42),
        B('post', 0, 80, 265, 56, 46, 310), B('display', 0, 90, 445, 290, 60, 155),
        B('screen', 0, 55, 455, 225, 12, 72),
        *[C(f'key-{i}', -66 + i * 44, -110, 148, 18, 14, 8) for i in range(4)],
    ]),
    ('entry-security-gate', 'Entry security gate', 'One retail entrance security pedestal with sensing tower, status light and floor anchor plate.', '#59646a', [
        B('base', 0, 0, 40, 350, 270, 80), B('pedestal', 0, 0, 500, 240, 190, 920),
        B('sensor-face', 0, -100, 560, 180, 15, 330), C('status-light', 0, -125, 780, 38, 26, 8),
        *[B(f'anchor-{x}-{y}', x, y, 14, 60, 60, 28) for x in (-130, 130) for y in (-90, 90)],
    ]),
    ('trolley-corral', 'Trolley corral', 'Low cart-return bay with parallel divider rails, end stop and corner guard posts.', '#5d6b70', [
        B('floor-rail-left', 0, -330, 24, 1800, 35, 48), B('floor-rail-right', 0, 330, 24, 1800, 35, 48),
        B('end-stop', 850, 0, 240, 50, 690, 480), B('front-gate', -850, 0, 330, 38, 690, 660),
        *[B(f'divider-{i}', -600 + i * 300, 0, 145, 26, 620, 290) for i in range(5)],
        *[C(f'post-cap-{x}', x, 0, 660, 32, 32, 8) for x in (-850, 850)],
    ]),
    ('shopping-bag-dispenser', 'Shopping bag dispenser', 'Wall-mounted bag dispenser with cover hood, stack cavity and lower pull slot.', '#7c776c', [
        B('backplate', 0, 30, 390, 470, 75, 780), B('hood', 0, -70, 730, 520, 210, 100),
        B('bag-stack', 0, -160, 420, 360, 20, 540), B('pull-slot', 0, -180, 130, 260, 20, 50),
        C('mount-left', -170, 85, 680, 28, 24, 8), C('mount-right', 170, 85, 680, 28, 24, 8),
    ]),
    ('returns-drop-bin', 'Returns drop bin', 'Store returns collection bin with hinged-look lid, front deposit slot and lower label plate.', '#47736e', [
        B('bin', 0, 0, 430, 680, 600, 860), B('lid', 0, 0, 885, 720, 640, 50),
        B('deposit-slot', 0, -315, 840, 300, 18, 36), B('label-panel', 0, -314, 490, 410, 16, 180),
        C('lid-hinge-left', -285, 280, 885, 35, 26, 8), C('lid-hinge-right', 285, 280, 885, 35, 26, 8),
    ]),
    ('recycling-station', 'Retail recycling station', 'Three-stream recycling station with separate openings, top dividers and a shared removable base.', '#527a65', [
        *[B(f'bin-{i}', -390 + i * 390, 0, 400, 360, 440, 800) for i in range(3)],
        *[B(f'opening-{i}', -390 + i * 390, -230, 840, 220, 22, 110) for i in range(3)],
        B('shared-top', 0, 0, 830, 1190, 480, 60), B('base-plinth', 0, 0, 35, 1210, 500, 70),
        *[C(f'corner-foot-{i}', -540 + i * 540, 0, 0, 28, 28, 8) for i in range(3)],
    ]),
]


def render_asset(asset):
    asset_id, title, description, default_color, parts = asset
    uses_box = any(expr.startswith('b(') for _, expr in parts)
    uses_cylinder = any(expr.startswith('c(') for _, expr in parts)
    uses_x_cylinder = any(expr.startswith('cx(') for _, expr in parts)
    lines = [
        '// SPDX-License-Identifier: CC0-1.0',
        '// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.',
        '',
        'meta({',
        f'  name: {json.dumps(asset_id)},',
        "  license: 'CC0-1.0',",
        f'  title: {json.dumps(title)},',
        f'  description: {json.dumps(description + " Knobs: overall scale and asset color.")},',
        "  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],",
        "  kit: 'retail-store',",
        "  category: 'prop',",
        "  origin: 'base',",
        "  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],",
        '  triangleBudget: 1800,',
        '});',
        '',
        "const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });",
        f"const color = param('color', {json.dumps(default_color)}, {{ label: 'Asset color' }});",
    ]
    if uses_box:
        lines.append('const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);')
    if uses_cylinder:
        lines.append('const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);')
    if uses_x_cylinder:
        lines.append('const cx = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).rotate([0, 1, 0], 90).translate(x - h / 2, y, z).scale(scale);')
    lines += ['', f"const p = assembly({json.dumps(asset_id)});"]
    lines.extend(f"p.part({json.dumps(name)}, {expr}.color(color));" for name, expr in parts)
    lines += ['', 'return p.model();', '']
    return '\n'.join(lines)


for asset in ASSETS:
    asset_id = asset[0]
    (KIT / f'{asset_id}.kcad.ts').write_text(render_asset(asset))

(KIT / 'kit.json').write_text(json.dumps({
    'title': 'Retail store',
    'description': 'Original low-poly shop fixtures, checkout equipment, stock handling and customer-service props with editable scale and color controls.',
}, indent=2) + '\n')

print(f'generated {len(ASSETS)} retail-store assets in {KIT}')
