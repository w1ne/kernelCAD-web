// SPDX-License-Identifier: CC0-1.0
// Ride photo preview kiosk: the station at a ride exit where guests find the
// on-ride photo of their car and buy a print.
// What makes it a photo preview kiosk rather than a ticket machine: a wide
// landscape display tilted back for reading on the move, showing a row of
// ride photo thumbnails (a coaster hill in each) under a curved sun hood
// with side cheeks; a sloped purchase ledge with a card reader and receipt
// slot; a rounded pedestal on a stainless base plate; and a "photos" sign
// with a camera emblem on top.
// Generic visualization geometry at about real size (about 1.25 m wide,
// 2.4 m tall), millimetres, Z up, display facing -Y, standing on z = 0.
meta({
  name: "ride-photo-preview-kiosk",
  license: "CC0-1.0",
  title: "Ride photo preview kiosk",
  description: "Ride-exit photo preview kiosk at about real size: wide display tilted back under a curved sun hood with side cheeks, a row of on-ride photo thumbnails, a sloped purchase ledge with card reader and receipt slot, a rounded pedestal on a stainless base plate, and a photos sign with a camera emblem. Material controls: powder-coated steel, stainless steel, display glass, sign panel. Festival, twilight and safety presets.",
  tags: ["photo kiosk", "on-ride photo", "display", "point of sale", "ride exit", "amusement park", "theme park", "guest experience", "low poly", "CC0", "attractions and queues"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#2f6f80", { label: "Powder-coated pedestal and hood" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless base, ledge and trim" });
const glass = param("glass", "#1d2b38", { label: "Display glass" });
const signPanel = param("signPanel", "#f2b84b", { label: "Sign panel and photo thumbnails" });

presets({
  festival: { powderCoat: "#d47452", stainlessSteel: "#d1d1c6", glass: "#22303d", signPanel: "#ffd86b" },
  twilight: { powderCoat: "#35576f", stainlessSteel: "#788b91", glass: "#141c26", signPanel: "#8fc7e0" },
  safety: { powderCoat: "#59636a", stainlessSteel: "#c3cbc8", glass: "#1a1f24", signPanel: "#ffd400" },
});

const p = assembly("ride-photo-preview-kiosk");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Profile drawn in (y, z) and pushed along X by t, centred on x0.
const longSide = (pts, t: number, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);

// Base plate, rounded pedestal and the sloped purchase ledge.
add("base-plate", plan(rr(700, 560, 120), 0, 30).color(stainlessSteel));
add("pedestal", plan(rr(460, 320, 110), 30, 1150).color(powderCoat));
add("pedestal-band", plan(rr(480, 340, 115), 160, 40).color(stainlessSteel));
add("purchase-ledge", longSide([[-150, 1000], [-430, 1040], [-430, 1080], [-150, 1070]], 1000).color(stainlessSteel));
add("ledge-bracket", longSide([[-150, 880], [-150, 1000], [-380, 1036]], 60).color(powderCoat));
add("card-reader", box(150, 110, 70, true).rotateX(-8).translate(320, -300, 1085).color(glass));
add("card-reader-slot", box(110, 20, 8, true).rotateX(-8).translate(320, -300, 1122).color(signPanel));
add("receipt-slot", box(200, 12, 40, true).translate(0, -166, 940).color(glass));
add("receipt-lip", box(240, 30, 10, true).translate(0, -180, 915).color(stainlessSteel));

// Display housing tilted back 8 deg, built round its own centre.
const disp = (s: Shape) => s.rotateX(-8).translate(0, 10, 1560);
add("display-housing", disp(box(1120, 150, 780, true)).color(powderCoat));
add("display-glass", disp(box(1020, 20, 660, true).translate(0, -80, 0)).color(glass));
for (let k = 0; k < 3; k++) {
  const x = (k - 1) * 320;
  add(`thumbnail-${k}`, disp(box(280, 6, 200, true).translate(x, -92, 120)).color(signPanel));
  // Coaster hill and lift in each thumbnail, offset so they read as different photos.
  const o = (k - 1) * 30;
  add(`thumbnail-hill-${k}`, disp(face([[-120, -90], [-60 + o, 70], [0 + o, -20], [50 + o, 30], [120, -90]], 6, -100).translate(x, 0, 120)).color(powderCoat));
}
add("hero-photo", disp(box(600, 6, 240, true).translate(-170, -92, -160)).color(stainlessSteel));
add("hero-photo-car", disp(face([[-120, -60], [-130, 10], [-60, 10], [-30, 50], [80, 50], [130, -10], [130, -60]], 6, -100).translate(-170, 0, -170)).color(powderCoat));
add("price-button", disp(box(300, 10, 120, true).translate(330, -95, -180)).color(signPanel));

// Curved sun hood with side cheeks.
const hood = [[110, 1930], [-100, 2000], [-320, 1990], [-460, 1910], [-445, 1890], [-315, 1960], [-100, 1970], [110, 1900]];
add("sun-hood", longSide(hood, 1240).color(powderCoat));
for (const sx of [-1, 1]) add(`hood-cheek-${sx > 0 ? "r" : "l"}`, longSide([[110, 1600], [110, 1915], [-320, 1985], [-450, 1900]], 30, sx * 605).color(powderCoat));

// "Photos" sign with a camera emblem, on two stub posts.
for (const sx of [-1, 1]) add(`sign-post-${sx > 0 ? "r" : "l"}`, cylinder(140, 20, 10).translate(sx * 300, -50, 1985).color(stainlessSteel));
add("sign-panel", plan(rr(900, 60, 25), 0, 260).translate(0, -50, 2120).color(signPanel));
add("camera-body", box(200, 30, 120, true).translate(-250, -90, 2250).color(glass));
add("camera-hump", box(80, 30, 40, true).translate(-270, -90, 2325).color(glass));
add("camera-lens", cylinder(30, 42, 16).rotateX(90).translate(-250, -95, 2250).color(stainlessSteel));
for (let k = 0; k < 4; k++) add(`sign-letter-${k}`, box(70, 20, 120, true).translate(-40 + k * 100, -88, 2250).color(powderCoat));

return p.model();
