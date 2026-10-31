// Original kernelCAD low-poly street lamp: tapered faceted pole on a plinth,
// one or two outreach arms with flat lantern heads. Millimetres, Z up.

meta({
  name: 'street-lamp',
  title: 'Street lamp',
  description: 'Tapered street light pole with a single or double outreach arm and flat lamp heads. Knobs: height, arms, pole, head and light colours.',
  tags: ['lamp', 'light', 'streetlight', 'lamppost', 'pole', 'street', 'road'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 300,
});

const heightM = param('heightM', '5', { choices: ['4', '5', '6'], label: 'Height (m)' });
const arms = param('arms', 'single', { choices: ['single', 'double'], label: 'Arms' });
const pole = param('pole', '#4a5056', { label: 'Pole' });
const head = param('head', '#2c3034', { label: 'Lamp head' });
const light = param('light', '#fff2b8', { label: 'Light' });

presets({
  heritage: { pole: '#1f3d2b', head: '#1f3d2b', light: '#ffd27a' },
  modern: { pole: '#b8bdc2', head: '#d8dcdf', light: '#f4f8ff' },
});

const h = Number(heightM.value) * 1000;
const double = arms.value === 'double';

const ngon = (r: number, s = 8) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) {
    p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  }
  return p.close();
};

const lamp = assembly('street-lamp');
lamp.part('plinth', ngon(150).loft(ngon(120), { spacing: 450, ruled: true }).color(pole));
lamp.part('pole', ngon(85).loft(ngon(55), { spacing: h - 450, ruled: true }).translate(0, 0, 450).color(pole));

const armLen = 1100;
const zArm = h - 140;
const addArm = (dir: number, tag: string) => {
  // Arm rises slightly toward the head.
  const armPts: [number, number][] = [[0, -40], [armLen, 30], [armLen, 90], [0, 40]];
  const arm = extrudePolygon(armPts, 60).rotateX(90).translate(0, 30, zArm);
  const headBox = box(560, 240, 100, true).translate(armLen + 180, 0, zArm + 70);
  const glass = box(480, 190, 30, true).translate(armLen + 180, 0, zArm + 5);
  const flip = (s: ReturnType<typeof box>) => (dir < 0 ? s.rotateZ(180) : s);
  lamp.part(`arm-${tag}`, flip(arm).color(pole));
  lamp.part(`head-${tag}`, flip(headBox).color(head));
  lamp.part(`light-${tag}`, flip(glass).color(light));
};
addArm(1, 'a');
if (double) addArm(-1, 'b');
lamp.part('finial', ngon(60).loft(ngon(15), { spacing: 140, ruled: true }).translate(0, 0, h).color(head));

return lamp.model();
