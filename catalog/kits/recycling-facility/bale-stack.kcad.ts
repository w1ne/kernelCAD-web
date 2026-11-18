// SPDX-License-Identifier: CC0-1.0
// Bale stack: finished bales from the horizontal baler, stacked on the yard
// waiting for the mill truck.
// What makes it a stack of recycling bales rather than a pile of blocks:
// each bale shows the compressed layers on its ends and sides (sheets
// pressed flat, slightly out of line, alternating print and plain board),
// is tied round with five baling wires, carries a grade tag, and has a few
// scraps poking out of the layers. Three bales sit on the ground and two
// more are stacked on top, the way a loader builds them.
// Material presets switch the bales between cardboard, PET bottles and
// aluminium cans.
// Generic visualization geometry at about real size (each bale 1100 x 750
// x 800 mm), millimetres, Z up, bale ends on -Y.

meta({
  name: "bale-stack",
  license: 'CC0-1.0',
  title: "Bale stack",
  description: "Stack of five recycling bales at about real size, three on the ground and two on top: each bale shows offset compressed layers in two tones, five baling wires round it, a grade tag and scraps poking out of the layers. Material controls: bale body, bale print and flecks, baling wire, grade tag. cardboard, petBottles, aluminiumCans and weathered presets.",
  tags: ['bale', 'bales', 'baled cardboard', 'OCC bale', 'PET bale', 'can bale', 'baler output', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bale = param('bale', '#b38a55', { label: 'Bale body (baled material)' });
const fleck = param('fleck', '#d9c7a4', { label: 'Bale print and flecks' });
const wire = param('wire', '#5d6366', { label: 'Baling wire (steel)' });
const tag = param('tag', '#e3c234', { label: 'Grade tag' });

presets({
  cardboard: { bale: '#b38a55', fleck: '#d9c7a4', wire: '#5d6366', tag: '#e3c234' },
  petBottles: { bale: '#6f9fcf', fleck: '#d7e6ee', wire: '#4d5357', tag: '#e85d3a' },
  aluminiumCans: { bale: '#b3b8bc', fleck: '#c0392b', wire: '#3f4447', tag: '#2f7fc1' },
  weathered: { bale: '#8f7350', fleck: '#a99a7f', wire: '#6b4a32', tag: '#b9a44a' },
});

const p = assembly("bale-stack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const BW = 750;
const BL = 1100;
const BH = 800;
const LAYERS = 8;

// One bale, built at the origin (width along X, length along Y), then placed.
const placeBale = (id: string, cx: number, cy: number, cz: number, seed: number) => {
  const put = (name: string, s: Shape) => add(`${id}-${name}`, s.translate(cx, cy, cz));
  const lh = BH / LAYERS;
  for (let k = 0; k < LAYERS; k++) {
    const j = (k * 7 + seed * 3) % 5;
    const dx = (j - 2) * 9;
    const dy = (((k * 3 + seed) % 5) - 2) * 11;
    const tone = (k + seed) % 3 === 1 ? fleck : bale;
    put(`layer-${k}`, box(BW - 10 - (k % 2) * 14, BL - 10 - (j % 2) * 16, lh, true).translate(dx, dy, k * lh + lh / 2).color(tone));
  }
  // Baling wires: top run and the two side drops, outside the layers.
  for (let i = 0; i < 5; i++) {
    const y = -BL / 2 + 130 + (i * (BL - 260)) / 4;
    put(`wire-top-${i}`, box(BW + 30, 8, 6, true).translate(0, y, BH + 3).color(wire));
    put(`wire-l-${i}`, box(6, 8, BH - 20, true).translate(-BW / 2 - 12, y, BH / 2 + 10).color(wire));
    put(`wire-r-${i}`, box(6, 8, BH - 20, true).translate(BW / 2 + 12, y, BH / 2 + 10).color(wire));
  }
  // Grade tag tucked under the middle wire on the end face, and scraps.
  put("tag", box(120, 6, 170, true).rotateY(6).translate(-BW / 4, -BL / 2 - 14, BH * 0.62).color(tag));
  put("tag-string", box(4, 4, 90, true).translate(-BW / 4, -BL / 2 - 12, BH * 0.62 + 120).color(wire));
  put("scrap-a", box(180, 90, 6, true).rotateX(-18).rotateZ(14).translate(BW * 0.18, -BL / 2 - 30, lh * (2 + (seed % 3))).color(fleck));
  put("scrap-b", box(8, 160, 110, true).rotateZ(-20).translate(-BW / 2 - 40, -BL / 4 + seed * 60, lh * (4 + (seed % 2))).color(fleck));
};

// Three on the ground, two on top, set back a little so the step shows.
placeBale("bale-1", -(BW + 25), 0, 0, 0);
placeBale("bale-2", 0, 0, 0, 1);
placeBale("bale-3", BW + 25, 0, 0, 2);
placeBale("bale-4", -(BW + 25) / 2, 60, BH + 6, 3);
placeBale("bale-5", (BW + 25) / 2, 60, BH + 6, 4);

return p.model();
