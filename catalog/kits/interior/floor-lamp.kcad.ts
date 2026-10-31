// Original kernelCAD low-poly floor lamp: weighted disc base, slim pole and a
// faceted drum or cone shade. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'floor-lamp',
  license: 'CC0-1.0',
  title: 'Floor lamp',
  description: 'Standing floor lamp with a round base, slim pole and a faceted drum or cone shade. Knobs: shade style, height, shade and metal colours.',
  tags: ['floor lamp', 'standard lamp', 'lamp', 'light', 'lighting', 'living room'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'office'],
  triangleBudget: 150,
});

const shadeStyle = param('shadeStyle', 'drum', { choices: ['drum', 'cone'], label: 'Shade style' });
const heightM = param('heightM', '1.6', { choices: ['1.4', '1.6', '1.8'], label: 'Height (m)' });
const shade = param('shade', '#eadfc8', { label: 'Shade' });
const metal = param('metal', '#2b2b2b', { label: 'Base and pole' });

presets({
  brass: { metal: '#b8913f', shade: '#f2ead8' },
  modern: { metal: '#e8e8e6', shade: '#3c5a78' },
});

const H = Number(heightM.value) * 1000;
const sides = 8;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < sides; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / sides), r * Math.sin((2 * Math.PI * k) / sides));
  return p.close();
};

const shadeH = 320;
const lamp = assembly('floor-lamp');
lamp.part('base', ngon(150).loft(ngon(130), { spacing: 25, ruled: true }).color(metal));
lamp.part('pole', ngon(12).extrude(H - shadeH * 0.6).translate(0, 0, 20).color(metal));
const rBot = shadeStyle.value === 'drum' ? 220 : 240;
const rTop = shadeStyle.value === 'drum' ? 210 : 120;
lamp.part('shade', ngon(rBot).loft(ngon(rTop), { spacing: shadeH, ruled: true }).translate(0, 0, H - shadeH).color(shade));

return lamp.model();
