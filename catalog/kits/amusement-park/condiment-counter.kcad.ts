// SPDX-License-Identifier: CC0-1.0
// Condiment counter: the self-serve sauce station in a park dining area,
// next to the tray return and the bins.
// What makes it a condiment counter rather than a generic cabinet: a row of
// stainless pump dispensers with colour-coded pump heads and spouts; a caddy
// of ketchup and mustard squeeze bottles; napkin dispensers and a cutlery
// caddy; a back upstand with a header board showing ketchup and mustard
// drops; and a cabinet front with a framed waste flap and a tray-return slot.
// Generic visualization geometry at about real size (about 2 m wide, 0.85 m
// deep, 1.6 m to the header top), millimetres, Z up, guest face on -Y,
// standing on z = 0.
meta({
  name: "condiment-counter",
  license: "CC0-1.0",
  title: "Condiment counter",
  description: "Park dining condiment station at about real size: stainless pump dispensers with colour-coded pump heads, a caddy of ketchup and mustard squeeze bottles, napkin dispensers, a cutlery caddy, a back upstand with a header board showing condiment drops, and a laminate cabinet with a framed waste flap and a tray-return slot. Material controls: laminate cabinet, stainless steel, ketchup red, mustard yellow. Festival, twilight and timber presets.",
  tags: ["condiment station", "sauce pumps", "ketchup", "mustard", "napkins", "food court", "amusement park", "theme park", "guest experience", "low poly", "CC0", "concessions and rest areas"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 3500,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const laminate = param("laminate", "#586f7a", { label: "Laminate cabinet and header" });
const stainlessSteel = param("stainlessSteel", "#b0b9b6", { label: "Stainless top, pumps and dispensers" });
const ketchup = param("ketchup", "#c0392b", { label: "Ketchup red pumps and bottles" });
const mustard = param("mustard", "#e6b422", { label: "Mustard yellow pumps and bottles" });

presets({
  festival: { laminate: "#3f9bd8", stainlessSteel: "#d1d1c6", ketchup: "#d6402f", mustard: "#f2c230" },
  twilight: { laminate: "#35576f", stainlessSteel: "#788b91", ketchup: "#a8322a", mustard: "#c99a26" },
  timber: { laminate: "#9a6b43", stainlessSteel: "#c3cbc8", ketchup: "#b8352a", mustard: "#deae2a" },
});

const p = assembly("condiment-counter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
// Outline drawn in (x, z) and extruded t thick toward +Y from y0.
const face = (pts, t: number, y0: number) => extrudePolygon(pts, t).rotateX(90).translate(0, y0 + t, 0);
const rect = (x0: number, z0: number, x1: number, z1: number) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// A condiment drop: round belly drawn to a point, in the (x, z) plane.
const drop = (r: number) => {
  const a0 = Math.PI / 2 + Math.acos(1 / 2.1);
  const sweep = 2 * Math.PI - 2 * Math.acos(1 / 2.1);
  const pts = [];
  for (let k = 0; k <= 12; k++) pts.push([r * Math.cos(a0 + (k / 12) * sweep), r * Math.sin(a0 + (k / 12) * sweep)]);
  pts.push([0, 2.1 * r]);
  return pts;
};

const W = 1900;
const D = 760;
const FRONT = -D / 2;
const TOP = 920;

// Cabinet with stainless kick, framed waste flap and tray-return slot.
add("kick", plan(rr(W - 40, D - 40, 20), 0, 80).color(stainlessSteel));
add("cabinet", plan(rr(W, D, 30), 80, TOP - 80).subtract(box(620, 320, 180, true).translate(470, FRONT + 150, 690)).color(laminate));
add("waste-frame", face(rect(-820, 300, -120, 820), 14, FRONT - 14).subtract(face(rect(-780, 340, -160, 780), 30, FRONT - 20)).color(stainlessSteel));
add("waste-flap", face(rect(-760, 360, -180, 760), 20, FRONT - 20).rotateX(-6).translate(0, -20, 40).color(stainlessSteel));
add("push-plate", face(rect(-560, 640, -380, 720), 8, FRONT - 36).color(ketchup));
add("tray-slot-frame", face(rect(120, 560, 820, 820), 14, FRONT - 14).subtract(face(rect(160, 600, 780, 780), 30, FRONT - 20)).color(stainlessSteel));
for (let k = 0; k < 3; k++) add(`tray-${k}`, box(560, 280, 18, true).translate(470, FRONT + 150, 610 + k * 24).color(k === 1 ? mustard : ketchup));
add("tray-shelf-lip", box(700, 20, 60, true).translate(470, FRONT - 10, 590).color(stainlessSteel));

// Stainless top with a back upstand and the header board.
add("top", plan(rr(W + 80, D + 60, 40), TOP, 40).color(stainlessSteel));
add("upstand", box(W + 80, 40, 360, true).translate(0, D / 2 + 10, TOP + 220).color(stainlessSteel));
add("header", face(rect(-700, TOP + 400, 700, TOP + 660), 40, D / 2 - 30).color(laminate));
add("header-drop-ketchup", face(drop(70), 16, D / 2 - 46).translate(-120, 0, TOP + 470).color(ketchup));
add("header-drop-mustard", face(drop(70), 16, D / 2 - 46).translate(120, 0, TOP + 470).color(mustard));
for (const x of [-600, 600]) add(`header-post-${x < 0 ? "l" : "r"}`, cylinder(260, 20, 10).translate(x, D / 2 - 10, TOP + 400).color(stainlessSteel));

// Row of pump dispensers on a stainless rail, with colour-coded heads.
add("pump-rail", box(1000, 260, 30, true).translate(0, 100, TOP + 55).color(stainlessSteel));
for (let k = 0; k < 4; k++) {
  const x = -375 + k * 250;
  const head = k % 2 === 0 ? ketchup : mustard;
  add(`pump-jar-${k}`, turned([[0, 0], [95, 0], [95, 260], [80, 280], [0, 280]]).translate(x, 100, TOP + 70).color(stainlessSteel));
  add(`pump-stem-${k}`, cylinder(90, 16, 8).translate(x, 100, TOP + 350).color(stainlessSteel));
  add(`pump-head-${k}`, box(110, 160, 40, true).translate(x, 40, TOP + 450).color(head));
  add(`pump-spout-${k}`, turned([[0, 0], [14, 0], [22, 50], [0, 50]]).rotateX(180).translate(x, -30, TOP + 430).color(head));
  add(`pump-drip-cup-${k}`, turned([[0, 0], [40, 0], [50, 40], [44, 40], [34, 6], [0, 6]]).translate(x, -30, TOP + 40).color(stainlessSteel));
}

// Squeeze-bottle caddy on the right, napkin dispensers at both ends, cutlery caddy.
add("bottle-caddy", plan(rr(300, 160, 20), TOP + 40, 90).translate(720, -180, 0).color(stainlessSteel));
for (let k = 0; k < 4; k++) {
  const c = k % 2 === 0 ? ketchup : mustard;
  add(`squeeze-bottle-${k}`, turned([[0, 0], [32, 0], [34, 170], [22, 200], [6, 250], [0, 250]]).translate(615 + k * 70, -180, TOP + 60).color(c));
}
for (const x of [-860, 860]) {
  add(`napkin-box-${x < 0 ? "l" : "r"}`, box(160, 220, 260, true).translate(x, 80, TOP + 170).color(stainlessSteel));
  add(`napkin-slot-${x < 0 ? "l" : "r"}`, box(110, 6, 30, true).translate(x, -32, TOP + 230).color(laminate));
}
add("cutlery-caddy", turned([[0, 0], [70, 0], [70, 150], [0, 150]]).translate(-700, -200, TOP + 40).color(stainlessSteel));
for (let k = 0; k < 5; k++) add(`cutlery-${k}`, box(14, 6, 200, true).rotateY(-12 + k * 6).translate(-730 + k * 15, -200, TOP + 230).color(k % 2 === 0 ? laminate : mustard));

return p.model();
