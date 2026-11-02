meta({
  name: 'process-mixing-tank',
  license: 'CC0-1.0',
  title: 'Process mixing tank',
  description: 'Agitated process vessel with legs, top-mounted drive, shaft, discharge nozzle and safety rail. Knobs: size, vessel, steel and safety colours.',
  tags: ['mixing tank', 'agitator', 'process vessel', 'factory', 'industrial'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial', 'factory'],
  triangleBudget: 600,
});

const scale = param('size', '1', { choices: ['0.8', '1', '1.25'], label: 'Size scale' });
const body = param('body', '#607478', { label: 'Main body' });
const steel = param('steel', '#3f484b', { label: 'Steelwork' });
const accent = param('accent', '#dda91f', { label: 'Safety accent' });

presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('process-mixing-tank');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const R = 540 * S, H = 1800 * S;
a.part('vessel', ngon(R, 10).extrude(H).translate(0, 0, 180 * S).color(body));
a.part('base-ring', ringZ(R + 20 * S, 34 * S, 0, 0, 180 * S, steel));
a.part('top-rim', ringZ(R + 20 * S, 34 * S, 0, 0, 1980 * S, steel));
for (let i = 0; i < 4; i++) {
  const ang = Math.PI / 4 + i * Math.PI / 2;
  block(`leg-${i}`, 70 * S, 70 * S, 230 * S, Math.cos(ang) * R * 0.76, Math.sin(ang) * R * 0.76, 0, steel);
}
a.part('drive', ngon(180 * S, 8).extrude(220 * S).translate(0, 0, 2014 * S).color(accent));
a.part('shaft', ngon(35 * S, 6).extrude(1250 * S).translate(0, 0, 760 * S).color(steel));
block('impeller', 700 * S, 60 * S, 34 * S, 0, 0, 1150 * S, steel);
a.part('outlet', ngon(80 * S, 8).extrude(240 * S).rotateY(90).translate(R - 20 * S, 0, 340 * S).color(accent));

return a.model();
