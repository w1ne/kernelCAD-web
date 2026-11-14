// SPDX-License-Identifier: CC0-1.0
// Wire grid display: freestanding gridwall panel for hanging small goods.
// What makes it gridwall rather than a shelf: an open welded grid of thin
// round wires inside a heavier tube border, stood upright on two splayed
// T-feet with levelling pads, carrying peg hooks that stick out toward the
// shopper with blister packs hung on them, and a header card clipped on top.
// Generic visualization geometry at about real size (1.2 m wide, 1.8 m to the
// top of the header), millimetres, Z up, hooks pointing toward -Y, feet on z = 0.

meta({
  name: "wire-grid-display",
  license: 'CC0-1.0',
  title: "Wire grid display",
  description: "Freestanding gridwall display at about real size: open welded wire grid in a tube border on two splayed T-feet with levelling pads, peg hooks with hanging blister packs, and a clipped header card. Material controls: wire, feet, header card, packs. chrome, matteBlack and seasonalRed presets; pack fill choice.",
  tags: ['gridwall', 'grid wall', 'wire grid', 'peg display', 'hook display', 'merchandiser', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const wire = param('wire', '#b9c2c6', { label: 'Wire grid and hooks (chrome steel)' });
const feet = param('feet', '#2d3236', { label: 'Feet and levelling pads' });
const header = param('header', '#d23a2c', { label: 'Header card' });
const packs = param('packs', '#f0c23a', { label: 'Blister packs' });
const fill = param('fill', 'stocked', { choices: ['stocked', 'empty'], label: 'Hook fill' });

presets({
  chrome: { wire: '#b9c2c6', feet: '#2d3236', header: '#d23a2c', packs: '#f0c23a' },
  matteBlack: { wire: '#2a2d30', feet: '#1c1e20', header: '#f2f2ee', packs: '#3a8fd0' },
  seasonalRed: { wire: '#e9ecec', feet: '#7a1f1a', header: '#2f7d3a', packs: '#d23a2c' },
});

const p = assembly("wire-grid-display");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 1200;
const Z0 = 120;
const H = 1520;
const PITCH = 75;

// Tube border: two posts, top and bottom rails, rounded corner caps.
for (const s of [-1, 1]) {
  add(`post-${s < 0 ? 'l' : 'r'}`, cylinder(H, 14, 10).translate(s * (W / 2), 0, Z0).color(wire));
  add(`post-cap-${s < 0 ? 'l' : 'r'}`, sphere(16).translate(s * (W / 2), 0, Z0 + H).color(wire));
}
for (const z of [Z0 + 20, Z0 + H - 10]) add(`rail-${z}`, cylinder(W, 11, 8).rotateY(90).translate(-W / 2, 0, z).color(wire));

// Welded grid (square-section wire keeps the count low): thin verticals in front of thin horizontals at a 75 mm pitch.
const cols = Math.floor(W / PITCH);
for (let c = 1; c < cols; c++) {
  add(`grid-v-${c}`, blk(-W / 2 + (c * W) / cols, -4, Z0 + 20, 7, 7, H - 40).color(wire));
}
const rows = Math.floor((H - 40) / PITCH);
for (let r = 1; r < rows; r++) {
  add(`grid-h-${r}`, blk(0, 3, Z0 + 20 + (r * (H - 40)) / rows, W - 20, 7, 7).color(wire));
}

// Splayed T-feet with levelling pads and a short gusset up each post.
for (const s of [-1, 1]) {
  const x = s * (W / 2);
  const tag = s < 0 ? 'l' : 'r';
  add(`foot-${tag}`, extrudePolygon([[-260, 0], [260, 0], [260, 30], [40, 60], [-40, 60], [-260, 30]], 50).rotateX(90).rotateZ(90).translate(x - 25, 0, 20).color(feet));
  add(`foot-socket-${tag}`, cylinder(60, 24, 12).translate(x, 0, 70).color(feet));
  for (const fy of [-1, 1]) add(`leveller-${tag}-${fy < 0 ? 'f' : 'b'}`, cylinder(20, 26, 12).translate(x, fy * 230, 0).color(feet));
}

// Peg hooks: a short back bend over a horizontal grid wire, then a prong out
// toward the shopper with an upturned tip. Three rows of four.
const hookRows = [1300, 1000, 700];
const hookCols = [-375, -125, 125, 375];
hookRows.forEach((z, ri) => {
  hookCols.forEach((x, ci) => {
    const tag = `${ri}-${ci}`;
    add(`hook-${tag}`, cylinder(240, 4, 6).rotateX(90).translate(x, -6, z).color(wire));
    add(`hook-back-${tag}`, blk(x, -2, z - 30, 26, 6, 60).color(wire));
    add(`hook-tip-${tag}`, cylinder(30, 4, 6).rotateX(-25).translate(x, -246, z).color(wire));
    if (fill.value === 'stocked') {
      // Blister packs: card back with a domed plastic bubble, hung in a row.
      for (let k = 0; k < 2; k++) {
        const y = -80 - k * 80;
        add(`pack-${tag}-${k}`, blk(x, y, z - 210, 150, 4, 220).color(packs));
        add(`bubble-${tag}-${k}`, blk(x, y - 14, z - 180, 90, 24, 120).color(header));
      }
    }
  });
});

// Header card clipped across the top rail.
add("header-card", blk(0, -14, Z0 + H + 10, 700, 8, 160).color(header));
add("header-band", blk(0, -19, Z0 + H + 70, 600, 2, 40).color(packs));
for (const s of [-1, 1]) add(`header-clip-${s < 0 ? 'l' : 'r'}`, blk(s * 260, -6, Z0 + H - 20, 30, 24, 60).color(wire));

return p.model();
