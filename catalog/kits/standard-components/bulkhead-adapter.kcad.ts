// Distinctive geometry: Hollow through-wall adapter with a tube barrel and a flange on each side
meta({
  name: 'bulkhead-adapter',
  license: 'CC0-1.0',
  title: 'Bulkhead adapter',
  description: 'Hollow through-wall adapter with a tube barrel and a flange on each side Knobs: model size, stainless steel, brass.',
  tags: ['bulkhead adapter', 'panel fitting', 'pipe adapter', 'connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
presets({
  dark: { stainless: '#7d8a91', brass: '#725938' },
  brass: { stainless: '#b38b52', brass: '#c0944d' },
  weathered: { stainless: '#8b8275', brass: '#8c734d' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('bulkhead-adapter');
a.part('barrel',cylinder(30*s,12*s,12).subtract(cylinder(32*s,8*s,12).translate(0,0,-s)).color(brass));
a.part('lower-flange',cylinder(5*s,21*s,14).subtract(cylinder(7*s,8*s,12).translate(0,0,-s)).color(stainless));
a.part('upper-flange',cylinder(5*s,21*s,14).subtract(cylinder(7*s,8*s,12).translate(0,0,-s)).translate(0,0,25*s).color(stainless));
return a.model();
