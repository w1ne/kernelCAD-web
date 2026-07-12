// Five actual robot-hand workflow candidate models on one comparison board.
//
// A: mechanism-template first
// B: reference-conditioned visible fit + physical completion
// C: mesh-feature fitting
// D: master skeleton
// E: validation-loop view

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

function basePanel(cx, label, color) {
  return solid(92, 8, 12, cx, 7, -76, color)
    .union(blockLetter(label, cx - 33, -9, -80, dark));
}

function stroke(w, h, x, y, z, color) {
  return solid(w, 3, h, x, y, z, color);
}

function blockLetter(label, x, y, z, color) {
  if (label === 'A') {
    return rodXZ(x - 8, z - 8, x, z + 10, y, 3.2, color)
      .union(rodXZ(x + 8, z - 8, x, z + 10, y, 3.2, color))
      .union(stroke(12, 3, x, y, z, color));
  }
  if (label === 'B') {
    return stroke(3, 22, x - 7, y, z, color)
      .union(stroke(12, 3, x, y, z + 10, color))
      .union(stroke(12, 3, x, y, z, color))
      .union(stroke(12, 3, x, y, z - 10, color))
      .union(stroke(3, 9, x + 7, y, z + 5, color))
      .union(stroke(3, 9, x + 7, y, z - 5, color));
  }
  if (label === 'C') {
    return stroke(3, 22, x - 7, y, z, color)
      .union(stroke(14, 3, x, y, z + 10, color))
      .union(stroke(14, 3, x, y, z - 10, color));
  }
  if (label === 'D') {
    return stroke(3, 22, x - 7, y, z, color)
      .union(stroke(12, 3, x, y, z + 10, color))
      .union(stroke(12, 3, x, y, z - 10, color))
      .union(stroke(3, 18, x + 7, y, z, color));
  }
  return stroke(3, 22, x - 7, y, z, color)
    .union(stroke(14, 3, x, y, z + 10, color))
    .union(stroke(12, 3, x - 1, y, z, color))
    .union(stroke(14, 3, x, y, z - 10, color));
}

function simplePalm(cx, color = tan, y = 0) {
  return solid(72, 16, 70, cx, y, 6, color)
    .union(solid(56, 18, 16, cx, y - 1, -42, dark))
    .union(solid(42, 18, 22, cx, y - 1, -60, graphite));
}

function simpleFinger(rootX, rootZ, lengths, width, angleDeg, color = beige, y = 0) {
  const [a, b, c] = lengths;
  const root = solid(width, 10, a, 0, y, a / 2, color);
  const mid = solid(width * 0.82, 9, b, 0, y, a + b / 2 + 5, color);
  const tip = solid(width * 0.70, 8, c, 0, y, a + b + c / 2 + 10, dark);
  return root.union(mid).union(tip)
    .rotate([0, 1, 0], angleDeg)
    .translate(rootX, 0, rootZ);
}

function basicHand(cx, opts = {}) {
  const y = opts.y ?? 0;
  const palmColor = opts.palmColor ?? tan;
  const linkColor = opts.linkColor ?? beige;
  let model = simplePalm(cx, palmColor, y)
    .union(simpleFinger(cx - 36, 42, [34, 24, 16], 10, -4, linkColor, y))
    .union(simpleFinger(cx - 12, 44, [42, 29, 20], 11, -1, linkColor, y))
    .union(simpleFinger(cx + 12, 45, [46, 32, 22], 11, 0, linkColor, y))
    .union(simpleFinger(cx + 36, 42, [38, 27, 18], 10, 4, linkColor, y))
    .union(simpleFinger(cx + 52, -4, [30, 22, 16], 10, 38, linkColor, y));
  for (const x of [cx - 36, cx - 12, cx + 12, cx + 36]) {
    model = model.union(pin(x, 42, y - 11, 3.8));
  }
  model = model.union(pin(cx + 52, -4, y - 11, 3.8));
  return model;
}

