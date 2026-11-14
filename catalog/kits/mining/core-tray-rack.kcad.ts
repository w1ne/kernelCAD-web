// SPDX-License-Identifier: CC0-1.0
// Exploration core tray rack, the shelving in a core shed where drill core is
// laid out, logged and stored. What makes one: a bolted steel rack with
// orange load beams at each level, carrying rows of ribbed core trays that
// slide in from the front, long axis front to back. Each tray has five
// channels, and each channel holds a run of round drill core (NQ, about
// 48 mm across) broken into pieces, with a depth block where a drill run ends
// and a tag on the tray end giving the hole and depth. Grey fresh rock is
// broken by rust-brown oxidised intervals. One tray can be pulled half out
// for logging.
// The tray choice shows one tray pulled out or all trays stowed.
// Millimetres, Z up, rack front on -Y.
meta({
  name: "core-tray-rack",
  license: 'CC0-1.0',
  title: "Exploration core tray rack",
  description: "Core shed storage rack at about real size: bolted steel uprights with side and back bracing, orange load beams on four levels and six five-channel core trays per level, each tray filled with pieces of 48 mm round drill core with oxidised intervals, end-of-run depth blocks and a hole-and-depth tag on the tray end. Tray choice (pulled, stowed) pulls one tray half out for logging. Material controls: rack steel, load beam paint, core tray plastic and core rock. weathered, galvanised and darkVolcanic presets.",
  tags: ['mining', 'exploration', 'drill core', 'core tray', 'core shed', 'geology', 'storage rack'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 7000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tray = param('tray', 'pulled', { choices: ['pulled', 'stowed'], label: 'Front tray' });
const rackSteel = param('rackSteel', '#2f5d8a', { label: 'Rack upright steel' });
const beamPaint = param('beamPaint', '#e36d1e', { label: 'Load beam paint' });
const trayPlastic = param('trayPlastic', '#2b2d2f', { label: 'Core tray plastic' });
const coreRock = param('coreRock', '#8d9294', { label: 'Core rock' });
presets({
  weathered: { rackSteel: '#56636c', beamPaint: '#a8664a', trayPlastic: '#3c3d3c', coreRock: '#8a867e' },
  galvanised: { rackSteel: '#a9b0b2', beamPaint: '#9aa2a6', trayPlastic: '#c9ccc8', coreRock: '#7c8286' },
  darkVolcanic: { rackSteel: '#3c4a3e', beamPaint: '#d9a82a', trayPlastic: '#8a8d88', coreRock: '#3b3d40' },
});

const p = assembly("core-tray-rack");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
const rod = (r, z0, z1, n = 12) => ngon(r, n).loft([ngon(r, n)], {
  planes: [{ plane: 'XY', origin: [0, 0, z0] }, { plane: 'XY', origin: [0, 0, z1] }],
  ruled: true,
});
const blk = (x0, y0, z0, x1, y1, z1) => box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const oxide = '#9a5a36', tagWhite = '#eeeee6', depthBlock = '#e8c21e';
const W = 1080; // half rack width to upright centres
const D = 550; // half rack depth
const LEVELS = [300, 680, 1060, 1440]; // load beam tops
const TW = 340; // tray width
const TL = 1050; // tray length, front to back
const TH = 62; // tray height
const CH = 5; // channels per tray
const CW = 58; // channel width
const CR = 24; // core radius
const trayX = Array.from({ length: 6 }, (_, i) => -W + 60 + TW / 2 + i * TW);
// Deterministic "random" in 0..1.
const rnd = (k) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// ---- Rack ----
for (const [i, x] of [-W, W].entries()) {
  for (const [j, y] of [-D, D].entries()) {
    add(`upright-${i}-${j}`, blk(x - 40, y - 40, 0, x + 40, y + 40, 1620).color(rackSteel));
    add(`foot-plate-${i}-${j}`, blk(x - 90, y - 90, 0, x + 90, y + 90, 12).color(rackSteel));
  }
  // Side frame: zigzag bracing between the front and back uprights.
  for (let k = 0; k < 4; k++) {
    const za = 120 + k * 360, zb = za + 360;
    const [ya, yb] = k % 2 === 0 ? [-D + 40, D - 40] : [D - 40, -D + 40];
    add(`side-brace-${i}-${k}`, tube([x, ya, za], [x, yb, zb], 16, 6).color(rackSteel));
  }
  add(`side-tie-${i}`, blk(x - 30, -D, 1560, x + 30, D, 1610).color(rackSteel));
}
for (const [k, [a, b]] of [[[-W + 40, 150], [W - 40, 1500]], [[W - 40, 150], [-W + 40, 1500]]].entries()) {
  add(`back-brace-${k}`, tube([a[0], D, a[1]], [b[0], D, b[1]], 16, 6).color(rackSteel));
}
for (const [l, z] of LEVELS.entries()) {
  for (const [j, y] of [-D + 35, D - 35].entries()) add(`beam-${l}-${j}`, blk(-W + 40, y - 35, z - 110, W - 40, y + 35, z).color(beamPaint));
}

// ---- Core trays ----
const core = (name, x, y0, y1, z, seed) => {
  // A run of core pieces with breaks, an oxidised interval and an end-of-run depth block.
  let y = y0, k = 0;
  while (y < y1 - 40) {
    const len = Math.min(180 + rnd(seed + k) * 380, y1 - y);
    if (len < 40) break;
    const ox = rnd(seed * 3 + k) > 0.78;
    add(`${name}-piece-${k}`, tube([x, y, z + CR], [x, y + len - 8, z + CR], CR, 6).color(ox ? oxide : coreRock));
    y += len;
    k++;
  }
};
const trayAt = (name, x, y, z, full, seed) => {
  const body = blk(x - TW / 2 + 5, y - TL / 2, z, x + TW / 2 - 5, y + TL / 2, z + TH);
  const pockets = Array.from({ length: CH }, (_, c) => {
    const cx = x - ((CH - 1) * (CW + 6)) / 2 + c * (CW + 6);
    return blk(cx - CW / 2, y - TL / 2 + 18, z + 14, cx + CW / 2, y + TL / 2 - 18, z + TH + 5);
  });
  add(`${name}-body`, body.subtract(pockets.reduce((a, b) => a.union(b))).color(trayPlastic));
  add(`${name}-tag`, blk(x - 110, y - TL / 2 - 5, z + 16, x + 110, y - TL / 2 + 1, z + 50).color(tagWhite));
  for (let c = 0; c < CH; c++) {
    const cx = x - ((CH - 1) * (CW + 6)) / 2 + c * (CW + 6);
    if (full) {
      core(`${name}-core-${c}`, cx, y - TL / 2 + 22, y + TL / 2 - 70, z + 14, seed * 7 + c);
      add(`${name}-depth-block-${c}`, blk(cx - 26, y + TL / 2 - 66, z + 14, cx + 26, y + TL / 2 - 24, z + 66).color(depthBlock));
    } else {
      add(`${name}-core-${c}`, blk(cx - CR, y - TL / 2 + 22, z + 14, cx + CR, y + TL / 2 - 22, z + 14 + 2 * CR).color(rnd(seed * 5 + c) > 0.75 ? oxide : coreRock));
    }
  }
};
const TOP = LEVELS.length - 1;
for (const [l, z] of LEVELS.entries()) {
  for (const [i, x] of trayX.entries()) {
    const pulled = tray.value === 'pulled' && l === 1 && i === 2;
    // The camera sees into the top trays and the pulled tray; the rest carry core as solid strips.
    trayAt(`tray-${l}-${i}`, x, pulled ? -480 : 0, z, l === TOP || pulled, l * 10 + i + 1);
  }
}

return p.model();
