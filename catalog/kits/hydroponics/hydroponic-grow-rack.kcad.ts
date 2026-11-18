// SPDX-License-Identifier: CC0-1.0
// Hydroponic grow rack: a three-tier vertical-farm rack where each tier is a
// bank of NFT gutters under its own LED fixtures. A thin film of nutrient
// solution runs down every gutter from a feed riser to a return collector.
// What makes it a vertical-farm grow rack: slotted steel uprights with cross
// beams and diagonal end bracing, four white lidded gutters per tier with a
// row of planting holes and a crop growing out of them, a feed riser with a
// drip tube into the head of each gutter, a return collector across the
// gutter tails dropping to a floor return pipe, and LED light bars hung over
// every tier.
// Generic visualization geometry at about real size (2.5 m long, 0.8 m deep,
// 2.1 m tall), millimetres, Z up, gutter rows seen from -Y.

meta({
  name: "hydroponic-grow-rack",
  license: 'CC0-1.0',
  title: "Hydroponic grow rack",
  description: "Three-tier vertical-farm NFT rack at about real size: slotted steel uprights with beams and end bracing, four lidded gutters per tier with planting holes and a growing crop, feed riser with drip tubes into each gutter head, return collector and drop pipe, and LED light bars above every tier. Material controls: rack frame, gutters, crop foliage and LED light colour, plus a crop choice. lettuce, basil, purpleLight and weathered presets.",
  tags: ['vertical farm', 'grow rack', 'nft', 'nutrient film technique', 'gutter', 'multi-tier', 'indoor farm', 'led grow light', 'lettuce', 'hydroponics', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 8000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3a6f9e', { label: 'Rack frame (powder-coated steel)' });
const gutters = param('gutters', '#f0f0ea', { label: 'NFT gutters (PVC)' });
const foliage = param('foliage', '#86bb4c', { label: 'Crop foliage' });
const lights = param('lights', '#f6f2ff', { label: 'LED grow lights (diffuser glow)' });
const crop = param('crop', 'lettuce', { choices: ['lettuce', 'microgreens', 'empty'], label: 'Crop in the gutters' });

presets({
  lettuce: { frame: '#3a6f9e', gutters: '#f0f0ea', foliage: '#86bb4c', lights: '#f6f2ff' },
  basil: { frame: '#3a6f9e', gutters: '#f0f0ea', foliage: '#3f8a34', lights: '#f6f2ff' },
  purpleLight: { frame: '#2e3236', gutters: '#e8e8e2', foliage: '#7aa848', lights: '#d982e0' },
  weathered: { frame: '#5f6e78', gutters: '#d4d0c2', foliage: '#93a65a', lights: '#e8e2d0' },
});

const p = assembly("hydroponic-grow-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);

const L = 2400, W = 760, H = 2100;
const tierZ = [280, 950, 1620]; // gutter underside per tier
const gutterY = [-270, -90, 90, 270];
const holes = 9, pitch = 240;

// Uprights on foot plates, with a slot pattern on the front faces.
for (const x of [-L / 2, 0, L / 2]) {
  for (const y of [-W / 2, W / 2]) {
    add(`upright-${x}-${y}`, blk(x, y, 10, 60, 60, H - 10).color(frame));
    add(`foot-${x}-${y}`, blk(x, y, 0, 120, 120, 10).color('#5a5f63'));
  }
  for (let k = 0; k < 14; k++) add(`slots-${x}-${k}`, blk(x, -W / 2 - 31, 120 + k * 140, 22, 2, 50).color('#1f2326'));
}
// End bracing on both ends: horizontals and a diagonal per bay.
for (const x of [-L / 2, L / 2]) {
  for (const z of [120, 760, 1430, H - 60]) add(`end-tie-${x}-${z}`, blk(x, 0, z, 40, W - 60, 40).color(frame));
  for (const [z0, z1] of [[120, 760], [760, 1430], [1430, H - 60]]) {
    const ang = Math.atan2(z1 - z0, W - 60) * 180 / Math.PI;
    const len = Math.hypot(z1 - z0, W - 60);
    add(`end-brace-${x}-${z0}`, box(26, len, 26, true).rotateX(ang).translate(x, 0, (z0 + z1) / 2 + 20).color(frame));
  }
}

tierZ.forEach((z, t) => {
  // Cross beams carrying the gutters.
  for (const y of [-W / 2, W / 2]) add(`beam-${t}-${y}`, blk(0, y, z - 70, L, 50, 70).color(frame));
  for (const x of [-L / 2 + 300, 0, L / 2 - 300]) add(`gutter-bearer-${t}-${x}`, blk(x, 0, z - 30, 40, W - 40, 30).color(frame));

  gutterY.forEach((y, g) => {
    // Lidded NFT gutter; net cups sit in a row of holes along the lid.
    add(`gutter-${t}-${g}`, blk(0, y, z, L + 100, 110, 60).color(gutters));
    add(`gutter-lid-${t}-${g}`, blk(0, y, z + 60, L + 100, 124, 10).color(gutters));
    add(`gutter-head-cap-${t}-${g}`, blk(-L / 2 - 55, y, z, 12, 116, 72).color('#c9cbc4'));

    for (let h = 0; h < holes; h++) {
      const x = (h - (holes - 1) / 2) * pitch;
      const k = t * 100 + g * 10 + h;
      if (crop.value === 'lettuce') {
        const r = 78 + ((h * 5 + g * 3 + t) % 3) * 8;
        add(`head-${k}`, sphere(r).scale([1, 1, 0.6]).translate(x, y, z + 70 + r * 0.38).color(foliage));
      } else if (crop.value === 'empty') {
        add(`cup-${k}`, cylZ(x, y, z + 70, 8, 32, 8).color('#25282a'));
      }
    }
    if (crop.value === 'microgreens') {
      // Microgreens grow as a dense mat on a pad laid along the gutter.
      add(`greens-mat-${t}-${g}`, blk(0, y, z + 70, L - 40, 104, 30 + ((g + t) % 2) * 12).color(foliage));
      for (let s = 0; s < 4; s++) add(`greens-tuft-${t}-${g}-${s}`, blk(-840 + s * 560 + g * 60, y, z + 100, 320, 84, 26).color('#a6d46a'));
    }
  });

  // Feed riser (-X end) with a drip tube into every gutter head.
  add(`feed-header-${t}`, cylinder(W - 60, 16, 10).rotateX(90).translate(-L / 2 - 120, W / 2 - 30, z + 120).color('#2f6fa8'));
  for (const y of gutterY) add(`drip-tube-${t}-${y}`, box(8, 8, 110, true).rotateY(-40).translate(-L / 2 - 85, y, z + 80).color('#1d2023'));
  // Return collector across the gutter tails (+X end).
  add(`return-collector-${t}`, blk(L / 2 + 120, 0, z - 60, 140, W - 20, 110).subtract(blk(L / 2 + 120, 0, z - 40, 110, W - 50, 120)).color('#c9cbc4'));

  // LED bars over the tier, hung from the tier above (or the top beam).
  const zl = (t + 1 < tierZ.length ? tierZ[t + 1] - 70 : H - 60) - 30;
  for (const y of [-180, 0, 180]) {
    add(`led-bar-${t}-${y}`, blk(0, y, zl, L - 200, 60, 24).color('#2a2e31'));
    add(`led-diffuser-${t}-${y}`, blk(0, y, zl - 6, L - 220, 50, 6).color(lights));
  }
});
for (const y of [-W / 2, W / 2]) add(`top-beam-${y}`, blk(0, y, H - 60, L, 50, 60).color(frame));
for (const y of [-180, 0, 180]) add(`top-hanger-${y}`, blk(0, y, H - 66, L - 200, 30, 6).color(frame));

// Feed riser and return drop pipe down to floor level.
add("feed-riser", cylZ(-L / 2 - 120, W / 2 - 30, 0, tierZ[2] + 140, 22).color('#2f6fa8'));
add("feed-valve", cylZ(-L / 2 - 120, W / 2 - 30, 160, 70, 40).color('#c0392b'));
add("return-drop", cylZ(L / 2 + 120, 0, 0, tierZ[2] - 60, 34).color('#c9cbc4'));
add("return-floor-elbow", cylX(L / 2 + 120, 0, 34, 300, 34).color('#c9cbc4'));

return p.model();
