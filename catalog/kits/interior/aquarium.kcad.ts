// Original kernelCAD low-poly aquarium: a cabinet stand with doors under a
// framed tank of water (a tinted back panel and surface), gravel bed, rocks, waving plants, a few
// fish and a hooded light lid. Water reads as an opaque tint on the single
// palette material, so only the back panel and surface carry it. Millimetres, Z up, standing on z = 0 centred on
// x = y = 0. Front faces -Y.

meta({
  name: 'aquarium',
  license: 'CC0-1.0',
  title: 'Aquarium',
  description: 'Fish tank on a cabinet stand with gravel, rocks, plants, fish and a light hood. Knobs: tank length, fish count, stand, frame, water, gravel, plant and fish colours.',
  tags: ['aquarium', 'fish tank', 'tank', 'fish', 'pet', 'cabinet', 'living room', 'office'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'office', 'lobby'],
  triangleBudget: 500,
});

const length = param('length', '1000', { choices: ['600', '1000', '1200'], label: 'Tank length (mm)' });
const fishCount = param('fish', '4', { choices: ['2', '4', '6'], label: 'Fish' });
const stand = param('stand', '#3b3d42', { label: 'Stand' });
const frame = param('frame', '#1d1f22', { label: 'Tank frame and hood' });
const water = param('water', '#7ec0d6', { label: 'Water' });
const gravel = param('gravel', '#c9b38a', { label: 'Gravel and rocks' });
const plant = param('plant', '#3f8a4a', { label: 'Plants' });
const fish = param('fishColor', '#f28a2e', { label: 'Fish' });

presets({
  oak: { stand: '#b98a5a', frame: '#5a3a27' },
  reef: { water: '#3f8fc0', plant: '#d0583a', fishColor: '#f2d230' },
});

const L = Number(length.value);
const nf = Number(fishCount.value);
const D = 400;
const standH = 720;
const tankH = 500;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const a = assembly('aquarium');
const sw = L + 40;
a.part('stand', blk(-sw / 2, -D / 2 + 20, 0, sw / 2, D / 2 + 20, standH).color(stand));
for (const sx of [-1, 1]) {
  a.part(`door-${sx < 0 ? 'left' : 'right'}`, blk(sx < 0 ? -sw / 2 + 15 : 3, -D / 2, 60, sx < 0 ? -3 : sw / 2 - 15, -D / 2 + 21, standH - 40).color(stand));
  a.part(`knob-${sx < 0 ? 'left' : 'right'}`, blk(sx * 40 - 10, -D / 2 - 18, standH / 2 - 10, sx * 40 + 10, -D / 2 + 1, standH / 2 + 10).color(frame));
}
const z0 = standH;
const z1 = standH + tankH;
// The tank is read through its front glass: a tinted back panel and the
// water surface, so the gravel, plants and fish inside stay visible.
a.part('water-back', blk(-L / 2 + 10, D / 2 - 22, z0 + 20, L / 2 - 10, D / 2 - 10, z1 - 40).color(water));
a.part('water-surface', blk(-L / 2 + 10, -D / 2 + 10, z1 - 60, L / 2 - 10, D / 2 - 21, z1 - 50).color(water));
a.part('frame-bottom', blk(-L / 2, -D / 2, z0 - 1, L / 2, D / 2, z0 + 21).color(frame));
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  a.part(`frame-post-${sx}-${sy}`, blk(sx * L / 2 - 12, sy * D / 2 - 12, z0 + 20, sx * L / 2 + 12, sy * D / 2 + 12, z1).color(frame));
}
a.part('hood', blk(-L / 2 - 12, -D / 2 - 12, z1 - 1, L / 2 + 12, D / 2 + 12, z1 + 70).color(frame));
// Gravel bed sloping up to the back, rocks and plants.
a.part('gravel', extrudePolygon([[-D / 2 + 9, 0], [D / 2 - 9, 0], [D / 2 - 9, 90], [-D / 2 + 9, 40]], L - 20)
  .translate(0, 0, -(L - 20) / 2).rotateX(90).rotateZ(90).translate(0, 0, z0 + 19).color(gravel));
a.part('rock-1', box(160, 120, 130, true).rotateZ(20).rotateX(8).translate(-L * 0.25, 60, z0 + 120).color(gravel));
a.part('rock-2', box(100, 90, 80, true).rotateZ(-30).translate(L * 0.3, 40, z0 + 90).color(gravel));
const blade = (h: number) => extrudePolygon([[-18, 0], [18, 0], [30, h * 0.5], [0, h], [-26, h * 0.6]], 8).translate(0, 0, -4).rotateX(90);
const plants = [[-0.38, 120, 330], [-0.1, 140, 260], [0.15, 120, 380], [0.38, 140, 300]];
plants.forEach(([fx, y, h], i) => {
  a.part(`plant-${i + 1}`, blade(h).rotateZ(25 * i).translate(L * fx, y, z0 + 50).color(plant));
});
// Fish: small diamond bodies with tail fins, facing along X.
for (let i = 0; i < nf; i++) {
  const x = -L * 0.3 + (L * 0.6 * i) / Math.max(1, nf - 1);
  const z = z0 + 200 + 150 * Math.abs(Math.sin(i * 1.7));
  const y = -60 + 50 * Math.sin(i * 2.3);
  const dir = i % 2 === 0 ? 0 : 180;
  const body = extrudePolygon([[-45, 0], [0, 28], [45, 0], [0, -28], [-45, 0]].slice(0, 4) as [number, number][], 18)
    .union(extrudePolygon([[-40, 0], [-75, 25], [-75, -25]], 10).translate(0, 0, 4))
    .translate(0, 0, -9).rotateX(90).rotateZ(dir).translate(x, y, z);
  a.part(`fish-${i + 1}`, body.color(fish));
}

return a.model();
