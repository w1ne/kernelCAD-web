// Distinctive geometry: Low-poly right-angle mounting bracket with two drilled legs and a reinforcing web
meta({
  name: 'angle-bracket',
  license: 'CC0-1.0',
  title: 'Angle bracket',
  description: 'Low-poly right-angle mounting bracket with two drilled legs and a reinforcing web Knobs: model size, steel, stainless steel.',
  tags: ['angle bracket', 'mounting bracket', 'corner', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 360,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91' },
  brass: { steel: '#646f75', stainless: '#b38b52' },
  weathered: { steel: '#665b4d', stainless: '#8b8275' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('angle-bracket');
const plateT = 4 * s;
a.part('foot', block(-24*s, -18*s, 0, 48*s, 36*s, plateT).subtract(cylinder(plateT+2*s, 3*s, 10).translate(-14*s, 0, -s)).subtract(cylinder(plateT+2*s, 3*s, 10).translate(14*s, 0, -s)).color(steel));
a.part('upright', block(-24*s, 14*s, plateT, 48*s, plateT*2, 34*s).subtract(cylinder(plateT*2+2*s, 3*s, 10).rotateX(90).translate(-14*s, 18*s, 28*s)).subtract(cylinder(plateT*2+2*s, 3*s, 10).rotateX(90).translate(14*s, 18*s, 28*s)).color(steel));
a.part('web', extrudePolygon([[-22*s,0],[22*s,0],[22*s,27*s]], plateT).rotateX(90).translate(0,14*s,plateT).color(stainless));
return a.model();
