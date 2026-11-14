// Hollow sleeve coupling with rolled end collars and optional elastomer seals
// recessed into the bore at both pipe entries.
meta({
  name: 'pipe-coupling',
  license: 'CC0-1.0',
  title: 'Pipe coupling sleeve',
  description: 'Hollow straight pipe sleeve with raised end collars and a visible pair of elastomer bore seals. Choose sealed or bare ends and recolor the steel, stainless collars and rubber seals.',
  tags: ['pipe coupling', 'sleeve coupling', 'pipe fitting', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 640,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const sealConfiguration = param('sealConfiguration', 'two-seals', { choices: ['two-seals', 'bare-sleeve'], label: 'Bore seals' });
const steel = param('steel', '#85929a', { label: 'Sleeve steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Collar stainless steel' });
const seal = param('seal', '#343b3e', { label: 'Elastomer seal' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91', seal: '#242729' },
  brass: { steel: '#646f75', stainless: '#b38b52', seal: '#2a2d2f' },
  weathered: { steel: '#665b4d', stainless: '#8b8275', seal: '#3b3935' },
  cleanService: { steel: '#9aa6ad', stainless: '#c8d0d4', seal: '#477c8d' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('pipe-coupling');
const sleeve = cylinder(28 * s, 17 * s, 14)
  .subtract(cylinder(30 * s, 12 * s, 14).translate(0, 0, -s));
a.part('coupling-sleeve', sleeve.color(steel));

const collar = cylinder(4 * s, 19 * s, 14)
  .subtract(cylinder(6 * s, 12 * s, 14).translate(0, 0, -s));
a.part('entry-collar-a', collar.color(stainless));
a.part('entry-collar-b', collar.translate(0, 0, 24 * s).color(stainless));

if (sealConfiguration.value === 'two-seals') {
  const sealRing = cylinder(2 * s, 11.7 * s, 14)
    .subtract(cylinder(2.2 * s, 9.5 * s, 14).translate(0, 0, -0.1 * s));
  a.part('bore-seal-a', sealRing.translate(0, 0, 1 * s).color(seal));
  a.part('bore-seal-b', sealRing.translate(0, 0, 25 * s).color(seal));
}

return a.model();
