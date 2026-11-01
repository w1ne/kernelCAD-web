// Original kernelCAD low-poly rocky ground tile: a 2 m x 2 m tile of sparse
// grass over dirt, with flat gravel patches and a scatter of half-buried
// faceted rocks of mixed sizes. Edges sit at the 0.2 m tile height.

meta({
  name: 'rocky-ground-tile',
  license: 'CC0-1.0',
  title: 'Rocky ground tile',
  description: 'Square 2 m rough ground tile with gravel patches and a scatter of half-buried faceted rocks. Knobs: rock count, gravel patches, ground, gravel, rock, accent rock and dirt colours.',
  tags: ['tile', 'rocky', 'rocks', 'gravel', 'scree', 'rough ground', 'mountain', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'mountain', 'desert', 'forest'],
  triangleBudget: 500,
});

const rocks = param('rocks', '6', { choices: ['3', '6', '9'], label: 'Rocks' });
const gravelP = param('gravelPatches', 'yes', { choices: ['yes', 'no'], label: 'Gravel patches' });
const ground = param('ground', '#8a9a52', { label: 'Ground' });
const gravel = param('gravel', '#a59c8c', { label: 'Gravel' });
const rock = param('rock', '#8a8580', { label: 'Rocks' });
const rock2 = param('rock2', '#6f6b66', { label: 'Accent rocks' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  desert: { ground: '#d2a66a', gravel: '#c08a5a', rock: '#b8724a', rock2: '#9a5c3a', dirt: '#9a6a44' },
  alpine: { ground: '#6f8a4a', gravel: '#b9b5ac', rock: '#9a9ea4', rock2: '#7d8288' },
  snowy: { ground: '#eef3f6', gravel: '#c9ced3', rock: '#6f747a', rock2: '#5a5f66' },
});

const S = 2000;
const t = 200;
const skirtH = t * 0.7;

const ring = (r: number, s: number, salt: number, rot = 0, sy = 1) => {
  let p = path();
  for (let k = 0; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    const rr = r * (0.8 + 0.3 * (0.5 + 0.5 * Math.sin(k * 12.9898 + salt * 78.233)));
    p = k === 0 ? p.moveTo(rr * Math.cos(a), rr * sy * Math.sin(a)) : p.lineTo(rr * Math.cos(a), rr * sy * Math.sin(a));
  }
  return p.close();
};
// Faceted rock: bottom ring sunk below the surface, wide middle, small top.
const rockShape = (r: number, salt: number) =>
  ring(r * 0.8, 6, salt).loft([ring(r, 6, salt + 1, Math.PI / 6, 0.8), ring(r * 0.45, 6, salt + 2, 0.3, 0.8)], {
    planes: [
      { plane: 'XY', origin: [0, 0, -r * 0.2] },
      { plane: 'XY', origin: [r * 0.05, 0, r * 0.3] },
      { plane: 'XY', origin: [-r * 0.08, r * 0.05, r * 0.75] },
    ],
    ruled: true,
  });

const tile = assembly('rocky-ground-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).color(dirt));
tile.part('ground', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).color(ground));
if (gravelP.value === 'yes') {
  tile.part('gravel-1', ring(520, 8, 3, 0.2, 0.7).extrude(10).translate(-300, -250, t - 4).color(gravel));
  tile.part('gravel-2', ring(380, 7, 7, 0.5, 0.8).extrude(10).translate(450, 520, t - 4).color(gravel));
}
const spots: [number, number, number][] = [
  [-380, -260, 280], [460, 480, 230], [560, -520, 170], [-620, 560, 150], [80, 140, 110],
  [-120, -700, 95], [760, 40, 90], [-760, -40, 120], [260, 760, 80],
];
for (let i = 0; i < Number(rocks.value); i++) {
  const [x, y, r] = spots[i];
  tile.part(`rock-${i + 1}`, rockShape(r, i + 1).rotateZ(i * 47).translate(x, y, t).color(i % 3 === 1 ? rock2 : rock));
}

return tile.model();
