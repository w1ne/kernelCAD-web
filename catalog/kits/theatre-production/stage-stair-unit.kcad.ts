// SPDX-License-Identifier: CC0-1.0
// Stage stair unit: the portable treads that hook onto the edge of a stage or
// riser deck so performers and crew can walk up from the floor.
// What makes it a stage stair rather than a plain box stack: two sawtooth
// side stringers carrying open treads with contrasting nosing strips, closed
// risers, a steel hook plate on the top step that drops over the deck edge,
// a tubular handrail on posts down the open side, and rubber feet at the
// front. The number of steps follows the deck height (190 mm per rise).
// Generic visualization geometry at about real size (0.9 m wide, three or four
// 190 mm rises), millimetres, Z up, bottom step toward -Y (audience side),
// standing on z = 0.

meta({
  name: "stage-stair-unit",
  license: 'CC0-1.0',
  title: "Stage stair unit",
  description: "Portable stage stair unit at about real size: sawtooth side stringers, timber treads with contrasting nosing strips, closed risers, steel hook plate that drops over the deck edge, tubular handrail on posts, and rubber feet. Choose three or four 190 mm steps and a handrail on one side, both sides or none. Material controls: tread timber, painted stringers and risers, steel handrail and hook plate, nosing tape. houseShow, touring and rehearsal presets.",
  tags: ['stage stairs', 'treads', 'step unit', 'access stair', 'handrail', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steps = param('steps', '3', { choices: ['3', '4'], label: 'Number of steps' });
const rails = param('rails', 'one side', { choices: ['one side', 'both sides', 'none'], label: 'Handrail' });

const timber = param('timber', '#9a7048', { label: 'Tread timber' });
const paint = param('paint', '#1f2124', { label: 'Painted stringers and risers' });
const steel = param('steel', '#8a959b', { label: 'Steel handrail and hook plate' });
const nosing = param('nosing', '#eeeeea', { label: 'Nosing tape' });

presets({
  houseShow: { timber: '#2a2c2f', paint: '#1f2124', steel: '#5d666b', nosing: '#eeeeea' },
  touring: { timber: '#4a5056', paint: '#2b3034', steel: '#a8b2b7', nosing: '#f2c230' },
  rehearsal: { timber: '#c9a571', paint: '#b08a5a', steel: '#8a959b', nosing: '#e04a2f' },
});

const RUBBER = '#161819';

const p = assembly("stage-stair-unit");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

// Side profile drawn in (y, z) and extruded t wide along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const circle = (r: number, n: number) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0: number[], p1: number[], r: number, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const N = Number(steps.value);
const R = 190; // rise
const G = 280; // going
const W = 900;
const ST = 40; // stringer thickness
const TT = 25; // tread thickness
const Y0 = -(N * G) / 2; // front of the bottom step
const TOPD = 340; // top step is a deeper landing
const YEND = Y0 + (N - 1) * G + TOPD;

// Sawtooth stringers.
const saw: [number, number][] = [[Y0 + 30, 0]];
for (let k = 1; k <= N; k++) {
  const y = Y0 + (k - 1) * G;
  saw.push([y, k * R - TT], [k < N ? y + G : YEND, k * R - TT]);
}
saw.push([YEND, 0]);
for (const sx of [-1, 1]) add(`stringer-${sx}`, profileYZ(saw, ST).translate(sx * (W / 2 - ST / 2), 0, 0).color(paint));

// Treads with nosing strips, and closed risers.
for (let k = 1; k <= N; k++) {
  const y = Y0 + (k - 1) * G;
  const d = k < N ? G : TOPD;
  add(`tread-${k}`, box(W, d + 25, TT, true).translate(0, y - 25 + (d + 25) / 2, k * R - TT / 2).color(timber));
  add(`nosing-${k}`, box(W - 40, 40, 3, true).translate(0, y - 5, k * R + 1.5).color(nosing));
  add(`riser-${k}`, box(W - 2 * ST, 18, R - TT, true).translate(0, y + 9, (k - 1) * R + (R - TT) / 2).color(paint));
}
// Back panel and bracing under the landing.
add("back-panel", box(W - 2 * ST, 18, N * R - TT, true).translate(0, YEND - 9, (N * R - TT) / 2).color(paint));
add("brace", rod([-(W / 2 - ST), YEND - 40, 60], [W / 2 - ST, YEND - 40, N * R - 120], 14, 6).color(steel));

// Steel hook plate on the landing, folding down over the deck edge.
add("hook-plate", box(W - 160, 120, 8, true).translate(0, YEND + 40, N * R + 4).color(steel));
add("hook-lip", box(W - 160, 8, 70, true).translate(0, YEND + 96, N * R - 35 + 8).color(steel));

// Rubber feet under the front of the stringers.
for (const sx of [-1, 1]) add(`foot-${sx}`, box(ST + 20, 80, 12, true).translate(sx * (W / 2 - ST / 2), Y0 + 80, 6).color(RUBBER));

// Handrail: posts outside the stringer and a sloped rail parallel to the nosing line.
const H = 900; // rail height above the nosings
const railSides = rails.value === 'none' ? [] : rails.value === 'both sides' ? [-1, 1] : [-1];
for (const sx of railSides) {
  const x = sx * (W / 2 + 30);
  const bottom = [x, Y0 + 60, R];
  const top = [x, YEND - 60, N * R];
  for (const [k, [px, py, pz]] of [bottom, top].entries()) {
    add(`post-${sx}-${k}`, rod([px, py, pz - 120], [px, py, pz + H + 30], 20, 8).color(steel));
    add(`post-bracket-${sx}-${k}`, box(60, 60, 120, true).translate(px - sx * 25, py, pz - 60).color(steel));
  }
  add(`rail-${sx}`, rod([x, bottom[1] - 80, R + H - 30], [x, top[1] + 80, N * R + H + 30], 22, 10).color(steel));
  add(`mid-rail-${sx}`, rod([x, bottom[1], R + H / 2], [x, top[1], N * R + H / 2], 14, 8).color(steel));
}

return p.model();
