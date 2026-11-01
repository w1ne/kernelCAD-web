// Original kernelCAD low-poly coat stand: a faceted pole on splayed feet with
// angled pegs near the top, optionally dressed with a hanging coat, scarf and
// hat. Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'coat-rack',
  license: 'CC0-1.0',
  title: 'Coat stand',
  description: 'Freestanding hallway coat stand with splayed feet and angled pegs, optionally holding a coat, scarf and hat. Knobs: pegs, clothes, wood, coat, scarf and hat colours.',
  tags: ['coat rack', 'coat stand', 'hat stand', 'hall tree', 'hallway', 'entryway', 'coat'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'hallway', 'office', 'cafe'],
  triangleBudget: 350,
});

const pegs = param('pegs', '6', { choices: ['4', '6', '8'], label: 'Pegs' });
const clothes = param('clothes', 'yes', { choices: ['yes', 'no'], label: 'Clothes' });
const wood = param('wood', '#6b4a2f', { label: 'Wood' });
const coat = param('coat', '#7a6a4f', { label: 'Coat' });
const scarf = param('scarf', '#b8342c', { label: 'Scarf' });
const hat = param('hat', '#2b2d30', { label: 'Hat' });

presets({
  white: { wood: '#efeee9', coat: '#3c5a78', scarf: '#e3c27a' },
  black: { wood: '#2b2927', coat: '#8d3b32', hat: '#6b4a2f' },
});

const n = Number(pegs.value);
const H = 1800;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const strut = (r: number, a: [number, number, number], b: [number, number, number]) =>
  ngon(r, 4).loft(ngon(r, 4), { planes: [{ plane: 'XY', origin: a }, { plane: 'XY', origin: b }], ruled: true });

const c = assembly('coat-rack');
c.part('pole', ngon(24, 6).loft(ngon(19, 6), { spacing: H, ruled: true }).color(wood));
c.part('finial', ngon(19, 6).loft([ngon(34, 6), ngon(8, 6)], {
  planes: [
    { plane: 'XY', origin: [0, 0, H - 1] },
    { plane: 'XY', origin: [0, 0, H + 40] },
    { plane: 'XY', origin: [0, 0, H + 90] },
  ],
  ruled: true,
}).color(wood));
for (let i = 0; i < 4; i++) {
  const a = (Math.PI / 2) * i + Math.PI / 4;
  c.part(`foot-${i + 1}`, strut(16, [330 * Math.cos(a), 330 * Math.sin(a), 0], [10 * Math.cos(a), 10 * Math.sin(a), 280]).color(wood));
}
// Pegs in two tiers, angled up and out.
for (let i = 0; i < n; i++) {
  const tier = i % 2;
  const a = (2 * Math.PI * i) / n;
  const z = H - 120 - tier * 140;
  c.part(`peg-${i + 1}`, strut(10, [0, 0, z - 40], [200 * Math.cos(a), 200 * Math.sin(a), z + 60]).color(wood));
}
if (clothes.value === 'yes') {
  // Coat: shoulders hang from the front peg, the body flares to the hem.
  const a = 0;
  const px = 170 * Math.cos(a);
  const coatShape = path().moveTo(-150, -60).lineTo(150, -60).lineTo(170, 60).lineTo(-170, 60).close()
    .loft([path().moveTo(-220, -110).lineTo(220, -110).lineTo(240, 100).lineTo(-240, 100).close()], {
      planes: [
        { plane: 'XY', origin: [0, 0, 0] },
        { plane: 'XY', origin: [0, 0, -900] },
      ],
      ruled: true,
    });
  c.part('coat', coatShape.rotateZ(90).translate(px + 50, 0, H - 100).color(coat));
  c.part('scarf', box(70, 120, 520, true).rotateZ(20).translate(-150, 90, H - 420).color(scarf));
  c.part('scarf-loop', box(60, 60, 60, true).translate(-120, 110, H - 160).color(scarf));
  c.part('hat-brim', ngon(150, 10).extrude(15).translate(-100, -120, H + 25).color(hat));
  c.part('hat-crown', ngon(90, 10).loft(ngon(80, 10), { spacing: 110, ruled: true }).translate(-100, -120, H + 39).color(hat));
}

return c.model();
