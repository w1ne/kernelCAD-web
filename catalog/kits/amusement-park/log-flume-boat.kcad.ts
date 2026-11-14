// SPDX-License-Identifier: CC0-1.0
// Log flume boat: the hollowed-out "log" riders sit in on a water flume ride.
// What makes it a log flume boat rather than a rowing boat: a round
// fibreglass log hull with bark ridges, knots and a snapped branch stub, a
// rounded bow and a sawn-off stern showing end-grain rings, the top carved
// out into a long open cockpit with a pale heartwood rim, four tandem
// padded bench rows each with a grab bar for the rider behind, and rubber
// rub strips along the waterline where it bumps the trough walls.
// Generic visualization geometry at about real size (about 3.4 m long,
// 1.2 m wide), millimetres, Z up, bow toward +X, keel on z = 0.
meta({
  name: "log-flume-boat",
  license: "CC0-1.0",
  title: "Log flume boat",
  description: "Log flume ride boat at about real size: round bark-finish fibreglass log hull with bark ridges, knots and a branch stub, rounded bow and sawn stern with end-grain rings, long carved cockpit with heartwood rim, four tandem padded bench rows with stainless grab bars, and rubber waterline rub strips. Material controls: bark fiberglass, heartwood, seat pads, stainless grab bars, rubber. Festival, twilight and birch presets.",
  tags: ["log flume", "flume boat", "log ride", "water ride", "amusement park", "theme park", "ride vehicle", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 5000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#6b4a2f", { label: "Bark-finish fiberglass hull" });
const heartwood = param("heartwood", "#d2a86c", { label: "Heartwood rim and end grain" });
const seatPad = param("seatPad", "#2f6f7a", { label: "Seat pads" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless grab bars" });
const rubber = param("rubber", "#292f33", { label: "Rubber rub strips" });

presets({
  festival: { fiberglass: "#7a5232", heartwood: "#e7c07a", seatPad: "#c8452f" },
  twilight: { fiberglass: "#4b3a33", heartwood: "#b08d6a", seatPad: "#3d2f5c", stainlessSteel: "#788b91", rubber: "#20262a" },
  birch: { fiberglass: "#d9d3c4", heartwood: "#efdcb0", seatPad: "#3f6b3a" },
});

const p = assembly("log-flume-boat");
// Lift so the lowest bark ridge (AXIS - R - 22) sits on z = 0.
const LIFT = 52;
const add = (name: string, shape: Shape) => p.part(name, shape.translate(0, 0, LIFT).scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
const side = (pts, t: number, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// A turned profile laid along X (profile z runs stern -> bow).
const alongX = (pts) => turned(pts).rotateY(90);

const R = 590;
const AXIS = 560;
const STERN = -1640;
// Log: blunt sawn stern, long straight barrel, rounded tapering bow.
const logProfile = [
  [0, -1700], [R - 30, -1700], [R, -1500], [R, 900], [R - 40, 1250], [R - 150, 1500], [R - 320, 1660], [0, 1720],
];
const log = alongX(logProfile).translate(0, 0, AXIS)
  .intersect(box(4000, 2000, 2000, true).translate(STERN + 2000, 0, 1040));
const cockpit = plan(rr(2700, 840, 320), 360, 1200).translate(-120, 0, 0);
add("hull", log.subtract(cockpit).color(fiberglass));

// Pale heartwood band along the carved rim.
const rimBand = plan(rr(2780, 920, 360), 760, 600).subtract(plan(rr(2700, 840, 320), 740, 640)).translate(-120, 0, 0);
add("heartwood-rim", rimBand.intersect(alongX(logProfile.map(([r, z]) => [r * 1.01, z])).translate(0, 0, AXIS)).color(heartwood));

// Sawn stern: end-grain disc with growth rings.
add("end-grain", alongX([[0, 0], [R - 20, 0], [R - 20, 12], [0, 12]]).translate(STERN - 12, 0, AXIS).color(heartwood));
for (const r of [140, 280, 420]) {
  add(`growth-ring-${r}`, torus(r, 9, 24).rotateY(90).translate(STERN - 12, 0, AXIS).color(fiberglass));
}

// Bark ridges running along the lower barrel.
for (const a of [-160, -125, -90, -55, -20, 20, 160]) {
  const rad = (a * Math.PI) / 180;
  add(`bark-ridge-${a}`, box(2600, 50, 44, true).rotateX(a + 90).translate(-200, R * Math.cos(rad), AXIS + R * Math.sin(rad)).color(fiberglass));
}
// Knots and a snapped branch stub on the flanks.
for (const [x, s, z] of [[700, 1, 300], [-900, -1, 620], [-300, 1, 640]]) {
  add(`knot-${x}`, sphere(70).scale([1.4, 0.5, 1]).translate(x, s * (R - 20), z).color(heartwood));
}
add("branch-stub", turned([[0, 0], [95, 0], [70, 240], [80, 260], [0, 270]]).rotateX(70).translate(300, -R + 60, 480).color(fiberglass));

// Rubber rub strips along the waterline.
for (const s of [-1, 1]) {
  add(`rub-strip-${s > 0 ? "left" : "right"}`, alongX([[0, -1200], [40, -1200], [40, 1000], [0, 1000]]).translate(-100, s * (R + 10), 380).color(rubber));
}

// Four tandem bench rows: cushion, raked back and a grab bar for the rider behind.
const rows = [760, 200, -360, -920];
rows.forEach((x, i) => {
  add(`seat-${i}`, side(filletPolygon([[x - 230, 380], [x + 120, 380], [x + 120, 580], [x - 140, 580], [x - 190, 980], [x - 280, 980]], 25), 760).color(seatPad));
  if (i < rows.length - 1) {
    add(`grab-bar-${i}`, turned([[0, -330], [20, -330], [20, 330], [0, 330]]).rotateX(90).translate(x - 310, 0, 950).color(stainlessSteel));
    for (const s of [-1, 1]) {
      add(`grab-post-${i}-${s > 0 ? "l" : "r"}`, turned([[0, 0], [16, 0], [16, 190], [0, 190]]).translate(x - 310, s * 320, 760).color(stainlessSteel));
    }
  }
});

return p.model();
