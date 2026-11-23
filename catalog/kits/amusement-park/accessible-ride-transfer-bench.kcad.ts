// SPDX-License-Identifier: CC0-1.0
// Accessible ride transfer bench: the bench at a ride's load platform where
// a guest slides across from a wheelchair before stepping into the vehicle.
// What makes it a transfer bench rather than a park bench: a long padded
// seat at wheelchair-seat height with a rounded fiberglass nose and no arm
// on the open approach end; a U-shaped grab rail at the far end and a
// horizontal grab bar on standoffs along the back so the guest can pull
// across; round stainless legs on rubber feet; a slatted bag shelf beneath
// for loose articles; and a rubber transfer mat with a contrasting edge
// marking where the wheelchair parks alongside.
// Generic visualization geometry at about real size (about 2.5 m long with
// the mat, 0.6 m deep, 0.95 m to the back bar), millimetres, Z up, seat
// facing -Y, open approach end on -X, standing on z = 0.
meta({
  name: "accessible-ride-transfer-bench",
  license: "CC0-1.0",
  title: "Accessible ride transfer bench",
  description: "Ride load-platform transfer bench at about real size: long padded seat at wheelchair-seat height with a rounded fiberglass nose and an open approach end, U-shaped end grab rail and a back grab bar on standoffs, round stainless legs on rubber feet, a slatted bag shelf for loose articles, and a rubber wheelchair transfer mat with a contrasting edge. Material controls: stainless rails, fiberglass shell, vinyl padding, rubber. Festival, twilight and safety presets.",
  tags: ["transfer bench", "accessible", "wheelchair transfer", "ride platform", "grab rail", "bench", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 2400,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless legs and grab rails" });
const fiberglass = param("fiberglass", "#4d8290", { label: "Painted fiberglass seat shell" });
const padding = param("padding", "#2f3e57", { label: "Vinyl seat padding" });
const rubber = param("rubber", "#292f33", { label: "Rubber feet and transfer mat" });

presets({
  festival: { stainlessSteel: "#d1d1c6", fiberglass: "#d47452", padding: "#f0c35a", rubber: "#3c4245" },
  twilight: { stainlessSteel: "#788b91", fiberglass: "#35576f", padding: "#1f2a3a", rubber: "#20262a" },
  safety: { stainlessSteel: "#c3cbc8", fiberglass: "#f2c230", padding: "#2b2f33", rubber: "#3a3f42" },
});

const p = assembly("accessible-ride-transfer-bench");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);

const L = 1450;
const SEAT_Z = 430;
const RAIL_X = L / 2 + 60;

// Fiberglass seat shell with a rounded nose, and the back shell.
add("seat-shell", longSide([[-260, SEAT_Z], [-290, SEAT_Z + 25], [-285, SEAT_Z + 55], [-260, SEAT_Z + 70], [250, SEAT_Z + 70], [250, SEAT_Z]], L).color(fiberglass));
add("back-shell", longSide([[230, SEAT_Z + 70], [280, SEAT_Z + 70], [320, 900], [270, 900]], L).color(fiberglass));
// Padding: seat cushion with a rounded front roll and a back pad.
add("seat-pad", longSide([[-250, SEAT_Z + 70], [-270, SEAT_Z + 95], [-245, SEAT_Z + 120], [225, SEAT_Z + 120], [225, SEAT_Z + 70]], L - 60).color(padding));
add("back-pad", longSide([[225, SEAT_Z + 130], [265, SEAT_Z + 130], [300, 860], [260, 860]], L - 60).color(padding));
for (let k = 1; k < 3; k++) add(`seat-seam-${k}`, box(10, 470, 8, true).translate(-L / 2 + 30 + (k * (L - 60)) / 3, -10, SEAT_Z + 121).color(fiberglass));

// Round stainless legs on rubber feet, with a frame rail under the shell.
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    const x = sx * (L / 2 - 90);
    const y = sy * 190;
    add(`leg-${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`, cylinder(SEAT_Z - 20, 28, 12).translate(x, y, 20).color(stainlessSteel));
    add(`foot-${sx > 0 ? "r" : "l"}${sy > 0 ? "b" : "f"}`, cylinder(20, 45, 12).translate(x, y, 0).color(rubber));
  }
  add(`frame-side-${sx > 0 ? "r" : "l"}`, cylinder(400, 20, 10).rotateX(-90).translate(sx * (L / 2 - 90), -200, SEAT_Z - 20).color(stainlessSteel));
}

// Slatted bag shelf beneath the seat.
for (const sy of [-1, 1]) add(`shelf-rail-${sy > 0 ? "b" : "f"}`, cylinder(L - 180, 16, 10).rotateY(90).translate(-L / 2 + 90, sy * 190, 150).color(stainlessSteel));
for (let k = 0; k < 6; k++) add(`shelf-slat-${k}`, box(L - 200, 40, 14, true).translate(0, -150 + k * 60, 170).color(stainlessSteel));

// U-shaped grab rail at the far (+X) end, in the YZ plane.
const U_R = 200;
const U_TOP = 780;
const uTop = torus(U_R, 22, 20).rotateY(90).intersect(box(80, 2 * U_R + 60, U_R + 40, true).translate(0, 0, (U_R + 40) / 2));
add("end-rail-loop", uTop.translate(RAIL_X, -40, U_TOP).color(stainlessSteel));
for (const sy of [-1, 1]) {
  add(`end-rail-leg-${sy > 0 ? "b" : "f"}`, cylinder(U_TOP - 20, 22, 12).translate(RAIL_X, -40 + sy * U_R, 20).color(stainlessSteel));
  add(`end-rail-flange-${sy > 0 ? "b" : "f"}`, cylinder(20, 50, 12).translate(RAIL_X, -40 + sy * U_R, 0).color(stainlessSteel));
}

// Horizontal grab bar on standoffs along the back.
add("back-grab-bar", cylinder(L - 100, 20, 12).rotateY(90).translate(-L / 2 + 50, 365, 870).color(stainlessSteel));
for (const sx of [-1, 0, 1]) add(`grab-standoff-${sx + 1}`, cylinder(70, 14, 10).rotateX(-90).translate(sx * (L / 2 - 120), 300, 870).color(stainlessSteel));
for (const sx of [-1, 1]) add(`grab-bar-end-${sx > 0 ? "r" : "l"}`, sphere(26).translate(sx * (L / 2 - 50), 365, 870).color(stainlessSteel));

// Rubber transfer mat on the open approach end, with a contrasting edge.
const MX = -L / 2 - 520;
add("transfer-mat", longSide([[-420, 0], [-400, 12], [400, 12], [420, 0]], 900).translate(MX, -60, 0).color(rubber));
for (const sy of [-1, 1]) add(`mat-edge-${sy > 0 ? "b" : "f"}`, box(900, 40, 6, true).translate(MX, -60 + sy * 360, 15).color(fiberglass));
add("mat-edge-end", box(40, 760, 6, true).translate(MX - 430, -60, 15).color(fiberglass));

return p.model();
