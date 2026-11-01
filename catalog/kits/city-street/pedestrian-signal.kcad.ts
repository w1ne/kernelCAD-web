// Original kernelCAD low-poly pedestrian crossing signal: a post with one or
// two two-aspect heads (stop over walk) under hooded visors and a push-button
// box at hand height. No pictograms. Millimetres, Z up, first head faces -Y.

meta({
  name: 'pedestrian-signal',
  license: 'CC0-1.0',
  title: 'Pedestrian signal',
  description: 'Crosswalk signal post with stop and walk lamps under visors and a push-button box. Knobs: heads, housing, stop, walk, button and pole colours.',
  tags: ['pedestrian signal', 'crosswalk', 'walk signal', 'traffic light', 'crossing', 'push button', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'road'],
  triangleBudget: 360,
});

const heads = param('heads', '2', { choices: ['1', '2'], label: 'Heads' });
const housing = param('housing', '#2a2c2e', { label: 'Housing' });
const stop = param('stop', '#e8432e', { label: 'Stop lamp' });
const walk = param('walk', '#f2f2ee', { label: 'Walk lamp' });
const button = param('button', '#f2c418', { label: 'Push button' });
const pole = param('pole', '#7d8288', { label: 'Pole' });

presets({
  yellow: { housing: '#e8b81c' },
  green: { walk: '#2fe08a', pole: '#2a2c2e' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Disc in the XZ plane facing -Y, centred at (0, y, z).
const disc = (r: number, t: number, y: number, z: number) =>
  ngon(r, 8, Math.PI / 8).extrude(t).rotateX(90).translate(0, y, z);

const ps = assembly('pedestrian-signal');
ps.part('pole', ngon(55, 8, Math.PI / 8).extrude(3000).color(pole));
ps.part('pole-cap', ngon(65, 8, Math.PI / 8).extrude(40).translate(0, 0, 3000).color(pole));
ps.part('button-box', blk(-80, -140, 1000, 80, -45, 1240).color(housing));
ps.part('button', disc(32, 15, -139, 1150).color(button));
for (let h = 0; h < Number(heads.value); h++) {
  const rz = h * 180;
  const id = h + 1;
  ps.part(`head-${id}`, blk(-160, -340, 2250, 160, -50, 2950).rotateZ(rz).color(housing));
  ps.part(`stop-${id}`, disc(120, 12, -339, 2780).rotateZ(rz).color(stop));
  ps.part(`walk-${id}`, disc(120, 12, -339, 2430).rotateZ(rz).color(walk));
  for (const [k, z] of [[1, 2910], [2, 2560]] as const) {
    ps.part(`visor-${id}-${k}`, blk(-140, -460, z, 140, -339, z + 22).rotateZ(rz).color(housing));
  }
}

return ps.model();
