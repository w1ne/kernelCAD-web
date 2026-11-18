// Original kernelCAD low-poly lantern: a hexagonal metal frame with glowing
// glass panes, a pointed roof and a hanging ring, as a hand lantern or on a
// tall garden post. Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'lantern',
  license: 'CC0-1.0',
  title: 'Lantern',
  description: 'Hexagonal lantern with glowing panes, pointed roof and ring, standing on its own or mounted on a post. Knobs: mount, frame, glass and post colours.',
  tags: ['lantern', 'lamp', 'light', 'candle', 'medieval', 'garden', 'camp', 'fantasy'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'indoor', 'medieval', 'fantasy', 'garden', 'street', 'camp'],
  triangleBudget: 300,
});

const mount = param('mount', 'none', { choices: ['none', 'post'], label: 'Mount' });
const frame = param('frame', '#2e2e30', { label: 'Frame' });
const glass = param('glass', '#ffd36a', { label: 'Glowing glass' });
const post = param('post', '#5a3e28', { label: 'Post' });

presets({
  brass: { frame: '#b08a3a' },
  cold: { glass: '#a8e0ff' },
  green: { frame: '#2f5a3a', glass: '#e8ff9a' },
});

const hasPost = mount.value === 'post';
const z0 = hasPost ? 1500 : 0;
const R = 110;
const H = 240;

const ngon = (r: number, rot = Math.PI / 6) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < 6; k++) p = p.lineTo(r * Math.cos(rot + (Math.PI * k) / 3), r * Math.sin(rot + (Math.PI * k) / 3));
  return p.close();
};

const l = assembly('lantern');
if (hasPost) {
  l.part('post', box(110, 110, z0, true).translate(0, 0, z0 / 2)
    .union(box(200, 200, 60, true).translate(0, 0, 30))
    .color(post));
}
l.part('base', ngon(R + 20).loft(ngon(R), { spacing: 40, ruled: true }).translate(0, 0, z0).color(frame));
l.part('glass', ngon(R - 10).extrude(H).translate(0, 0, z0 + 39).color(glass));
// Six corner posts.
for (let k = 0; k < 6; k++) {
  const a = Math.PI / 6 + (Math.PI * k) / 3;
  l.part(`bar-${k + 1}`, box(22, 22, H + 2, true).rotateZ((a * 180) / Math.PI).translate((R - 8) * Math.cos(a), (R - 8) * Math.sin(a), z0 + 40 + H / 2).color(frame));
}
l.part('roof', ngon(R + 35).loft(ngon(25), { spacing: 110, ruled: true }).translate(0, 0, z0 + 38 + H)
  .union(box(70, 14, 70, true).translate(0, 0, z0 + H + 175))
  .color(frame));

return l.model();
