// SPDX-License-Identifier: CC0-1.0
// Pair of beekeeper gloves laid palm-down: a thin goatskin leather hand with
// four tapered fingers and an angled thumb, an elastic wrist, then a long canvas
// gauntlet sleeve that reaches the elbow, with a ventilation mesh band and an
// elastic top. The leather hand on an elbow-length canvas sleeve is what makes
// it a beekeeping glove rather than a work glove.
// Generic visualization geometry, millimetres, Z up, resting on z = 0, fingers point +X.
meta({
  name: "beekeeper-gloves",
  license: 'CC0-1.0',
  title: "Beekeeper gloves",
  description: "Pair of beekeeper gloves with goatskin leather hands, tapered fingers and angled thumbs, elastic wrists and elbow-length canvas gauntlet sleeves with an elastic top and an optional ventilation mesh band. Material controls: hand leather, gauntlet canvas, vent mesh, elastic. Vent choice; fieldReady and sunWorn presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'gloves', 'ppe', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const vent = param('vent', 'vented', { choices: ['vented', 'plain'], label: 'Gauntlet vent' });
const leather = param('leather', "#d9bc80", { label: "Goatskin hand leather" });
const fabric = param('fabric', "#ece6d4", { label: "Gauntlet canvas" });
const mesh = param('mesh', "#4a5a52", { label: "Ventilation mesh" });
const elastic = param('elastic', "#8c7d62", { label: "Elastic wrist and top" });
presets({
  fieldReady: { leather: '#ead39c', fabric: '#f6f3ea', mesh: '#5f7068', elastic: '#c49a3a' },
  sunWorn: { leather: '#9c7a4c', fabric: '#c9bc9a', mesh: '#353f3a', elastic: '#5f4a32' },
});

const p = assembly("beekeeper-gloves");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Elliptical ring of n points: rv is the half-height (vertical), rw the half-width.
const ring = (rv, rw, n = 10) => {
  let pb = path().moveTo(rv, 0);
  for (let i = 1; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pb = pb.lineTo(rv * Math.cos(t), rw * Math.sin(t));
  }
  return pb.close();
};
// Loft rings along the segment p0 -> p1; stations are [fraction, rv, rw].
const limb = (p0, p1, st, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return ring(st[0][1], st[0][2], n)
    .loft(st.slice(1).map(([, rv, rw]) => ring(rv, rw, n)), {
      planes: st.map(([f]) => ({ plane: 'XY', origin: [0, 0, f * len] })),
      ruled: true,
    })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

for (const [side, y0, thumbSign] of [['left', -130, 1], ['right', 130, -1]]) {
  const z = 36;
  // Thin leather hand, flatter than a work glove, narrowing to the wrist.
  add(`hand-${side}`, limb([-30, y0, z], [110, y0, z], [[0, 30, 50], [0.5, 34, 60], [1, 30, 62]]).color(leather));
  // Four slim fingers fan slightly and dip at the tips.
  const fingers = [[-42, 128], [-14, 146], [14, 140], [42, 116]];
  fingers.forEach(([dy, length], i) => {
    const yRoot = y0 - dy * thumbSign;
    const spread = -dy * 0.16 * thumbSign;
    const mid = [106 + length * 0.6, yRoot + spread, z - 4];
    const tip = [106 + length, yRoot + spread * 1.6, 16];
    add(`finger-${side}-${i + 1}`, limb([104, yRoot, z], mid, [[0, 17, 14], [1, 15, 12]], 8).color(leather));
    add(`fingertip-${side}-${i + 1}`, limb(mid, tip, [[0, 15, 12], [0.8, 13, 11], [1, 7, 7]], 8).color(leather));
  });
  // Thumb leaves the side of the palm and angles forward.
  const thumbRoot = [10, y0 + 54 * thumbSign, z - 4];
  const thumbMid = [64, y0 + 92 * thumbSign, 26];
  add(`thumb-${side}`, limb(thumbRoot, thumbMid, [[0, 22, 20], [1, 18, 16]], 8).color(leather));
  add(`thumb-tip-${side}`, limb(thumbMid, [104, y0 + 104 * thumbSign, 16], [[0, 18, 16], [0.8, 15, 13], [1, 8, 7]], 8).color(leather));
  // Elastic wrist gathers the leather into the canvas sleeve.
  add(`wrist-elastic-${side}`, limb([-56, y0, z], [-26, y0, z], [[0, 32, 52], [1, 32, 52]]).color(elastic));
  // Elbow-length canvas gauntlet flaring towards an elastic top.
  add(`gauntlet-${side}`, limb([-54, y0, z], [-400, y0, z + 14], [[0, 32, 52], [0.5, 42, 66], [1, 48, 74]]).color(fabric));
  if (vent.value === 'vented') {
    add(`vent-band-${side}`, limb([-160, y0, z + 6], [-230, y0, z + 6], [[0, 41, 64], [1, 42, 66]]).color(mesh));
  }
  add(`gauntlet-top-${side}`, limb([-396, y0, z + 14], [-420, y0, z + 14], [[0, 50, 77], [1, 50, 77]]).color(elastic));
  add(`gauntlet-opening-${side}`, limb([-419, y0, z + 14], [-422, y0, z + 14], [[0, 40, 64], [1, 40, 64]]).color(mesh));
}

return p.model();
