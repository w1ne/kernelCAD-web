// SPDX-License-Identifier: CC0-1.0
// Bee smoker: a tall stainless fire can with a conical hinged lid ending in a
// bent nozzle, a wire heat-shield cage around the can, and a pair of timber
// bellows boards joined by pleated leather on the back. Squeezing the boards
// pushes air through a tube into the base of the can. The bellows beside a
// can with a bent spout is the silhouette every beekeeper recognises.
// Generic visualization geometry at roughly real size (100 mm can), millimetres,
// Z up, resting on z = 0, nozzle leans towards -X, bellows on +X.
meta({
  name: "bee-smoker",
  license: 'CC0-1.0',
  title: "Bee smoker",
  description: "Bee smoker with a stainless fire can, conical hinged lid and bent nozzle, optional wire heat-shield cage, and timber bellows boards joined by pleated leather with an air tube into the can. Material controls: stainless steel, bellows leather, bellows timber, heat-shield wire. Heat-shield choice; fieldReady and sunWorn presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'smoker', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const heatShield = param('heatShield', 'cage', { choices: ['cage', 'none'], label: 'Heat shield' });
const stainless = param('stainless', "#b9c2c0", { label: "Stainless steel can and lid" });
const leather = param('leather', "#7a4e30", { label: "Bellows leather" });
const timber = param('timber', "#b8874a", { label: "Bellows timber" });
const guard = param('guard', "#3d4245", { label: "Heat-shield wire" });
presets({
  fieldReady: { stainless: '#dfe5e2', leather: '#9a6a42', timber: '#d4a462', guard: '#575d60' },
  sunWorn: { stainless: '#6e6a62', leather: '#4a3426', timber: '#68543d', guard: '#2a2c2d' },
});

const p = assembly("bee-smoker");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round ring of n points.
const ring = (r, n = 16) => {
  let pb = path().moveTo(r, 0);
  for (let i = 1; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pb = pb.lineTo(r * Math.cos(t), r * Math.sin(t));
  }
  return pb.close();
};
// Stack rings at heights z: stations are [z, r].
const stack = (st, n = 16) =>
  ring(st[0][1], n).loft(st.slice(1).map(([, r]) => ring(r, n)), {
    planes: st.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })),
    ruled: true,
  });
// Loft round sections along p0 -> p1; stations are [fraction, r].
const limb = (p0, p1, st, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ring(st[0][1], n)
    .loft(st.slice(1).map(([, r]) => ring(r, n)), {
      planes: st.map(([f]) => ({ plane: 'XY', origin: [0, 0, f * len] })),
      ruled: true,
    })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Fire can on a rolled foot ring.
add('foot-ring', stack([[0, 53], [10, 53]], 20).color(stainless));
add('fire-can', stack([[8, 50], [186, 50], [192, 52]], 20).color(stainless));
// Conical lid hinged on the bellows side, rising into a bent nozzle.
add('lid', stack([[190, 53], [200, 53], [232, 36], [246, 24]], 20).color(stainless));
add('lid-hinge', box(16, 26, 14, true).translate(54, 0, 198).color(stainless));
add('nozzle', limb([-2, 0, 240], [-34, 0, 286], [[0, 22], [1, 13]]).color(stainless));
add('nozzle-tip', limb([-34, 0, 286], [-58, 0, 302], [[0, 13], [1, 9]]).color(stainless));

// Wire heat-shield cage stands off the hot can on the open sides.
if (heatShield.value === 'cage') {
  add('shield-ring-lower', torus(62, 2.5, 20).translate(0, 0, 40).color(guard));
  add('shield-ring-upper', torus(62, 2.5, 20).translate(0, 0, 168).color(guard));
  for (let i = 0; i < 9; i += 1) {
    const a = 70 + i * 27.5;
    const x = 62 * Math.cos((a * Math.PI) / 180);
    const y = 62 * Math.sin((a * Math.PI) / 180);
    add(`shield-bar-${i + 1}`, box(5, 5, 140, true).rotateZ(a).translate(x, y, 104).color(guard));
  }
}

// Bellows: a fixed inner board, an outer board hinged at the bottom and leaning
// out, pleated leather between them, and an air tube into the can.
add('bellows-board-inner', box(10, 84, 150, true).translate(72, 0, 106).color(timber));
add('bellows-board-outer', box(10, 84, 156, true).rotateY(14).translate(102, 0, 108).color(timber));
const pleat = extrudePolygon([[77, 38], [84, 38], [116, 172], [77, 172]], 66).rotateX(90).translate(0, 33, 0);
add('bellows-leather', pleat.color(leather));
for (const [i, zz] of [[1, 80], [2, 120], [3, 160]]) {
  const xo = 84 + ((zz - 38) / 134) * 32;
  add(`bellows-pleat-${i}`, box(xo - 76, 70, 4, true).translate((xo + 76) / 2, 0, zz).color(leather));
}
add('bellows-hinge', cylinder(84, 5, 10).rotateX(90).translate(80, 42, 32).color(stainless));
add('air-tube', limb([70, 0, 40], [46, 0, 40], [[0, 8], [1, 8]], 8).color(stainless));

return p.model();
