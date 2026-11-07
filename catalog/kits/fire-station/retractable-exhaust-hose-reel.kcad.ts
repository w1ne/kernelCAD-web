// SPDX-License-Identifier: CC0-1.0
// Retractable exhaust hose reel: the ceiling-hung, spring-return reel that
// keeps a vehicle-exhaust hose ready over each apparatus parking spot. What
// makes it one: a steel ceiling bracket carrying a wide drum between two
// side plates, several turns of flexible hose wound on the drum, the hose
// dropping to a rubber tailpipe boot with an aluminium grip handle, a rubber
// stop ball that parks the hose at reach height, the spring housing and
// motor on one side, and the outlet duct rising from the drum hub to the
// fan main in the ceiling. Millimetres, Z up, ceiling origin (everything
// hangs below Z = 0), the drum axis runs along X.
meta({
  name: "retractable-exhaust-hose-reel",
  license: 'CC0-1.0',
  title: "Retractable exhaust hose reel",
  description: "Ceiling-mounted spring-return vehicle-exhaust hose reel: steel ceiling bracket and side plates, wide drum with wound turns of flexible hose, spring housing and motor, hub outlet duct rising to the ceiling fan main, hanging hose with a rubber stop ball and a tailpipe boot with aluminium grip handle. Material controls: bracket paint, drum and spring housing, exhaust hose and tailpipe boot; apparatus-red, clean-zone and weathered presets.",
  tags: ["fire", "station", "apparatus bay", "firefighter health", "CC0", "retractable", "exhaust", "hose", "reel", "diesel exhaust", "ceiling"],
  kit: 'fire-station',
  category: 'prop',
  origin: "ceiling",
  compat: ['fire', 'fire-station', 'station', 'apparatus-bay', 'interior'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const bracket = param('bracket', '#3f4a50', { label: 'Ceiling bracket and side plates' });
const drum = param('drum', '#e0b21f', { label: 'Drum, spring housing and duct' });
const hose = param('hose', '#b83d34', { label: 'Exhaust hose' });
const boot = param('boot', '#252a2d', { label: 'Tailpipe boot and stop ball' });

presets({
  'apparatus-red': { drum: '#b83d34', hose: '#2a2d30' },
  'clean-zone': { bracket: '#e4e6e2', drum: '#4e8c87', hose: '#30383b' },
  weathered: { bracket: '#4b4a45', drum: '#a88a3c', hose: '#7b3a30', boot: '#3a3c3b' },
});

const p = assembly("retractable-exhaust-hose-reel");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const ring = (r0, r1, z0, z1) => turned([[r0, z0], [r1, z0], [r1, z1], [r0, z1]]);
const rod = (r, z0, z1) => turned([[0, z0], [r, z0], [r, z1], [0, z1]]);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Cross-section [[y, z], ...] extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => extrudePolygon(pts, x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Turned parts with the axis along +X.
const alongX = (shape) => shape.rotateY(90);

// Fixed trade colour: the bare aluminium grip handle and duct clamps.
const aluminium = '#c3c9cc';

const hz = -520; // drum axis height below the ceiling
const half = 380; // half drum width along X

// ---- Ceiling bracket: plate, two drop arms, side plates ----
add('ceiling-plate', blk(-half - 120, -260, -30, half + 120, 260, 0).color(bracket));
for (const x of [-half - 60, half + 40]) {
  add(`side-plate-${x}`, prismX([[-200, -30], [200, -30], [330, hz], [200, hz - 320], [-200, hz - 320], [-330, hz]], x, x + 20).color(bracket));
  add(`axle-boss-${x}`, alongX(rod(55, x - 30, x + 50)).translate(0, 0, hz).color(bracket));
}
for (const y of [-200, 200]) add(`tie-rod-${y}`, alongX(rod(18, -half - 60, half + 60)).translate(0, y, hz - 280).color(bracket));

// ---- Drum: core, flanges, and the wound turns of hose ----
add('drum-core', alongX(rod(140, -half, half)).translate(0, 0, hz).color(drum));
for (const x of [-half, half - 18]) add(`drum-flange-${x}`, alongX(ring(0, 300, x, x + 18)).translate(0, 0, hz).color(drum));
for (let i = 0; i < 6; i++) {
  const x0 = -half + 22 + i * 122;
  add(`hose-turn-${i}`, alongX(turned([[140, x0], [255, x0 + 10], [270, x0 + 60], [255, x0 + 110], [140, x0 + 118]])).translate(0, 0, hz).color(hose));
}

// ---- Spring housing and gear motor on the -X side ----
add('spring-housing', alongX(turned([[0, -half - 260], [190, -half - 260], [210, -half - 220], [210, -half - 80], [0, -half - 80]])).translate(0, 0, hz).color(drum));
add('gear-motor', alongX(rod(80, -half - 470, -half - 260)).translate(0, 120, hz - 120).color(bracket));
add('motor-cap', alongX(turned([[0, -half - 520], [60, -half - 520], [80, -half - 470], [0, -half - 470]])).translate(0, 120, hz - 120).color(bracket));

// ---- Hub outlet duct on +X rising to the ceiling fan main ----
add('hub-swivel', alongX(turned([[0, half + 60], [110, half + 60], [110, half + 140], [90, half + 170], [0, half + 170]])).translate(0, 0, hz).color(drum));
add('duct-riser', rod(90, hz, -60).translate(half + 200, 0, 0).color(drum));
add('duct-elbow', blk(half + 110, -90, hz - 90, half + 290, 90, hz + 90).color(drum));
for (const z of [hz + 160, -140]) add(`duct-clamp-${z}`, ring(90, 102, z, z + 30).translate(half + 200, 0, 0).color(aluminium));
add('duct-collar', ring(90, 140, -60, -30).translate(half + 200, 0, 0).color(bracket));

// ---- Hanging hose: corrugated drop, stop ball, tailpipe boot, grip ----
const hy = -265, dropTop = hz, dropBottom = -2050;
const corr = [[0, dropTop]];
for (let z = dropTop; z > dropBottom + 30; z -= 60) corr.push([95, z], [105, z - 30]);
corr.push([95, dropBottom], [0, dropBottom]);
add('hose-drop', turned(corr).translate(0, hy, 0).color(hose));
add('stop-ball', turned([[0, -1340], [80, -1310], [120, -1240], [120, -1170], [80, -1100], [0, -1070]]).translate(0, hy, 0).color(boot));
add('boot-collar', ring(105, 125, dropBottom - 60, dropBottom + 20).translate(0, hy, 0).color(aluminium));
add('tailpipe-boot', turned([[110, dropBottom - 60], [160, dropBottom - 280], [190, dropBottom - 420], [150, dropBottom - 420], [125, dropBottom - 280], [80, dropBottom - 60]]).translate(0, hy, 0).color(boot));
add('grip-handle', blk(-25, hy - 260, dropBottom - 160, 25, hy - 230, dropBottom + 10).color(aluminium));
for (const z of [dropBottom - 150, dropBottom]) add(`grip-arm-${z}`, blk(-20, hy - 240, z - 10, 20, hy - 100, z + 10).color(aluminium));

return p.model();
