// Original kernelCAD low-poly desk lamp: an architect-style balanced arm on a
// round weighted base, with hinge hubs at each joint and a tilted cone shade.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Shade faces -Y.

meta({
  name: 'desk-lamp',
  license: 'CC0-1.0',
  title: 'Desk lamp',
  description: 'Architect-style desk lamp with a two-segment hinged arm, a round base and a tilted cone shade with a bulb. Knobs: reach, body, base and bulb colours.',
  tags: ['desk lamp', 'task lamp', 'architect lamp', 'anglepoise', 'lamp', 'light', 'office'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'office', 'bedroom', 'study'],
  triangleBudget: 300,
});

const reach = param('reach', 'medium', { choices: ['short', 'medium', 'long'], label: 'Reach' });
const body = param('body', '#d23c2f', { label: 'Arm and shade' });
const base = param('base', '#2b2927', { label: 'Base and hinges' });
const bulb = param('bulb', '#fff2c4', { label: 'Bulb' });

presets({
  black: { body: '#232323', base: '#8f9396' },
  white: { body: '#f2f1ec', base: '#c9ccd0' },
  teal: { body: '#2f7a7a', base: '#e3d6b8' },
});

const k = reach.value === 'short' ? 0.8 : reach.value === 'long' ? 1.2 : 1;
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) p = p.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return p.close();
};
// A square arm from point A to point B in the YZ plane.
const arm = (a: [number, number], b: [number, number], w: number) => {
  const dy = b[0] - a[0];
  const dzz = b[1] - a[1];
  const L = Math.hypot(dy, dzz);
  const deg = (Math.atan2(-dy, dzz) * 180) / Math.PI;
  return box(w, w, L + w, true).translate(0, 0, L / 2).rotateX(deg).translate(0, a[0], a[1]);
};
// Hinge hub: a short octagonal drum across X.
const hub = (p: [number, number], r: number) => ngon(r, 8).extrude(44).translate(0, 0, -22).rotateY(90).translate(0, p[0], p[1]);

const P0: [number, number] = [40, 70];
const P1: [number, number] = [40 + 110 * k, 70 + 330 * k];
const P2: [number, number] = [40 + 110 * k - 360 * k, 70 + 330 * k + 70 * k];

const l = assembly('desk-lamp');
l.part('base', ngon(100, 10).loft(ngon(85, 10), { spacing: 30, ruled: true }).color(base));
l.part('riser', box(40, 40, 50, true).translate(0, P0[0], 50).color(base));
l.part('hinge-base', hub(P0, 18).color(base));
l.part('lower-arm', arm(P0, P1, 18).color(body));
l.part('hinge-elbow', hub(P1, 16).color(base));
l.part('upper-arm', arm(P1, P2, 16).color(body));
l.part('hinge-head', hub(P2, 14).color(base));
// Shade: a cone opening downward and tilted forward, hung from the head hinge.
const tilt = -40;
const shadeShape = ngon(95, 10).loft([ngon(45, 10), ngon(30, 10)], {
  planes: [
    { plane: 'XY', origin: [0, 0, -150] },
    { plane: 'XY', origin: [0, 0, -40] },
    { plane: 'XY', origin: [0, 0, 0] },
  ],
  ruled: true,
}).subtract(ngon(85, 10).loft(ngon(35, 10), { spacing: 115, ruled: true }).translate(0, 0, -160));
l.part('shade', shadeShape.rotateX(tilt).translate(0, P2[0] - 15, P2[1] + 5).color(body));
l.part('bulb', ngon(32, 8).loft(ngon(18, 8), { spacing: 50, ruled: true }).translate(0, 0, -125).rotateX(tilt).translate(0, P2[0] - 15, P2[1] + 5).color(bulb));

return l.model();
