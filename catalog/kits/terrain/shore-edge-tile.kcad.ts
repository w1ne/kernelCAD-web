// Original kernelCAD low-poly shore tile: a 2 m x 2 m tile whose back is grass
// at the 0.2 m tile height, sloping through a sandy beach into shallow water
// along the front (-Y) edge. The beach is three side-by-side slope slices with
// different set-backs, so the waterline and grass edge zigzag naturally.

meta({
  name: 'shore-edge-tile',
  license: 'CC0-1.0',
  title: 'Shore edge tile',
  description: 'Square 2 m coastline tile with grass at the back, a sloping sandy beach and shallow water along the front edge, plus optional rocks. Knobs: beach width, rock count, grass, sand, water and rock colours.',
  tags: ['tile', 'shore', 'beach', 'coast', 'water', 'lake', 'sea', 'sand', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'beach', 'meadow'],
  triangleBudget: 300,
});

const beach = param('beach', 'medium', { choices: ['narrow', 'medium', 'wide'], label: 'Beach width' });
const rocks = param('rocks', '2', { choices: ['0', '1', '2', '3'], label: 'Rocks' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const sand = param('sand', '#e2cb92', { label: 'Sand' });
const water = param('water', '#3f8fc4', { label: 'Water' });
const rockC = param('rock', '#8a8d91', { label: 'Rocks' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  tropical: { water: '#38b8c8', sand: '#f2e2b0', grass: '#5fae3e' },
  lake: { water: '#4a7f9a', sand: '#b9a27a', grass: '#5c8f3a' },
  icy: { water: '#cfe6f2', sand: '#b9c4cc', grass: '#eef3f6' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const bedZ = 50;
const waterTop = t - 55; // same level as the nature water tile
const bw = beach.value === 'narrow' ? 450 : beach.value === 'wide' ? 1050 : 750;

// Extrude a (y, z) profile along +X over [x0, x0 + len].
const slab = (pts: [number, number][], x0: number, len: number) =>
  extrudePolygon(pts, len).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const tile = assembly('shore-edge-tile');
const widths = [700, 620, 680];
const shifts = [0, 140, -90];
let x = -h;
widths.forEach((wd, i) => {
  // Grass edge at yG; the dry beach falls gently to the waterline, then more
  // steeply to the sea bed at yB.
  const yG = h - 600 - bw * 0.5 + shifts[i];
  const yB = yG - bw;
  tile.part(`dirt-${i + 1}`, slab([[yG - 40, 0], [h, 0], [h, skirtH], [yG - 40, skirtH]], x, wd).color(dirt));
  tile.part(`grass-${i + 1}`, slab([[yG, skirtH - 5], [h, skirtH - 5], [h, t], [yG + 30, t]], x, wd).color(grass));
  tile.part(`beach-${i + 1}`, slab([[-h, 0], [yG, 0], [yG, t - 15], [yG - bw * 0.6, waterTop + 5], [yB, bedZ], [-h, bedZ]], x, wd).color(sand));
  x += wd;
});
// Water: one flat sheet at the pond level. It reaches to the furthest
// waterline; where a slice's beach rises above it the sand hides the sheet,
// so each slice gets its own waterline and the shore zigzags.
const yW = h - 600 - bw * 0.5 + Math.max(...shifts) - bw * 0.62;
tile.part('water', box(S, yW + h, waterTop - bedZ + 5, true).translate(0, (yW - h) / 2, (waterTop + bedZ - 5) / 2).color(water));

const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    const rr = r * (0.82 + 0.25 * Math.sin(k * 2.6 + rot));
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};
const spots: [number, number, number][] = [[-560, -280, 200], [520, -620, 150], [180, 80, 110]];
for (let i = 0; i < Number(rocks.value); i++) {
  const [rx, ry, r] = spots[i];
  tile.part(`rock-${i + 1}`, ngon(r, 7, i).loft(ngon(r * 0.5, 5, i + 0.4), { spacing: r * 0.9, ruled: true })
    .translate(rx, ry, bedZ - 10).color(rockC));
}

return tile.model();
