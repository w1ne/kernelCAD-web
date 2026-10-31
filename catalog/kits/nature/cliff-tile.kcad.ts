// Original kernelCAD low-poly cliff tile: a 2 m x 2 m grass tile with a
// stepped rock face rising across its back half to a grassy plateau. The rock
// is three side-by-side extrusions of jittered stepped profiles, so the face
// is broken into irregular facets rather than one straight wall.

meta({
  name: 'cliff-tile',
  title: 'Cliff tile',
  description: 'Square 2 m terrain tile with a stepped faceted rock cliff rising to a grassy ledge at the back. Knobs: cliff height, step count, rock, grass and dirt colours.',
  tags: ['tile', 'cliff', 'rock face', 'ledge', 'mountain', 'terrain', 'grid', 'nature'],
  kit: 'nature',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'forest', 'desert'],
  triangleBudget: 320,
});

const heightM = param('heightM', '2', { choices: ['1', '2', '3'], label: 'Cliff height (m)' });
const steps = param('steps', '3', { choices: ['2', '3', '4'], label: 'Rock steps' });
const rockC = param('rock', '#8a8580', { label: 'Rock' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  desert: { rock: '#b8724a', grass: '#d8b77a', dirt: '#9a6a44' },
  snowy: { rock: '#6f747a', grass: '#eef3f6' },
});

const S = 2000;
const t = 200;
const skirtH = t * 0.7;
const H = Number(heightM.value) * 1000;
const ns = Number(steps.value);
const capT = 120;
const front = -350; // where the cliff foot meets the ground (y)

// Stepped profile in (y, z): steep risers and short tilted treads, jittered
// per slice so neighbouring slices do not line up exactly.
const depth = (S / 2 - front) / ns;
const rise = (H - capT) / ns;
const profile = (salt: number): [number, number][] => {
  const j = (k: number) => Math.sin(k * 3.1 + salt * 1.7);
  const pts: [number, number][] = [[front + 50 * j(0), 0]];
  for (let i = 0; i < ns; i++) {
    const y0 = front + i * depth;
    const zTop = (i + 1) * rise;
    pts.push([y0 + depth * 0.18 + 35 * j(i + 1), zTop + (i === ns - 1 ? 0 : 30 * j(i + 9))]);
    if (i < ns - 1) pts.push([y0 + depth * 0.9 + 40 * j(i + 5), zTop - 40 + 30 * j(i + 13)]);
  }
  pts.push([S / 2, H - capT]);
  pts.push([S / 2, 0]);
  return pts;
};
// Extrude a (y, z) profile along X over [x0, x0 + len].
const slab = (pts: [number, number][], x0: number, len: number) =>
  extrudePolygon(pts, len).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const tile = assembly('cliff-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
tile.part('grass', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).color(grass));
const widths = [700, 650, 650];
let x = -S / 2;
widths.forEach((wd, i) => {
  tile.part(`rock-${i + 1}`, slab(profile(i + 1), x, wd).color(rockC));
  x += wd;
});
// Grassy plateau cap on the top step.
const capFront = front + depth * (ns - 1) + depth * 0.18 + 20;
tile.part('ledge', box(S, S / 2 - capFront, capT, true).translate(0, (S / 2 + capFront) / 2, H - capT / 2).color(grass));

return tile.model();
