// Original kernelCAD low-poly fire alarm post: a faceted pedestal post with a
// gabled call box, a pale front panel with pull handle and a lamp globe on
// the ridge. Millimetres, Z up, front faces -Y.

meta({
  name: 'fire-alarm-box',
  license: 'CC0-1.0',
  title: 'Fire alarm box',
  description: 'Street fire alarm call box on a pedestal post with a gabled top, pull handle and lamp globe. Knobs: body, panel and lamp colours.',
  tags: ['fire alarm', 'call box', 'alarm', 'emergency', 'fire', 'post', 'sidewalk', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 260,
});

const body = param('body', '#c8261e', { label: 'Body' });
const panel = param('panel', '#f2f0e6', { label: 'Front panel' });
const lamp = param('lamp', '#f29a1c', { label: 'Lamp' });

presets({
  blue: { body: '#2a5ea8', lamp: '#46b4ff' },
  yellow: { body: '#e8b81c', panel: '#1e1e1e', lamp: '#c8261e' },
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

const fa = assembly('fire-alarm-box');
fa.part('base', ngon(150, 8, Math.PI / 8).loft(ngon(90, 8, Math.PI / 8), { spacing: 160, ruled: true }).color(body));
fa.part('post', ngon(60, 8, Math.PI / 8).extrude(1000).translate(0, 0, 150).color(body));
fa.part('collar', ngon(90, 8, Math.PI / 8).extrude(60).translate(0, 0, 1080).color(body));
fa.part('box', blk(-150, -120, 1130, 150, 120, 1500).color(body));
fa.part('gable', extrudePolygon([[-180, 0], [180, 0], [0, 140]], 280).translate(0, 0, -140).rotateX(90).translate(0, 0, 1495).color(body));
fa.part('panel', blk(-110, -128, 1180, 110, -119, 1440).color(panel));
fa.part('handle', blk(-50, -160, 1260, 50, -127, 1300).color(body));
fa.part('lamp-stem', ngon(25, 6).extrude(60).translate(0, 0, 1620).color(body));
fa.part('lamp', ngon(40, 8).loft([ngon(85, 8, Math.PI / 8), ngon(40, 8)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 1670] },
    { plane: 'XY', origin: [0, 0, 1740] },
    { plane: 'XY', origin: [0, 0, 1820] },
  ],
  ruled: true,
}).color(lamp));

return fa.model();
