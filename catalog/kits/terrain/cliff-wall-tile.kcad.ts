// Original kernelCAD low-poly cliff wall tile: a 2 m x 2 m grass tile with a
// straight stepped rock cliff across its back, each step a jittered polygon
// lofted up and leaning back, topped by a grassy plateau that reaches the
// back and side edges. Its foot line and set-backs match the cliff corner
// tile, so straight runs and corners join on the 2 m grid.

meta({
  name: 'cliff-wall-tile',
  license: 'CC0-1.0',
  title: 'Cliff wall tile',
  description: 'Square 2 m terrain tile with a straight stepped, leaning rock cliff rising to a grassy plateau, matching the cliff corner tile. Knobs: cliff height, step count, rock, accent rock, grass and dirt colours.',
  tags: ['tile', 'cliff', 'wall', 'rock face', 'ledge', 'plateau', 'mountain', 'terrain', 'grid', 'level design'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'forest', 'desert'],
  triangleBudget: 400,
});

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
const front = -350;
const depth = 600 / ns;
const rise = (H - capT) / ns;

// Cliff face along y = f from x = -h to h, jittered in between, ends exact.
const footprint = (f: number, salt: number): [number, number][] => {
  const pts: [number, number][] = [];
  const segs = 6;
  for (let k = 0; k <= segs; k++) {
    const j = k === 0 || k === segs ? 0 : 60 * Math.sin(k * 2.7 + salt * 1.9);
    pts.push([-h + (S * k) / segs, f + j]);
  }
  pts.push([h, h], [-h, h]);
  return pts;
};
const ring = (pts: [number, number][]) => {
  let p = path().moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) p = p.lineTo(pts[k][0], pts[k][1]);
  return p.close();
};

const tile = assembly('cliff-wall-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
tile.part('grass', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).color(grass));
for (let i = 0; i < ns; i++) {
  const f = front + i * depth;
  const zTop = (i + 1) * rise + (i === ns - 1 ? 0 : 30 * Math.sin(i * 2.2));
  const z0 = i === 0 ? 0 : i * rise - 60;
  tile.part(`rock-${i + 1}`, ring(footprint(f - 20, i + 1)).loft(ring(footprint(f + depth * 0.55, i + 5)), {
    planes: [
      { plane: 'XY', origin: [0, 0, z0] },
      { plane: 'XY', origin: [0, 0, zTop] },
    ],
    ruled: true,
  }).color(i % 2 === 0 ? rockC : rock2));
}
const fTop = front + (ns - 1) * depth - 25;
tile.part('ledge', box(S, h - fTop, capT, true).translate(0, (h + fTop) / 2, H - capT / 2).color(grass));

// Fallen boulders at the cliff foot.
const boulder = (r: number, rot: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < 6; k++) {
    const a = (2 * Math.PI * k) / 6;
    const rr = r * (0.8 + 0.25 * Math.sin(k * 2.1 + rot));
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  let q = path().moveTo(r * 0.45 * Math.cos(rot), r * 0.45 * Math.sin(rot));
  for (let k = 1; k < 5; k++) q = q.lineTo(r * 0.45 * Math.cos(rot + (2 * Math.PI * k) / 5), r * 0.45 * Math.sin(rot + (2 * Math.PI * k) / 5));
  return p.close().loft(q.close(), { spacing: r * 0.8, ruled: true });
};
const boulders: [number, number, number][] = [[-560, -620, 220], [-220, -760, 140], [480, -640, 170]];
boulders.forEach(([x, y, r], i) => {
  tile.part(`boulder-${i + 1}`, boulder(r, i).translate(x, y, t - 25).color(i % 2 === 0 ? rock2 : rockC));
});

return tile.model();
