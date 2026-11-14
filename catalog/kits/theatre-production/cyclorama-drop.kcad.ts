// SPDX-License-Identifier: CC0-1.0
// Cyclorama drop: the big seamless pale cloth at the back of the stage that
// takes coloured light as a sky, here stretched in its own freestanding frame.
// What makes it a cyc rather than a backdrop: one seamless, unpainted panel
// of muslin or screen fabric pulled drum-tight - tie lines from the webbing
// header to the top pipe, shock-cord loops from grommets down both side edges
// out to the frame uprights, and a bottom pipe in a hem pocket weighing the
// lower edge straight. The frame is two uprights on cross-foot bases with a
// top pipe clamped across them. The tension choice switches the side lacing
// between shock-cord loops and plain tie lines.
// Generic visualization geometry at about real size (4.2 m wide, 3 m tall),
// millimetres, Z up, cloth face toward -Y, the frame feet on z = 0.

meta({
  name: "cyclorama-drop",
  license: 'CC0-1.0',
  title: "Cyclorama drop",
  description: "Framed cyclorama at about real size: a 3.5 m by 2.6 m seamless pale cyc cloth with a webbing header tied to a top pipe, grommets down both side edges laced to the frame uprights, and a bottom pipe in a hem pocket; the freestanding frame is two uprights on cross-foot bases with clamped top pipe. Tension choice: shock-cord loops or tie lines. Material controls: cyc cloth, webbing, frame steel, shock cord. houseShow, touring and blueSky presets.",
  tags: ['cyclorama', 'cyc', 'sky cloth', 'backdrop', 'cyc frame', 'soft goods', 'muslin', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 5600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tension = param('tension', 'shockCord', { choices: ['shockCord', 'tieLine'], label: 'Side lacing' });

const cloth = param('cloth', '#e9e7e1', { label: 'Cyc cloth' });
const webbing = param('webbing', '#c9b58a', { label: 'Webbing header' });
const frame = param('frame', '#2e3236', { label: 'Frame steel' });
const cord = param('cord', '#16171a', { label: 'Shock cord and ties' });

presets({
  houseShow: { cloth: '#e9e7e1', webbing: '#c9b58a', frame: '#2e3236', cord: '#16171a' },
  touring: { cloth: '#d8dbe0', webbing: '#2a2a2a', frame: '#a9b0b5', cord: '#d8a21f' },
  blueSky: { cloth: '#8fbbe8', webbing: '#e3dac2', frame: '#1f2124', cord: '#e8e2cf' },
});

const STEEL = '#aab2b6';

const p = assembly("cyclorama-drop");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const XU = 2050; // upright centres
const ZT = 2980; // top pipe centre
const CW = 3500; // cloth width
const Z0 = 220; // cloth hem
const Z1 = 2860; // header top
const HDR = 90;
const POCKET = 130;

// Frame: cross-foot bases, uprights, top pipe and clamps.
for (const sx of [-1, 1]) {
  const tag = sx < 0 ? 'left' : 'right';
  const x = sx * XU;
  add(`foot-x-${tag}`, blk(x, 0, 12, 900, 70, 40).color(frame));
  add(`foot-y-${tag}`, blk(x, 0, 12, 70, 900, 40).color(frame));
  for (const [dx, dy] of [[-420, 0], [420, 0], [0, -420], [0, 420]]) add(`foot-pad-${tag}-${dx}-${dy}`, blk(x + dx, dy, 0, 80, 80, 12).color(cord));
  add(`socket-${tag}`, cylinder(200, 42, 16).translate(x, 0, 52).color(frame));
  add(`upright-${tag}`, cylinder(ZT + 60 - 240, 30, 16).translate(x, 0, 240).color(frame));
  add(`top-clamp-${tag}`, blk(x, 0, ZT - 45, 110, 90, 90).color(STEEL));
  add(`upright-cap-${tag}`, cylinder(14, 34, 16).translate(x, 0, ZT + 60).color(STEEL));
}
add("top-pipe", alongX(2 * XU + 300, 24).translate(-XU - 150, 0, ZT).color(frame));

// Seamless cloth with header, hem pocket and bottom pipe.
add("cloth", blk(0, 0, Z0 + POCKET, CW, 6, Z1 - HDR - Z0 - POCKET).color(cloth));
add("header", blk(0, 0, Z1 - HDR, CW, 12, HDR).color(webbing));
add("hem-pocket", blk(0, 0, Z0, CW, 40, POCKET).color(cloth));
add("bottom-pipe", alongX(CW + 200, 16).translate(-CW / 2 - 100, 0, Z0 + POCKET / 2).color(STEEL));

// Header grommets and tie lines up to the top pipe.
for (let k = 0; k <= 12; k++) {
  const x = -CW / 2 + 50 + (k * (CW - 100)) / 12;
  add(`header-grommet-${k}`, alongY(4, 12).translate(x, -8, Z1 - HDR / 2).color(STEEL));
  add(`header-tie-${k}`, cylinder(ZT - Z1 + HDR / 2 - 16, 4, 6).translate(x, 0, Z1 - HDR / 2).color(cord));
  add(`header-knot-${k}`, blk(x, 0, ZT - 6, 24, 54, 32).color(cord));
}

// Side edges laced out to the uprights.
const span = XU - 30 - CW / 2;
for (const sx of [-1, 1]) {
  const tag = sx < 0 ? 'l' : 'r';
  const xe = sx * (CW / 2 - 30);
  for (let k = 0; k < 8; k++) {
    const z = Z0 + POCKET + 120 + (k * (Z1 - HDR - Z0 - POCKET - 240)) / 7;
    add(`side-grommet-${tag}-${k}`, alongY(4, 12).translate(xe, -5, z).color(STEEL));
    const x0 = sx < 0 ? -XU + 30 : CW / 2 - 30;
    if (tension.value === 'shockCord') {
      add(`cord-upper-${tag}-${k}`, alongX(span + 30, 5, 6).translate(x0, 0, z + 14).color(cord));
      add(`cord-lower-${tag}-${k}`, alongX(span + 30, 5, 6).translate(x0, 0, z - 14).color(cord));
      add(`cord-ball-${tag}-${k}`, sphere(17).translate(sx * (XU - 46), -10, z).color(cord));
    } else {
      add(`tie-${tag}-${k}`, alongX(span + 30, 4, 6).translate(x0, 0, z).color(webbing));
      add(`tie-wrap-${tag}-${k}`, cylinder(30, 34, 12).translate(sx * XU, 0, z - 15).color(webbing));
    }
  }
}

return p.model();
