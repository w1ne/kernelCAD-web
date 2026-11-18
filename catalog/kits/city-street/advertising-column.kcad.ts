// Original kernelCAD low-poly advertising column: a round poster pillar on a
// stepped plinth, wrapped in flat poster panels in three colours, under a
// cornice and a shallow faceted dome. Millimetres, Z up.

meta({
  name: 'advertising-column',
  license: 'CC0-1.0',
  title: 'Advertising column',
  description: 'Round street poster pillar wrapped in colourful plain posters, with plinth, cornice and dome. Knobs: height, column and three poster colours.',
  tags: ['advertising column', 'poster', 'pillar', 'billboard', 'kiosk', 'plaza', 'european', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'plaza'],
  triangleBudget: 600,
});

const heightMm = param('heightMm', '3200', { choices: ['2800', '3200', '3600'], label: 'Height (mm)' });
const column = param('column', '#1f4a36', { label: 'Column' });
const poster1 = param('poster1', '#e8432e', { label: 'Poster 1' });
const poster2 = param('poster2', '#f2c418', { label: 'Poster 2' });
const poster3 = param('poster3', '#f2f0e6', { label: 'Poster 3' });

presets({
  night: { column: '#1e1e1e', poster1: '#7a3fc8', poster2: '#2ab8c8', poster3: '#e8432e' },
  faded: { poster1: '#c99a8a', poster2: '#d8cc9a', poster3: '#c8c6be' },
});

const H = Number(heightMm.value);
const s = 12;
const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const R = 600;
const ac = assembly('advertising-column');
ac.part('plinth', ngon(R + 80, s).extrude(180).color(column));
ac.part('plinth-step', ngon(R + 40, s).extrude(120).translate(0, 0, 170).color(column));
ac.part('shaft', ngon(R, s).extrude(H - 300).translate(0, 0, 280).color(column));
ac.part('cornice', ngon(R + 70, s).loft(ngon(R + 90, s), { spacing: 140, ruled: true }).translate(0, 0, H - 30).color(column));
ac.part('dome', ngon(R + 30, s).loft([ngon(R * 0.7, s), ngon(R * 0.25, s), ngon(60, s)], {
  planes: [
    { plane: 'XY', origin: [0, 0, H + 110] },
    { plane: 'XY', origin: [0, 0, H + 260] },
    { plane: 'XY', origin: [0, 0, H + 360] },
    { plane: 'XY', origin: [0, 0, H + 400] },
  ],
  ruled: true,
}).color(column));
ac.part('spike', ngon(40, 6).loft(ngon(4, 6), { spacing: 160, ruled: true }).translate(0, 0, H + 400).color(column));

// One flat poster per facet, sitting just proud of the shaft.
const apo = R * Math.cos(Math.PI / s);
const fw = 2 * R * Math.sin(Math.PI / s) * 0.92;
const posters = [poster1, poster2, poster3];
const pz0 = 520;
const pz1 = H - 200;
for (let k = 0; k < s; k++) {
  const az = (360 * (k + 0.5)) / s;
  const tall = k % 4 === 3;
  const z1 = tall ? pz1 : pz0 + (pz1 - pz0) * 0.55;
  const p = box(10, fw, z1 - pz0).translate(apo - 2, -fw / 2, pz0).rotateZ(az);
  ac.part(`poster-${k + 1}`, p.color(posters[k % 3]!));
  if (!tall) {
    const q = box(10, fw, pz1 - z1 - 30).translate(apo - 2, -fw / 2, z1 + 30).rotateZ(az);
    ac.part(`poster-${k + 1}-upper`, q.color(posters[(k + 1) % 3]!));
  }
}

return ac.model();
