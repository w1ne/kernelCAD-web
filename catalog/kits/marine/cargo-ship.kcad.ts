// SPDX-License-Identifier: CC0-1.0
// Cargo ship: a coastal container feeder. What makes it read as one is the long
// parallel-sided hull with a bulbous bow and red antifouling below the
// waterline, the white accommodation block and funnel at the stern, and the
// mixed-colour container stacks across the hatches. The hull is lofted through
// transom, midbody and stem stations. Stylized catalog geometry, millimetres,
// Z up, bow towards +X, keel on z = 0.
meta({
  name: "cargo-ship",
  license: 'CC0-1.0',
  title: "Cargo ship",
  description: "Container feeder ship with a lofted hull and bulbous bow, red antifouling below the waterline, aft white accommodation block with bridge wings and funnel, hatch coamings and mixed-colour container stacks. Shape choices: full, partial or empty deck load; gearless or with deck cranes. Material controls: painted hull, antifouling, superstructure paint and container steel; weathered and high-visibility presets.",
  tags: ["cargo ship", "container ship", "feeder", "marine", "nautical", "harbor", "low poly", "CC0"],
  kit: 'marine',
  category: 'prop',
  origin: 'base',
  compat: ['marine', 'harbor', 'dock', 'boat', 'coastal-scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const load = param('load', 'full', { choices: ['full', 'partial', 'empty'], label: 'Deck load' });
const gear = param('gear', 'gearless', { choices: ['gearless', 'cranes'], label: 'Cargo gear' });
const paintedHull = param('paintedHull', '#24466b', { label: 'Painted hull (topsides)' });
const antifouling = param('antifouling', '#a8382c', { label: 'Antifouling and red-oxide deck' });
const superstructurePaint = param('superstructurePaint', '#e8ebe8', { label: 'Superstructure paint' });
const cargoCoating = param('cargoCoating', '#c9692f', { label: 'Container steel' });
presets({
  weathered: { paintedHull: '#34495a', antifouling: '#7d3f34', superstructurePaint: '#c9c8bd', cargoCoating: '#9a5b3c' },
  highVisibility: { paintedHull: '#e56b38', antifouling: '#9b2b24', superstructurePaint: '#f6f7f4', cargoCoating: '#2f7fb8' },
});

const p = assembly("cargo-ship");
const add = (name, shape) => p.part(name, shape.scale(scale));
const hull = (name, shape) => add(name, shape.color(paintedHull));
const bottom = (name, shape) => add(name, shape.color(antifouling));
const white = (name, shape) => add(name, shape.color(superstructurePaint));
const box20 = (name, shape) => add(name, shape.color(cargoCoating));

// A hull station is the starboard half-section from deck edge down to keel as
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

const WL = 150;
// [x, deck, waterline, bilge, keel] half-breadths as [y, z].
const stations = [
  [-1150, [284, 318], [276, WL], [214, 78], [34, 70]],
  [-990, [300, 310], [298, WL], [272, 30], [60, 0]],
  [640, [300, 300], [300, WL], [286, 18], [110, 0]],
  [950, [280, 312], [256, WL], [184, 34], [34, 0]],
  [1130, [168, 336], [108, WL], [50, 54], [10, 20]],
  [1210, [16, 362], [8, WL], [6, 80], [5, 50]],
];
hull('hull', loftX(stations.map(([x, ...pts]) => [x, pts])));
// Antifouling: the same stations below the waterline, standing 4 mm proud and
// 4 mm past each end so the transom and stem faces do not coincide. The keel
// stays on z = 0 so the asset base sits on the ground plane.
const ends = (x, i) => (i === 0 ? x - 4 : i === stations.length - 1 ? x + 4 : x);
bottom('antifouling', loftX(stations.map(([x, , w, b, k], i) => [ends(x, i), [[w[0] + 4, w[1]], [b[0] + 4, b[1]], [k[0] + 4, Math.max(k[1] - 4, 0)]]])));
bottom('bulbous-bow', sphere(52).scale([2.4, 0.9, 0.9]).translate(1160, 0, 62));

// Red-oxide weather deck and a raised forecastle.
bottom('weather-deck', extrudePolygon([[-1090, -284], [930, -284], [1080, -130], [1080, 130], [930, 284], [-1090, 284]], 8).translate(0, 0, 300));
hull('forecastle', extrudePolygon([[960, -270], [1110, -150], [1196, -14], [1196, 14], [1110, 150], [960, 270]], 52).translate(0, 0, 306));
white('foremast', cylinder(260, 10, 8).translate(1080, 0, 358));
white('foremast-yard', box(16, 130, 12, true).translate(1080, 0, 560));

// Hatch coamings between the superstructure and the forecastle.
const bays = [-660, -455, -250, -45, 160, 365, 570, 775];
for (const [i, x] of bays.entries()) hull('hatch-coaming-' + (i + 1), box(190, 520, 36, true).translate(x, 0, 326));

// Accommodation block: stepped house, bridge deck with wings and window band.
white('accommodation', box(230, 460, 300, true).translate(-910, 0, 458));
white('house-upper', box(200, 400, 110, true).translate(-920, 0, 663));
white('bridge-deck', box(220, 620, 70, true).translate(-910, 0, 753));
hull('bridge-windows', box(8, 500, 30, true).translate(-798, 0, 758));
for (const y of [-270, 270]) hull('wing-window' + (y < 0 ? '-port' : '-starboard'), box(120, 8, 26, true).translate(-910, y + Math.sign(y) * 41, 758));
white('bridge-roof', box(240, 640, 14, true).translate(-910, 0, 795));
white('radar-mast', cylinder(130, 10, 8).translate(-930, 0, 802));
white('radar-scanner', box(20, 150, 12, true).translate(-930, 0, 920));
// Funnel: tapered side profile extruded across the ship, with a funnel band.
const funnelSide = path().moveTo(-1125, 600).lineTo(-1020, 600).lineTo(-1010, 860).lineTo(-1105, 870).close();
white('funnel', funnelSide.extrude(150).rotateX(90).translate(0, 75, 0));
box20('funnel-band', box(120, 154, 50, true).translate(-1062, 0, 790));
hull('funnel-top', box(100, 154, 12, true).translate(-1058, 0, 866));

// Container stacks: four rows on each hatch, colours mixed like a real load.
const paints = [box20, box20, hull, white, box20, bottom];
const craneBays = gear.value === 'cranes' ? [2, 5] : [];
const tiersFor = (b, r) => {
  if (load.value === 'empty' || craneBays.includes(b)) return 0;
  if (load.value === 'full') return b === bays.length - 1 ? 2 : 3;
  return [3, 1, 0, 2, 3, 0, 2, 1][b] - (r % 3 === 0 ? 1 : 0);
};
for (const [b, x] of bays.entries()) {
  for (let r = 0; r < 4; r += 1) {
    const y = -195 + r * 130;
    for (let t = 0; t < tiersFor(b, r); t += 1) {
      const paint = paints[(b * 5 + r * 3 + t * 2) % paints.length];
      paint('container-b' + (b + 1) + '-r' + (r + 1) + '-t' + (t + 1), box(186, 124, 124, true).translate(x, y, 408 + t * 128));
    }
  }
}

if (gear.value === 'cranes') {
  // Two centreline deck cranes stand on the hatches they serve, jibs raised
  // towards the bow above the next stack.
  for (const [i, b] of craneBays.entries()) {
    const x = bays[b];
    white('crane-pedestal-' + (i + 1), cylinder(250, 34, 10).translate(x, 0, 344));
    white('crane-house-' + (i + 1), box(90, 80, 70, true).translate(x, 0, 629));
    box20('crane-jib-' + (i + 1), box(360, 24, 24, true).rotateY(-28).translate(x + 150, 0, 740));
  }
}

return p.model();
