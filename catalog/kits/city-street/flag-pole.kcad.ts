// Original kernelCAD low-poly flag pole: a tapered pole on a stepped plinth
// with a ball finial and a three-panel waving flag, plain or with a centre
// stripe. No emblems or text. Millimetres, Z up, flag flies toward +X.

meta({
  name: 'flag-pole',
  license: 'CC0-1.0',
  title: 'Flag pole',
  description: 'Tall flagpole on a stepped plinth with a ball finial and a waving flag, plain or striped. Knobs: height, flag style, pole, flag and stripe colours.',
  tags: ['flag', 'flagpole', 'flag pole', 'banner', 'mast', 'plaza', 'civic', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'plaza', 'park'],
  triangleBudget: 300,
});

const heightM = param('heightM', '7', { choices: ['5', '7', '10'], label: 'Height (m)' });
const style = param('style', 'striped', { choices: ['plain', 'striped'], label: 'Flag style' });
const pole = param('pole', '#d8dadc', { label: 'Pole' });
const flag = param('flag', '#c8261e', { label: 'Flag' });
const stripe = param('stripe', '#f2f2ee', { label: 'Flag stripe' });

presets({
  blue: { flag: '#2a5ea8', stripe: '#f2c418' },
  green: { flag: '#2f7d4a', stripe: '#f2f2ee' },
});

const H = Number(heightM.value) * 1000;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const fp = assembly('flag-pole');
fp.part('plinth', ngon(520, 4, Math.PI / 4).extrude(160).color(pole));
fp.part('plinth-step', ngon(360, 4, Math.PI / 4).extrude(140).translate(0, 0, 150).color(pole));
fp.part('pole', ngon(70, 8).loft(ngon(42, 8), { spacing: H - 280, ruled: true }).translate(0, 0, 280).color(pole));
fp.part('finial', ngon(30, 6).loft([ngon(75, 6, Math.PI / 6), ngon(20, 6)], {
  planes: [
    { plane: 'XY', origin: [0, 0, H - 10] },
    { plane: 'XY', origin: [0, 0, H + 60] },
    { plane: 'XY', origin: [0, 0, H + 140] },
  ],
  ruled: true,
}).color(pole));

// Flag: three panels with alternating yaw so it ripples, each overlapping the next.
const fl = H * 0.24;
const fh = fl * 0.62;
const segL = fl / 3;
const fz = H - 120 - fh / 2;
const yaws = [10, -14, 10];
let x = 40;
let y = 0;
for (let k = 0; k < 3; k++) {
  const a = (yaws[k]! * Math.PI) / 180;
  const cx = x + (segL / 2) * Math.cos(a);
  const cy = y + (segL / 2) * Math.sin(a);
  fp.part(`flag-${k + 1}`, box(segL + 30, 14, fh, true).rotateZ(yaws[k]!).translate(cx, cy, fz).color(flag));
  if (style.value === 'striped') {
    fp.part(`stripe-${k + 1}`, box(segL + 30, 20, fh / 3, true).rotateZ(yaws[k]!).translate(cx, cy, fz).color(stripe));
  }
  x += segL * Math.cos(a);
  y += segL * Math.sin(a);
}

return fp.model();
