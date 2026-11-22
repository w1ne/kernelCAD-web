// SPDX-License-Identifier: CC0-1.0
// Deck-mounted laboratory mixing faucet with a swing gooseneck.
// What makes it a lab faucet rather than a kitchen tap: a high rigid gooseneck
// spout ending in a serrated hose-barb nozzle (so tubing can be pushed on), a
// horizontal cross body with two separate valve bodies, wrist-blade handles you
// can work with an elbow, and coloured hot and cold index buttons, all on a
// round bench flange.
// Generic visualization geometry at real size (about 410 mm across the handles, 400 mm
// tall), millimetres, Z up, spout reaching towards -Y, bench top on z = 0.
meta({
  name: 'laboratory-faucet-set',
  license: 'CC0-1.0',
  title: 'Laboratory faucet set',
  description: 'Deck-mounted laboratory mixing faucet: round bench flange, riser and horizontal cross body with two valve bodies, high gooseneck spout with serrated hose-barb nozzle, wrist-blade or four-arm handles with hot and cold index buttons. Material controls: chrome-plated brass, handle polymer, hot index enamel, cold index enamel. Cleanroom and high-visibility presets.',
  tags: ['lab faucet', 'gooseneck faucet', 'laboratory tap', 'mixing faucet', 'hose barb', 'laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const handles = param('handles', 'wrist-blade', { choices: ['wrist-blade', 'four-arm'], label: 'Handle style' });
const stainless = param('stainless', '#c3cdd1', { label: 'Chrome-plated brass' });
const polymer = param('polymer', '#2c3439', { label: 'Handle polymer' });
const hotIndex = param('hotIndex', '#d2382c', { label: 'Hot index button enamel' });
const coldIndex = param('coldIndex', '#2f6fc8', { label: 'Cold index button enamel' });
presets({
  cleanroom: { stainless: '#d0d9d8', polymer: '#eef2ef', hotIndex: '#e06a5a', coldIndex: '#23a5a2' },
  highVisibility: { stainless: '#6f8488', polymer: '#ffe000', hotIndex: '#ff3b1f', coldIndex: '#1f62ff' },
});

const p = assembly('laboratory-faucet-set');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z, optionally only a sector.
const turned = (pts, angleDeg) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return angleDeg ? pb.close().revolve({ angleDeg }) : pb.close().revolve();
};
const circle = (r, n, cx = 0, cy = 0) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

const RISER_TOP = 270;
const R = 115;

// Bench flange, riser and the horizontal cross body.
add('bench-flange', turned([[0, 0], [48, 0], [48, 8], [30, 18], [0, 18]]).color(stainless));
add('riser', turned([[0, 18], [17, 18], [17, RISER_TOP], [0, RISER_TOP]]).color(stainless));
add('riser-collar', turned([[0, 0], [24, 0], [24, 30], [0, 30]]).translate(0, 0, RISER_TOP - 30).color(stainless));
add('centre-body', turned([[0, 0], [28, 0], [28, 70], [0, 70]]).translate(0, 0, 90).color(stainless));
add('cross-body', turned([[0, -110], [13, -110], [13, 110], [0, 110]]).rotateY(90).translate(0, 0, 125).color(stainless));

// High gooseneck: a half-torus of revolved tube from the riser top out to the front.
const gooseneck = turned(circle(14, 10, R, 0), 180).rotateX(90).rotateZ(90).translate(0, -R, RISER_TOP);
add('gooseneck', gooseneck.color(stainless));
// Serrated hose-barb nozzle pointing down.
add('hose-barb', turned([
  [0, 0], [14, 0], [14, -14], [9, -18], [12, -32], [7, -36], [10, -50], [6, -54], [8, -66], [5, -72], [0, -72],
]).translate(0, -2 * R, RISER_TOP).color(stainless));

// Valve bodies, handles and index buttons on each side.
for (const [side, index] of [[-1, hotIndex], [1, coldIndex]]) {
  const x = side * 110;
  add(`valve-body-${side}`, turned([[0, 0], [24, 0], [24, 60], [18, 70], [0, 70]]).translate(x, 0, 95).color(stainless));
  add(`valve-bonnet-${side}`, turned([[0, 0], [14, 0], [14, 26], [0, 26]]).translate(x, 0, 165).color(stainless));
  const HZ = 191;
  if (handles.value === 'wrist-blade') {
    add(`handle-hub-${side}`, turned([[0, 0], [22, 0], [22, 22], [0, 22]]).translate(x, 0, HZ).color(polymer));
    const blade = extrudePolygon([[0, -15], [130, -9], [150, -4], [154, 0], [150, 4], [130, 9], [0, 15]], 12);
    add(`wrist-blade-${side}`, blade.rotateY(-12).rotateZ(-90 + side * 40).translate(x, 0, HZ + 4).color(polymer));
  } else {
    add(`handle-hub-${side}`, turned([[0, 0], [20, 0], [20, 26], [0, 26]]).translate(x, 0, HZ).color(polymer));
    for (let k = 0; k < 4; k += 1) {
      const arm = extrudePolygon(circle(8, 6), 60).rotateY(90).rotateZ(45 + k * 90);
      add(`handle-arm-${side}-${k}`, arm.translate(x, 0, HZ + 13).color(polymer));
    }
  }
  add(`index-button-${side}`, turned([[0, 0], [16, 0], [16, 4], [10, 9], [0, 9]]).translate(x, 0, HZ + 22).color(index));
}

return p.model();
