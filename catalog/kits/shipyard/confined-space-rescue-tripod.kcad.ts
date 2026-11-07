// Confined-space rescue tripod, set up over a tank-top manhole so a worker in
// a double-bottom tank can be lowered and hauled out. What makes it one: three
// splayed telescopic aluminium legs - a thick upper tube with a pin collar and
// a slimmer extension below - meeting in a cast head with an anchor eye and a
// sheave; rubber shoes on hinged feet tied by a spreader chain; a hand winch
// with crank on one leg and a self-retracting lifeline block on another, both
// lines reeved over the head and dropping through the manhole to a hook.
// Millimetres, Z up, ground origin under the deck plate, manhole centred.
meta({
  name: "confined-space-rescue-tripod",
  license: 'CC0-1.0',
  title: "Confined-space rescue tripod",
  description: "Confined-space rescue tripod at about real size over a tank-top manhole: three splayed telescopic aluminium legs with pin collars and locking pins, a cast head with anchor eye and twin sheaves, hinged feet with rubber shoes tied by a spreader chain, a hand winch with drum, crank and leg brackets, a self-retracting lifeline block with leg pulley, both lines reeved over the head down through the raised manhole coaming to a swivel hook. Material controls: aluminium legs, cast head, winch and lifeline, deck steel; fresh-coat, weathered-yard and high-visibility presets.",
  tags: ["shipyard", "confined space", "rescue tripod", "fall arrest", "man-riding winch", "tank entry", "manhole", "safety equipment", "CC0"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const aluminium = param('aluminium', '#c3c9cc', { label: 'Aluminium legs' });
const castHead = param('castHead', '#e3b22b', { label: 'Cast head and feet' });
const winch = param('winch', '#c7322a', { label: 'Winch and lifeline block' });
const deckSteel = param('deckSteel', '#6c7873', { label: 'Tank-top deck steel' });

presets({
  'fresh-coat': { aluminium: '#d6dbdd', castHead: '#f0c234', winch: '#d83a30', deckSteel: '#7c8a84' },
  'weathered-yard': { aluminium: '#9ea4a4', castHead: '#b38d34', winch: '#94392f', deckSteel: '#6b5a4c' },
  'high-visibility': { castHead: '#f26a1b', winch: '#f2d11b' },
});

const p = assembly("confined-space-rescue-tripod");
// Modelled from the deck top; lift by the 25 mm plate so the asset sits on z = 0.
const add = (name, shape) => p.part(name, shape.translate(0, 0, 25).scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const dir = (a, b) => [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
// Turn a +Z-pointing shape to point from a towards b, then move it to a.
const orient = (shape, a, b) => {
  const d = dir(a, b);
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
const tube = (a, b, r, n = 10) => orient(rod(r, 0, Math.hypot(...dir(a, b)), n), a, b);
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

const rubber = '#22262a', webbing = '#2d3a4a', cable = '#8a8f92';
const H = [0, 0, 2350];
const footR = 1080;
const legs = [90, 210, 330].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return [footR * Math.cos(a), footR * Math.sin(a), 110];
});

// ---- Tank-top deck with a raised manhole coaming ----
add('deck-plate', blk(-1500, -1500, -25, 1500, 1500, 0).color(deckSteel));
add('manhole-coaming', lathe([[360, 0], [360, 90], [330, 110]], 16).color(deckSteel));
add('manhole-opening', rod(300, 0, 112, 16).color('#151719'));
add('manhole-cover', rod(380, 0, 25, 16).translate(-700, -1050, 0).color(deckSteel));
for (const [x, y] of [[900, -1250], [1250, 900], [-1250, 400]]) add(`deck-weld-strip-${x}`, blk(x - 6, y - 220, 0, x + 6, y + 220, 4).color('#59625e'));

// ---- Legs: thick upper tube, pin collar, slimmer extension, hinged foot ----
legs.forEach((F, i) => {
  const n = `leg-${i + 1}`;
  const s0 = lerp(H, F, 0.06);
  const c = lerp(H, F, 0.55);
  const f0 = lerp(H, F, 0.95);
  add(`${n}-socket`, tube(H, lerp(H, F, 0.1), 52, 8).color(castHead));
  add(`${n}-upper`, tube(s0, c, 40, 10).color(aluminium));
  add(`${n}-collar`, tube(lerp(H, F, 0.53), lerp(H, F, 0.59), 50, 8).color(castHead));
  add(`${n}-lock-pin`, tube(lerp(H, F, 0.56), [lerp(H, F, 0.56)[0] + 70, lerp(H, F, 0.56)[1] + 70, lerp(H, F, 0.56)[2]], 9, 6).color(rubber));
  add(`${n}-extension`, tube(c, f0, 31, 10).color(aluminium));
  for (const [k, u] of [0.67, 0.75, 0.83].entries()) add(`${n}-adjust-band-${k}`, tube(lerp(H, F, u), lerp(H, F, u + 0.012), 33, 10).color('#7f8689'));
  add(`${n}-foot-knuckle`, tube(f0, [F[0], F[1], F[2] + 20], 42, 8).color(castHead));
  add(`${n}-foot-shoe`, lathe([[105, 0], [100, 40], [70, 70]], 10).translate(F[0], F[1], 0).color(rubber));
  add(`${n}-foot-plate`, rod(80, 70, 100, 10).translate(F[0], F[1], 0).color(castHead));
});
// Spreader chain tying the feet so they cannot slide out.
legs.forEach((F, i) => {
  const G = legs[(i + 1) % 3];
  const a = [F[0], F[1], 85], b = [G[0], G[1], 85];
  for (let k = 0; k < 9; k++) add(`chain-${i}-${k}`, tube(lerp(a, b, 0.06 + k * 0.1), lerp(a, b, 0.12 + k * 0.1), 12, 4).color(cable));
});

// ---- Cast head: hub, anchor eye and two sheaves below ----
add('head-hub', lathe([[95, H[2] - 90], [120, H[2] - 40], [120, H[2] + 40], [80, H[2] + 90]], 10).color(castHead));
add('head-eye', rod(55, 0, 30, 10).rotateX(90).translate(0, 15, H[2] + 150).color(castHead));
add('head-eye-web', blk(-25, -12, H[2] + 80, 25, 12, H[2] + 130).color(castHead));
for (const [k, x] of [-60, 60].entries()) {
  add(`sheave-cheek-${k}`, blk(x - 65, -10, H[2] - 280, x + 65, 10, H[2] - 90).color(castHead));
  add(`sheave-${k}`, rod(70, -14, 14, 12).rotateX(90).translate(x, 0, H[2] - 200).color(aluminium));
}

// ---- Hand winch on leg 1 and lifeline block on leg 2 ----
const L1 = legs[0], L2 = legs[1];
const W = lerp(H, L1, 0.6);
add('winch-bracket-upper', tube(lerp(H, L1, 0.5), [W[0] - 160, W[1] + 30, W[2] + 120], 18, 6).color(winch));
add('winch-bracket-lower', tube(lerp(H, L1, 0.7), [W[0] - 160, W[1] + 30, W[2] - 120], 18, 6).color(winch));
add('winch-frame', blk(W[0] - 260, W[1] - 70, W[2] - 200, W[0] - 140, W[1] + 140, W[2] + 200).color(winch));
add('winch-drum', rod(95, 0, 220, 12).rotateY(90).translate(W[0] - 380, W[1] + 30, W[2]).color(aluminium));
add('winch-drum-flange-a', rod(130, 0, 15, 12).rotateY(90).translate(W[0] - 395, W[1] + 30, W[2]).color(winch));
add('winch-drum-flange-b', rod(130, 0, 15, 12).rotateY(90).translate(W[0] - 160, W[1] + 30, W[2]).color(winch));
add('winch-gear-cover', rod(115, 0, 80, 12).rotateY(90).translate(W[0] - 475, W[1] + 30, W[2]).color(winch));
add('winch-crank-arm', blk(W[0] - 510, W[1] + 10, W[2] - 220, W[0] - 485, W[1] + 50, W[2] + 20).color('#2e3236'));
add('winch-crank-handle', rod(18, 0, 130, 8).rotateY(-90).translate(W[0] - 510, W[1] + 30, W[2] - 210).color(rubber));
add('winch-cable-up', tube([W[0] - 270, W[1] + 30, W[2] + 95], [-60, 0, H[2] - 200 + 70], 6, 4).color(cable));

const S = lerp(H, L2, 0.42);
const So = [S[0] - 150, S[1] - 40, S[2]];
add('srl-bracket', tube(S, So, 22, 6).color(winch));
add('srl-block', lathe([[150, -60], [175, -30], [175, 30], [150, 60]], 14).rotateX(90).translate(So[0] - 40, So[1], So[2]).color(winch));
add('srl-hub', rod(55, -75, 75, 10).rotateX(90).translate(So[0] - 40, So[1], So[2]).color('#2e3236'));
add('srl-line-up', tube([So[0] - 40, So[1], So[2] + 175], [60, 0, H[2] - 200 + 70], 6, 4).color(webbing));

// ---- Both lines drop through the manhole to a swivel hook ----
add('winch-line-down', rod(6, 300, H[2] - 200, 4).translate(-130, 0, 0).color(cable));
add('srl-line-down', rod(7, 420, H[2] - 200, 4).translate(130, 0, 0).color(webbing));
add('swivel', rod(22, 380, 470, 8).translate(-130, 0, 0).color(aluminium));
add('hook-shank', blk(-145, -12, 220, -115, 12, 380).color(castHead));
add('hook-bight', lathe([[70, 0], [70, 30]], 10).rotateX(90).translate(-80, 15, 220).color(castHead));
add('srl-snap', blk(115, -15, 330, 145, 15, 420).color(aluminium));
add('legend-plate', blk(-60, -125, H[2] - 40, 60, -119, H[2] + 30).color('#efeadf'));

return p.model();
