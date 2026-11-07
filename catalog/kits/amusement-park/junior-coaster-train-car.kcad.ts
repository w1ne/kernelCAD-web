// Junior coaster train car: a two-row family roller coaster car sitting on a
// short section of tubular steel track.
// What makes it a coaster car rather than a cart: the lofted fibreglass tub
// with a raised nose cowl, two padded seat rows each with a T-shaped lap bar,
// and the wheel assemblies at each corner that clamp the running rail between a
// road wheel on top, an upstop wheel underneath and a guide wheel on the side,
// all riding on twin tubular rails tied to a central spine.
// Generic visualization geometry at real size (car about 2.1 m long, 1.0 m
// wide), millimetres, Z up, track feet on z = 0, travel towards +X.
meta({
  name: "junior-coaster-train-car",
  license: "CC0-1.0",
  title: "Junior coaster train car",
  description: "Two-row family roller coaster car on a short tubular track section: lofted fibreglass tub with raised nose cowl and headlights, padded seats and T-shaped lap bars, corner wheel assemblies with road, upstop and guide wheels clamping twin tubular rails tied to a central spine. Material controls: body fiberglass, chassis steel, polyurethane wheels, seat vinyl, track paint. Car lead or trailing; festival and twilight presets.",
  tags: ["roller coaster", "coaster car", "coaster train", "family coaster", "kiddie coaster", "amusement park", "theme park", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const car = param("car", "lead", { choices: ["lead", "trailing"], label: "Car position in train" });
const fiberglass = param("fiberglass", "#2f8fd0", { label: "Body tub fiberglass" });
const steel = param("steel", "#8a959b", { label: "Chassis, lap bar and coupler steel" });
const rubber = param("rubber", "#292f33", { label: "Polyurethane wheels" });
const seatVinyl = param("seatVinyl", "#1f2a36", { label: "Seat and lap bar pad vinyl" });
const trackPaint = param("trackPaint", "#e2a02b", { label: "Track rail and spine paint" });

presets({
  festival: { fiberglass: "#d7a83f", steel: "#9da3a0", rubber: "#3c4245", seatVinyl: "#7a2a2a", trackPaint: "#d4554a" },
  twilight: { fiberglass: "#96566d", steel: "#4f626c", rubber: "#20262a", seatVinyl: "#1d2430", trackPaint: "#35576f" },
});

const p = assembly("junior-coaster-train-car");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Wheel of radius r and width w with its axle along Y, centred at (x, y, z).
const wheelY = (x, y, z, r, w) => rod([x, y - w / 2, z], [x, y + w / 2, z], r, 10);
// Solid from an (x, z) side profile, extruded `t` thick and centred on y = 0.
const sideProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Body station: symmetric rounded-U section from (half width, bottom, top), lofted along X.
const section = (hw, zb, zt) => {
  const half = [[hw * 0.75, zb], [hw, zb + 90], [hw, zt - 50], [hw * 0.88, zt]];
  const ring = [...half, ...half.slice().reverse().map(([y, z]) => [-y, z])];
  let outline = path().moveTo(-ring[0][1], ring[0][0]);
  for (const [y, z] of ring.slice(1)) outline = outline.lineTo(-z, y);
  return outline.close();
};
const loftX = (stations) => {
  const profiles = stations.map(([, hw, zb, zt]) => section(hw, zb, zt));
  return profiles[0].loft(profiles.slice(1), {
    planes: stations.map(([x]) => ({ plane: "XY", origin: [0, 0, x] })),
    ruled: true,
  }).rotateY(90);
};

const lead = car.value === "lead";
const RAIL_Z = 300;
const RAIL_Y = 400;

// Track section: twin tubular running rails tied to a box spine, on two feet.
for (const y of [-RAIL_Y, RAIL_Y]) add(`rail-${y < 0 ? "left" : "right"}`, rod([-1300, y, RAIL_Z], [1300, y, RAIL_Z], 28, 10).color(trackPaint));
add("track-spine", rod([-1300, 0, 140], [1300, 0, 140], 85, 10).color(trackPaint));
for (const x of [-1000, -350, 350, 1000]) {
  for (const y of [-RAIL_Y, RAIL_Y]) add(`track-tie-${x}-${y < 0 ? "l" : "r"}`, rod([x, 0, 160], [x, y, RAIL_Z - 20], 22, 6).color(trackPaint));
}
for (const x of [-900, 900]) add(`track-foot-${x < 0 ? "rear" : "front"}`, box(260, 520, 50, true).translate(x, 0, 25).color(steel));

// Chassis frame and corner wheel assemblies clamping each rail.
add("chassis", box(1900, 640, 90, true).translate(0, 0, 500).color(steel));
for (const x of [-700, 700]) {
  for (const y of [-RAIL_Y, RAIL_Y]) {
    const k = `${x < 0 ? "rear" : "front"}-${y < 0 ? "left" : "right"}`;
    const out = Math.sign(y);
    add(`bogie-${k}`, box(260, 40, 300, true).translate(x, y - out * 70, 360).color(steel));
    add(`guide-arm-${k}`, box(110, 120, 30, true).translate(x, y + out * 10, RAIL_Z - 80).color(steel));
    add(`road-wheel-${k}`, wheelY(x, y, RAIL_Z + 28 + 75, 75, 60).color(rubber));
    add(`upstop-wheel-${k}`, wheelY(x, y, RAIL_Z - 28 - 45, 45, 50).color(rubber));
    add(`guide-wheel-${k}`, rod([x, y + out * (28 + 22), RAIL_Z - 30], [x, y + out * (28 + 22), RAIL_Z + 30], 45, 10).color(rubber));
  }
}

// Lofted fibreglass tub: low cockpit between a raised tail and a nose cowl.
const nose = lead
  ? [[620, 500, 545, 760], [880, 470, 560, 960], [1040, 330, 580, 900], [1110, 160, 610, 760]]
  : [[620, 500, 545, 760], [860, 470, 560, 840], [950, 400, 580, 780]];
add("body-tub", loftX([
  [-1020, 430, 560, 900], [-900, 500, 545, 940], [-760, 500, 545, 760], ...nose,
]).color(fiberglass));
for (const y of [-1, 1]) {
  add(`side-wall-${y < 0 ? "left" : "right"}`, box(1380, 40, 160, true).translate(-70, y * 470, 830).color(fiberglass));
}
if (lead) {
  for (const y of [-200, 200]) add(`headlight-${y < 0 ? "left" : "right"}`, rod([1050, y, 820], [1090, y, 820], 60, 10).color(steel));
} else {
  add("coupler-bar", rod([900, 0, 520], [1250, 0, 520], 40, 8).color(steel));
  add("coupler-eye", box(120, 120, 80, true).translate(1250, 0, 520).color(steel));
}

// Two seat rows: cushion, back with headrest, and a T-shaped lap bar.
for (const [k, x] of [["rear", -560], ["front", 160]]) {
  add(`seat-${k}`, box(380, 820, 90, true).translate(x, 0, 790).color(seatVinyl));
  add(`seat-back-${k}`, sideProfile([[-220, 740], [-140, 740], [-120, 1120], [-200, 1180], [-260, 1150]], 820).translate(x, 0, 0).color(seatVinyl));
  add(`lap-bar-post-${k}`, rod([x + 330, 0, 760], [x + 260, 0, 960], 26, 6).color(steel));
  add(`lap-bar-${k}`, rod([x + 250, -330, 960], [x + 250, 330, 960], 30, 8).color(steel));
  add(`lap-bar-pad-${k}`, rod([x + 250, -250, 960], [x + 250, 250, 960], 48, 8).color(seatVinyl));
}

return p.model();
