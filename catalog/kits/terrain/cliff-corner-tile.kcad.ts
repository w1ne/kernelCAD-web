// Original kernelCAD low-poly cliff corner tile: a 2 m x 2 m grass tile with
// a stepped rock cliff turning a corner: inner (the default: a grassy plateau
// over three quarters of the tile, wrapping round a low front-left notch) or
// outer (a broad bluff filling the back-right of the tile). Each rock step
// is a jittered polygon extruded up from the ground, set back as it climbs, so
// the faces break into irregular facets. The cliff foot sits 0.35 m in front
// of the tile centre, like the nature cliff tile, so the two join on a 2 m grid.

meta({
  name: 'cliff-corner-tile',
  license: 'CC0-1.0',
  title: 'Cliff corner tile',
  description: 'Square 2 m terrain tile with a stepped faceted rock cliff turning an outer or inner corner up to a grassy ledge; matches the straight cliff tile. Knobs: corner type (inner or outer), cliff height, step count, rock, grass and dirt colours.',
  tags: ['tile', 'cliff', 'corner', 'rock face', 'ledge', 'mountain', 'terrain', 'grid', 'level design'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'forest', 'desert'],
  triangleBudget: 500,
});

const corner = param('corner', 'inner', { choices: ['inner', 'outer'], label: 'Corner' });
const heightM = param('heightM', '2', { choices: ['1', '2', '3'], label: 'Cliff height (m)' });
const steps = param('steps', '3', { choices: ['2', '3', '4'], label: 'Rock steps' });
const rockC = param('rock', '#8a8580', { label: 'Rock' });
const rock2 = param('rock2', '#77726d', { label: 'Rock accent' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  desert: { rock: '#b8724a', rock2: '#a5633f', grass: '#d8b77a', dirt: '#9a6a44' },
  snowy: { rock: '#6f747a', rock2: '#5f646a', grass: '#eef3f6' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const H = Number(heightM.value) * 1000;
const ns = Number(steps.value);
const capT = 120;
const outer = corner.value === 'outer';
const front = -350;
// Total set-back of the face from foot to ledge; the outer corner keeps it
// small so its plateau stays broad instead of tapering into a pillar.
const depth = (outer ? 240 : 600) / ns;
const rise = (H - capT) / ns;

// Points along a face from a to b with perpendicular jitter (not at the ends).
const face = (a: [number, number], b: [number, number], salt: number, amp: number): [number, number][] => {
  const pts: [number, number][] = [];
  const segs = 4;
  const nx = -(b[1] - a[1]);
  const ny = b[0] - a[0];
  const nl = Math.hypot(nx, ny);
  for (let k = 0; k < segs; k++) {
    const u = k / segs;
    const j = k === 0 ? 0 : amp * Math.sin(k * 2.7 + salt * 1.9);
    pts.push([a[0] + (b[0] - a[0]) * u + (j * nx) / nl, a[1] + (b[1] - a[1]) * u + (j * ny) / nl]);
  }
  return pts;
};
// Footprint of the rock at set-back f (its faces lie on x = f and y = f).
const footprint = (f: number, salt: number): [number, number][] => {
  const amp = 60;
  if (outer) {
    return [...face([h, f], [f, f], salt, amp), ...face([f, f], [f, h], salt + 3, amp), [h, h]];
  }
  return [...face([-h, f], [f, f], salt, amp), ...face([f, f], [f, -h], salt + 3, amp), [h, -h], [h, h], [-h, h]];
};

const tile = assembly('cliff-corner-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
tile.part('grass', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).color(grass));
for (let i = 0; i < ns; i++) {
  const f = front + i * depth;
  const zTop = (i + 1) * rise + (i === ns - 1 ? 0 : 30 * Math.sin(i * 2.2));
  // Each step leans back: a ruled loft from its foot outline to a set-back top.
  const z0 = i === 0 ? 0 : i * rise - 60;
  const lean = depth * (outer ? 0.4 : 0.55);
  const step = footprint(f - 20, i + 1);
  const topPts = footprint(f + lean, i + 5);
  const ring = (pts: [number, number][]) => {
    let p = path().moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) p = p.lineTo(pts[k][0], pts[k][1]);
    return p.close();
  };
  tile.part(`rock-${i + 1}`, ring(step).loft(ring(topPts), {
    planes: [
      { plane: 'XY', origin: [0, 0, z0] },
      { plane: 'XY', origin: [0, 0, zTop] },
    ],
    ruled: true,
  }).color(i % 2 === 0 ? rockC : rock2));
}
// Fallen boulders at the cliff foot.
const pebble = (r: number, rot: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < 6; k++) {
    const a = (2 * Math.PI * k) / 6;
    const rr = r * (0.8 + 0.25 * Math.sin(k * 2.1 + rot));
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close().loft(ngon3(r * 0.45, rot), { spacing: r * 0.8, ruled: true });
};
const ngon3 = (r: number, rot: number) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < 5; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / 5), r * Math.sin(rot + (2 * Math.PI * k) / 5));
  return p.close();
};
const boulders: [number, number, number][] = outer
  ? [[-520, -560, 230], [180, -660, 170], [-660, 150, 150]]
  : [[-620, -600, 230], [-300, -740, 150], [-740, -280, 170]];
boulders.forEach(([x, y, r], i) => {
  tile.part(`boulder-${i + 1}`, pebble(r, i).translate(x, y, t - 25).color(i % 2 === 0 ? rock2 : rockC));
});
const fTop = front + (ns - 1) * depth - 25; // grass lip overhangs the top step
const capPts: [number, number][] = outer
  ? [[h, fTop], [fTop, fTop], [fTop, h], [h, h]]
  : [[-h, fTop], [fTop, fTop], [fTop, -h], [h, -h], [h, h], [-h, h]];
tile.part('ledge', extrudePolygon(capPts, capT).translate(0, 0, H - capT).color(grass));

return tile.model();
