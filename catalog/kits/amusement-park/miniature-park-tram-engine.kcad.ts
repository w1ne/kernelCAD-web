// SPDX-License-Identifier: CC0-1.0
// Miniature park tram engine: the ride-on steam-outline locomotive that hauls
// the park railway's open coaches round the grounds.
// What makes it a park loco rather than a box on wheels: a round boiler with
// brass bands, a dark smokebox with a round door and headlamp, a flared
// chimney, a brass steam dome and whistle, a cow-catcher, red buffer beams
// with sprung buffers, four spoked driving wheels joined by coupling rods, a
// running board along each side, and an open-sided cab with arched window
// cut-outs and a curved roof.
// Generic visualization geometry at about real size (about 2.4 m long over
// the buffers, 0.95 m wide, 1.75 m to the cab roof), millimetres, Z up, track
// along X with the smokebox at -X, standing on its wheel treads at z = 0.
meta({
  name: "miniature-park-tram-engine",
  license: "CC0-1.0",
  title: "Miniature park tram engine",
  description: "Ride-on park railway steam-outline locomotive at about real size: round boiler with brass bands, smokebox with round door and headlamp, flared chimney, brass dome and whistle, cow-catcher, red buffer beams with sprung buffers, four spoked driving wheels with coupling rods, running boards and an open cab with arched windows and a curved roof. Material controls: baked enamel, brass fittings, ironwork, wheel paint. Festival, twilight and heritage presets.",
  tags: ["park railway", "miniature railway", "locomotive", "steam engine", "tram engine", "train ride", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 7000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const enamel = param("enamel", "#2f7d4f", { label: "Baked enamel boiler, cab and tanks" });
const brass = param("brass", "#d2a443", { label: "Brass dome, bands, whistle and lamp" });
const ironwork = param("ironwork", "#2b2f33", { label: "Smokebox, frame, chimney and roof" });
const wheelPaint = param("wheelPaint", "#c0392b", { label: "Wheel centres and buffer beams" });

presets({
  festival: { enamel: "#2f6fb8", brass: "#e3b54e", ironwork: "#30353a", wheelPaint: "#e0a033" },
  twilight: { enamel: "#4a3f78", brass: "#b89140", ironwork: "#202428", wheelPaint: "#8a3a52" },
  heritage: { enamel: "#7a2a22", brass: "#c99a3a", ironwork: "#26292c", wheelPaint: "#1f1f1f" },
});

const p = assembly("miniature-park-tram-engine");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
// Outline drawn in (y, z) and extruded t along +X from x0.
const profileYZ = (pts, t: number, x0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90).translate(x0 + t / 2, 0, 0);

const HALF_W = 380;
const WR = 230;
const AX = [-380, 380];
const DECK = 520;

// Frame, buffer beams with buffers and coupling hooks, running boards.
add("frame", box(1900, 2 * HALF_W - 120, 160, true).translate(0, 0, 380).color(ironwork));
add("running-board-f", box(1900, 120, 30, true).translate(0, -HALF_W - 10, DECK - 25).color(ironwork));
add("running-board-b", box(1900, 120, 30, true).translate(0, HALF_W + 10, DECK - 25).color(ironwork));
for (const [s, x] of [["front", -1000], ["rear", 1000]] as const) {
  add(`buffer-beam-${s}`, box(80, 2 * HALF_W + 100, 200, true).translate(x, 0, 400).color(wheelPaint));
  const dir = x < 0 ? -1 : 1;
  for (const y of [-300, 300]) {
    add(`buffer-${s}-${y < 0 ? "f" : "b"}`, cylinder(110, 32, 12).rotateY(90).translate(dir < 0 ? x - 150 : x + 40, y, 400).color(ironwork));
    add(`buffer-head-${s}-${y < 0 ? "f" : "b"}`, cylinder(20, 70, 16).rotateY(90).translate(dir < 0 ? x - 170 : x + 150, y, 400).color(ironwork));
  }
  add(`coupling-${s}`, box(90, 50, 40, true).translate(x + dir * 85, 0, 360).color(brass));
}

// Cow-catcher under the front buffer beam: a V-plough of raked slats.
for (let k = 0; k < 4; k++) {
  const z = 60 + k * 60;
  const reach = 170 - k * 25;
  add(`catcher-slat-${k}`, extrudePolygon([[-1040, -HALF_W + 20], [-1040 - reach, 0], [-1040, HALF_W - 20], [-1060, HALF_W - 20], [-1060 - reach + 20, 0], [-1060, -HALF_W + 20]], 34).translate(0, 0, z).color(ironwork));
}
add("catcher-spine", box(40, 40, 260, true).translate(-1190, 0, 190).color(wheelPaint));

// Four spoked driving wheels joined by coupling rods.
for (const y of [-HALF_W + 30, HALF_W - 30]) {
  const s = y < 0 ? "f" : "b";
  const out = y < 0 ? -1 : 1;
  for (const [i, x] of AX.entries()) {
    add(`wheel-tread-${s}-${i}`, torus(WR - 22, 22, 24).rotateX(90).translate(x, y, WR).color(ironwork));
    add(`wheel-centre-${s}-${i}`, cylinder(30, WR - 40, 20).rotateX(90).translate(x, y + 15, WR).subtract(
      cylinder(40, WR - 70, 20).rotateX(90).translate(x, y + 20, WR)).color(wheelPaint));
    add(`wheel-hub-${s}-${i}`, cylinder(70, 55, 14).rotateX(90).translate(x, y + (out > 0 ? 70 : 0), WR).color(wheelPaint));
    for (let k = 0; k < 5; k++) add(`spoke-${s}-${i}-${k}`, box(2 * (WR - 60), 30, 22, true).rotateY(k * 36).translate(x, y, WR).color(wheelPaint));
    add(`crank-${s}-${i}`, cylinder(30, 26, 10).rotateX(90).translate(x + 110, y + out * 50 + 15, WR).color(brass));
  }
  add(`coupling-rod-${s}`, box(AX[1] - AX[0] + 80, 22, 50, true).translate(110, y + out * 60, WR).color(ironwork));
}

// Boiler barrel with brass bands, smokebox and door, headlamp.
const BR = 290;
const BZ = DECK + BR - 10;
const BX0 = -880;
const BX1 = 400;
add("boiler", cylinder(BX1 - BX0 - 260, BR, 28).rotateY(90).translate(BX0 + 260, 0, BZ).color(enamel));
add("smokebox", cylinder(260, BR + 15, 28).rotateY(90).translate(BX0, 0, BZ).color(ironwork));
add("smokebox-saddle", box(260, 2 * BR - 40, BZ - DECK, true).translate(BX0 + 130, 0, DECK + (BZ - DECK) / 2).color(ironwork));
add("smokebox-door", turned([[0, 0], [BR - 20, 0], [BR - 60, 35], [0, 55]]).rotateY(-90).translate(BX0, 0, BZ).color(ironwork));
add("door-hinge-dart", cylinder(40, 20, 10).rotateY(-90).translate(BX0 - 50, 0, BZ).color(brass));
for (const [k, x] of [BX0 + 270, -260, 120, BX1 - 20].entries())
  add(`boiler-band-${k}`, cylinder(30, BR + 8, 28).rotateY(90).translate(x, 0, BZ).color(brass));
add("headlamp", cylinder(110, 70, 14).rotateY(-90).translate(BX0 - 10, 0, BZ + BR + 40).color(brass));
add("headlamp-lens", cylinder(10, 55, 14).rotateY(-90).translate(BX0 - 120, 0, BZ + BR + 40).color(wheelPaint));

// Flared chimney, brass dome, safety valve and whistle along the top.
add("chimney", turned([[0, 0], [95, 0], [70, 60], [70, 280], [115, 350], [115, 380], [0, 380]]).translate(BX0 + 130, 0, BZ + BR - 40).color(ironwork));
add("chimney-cap", torus(108, 12, 16).translate(BX0 + 130, 0, BZ + BR + 335).color(brass));
add("steam-dome", turned([[0, 0], [130, 0], [115, 70], [80, 140], [0, 165]]).translate(-260, 0, BZ + BR - 30).color(brass));
add("safety-valve", cylinder(110, 34, 12).translate(140, 0, BZ + BR - 20).color(brass));
add("whistle", turned([[0, 0], [16, 0], [16, 60], [28, 70], [28, 150], [0, 160]]).translate(260, 0, BZ + BR - 20).color(brass));

// Side tanks flanking the boiler, with a brass number plate.
for (const y of [-1, 1]) {
  const s = y < 0 ? "f" : "b";
  add(`side-tank-${s}`, extrudeRoundedRect(840, 300, 50, 170, { axis: "y" }).translate(-200, y < 0 ? -HALF_W + 20 : HALF_W - 190, DECK + 150).color(enamel));
  add(`tank-plate-${s}`, extrudeRoundedRect(300, 110, 40, 10, { axis: "y" }).translate(-200, y < 0 ? -HALF_W + 10 : HALF_W - 20, DECK + 170).color(brass));
}

// Open cab: arched windows in front sheet and sides, curved roof, footplate.
const CX0 = 380;
const CX1 = 960;
const CZ1 = 1480;
add("cab-floor", box(CX1 - CX0, 2 * HALF_W + 60, 40, true).translate((CX0 + CX1) / 2, 0, DECK + 20).color(ironwork));
const arch = (cx: number, cz: number, w: number, h: number) => {
  const pts = [[cx - w / 2, cz - h / 2], [cx + w / 2, cz - h / 2]];
  for (let k = 0; k <= 6; k++) {
    const a = (k * Math.PI) / 6;
    pts.push([cx + (w / 2) * Math.cos(a), cz + h / 2 - w / 2 + (w / 2) * Math.sin(a)]);
  }
  return pts;
};
const spec = [[-HALF_W - 30, DECK], [HALF_W + 30, DECK], [HALF_W + 30, CZ1], [-HALF_W - 30, CZ1]];
add("cab-front", profileYZ(spec, 40, CX0).subtract(
  profileYZ(arch(-190, 1180, 200, 260), 80, CX0 - 20)).subtract(
  profileYZ(arch(190, 1180, 200, 260), 80, CX0 - 20)).subtract(
  cylinder(200, BR + 4, 28).rotateY(90).translate(CX0 - 60, 0, BZ)).color(enamel));
for (const y of [-1, 1]) {
  const s = y < 0 ? "f" : "b";
  const y0 = y < 0 ? -HALF_W - 30 : HALF_W - 10;
  const side = face([[CX0, DECK], [CX1, DECK], [CX1, CZ1], [CX0, CZ1]], 40, y0)
    .subtract(face([[CX0 + 220, DECK - 10], [CX1 + 10, DECK - 10], [CX1 + 10, 1040], [CX0 + 220, 1040]], 80, y0 - 20))
    .subtract(face(arch(CX0 + 330, 1240, 260, 300), 80, y0 - 20));
  add(`cab-side-${s}`, side.color(enamel));
  add(`cab-handrail-${s}`, cylinder(420, 12, 8).translate(CX0 + 205, y < 0 ? -HALF_W - 45 : HALF_W + 45, DECK + 80).color(brass));
}
add("cab-back", profileYZ([[-HALF_W - 30, DECK], [HALF_W + 30, DECK], [HALF_W + 30, 900], [-HALF_W - 30, 900]], 40, CX1 - 40).color(enamel));
const roof = [];
for (let k = 0; k <= 8; k++) {
  const a = Math.PI - (k * Math.PI) / 8;
  roof.push([(HALF_W + 90) * Math.cos(a), CZ1 + 110 * Math.sin(a)]);
}
for (let k = 8; k >= 0; k--) {
  const a = Math.PI - (k * Math.PI) / 8;
  roof.push([(HALF_W + 60) * Math.cos(a), CZ1 + 25 + 90 * Math.sin(a)]);
}
add("cab-roof", profileYZ(roof, CX1 - CX0 + 160, CX0 - 80).color(ironwork));
add("coal-bunker", box(200, 2 * HALF_W - 60, 260, true).translate(CX1 - 150, 0, DECK + 170).color(ironwork));
add("regulator", cylinder(160, 18, 8).rotateY(90).translate(CX0 + 40, 0, BZ + 120).color(brass));

return p.model();
