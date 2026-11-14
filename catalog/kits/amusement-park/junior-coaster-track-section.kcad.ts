// SPDX-License-Identifier: CC0-1.0
// Junior coaster track section: a short display length of family roller
// coaster track at the foot of a lift hill.
// What makes it coaster track rather than a handrail: two round tubular
// running rails at a fixed gauge carried on a heavier round spine tube
// below, joined by triangular cross ties at even spacing, all following a
// smooth rise from flat into the lift; a chain trough with anti-rollback
// ratchet teeth runs between the rails on the climb, and the spine sits in
// saddles on Y-headed support columns bolted to concrete footings.
// Generic visualization geometry at about real size (about 6 m long, rising
// 0.75 m, 0.6 m rail gauge), millimetres, Z up, track rising toward +X,
// footings on z = 0.
meta({
  name: "junior-coaster-track-section",
  license: "CC0-1.0",
  title: "Junior coaster track section",
  description: "Family roller coaster track section at about real size: twin tubular running rails on a round spine tube with triangular cross ties, smooth rise into a lift hill with a chain trough and anti-rollback teeth, Y-headed support columns in spine saddles, galvanised base plates and concrete footings. Material controls: track paint, support paint, galvanised steel, concrete. Festival, twilight and woodie presets.",
  tags: ["roller coaster", "coaster track", "junior coaster", "family coaster", "lift hill", "amusement park", "theme park", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4200,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const trackPaint = param("trackPaint", "#e2572b", { label: "Painted track rails, spine and ties" });
const supportPaint = param("supportPaint", "#2f6b8f", { label: "Painted support columns" });
const steel = param("steel", "#9aa3a8", { label: "Galvanised base plates, trough and teeth" });
const concrete = param("concrete", "#92938b", { label: "Concrete footings" });

presets({
  festival: { trackPaint: "#f2c230", supportPaint: "#d23b2f", steel: "#9da3a0" },
  twilight: { trackPaint: "#7b4fb3", supportPaint: "#24323d", steel: "#4f626c", concrete: "#6f716c" },
  woodie: { trackPaint: "#5c5f62", supportPaint: "#a9805a", concrete: "#a4a39b" },
});

const p = assembly("junior-coaster-track-section");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Round tube of radius r between two points.
const rod = (a: [number, number, number], b: [number, number, number], r: number) => {
  const [dx, dy, dz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(dx, dy, dz);
  const tiltX = (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
  const tiltY = (Math.atan2(dx, dz) * 180) / Math.PI;
  return turned([[0, 0], [r, 0], [r, len], [0, len]]).rotateX(tiltX).rotateY(tiltY).translate(...a);
};

// Track centreline: flat run easing into a lift-hill climb.
const X0 = -3000;
const X1 = 3000;
const railZ = (x: number) => {
  const t = Math.min(1, Math.max(0, (x - X0) / (X1 - X0)));
  return 1500 + 750 * t * t * (3 - 2 * t);
};
const slopeDeg = (x: number) => (Math.atan2(railZ(x + 1) - railZ(x - 1), 2) * 180) / Math.PI;
const GAUGE = 300;
const SPINE_DROP = 330;
const N = 12;
const xs = Array.from({ length: N + 1 }, (_, i) => X0 + ((X1 - X0) * i) / N);

// Running rails and spine as chained tube segments following the rise.
for (let i = 0; i < N; i++) {
  const [a, b] = [xs[i], xs[i + 1]];
  for (const s of [-1, 1]) {
    add(`rail-${s > 0 ? "left" : "right"}-${i}`, rod([a, s * GAUGE, railZ(a)], [b, s * GAUGE, railZ(b)], 38).color(trackPaint));
  }
  add(`spine-${i}`, rod([a, 0, railZ(a) - SPINE_DROP], [b, 0, railZ(b) - SPINE_DROP], 105).color(trackPaint));
}
for (const x of [X0, X1]) {
  add(`spine-flange-${x < 0 ? "start" : "end"}`, turned([[0, 0], [150, 0], [150, 24], [0, 24]]).rotateY(90).rotateY(-slopeDeg(x)).translate(x - (x < 0 ? 0 : 24), 0, railZ(x) - SPINE_DROP).color(steel));
}

// Triangular cross ties: a plate frame from each rail down to the spine.
const tieOutline = extrudePolygon([[-GAUGE - 45, 30], [GAUGE + 45, 30], [GAUGE + 45, -20], [70, -SPINE_DROP - 10], [-70, -SPINE_DROP - 10], [-GAUGE - 45, -20]], 28)
  .subtract(extrudePolygon([[-GAUGE + 70, -40], [GAUGE - 70, -40], [40, -SPINE_DROP + 120], [-40, -SPINE_DROP + 120]], 40).translate(0, 0, -6));
for (let i = 0; i <= 20; i++) {
  const x = X0 + 150 + ((X1 - X0 - 300) * i) / 20;
  add(`tie-${i}`, tieOutline.rotateX(90).rotateZ(90).rotateY(-slopeDeg(x)).translate(x, 0, railZ(x)).color(trackPaint));
}

// Chain trough with anti-rollback teeth along the climb.
const LIFT0 = -600;
for (let i = 0; i < 6; i++) {
  const a = LIFT0 + i * 600;
  const b = a + 600;
  const pitch = slopeDeg((a + b) / 2);
  const mid = (a + b) / 2;
  const len = Math.hypot(b - a, railZ(b) - railZ(a));
  const trough = box(len, 170, 90, true).subtract(box(len + 10, 130, 90, true).translate(0, 0, 20));
  add(`chain-trough-${i}`, trough.rotateY(-pitch).translate(mid, 0, railZ(mid) + 20).color(steel));
  for (let k = 0; k < 3; k++) {
    const tx = a + 100 + k * 200;
    add(`ratchet-${i}-${k}`, extrudePolygon([[-70, 0], [70, 0], [70, 45]], 120).rotateX(90).translate(0, 60, 0).rotateY(-slopeDeg(tx)).translate(tx, 0, railZ(tx) + 55).color(steel));
  }
}

// Y-headed support columns in spine saddles, on base plates and footings.
for (const x of [-1800, 1400]) {
  const top = railZ(x) - SPINE_DROP - 110;
  add(`footing-${x}`, extrudePolygon(filletPolygon([[-450, -450], [450, -450], [450, 450], [-450, 450]], 60), 320).translate(x, 0, 0).color(concrete));
  add(`base-plate-${x}`, box(560, 560, 30, true).translate(x, 0, 335).color(steel));
  for (const [bx, by] of [[-220, -220], [220, -220], [220, 220], [-220, 220]]) {
    add(`anchor-${x}-${bx}-${by}`, turned([[0, 0], [24, 0], [24, 60], [0, 60]]).translate(x + bx, by, 350).color(steel));
  }
  add(`column-${x}`, turned([[0, 0], [130, 0], [130, top - 600 - 350], [0, top - 600 - 350]]).translate(x, 0, 350).color(supportPaint));
  for (const s of [-1, 1]) {
    add(`column-fork-${x}-${s > 0 ? "l" : "r"}`, rod([x, 0, top - 640], [x, s * 170, top - 40], 70).color(supportPaint));
  }
  add(`saddle-${x}`, extrudePolygon([[-200, -60], [200, -60], [200, 40], [120, 40], [100, 0], [-100, 0], [-120, 40], [-200, 40]], 260)
    .rotateX(90).rotateZ(90).translate(x - 130, 0, top + 20).color(supportPaint));
}

return p.model();
