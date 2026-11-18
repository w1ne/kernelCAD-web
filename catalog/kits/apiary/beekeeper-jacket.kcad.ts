// SPDX-License-Identifier: CC0-1.0
// Beekeeper jacket shown on a display stand: a loose pale cotton body with
// elastic waistband and cuffs (so bees cannot crawl in), full-length front zip,
// two flapped hip pockets, raglan sleeves and an attached veil zipped on at the
// collar. The fencing veil is a fabric hood with a round mesh face window; the
// round veil is a hooped mesh cylinder under a wide-brimmed hat. A pale sealed
// jacket with a dark mesh veil on top is what makes it beekeeping gear.
// Generic visualization geometry, millimetres, Z up, stand base on z = 0, front faces -Y.
meta({
  name: "beekeeper-jacket",
  license: 'CC0-1.0',
  title: "Beekeeper jacket",
  description: "Beekeeper jacket on a display stand with a loose body, elastic waistband and cuffs, front zip, flapped hip pockets, raglan sleeves and an attached fencing-style hood or round hat veil. Material controls: jacket fabric, veil mesh, elastic and zip trim, display stand. Veil choice; fieldReady and sunWorn presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'jacket', 'veil', 'ppe', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const veil = param('veil', 'fencing', { choices: ['fencing', 'round'], label: 'Veil style' });
const fabric = param('fabric', "#ece6d4", { label: "Jacket and hood fabric" });
const mesh = param('mesh', "#2c332f", { label: "Veil mesh" });
const trim = param('trim', "#7c6a4c", { label: "Elastic, zip and hoop trim" });
const stand = param('stand', "#4a4f52", { label: "Display stand" });
presets({
  fieldReady: { fabric: '#f6f3ea', mesh: '#1f2522', trim: '#c49a3a', stand: '#5a6064' },
  sunWorn: { fabric: '#c9bc9a', mesh: '#3d433f', trim: '#5f4a32', stand: '#3a3d40' },
});

const p = assembly("beekeeper-jacket");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Elliptical ring of n points: rx across, ry front-to-back, centred at (0, cy).
const ring = (rx, ry, cy = 0, n = 14) => {
  let pb = path().moveTo(rx, cy);
  for (let i = 1; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pb = pb.lineTo(rx * Math.cos(t), cy + ry * Math.sin(t));
  }
  return pb.close();
};
// Stack rings at heights z: stations are [z, rx, ry, cy].
const stack = (st, n = 14) =>
  ring(st[0][1], st[0][2], st[0][3] ?? 0, n).loft(
    st.slice(1).map(([, rx, ry, cy]) => ring(rx, ry, cy ?? 0, n)),
    { planes: st.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })), ruled: true },
  );
// Loft round sections along p0 -> p1; stations are [fraction, radius].
const limb = (p0, p1, st, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ring(st[0][1], st[0][1], 0, n)
    .loft(st.slice(1).map(([, r]) => ring(r, r, 0, n)), {
      planes: st.map(([f]) => ({ plane: 'XY', origin: [0, 0, f * len] })),
      ruled: true,
    })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Display stand: weighted base and a post up into the body.
add('stand-base', cylinder(18, 170, 20).color(stand));
add('stand-post', cylinder(320, 26, 12).translate(0, 0, 18).color(stand));

// Loose body: hem to sloping shoulders and collar.
add('body', stack([
  [330, 236, 146],
  [480, 230, 142],
  [680, 236, 140],
  [830, 238, 134],
  [890, 200, 118],
  [920, 120, 96],
  [948, 92, 86],
]).color(fabric));
add('waistband', stack([[298, 240, 150], [340, 240, 150]]).color(trim));
add('collar-zip-ring', stack([[930, 104, 94], [952, 100, 90]]).color(trim));

// Front zip and two flapped hip pockets.
add('front-zip', box(12, 14, 600, true).translate(0, -142, 640).color(trim));
for (const [side, x] of [['left', -120], ['right', 120]]) {
  add(`pocket-${side}`, box(118, 12, 120, true).translate(x, -146, 420).color(fabric));
  add(`pocket-flap-${side}`, box(124, 16, 30, true).translate(x, -148, 486).color(trim));
}

// Raglan sleeves hang from the shoulders and close with elastic cuffs.
for (const [side, s] of [['left', -1], ['right', 1]]) {
  const shoulder = [s * 200, 0, 870];
  const elbow = [s * 268, -6, 620];
  const wrist = [s * 282, -24, 410];
  add(`sleeve-upper-${side}`, limb(shoulder, elbow, [[0, 78], [1, 66]]).color(fabric));
  add(`sleeve-lower-${side}`, limb(elbow, wrist, [[0, 66], [1, 60]]).color(fabric));
  add(`cuff-${side}`, limb(wrist, [s * 284, -26, 370], [[0, 52], [1, 48]]).color(trim));
}

if (veil.value === 'fencing') {
  // Fencing hood: a fabric dome with a round mesh face window, zipped on at the collar.
  add('hood-shell', stack([
    [940, 120, 112, 12],
    [1000, 150, 144, 14],
    [1080, 156, 150, 16],
    [1150, 140, 136, 18],
    [1206, 100, 98, 18],
    [1236, 44, 44, 16],
  ], 16).color(fabric));
  add('face-window-mesh', stack([[0, 112, 104], [16, 108, 100], [26, 94, 88]], 16).rotateX(90).translate(0, -126, 1090).color(mesh));
  add('face-window-hoop', torus(110, 5, 24).rotateX(90).translate(0, -136, 1090).color(trim));
  add('hood-seam', box(8, 220, 8, true).translate(0, 22, 1232).color(trim));
} else {
  // Round veil: hooped mesh cylinder under a wide brimmed hat.
  add('veil-mesh', stack([[940, 112, 104], [1010, 150, 146], [1090, 180, 176], [1150, 194, 192]], 16).color(mesh));
  add('veil-hoop', torus(178, 3, 24).translate(0, 0, 1090).color(trim));
  add('hat-brim', stack([[1148, 232, 232], [1156, 228, 228], [1166, 112, 112]], 16).color(fabric));
  add('hat-crown', stack([[1164, 112, 112], [1222, 104, 104], [1266, 82, 82], [1282, 36, 36]], 16).color(fabric));
  add('hat-band', stack([[1164, 115, 115], [1186, 114, 114]], 16).color(trim));
}

return p.model();
