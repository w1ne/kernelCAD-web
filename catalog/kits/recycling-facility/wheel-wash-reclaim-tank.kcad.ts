// SPDX-License-Identifier: CC0-1.0
// Wheel-wash reclaim tank: the settling tank beside a landfill or yard exit
// wheel wash. Muddy wash water drains in, silt settles, and clean water is
// pumped back to the spray bars. What makes it that unit rather than a tank:
// an open rectangular settling tank with a sloped end, an inclined drag-chain
// scraper conveyor lifting the settled sludge out into a skip, a
// recirculation pump on a plinth piped to a portal spray frame, a drain
// channel inlet from the wash ramp, and a handrail along the tank edge.
// Generic visualization geometry at about real size (4.5 m tank, 8.6 m
// overall), millimetres, Z up, skip and pump face the -X/-Y camera.

meta({
  name: "wheel-wash-reclaim-tank",
  license: 'CC0-1.0',
  title: "Wheel-wash reclaim tank",
  description: "Wheel-wash water reclaim unit at about real size: open steel settling tank with muddy water, inclined drag-chain sludge conveyor with head drive discharging into a skip, recirculation pump on a plinth piped to a portal spray frame with nozzles, drain channel inlet and edge handrail. Material controls: tank steel, conveyor and frame paint, skip and wash water. site, weathered, quarry and highVisibility presets.",
  tags: ["recycling", "landfill", "wheel wash", "settling tank", "sludge conveyor", "skip", "water recycling", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#8f979b', { label: 'Tank and pipework (galvanised steel)' });
const conveyor = param('conveyor', '#e0a526', { label: 'Sludge conveyor, pump and spray frame' });
const skip = param('skip', '#2f6aa3', { label: 'Sludge skip' });
const water = param('water', '#7a6a4c', { label: 'Muddy wash water' });

presets({
  site: { tank: '#8f979b', conveyor: '#e0a526', skip: '#2f6aa3', water: '#7a6a4c' },
  weathered: { tank: '#7b7f7a', conveyor: '#a68a4a', skip: '#4b5c6a', water: '#6b5c45' },
  quarry: { tank: '#9a9c96', conveyor: '#3d7a4a', skip: '#c9572b', water: '#9a8d70' },
  highVisibility: { tank: '#c9ced1', conveyor: '#f2d21b', skip: '#d4572a', water: '#5f7d84' },
});

const p = assembly("wheel-wash-reclaim-tank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// An (x, z) side profile extruded along Y over width t, centred on y = 0.
const profileXZ = (pts: number[][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const TL = 4500, TW = 2000, TH = 1500, X0 = -2000;

// Settling tank: side profile with a sloped +X end where the conveyor climbs out.
const tankSide = [[X0, 0], [X0 + TL - 1200, 0], [X0 + TL, TH], [X0, TH]];
for (const s of [-1, 1]) add(`tank-side-${s}`, profileXZ(tankSide, 40).translate(0, s * (TW / 2 - 20), 0).color(tank));
add("tank-floor", blk(X0 + (TL - 1200) / 2, 0, 0, TL - 1200, TW, 40).color(tank));
add("tank-end", blk(X0 + 20, 0, 0, 40, TW, TH).color(tank));
add("water", profileXZ([[X0 + 40, 60], [X0 + TL - 1240, 60], [X0 + TL - 240, TH - 200], [X0 + 40, TH - 200]], TW - 80).color(water));
for (const x of [X0 + 900, X0 + 1900, X0 + 2900]) for (const s of [-1, 1]) add(`stiffener-${x}-${s}`, blk(x, s * (TW / 2 + 40), 0, 100, 80, x > X0 + 2800 ? 900 : TH).color(tank));

// Inclined drag-chain conveyor riding the sloped end and up to a head drive over the skip.
const CA = Math.atan2(TH, 1200), CL = 4300;
const cx0 = X0 + TL - 1500, cz0 = 160;
const cx1 = cx0 + CL * Math.cos(CA), cz1 = cz0 + CL * Math.sin(CA);
const deg = (CA * 180) / Math.PI;
add("conveyor-casing", box(CL, 900, 260, true).rotateY(-deg).translate((cx0 + cx1) / 2, 0, (cz0 + cz1) / 2).color(conveyor));
for (let k = 1; k < 8; k++) {
  const t = k / 8;
  add(`flight-${k}`, box(60, 860, 120, true).rotateY(-deg).translate(cx0 + (cx1 - cx0) * t - 60 * Math.sin(CA), 0, cz0 + (cz1 - cz0) * t + 190 * Math.cos(CA)).color(tank));
}
add("head-shaft", cylinder(1100, 120, 14).rotateX(90).translate(cx1, 550, cz1).color(conveyor));
add("head-gearbox", blk(cx1, -620, cz1 - 200, 300, 260, 400).color(conveyor));
add("head-motor", cylinder(420, 130, 14).rotateY(-90).translate(cx1 - 150, -620, cz1).color(tank));
add("head-chute", blk(cx1 + 200, 0, cz1 - 700, 420, 820, 500).color(conveyor));
for (const s of [-1, 1]) add(`head-leg-${s}`, blk(cx1 - 150, s * 500, 0, 140, 140, cz1 - 150).color(conveyor));

// Sludge skip under the head chute: classic tapered skip with lifting lugs.
const SKX = cx1 + 500;
add("skip-body", profileXZ([[SKX - 1300, 120], [SKX + 1300, 120], [SKX + 1800, 1250], [SKX + 1720, 1250], [SKX + 1250, 200], [SKX - 1250, 200], [SKX - 1720, 1250], [SKX - 1800, 1250]], 1800).color(skip));
for (const s of [-1, 1]) add(`skip-end-${s}`, profileXZ([[SKX - 1300, 120], [SKX + 1300, 120], [SKX + 1800, 1250], [SKX - 1800, 1250]], 40).translate(0, s * 880, 0).color(skip));
add("skip-sludge", profileXZ([[SKX - 1650, 1000], [SKX + 1650, 1000], [SKX + 1000, 1180], [SKX - 1000, 1180]], 1700).color(water));
for (const sx of [-1, 1]) {
  add(`skip-runner-${sx}`, blk(SKX + sx * 900, 0, 0, 160, 1700, 120).color(tank));
  for (const sy of [-1, 1]) add(`skip-lug-${sx}-${sy}`, cylinder(120, 60, 10).rotateX(sy > 0 ? -90 : 90).translate(SKX + sx * 1250, sy * 900, 1000).color(tank));
}

// Recirculation pump on a plinth, front side, with a delivery main to the spray frame.
const PX = X0 + 800, PY = -TW / 2 - 900;
add("pump-plinth", blk(PX, PY, 0, 1100, 600, 200).color('#9e9a90'));
add("pump-volute", cylinder(220, 220, 16).rotateX(90).translate(PX - 250, PY + 110, 420).color(conveyor));
add("pump-motor", cylinder(560, 170, 16).rotateY(90).translate(PX - 100, PY, 420).color(conveyor));
add("suction-pipe", cylinder(TW / 2 + 900 - 200, 70, 10).rotateX(-90).translate(PX - 250, PY + 200, 420).color(tank));
add("delivery-riser", cylinder(2600, 70, 10).translate(PX - 250, PY, 620).color(tank));
add("delivery-elbow", sphere(95).translate(PX - 250, PY, 3220).color(tank));
add("delivery-run", cylinder(1700, 70, 10).rotateY(-90).translate(PX - 250, PY, 3220).color(tank));

// Portal spray frame over the wash lane (-X of the tank) with nozzle drops.
const FX = PX - 1950;
for (const s of [-1, 1]) add(`spray-post-${s}`, blk(FX, s * 1700, 0, 160, 160, 3300).color(conveyor));
add("spray-header", cylinder(3400, 70, 10).rotateX(-90).translate(FX, -1700, 3220).color(tank));
for (const y of [-1300, -650, 0, 650, 1300]) add(`nozzle-${y}`, cylinder(260, 25, 8).translate(FX, y, 2960).color(tank));

// Drain channel from the wash lane into the tank, with grating.
add("drain-channel", blk(X0 - 450, 0, 0, 900, 700, 300).color('#9e9a90'));
add("drain-grate", blk(X0 - 450, 0, 300, 860, 600, 20).color(tank));
add("drain-spout", blk(X0 + 60, 0, 900, 320, 500, 120).color(tank));

// Edge handrail along the front of the tank.
for (const x of [X0 + 100, X0 + 1300, X0 + 2500]) add(`rail-post-${x}`, blk(x, -TW / 2 - 20, TH, 50, 50, 1000).color(conveyor));
add("handrail", blk(X0 + 1300, -TW / 2 - 20, TH + 1000, 2450, 50, 50).color(conveyor));
add("midrail", blk(X0 + 1300, -TW / 2 - 20, TH + 500, 2450, 40, 40).color(conveyor));

return p.model();
