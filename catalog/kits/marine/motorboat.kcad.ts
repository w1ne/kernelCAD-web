// SPDX-License-Identifier: CC0-1.0
// Motorboat: a centre-console runabout. It reads as a planing boat because of
// the deep-V hull lofted from a wide transom to a raked, rising bow, the open
// cockpit sunk into the hull, the white gelcoat foredeck and bottom against
// painted topsides, and the outboard hung off the transom. A console with a
// raked windscreen and wheel stands mid-cockpit behind a stainless bow rail.
// Stylized catalog geometry, millimetres, Z up, bow towards +X, keel on z = 0.
meta({
  name: "motorboat",
  license: 'CC0-1.0',
  title: "Motorboat",
  description: "Centre-console motorboat with a lofted deep-V planing hull, open cockpit, white gelcoat foredeck and bottom, console with raked windscreen and wheel, leaning-post seat, stainless bow rail and transom-hung outboard. Shape choices: single or twin outboards; open or T-top canopy. Material controls: painted hull, white gelcoat, marine glass and stainless steel; weathered and high-visibility presets.",
  tags: ["motorboat", "center console", "runabout", "outboard", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const engines = param('engines', 'single', { choices: ['single', 'twin'], label: 'Outboards' });
const canopy = param('canopy', 'open', { choices: ['open', 't-top'], label: 'Canopy' });
const paintedHull = param('paintedHull', '#24527e', { label: 'Painted hull (topsides, cowling)' });
const gelcoat = param('gelcoat', '#ecebe4', { label: 'White gelcoat (deck, bottom, console)' });
const marineGlass = param('marineGlass', '#6fb6c9', { label: 'Marine glass' });
const stainlessSteel = param('stainlessSteel', '#c3cbcd', { label: 'Stainless steel' });
presets({
  weathered: { paintedHull: '#3d5466', gelcoat: '#cfcabb', marineGlass: '#6a98a3', stainlessSteel: '#9da5a4' },
  highVisibility: { paintedHull: '#e56b38', gelcoat: '#f7f7f2', marineGlass: '#7ccbe0', stainlessSteel: '#d8dee0' },
});

const p = assembly("motorboat");
const add = (name, shape) => p.part(name, shape.scale(scale));
const painted = (name, shape) => add(name, shape.color(paintedHull));
const white = (name, shape) => add(name, shape.color(gelcoat));
const glass = (name, shape) => add(name, shape.color(marineGlass));
const steel = (name, shape) => add(name, shape.color(stainlessSteel));

// A hull station is the starboard half-section from sheer down to keel as
// (y, z) points; it is mirrored to port and lofted along X between stations.
const section = (pts) => {
  const ring = [...pts, ...pts.slice().reverse().map(([y, z]) => [-y, z])];
  let outline = path().moveTo(-ring[0][1], ring[0][0]);
  for (const [y, z] of ring.slice(1)) outline = outline.lineTo(-z, y);
  return outline.close();
};
const loftX = (stations) => {
  const profiles = stations.map(([, pts]) => section(pts));
  return profiles[0].loft(profiles.slice(1), {
    planes: stations.map(([x]) => ({ plane: 'XY', origin: [0, 0, x] })),
    ruled: true,
  }).rotateY(90);
};
// Round bar between two points.
const bar = (a, b, r) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const pitch = (Math.atan2(Math.hypot(d[0], d[1]), d[2]) * 180) / Math.PI;
  const yaw = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  return cylinder(len, r, 6).rotateY(pitch).rotateZ(yaw).translate(...a);
};

// [x, sheer, chine, deadrise, keel] as [y, z].
const stations = [
  [-650, [290, 230], [300, 80], [150, 40], [8, 14]],
  [-300, [300, 234], [306, 78], [156, 36], [8, 0]],
  [260, [282, 252], [284, 96], [136, 50], [8, 4]],
  [480, [200, 272], [170, 130], [80, 80], [6, 30]],
  [650, [10, 300], [8, 220], [6, 180], [4, 160]],
];
// Topsides with the cockpit sunk into them, leaving a transom and side decks.
const cockpit = extrudePolygon([[-610, -262], [100, -262], [250, -196], [250, 196], [100, 262], [-610, 262]], 300).translate(0, 0, 140);
painted('hull', loftX(stations.map(([x, ...pts]) => [x, pts])).subtract(cockpit));
// White bottom below the chine, standing 3 mm proud with the keel kept on z = 0.
const ends = (x, i) => (i === 0 ? x - 3 : i === stations.length - 1 ? x + 3 : x);
white('hull-bottom', loftX(stations.map(([x, , c, d, k], i) => [ends(x, i), [[c[0] + 3, c[1]], [d[0] + 3, d[1]], [k[0] + 3, Math.max(k[1] - 3, 0)]]])));
// Foredeck cap following the sheer from the cockpit to the stem.
white('foredeck', loftX([
  [252, [[284, 258], [284, 244]]],
  [480, [[202, 278], [202, 264]]],
  [652, [[12, 306], [12, 292]]],
]));
white('cockpit-sole', extrudePolygon([[-608, -260], [100, -260], [248, -194], [248, 194], [100, 260], [-608, 260]], 10).translate(0, 0, 140));

// Centre console: raked front profile, windscreen, wheel and grab rail.
const consoleSide = path().moveTo(-180, 150).lineTo(60, 150).lineTo(20, 380).lineTo(-180, 400).close();
white('console', consoleSide.extrude(220).rotateX(90).translate(0, 110, 0));
painted('console-dash', box(120, 200, 10, true).rotateY(-20).translate(-10, 0, 392));
glass('windscreen', box(10, 250, 130, true).rotateY(-30).translate(40, 0, 460));
steel('steering-wheel', cylinder(10, 40, 10).rotateY(-60).translate(-70, 0, 430));
steel('grab-rail', bar([-150, -118, 400], [-150, 118, 400], 7));
// Leaning post with a cushion behind the console, and a bow seat.
white('leaning-post', box(110, 200, 210, true).translate(-330, 0, 255));
painted('leaning-cushion', box(130, 220, 40, true).translate(-330, 0, 380));
painted('bow-cushion', box(150, 300, 34, true).translate(180, 0, 167));

// Stainless bow rail on stanchions along the foredeck to a pulpit at the stem.
const railZ = 120;
const sheer = [[250, 284, 256], [400, 236, 266], [530, 160, 282], [620, 60, 298]];
for (const side of [-1, 1]) {
  const tag = side < 0 ? '-port' : '-starboard';
  for (const [i, [x, y, z]] of sheer.entries()) {
    steel('rail-stanchion-' + (i + 1) + tag, bar([x, side * (y - 18), z], [x, side * (y - 18), z + railZ], 6));
    if (i > 0) {
      const [px, py, pz] = sheer[i - 1];
      steel('bow-rail-' + i + tag, bar([px, side * (py - 18), pz + railZ], [x, side * (y - 18), z + railZ], 7));
    }
  }
}
steel('bow-pulpit', bar([620, -42, 298 + railZ], [620, 42, 298 + railZ], 7));
steel('bow-cleat', box(50, 14, 14, true).translate(560, 0, 292));

// Outboard: lofted cowling over a leg with a cavitation plate, skeg and prop.
const outboard = (tag, y) => {
  steel('transom-bracket' + tag, box(40, 90, 120, true).translate(-670, y, 190));
  painted('cowling' + tag, sphere(80).scale([1.15, 0.8, 1.2]).translate(-760, y, 350));
  painted('midsection' + tag, box(70, 54, 220, true).translate(-720, y, 186));
  painted('cavitation-plate' + tag, box(140, 90, 10, true).translate(-720, y, 78));
  painted('lower-unit' + tag, sphere(30).scale([2.4, 0.7, 1]).translate(-720, y, 52));
  painted('skeg' + tag, box(40, 10, 40, true).translate(-720, y, 20));
  steel('propeller' + tag, cylinder(8, 34, 3).rotateY(90).translate(-802, y, 52));
};
if (engines.value === 'twin') {
  outboard('-port', -110);
  outboard('-starboard', 110);
} else {
  outboard('', 0);
}

if (canopy.value === 't-top') {
  // T-top frame from the console deck to a fabric canopy over the helm.
  for (const [i, [x, y]] of [[-60, -140], [-60, 140], [-260, -140], [-260, 140]].entries()) {
    steel('t-top-post-' + (i + 1), bar([x * 0.6 - 20, y * 0.8, 150], [x, y, 650], 9));
  }
  painted('t-top-canopy', box(320, 360, 28, true).translate(-160, 0, 664));
}

return p.model();
