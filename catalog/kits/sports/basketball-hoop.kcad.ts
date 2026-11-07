// Basketball Hoop: Freestanding basketball hoop with a weighted base, clear backboard, red rim and tapered hanging net cords. Low-poly sports prop in millimetres, Z up; materials: powder-coated steel, backboard polycarbonate, rim steel, net nylon.
meta({
  name: 'basketball-hoop',
  license: 'CC0-1.0',
  title: 'Basketball hoop',
  description: "Freestanding basketball hoop with a weighted base, clear backboard, red rim and tapered hanging net cords. Material controls: powder-coated steel, backboard polycarbonate, rim steel, net nylon.",
  tags: ['basketball hoop', 'backboard', 'court', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param('powderCoat', '#647987', { label: 'Powder-coated steel' });
const backboardPolycarbonate = param('backboardPolycarbonate', '#d8e3df', { label: 'Backboard polycarbonate' });
const rimSteel = param('rimSteel', '#d34a3b', { label: 'Rim steel' });
const netNylon = param('netNylon', '#eee8d8', { label: 'Net nylon' });
presets({ clubColors: { powderCoat: '#496b52', backboardPolycarbonate: '#d8e3df' } });
const p = assembly('basketball-hoop');
p.part('base', box(120, 92, 18, true).translate(0, 0, 9).scale(scale).color(powderCoat));
p.part('upright', cylinder(330, 13, 10).scale(scale).color(powderCoat));
p.part('support-arm', box(100, 16, 16, true).translate(0, 0, 265).scale(scale).color(powderCoat));
p.part('backboard', box(220, 14, 150, true).translate(0, 0, 340).scale(scale).color(backboardPolycarbonate));
p.part('rim', cylinder(8, 56, 16).subtract(cylinder(10, 43, 16).translate(0, 0, -1)).translate(0, 0, 236).scale(scale).color(rimSteel));


const seamStroke = (name: string, a: [number, number, number], b: [number, number, number], radius: number, finish: string) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  const axis: [number, number, number] = [-dy, dx, 0];
  const angle = Math.acos(Math.max(-1, Math.min(1, dz / length))) * 180 / Math.PI;
  const shape = cylinder(length + 0.7, radius, 6).rotate(axis, angle).translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  p.part(name, shape.color(finish));
};

// Tapered hanging nylon cords make the rim assembly read as a playable hoop.
for (let i = 0; i < 12; i++) {
  const a = 2 * Math.PI * i / 12, b = 2 * Math.PI * (i + 0.5) / 12;
  seamStroke(`net-cord-${i + 1}`, [56 * Math.cos(a), 56 * Math.sin(a), 236], [34 * Math.cos(b), 34 * Math.sin(b), 185], 1.1, netNylon);
}

return p.model();
