// SPDX-License-Identifier: CC0-1.0
// Duck pond game trough: the hook-a-duck midway game where rubber ducks
// float round a channel and every guest picks one to win a prize.
// What makes it a duck pond rather than a tub: a waist-high fibreglass basin
// with a looping water channel around a central island, a rolled enamel rim,
// yellow ducks with orange beaks circulating nose-to-tail in the water, a
// prize sign on the island, and hook poles laid across the front rim with
// their lines dropped into the channel.
// Generic visualization geometry at about real size (2.0 x 1.5 m basin,
// 0.8 m rim height), millimetres, Z up, guest face on -Y, standing on z = 0.
meta({
  name: "duck-pond-game-trough",
  license: "CC0-1.0",
  title: "Duck pond game trough",
  description: "Hook-a-duck midway game at about real size: a waist-high fibreglass basin with a looping water channel round a central island, a rolled enamel rim, eight rubber ducks circulating nose-to-tail, a prize sign on the island, and hook poles laid across the front rim with lines in the water. Material controls: fibreglass, water, duck, trim. Festival, twilight and vintage presets.",
  tags: ["duck pond", "hook a duck", "pick a duck", "rubber duck", "kiddie game", "midway game", "carnival game", "amusement park", "theme park", "guest experience", "low poly", "CC0", "midway games"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 9000,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const fiberglass = param("fiberglass", "#2f7fb8", { label: "Fibreglass basin shell and island" });
const water = param("water", "#5cc8e6", { label: "Water in the channel" });
const duck = param("duck", "#f7d330", { label: "Rubber ducks" });
const trim = param("trim", "#e8552b", { label: "Enamel rim, beaks, sign and hook poles" });

presets({
  festival: { fiberglass: "#2c9a5c", water: "#62d0e0", duck: "#ffe14a", trim: "#d63a8a" },
  twilight: { fiberglass: "#3c3f78", water: "#3f8fbf", duck: "#f3c64b", trim: "#c2457f" },
  vintage: { fiberglass: "#b8543c", water: "#7ab8b0", duck: "#eccb5a", trim: "#efe1c0" },
});

const p = assembly("duck-pond-game-trough");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const L = 2000;
const W = 1500;
const RIM = 760;
const POOL_L = 1760;
const POOL_W = 1260;
const ISL_L = 960;
const ISL_W = 440;
const WATER = 660;

// Basin shell on a recessed toe kick, with the channel pocket cut into it.
add("toe-kick", plan(rr(L - 120, W - 120, 260), 0, 90).color(trim));
add("basin", plan(rr(L - 40, W - 40, 300), 80, RIM - 100).subtract(plan(rr(POOL_L, POOL_W, 230), 520, 400)).color(fiberglass));
add("rim", plan(rr(L, W, 320), RIM - 40, 60).subtract(plan(rr(POOL_L, POOL_W, 230), RIM - 80, 140)).color(trim));

// Water channel and the central island it loops around.
add("water", plan(rr(POOL_L - 4, POOL_W - 4, 228), 520, WATER - 520).color(water));
add("island", plan(rr(ISL_L, ISL_W, 200), 520, RIM - 540).color(fiberglass));
add("island-cap", plan(rr(ISL_L + 40, ISL_W + 40, 220), RIM - 20, 30).color(trim));

// Prize sign on the island.
add("sign-post", cylinder(520, 18, 10).translate(0, 0, RIM).color(trim));
add("sign-disc", cylinder(30, 210, 24).rotateX(90).translate(0, 15, RIM + 640).color(trim));
add("sign-face", cylinder(10, 170, 24).rotateX(90).translate(0, -15, RIM + 640).color(duck));
add("sign-duck", sphere(70).scale([1.3, 0.4, 0.9]).translate(-20, -30, RIM + 610).color(fiberglass));
add("sign-duck-head", sphere(42).scale([1, 0.4, 1]).translate(60, -30, RIM + 690).color(fiberglass));

// Eight ducks circulating nose-to-tail round the channel.
const ducks: [number, number, number][] = [
  [-560, -470, 0], [-160, -470, 0], [240, -470, 0], [610, -400, 30],
  [720, 60, 90], [420, 470, 180], [0, 470, 180], [-680, 240, 240],
];
ducks.forEach(([x, y, a], i) => {
  const at = (s: Shape) => s.rotateZ(a).translate(x, y, WATER);
  add(`duck-${i}`, at(sphere(90).scale([1.35, 1, 0.75]).translate(0, 0, 40)).color(duck));
  add(`duck-tail-${i}`, at(sphere(40).scale([1, 0.8, 1.2]).translate(-110, 0, 85)).color(duck));
  add(`duck-head-${i}`, at(sphere(55).translate(70, 0, 140)).color(duck));
  add(`duck-beak-${i}`, at(turned([[0, 0], [22, 0], [0, 55]]).rotateY(90).translate(115, 0, 130)).color(trim));
});

// Hook poles laid across the front rim, lines dropped into the channel.
[[-420, 24], [260, 20]].forEach(([x, a], i) => {
  const r = (a * Math.PI) / 180;
  const tip: [number, number] = [x + Math.cos(r) * 520, -W / 2 + 60 + Math.sin(r) * 520];
  add(`hook-pole-${i}`, cylinder(1100, 14, 8).rotateY(90).translate(-550, 0, 0).rotateZ(a).translate(x, -W / 2 + 60, RIM + 34).color(trim));
  add(`hook-line-${i}`, cylinder(RIM + 20 - WATER - 60, 3, 6).translate(tip[0], tip[1], WATER + 60).color(trim));
  add(`hook-ring-${i}`, torus(22, 5, 12).rotateX(90).translate(tip[0], tip[1], WATER + 60).color(fiberglass));
});

return p.model();
