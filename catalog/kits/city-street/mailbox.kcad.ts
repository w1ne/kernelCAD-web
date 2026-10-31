// Original kernelCAD low-poly street mailbox: either a box-style collection
// mailbox with an arched top on four legs, or a round pillar post box.
// Millimetres, Z up, base on z = 0. The front faces -Y.

meta({
  name: 'mailbox',
  title: 'Street mailbox',
  description: 'Public mail collection box, box style with an arched top on legs or a round pillar box. Knobs: style, body, trim and slot colours.',
  tags: ['mailbox', 'postbox', 'mail', 'post', 'letter', 'pillar box', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 220,
});

const style = param('style', 'box', { choices: ['box', 'pillar'], label: 'Style' });
const body = param('body', '#1f4f9c', { label: 'Body' });
const trim = param('trim', '#d8dde2', { label: 'Trim' });
const slot = param('slot', '#1a1c1f', { label: 'Slot and feet' });

presets({
  red: { body: '#c0221c', trim: '#1a1c1f' },
  yellow: { body: '#f0c419', trim: '#1a1c1f' },
});

const ngon = (r: number, s = 10) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) {
    p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  }
  return p.close();
};

const mb = assembly('mailbox');
if (style.value === 'box') {
  const W = 460; // x
  const D = 520; // y
  const legH = 160;
  const bodyH = 780;
  for (const [i, x, y] of [[1, -1, -1], [2, 1, -1], [3, -1, 1], [4, 1, 1]] as [number, number, number][]) {
    mb.part(`leg-${i}`, box(50, 50, legH + 20, true).translate(x * (W / 2 - 30), y * (D / 2 - 30), (legH + 20) / 2).color(slot));
  }
  mb.part('body', box(W, D, bodyH, true).translate(0, 0, legH + bodyH / 2).color(body));
  // Arched roof: a half-octagon profile in XZ, extruded through Y.
  const arch: [number, number][] = [[-W / 2, 0]];
  for (let k = 0; k <= 4; k++) {
    const a = Math.PI - (Math.PI * k) / 4;
    arch.push([(W / 2) * Math.cos(a), 150 * Math.sin(a)]);
  }
  mb.part('roof', extrudePolygon(arch, D).rotateX(90).translate(0, D / 2, legH + bodyH).color(body));
  // Pull-down chute flap and its slot on the front face.
  mb.part('flap', box(340, 30, 150, true).translate(0, -D / 2 - 15, legH + bodyH - 90).color(trim));
  mb.part('slot', box(260, 10, 25, true).translate(0, -D / 2 - 33, legH + bodyH - 60).color(slot));
} else {
  const r = 240;
  mb.part('plinth', ngon(r + 30).extrude(80).color(slot));
  mb.part('body', ngon(r).extrude(1250).translate(0, 0, 80).color(body));
  mb.part('cap-rim', ngon(r + 35).extrude(60).translate(0, 0, 1330).color(body));
  mb.part('cap', ngon(r + 20).loft(ngon(70), { spacing: 140, ruled: true }).translate(0, 0, 1390).color(body));
  mb.part('slot', box(260, 30, 40, true).translate(0, -r + 5, 1200).color(slot));
  mb.part('plate', box(200, 30, 150, true).translate(0, -r + 5, 950).color(trim));
}

return mb.model();
