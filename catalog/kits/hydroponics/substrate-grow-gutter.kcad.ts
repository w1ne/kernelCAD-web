// SPDX-License-Identifier: CC0-1.0
// Substrate grow gutter: the raised steel channel that carries a row of
// rockwool or coir slabs in a high-wire tomato or cucumber greenhouse,
// catching the drain water and leading it to one end.
// What makes it a grow gutter: a long galvanised channel with flared
// sides, rolled lips and a V drain groove, sitting in cradles on three
// stands; white-wrapped slabs in the channel with propagation cubes and
// young plants on top; a black feed line with a drip stake into every
// cube; and a closed end cap at one end and a drain outlet dropping into
// a PVC collection pipe at the other.
// Generic visualization geometry at about real size (2.6 m long, channel
// at 0.8 m), millimetres, Z up, front -Y.

meta({
  name: "substrate-grow-gutter",
  license: 'CC0-1.0',
  title: "Substrate grow gutter",
  description: "Raised greenhouse substrate gutter at about real size: galvanised channel with flared sides, lips and V drain groove on three cradle stands, film-wrapped slabs with propagation cubes and young plants, black feed line with drip stakes, end cap and drain outlet into a PVC collection pipe. Material controls: gutter steel, slab wrap, substrate and crop, plus plants (young or none). rockwool, coir, weathered and highVisibility presets.",
  tags: ['grow gutter', 'substrate', 'rockwool', 'coir', 'drip irrigation', 'high wire', 'greenhouse', 'hydroponics', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 2800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const gutter = param('gutterSteel', '#b3b9bc', { label: 'Gutter and stands (galvanised steel)' });
const wrap = param('slabWrap', '#f2f1ec', { label: 'Slab wrap (white film)' });
const substrate = param('substrate', '#c9b98a', { label: 'Propagation cubes (rockwool or coir)' });
const crop = param('crop', '#4f9a3a', { label: 'Young plants' });
const plants = param('plants', 'young', { choices: ['young', 'none'], label: 'Plants' });

presets({
  rockwool: { gutterSteel: '#b3b9bc', slabWrap: '#f2f1ec', substrate: '#c9b98a', crop: '#4f9a3a' },
  coir: { gutterSteel: '#aab0b3', slabWrap: '#e6e4dc', substrate: '#7a5435', crop: '#5ea343' },
  weathered: { gutterSteel: '#8a8e8a', slabWrap: '#cfccbf', substrate: '#a8976c', crop: '#6c8c45' },
  highVisibility: { gutterSteel: '#e87832', slabWrap: '#ffffff', substrate: '#f2c84b', crop: '#5fbf3a' },
});

const p = assembly("substrate-grow-gutter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 12) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
// Extrude a (y, z) side profile along X, centred on x = 0.
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts: [number, number][], seg = 10) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

const L = 2600, Z0 = 800;
// Galvanised channel: flared sides, rolled lips, V drain groove in the floor.
const channel: [number, number][] = [
  [-166, 62], [-158, 12], [-16, 12], [0, 0], [16, 12], [158, 12], [166, 62],
  [178, 62], [178, 70], [160, 70], [152, 18], [16, 18], [0, 6], [-16, 18], [-152, 18], [-160, 70], [-178, 70], [-178, 62],
];
add("gutter", profileYZ(channel, L).translate(0, 0, Z0).color(gutter));
const capOutline: [number, number][] = [[-166, 62], [-158, 12], [-16, 12], [0, 0], [16, 12], [158, 12], [166, 62]];
add("end-cap", profileYZ(capOutline, 6).translate(L / 2 + 3, 0, Z0).color(gutter));

// Stands: foot plate, post, cradle with side arms.
for (const x of [-1000, 0, 1000]) {
  add(`stand-foot-${x}`, blk(x, 0, 0, 260, 300, 10).color(gutter));
  add(`stand-post-${x}`, blk(x, 0, 10, 60, 60, Z0 - 50).color(gutter));
  add(`cradle-${x}`, blk(x, 0, Z0 - 40, 80, 380, 40).color(gutter));
  for (const y of [-180, 180]) add(`cradle-arm-${x}-${y}`, blk(x, y, Z0 - 40, 80, 20, 130).color(gutter));
}

// Two film-wrapped slabs, propagation cubes and young plants.
const SZ = Z0 + 18;
for (const [s, cx] of [[0, -620], [1, 620]] as [number, number][]) {
  add(`slab-${s}`, extrudeRoundedRect(220, 75, 12, 1150, { axis: 'y' }).rotateZ(90).translate(cx + 575, 0, SZ + 37.5).color(wrap));
  add(`slab-print-${s}`, blk(cx, -111, SZ + 20, 700, 2, 35).color('#2d2f31'));
  for (let i = 0; i < 4; i++) {
    const x = cx - 420 + i * 280;
    add(`cube-${s}-${i}`, blk(x, 0, SZ + 75, 100, 100, 65).color(substrate));
    if (plants.value === 'young') {
      add(`stem-${s}-${i}`, cylZ(x, 0, SZ + 140, 70, 6, 6).color('#3f7a2e'));
      add(`leaves-${s}-${i}`, turned([[0, 0], [90, 20], [115, 50], [70, 90], [0, 110]]).translate(x, 0, SZ + 175).color(crop));
    }
    // Drip stake from the feed line into the cube.
    add(`drip-tube-${s}-${i}`, blk(x + 20, -95, SZ + 150, 6, 110, 6).color('#1e2023'));
    add(`drip-stake-${s}-${i}`, cylZ(x + 20, -40, SZ + 110, 46, 4, 6).color('#1e2023'));
  }
}
// Black PE feed line along the front lip, on clips.
add("feed-line", cylX(-L / 2, -150, SZ + 140, L - 60, 10, 10).color('#1e2023'));
for (const x of [-1000, 0, 1000]) add(`feed-clip-${x}`, blk(x, -165, Z0 + 60, 30, 30, 90).color('#1e2023'));

// Drain outlet at the -X end into a PVC collection pipe.
add("drain-spout", cylZ(-L / 2 + 70, 0, Z0 - 120, 125, 22, 12).color(gutter));
add("collection-funnel", turned([[30, 0], [60, 40], [60, 52], [26, 12], [26, 0]], 14).translate(-L / 2 + 70, 0, Z0 - 230).color('#7f878b'));
add("collection-pipe", cylZ(-L / 2 + 70, 0, 30, Z0 - 260, 30, 14).color('#7f878b'));
add("collection-elbow", blk(-L / 2 + 70, 60, 0, 70, 180, 70).color('#7f878b'));
add("collection-run", cylinder(L - 300, 32, 14).rotateY(90).translate(-L / 2 + 70, 120, 35).color('#7f878b'));

return p.model();
