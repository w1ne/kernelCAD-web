// SPDX-License-Identifier: CC0-1.0
// Pirate ship ride car: the galleon-shaped gondola of a family swinging-ship
// ride, shown without its A-frame tower.
// What makes it a swinging ship rather than a boat: a pointed galleon hull
// with a deep banana sheer so bow and stern ride high, seat rows stepping up
// toward each end with riders facing the middle and a lap bar on every row,
// the steel hanger arms rising from midships to the swing hubs, and the
// pirate dressing: painted lower hull, timber upper strakes with gilt wales
// and round shields, a bowsprit, stern lanterns and a short mast with a
// square sail and pennant.
// Generic visualization geometry at about real size for a family ride
// (about 6.6 m long, 2.1 m beam, 5.2 m to the swing hubs), millimetres,
// Z up, bow toward +X, keel on z = 0.
meta({
  name: "pirate-ship-ride-car",
  license: "CC0-1.0",
  title: "Pirate ship ride car",
  description: "Family swinging pirate-ship gondola at about real size: pointed galleon hull with a deep sheer, painted lower hull and timber upper strakes with gilt wales and shields, seat rows stepping up toward bow and stern with lap bars, steel hanger arms to the swing hubs, bowsprit, stern lanterns, and a short mast with square sail and pennant. Material controls: timber, hull paint, gilt trim, steel, sail canvas. Festival, twilight and black-pearl presets.",
  tags: ["pirate ship", "swinging ship", "swing boat", "pendulum ride", "amusement park", "theme park", "ride vehicle", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4400,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const timber = param("timber", "#8a5a36", { label: "Sealed timber strakes and seats" });
const hullPaint = param("hullPaint", "#7d1f1d", { label: "Painted lower hull" });
const gilt = param("gilt", "#d4a63a", { label: "Gilt wales, shields and lanterns" });
const steel = param("steel", "#5c666d", { label: "Painted steel hangers and lap bars" });
const canvas = param("canvas", "#ece0c0", { label: "Sail canvas" });

presets({
  festival: { timber: "#ab8051", hullPaint: "#1f5f8b", gilt: "#f0c64a", steel: "#9da3a0", canvas: "#eddaa9" },
  twilight: { timber: "#604b3b", hullPaint: "#3b2a4f", gilt: "#b89a5a", steel: "#4f626c", canvas: "#a85e4f" },
  blackPearl: { timber: "#3a2c24", hullPaint: "#161616", gilt: "#c9a14a", canvas: "#2b2b2b" },
});

const p = assembly("pirate-ship-ride-car");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
const side = (pts, t: number, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const L = 3300;
const B = 1050;
// Pointed galleon plan: half-beam falls off toward both ends.
const lens = (halfL: number, halfB: number, n = 14) => {
  const top = [];
  for (let i = 0; i <= n; i++) {
    const x = -halfL + (2 * halfL * i) / n;
    top.push([x, halfB * Math.pow(Math.max(0, 1 - Math.pow(x / halfL, 2)), 0.6)]);
  }
  return [...top, ...top.slice(1, -1).reverse().map(([x, y]) => [x, -y])];
};
// Banana sheer: keel and gunwale both rise toward the ends.
const keelZ = (x: number) => 900 * Math.pow(x / L, 2);
const sheerZ = (x: number) => 1450 + 1350 * Math.pow(x / L, 2);
const span = Array.from({ length: 17 }, (_, i) => -L + (2 * L * i) / 16);
const hullSide = [...span.map((x) => [x, keelZ(x)]), ...span.slice().reverse().map((x) => [x, sheerZ(x)])];
const hullSolid = side(hullSide, 2 * B + 100).intersect(plan(lens(L, B), -10, 3200));
const well = plan(lens(L - 260, B - 110), 520, 3000);
const hull = hullSolid.subtract(well);
add("lower-hull", hull.intersect(box(8000, 3000, 900, true).translate(0, 0, 450)).color(hullPaint));
add("upper-strakes", hull.intersect(box(8000, 3000, 3000, true).translate(0, 0, 900 + 1500)).color(timber));

// Gilt wales following the sheer, and a row of round shields between them.
const band = (dz: number, h: number) =>
  side([...span.map((x) => [x, sheerZ(x) - dz - h]), ...span.slice().reverse().map((x) => [x, sheerZ(x) - dz])], 2 * B + 200);
const skin = plan(lens(L + 30, B + 30), -10, 3200).subtract(plan(lens(L - 10, B - 10), -20, 3300));
add("wale-upper", skin.intersect(band(0, 70)).color(gilt));
add("wale-lower", skin.intersect(band(520, 60)).color(gilt));
for (const s of [-1, 1]) {
  for (const x of [-1800, -900, 0, 900, 1800]) {
    const halfB = B * Math.pow(1 - Math.pow(x / L, 2), 0.6);
    const z = sheerZ(x) - 280;
    add(`shield-${s > 0 ? "port" : "starboard"}-${x}`,
      turned([[0, 0], [150, 0], [130, 30], [40, 50], [0, 50]]).rotateX(s > 0 ? -90 : 90).translate(x, s * (halfB + 10), z).color(gilt));
  }
}

// Seat rows stepping up toward bow and stern, riders facing midships.
for (const dir of [-1, 1]) {
  [700, 1450, 2150].forEach((d, i) => {
    const x = dir * d;
    const floor = keelZ(x) + 560 + i * 120;
    const back = dir * 260;
    const seat = side([[x - 230 * dir, floor], [x + back, floor], [x + back, floor + 820], [x + back - 110 * dir, floor + 820],
      [x + back - 110 * dir, floor + 420], [x - 230 * dir, floor + 420]].map(([a, b]) => [a, b]), 2 * B);
    add(`seat-row-${dir > 0 ? "bow" : "stern"}-${i}`, seat.intersect(plan(lens(L - 270, B - 120), 0, 4000)).color(timber));
    const halfB = (B - 140) * Math.pow(1 - Math.pow(x / L, 2), 0.6);
    add(`lap-bar-${dir > 0 ? "bow" : "stern"}-${i}`,
      turned([[0, -halfB], [24, -halfB], [24, halfB], [0, halfB]]).rotateX(90).translate(x - 330 * dir, 0, floor + 640).color(steel));
  });
}
add("midships-deck", plan(lens(560, B - 120), 520, 60).color(timber));

// Hanger arms: a steel A on each side from the hull to the swing hub.
const HUB_Z = 5200;
for (const s of [-1, 1]) {
  const y0 = s * (B + 40);
  const y1 = s * (B + 260);
  for (const x0 of [-900, 900]) {
    const dx = -x0;
    const dy = y1 - y0;
    const dz = HUB_Z - sheerZ(x0);
    const len = Math.hypot(dx, dy, dz);
    const tiltY = (Math.atan2(dx, dz) * 180) / Math.PI;
    const tiltX = (-Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI;
    add(`hanger-${s > 0 ? "port" : "starboard"}-${x0 > 0 ? "fwd" : "aft"}`,
      turned([[0, 0], [60, 0], [60, len], [0, len]]).rotateX(tiltX).rotateY(tiltY).translate(x0, y0, sheerZ(x0) - 300).color(steel));
  }
  add(`hanger-tie-${s > 0 ? "port" : "starboard"}`, turned([[0, -900], [45, -900], [45, 900], [0, 900]]).rotateY(90).translate(0, s * (B + 50), sheerZ(0) - 280).color(steel));
  add(`swing-hub-${s > 0 ? "port" : "starboard"}`, turned([[0, -120], [190, -120], [190, 120], [0, 120]]).rotateX(90).translate(0, y1, HUB_Z).color(steel));
}

// Bowsprit, stern lanterns, short mast with a square sail and pennant.
add("bowsprit", turned([[0, 0], [75, 0], [30, 1300], [0, 1300]]).rotateY(68).translate(L - 250, 0, sheerZ(L) - 160).color(timber));
add("figurehead", sphere(150).scale([1.5, 0.8, 1]).translate(L - 40, 0, sheerZ(L) - 350).color(gilt));
for (const s of [-1, 1]) {
  add(`stern-lantern-${s > 0 ? "port" : "starboard"}`, turned([[0, 0], [80, 0], [110, 140], [70, 260], [20, 320], [0, 340]]).translate(-L + 330, s * 220, sheerZ(-L + 330) - 30).color(gilt));
}
add("mast", turned([[0, 0], [90, 0], [65, 2900], [0, 2900]]).translate(0, 0, 560).color(timber));
add("crows-nest", turned([[0, 0], [260, 0], [300, 240], [0, 240]]).subtract(turned([[0, 40], [230, 40], [260, 260], [0, 260]])).translate(0, 0, 2950).color(timber));
add("yard", turned([[0, -1000], [40, -1000], [40, 1000], [0, 1000]]).rotateX(90).translate(80, 0, 2650).color(timber));
const sailBow = (y: number) => 140 * (1 - Math.pow(y / 950, 2));
const sailPts = [];
for (let i = 0; i <= 8; i++) {
  const y = -950 + (1900 * i) / 8;
  sailPts.push([sailBow(y), y]);
}
for (let i = 8; i >= 0; i--) {
  const y = -950 + (1900 * i) / 8;
  sailPts.push([sailBow(y) - 30, y]);
}
add("sail", extrudePolygon(sailPts, 1050).translate(110, 0, 1580).color(canvas));
add("pennant", extrudePolygon([[0, 0], [520, 70], [0, 160]], 12).rotateX(90).translate(30, 6, 3300).color(hullPaint));

return p.model();
