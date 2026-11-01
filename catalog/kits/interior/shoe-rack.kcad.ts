// Original kernelCAD low-poly shoe rack: two or three slatted tiers between
// side frames, each holding pairs of low-poly shoes and boots.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'shoe-rack',
  license: 'CC0-1.0',
  title: 'Shoe rack',
  description: 'Hallway shoe rack with two or three slatted tiers holding pairs of shoes and boots. Knobs: tiers, width, shoes, frame, shoe and boot colours.',
  tags: ['shoe rack', 'shoe shelf', 'shoes', 'boots', 'storage', 'hallway', 'entryway', 'mudroom'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'hallway', 'bedroom', 'closet'],
  triangleBudget: 600,
});

const tiers = param('tiers', '3', { choices: ['2', '3'], label: 'Tiers' });
const width = param('width', '800', { choices: ['600', '800', '1000'], label: 'Width (mm)' });
const shoesK = param('shoes', 'yes', { choices: ['yes', 'no'], label: 'Shoes' });
const frame = param('frame', '#c69c6d', { label: 'Frame' });
const shoeA = param('shoeA', '#2b2d30', { label: 'Shoes A' });
const shoeB = param('shoeB', '#b8342c', { label: 'Shoes B' });
const boot = param('boot', '#7a5236', { label: 'Boots' });

presets({
  black: { frame: '#2b2927', shoeA: '#efeee9' },
  bamboo: { frame: '#d9b77e', shoeB: '#3c6e9f' },
});

const n = Number(tiers.value);
const W = Number(width.value);
const D = 300;
const pitch = 260;
const H = 60 + n * pitch;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const r = assembly('shoe-rack');
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -W / 2 : W / 2 - 25;
  r.part(`side-${sx < 0 ? 'left' : 'right'}`, blk(x0, -D / 2, 0, x0 + 25, D / 2, H).color(frame));
}
r.part('top', blk(-W / 2, -D / 2, H - 1, W / 2, D / 2, H + 20).color(frame));
// A low-poly shoe: a wedge profile in YZ (toe at -Y), extruded across X.
const shoe = (x: number, z: number, high: boolean) => {
  const pts: [number, number][] = high
    ? [[-130, 0], [120, 0], [120, 260], [40, 260], [20, 90], [-130, 60]]
    : [[-130, 0], [120, 0], [120, 70], [30, 90], [-130, 45]];
  return extrudePolygon(pts, 75).rotateX(90).rotateZ(90).translate(x - 37, 0, z);
};
for (let i = 0; i < n; i++) {
  const z = 60 + i * pitch;
  for (let k = 0; k < 3; k++) {
    const y = -D / 2 + 40 + k * ((D - 80) / 2);
    r.part(`slat-${i + 1}-${k + 1}`, blk(-W / 2 + 24, y - 22, z, W / 2 - 24, y + 22, z + 18).color(frame));
  }
  if (shoesK.value !== 'yes') continue;
  const pairs = Math.max(2, Math.floor((W - 100) / 220));
  for (let p = 0; p < pairs; p++) {
    const cx = -W / 2 + 60 + ((W - 120) * (p + 0.5)) / pairs;
    const isBoot = i === 0 && p === pairs - 1;
    const col = isBoot ? boot : (i + p) % 2 === 0 ? shoeA : shoeB;
    for (const dx of [-42, 42]) {
      r.part(`shoe-${i + 1}-${p + 1}-${dx < 0 ? 'l' : 'r'}`, shoe(cx + dx, z + 17, isBoot).color(col));
    }
  }
}

return r.model();
