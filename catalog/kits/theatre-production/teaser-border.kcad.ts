// SPDX-License-Identifier: CC0-1.0
// Teaser border: the wide, shallow masking border flown just upstage of the
// proscenium to set the trim height and hide the first electric.
// What makes it a border rather than a curtain: a short, very wide panel of
// flat (no fullness) velour sewn from vertical widths with visible seams, a
// jute webbing header tied to the pipe batten, a pipe pocket at the hem with
// a bottom pipe showing at each end to keep the edge dead straight, and two
// trim-chain pickups with lift lines running up to the fly system. The returns
// choice adds the side returns that fold back upstage at each end.
// Generic visualization geometry at about real size (3.6 m wide, 0.9 m deep
// face, 1.9 m to the top of the lift lines), millimetres, Z up, border face
// toward -Y, bottom pipe pocket on z = 0.

meta({
  name: "teaser-border",
  license: 'CC0-1.0',
  title: "Teaser border",
  description: "Theatre teaser border at about real size: a 3.6 m by 0.9 m flat velour panel sewn from vertical widths with visible seams, jute webbing header with grommets and tie lines to a pipe batten, a hem pipe pocket with the bottom pipe showing at each end, and trim-chain pickups with wire-rope lift lines. Optional side returns folding back upstage. Material controls: velour, webbing and ties, pipes, rigging hardware. houseShow, touring and schoolHall presets.",
  tags: ['teaser', 'border', 'masking border', 'soft goods', 'velour', 'proscenium', 'fly system', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const returns = param('returns', 'none', { choices: ['none', 'both'], label: 'Side returns' });

const velour = param('velour', '#211f25', { label: 'Velour' });
const webbing = param('webbing', '#c9b58a', { label: 'Webbing and tie lines' });
const pipe = param('pipe', '#3a3f44', { label: 'Batten and bottom pipe' });
const rigging = param('rigging', '#b9c0c4', { label: 'Rigging hardware' });

presets({
  houseShow: { velour: '#211f25', webbing: '#c9b58a', pipe: '#3a3f44', rigging: '#b9c0c4' },
  touring: { velour: '#1e2a44', webbing: '#2a2a2a', pipe: '#a9b0b5', rigging: '#d8a21f' },
  schoolHall: { velour: '#7a1e2a', webbing: '#e3dac2', pipe: '#3a4a5c', rigging: '#c7ccce' },
});

const SEAM = '#0f0e11';

const p = assembly("teaser-border");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const alongX = (len: number, r: number, n = 16) => cylinder(len, r, n).rotateY(90); // x from 0 to len
const alongY = (len: number, r: number, n = 12) => cylinder(len, r, n).rotateX(90); // y from 0 to -len

const W = 3600;
const H = 900; // hem to header top
const HDR = 80;
const POCKET = 100;
const ZB = H + 120; // batten centre
const T = 10; // cloth thickness
const RET = returns.value === 'both' ? 700 : 0;

// Face: hem pocket, cloth, header.
add("pipe-pocket", blk(0, 0, 0, W, T + 8, POCKET).color(velour));
add("cloth", blk(0, 0, POCKET, W, T, H - HDR - POCKET).color(velour));
add("header", blk(0, 0, H - HDR, W, T + 8, HDR).color(webbing));
add("pocket-stitch", blk(0, -T / 2 - 5, POCKET - 12, W, 2, 8).color(SEAM));

// Vertical seams between the sewn widths.
const widths = 3;
for (let i = 1; i < widths; i++) {
  const x = -W / 2 + (i * W) / widths;
  add(`seam-${i}`, blk(x, -T / 2 - 1, POCKET, 14, 4, H - HDR - POCKET).color(SEAM));
}

// Side returns folding back upstage.
if (RET > 0) {
  for (const sx of [-1, 1]) {
    const tag = sx < 0 ? 'left' : 'right';
    add(`return-${tag}`, blk(sx * (W / 2 - T / 2), RET / 2, POCKET, T, RET, H - HDR - POCKET).color(velour));
    add(`return-pocket-${tag}`, blk(sx * (W / 2 - T / 2), RET / 2, 0, T + 8, RET, POCKET).color(velour));
    add(`return-header-${tag}`, blk(sx * (W / 2 - T / 2), RET / 2, H - HDR, T + 8, RET, HDR).color(webbing));
    add(`return-batten-${tag}`, cylinder(RET, 20, 12).rotateX(-90).translate(sx * (W / 2 - 20), 0, ZB).color(pipe));
  }
}

// Bottom pipe showing past the pocket ends, with caps.
const RP = 18;
add("bottom-pipe", alongX(W + 240, RP).translate(-W / 2 - 120, 0, POCKET / 2).color(pipe));
for (const sx of [-1, 1]) add(`bottom-cap-${sx < 0 ? 'l' : 'r'}`, alongX(10, RP + 3).translate(sx < 0 ? -W / 2 - 130 : W / 2 + 120, 0, POCKET / 2).color(rigging));

// Grommets and tie lines to the batten.
const ties = 10;
for (let k = 0; k <= ties; k++) {
  const x = -W / 2 + 60 + (k * (W - 120)) / ties;
  add(`grommet-${k}`, alongY(5, 12).translate(x, -T / 2 - 4, H - HDR / 2).color(rigging));
  add(`tie-${k}`, cylinder(ZB - H + HDR / 2 - 18, 4, 6).translate(x, 0, H - HDR / 2).color(webbing));
  add(`knot-${k}`, blk(x, 0, ZB - 4, 26, 56, 36).color(webbing));
}

// Batten with caps, trim-chain pickups and lift lines.
add("batten", alongX(W + 500, 24).translate(-W / 2 - 250, 0, ZB).color(pipe));
for (const sx of [-1, 1]) add(`batten-cap-${sx < 0 ? 'l' : 'r'}`, alongX(12, 27).translate(sx < 0 ? -W / 2 - 262 : W / 2 + 250, 0, ZB).color(rigging));
for (const x0 of [-1200, 1200]) {
  const tag = x0 < 0 ? 'l' : 'r';
  add(`basket-${tag}`, torus(32, 6, 8).rotateY(90).scale([1, 1, 1.4]).translate(x0, 0, ZB + 12).color(rigging));
  for (let k = 0; k < 3; k++) {
    const link = torus(16, 5, 8).scale([1, 1.8, 1]).rotateX(90);
    add(`chain-${tag}-${k}`, (k % 2 ? link.rotateZ(90) : link).translate(x0, 0, ZB + 80 + k * 42).color(rigging));
  }
  add(`shackle-${tag}`, torus(24, 7, 8).rotateX(90).translate(x0, 0, ZB + 230).color(rigging));
  add(`lift-line-${tag}`, cylinder(560, 4, 6).translate(x0, 0, ZB + 254).color(rigging));
}

return p.model();
