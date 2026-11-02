meta({
  name: 'vacuum-pump',
  license: 'CC0-1.0',
  title: 'Rotary vacuum pump',
  description: 'Compact rotary vacuum pump with finned drive body, inlet chamber, exhaust cap and base feet. Knobs: size, housing, steel and safety colours.',
  tags: ['vacuum pump', 'rotary pump', 'factory', 'industrial'],
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
const a = assembly('vacuum-pump');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const L = 720 * S, R = 235 * S;
block('base', 1020 * S, 500 * S, 70 * S, 0, 0, 0, steel);
a.part('pump-body', ngon(R, 10).extrude(L).rotateY(90).translate(-L / 2, 0, R + 70 * S).color(body));
for (let i = 0; i < 5; i++) a.part(`cooling-band-${i}`, ngon(R + 12 * S, 10).extrude(24 * S).rotateY(90).translate(-L * 0.32 + i * L * 0.16, 0, R + 70 * S).color(steel));
a.part('inlet', ngon(115 * S, 8).extrude(160 * S).translate(0, 0, 2 * R + 70 * S).color(accent));
a.part('exhaust', ngon(80 * S, 8).extrude(180 * S).translate(L / 2 - 60 * S, 0, 2 * R + 70 * S).color(steel));

return a.model();
