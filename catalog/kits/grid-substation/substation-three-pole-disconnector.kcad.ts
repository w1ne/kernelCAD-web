// SPDX-License-Identifier: CC0-1.0
// Three-pole double-side-break disconnector, the outdoor isolator that gives
// a visible air gap either side of a bay. What makes it one: per phase three
// shedded post insulators stand in a row on a galvanised channel base - the
// two outer posts are fixed and carry jaw contacts and terminal pads, the
// centre post rotates on a bearing and carries a long tubular copper blade
// that bridges both jaws when closed. The three phase bases sit on a raised
// steel support with lattice legs, the centre-post cranks are tied by an
// inter-phase coupling rod, and a vertical operating pipe runs down to a
// motor-operating mechanism box with a manual handle. Millimetres, Z up,
// ground origin, phases along X, each phase's blade along Y.
meta({
  name: "substation-three-pole-disconnector",
  license: "CC0-1.0",
  title: "Three pole disconnector",
  description: "Three-pole double-side-break outdoor disconnector at about real size: per phase two fixed and one rotating shedded post insulator on a galvanised channel base, jaw contacts and terminal pads on the outer posts, a tubular copper blade with contact fingers on the rotating centre post, shown closed; raised steel support with braced legs and footings, crank arms and an inter-phase coupling rod, vertical operating pipe down to a motor-operating mechanism box with manual handle. Material controls: galvanised steel, porcelain, copper current path, mechanism box; weathered, maintenance and grey-porcelain presets.",
  tags: ["grid substation", "electrical infrastructure", "utility yard", "disconnector", "isolator", "double side break", "switchgear", "primary switching equipment"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 7000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const galvanizedSteel = param('galvanizedSteel', '#8a969b', { label: 'Galvanized steel' });
const porcelain = param('porcelain', '#7b4632', { label: 'Post insulators' });
const copper = param('copper', '#c27c48', { label: 'Copper blade and contacts' });
const powderCoat = param('powderCoat', '#c3c8c4', { label: 'Mechanism box' });
presets({
  weathered: { galvanizedSteel: '#778080', porcelain: '#6a4434', copper: '#8f6f4c', powderCoat: '#9ea39b' },
  maintenance: { powderCoat: '#cf7736' },
  greyPorcelain: { porcelain: '#8c9396', copper: '#c9ced1', powderCoat: '#5f7466' },
});

const p = assembly("substation-three-pole-disconnector");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising, n flat sides.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Square member from point a to point b.
const strut = (a, b, w) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return blk(-w / 2, -w / 2, 0, w / 2, w / 2, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Shedded insulator from z=0 to h: core radius rc, sheds alternating rs and 0.8 rs.
const sheds = (h, rc, rs, pitch) => {
  const pts = [[rc, 0]];
  let i = 0;
  for (let z = pitch * 0.5; z + pitch * 0.6 < h; z += pitch, i++) {
    const r = i % 2 ? rs * 0.8 : rs;
    pts.push([r, z], [r, z + pitch * 0.12], [rc, z + pitch * 0.45]);
  }
  pts.push([rc, h]);
  return lathe(pts, 8);
};

const concrete = '#9a9890', dark = '#2c3033';
const phases = [-2000, 0, 2000];
const baseZ = 2400; // top of the raised support
const postH = 1500, postY = 1350; // insulator height, outer-post offset along Y
const capZ = baseZ + 160 + 80 + postH; // top of an insulator cap

// ---- Raised support: footings, braced legs, longitudinal beams ----
for (const x of [-2700, 2700]) {
  for (const y of [-500, 500]) {
    add(`footing-${x}-${y}`, blk(x - 250, y - 250, 0, x + 250, y + 250, 300).color(concrete));
    add(`leg-${x}-${y}`, strut([x, y * 1.4, 300], [x, y, baseZ - 120], 140).color(galvanizedSteel));
  }
  for (const z of [900, 1600]) add(`leg-tie-${x}-${z}`, blk(x - 40, -620, z, x + 40, 620, z + 70).color(galvanizedSteel));
  add(`leg-brace-${x}`, strut([x, -640, 970], [x, 580, 1600], 55).color(galvanizedSteel));
}
for (const y of [-500, 500]) add(`support-beam-${y}`, blk(-2900, y - 80, baseZ - 120, 2900, y + 80, baseZ).color(galvanizedSteel));

phases.forEach((x, i) => {
  const n = `phase-${i + 1}`;
  // Channel base carrying three posts.
  add(`${n}-channel`, blk(x - 130, -postY - 260, baseZ, x + 130, postY + 260, baseZ + 160).color(galvanizedSteel));
  add(`${n}-channel-lip`, blk(x - 130, -postY - 260, baseZ + 160, x - 100, postY + 260, baseZ + 220).color(galvanizedSteel));
  for (const y of [-postY, 0, postY]) {
    add(`${n}-post-${y}-flange`, rod(170, baseZ + 160, baseZ + 240, 10).translate(x, y, 0).color(galvanizedSteel));
    add(`${n}-post-${y}`, sheds(postH, 95, 175, 140).translate(x, y, baseZ + 240).color(porcelain));
    add(`${n}-post-${y}-cap`, rod(150, capZ - 60, capZ + 40, 10).translate(x, y, 0).color(galvanizedSteel));
  }
  // Centre post bearing and crank under the channel.
  add(`${n}-bearing`, rod(150, baseZ - 220, baseZ, 10).translate(x, 0, 0).color(galvanizedSteel));
  add(`${n}-crank`, blk(x - 30, -40, baseZ - 210, x + 330, 40, baseZ - 150).color(galvanizedSteel));
  // Outer jaw contacts and terminal pads.
  for (const s of [-1, 1]) {
    const y = s * postY;
    add(`${n}-jaw-base-${s}`, blk(x - 110, y - 110, capZ + 40, x + 110, y + 110, capZ + 110).color(copper));
    for (const dx of [-55, 55]) add(`${n}-jaw-finger-${s}-${dx}`, blk(x + dx - 18, y - s * 160 - 70, capZ + 110, x + dx + 18, y - s * 160 + 70, capZ + 330).color(copper));
    add(`${n}-terminal-${s}`, blk(x - 60, y + s * 110, capZ + 50, x + 60, y + s * 360, capZ + 100).color(copper));
    add(`${n}-terminal-palm-${s}`, blk(x - 90, y + s * 360 - (s > 0 ? 0 : 140), capZ + 20, x + 90, y + s * 360 + (s > 0 ? 140 : 0), capZ + 130).color(copper));
    add(`${n}-arcing-horn-${s}`, strut([x + 90, y, capZ + 110], [x + 140, y - s * 260, capZ + 520], 22).color(copper));
  }
  // Rotating blade on the centre post: hub, tube, contact tips.
  add(`${n}-blade-hub`, rod(130, capZ + 40, capZ + 200, 10).translate(x, 0, 0).color(copper));
  add(`${n}-blade-tube`, rod(48, 0, 2 * postY - 60, 10).rotateX(-90).translate(x, -postY + 30, capZ + 220).color(copper));
  for (const s of [-1, 1]) add(`${n}-blade-tip-${s}`, blk(x - 40, s * postY - 140, capZ + 170, x + 40, s * postY + 140, capZ + 270).translate(0, -s * 40, 0).color(copper));
});

// ---- Coupling rod, operating pipe and mechanism box ----
add('coupling-rod', rod(28, 0, 4000, 8).rotateY(90).translate(-1680, 0, baseZ - 180).color(galvanizedSteel));
for (const x of phases) add(`coupling-clevis-${x}`, blk(x + 280, -45, baseZ - 220, x + 360, 45, baseZ - 140).color(galvanizedSteel));
add('operating-pipe', rod(45, 1250, baseZ - 220, 10).translate(-2000, -300, 0).color(galvanizedSteel));
add('operating-lever', blk(-2030, -330, baseZ - 220, -1970, 40, baseZ - 160).color(galvanizedSteel));
add('mechanism-box', blk(-2350, -720, 650, -1650, -280, 1250).color(powderCoat));
add('mechanism-roof', blk(-2390, -760, 1250, -1610, -240, 1300).color(powderCoat));
add('mechanism-door', blk(-2300, -735, 700, -1700, -720, 1200).color(powderCoat));
add('mechanism-handle', blk(-1780, -760, 880, -1750, -735, 1060).color(dark));
add('mechanism-window', blk(-2200, -740, 1000, -2000, -735, 1150).color('#8fb4c4'));
add('manual-crank', rod(20, 0, 260, 8).rotateY(-90).translate(-2350, -500, 950).color(dark));
add('manual-crank-grip', rod(28, 0, 160, 8).translate(-2610, -500, 950).color('#d0302a'));
add('mechanism-stand', blk(-2040, -540, 300, -1960, -460, 650).color(galvanizedSteel));
add('mechanism-footing', blk(-2200, -700, 0, -1800, -300, 300).color(concrete));
add('earth-strap', blk(-2725, -720, 300, -2675, -700, 1100).color('#b87545'));

return p.model();
