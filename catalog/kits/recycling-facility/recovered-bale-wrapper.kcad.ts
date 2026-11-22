// SPDX-License-Identifier: CC0-1.0
// Recovered-material bale wrapper: the ring wrapper that seals baled paper,
// film or RDF in stretch film so it can be stored outside. What makes it a
// ring wrapper: a powered roller bed that walks the bale through, a big
// vertical ring that spins around the bale's long axis carrying a film
// carriage with a roll of stretch film, the ring held on two portal frames,
// and a bale that comes out wrapped behind the ring and bare in front of it.
// Generic visualization geometry at about real size (3.6 m long, 2.3 m
// wide, 2.5 m high), millimetres, Z up, bale travelling along +X, operator
// side toward -Y.

meta({
  name: "recovered-bale-wrapper",
  license: 'CC0-1.0',
  title: "Recovered-material bale wrapper",
  description: "Ring bale wrapper at about real size: powered roller bed, a vertical wrapping ring on two portal frames carrying a stretch-film carriage, and a strapped bale that is bare on the infeed side and film-wrapped on the outfeed side, plus control pedestal and safety light. Material controls: frame, wrapping ring, stretch film and bale. paperBale, rdfBlack, plasticBale and weathered presets.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "bale wrapper", "stretch film", "machinery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f6fa8', { label: 'Frame and roller bed (paint)' });
const ring = param('ring', '#f0b429', { label: 'Wrapping ring (paint)' });
const film = param('film', '#e9eef0', { label: 'Stretch film' });
const bale = param('bale', '#b49a6c', { label: 'Bale (paper)' });

presets({
  paperBale: { frame: '#2f6fa8', ring: '#f0b429', film: '#e9eef0', bale: '#b49a6c' },
  rdfBlack: { frame: '#3f7f4a', ring: '#d4572a', film: '#262a2c', bale: '#7a6a58' },
  plasticBale: { frame: '#5a6270', ring: '#f0b429', film: '#3f9a5a', bale: '#5b8fc0' },
  weathered: { frame: '#5f7380', ring: '#a8884a', film: '#c8ccc4', bale: '#8e7a5a' },
});

const p = assembly("recovered-bale-wrapper");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const dark = '#2a2e31';

const BZ = 560;          // roller top / bale bottom
const RZ = BZ + 420;     // ring centre height
const R = 820;           // ring radius
const BL = 1200, BW = 1100, BH = 840;

// Roller bed: two side rails on legs with a run of rollers across.
for (const s of [-1, 1]) {
  add(`bed-rail-${s}`, blk(0, s * 640, BZ - 140, 3600, 80, 120).color(frame));
  for (const x of [-1650, -600, 600, 1650]) add(`bed-leg-${s}-${x}`, blk(x, s * 640, 0, 80, 80, BZ - 140).color(frame));
}
for (let i = 0; i < 16; i++) {
  const x = -1700 + i * 226;
  if (Math.abs(x) < 300) continue;
  add(`roller-${i}`, cylinder(1220, 45, 10).rotateX(-90).translate(x, -610, BZ - 45).color('#b9bfc2'));
}
add("bed-drive", blk(-1300, -720, BZ - 260, 300, 160, 200).color(dark));

// Portal frames either side of the ring.
const PH = RZ + 1000;
for (const x of [-260, 260]) {
  for (const s of [-1, 1]) add(`post-${x}-${s}`, blk(x, s * 1080, 0, 120, 120, PH).color(frame));
  add(`portal-beam-${x}`, blk(x, 0, PH, 140, 2300, 140).color(frame));
  add(`portal-foot-${x}`, blk(x, 0, 0, 160, 2300, 40).color(frame));
}
for (const s of [-1, 1]) add(`portal-tie-${s}`, blk(0, s * 1080, PH, 660, 100, 100).color(frame));

// Wrapping ring in the YZ plane around the bale axis, with hangers.
add("ring", torus(R, 50, 28).rotateY(90).translate(0, 0, RZ).color(ring));
add("ring-track", torus(R + 60, 22, 28).rotateY(90).translate(0, 0, RZ).color(dark));
for (const s of [-1, 1]) {
  add(`ring-hanger-${s}`, blk(0, s * (R + 140), RZ - 60, 520, 2 * (1020 - R - 140), 120).color(frame));
  add(`ring-guide-${s}`, cylinder(120, 60, 10).rotateY(90).translate(-60, s * (R + 82), RZ).color(dark));
}
add("ring-hanger-top", blk(0, 0, RZ + R + 82, 520, 120, PH - RZ - R - 82).color(frame));

// Film carriage on the ring at the lower front, roll pointing along X.
const CA = -50; // carriage angle on the ring, degrees from +Y
const cy = Math.cos((CA * Math.PI) / 180) * R, cz = Math.sin((CA * Math.PI) / 180) * R;
add("carriage-plate", box(420, 140, 380, true).rotateX(CA).translate(0, cy, RZ + cz).color(ring));
add("film-roll", cylinder(500, 120, 14).rotateY(90).translate(-250, cy * 0.9, RZ + cz * 0.9).color(film));
add("film-core", cylinder(560, 38, 8).rotateY(90).translate(-280, cy * 0.9, RZ + cz * 0.9).color(dark));
add("prestretch-motor", cylinder(180, 70, 10).rotateY(90).translate(160, cy * 1.06, RZ + cz * 1.06).color(dark));
// Film web from the carriage to the bale corner.
add("film-web", box(10, 560, 360, true).rotateX(-20).translate(0, 420, BZ + 200).color(film));

// Bale: bare infeed half (with wire straps), wrapped outfeed half.
add("bale", blk(-260, 0, BZ, BL, BW, BH).color(bale));
for (const x of [-700, -500, -300]) {
  add(`strap-top-${x}`, blk(x, 0, BZ + BH, 16, BW + 10, 6).color(dark));
  add(`strap-front-${x}`, blk(x, -BW / 2 - 4, BZ, 16, 6, BH).color(dark));
}
add("bale-wrap", blk(330, 0, BZ - 6, 900, BW + 30, BH + 24).color(film));
add("wrap-edge", blk(-110, 0, BZ - 2, 40, BW + 18, BH + 10).color(film));
// A second, fully wrapped bale waiting on the outfeed.
add("wrapped-bale", blk(1350, 0, BZ - 6, 820, BW + 30, BH + 24).color(film));
add("wrapped-band", blk(1350, 0, BZ + BH / 2 - 60, 830, BW + 40, 120).color(film));
add("wrapped-label", blk(1350, -BW / 2 - 22, BZ + 520, 260, 6, 180).color('#e8e6dc'));

// Control pedestal and beacon.
add("control-pedestal", blk(-1100, 1420, 0, 260, 200, 1150).color('#c9ced1'));
add("control-panel", box(360, 80, 260, true).rotateX(25).translate(-1100, 1400, 1240).color(dark));
add("estop", cylinder(40, 40, 10).rotateX(115).translate(-1020, 1360, 1250).color('#d4402a'));
add("beacon-mast", cylinder(260, 20, 8).translate(260, -1080, PH + 140).color(dark));
add("beacon", cylinder(120, 60, 12).translate(260, -1080, PH + 400).color('#f08a24'));

return p.model();
