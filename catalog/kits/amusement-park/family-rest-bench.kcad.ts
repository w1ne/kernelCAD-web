// SPDX-License-Identifier: CC0-1.0
// Family rest bench: the long slatted plaza bench where families sit down
// between rides.
// What makes it a park bench rather than a plank on legs: three cast steel
// side frames with a raked rear leg, a contoured seat rail and a reclined
// back rail; timber slats laid along that contour so the seat dips and the
// back leans; scrolled armrests at both ends and a centre arm that splits the
// bench into two family-sized seats; a low stretcher that leaves the space
// under the seat clear for a stroller's front wheels; rubber feet and a small
// dedication plaque on the top back slat.
// Generic visualization geometry at about real size (about 2.2 m long,
// 0.7 m deep, 0.95 m to the back), millimetres, Z up, seat facing -Y,
// standing on z = 0.
meta({
  name: "family-rest-bench",
  license: "CC0-1.0",
  title: "Family rest bench",
  description: "Two-seat plaza bench at about real size: three cast steel side frames with raked rear legs, contoured seat rails and reclined back rails, timber slats following the seat dip and back lean, scrolled end armrests and a centre arm divider, low stretchers that leave stroller clearance, rubber feet and a dedication plaque. Material controls: sealed timber, painted steel frames, rubber feet, brass plaque. Festival, twilight and oak-and-iron presets.",
  tags: ["bench", "park bench", "plaza bench", "seating", "street furniture", "amusement park", "theme park", "guest comfort", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 900,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#a4714a", { label: "Sealed timber slats and arm caps" });
const steel = param("steel", "#2f4a44", { label: "Painted steel frames" });
const rubber = param("rubber", "#292f33", { label: "Rubber feet" });
const brass = param("brass", "#c9a54a", { label: "Brass dedication plaque" });

presets({
  festival: { timber: "#ab8051", steel: "#c0453a", rubber: "#3c4245", brass: "#f0cf6a" },
  twilight: { timber: "#604b3b", steel: "#4f626c", rubber: "#20262a", brass: "#9a8a62" },
  oakAndIron: { timber: "#c79a63", steel: "#1f1f22", brass: "#b8893a" },
});

const p = assembly("family-rest-bench");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);
// A straight bar of width w between two (y, z) points.
const bar = (a: [number, number], b: [number, number], w: number) => {
  const dy = b[0] - a[0];
  const dz = b[1] - a[1];
  const l = Math.hypot(dy, dz);
  const ny = (-dz / l) * (w / 2);
  const nz = (dy / l) * (w / 2);
  return [[a[0] + ny, a[1] + nz], [b[0] + ny, b[1] + nz], [b[0] - ny, b[1] - nz], [a[0] - ny, a[1] - nz]];
};

const L = 2200;
const FRAMES = [-1050, 0, 1050];
// Seat contour: front roll, dip, rising slightly to the back rail.
const SEAT = [[-300, 455], [-230, 470], [-80, 445], [80, 432], [190, 440]];
const BACK0: [number, number] = [190, 450];
const BACK1: [number, number] = [330, 930];

FRAMES.forEach((x, i) => {
  const at = (s: Shape) => s.translate(x, 0, 0);
  const T = 50;
  add(`front-leg-${i}`, at(longSide(bar([-255, 0], [-255, 450], 60), T)).color(steel));
  add(`rear-leg-${i}`, at(longSide(bar([265, 10], [175, 440], 60), T)).color(steel));
  const rail = [...SEAT.map(([y, z]) => [y, z - 20]), ...SEAT.slice().reverse().map(([y, z]) => [y, z - 75])];
  add(`seat-rail-${i}`, at(longSide(rail, T)).color(steel));
  add(`back-rail-${i}`, at(longSide(bar(BACK0, BACK1, 60), T)).color(steel));
  add(`stretcher-${i}`, at(longSide(bar([-255, 130], [240, 130], 36), T)).color(steel));
  for (const y of [-255, 255]) add(`foot-${i}-${y > 0 ? "rear" : "front"}`, at(box(T + 20, 110, 20, true).translate(0, y, 10)).color(rubber));

  // Scrolled armrest: post, arm and a rolled timber cap at the front.
  add(`arm-post-${i}`, at(longSide(bar([-250, 440], [-230, 660], 50), T)).color(steel));
  add(`arm-${i}`, at(longSide(bar([-290, 660], [240, 700], 50), T)).color(steel));
  add(`arm-cap-${i}`, at(longSide(bar([-280, 700], [200, 730], 30), T + 30)).color(timber));
  add(`arm-scroll-${i}`, at(cylinder(T + 10, 46, 12).rotateY(90).translate(-(T + 10) / 2, -300, 655)).color(steel));
});

// Seat slats following the contour.
for (let k = 0; k < SEAT.length; k++) {
  const [y, z] = SEAT[k];
  const prev = SEAT[Math.max(0, k - 1)];
  const next = SEAT[Math.min(SEAT.length - 1, k + 1)];
  const tilt = (Math.atan2(next[1] - prev[1], next[0] - prev[0]) * 180) / Math.PI;
  add(`seat-slat-${k}`, box(L, 95, 34, true).rotateX(tilt).translate(0, y, z + 17).color(timber));
}

// Back slats along the reclined back rail, set just in front of it.
const lean = (Math.atan2(BACK1[0] - BACK0[0], BACK1[1] - BACK0[1]) * 180) / Math.PI;
for (let k = 0; k < 4; k++) {
  const t = 0.22 + k * 0.24;
  const y = BACK0[0] + (BACK1[0] - BACK0[0]) * t - 45;
  const z = BACK0[1] + (BACK1[1] - BACK0[1]) * t;
  add(`back-slat-${k}`, box(L, 32, 82, true).rotateX(-lean).translate(0, y, z).color(timber));
}
const tTop = 0.22 + 3 * 0.24;
add("plaque", box(180, 6, 55, true).rotateX(-lean).translate(-520, BACK0[0] + (BACK1[0] - BACK0[0]) * tTop - 64, BACK0[1] + (BACK1[1] - BACK0[1]) * tTop).color(brass));

return p.model();
