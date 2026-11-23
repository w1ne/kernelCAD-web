// SPDX-License-Identifier: CC0-1.0
// Family locker bank: the day-rental locker wall by the park entrance where
// families leave bags and coats before the rides.
// What makes it a rental locker bank rather than a cabinet: a steel carcass
// on a recessed toe kick under a curved branded header; three columns of
// coloured doors in three heights (small phone lockers on top, family-size
// doors below), each with louvre vents, a number tag and a keypad lock; and a
// central pay station with a canted touchscreen, card reader and receipt
// slot where guests rent and reopen their locker.
// Generic visualization geometry at about real size (about 2.4 m wide,
// 0.65 m deep, 2.15 m tall), millimetres, Z up, doors facing -Y, standing on
// z = 0.
meta({
  name: "family-locker-bank",
  license: "CC0-1.0",
  title: "Family locker bank",
  description: "Day-rental locker wall at about real size: steel carcass on a recessed toe kick under a curved branded header, two banks of coloured doors in three heights with louvre vents, number tags and keypad locks, and a central pay station with a canted touchscreen, card reader and receipt slot. Material controls: powder-coated carcass, door polymer, stainless hardware, screen glass. Festival, twilight and resort presets.",
  tags: ["locker", "lockers", "rental locker", "storage", "bag storage", "amusement park", "theme park", "guest services", "low poly", "CC0", "park operations and guest comfort"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3200,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#2f4f6b", { label: "Powder-coated carcass and header" });
const polymer = param("polymer", "#3fa3a0", { label: "Moulded polymer doors" });
const stainlessSteel = param("stainlessSteel", "#c3cac8", { label: "Stainless handles, keypads and trim" });
const glass = param("glass", "#16303f", { label: "Pay-station screen glass" });

presets({
  festival: { powderCoat: "#d47452", polymer: "#ffd447", stainlessSteel: "#d1d1c6", glass: "#2c5d7a" },
  twilight: { powderCoat: "#35576f", polymer: "#7d6bb0", stainlessSteel: "#788b91", glass: "#6387aa" },
  resort: { powderCoat: "#e9e4d8", polymer: "#2e78b8", stainlessSteel: "#a9afad", glass: "#1d2a33" },
});

const p = assembly("family-locker-bank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Profile drawn in (y, z) and pushed along X by t, centred on x = 0.
const longSide = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(-t / 2, 0, 0);

const W = 2400;
const D = 640;
const FRONT = -D / 2;
const BASE = 120;
const TOPZ = 1900;
const PAY = 520; // pay-station width at the centre

// Carcass, toe kick and side panels.
add("carcass", box(W, D, TOPZ - BASE, true).translate(0, 0, (TOPZ + BASE) / 2).color(powderCoat));
add("toe-kick", box(W - 80, D - 80, BASE, true).translate(0, 20, BASE / 2).color(glass));

// Curved branded header: bull-nosed profile overhanging the doors.
const header = [[FRONT - 60, TOPZ], [D / 2, TOPZ], [D / 2, TOPZ + 250], [FRONT + 40, TOPZ + 250]];
for (let i = 1; i < 6; i++) {
  const a = (Math.PI / 2) * (i / 6);
  header.push([FRONT + 40 - 100 * Math.sin(a), TOPZ + 150 + 100 * Math.cos(a)]);
}
add("header", longSide(header, W + 40).color(powderCoat));
add("header-stripe", box(W + 44, 12, 50, true).translate(0, FRONT - 55, TOPZ + 60).color(polymer));

// Two banks of doors either side of the pay station, three rows of heights.
const ROWS = [
  { z0: BASE + 20, h: 760 },
  { z0: BASE + 800, h: 560 },
  { z0: BASE + 1380, h: 360 },
];
const bankW = (W - PAY) / 2;
const COLS = 3;
const doorW = bankW / COLS;
for (const side of [-1, 1]) {
  const bx = side * (PAY / 2 + bankW / 2);
  for (const [r, row] of ROWS.entries()) {
    for (let c = 0; c < COLS; c++) {
      const cx = bx - bankW / 2 + doorW * (c + 0.5);
      const cz = row.z0 + row.h / 2;
      const tag = `${side > 0 ? "r" : "l"}-${r}-${c}`;
      add(`door-${tag}`, box(doorW - 24, 20, row.h - 24, true).translate(cx, FRONT - 10, cz).color(polymer));
      // Louvre vents near the top of each door.
      for (let v = 0; v < 3; v++) add(`vent-${tag}-${v}`, box(doorW * 0.5, 10, 12, true).rotateX(30).translate(cx, FRONT - 22, row.z0 + row.h - 70 - v * 30).color(powderCoat));
      // Keypad lock and pull handle on the latch side, number tag below the vents.
      const lx = cx + side * (doorW / 2 - 60);
      add(`keypad-${tag}`, box(60, 14, 90, true).translate(lx, FRONT - 26, cz + 40).color(stainlessSteel));
      add(`handle-${tag}`, cylinder(110, 12, 8).translate(lx, FRONT - 40, cz - 120).color(stainlessSteel));
      add(`number-${tag}`, box(70, 8, 40, true).translate(cx, FRONT - 24, row.z0 + row.h - 190).color(stainlessSteel));
    }
  }
}

// Central pay station: stainless fascia, canted touchscreen, card reader, receipt slot.
add("pay-fascia", box(PAY - 20, 20, TOPZ - BASE - 40, true).translate(0, FRONT - 10, (TOPZ + BASE) / 2).color(stainlessSteel));
const screenHood = [[FRONT - 20, 1150], [FRONT - 160, 1220], [FRONT - 120, 1620], [FRONT - 20, 1640]];
add("screen-hood", longSide(screenHood, PAY - 80).color(powderCoat));
add("screen", box(PAY - 140, 10, 360, true).rotateX(-14).translate(0, FRONT - 148, 1420).color(glass));
add("card-shelf", box(PAY - 100, 160, 30, true).rotateX(-15).translate(0, FRONT - 80, 1050).color(powderCoat));
add("card-reader", box(120, 90, 60, true).rotateX(-15).translate(-90, FRONT - 90, 1080).color(glass));
add("pin-pad", box(150, 100, 26, true).rotateX(-15).translate(90, FRONT - 90, 1072).color(stainlessSteel));
add("receipt-slot", box(180, 30, 30, true).translate(0, FRONT - 25, 900).color(glass));
add("pay-sign", box(PAY - 100, 10, 150, true).translate(0, FRONT - 22, 1760).color(polymer));

return p.model();
