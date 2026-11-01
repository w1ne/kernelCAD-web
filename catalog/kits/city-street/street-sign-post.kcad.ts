// Original kernelCAD low-poly street name sign: a tall post carrying one or two
// crossed blade signs, each a bordered plate with a coloured face on both
// sides. No text. Millimetres, Z up.

meta({
  name: 'street-sign-post',
  license: 'CC0-1.0',
  title: 'Street name sign',
  description: 'Corner street-name post with one or two crossed blade signs, plain bordered faces with no lettering. Knobs: blades, height, face, border and post colours.',
  tags: ['street sign', 'street name', 'sign', 'signpost', 'corner', 'intersection', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 240,
});

const blades = param('blades', '2', { choices: ['1', '2'], label: 'Blades' });
const heightMm = param('heightMm', '3000', { choices: ['2600', '3000', '3400'], label: 'Height (mm)' });
const face = param('face', '#2f7d4a', { label: 'Sign face' });
const border = param('border', '#f2f2ee', { label: 'Border' });
const post = param('post', '#4a5056', { label: 'Post' });

presets({
  blue: { face: '#2a5ea8' },
  heritage: { face: '#1e1e1e', border: '#e8c33a', post: '#1e1e1e' },
});

const H = Number(heightMm.value);
const n = Number(blades.value);
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const sp = assembly('street-sign-post');
sp.part('post', ngon(36, 8).extrude(H + 60).color(post));
sp.part('finial', ngon(44, 8).loft(ngon(8, 8), { spacing: 80, ruled: true }).translate(0, 0, H + 60).color(post));
sp.part('foot', ngon(60, 8).extrude(120).color(post));
for (let i = 0; i < n; i++) {
  const z = H - 120 - i * 230;
  const rz = i * 90;
  // Blade hangs to one side of the post, centred 480 mm out.
  sp.part(`blade-${i + 1}`, box(920, 20, 200, true).translate(500, 0, z).rotateZ(rz).color(border));
  sp.part(`face-${i + 1}`, box(880, 30, 160, true).translate(500, 0, z).rotateZ(rz).color(face));
  sp.part(`bracket-${i + 1}`, box(80, 50, 230, true).translate(50, 0, z).rotateZ(rz).color(post));
}

return sp.model();
