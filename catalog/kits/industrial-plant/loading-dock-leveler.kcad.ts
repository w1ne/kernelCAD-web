meta({
  name: 'loading-dock-leveler',
  license: 'CC0-1.0',
  title: 'Loading dock leveler',
  description: 'Hydraulic dock leveler with pit frame, hinged ramp plate, front lip and warning-edge stripes. Knobs: size, deck, steel and safety colours.',
  tags: ['dock leveler', 'loading dock', 'warehouse', 'industrial', 'logistics'],
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
const a = assembly('loading-dock-leveler');
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const L = 1500 * S, W = 2050 * S, T = 130 * S;
block('pit-frame', L + 180 * S, W + 160 * S, 160 * S, 0, 0, 0, steel);
block('ramp-deck', L, W, T, -L * 0.08, 0, 160 * S, body);
block('lip', 280 * S, W * 0.98, 90 * S, L * 0.55, 0, 90 * S, accent);
for (let side = -1; side <= 1; side += 2) {
  block(`warning-edge-${side}`, L * 0.82, 55 * S, 32 * S, -L * 0.08, side * W * 0.47, 160 * S, accent);
  block(`lift-arm-${side}`, 760 * S, 65 * S, 65 * S, 0, side * W * 0.3, 80 * S, steel);
}

return a.model();
