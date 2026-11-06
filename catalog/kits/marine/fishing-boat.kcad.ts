// SPDX-License-Identifier: CC0-1.0
// Fishing boat: an inshore trawler. It reads as a working boat rather than a
// yacht because of the full displacement hull lofted to a high, flared bow,
// the bulwarked working deck sunk into the hull, a boxy wheelhouse with a raked
// window band and radar mast, and the fishing gear on deck: a stern gantry with
// net drum and trawl doors, or a stack of creels with a pot hauler. Painted
// topsides sit over red antifouling. Stylized catalog geometry, millimetres,
// Z up, bow towards +X, keel on z = 0.
meta({
  name: "fishing-boat",
  license: 'CC0-1.0',
  title: "Fishing boat",
  description: "Inshore fishing boat with a lofted displacement hull and flared bow, red antifouling below the waterline, bulwarked working deck, wheelhouse with raked windows, roof radar mast and deck gear. Shape choices: stern trawl gantry with net drum or creel stack with pot hauler; wheelhouse forward or aft. Material controls: painted hull, antifouling and deck paint, cabin paint and marine glass; weathered and high-visibility presets.",
  tags: ["fishing boat", "trawler", "workboat", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const gear = param('gear', 'trawl', { choices: ['trawl', 'pots'], label: 'Fishing gear' });
const wheelhouse = param('wheelhouse', 'forward', { choices: ['forward', 'aft'], label: 'Wheelhouse position' });
const paintedHull = param('paintedHull', '#2c5f4a', { label: 'Painted hull (topsides)' });
const antifouling = param('antifouling', '#a33a2c', { label: 'Antifouling and deck paint' });
const cabinPaint = param('cabinPaint', '#ecece6', { label: 'Cabin and gantry paint' });
const marineGlass = param('marineGlass', '#4f8fa6', { label: 'Marine glass' });
presets({
  weathered: { paintedHull: '#3f5a4e', antifouling: '#7a4134', cabinPaint: '#cbc8b8', marineGlass: '#56808c' },
  highVisibility: { paintedHull: '#e56b38', antifouling: '#9b2b24', cabinPaint: '#f6f7f4', marineGlass: '#6cbfd8' },
});

const p = assembly("fishing-boat");
const add = (name, shape) => p.part(name, shape.scale(scale));
const painted = (name, shape) => add(name, shape.color(paintedHull));
const red = (name, shape) => add(name, shape.color(antifouling));
const white = (name, shape) => add(name, shape.color(cabinPaint));
const glass = (name, shape) => add(name, shape.color(marineGlass));

// A hull station is the starboard half-section from bulwark top down to keel
// as (y, z) points; it is mirrored to port and lofted along X between stations.
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

const WL = 150;
const DECK = 260;
// [x, bulwark top, waterline, bilge, keel] as [y, z].
const stations = [
  [-760, [272, 330], [262, WL], [200, 70], [30, 60]],
  [-600, [300, 326], [298, WL], [260, 30], [50, 0]],
  [200, [300, 334], [300, WL], [250, 24], [50, 0]],
  [520, [254, 368], [220, WL], [130, 40], [30, 0]],
  [700, [118, 408], [60, WL], [24, 70], [10, 20]],
  [770, [12, 430], [6, 170], [5, 110], [4, 80]],
];
// Topsides with the working deck sunk in, leaving bulwarks all round.
const well = extrudePolygon([[-722, -244], [300, -264], [520, -206], [610, -110], [610, 110], [520, 206], [300, 264], [-722, 244]], 300).translate(0, 0, DECK);
painted('hull', loftX(stations.map(([x, ...pts]) => [x, pts])).subtract(well));
const ends = (x, i) => (i === 0 ? x - 4 : i === stations.length - 1 ? x + 4 : x);
red('antifouling', loftX(stations.map(([x, , w, b, k], i) => [ends(x, i), [[w[0] + 4, w[1]], [b[0] + 4, b[1]], [k[0] + 4, Math.max(k[1] - 4, 0)]]])));
red('deck', extrudePolygon([[-720, -242], [300, -262], [520, -204], [608, -108], [608, 108], [520, 204], [300, 262], [-720, 242]], 8).translate(0, 0, DECK));
white('bulwark-cap', extrudePolygon([[-770, -282], [-600, -306], [200, -306], [520, -260], [700, -124], [780, 0], [700, 124], [520, 260], [200, 306], [-600, 306], [-770, 282]], 10)
  .subtract(extrudePolygon([[-730, -248], [300, -268], [520, -210], [614, -112], [614, 112], [520, 210], [300, 268], [-730, 248]], 12).translate(0, 0, -1))
  .translate(0, 0, 330));
red('rubbing-strake', loftX([
  [-760, [[278, 236], [278, 214]]],
  [-600, [[306, 236], [306, 214]]],
  [200, [[306, 240], [306, 218]]],
  [520, [[256, 262], [256, 240]]],
  [700, [[110, 296], [110, 274]]],
]));

// Wheelhouse: raked front profile, window band, overhanging roof and mast.
const houseX = wheelhouse.value === 'forward' ? 160 : -470;
const houseSide = path().moveTo(houseX, DECK).lineTo(houseX + 290, DECK).lineTo(houseX + 330, 560).lineTo(houseX, 580).close();
white('wheelhouse', houseSide.extrude(360).rotateX(90).translate(0, 180, 0));
glass('front-windows', box(12, 330, 100, true).rotateY(-8).translate(houseX + 318, 0, 506));
for (const side of [-1, 1]) {
  glass('side-window' + (side < 0 ? '-port' : '-starboard'), box(200, 8, 80, true).translate(houseX + 170, side * 182, 500));
}
white('wheelhouse-roof', box(380, 400, 20, true).translate(houseX + 165, 0, 590));
white('mast', cylinder(300, 12, 8).translate(houseX + 110, 0, 600));
white('radar-arm', box(16, 180, 14, true).translate(houseX + 110, 0, 820));
red('radar-scanner', box(24, 220, 14, true).translate(houseX + 160, 0, 860));
white('mast-light', sphere(16).translate(houseX + 110, 0, 912));

// Working deck: the open deck away from the wheelhouse.
const workX = wheelhouse.value === 'forward' ? -380 : 220;
if (gear.value === 'trawl') {
  // Stern A-frame gantry with sheaves, a net drum and two trawl doors.
  for (const side of [-1, 1]) {
    white('gantry-leg' + (side < 0 ? '-port' : '-starboard'), box(36, 36, 460, true).rotateY(-12).translate(-700, side * 230, 494));
    red('trawl-door' + (side < 0 ? '-port' : '-starboard'), box(150, 16, 100, true).translate(-640, side * 318, 380));
    white('gantry-sheave' + (side < 0 ? '-port' : '-starboard'), cylinder(20, 34, 10).rotateX(90).translate(-760, side * 150 + 10, 680));
  }
  white('gantry-beam', box(40, 500, 40, true).translate(-748, 0, 718));
  const drumX = wheelhouse.value === 'forward' ? -450 : 260;
  painted('net-drum', cylinder(300, 80, 14).rotateX(90).translate(drumX, 150, DECK + 120));
  for (const y of [-160, 150]) white('drum-flange' + (y < 0 ? '-port' : '-starboard'), cylinder(10, 110, 14).rotateX(90).translate(drumX, y + 10, DECK + 120));
  white('drum-stand', box(60, 340, 40, true).translate(drumX, 0, DECK + 20));
} else {
  // Creels stacked three high with a side pot hauler on a davit.
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      for (let t = 0; t < 3 - (c === 2 ? 1 : 0); t += 1) {
        const paint = (r + c + t) % 2 === 0 ? red : painted;
        paint('creel-' + (r + 1) + '-' + (c + 1) + '-' + (t + 1), box(110, 140, 70, true).translate(workX - 130 + c * 120, -80 + r * 160, DECK + 43 + t * 74));
      }
    }
  }
  white('hauler-davit', box(28, 28, 260, true).translate(workX + 200, 250, DECK + 130));
  white('hauler-arm', box(28, 120, 28, true).translate(workX + 200, 296, DECK + 250));
  red('pot-hauler', cylinder(30, 50, 12).rotateX(90).translate(workX + 200, 340, DECK + 230));
}

return p.model();
