// Four-hole equipment flange with a selectable through-bore, a rubber neck
// seal and visible zinc-plated socket-head mounting fasteners.
meta({
  name: 'square-mounting-flange',
  license: 'CC0-1.0',
  title: 'Square mounting flange',
  description: 'Four-hole square equipment flange with a selectable 10, 14, or 18 mm through-bore that stays fixed across housing sizes, raised stainless neck, rubber neck seal and installed socket-head fasteners. Material controls: cast iron, stainless steel, sealing rubber and zinc-plated steel. Includes dark, brass and weathered presets.',
  tags: ['square flange', 'mounting flange', 'bore mount', 'industrial'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 860,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const boreDiameter = param('boreDiameter', '14', { choices: ['10', '14', '18'], label: 'Through-bore diameter (mm)' });
const stainless = param('stainless', '#d0d5d3', { label: 'Stainless steel' });
const castIron = param('castIron', '#526774', { label: 'Cast iron' });
const rubber = param('rubber', '#363a3b', { label: 'Sealing rubber' });
const zincSteel = param('zincSteel', '#cbd1d5', { label: 'Zinc-plated steel' });
presets({
  dark: { stainless: '#7d8a91', castIron: '#3b4246', rubber: '#24282a', zincSteel: '#a0aaae' },
  brass: { stainless: '#b38b52', castIron: '#69645b', rubber: '#302b26', zincSteel: '#c29a5c' },
  weathered: { stainless: '#8b8275', castIron: '#4d4b46', rubber: '#302e2a', zincSteel: '#a19682' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const boreRadius = Number(boreDiameter.value) / 2;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('square-mounting-flange');
let plate = block(-36 * s, -36 * s, 0, 72 * s, 72 * s, 6 * s);
for (const x of [-29, 29]) for (const y of [-29, 29]) {
  plate = plate.subtract(cylinder(8 * s, 3 * s, 10).translate(x * s, y * s, -s));
}
a.part('cast-iron-flange', plate.color(castIron));
a.part('stainless-bore-neck', cylinder(10 * s, 18 * s, 16)
  .subtract(cylinder(17 * s, boreRadius, 16).translate(0, 0, -s))
  .translate(0, 0, 6 * s).color(stainless));
a.part('rubber-neck-seal', cylinder(1.8 * s, 20 * s, 20)
  .subtract(cylinder(3 * s, 16.5 * s, 20).translate(0, 0, -s))
  .translate(0, 0, 6 * s).color(rubber));
for (const x of [-29, 29]) for (const y of [-29, 29]) {
  a.part(`zinc-fastener-shank-${x}-${y}`, cylinder(5 * s, 2.2 * s, 10)
    .translate(x * s, y * s, 1 * s).color(zincSteel));
  a.part(`socket-head-${x}-${y}`, cylinder(1.8 * s, 4 * s, 10)
    .translate(x * s, y * s, 6 * s).color(zincSteel));
}
return a.model();