function mechanismTemplate(cx) {
  let model = basePanel(cx, 'A', '#e0e7ff').union(basicHand(cx));
  for (const x of [cx - 36, cx - 12, cx + 12, cx + 36, cx + 52]) {
    model = model
      .union(solid(16, 6, 9, x, -14, 39, graphite))
      .union(solid(10, 6, 7, x, -17, 31, metal));
  }
  return model.union(rodXZ(cx - 34, -40, cx - 36, 42, -16, 2, metal))
    .union(rodXZ(cx - 10, -42, cx - 12, 44, -16, 2, metal))
    .union(rodXZ(cx + 12, -42, cx + 12, 45, -16, 2, metal));
}

function referenceConditioned(cx) {
  let model = basePanel(cx, 'B', '#cffafe')
    .union(solid(82, 4, 78, cx, 8, 8, ghost))
    .union(solid(18, 4, 82, cx - 38, 8, 78, ghost))
    .union(solid(18, 4, 94, cx - 12, 8, 83, ghost))
    .union(solid(18, 4, 98, cx + 12, 8, 85, ghost))
    .union(solid(18, 4, 84, cx + 38, 8, 78, ghost))
    .union(rodXZ(cx + 50, -2, cx + 92, 54, 8, 9, ghost))
    .union(basicHand(cx, { y: -2 }));
  for (const x of [cx - 26, cx, cx + 26]) {
    model = model.union(solid(10, 3, 24, x, -13, 12, dark));
  }
  return model;
}

function meshFeatureFitting(cx) {
  let model = basePanel(cx, 'C', '#fef3c7')
    .union(solid(82, 14, 58, cx, 5, 8, ghost))
    .union(solid(22, 14, 72, cx - 38, 5, 72, ghost))
    .union(solid(24, 14, 86, cx - 10, 5, 82, ghost))
    .union(solid(24, 14, 90, cx + 16, 5, 84, ghost))
    .union(solid(22, 14, 76, cx + 42, 5, 74, ghost))
    .union(solid(72, 6, 48, cx, -10, 8, orange));
  for (const x of [cx - 38, cx - 10, cx + 16, cx + 42]) {
    model = model
      .union(solid(14, 6, 66, x, -10, 66, orange))
      .union(pin(x, 39, -14, 3.5));
  }
  return model.union(rodXZ(cx + 46, -4, cx + 88, 48, -10, 8, orange));
}

function masterSkeleton(cx) {
  let model = basePanel(cx, 'D', '#dcfce7')
    .union(basicHand(cx, { y: 0, palmColor: '#e6dfd2', linkColor: '#e9e2d5' }))
    .union(rodXZ(cx, -58, cx, 122, -18, 2.5, blue))
    .union(solid(118, 3, 2, cx, -18, 42, red));
  for (const x of [cx - 36, cx - 12, cx + 12, cx + 36]) {
    model = model
      .union(rodXZ(x, 42, x - 6, 112, -18, 2.2, blue))
      .union(pin(x, 42, -20, 3.2));
  }
  model = model.union(rodXZ(cx + 52, -4, cx + 92, 55, -18, 2.2, blue));
  return model;
}

function validationLoop(cx) {
  const model = basePanel(cx, 'E', '#fee2e2')
    .union(basicHand(cx))
    .union(solid(20, 5, 20, cx - 46, -18, -40, green))
    .union(rodXZ(cx - 52, -40, cx - 46, -32, -21, 3, green))
    .union(rodXZ(cx - 46, -32, cx - 35, -50, -21, 3, green))
    .union(solid(22, 5, 22, cx + 64, -18, 82, red))
    .union(rodXZ(cx + 56, 74, cx + 72, 90, -21, 4, red))
    .union(rodXZ(cx + 72, 74, cx + 56, 90, -21, 4, red));
  return model;
}

const centers = [-250, -125, 0, 125, 250];
const comparison = mechanismTemplate(centers[0])
  .union(referenceConditioned(centers[1]))
  .union(meshFeatureFitting(centers[2]))
  .union(masterSkeleton(centers[3]))
  .union(validationLoop(centers[4]));

return comparison;
