// Original kernelCAD flotation ring with four contrasting grab straps.

meta({
  name: 'lifebuoy', license: 'CC0-1.0', title: 'Lifebuoy ring',
  description: 'Ring-shaped flotation aid with a hollow center and four evenly spaced grab straps. Knobs: size, ring and band colours.',
  tags: ['lifebuoy', 'life ring', 'rescue', 'marine', 'watercraft', 'safety'], kit: 'watercraft', category: 'prop', origin: 'base',
  compat: ['water', 'harbor', 'coastal', 'safety'], triangleBudget: 240,
});

const size = param('size', '650', { choices: ['550', '650', '750'], label: 'Outside diameter (mm)' });
const ringColor = param('ring', '#e85a3b', { label: 'Flotation ring' });
const band = param('band', '#f2eee2', { label: 'Reflective band' });
presets({ rescue: { ring: '#e85a3b', band: '#f2eee2' }, marine: { ring: '#f0ece0', band: '#d84d34' } });

const R = Number(size.value) / 2;
const ring = cylinder(75, R, 12).subtract(cylinder(77, R * 0.58, 12).translate(0, 0, -1));
const buoy = assembly('lifebuoy');
buoy.part('float-ring', ring.color(ringColor));
for (const angle of [0, 90, 180, 270]) {
  const rad = angle * Math.PI / 180;
  buoy.part('grab-band-' + angle, box(44, R * 0.82, 74, true).rotateZ(angle).translate(Math.sin(rad) * R * 0.72, Math.cos(rad) * R * 0.72, 37).color(band));
}
return buoy.model();
