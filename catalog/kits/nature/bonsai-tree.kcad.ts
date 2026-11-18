// Original kernelCAD low-poly bonsai: a shallow rectangular tray on little feet,
// a twisting zig-zag trunk of tapered segments and flat cloud-pruned foliage
// pads on the branch ends.

meta({
  name: 'bonsai-tree',
  license: 'CC0-1.0',
  title: 'Bonsai tree',
  description: 'Miniature bonsai in a shallow rectangular tray, with a twisting trunk and flat cloud-pruned foliage pads. Knobs: foliage pads, style, pot, bark, foliage and soil colours.',
  tags: ['bonsai', 'tree', 'miniature', 'potted', 'japanese', 'zen', 'decor', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'garden', 'office', 'living-room'],
  triangleBudget: 400,
});

const pads = param('pads', '4', { choices: ['3', '4', '5'], label: 'Foliage pads' });
const style = param('style', 'informal', { choices: ['informal', 'slanting'], label: 'Style' });
const pot = param('pot', '#3f5f78', { label: 'Pot' });
const bark = param('bark', '#5a4232', { label: 'Bark' });
const foliage = param('foliage', '#4f7f3a', { label: 'Foliage' });
const soil = param('soil', '#6a5a4a', { label: 'Soil and moss' });

presets({
  maple: { foliage: '#c8452e' },
  terracotta: { pot: '#a85a3a' },
  blossom: { foliage: '#f0b0c4' },
});

const n = Number(pads.value);
const lean = style.value === 'slanting' ? 1.8 : 1;

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();

const tree = assembly('bonsai-tree');
// Tray: four feet, a flared body and a soil top.
const footH = 15;
const potH = 70;
for (const [i, [x, y]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
  tree.part(`foot-${i + 1}`, box(40, 30, footH + 5).translate(x * 150 - 20, y * 85 - 15, 0).color(pot));
}
tree.part('tray', rect(360, 220).loft(rect(400, 250), { spacing: potH, ruled: true }).translate(0, 0, footH).color(pot));
const top = footH + potH;
tree.part('soil', rect(380, 230).extrude(10).translate(0, 0, top - 4).color(soil));

// Trunk: segments joined at shared knuckles, zig-zagging up and to one side.
const pts: [number, number, number][] = [[-40, 0, top]];
const steps = [[60, 10, 110], [-55, -15, 100], [70, 20, 90], [-30, 5, 70]];
for (const [dx, dy, dz] of steps) {
  const [x, y, z] = pts[pts.length - 1];
  pts.push([x + dx * lean, y + dy, z + dz]);
}
for (let i = 0; i < pts.length - 1; i++) {
  const [x0, y0, z0] = pts[i];
  const [x1, y1, z1] = pts[i + 1];
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const tilt = (Math.acos((z1 - z0) / len) * 180) / Math.PI;
  const az = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  const r0 = 28 - i * 5;
  // Extend each segment past its end so the joint is buried in the next.
  const seg = ngon(r0, 6).loft(ngon(r0 - 4, 6), { spacing: len + r0 * 0.6, ruled: true }).rotateY(tilt).rotateZ(az).translate(x0, y0, z0);
  tree.part(`trunk-${i + 1}`, seg.color(bark));
}
// Root flare at the base.
tree.part('roots', ngon(55, 6).loft(ngon(26, 6), { spacing: 30, ruled: true }).translate(-40, 0, top).color(bark));

// Foliage pads: flat wide clouds at the knuckles and one at the apex.
const padAt = pts.slice(1).concat([[pts[2][0] - 90 * lean, pts[2][1] + 30, pts[2][2] + 10]]);
for (let i = 0; i < n; i++) {
  const [x, y, z] = padAt[(padAt.length - 1 - i + padAt.length) % padAt.length];
  const r = i === 0 ? 95 : 80 - i * 6;
  const pad = ngon(r * 0.7, 7, i).loft([ngon(r, 7, i + 0.45), ngon(r * 0.55, 7, i)], {
    planes: [
      { plane: 'XY', origin: [x, y, z - 10] },
      { plane: 'XY', origin: [x, y, z + 18] },
      { plane: 'XY', origin: [x, y, z + 45] },
    ],
    ruled: true,
  });
  tree.part(`pad-${i + 1}`, pad.color(foliage));
}

return tree.model();
