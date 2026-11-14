// SPDX-License-Identifier: CC0-1.0
// Stroller parking rack: the corral beside a ride queue where families leave
// pushchairs while they ride.
// What makes it a stroller corral rather than a bike rack: wide bays sized
// for a pushchair, separated by tall inverted-U tube hoops a pushchair
// handle can be locked to; a rubber wheel stop and floor mat in every bay;
// a tinted acrylic screen along the back that keeps the bays out of the
// queue, topped by a header with a bay marker for each slot; and an open
// front so strollers roll straight in.
// Generic visualization geometry at about real size (five bays, about 3.6 m
// long, 1 m deep, 1.55 m to the header), millimetres, Z up, bays open
// toward -Y, standing on z = 0.
meta({
  name: "stroller-parking-rack",
  license: "CC0-1.0",
  title: "Stroller parking rack",
  description: "Five-bay queue-side stroller corral at about real size: inverted-U tube hoop dividers on stainless base plates, rubber wheel stops and floor mats in every bay, tinted acrylic back screen in a powder-coated frame, header rail with a dotted bay marker per slot, and steel channel base rails with an open front for roll-in parking. Material controls: powder-coated tube, stainless fittings, tinted acrylic, rubber. Festival, twilight and park-green presets.",
  tags: ["stroller parking", "pushchair park", "buggy park", "stroller corral", "rack", "amusement park", "theme park", "queue", "guest experience", "low poly", "CC0", "entry and guest services"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 5000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#2c4f6b", { label: "Powder-coated tube and frame" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless base plates and caps" });
const acrylic = param("acrylic", "#9fd0d8", { label: "Tinted acrylic screen" });
const rubber = param("rubber", "#2b3033", { label: "Rubber wheel stops and mats" });

presets({
  festival: { powderCoat: "#d47452", stainlessSteel: "#d1d1c6", acrylic: "#79c8d2" },
  twilight: { powderCoat: "#35576f", stainlessSteel: "#788b91", acrylic: "#41768b", rubber: "#1d2124" },
  parkGreen: { powderCoat: "#2f6b3f", acrylic: "#b9d98a", rubber: "#3a3328" },
});

const p = assembly("stroller-parking-rack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const BAYS = 5;
const PITCH = 700;
const L = BAYS * PITCH;
const D = 900;
const HOOP_R = 340;
const POST_H = 640;
const TUBE = 24;
const BACK_Y = D / 2;

// Base channel rails front and back.
add("base-rail-front", box(L + 60, 60, 40, true).translate(0, -D / 2, 20).color(stainlessSteel));
add("base-rail-back", box(L + 60, 80, 40, true).translate(0, BACK_Y, 20).color(stainlessSteel));

// Inverted-U hoops between the bays, in the YZ plane, on base plates.
const hoopTop = torus(HOOP_R, TUBE, 24).rotateY(90).intersect(box(4 * TUBE, 2 * (HOOP_R + TUBE) + 10, HOOP_R + TUBE + 10, true).translate(0, 0, (HOOP_R + TUBE + 10) / 2));
for (let i = 0; i <= BAYS; i++) {
  const x = -L / 2 + i * PITCH;
  add(`hoop-top-${i}`, hoopTop.translate(x, -60, POST_H).color(powderCoat));
  for (const sy of [-1, 1]) {
    const y = -60 + sy * HOOP_R;
    add(`hoop-post-${i}-${sy > 0 ? "b" : "f"}`, cylinder(POST_H, TUBE, 12).translate(x, y, 0).color(powderCoat));
    add(`base-plate-${i}-${sy > 0 ? "b" : "f"}`, cylinder(12, 70, 12).translate(x, y, 0).color(stainlessSteel));
  }
  add(`lock-bar-${i}`, cylinder(2 * HOOP_R, 14, 10).rotateX(90).translate(x, -60 + HOOP_R, 420).color(stainlessSteel));
}

// Rubber wheel stop and floor mat in each bay.
for (let b = 0; b < BAYS; b++) {
  const x = -L / 2 + (b + 0.5) * PITCH;
  add(`floor-mat-${b}`, box(PITCH - 120, D - 160, 10, true).translate(x, -20, 5).color(rubber));
  add(`wheel-stop-${b}`, extrudePolygon([[-60, 0], [60, 0], [30, 70], [-30, 70]], PITCH - 220).rotateX(90).rotateZ(90).translate(x - (PITCH - 220) / 2, 260, 10).color(rubber));
}

// Acrylic back screen in a frame, with a header carrying bay markers.
const SCREEN_Z0 = 160;
const SCREEN_Z1 = 1300;
add("screen", box(L, 14, SCREEN_Z1 - SCREEN_Z0, true).translate(0, BACK_Y + 30, (SCREEN_Z0 + SCREEN_Z1) / 2).color(acrylic));
add("screen-bottom-rail", cylinder(L, 30, 10).rotateY(90).translate(-L / 2, BACK_Y + 30, SCREEN_Z0).color(powderCoat));
for (const sx of [-1, 0, 1]) {
  add(`screen-post-${sx + 1}`, cylinder(1550, 38, 12).translate(sx * L / 2, BACK_Y + 30, 0).color(powderCoat));
  add(`screen-post-cap-${sx + 1}`, sphere(44).translate(sx * L / 2, BACK_Y + 30, 1550).color(stainlessSteel));
}
add("header", box(L, 70, 220, true).translate(0, BACK_Y + 30, 1410).color(powderCoat));
for (let b = 0; b < BAYS; b++) {
  const x = -L / 2 + (b + 0.5) * PITCH;
  add(`bay-marker-${b}`, cylinder(12, 90, 20).rotateX(90).translate(x, BACK_Y - 5, 1410).color(stainlessSteel));
  for (let d = 0; d <= b; d++) {
    const a = (2 * Math.PI * d) / (b + 1) + Math.PI / 2;
    const r = b === 0 ? 0 : 45;
    add(`bay-marker-dot-${b}-${d}`, cylinder(10, 16, 8).rotateX(90).translate(x + r * Math.cos(a), BACK_Y - 14, 1410 + r * Math.sin(a)).color(powderCoat));
  }
}

return p.model();
