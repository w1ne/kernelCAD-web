// SPDX-License-Identifier: CC0-1.0
// Hive frame: a Langstroth deep Hoffman frame, the removable comb carrier a
// beekeeper lifts out of the brood box during an inspection.
// What makes it a hive frame rather than a board: a long top bar with thin
// ears that hang on the box rebates, Hoffman side bars that are wide at the
// top (self-spacing shoulders) and narrow below, a thin bottom bar, and drawn
// comb filling the frame. In the default brood frame the comb shows the
// classic pattern a beekeeper reads at a glance: an oval of capped brood in
// the middle, a ring of stored pollen around it and an arch of capped honey
// across the top corners, with a few bees on the face. The honey frame is
// capped almost edge to edge; the foundation frame shows the bare wax sheet
// on its tensioned wires.
// Generic visualization geometry at real size (482 mm top bar, 232 mm deep),
// millimetres, Z up, standing on its bottom bar at z = 0, comb faces +/-Y.

meta({
  name: "hive-frame",
  license: 'CC0-1.0',
  title: "Hive frame",
  description: "Langstroth deep Hoffman frame: top bar with hanging ears, self-spacing side bars wide at the shoulders, bottom bar, and drawn comb. Brood fill shows an oval of capped brood ringed by pollen under an arch of capped honey, with bees on the face; honey fill is capped edge to edge; foundation fill is a bare wax sheet on frame wires. Material controls: frame timber, open comb wax, honey cappings, capped brood, pollen. Fill choice; newFrame, darkBroodComb and heatherHoney presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'hive frame', 'comb', 'brood', 'langstroth', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fill = param('fill', 'brood', { choices: ['brood', 'honey', 'foundation'], label: 'What the frame holds' });

const timber = param('timber', '#c99a5e', { label: 'Top bar, side bars and bottom bar (frame timber)' });
const wax = param('wax', '#d9a948', { label: 'Open comb and foundation (beeswax)' });
const capping = param('capping', '#f1e2b0', { label: 'Honey cappings (white wax)' });
const brood = param('brood', '#b9824a', { label: 'Capped brood (porous cappings)' });
const pollen = param('pollen', '#d9792a', { label: 'Stored pollen' });

presets({
  newFrame: { timber: '#e2bd84', wax: '#f0cf6a', capping: '#fbf1cf', brood: '#c99158', pollen: '#e8a23a' },
  darkBroodComb: { timber: '#8c6a43', wax: '#7a5326', capping: '#d8c48c', brood: '#6e4a2a', pollen: '#b8642a' },
  heatherHoney: { timber: '#c99a5e', wax: '#b9772f', capping: '#e8d39a', brood: '#a6703f', pollen: '#9e5a8a' },
});

const p = assembly("hive-frame");
const add = (name, shape) => p.part(name, shape.scale(scale));
const b = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z + h / 2);
// Elliptical disc in the comb plane (XZ), `t` thick through Y.
const oval = (rx, rz, t, z) => cylinder(t, rx, 32).translate(0, 0, -t / 2).rotateX(90).scale([1, 1, rz / rx]).translate(0, 0, z);

const TOP = 232; // overall frame depth
const HALF = 223; // half length of the top bar between the ears
const SX = HALF - 4.5; // side bar centre line

// Top bar with thinner ears that hang on the box rebates.
add('top-bar', b(0, 0, TOP - 19, 2 * HALF, 27, 19).color(timber));
for (const s of [-1, 1]) add(`ear-${s}`, b(s * (HALF + 9), 0, TOP - 10, 18, 27, 10).color(timber));
add('top-bar-groove', b(0, 0, TOP - 1, 2 * HALF - 20, 4, 1.5).color(wax));

// Hoffman side bars: wide self-spacing shoulders on top, narrow below, with
// the V edge of the shoulder drawn as a bevelled profile.
const shoulder = extrudePolygon([[-17.5, 0], [17.5, 0], [17.5, 90], [8, 100], [-8, 100], [-17.5, 90]], 9);
for (const s of [-1, 1]) {
  add(`side-shoulder-${s}`, shoulder.rotateX(90).rotateZ(90).translate(s * SX - 4.5, 0, TOP - 19 - 100).color(timber));
  add(`side-bar-${s}`, b(s * SX, 0, 10, 9, 25, TOP - 19 - 100 - 10 + 1).color(timber));
}
add('bottom-bar', b(0, 0, 0, 2 * SX + 9, 19, 10).color(timber));

// Comb area inside the bars.
const CW = 2 * SX - 9; // comb width
const CZ0 = 10;
const CH = TOP - 19 - CZ0;
const CZ = CZ0 + CH / 2;

if (fill.value === 'foundation') {
  add('foundation-sheet', b(0, 0, CZ0 + 6, CW - 6, 2, CH - 8).color(wax));
  for (const z of [50, 95, 140, 185]) {
    add(`frame-wire-${z}`, cylinder(2 * SX, 0.8, 6).rotateY(90).translate(-SX, 1.6, z).color('#9aa3a6'));
  }
} else {
  // Drawn comb: open cells show the wax colour.
  add('drawn-comb', b(0, 0, CZ0, CW, 25, CH).color(wax));
  if (fill.value === 'honey') {
    const slab = box(CW - 10, 27, CH - 12, true).translate(0, 0, CZ);
    add('honey-cappings', slab.intersect(oval(CW / 2 + 30, CH / 2 + 28, 30, CZ)).color(capping));
  } else {
    // Arch of capped honey over the top corners, pollen ring, brood oval.
    const slab = box(CW - 6, 27, CH - 6, true).translate(0, 0, CZ);
    add('honey-arch', slab.subtract(oval(188, 112, 34, CZ - 22)).color(capping));
    add('pollen-ring', oval(170, 92, 26.2, CZ - 18).color(pollen));
    add('brood-cappings', oval(148, 74, 26.8, CZ - 18).color(brood));
    // A few uncapped cells in the brood patch.
    for (const [x, z] of [[-70, 100], [40, 70], [95, 115], [-20, 60]]) {
      add(`open-cell-${x}`, oval(6, 6, 27.4, z).translate(x, 0, 0).color(wax));
    }
    // Workers on the near face.
    for (const [x, z, a] of [[-120, 150, 20], [-30, 120, -40], [60, 160, 70], [130, 80, 0], [10, 50, 110]]) {
      const bee = sphere(5).scale([1.6, 0.7, 0.8]).rotateY(a).translate(x, -15, z);
      add(`bee-${x}`, bee.color('#2a2116'));
      add(`bee-stripe-${x}`, sphere(3.4).scale([1, 0.75, 0.9]).rotateY(a).translate(x, -16, z).color('#d79a2b'));
    }
  }
}

return p.model();
