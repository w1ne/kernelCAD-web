// Five actual robot-hand workflow candidate models on one comparison board.
//
// A: mechanism-template first
// B: reference-conditioned visible fit + physical completion
// C: mesh-feature fitting
// D: master skeleton
// E: validation-loop view
//
// This is a display board, not one physical object: labels float in front
// of their panels, finger segments are drawn with gaps, ghost overlays sit
// over the hands. Every displayed piece is therefore its own named
// assembly part (no union() of pieces that do not touch); colours and
// positions are unchanged from the fused version.

setCameraTarget(0, 0, 35);
setCameraDistance(620);

const beige = '#d8d3c9';
const tan = '#b9b3a8';
const dark = '#111827';
const metal = '#d9dee5';
const blue = '#2563eb';
const red = '#dc2626';
const green = '#16a34a';
const orange = '#f59e0b';
const ghost = '#cbd5e1';
const graphite = '#475569';

function solid(w, d, h, x, y, z, color) {
  return box(w, d, h, true).translate(x, y, z).color(color);
}

function rodXZ(x1, z1, x2, z2, y, thickness, color) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz) * 180 / Math.PI;
  return box(thickness, 4, len, true)
    .rotate([0, 1, 0], angle)
    .translate((x1 + x2) / 2, y, (z1 + z2) / 2)
    .color(color);
}

function pin(x, z, y = -11, r = 4) {
  return cylinder(5, r, 20).alongAxis([0, 1, 0]).translate(x, y, z).color(metal);
}

/** Collects the displayed pieces of one candidate as named parts. */
function pieces(label) {
  const list = [];
  return {
    list,
    add(name, shape) {
      list.push([`${label}-${name}-${list.length + 1}`, shape]);
    },
  };
}

function basePanel(p, cx, label, color) {
  p.add('panel', solid(92, 8, 12, cx, 7, -76, color));
  blockLetter(p, label, cx - 33, -9, -80, dark);
}

function stroke(w, h, x, y, z, color) {
  return solid(w, 3, h, x, y, z, color);
}

function blockLetter(p, label, x, y, z, color) {
  const add = (s) => p.add('letter', s);
  if (label === 'A') {
    add(rodXZ(x - 8, z - 8, x, z + 10, y, 3.2, color));
    add(rodXZ(x + 8, z - 8, x, z + 10, y, 3.2, color));
    add(stroke(12, 3, x, y, z, color));
    return;
  }
  if (label === 'B') {
    add(stroke(3, 22, x - 7, y, z, color));
    add(stroke(12, 3, x, y, z + 10, color));
    add(stroke(12, 3, x, y, z, color));
    add(stroke(12, 3, x, y, z - 10, color));
    add(stroke(3, 9, x + 7, y, z + 5, color));
    add(stroke(3, 9, x + 7, y, z - 5, color));
    return;
  }
  if (label === 'C') {
    add(stroke(3, 22, x - 7, y, z, color));
    add(stroke(14, 3, x, y, z + 10, color));
    add(stroke(14, 3, x, y, z - 10, color));
    return;
  }
  if (label === 'D') {
    add(stroke(3, 22, x - 7, y, z, color));
    add(stroke(12, 3, x, y, z + 10, color));
    add(stroke(12, 3, x, y, z - 10, color));
    add(stroke(3, 18, x + 7, y, z, color));
    return;
  }
  add(stroke(3, 22, x - 7, y, z, color));
  add(stroke(14, 3, x, y, z + 10, color));
  add(stroke(12, 3, x - 1, y, z, color));
  add(stroke(14, 3, x, y, z - 10, color));
}

function simplePalm(p, cx, color = tan, y = 0) {
  p.add('palm', solid(72, 16, 70, cx, y, 6, color));
  p.add('palm', solid(56, 18, 16, cx, y - 1, -42, dark));
  p.add('palm', solid(42, 18, 22, cx, y - 1, -60, graphite));
}

function simpleFinger(p, rootX, rootZ, lengths, width, angleDeg, color = beige, y = 0) {
  const [a, b, c] = lengths;
  const place = (s) => s.rotate([0, 1, 0], angleDeg).translate(rootX, 0, rootZ);
  p.add('finger', place(solid(width, 10, a, 0, y, a / 2, color)));
  p.add('finger', place(solid(width * 0.82, 9, b, 0, y, a + b / 2 + 5, color)));
  p.add('finger', place(solid(width * 0.70, 8, c, 0, y, a + b + c / 2 + 10, dark)));
}

function basicHand(p, cx, opts = {}) {
  const y = opts.y ?? 0;
  const palmColor = opts.palmColor ?? tan;
  const linkColor = opts.linkColor ?? beige;
  simplePalm(p, cx, palmColor, y);
  simpleFinger(p, cx - 36, 42, [34, 24, 16], 10, -4, linkColor, y);
  simpleFinger(p, cx - 12, 44, [42, 29, 20], 11, -1, linkColor, y);
  simpleFinger(p, cx + 12, 45, [46, 32, 22], 11, 0, linkColor, y);
  simpleFinger(p, cx + 36, 42, [38, 27, 18], 10, 4, linkColor, y);
  simpleFinger(p, cx + 52, -4, [30, 22, 16], 10, 38, linkColor, y);
  for (const x of [cx - 36, cx - 12, cx + 12, cx + 36]) {
    p.add('pin', pin(x, 42, y - 11, 3.8));
  }
  p.add('pin', pin(cx + 52, -4, y - 11, 3.8));
}

