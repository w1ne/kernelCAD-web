meta({
  name: 'chemical-storage-tank',
  license: 'CC0-1.0',
  title: 'Chemical storage tank',
  description: 'Vertical factory storage tank with banded shell, access ladder and a top nozzle. Knobs: height, facets, tank and steel colours.',
  tags: ['chemical storage tank', 'vertical tank', 'factory', 'industrial', 'process plant', 'vessel'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial', 'factory'],
  triangleBudget: 600,
});

const height = param('height', '2400', { choices: ['1800', '2400', '3200'], label: 'Height (mm)' });
const facets = param('facets', '10', { choices: ['8', '10', '12'], label: 'Facets' });
const tankColor = param('tank', '#477d82', { label: 'Tank' });
const steel = param('steel', '#4c5558', { label: 'Steel' });

presets({
  stainless: { tank: '#aeb9b9', steel: '#536066' },
  safetyYellow: { tank: '#d8a921', steel: '#3a4246' },
});

const H = Number(height.value);
const n = Number(facets.value);
const R = 520;
const deck = 250;
const shellH = H - deck - 50;
const ngon = (radius: number, sides: number) => {
  let p = path().moveTo(radius, 0);
  for (let i = 1; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    p = p.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return p.close();
};
const ring = (radius: number, z: number, thick: number) =>
  ngon(radius, n).extrude(thick)
    .subtract(ngon(radius - 18, n).extrude(thick + 2).translate(0, 0, -1))
    .translate(0, 0, z);

const a = assembly('chemical-storage-tank');
a.part('shell', ngon(R, n).extrude(shellH).translate(0, 0, deck).color(tankColor));
a.part('base-skirt', ring(R + 28, deck, 45).color(steel));
a.part('top-rim', ring(R + 28, H - 50, 50).color(steel));
a.part('roof', ngon(R - 10, n).extrude(24).translate(0, 0, H - 24).color(tankColor));
a.part('nozzle', ngon(72, n).extrude(90).translate(0, 0, H - 90).color(steel));
for (let i = 0; i < 4; i++) {
  const angle = Math.PI / 4 + i * Math.PI / 2;
  a.part(`support-leg-${i}`, box(78, 78, deck, true)
    .translate(Math.cos(angle) * R * 0.72, Math.sin(angle) * R * 0.72, deck / 2)
    .color(steel));
}

for (const [index, x] of [-R * 0.72, R * 0.72].entries()) {
  a.part(`ladder-rail-${index}`, box(26, 32, H - 220, true).translate(x, -R - 16, (H - 220) / 2).color(steel));
}
for (let z = 160; z < H - 170; z += 220) {
  a.part(`ladder-rung-${z}`, box(R * 1.44, 28, 24, true).translate(0, -R - 18, z).color(steel));
}

return a.model();
