// Railway turnout (set of points). What makes it a turnout and not two crossed
// rails: a straight route and a diverging route that both have two running
// rails at the same 180 mm gauge. At the toe, two tapered switch blades lie
// inside the stock rails, tied by stretcher bars and thrown by a point machine
// beside the track; the blades are set for the straight route (straight blade
// closed, curved blade open). Closure rails lead to a cast crossing (frog)
// where the inner rails of the two routes cross: the frog nose sits between
// two wing rails, and a check rail on each outer rail holds the wheelsets in
// line through the crossing. Long timbers under both routes stand on a ballast
// bed that widens with the diverging track. Every rail is a straight line or an
// arc concentric with the diverging route, so the gauge is exact on both routes.
// Millimetres, Z up, ballast on z = 0.

meta({
  name: "turnout-track",
  license: 'CC0-1.0',
  title: "Railway turnout track",
  description: "Railway turnout with two running rails on both the straight and the diverging route: tapered switch blades with stretcher bars and a point machine, closure rails, a cast frog with wing rails, check rails opposite the frog, and long timbers on a ballast bed that follows the diverging track. Editable material controls: track ballast, rail steel, concrete timbers, point machine paint. Includes weathered and fresh service presets.",
  tags: ["turnout track", "railway", "train", "station", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const ballast = param('ballast', '#706b62', { label: 'Track ballast' });
const railSteel = param('railSteel', '#626b70', { label: 'Rail and running gear steel' });
const concrete = param('concrete', '#aaa79c', { label: 'Concrete' });
const paintedSteel = param('paintedSteel', '#4f6b4c', { label: 'Point machine paint' });
presets({
  weathered: { ballast: '#706a60', railSteel: '#666a6a', concrete: '#9a968a', paintedSteel: '#5d6a55' },
  freshService: { ballast: '#797367', railSteel: '#56636a', concrete: '#b8b4a8', paintedSteel: '#d0a32a' },
});

const L = 750;       // half length of the turnout
const X0 = -600;     // switch toe: the diverging route leaves the straight route here
const R = 3500;      // diverging route centre-line radius, centre at (X0, R)
const G = 90;        // half gauge: rail centre line distance from the track centre line
const HEAD = 11;     // rail head half width
const WEB = 5;       // rail web half width
const FOOT = 15;     // rail foot half width
const FLANGEWAY = 14;
const XH = X0 + 450; // switch blade heel
const XF = 620;      // frog heel: the two routes' inner rails part here
const Z_FOOT = 52;   // rail foot underside, on the timbers
const Z_WEB = Z_FOOT + 8;
const Z_HEAD = Z_WEB + 24;
const Z_TOP = Z_HEAD + 14;
const CHECK = G - 2 * HEAD - FLANGEWAY; // check and wing rail offset (54) from a running rail centre line

// y on the arc of radius r about (X0, R); straight and tangent before the toe.
const arcY = (r: number, x: number) => R - Math.sqrt(r * r - Math.max(0, x - X0) ** 2);
// x where the arc of radius r meets the line y = c.
const arcMeets = (r: number, c: number) => X0 + Math.sqrt(r * r - (R - c) ** 2);
// Samples from xa to xb, about every `step` mm, plus any extra break points.
const xsFrom = (xa: number, xb: number, step: number, extra: number[] = []) => {
  const n = Math.max(1, Math.ceil((xb - xa) / step));
  const xs = Array.from({ length: n + 1 }, (_, i) => xa + ((xb - xa) * i) / n);
  return [...xs, ...extra.filter((x) => x > xa && x < xb)].sort((a, b) => a - b);
};
// Plan outline between a lower and an upper y edge over the samples xs.
const band = (xs: number[], lo: (x: number) => number, hi: (x: number) => number): Array<[number, number]> => {
  const pts: Array<[number, number]> = [...xs.map((x) => [x, lo(x)] as [number, number]), ...xs.slice().reverse().map((x) => [x, hi(x)] as [number, number])];
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) > 0.01);
};
// Plan outline extruded up from z over h.
const plan = (pts: Array<[number, number]>, z: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z).scale(scale);
// Flat-bottom rail on a centre line y = c(x): foot, web and head. `c` is a
// line or a concentric arc, so c(x) +- w is an exact parallel edge given by `edge`.
const rail = (xs: number[], edge: (x: number, w: number) => number) => {
  const layer = (w: number, z: number, h: number) => plan(band(xs, (x) => edge(x, -w), (x) => edge(x, w)), z, h);
  return layer(FOOT, Z_FOOT, Z_WEB - Z_FOOT).union(layer(WEB, Z_WEB, Z_HEAD - Z_WEB)).union(layer(HEAD, Z_HEAD, Z_TOP - Z_HEAD));
};
const straightEdge = (c: number) => (_x: number, w: number) => c + w;
// For an arc centred on +y, a larger radius is a lower y.
const arcEdge = (r: number) => (x: number, w: number) => arcY(r - w, x);
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("turnout-track");

// ---- Ballast bed and timbers ----
// The bed follows the outer rail of the diverging route and widens at the toe for the point machine.
const bedXs = xsFrom(-L, L, 100, [X0 - 160, X0 + 200]);
const divergingOuter = (x: number) => arcY(R - G, x);
const bedLow = (inset: number) => (x: number) => (x >= X0 - 160 && x <= X0 + 200 ? -440 : -260) + inset;
const bedHigh = (inset: number) => (x: number) => Math.max(G + 150, divergingOuter(x) + 150) - inset;
p.part("ballast-bed", plan(band(bedXs, bedLow(0), bedHigh(0)), 0, 20).color(ballast));
p.part("ballast-shoulder", plan(band(bedXs.map((x) => Math.max(-L + 25, Math.min(L - 25, x))), bedLow(25), bedHigh(25)), 20, 10).color(ballast));
// Timbers square to the straight route; each reaches 120 mm past the outermost rail above it.
const TIMBER_XS = Array.from({ length: 13 }, (_, i) => -700 + 115 * i);
TIMBER_XS.forEach((x, i) => {
  const lo = i === 1 || i === 2 ? -420 : -(G + 120);
  const hi = Math.max(G, divergingOuter(x + 22)) + 120;
  p.part(`timber-${i + 1}`, b(x, (lo + hi) / 2, 30, 44, hi - lo, 22).color(concrete));
});

// ---- Stock rails ----
p.part("stock-rail-straight", rail([-L, L], straightEdge(-G)).color(railSteel));
// The other stock rail runs straight to the toe, then becomes the outer rail of the diverging route.
p.part("stock-rail-diverging", rail(xsFrom(-L, L, 60, [X0]), arcEdge(R - G)).color(railSteel));

// ---- Switch blades, set for the straight route ----
const bladeXs = xsFrom(X0, XH, 30);
// Head and web of a blade between its lower and upper y edges (web centred under the head).
const blade = (pts: (lo: (x: number) => number, hi: (x: number) => number) => Array<[number, number]>, lo: (x: number) => number, hi: (x: number) => number) => {
  const mid = (x: number) => (lo(x) + hi(x)) / 2;
  const half = (x: number) => Math.min(WEB, (hi(x) - lo(x)) / 2);
  return { head: pts(lo, hi), web: pts((x) => mid(x) - half(x), (x) => mid(x) + half(x)) };
};
const asPlan = (lo: (x: number) => number, hi: (x: number) => number) => band(bladeXs, lo, hi);
// Straight blade: closed. Its back follows the inside face of the diverging stock rail;
// its gauge face is the straight route's rail line, thinned at the tip.
const stockFace = (x: number) => divergingOuter(x) - HEAD;
const straightBlade = blade(asPlan, (x) => Math.min(G - HEAD, stockFace(x) - 4), (x) => Math.min(G + HEAD, stockFace(x)));
p.part("switch-blade-straight", plan(straightBlade.web, Z_WEB, Z_HEAD - Z_WEB).union(plan(straightBlade.head, Z_HEAD, Z_TOP - Z_HEAD)).color(railSteel));
// Curved blade: on the diverging route's other rail; open, swung about its heel so the tip stands 30 mm off the stock rail.
const curvedCentre = (x: number) => arcY(R + G, x);
const curvedBlade = blade(asPlan, (x) => Math.max(-G + HEAD, curvedCentre(x) - HEAD), (x) => Math.max(-G + HEAD + 4, curvedCentre(x) + HEAD));
const THROW = 30;
const swing = Math.atan2(THROW, XH - X0);
const heel: [number, number] = [XH, curvedCentre(XH)];
const open = (pts: Array<[number, number]>): Array<[number, number]> => pts.map(([x, y]) => {
  const u = x - heel[0], v = y - heel[1];
  return [heel[0] + u * Math.cos(swing) + v * Math.sin(swing), heel[1] - u * Math.sin(swing) + v * Math.cos(swing)];
});
p.part("switch-blade-curved", plan(open(curvedBlade.web), Z_WEB, Z_HEAD - Z_WEB).union(plan(open(curvedBlade.head), Z_HEAD, Z_TOP - Z_HEAD)).color(railSteel));
// Stretcher bars in the cribs tie the blades; a lug under each blade web.
const openCurvedY = (x: number) => open([[x, curvedCentre(x)]])[0]![1];
const straightBladeY = (x: number) => (Math.min(G - HEAD, stockFace(x) - 4) + Math.min(G + HEAD, stockFace(x))) / 2;
for (const [i, x] of [-527, -412].entries()) {
  const y0 = openCurvedY(x), y1 = straightBladeY(x);
  p.part(`stretcher-bar-${i + 1}`, b(x, (y0 + y1) / 2, 40, 16, y1 - y0, 10)
    .union(b(x, y0, 50, 16, 2 * WEB, Z_WEB - 50)).union(b(x, y1, 50, 16, 2 * WEB, Z_WEB - 50)).color(railSteel));
}
// Point machine on two long timbers outside the straight stock rail, with a drive rod under the rail to the first stretcher bar.
p.part("point-machine", b(-527, -340, 52, 230, 120, 70).color(paintedSteel));
p.part("point-machine-lid", b(-527, -340, 122, 244, 132, 8).union(b(-527, -340, 130, 120, 40, 10)).color(paintedSteel));
const rodY0 = -280, rodY1 = openCurvedY(-527) - WEB;
p.part("drive-rod", cylinder(rodY1 - rodY0, 6, 12).rotateX(-90).translate(-527, rodY0, 45).scale(scale)
  .union(cylinder(20, 14, 14).rotateX(-90).translate(-527, rodY0, 45).scale(scale)).color(railSteel));

// ---- Closure rails, which become the wing rails at the frog ----
// Straight closure: on the straight route's rail line to the knuckle, then bent beside the frog's diverging leg.
const K1 = arcMeets(R + CHECK, G);
p.part("closure-rail-straight", rail(xsFrom(XH, XF + 40, 40, [K1]), (x, w) => Math.max(G + w, arcY(R + CHECK - w, x))).color(railSteel));
// Curved closure: on the diverging route's arc to the knuckle, then straight beside the frog's straight leg.
const K2 = arcMeets(R + G, CHECK);
p.part("closure-rail-curved", rail(xsFrom(XH, XF + 40, 40, [K2]), (x, w) => Math.min(CHECK + w, arcY(R + G - w, x))).color(railSteel));

// ---- Frog: the cast V where the straight route's rail line and the diverging route's arc cross ----
const XN = arcMeets(R + G - HEAD, G - HEAD); // nose tip, where the two gauge faces meet
p.part("frog-nose", plan(band(xsFrom(XN, XF, 24), () => G - HEAD, (x) => arcY(R + G - HEAD, x)), Z_FOOT, Z_TOP - Z_FOOT).color(railSteel));
p.part("exit-rail-straight", rail([XF, L], straightEdge(G)).color(railSteel));
p.part("exit-rail-diverging", rail(xsFrom(XF, L, 40), arcEdge(R + G)).color(railSteel));

// ---- Check rails on the outer rails, opposite the frog ----
p.part("check-rail-straight", rail([XN - 160, XF + 60], straightEdge(-CHECK)).color(railSteel));
p.part("check-rail-diverging", rail(xsFrom(XN - 160, XF + 60, 60), arcEdge(R - CHECK)).color(railSteel));

return p.model();
