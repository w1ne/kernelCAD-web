// Original kernelCAD low-poly carrot: a tapered faceted root lying on its side
// with a fan of jagged leafy fronds, single or as a small bunch.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, tip to +X.

meta({
  name: 'carrot',
  license: 'CC0-1.0',
  title: 'Carrot',
  description: 'Tapered faceted carrot lying on its side with a leafy green top, single or a bunch of three, leafy or trimmed, as a food pickup or market produce. Knobs: count, tops, root and leaf colours.',
  tags: ['carrot', 'vegetable', 'root', 'food', 'pickup', 'produce', 'harvest', 'garden'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'food', 'market', 'farm', 'garden', 'tavern', 'medieval'],
  triangleBudget: 500,
});

const count = param('count', '1', { choices: ['1', '3'], label: 'Carrots' });
const tops = param('tops', 'leafy', { choices: ['leafy', 'trimmed'], label: 'Tops' });
const root = param('root', '#ea7a1e', { label: 'Root' });
const leaves = param('leaves', '#4a9a32', { label: 'Leaves' });

presets({
  purple: { root: '#6a2a6e' },
  yellow: { root: '#f0c23a', leaves: '#5aa83a' },
});

const n = Number(count.value);
const leafy = tops.value === 'leafy';
const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
  return p.close();
};
const L = 175;
const R = 16;
// Root rings (radius, distance from the crown): slightly twisted for facets.
const rings: [number, number][] = [[R * 0.8, 0], [R, 8], [R * 0.9, 45], [R * 0.55, 105], [2, L]];
const rootShape = () => ngon(rings[0][0], 7).loft(rings.slice(1).map(([r], i) => ngon(r, 7, (i % 2) * 0.25)), {
  planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
}).rotateY(90);
// A jagged frond pointing to -X: a flat blade with zigzag edges.
const frond = (len: number) => extrudePolygon([
  [0, -3], [-0.3 * len, -15], [-0.45 * len, -5], [-0.72 * len, -15], [-len, 0],
  [-0.72 * len, 14], [-0.45 * len, 5], [-0.3 * len, 14], [0, 3],
], 2).translate(0, 0, -1);

const c = assembly('carrot');
const layout: [number, number][] = n === 1 ? [[0, 0]] : [[-32, 8], [0, -4], [32, 10]];
const x0 = leafy ? -45 : -L / 2;
layout.forEach(([y, yaw], i) => {
  const zc = R;
  c.part(`root-${i + 1}`, rootShape().translate(x0, 0, zc).rotateZ(yaw).translate(0, y, 0).color(root));
  if (leafy) {
    const all: [number, number, number][] = [[90, 14, -34], [110, 30, -10], [105, 26, 14], [85, 12, 36]];
    // A bunch keeps three fronds per carrot to stay inside the budget.
    const sets = n === 1 ? all : [all[0], all[1], all[3]];
    sets.forEach(([len, up, spread], k) => {
      c.part(`frond-${i + 1}-${k + 1}`, frond(len).rotateY(up).rotateZ(spread)
        .translate(x0 + 4, 0, zc + 2).rotateZ(yaw).translate(0, y, 0).color(leaves));
    });
  } else {
    c.part(`stub-${i + 1}`, ngon(R * 0.45, 6).extrude(10).rotateY(-90).translate(x0 + 2, 0, zc).rotateZ(yaw).translate(0, y, 0).color(leaves));
  }
});

return c.model();
