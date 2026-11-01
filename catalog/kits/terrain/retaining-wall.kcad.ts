// Original kernelCAD low-poly retaining wall tile: a 2 m x 2 m tile split by
// a wall across its middle - low ground at the 0.2 m tile height in front
// (-Y) and a raised grass terrace behind - faced with coursed stone, a
// timber log crib or wire gabion baskets. The terrace top is level with the
// stone platform and the back edge of the ramp and stair tiles of the same rise.

meta({
  name: 'retaining-wall',
  license: 'CC0-1.0',
  title: 'Retaining wall tile',
  description: 'Square 2 m terrace tile with a retaining wall holding a raised grass level behind lower ground, faced in stone, timber logs or gabion baskets. Knobs: rise, style, facing, accent, grass and dirt colours.',
  tags: ['tile', 'retaining wall', 'terrace', 'wall', 'ledge', 'gabion', 'timber', 'stone', 'level design', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'town', 'village', 'farm', 'garden'],
  triangleBudget: 900,
});

const riseM = param('riseM', '1', { choices: ['0.5', '1', '2'], label: 'Rise (m)' });
const style = param('style', 'stone', { choices: ['stone', 'timber', 'gabion'], label: 'Wall style' });
const facing = param('facing', '#a39d92', { label: 'Wall facing' });
const accent = param('accent', '#8a847a', { label: 'Accent' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt' });

presets({
  timber: { style: 'timber', facing: '#8a6240', accent: '#6a4a30' },
  gabion: { style: 'gabion', facing: '#9a9a96', accent: '#6f706c' },
  sandstone: { facing: '#d6b886', accent: '#c4a172' },
});

const S = 2000;
const h = S / 2;
const t = 200;
const skirtH = t * 0.7;
const R = Number(riseM.value) * 1000;
const top = t + R;
const wf = -120; // wall front face (y)
const wt = 280; // wall thickness

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const tile = assembly('retaining-wall');
// Low ground in front.
tile.part('dirt-low', blk(-h, -h, 0, h, wf + 10, skirtH).color(dirt));
tile.part('grass-low', blk(-h, -h, skirtH - 5, h, wf + 10, t).color(grass));
// Raised terrace behind the wall.
tile.part('earth', blk(-h, wf + wt - 10, 0, h, h, top - 60).color(dirt));
tile.part('grass-high', blk(-h, wf + 40, top - 62, h, h, top).color(grass));

let k = 0;
if (style.value === 'stone') {
  const courses = Math.max(2, Math.round((top - 60) / 260));
  const ch = (top - 60) / courses;
  const g = 22;
  tile.part('core', blk(-h + 5, wf + 20, 0, h - 5, wf + wt, top - 62).color(accent));
  for (let c = 0; c < courses; c++) {
    const cuts = c % 2 === 0 ? [-h, -h / 2, 0, h / 2, h] : [-h, -3 * h / 4, -h / 4, h / 4, 3 * h / 4, h];
    for (let i = 0; i < cuts.length - 1; i++) {
      k++;
      const x0 = cuts[i] + (i === 0 ? 0 : g / 2);
      const x1 = cuts[i + 1] - (i === cuts.length - 2 ? 0 : g / 2);
      const z0 = c * ch + (c === 0 ? 0 : g / 2);
      const z1 = (c + 1) * ch - g / 2;
      tile.part(`stone-${k}`, blk(x0, wf + 10 * (0.5 + 0.5 * Math.sin(k * 7.1)), z0, x1, wf + 140, z1).color(k % 3 === 0 ? accent : facing));
    }
  }
  tile.part('coping', blk(-h, wf - 30, top - 62, h, wf + wt, top - 10).color(accent));
} else if (style.value === 'timber') {
  // Stacked horizontal logs with square ends, posts every metre.
  const d = 180;
  const n = Math.ceil(top / d);
  for (let i = 0; i < n; i++) {
    k++;
    const z0 = i * d;
    const z1 = Math.min(top - 20, z0 + d - 8);
    if (z1 <= z0) break;
    tile.part(`log-${k}`, blk(-h, wf + 15 * Math.sin(i * 2.3) + 10, z0, h, wf + d, z1).color(k % 2 === 0 ? accent : facing));
  }
  for (const x of [-h + 60, 0, h - 60]) {
    tile.part(`post-${x}`, blk(x - 60, wf - 70, 0, x + 60, wf + 50, top + 60).color(accent));
  }
  tile.part('backfill', blk(-h + 5, wf + d - 5, 0, h - 5, wf + wt, top - 62).color(dirt));
} else {
  // Gabions: wire baskets of stone, a grid of boxes stepping back slightly.
  const bh = Math.min(500, (top - 40) / Math.max(1, Math.round((top - 40) / 500)));
  const rows = Math.round((top - 40) / bh);
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < 2; i++) {
      k++;
      const x0 = i === 0 ? -h + 2 : 10;
      const x1 = i === 0 ? -10 : h - 2;
      const y0 = wf + r * 25;
      tile.part(`gabion-${k}`, blk(x0, y0, r * bh + (r === 0 ? 0 : 5), x1, y0 + wt, (r + 1) * bh).color(k % 2 === 0 ? accent : facing));
      // Wire mesh hint: thin vertical straps on the front face.
      for (let m = 1; m < 4; m++) {
        tile.part(`strap-${k}-${m}`, blk(x0 + ((x1 - x0) * m) / 4 - 10, y0 - 8, r * bh + 5, x0 + ((x1 - x0) * m) / 4 + 10, y0 + 2, (r + 1) * bh - 5).color(accent));
      }
    }
  }
}

return tile.model();
