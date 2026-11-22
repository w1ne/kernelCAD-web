// SPDX-License-Identifier: CC0-1.0
// Sandbag counterweight: the canvas shot bag a fly crew clips onto a batten
// or a hemp set to trim it, or drops on a stand base to steady it.
// What makes it a theatre sandbag rather than a sack: a plump pear-shaped
// canvas body, flattened front to back, with a stitched reinforcing band; a
// gathered and tied neck; a webbing carry loop with a steel D-ring; a short
// trim chain to clip it on; and a white stencilled weight label on the
// front. A choice switches between the standard and the heavy bag.
// Generic visualization geometry at about real size (standard bag 0.43 m
// wide, 0.47 m to the neck, 0.68 m to the top of the chain), millimetres,
// Z up, label toward -Y, standing on z = 0.

meta({
  name: "sandbag-counterweight",
  license: 'CC0-1.0',
  title: "Sandbag counterweight",
  description: "Theatre rigging sandbag at about real size: plump pear-shaped canvas body with a stitched reinforcing band, gathered and tied neck, webbing carry loop with a steel D-ring, short trim chain, and a white stencilled weight label on the front. Material controls: canvas, webbing and ties, weight label, D-ring and chain; standard or heavy bag. houseShow, touring and blackCanvas presets.",
  tags: ['sandbag', 'shot bag', 'counterweight', 'rigging weight', 'stand weight', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const size = param('size', 'standard', { choices: ['standard', 'heavy'], label: 'Bag size' });

const canvas = param('canvas', '#c8b27e', { label: 'Canvas' });
const webbing = param('webbing', '#2d3136', { label: 'Webbing and ties' });
const label = param('label', '#f1efe6', { label: 'Weight label' });
const hardware = param('hardware', '#a9b1b5', { label: 'D-ring and chain' });

presets({
  houseShow: { canvas: '#c8b27e', webbing: '#2d3136', label: '#f1efe6', hardware: '#a9b1b5' },
  touring: { canvas: '#2b2e31', webbing: '#d63a2a', label: '#f2d23c', hardware: '#c3c9cc' },
  blackCanvas: { canvas: '#1f2224', webbing: '#4b5156', label: '#e9e7de', hardware: '#7c858a' },
});

const INK = '#202224';
const FLAT = 0.72; // body depth / width

const p = assembly("sandbag-counterweight");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const K = size.value === 'heavy' ? 1.22 : 1;
const s = (pts) => pts.map(([r, z]) => [r * K, z * K]);

// Canvas body, flattened front to back, with a stitched reinforcing band.
const body = s([[0, 0], [140, 0], [190, 40], [215, 140], [208, 250], [170, 340], [100, 410], [48, 440], [0, 440]]);
add("bag-body", turned(body).scale([1, FLAT, 1]).color(canvas));
add("reinforcing-band", torus(212 * K, 7, 24).scale([1, FLAT, 1]).translate(0, 0, 200 * K).color(webbing));
add("base-seam", torus(160 * K, 6, 24).scale([1, FLAT, 1]).translate(0, 0, 14 * K).color(webbing));

// Gathered neck with a tie and the ruffle of canvas above it.
const NZ = 440 * K;
add("neck-tie", torus(44 * K, 10, 16).translate(0, 0, NZ - 6).color(webbing));
add("neck-ruffle", turned([[0, 0], [40, 0], [62, 26], [86, 48], [70, 56], [36, 34], [0, 34]].map(([r, z]) => [r * K, z])).scale([1, 0.8, 1]).translate(0, 0, NZ - 10).color(canvas));

// Webbing loop over the neck, steel D-ring and a short trim chain.
const LZ = NZ + 40;
add("webbing-loop", torus(54, 9, 16).rotateX(90).subtract(box(160, 40, 80, true).translate(0, 0, -40)).translate(0, 0, LZ).color(webbing));
add("loop-tail-left", box(18, 20, 50, true).translate(-54, 0, LZ - 20).color(webbing));
add("loop-tail-right", box(18, 20, 50, true).translate(54, 0, LZ - 20).color(webbing));
add("d-ring", torus(30, 6, 16).rotateX(90).translate(0, 0, LZ + 76).color(hardware));
for (let i = 0; i < 3; i++) {
  const link = torus(18, 4, 12).scale([1, 1, 1.5]);
  add(`chain-link-${i}`, (i % 2 === 0 ? link.rotateY(90) : link.rotateX(90)).translate(0, 0, LZ + 124 + i * 40).color(hardware));
}

// White weight label on the front with stencilled weight and crew marks.
const FY = -(208 * K * FLAT) - 2;
const LBZ = 200 * K + 70;
add("weight-label", box(150, 16, 100, true).translate(0, FY + 6, LBZ).color(label));
add("stencil-weight", box(90, 4, 30, true).translate(0, FY - 3, LBZ + 18).color(INK));
add("stencil-unit", box(50, 4, 14, true).translate(-20, FY - 3, LBZ - 22).color(INK));
add("stencil-mark", box(24, 4, 14, true).translate(38, FY - 3, LBZ - 22).color(INK));

return p.model();
