// Original kernelCAD low-poly ramp tile: a 2 m x 2 m earth wedge that climbs
// from the 0.2 m tile height at the front (-Y) to a raised back edge, with a
// grass skin over dirt and an optional footpath up the middle. Joins flat
// tiles in front and raised plateau or cliff tops behind on a 2 m grid.

meta({
  name: 'ramp-tile',
  license: 'CC0-1.0',
  title: 'Ramp tile',
  description: 'Square 2 m grassy slope tile rising from ground height at the front to a raised back edge, with an optional dirt or stone footpath. Knobs: rise, footpath, rock count, grass, dirt, footpath and rock colours.',
  tags: ['tile', 'ramp', 'slope', 'incline', 'hill', 'grass', 'terrain', 'grid', 'level design'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'meadow', 'forest'],
  triangleBudget: 300,
});

const riseM = param('riseM', '1', { choices: ['0.5', '1', '2'], label: 'Rise (m)' });
const track = param('track', 'dirt', { choices: ['none', 'dirt', 'stone'], label: 'Footpath' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt' });
const trackC = param('trackColor', '#b48a5a', { label: 'Footpath' });
const rocks = param('rocks', '3', { choices: ['0', '2', '3', '4'], label: 'Rocks' });
const rockC = param('rock', '#8a8d91', { label: 'Rocks' });

presets({
  dry: { grass: '#b3a456', dirt: '#8f6a43', trackColor: '#d2b07a' },
  snowy: { grass: '#eef3f6', dirt: '#6f5a48', trackColor: '#b9a58e' },
  stone: { track: 'stone', trackColor: '#9a9a96' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skin = 60;
const H = Number(riseM.value) * 1000;

// Extrude a (y, z) profile along +X over [x0, x0 + len].
const slab = (pts: [number, number][], x0: number, len: number) =>
  extrudePolygon(pts, len).rotateX(90).rotateZ(90).translate(x0, 0, 0);
// Height of the slope top at y.
const top = (y: number) => t + (H * (y + h)) / S;

const tile = assembly('ramp-tile');
tile.part('dirt', slab([[-h, 0], [h, 0], [h, top(h) - skin], [-h, top(-h) - skin]], -h, S).color(dirt));
tile.part('grass', slab([[-h, top(-h) - skin - 5], [h, top(h) - skin - 5], [h, top(h)], [-h, top(-h)]], -h, S).color(grass));

if (track.value !== 'none') {
  const w = 380;
  const lift = 8;
  if (track.value === 'dirt') {
    // Meandering dirt track: overlapping slope strips, each nudged sideways.
    const n = 4;
    const len = S / n;
    for (let i = 0; i < n; i++) {
      const y0 = -h + i * len - (i > 0 ? 60 : 0);
      const y1 = Math.min(h, -h + (i + 1) * len);
      const dx = 140 * Math.sin(i * 1.9 + 0.4);
      const ww = w * (0.85 + 0.15 * Math.cos(i * 2.3));
      tile.part(`track-${i + 1}`, slab([[y0, top(y0) - 20], [y1, top(y1) - 20], [y1, top(y1) + lift + i], [y0, top(y0) + lift + i]], dx - ww, 2 * ww)
        .color(trackC));
    }
  } else {
    // Stone track: separate flat-topped slabs stepping up the slope.
    const n = 5;
    const len = S / n;
    for (let i = 0; i < n; i++) {
      const y0 = -h + i * len + 20;
      const y1 = y0 + len - 40;
      tile.part(`slab-${i + 1}`, slab([[y0, top(y0) - 30], [y1, top(y1) - 30], [y1, top(y1) + 14], [y0, top(y0) + 14]], -w + 30 * Math.sin(i), 2 * w - 60)
        .color(trackC));
    }
  }
}

// Rocks half-buried in the slope beside the path.
const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    const rr = r * (0.85 + 0.2 * Math.sin(k * 2.9 + rot));
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
const spots: [number, number, number][] = [[-700, -450, 150], [690, 280, 120], [-640, 620, 95], [720, -700, 85]];
for (let i = 0; i < Number(rocks.value); i++) {
  const [x, y, r] = spots[i];
  tile.part(`rock-${i + 1}`, ngon(r, 6, i).loft(ngon(r * 0.45, 5, i + 0.5), { spacing: r * 0.85, ruled: true })
    .translate(x, y, top(y) - r * 0.3).color(rockC));
}

return tile.model();
