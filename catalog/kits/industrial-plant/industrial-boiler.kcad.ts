// SPDX-License-Identifier: CC0-1.0
// Packaged firetube steam boiler, the horizontal "scotch marine" type that
// supplies plant steam. What makes it one: a long cylindrical pressure shell
// on saddles and a skid, hinged dished front and rear doors with davits, the
// burner and forced-draft blower housing on the front door with its gas train,
// the stack rising off the rear, a main steam stop valve and twin safety
// valves on the crown, and the water column with gauge glass and level
// controls on the side. Millimetres, Z up, base origin, the shell runs along
// X with the burner end at -X.
meta({
  name: 'industrial-boiler',
  license: 'CC0-1.0',
  title: 'Industrial boiler',
  description: 'Packaged firetube steam boiler at about real size: banded cylindrical shell on saddles and a channel skid, dished front and rear doors with hinges and davits, burner and blower housing with air inlet and motor, gas train with shut-off valves, rear stack with rain cap, main steam stop valve with handwheel, twin safety valves, water column with gauge glass and level controls, and a control panel with gauges. Material controls: boiler shell, doors and skid, piping and valves, gauge glass; weathered, highVisibility and red-packaged presets.',
  tags: ['industrial plant', 'factory', 'process equipment', 'boiler', 'steam', 'firetube', 'burner', 'utility', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 8000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const shell = param('shell', '#27537f', { label: 'Boiler shell' });
const trim = param('trim', '#2e3337', { label: 'Doors, burner housing and skid' });
const piping = param('piping', '#9aa1a4', { label: 'Piping and valves' });
const gaugeGlass = param('gaugeGlass', '#91c6c8', { label: 'Gauge glass' });

presets({
  weathered: { shell: '#3f5568', trim: '#3c3a36', piping: '#7d776c', gaugeGlass: '#78989b' },
  highVisibility: { trim: '#f5c640' },
  'red-packaged': { shell: '#a8322a', trim: '#e6e4de' },
});

const p = assembly('industrial-boiler');
// Built with the burner at +X, then turned so the burner front faces the viewer.
const add = (name, shape) => p.part(name, shape.rotateZ(180).scale(scale));

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
// Turned parts with the axis along +X and along +Y.
const alongX = (shape) => shape.rotateY(90);
const alongY = (shape) => shape.rotateX(-90);

const R = 1000, cz = 1400, x0 = -2000, x1 = 2000;
const dial = '#f4f4f0', valveRed = '#c0392b', flameYellow = '#f2c230';

// ---- Skid: two channel rails with cross members ----
for (const y of [-750, 750]) {
  add(`skid-rail-${y}`, prismX([[y - 100, 0], [y + 100, 0], [y + 100, 25], [y - 70, 25], [y - 70, 275], [y + 100, 275], [y + 100, 300], [y - 100, 300]].map(([a, b]) => [y < 0 ? 2 * y - a : a, b]), x0 - 300, x1 + 900).color(trim));
}
for (const x of [x0 - 250, -700, 700, x1 + 850]) add(`skid-cross-${x}`, blk(x - 50, -700, 25, x + 50, 700, 275).color(trim));

// ---- Saddles cradle the shell ----
const cradle = [[-850, 300], [850, 300], [850, cz - 520]];
for (let i = 0; i <= 10; i++) {
  const a = (-30 - (120 * i) / 10) * Math.PI / 180;
  cradle.push([Math.cos(a) * (R + 10), cz + Math.sin(a) * (R + 10)]);
}
cradle.push([-850, cz - 520]);
for (const x of [-1300, 1300]) add(`saddle-${x}`, prismX(cradle, x - 60, x + 60).color(trim));

// ---- Pressure shell with jacket bands, crown nozzles and nameplate ----
add('shell', alongX(rod(R, x0, x1)).translate(0, 0, cz).color(shell));
for (let x = x0 + 400; x < x1; x += 800) add(`jacket-band-${x}`, alongX(ring(R, R + 15, x, x + 60)).translate(0, 0, cz).color(trim));
add('nameplate', blk(-300, R - 40, cz + 200, 300, R + 20, cz + 420).color('#d8d6cc'));
for (const x of [-1000, 1000]) add(`lifting-lug-${x}`, blk(x - 20, -120, cz + R - 30, x + 20, 120, cz + R + 140).color(trim));

// ---- Front door: dished, hinged, with burner and blower housing ----
add('front-door', alongX(turned([[0, x1], [R + 40, x1], [R + 40, x1 + 140], [R - 120, x1 + 260], [0, x1 + 300]])).translate(0, 0, cz).color(trim));
for (const z of [cz - 600, cz + 600]) add(`front-hinge-${z}`, blk(x1 + 20, R - 40, z - 60, x1 + 220, R + 120, z + 60).color(trim));
add('burner-housing', prismX([[-560, cz - 650], [560, cz - 650], [560, cz + 350], [420, cz + 560], [-420, cz + 560], [-560, cz + 350]], x1 + 280, x1 + 900).color(trim));
add('air-inlet', alongX(ring(0, 330, x1 + 900, x1 + 930)).translate(0, 0, cz - 120).color('#1c1f22'));
for (let i = 0; i < 5; i++) add(`inlet-louvre-${i}`, blk(x1 + 925, -300, cz - 300 + i * 90, x1 + 960, 300, cz - 270 + i * 90).color(trim));
add('blower-motor', alongY(turned([[0, -280], [190, -280], [210, -240], [210, 160], [0, 160]])).translate(x1 + 600, 0, cz + 760).color(shell));
add('motor-cowl', alongY(turned([[0, -360], [150, -360], [200, -300], [200, -280], [0, -280]])).translate(x1 + 600, 0, cz + 760).color(trim));
add('flame-scanner', rod(30, 0, 120).rotateY(-60).translate(x1 + 400, -380, cz + 400).color(piping));
add('sight-port', alongX(rod(45, 0, 30)).translate(x1 + 900, 380, cz + 300).color(flameYellow));

// Control panel on the front of the burner housing.
add('control-panel', blk(x1 + 920, -540, cz + 80, x1 + 1050, -100, cz + 540).color(trim));
for (const [i, z] of [[0, cz + 420], [1, cz + 240]]) {
  add(`panel-gauge-bezel-${i}`, alongX(ring(0, 70, 0, 15)).translate(x1 + 1050, -400, z).color(piping));
  add(`panel-gauge-dial-${i}`, alongX(rod(60, 15, 18)).translate(x1 + 1050, -400, z).color(dial));
}
add('panel-display', blk(x1 + 1050, -280, cz + 300, x1 + 1058, -130, cz + 480).color('#1f3b4d'));
add('panel-lamp-green', alongX(rod(20, 0, 20)).translate(x1 + 1050, -240, cz + 180).color('#2f9e44'));
add('panel-lamp-red', alongX(rod(20, 0, 20)).translate(x1 + 1050, -170, cz + 180).color(valveRed));

// Gas train along the +Y side of the burner housing.
add('gas-train', alongX(rod(55, x1 - 600, x1 + 500)).translate(0, 700, cz - 300).color(piping));
add('gas-riser', rod(55, 300, cz - 300).translate(x1 - 600, 700, 0).color(piping));
add('gas-elbow', alongY(rod(55, 560, 700)).translate(x1 + 500, 0, cz - 300).color(piping));
for (const x of [x1 - 380, x1 - 120]) {
  add(`gas-valve-${x}`, blk(x - 80, 620, cz - 400, x + 80, 780, cz - 200).color(valveRed));
  add(`gas-actuator-${x}`, rod(60, cz - 200, cz - 60).translate(x, 700, 0).color(valveRed));
}
add('gas-regulator', turned([[0, -90], [140, -60], [140, 0], [0, 30]]).translate(x1 + 160, 700, cz - 120).color(piping));

// ---- Rear door and davit ----
add('rear-door', alongX(turned([[0, x0 - 260], [R - 140, x0 - 230], [R + 40, x0 - 120], [R + 40, x0], [0, x0]])).translate(0, 0, cz).color(trim));
add('rear-davit-post', rod(50, cz + 300, cz + R + 400).translate(x0 - 120, R - 100, 0).color(trim));
add('rear-davit-arm', blk(x0 - 600, R - 140, cz + R + 320, x0 - 80, R - 60, cz + R + 400).color(trim));
add('rear-sight-port', alongX(rod(40, x0 - 290, x0 - 260)).translate(0, 0, cz).color(flameYellow));

// ---- Stack off the rear smokebox with a rain cap ----
const sx = x0 + 450;
add('stack-collar', rod(380, cz + R - 100, cz + R + 200).translate(sx, 0, 0).color(trim));
add('stack', rod(320, cz + R + 200, cz + R + 2600).translate(sx, 0, 0).color(trim));
add('stack-flange', ring(320, 400, cz + R + 600, cz + R + 650).translate(sx, 0, 0).color(trim));
add('rain-cap', turned([[0, cz + R + 2800], [520, cz + R + 2650], [520, cz + R + 2680], [0, cz + R + 2860]]).translate(sx, 0, 0).color(trim));
for (const a of [0, 120, 240]) add(`rain-cap-strut-${a}`, blk(280, -15, cz + R + 2600, 320, 15, cz + R + 2700).rotateZ(a).translate(sx, 0, 0).color(trim));

// ---- Crown: main steam stop valve and twin safety valves ----
add('steam-nozzle', rod(130, cz + R - 50, cz + R + 280).color(piping));
add('steam-flange', rod(200, cz + R + 280, cz + R + 320).color(piping));
add('stop-valve-body', sphere(220).translate(0, 0, cz + R + 480).color(piping));
add('stop-valve-bonnet', rod(90, cz + R + 600, cz + R + 1050).color(piping));
add('stop-valve-handwheel', ring(200, 230, cz + R + 1050, cz + R + 1080).color(valveRed));
for (const a of [0, 90, 180, 270]) add(`handwheel-spoke-${a}`, blk(0, -12, cz + R + 1052, 210, 12, cz + R + 1078).rotateZ(a).color(valveRed));
add('steam-header', alongY(rod(130, 220, 900)).translate(0, 0, cz + R + 480).color(piping));
for (const x of [700, 1050]) {
  add(`safety-valve-inlet-${x}`, rod(80, cz + R - 50, cz + R + 220).translate(x, 0, 0).color(piping));
  add(`safety-valve-body-${x}`, turned([[0, 0], [130, 0], [130, 200], [70, 260], [70, 620], [40, 680], [0, 680]]).translate(x, 0, cz + R + 220).color(valveRed));
  add(`safety-valve-outlet-${x}`, alongY(rod(70, -350, 0)).translate(x, 0, cz + R + 320).color(piping));
  add(`safety-valve-lever-${x}`, blk(x - 10, -15, cz + R + 820, x + 220, 15, cz + R + 850).color(piping));
}

// ---- Water column on the +Y side: gauge glass, try cocks and level controls ----
const wx = 1200, wy = R + 260;
add('water-column', rod(70, cz - 300, cz + 800).translate(wx, wy, 0).color(piping));
for (const z of [cz - 250, cz + 750]) add(`column-tap-${z}`, alongY(rod(35, R - 80, wy)).translate(wx, 0, z).color(piping));
add('gauge-glass', blk(wx - 160, wy - 25, cz - 150, wx - 120, wy + 25, cz + 600).color(gaugeGlass));
for (const z of [cz - 170, cz + 620]) add(`gauge-cock-${z}`, blk(wx - 175, wy - 35, z - 30, wx - 105, wy + 35, z + 30).color(piping));
for (const z of [cz - 100, cz + 100, cz + 300]) add(`try-cock-${z}`, alongY(rod(18, 0, 120)).translate(wx + 60, wy + 30, z).color(piping));
add('level-control', blk(wx - 380, wy - 100, cz + 100, wx - 200, wy + 160, cz + 420).color(valveRed));
add('level-control-head', blk(wx - 400, wy - 120, cz + 420, wx - 180, wy + 180, cz + 520).color(valveRed));
add('blowdown-valve', blk(wx - 60, wy - 60, cz - 480, wx + 60, wy + 60, cz - 360).color(piping));
add('blowdown-pipe', rod(35, 300, cz - 480).translate(wx, wy, 0).color(piping));
add('pressure-gauge-bezel', ring(0, 110, 0, 25).rotateX(-90).translate(wx - 800, R - 10, cz + 650).color(piping));
add('pressure-gauge-dial', rod(95, 25, 28).rotateX(-90).translate(wx - 800, R - 10, cz + 650).color(dial));

// ---- Feedwater line with check and stop valves ----
add('feedwater-line', alongX(rod(55, -800, 600)).translate(0, R + 120, cz - 200).color(piping));
add('feedwater-tap', alongY(rod(55, R - 60, R + 120)).translate(-800, 0, cz - 200).color(piping));
add('feedwater-drop', rod(55, 300, cz - 200).translate(600, R + 120, 0).color(piping));
for (const x of [-500, -150]) add(`feed-valve-${x}`, sphere(95).translate(x, R + 120, cz - 200).color(piping));
add('feed-valve-wheel', ring(70, 90, 0, 18).rotateX(90).translate(-150, R + 260, cz - 200).color(valveRed));

return p.model();
