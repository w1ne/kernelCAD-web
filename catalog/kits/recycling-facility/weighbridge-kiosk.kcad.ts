// SPDX-License-Identifier: CC0-1.0
// Weighbridge kiosk: the steel operator cabin that stands beside a recovery
// site's weighbridge, where drivers hand over paperwork and collect tickets.
// What makes it a weighbridge office rather than a shed: a long lane-side
// window with a sliding serving hatch and an external deal tray at cab
// height, a driver intercom and ticket slot on a post, a stop/go signal on
// the corner, a mono-pitch roof overhanging the window, a side door with a
// vision panel and steel step, a wall-hung air-conditioning unit, and the
// whole cabin raised on a skid over concrete pads.
// Generic visualization geometry at about real size (2.4 x 1.8 m cabin,
// 2.8 m to the roof), millimetres, Z up, lane side on -Y.

meta({
  name: "weighbridge-kiosk",
  license: 'CC0-1.0',
  title: "Weighbridge kiosk",
  description: "Weighbridge operator cabin at about real size: raised steel cabin with ribbed cladding, long lane-side window with sliding serving hatch and external deal tray, driver intercom and ticket slot post, stop/go signal, mono-pitch overhanging roof, side door with vision panel and step, wall-hung air conditioner. Signal shows stop or go. Material controls: cladding, trim, glazing and accent band. siteGreen, portacabin and weathered presets.",
  tags: ["weighbridge", "kiosk", "weighbridge office", "gatehouse", "operator cabin", "recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cladding = param('cladding', '#4f7a5a', { label: 'Wall cladding (painted steel)' });
const trim = param('trim', '#e9ebe6', { label: 'Roof, frames and trim' });
const glass = param('glass', '#5d8fa3', { label: 'Glazing' });
const accent = param('accent', '#f0b429', { label: 'Accent band and signage' });
const signal = param('signal', 'stop', { choices: ['stop', 'go'], label: 'Driver signal' });

presets({
  siteGreen: { cladding: '#4f7a5a', trim: '#e9ebe6', glass: '#5d8fa3', accent: '#f0b429' },
  portacabin: { cladding: '#e6e4dc', trim: '#2c4f7c', glass: '#6b97a8', accent: '#2c4f7c' },
  weathered: { cladding: '#6d6a58', trim: '#bdb8a8', glass: '#55767f', accent: '#b4893a' },
});

const p = assembly("weighbridge-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Side outline [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts: number[][], x0: number, x1: number) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const W = 2400;
const D = 1800;
const F = 300; // floor level
const H = 2300; // wall height above the floor
const YF = -D / 2;
const XL = -W / 2;

// Concrete pads and skid frame.
for (const [i, x] of [[0, -900], [1, 900]] as const) add(`pad-${i}`, blk(x, 0, 0, 400, D + 200, 120).color('#9a9b94'));
for (const [i, y] of [[0, YF + 100], [1, -YF - 100]] as const) add(`skid-${i}`, blk(0, y, 120, W + 100, 160, F - 120).color('#3a3d40'));

// Cabin body and vertical cladding ribs on the visible faces.
add("body", blk(0, 0, F, W, D, H).color(cladding));
for (let k = 0; k < 7; k++) add(`rib-side-${k}`, blk(XL - 10, YF + 150 + k * 250, F + 60, 20, 40, H - 120).color(cladding));
add("base-flashing", blk(0, 0, F, W + 30, D + 30, 60).color(trim));
add("accent-band", blk(0, YF - 8, F + 120, W, 16, 160).color(accent));

// Lane-side window with frames, sliding hatch and deal tray.
const WZ = F + 900;
const WH = 1000;
add("window-frame", blk(150, YF - 6, WZ - 40, 1900, 12, WH + 80).color(trim));
add("window-glass", blk(150, YF - 14, WZ, 1820, 8, WH).color(glass));
for (const x of [-300, 600]) add(`mullion-${x < 0 ? 'a' : 'b'}`, blk(x, YF - 20, WZ, 50, 12, WH).color(trim));
add("hatch-frame", blk(-760, YF - 30, WZ, 30, 20, 520).color(trim));
add("hatch-pane", blk(-560, YF - 34, WZ + 40, 400, 8, 440).color('#8bb3c2'));
add("hatch-rail", blk(-300, YF - 30, WZ + 500, 1000, 24, 24).color(trim));
add("deal-tray", blk(-560, YF - 160, WZ - 60, 520, 300, 40).color('#c3c9cb'));
add("deal-tray-lip", blk(-560, YF - 305, WZ - 60, 520, 10, 80).color('#c3c9cb'));
add("tray-bracket", prismX([[YF - 280, WZ - 60], [YF, WZ - 60], [YF, WZ - 300]], -580, -540).color('#7d8386'));
add("sill", blk(150, YF - 70, WZ - 70, 1960, 140, 30).color(trim));

// Mono-pitch roof, overhanging the window and falling to the back.
const RO = 350;
add("roof", prismX([[YF - RO, F + H + 220], [-YF + 150, F + H + 40], [-YF + 150, F + H], [YF - RO, F + H + 160]], XL - 120, -XL + 120).color(trim));
add("roof-fascia", blk(0, YF - RO - 10, F + H + 120, W + 240, 20, 120).color(accent));
add("gutter", cylinder(W + 240, 60, 10).rotateY(90).translate(XL - 120, -YF + 210, F + H + 20).color(trim));
add("downpipe", blk(XL + 80, -YF + 40, 120, 70, 70, F + H - 100).color(trim));

// Side door on -X with vision panel, handle and steel step.
const DY = 300;
add("door", blk(XL - 26, DY, F + 40, 12, 860, 2050).color(trim));
add("door-vision", blk(XL - 34, DY, F + 1300, 6, 300, 600).color(glass));
add("door-handle", blk(XL - 50, DY - 330, F + 1000, 40, 120, 30).color('#3a3d40'));
add("door-kick", blk(XL - 34, DY, F + 40, 6, 860, 220).color('#7d8386'));
add("step", blk(XL - 240, DY, 0, 420, 900, 40).color('#7d8386'));
add("step-tread", blk(XL - 240, DY, 140, 420, 900, 30).color('#7d8386'));
for (const y of [DY - 430, DY + 430]) add(`step-side-${y < DY ? 'a' : 'b'}`, blk(XL - 240, y, 0, 420, 20, 170).color('#7d8386'));

// Wall-hung air conditioner on the door side, high up.
add("ac-unit", blk(XL - 160, -560, F + 1500, 300, 760, 520).color('#e2e3df'));
add("ac-fan", cylinder(10, 190, 18).rotateY(-90).translate(XL - 310, -560, F + 1760).color('#3a3d40'));
for (let k = 0; k < 4; k++) add(`ac-grille-${k}`, blk(XL - 322, -560, F + 1610 + k * 90, 6, 400, 14).color('#9a9d98'));
for (const y of [-860, -260]) add(`ac-bracket-${y < -500 ? 'a' : 'b'}`, blk(XL - 160, y, F + 1440, 300, 30, 60).color('#3a3d40'));

// Stop/go signal on the lane-side corner, facing the driver.
const SX = -XL + 150;
add("signal-arm", blk(SX - 60, YF - 120, F + 1800, 200, 240, 60).color('#3a3d40'));
add("signal-head", blk(SX + 60, YF - 200, F + 1450, 240, 180, 520).color('#1b1c1d'));
const stop = signal.value === 'stop';
add("lamp-red", cylinder(16, 80, 16).rotateX(90).translate(SX + 60, YF - 290, F + 1830).color(stop ? '#ff3b2e' : '#4a1612'));
add("lamp-green", cylinder(16, 80, 16).rotateX(90).translate(SX + 60, YF - 290, F + 1600).color(stop ? '#163d1f' : '#3cdc5a'));
for (const z of [F + 1830, F + 1600]) add(`visor-${z}`, blk(SX + 60, YF - 340, z + 70, 200, 100, 14).color('#1b1c1d'));

// Driver intercom and ticket slot post at cab height, in front of the hatch.
const PX = -560;
const PY = YF - 1500;
add("post-base", blk(PX, PY, 0, 300, 300, 20).color('#7d8386'));
add("post", blk(PX, PY, 20, 140, 140, 1900).color(cladding));
add("intercom-head", blk(PX, PY, 1920, 360, 260, 520).color(trim));
add("intercom-hood", prismX([[PY - 190, 2460], [PY + 130, 2460], [PY + 130, 2520]], PX - 200, PX + 200).color(accent));
add("intercom-grille", cylinder(8, 60, 14).rotateX(90).translate(PX - 80, PY - 130, 2300).color('#3a3d40'));
add("intercom-button", cylinder(10, 26, 12).rotateX(90).translate(PX + 90, PY - 130, 2300).color(accent));
add("ticket-slot", blk(PX, PY - 134, 2080, 200, 8, 30).color('#1b1c1d'));
add("intercom-screen", blk(PX, PY - 134, 2160, 260, 8, 70).color('#1d3340'));

// Signage on the accent band side of the fascia.
add("sign-panel", blk(-500, YF - 18, F + 2050, 1100, 6, 220).color(accent));
for (let k = 0; k < 9; k++) add(`sign-letter-${k}`, blk(-880 + k * 95, YF - 23, F + 2100, 60, 4, 120).color('#1b1c1d'));

return p.model();