function mechanismTemplate(cx) {
  const p = pieces('A');
  basePanel(p, cx, 'A', '#e0e7ff');
  basicHand(p, cx);
  for (const x of [cx - 36, cx - 12, cx + 12, cx + 36, cx + 52]) {
    p.add('actuator', solid(16, 6, 9, x, -14, 39, graphite));
    p.add('actuator', solid(10, 6, 7, x, -17, 31, metal));
  }
  p.add('tendon', rodXZ(cx - 34, -40, cx - 36, 42, -16, 2, metal));
  p.add('tendon', rodXZ(cx - 10, -42, cx - 12, 44, -16, 2, metal));
  p.add('tendon', rodXZ(cx + 12, -42, cx + 12, 45, -16, 2, metal));
  return p.list;
}

function referenceConditioned(cx) {
  const p = pieces('B');
  basePanel(p, cx, 'B', '#cffafe');
  p.add('ghost', solid(82, 4, 78, cx, 8, 8, ghost));
  p.add('ghost', solid(18, 4, 82, cx - 38, 8, 78, ghost));
  p.add('ghost', solid(18, 4, 94, cx - 12, 8, 83, ghost));
  p.add('ghost', solid(18, 4, 98, cx + 12, 8, 85, ghost));
  p.add('ghost', solid(18, 4, 84, cx + 38, 8, 78, ghost));
  p.add('ghost', rodXZ(cx + 50, -2, cx + 92, 54, 8, 9, ghost));
  basicHand(p, cx, { y: -2 });
  for (const x of [cx - 26, cx, cx + 26]) {
    p.add('marker', solid(10, 3, 24, x, -13, 12, dark));
  }
  return p.list;
}

function meshFeatureFitting(cx) {
  const p = pieces('C');
  basePanel(p, cx, 'C', '#fef3c7');
  p.add('ghost', solid(82, 14, 58, cx, 5, 8, ghost));
  p.add('ghost', solid(22, 14, 72, cx - 38, 5, 72, ghost));
  p.add('ghost', solid(24, 14, 86, cx - 10, 5, 82, ghost));
  p.add('ghost', solid(24, 14, 90, cx + 16, 5, 84, ghost));
  p.add('ghost', solid(22, 14, 76, cx + 42, 5, 74, ghost));
  p.add('fit', solid(72, 6, 48, cx, -10, 8, orange));
  for (const x of [cx - 38, cx - 10, cx + 16, cx + 42]) {
    p.add('fit', solid(14, 6, 66, x, -10, 66, orange));
    p.add('pin', pin(x, 39, -14, 3.5));
  }
  p.add('fit', rodXZ(cx + 46, -4, cx + 88, 48, -10, 8, orange));
  return p.list;
}

function masterSkeleton(cx) {
  const p = pieces('D');
  basePanel(p, cx, 'D', '#dcfce7');
  basicHand(p, cx, { y: 0, palmColor: '#e6dfd2', linkColor: '#e9e2d5' });
  p.add('skeleton', rodXZ(cx, -58, cx, 122, -18, 2.5, blue));
  p.add('skeleton', solid(118, 3, 2, cx, -18, 42, red));
  for (const x of [cx - 36, cx - 12, cx + 12, cx + 36]) {
    p.add('skeleton', rodXZ(x, 42, x - 6, 112, -18, 2.2, blue));
    p.add('pin', pin(x, 42, -20, 3.2));
  }
  p.add('skeleton', rodXZ(cx + 52, -4, cx + 92, 55, -18, 2.2, blue));
  return p.list;
}

function validationLoop(cx) {
  const p = pieces('E');
  basePanel(p, cx, 'E', '#fee2e2');
  basicHand(p, cx);
  p.add('check', solid(20, 5, 20, cx - 46, -18, -40, green));
  p.add('check', rodXZ(cx - 52, -40, cx - 46, -32, -21, 3, green));
  p.add('check', rodXZ(cx - 46, -32, cx - 35, -50, -21, 3, green));
  p.add('cross', solid(22, 5, 22, cx + 64, -18, 82, red));
  p.add('cross', rodXZ(cx + 56, 74, cx + 72, 90, -21, 4, red));
  p.add('cross', rodXZ(cx + 72, 74, cx + 56, 90, -21, 4, red));
  return p.list;
}

const centers = [-250, -125, 0, 125, 250];
const board = assembly('robot-hand-workflow-candidates');
for (const [name, shape] of [
  ...mechanismTemplate(centers[0]),
  ...referenceConditioned(centers[1]),
  ...meshFeatureFitting(centers[2]),
  ...masterSkeleton(centers[3]),
  ...validationLoop(centers[4]),
]) {
  board.part(name, shape);
}

return board.model();
