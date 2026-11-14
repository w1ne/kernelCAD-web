// Panel cable gland with a selectable cable opening, compression cap, rubber
// seal and a short jacketed cable stub. Dimensions are generic scene geometry.
meta({
  name: 'cable-gland',
  license: 'CC0-1.0',
  title: 'Cable gland',
  description: 'Panel cable gland with a selectable nominal 4, 6, or 8 mm cable diameter that stays fixed across housing sizes, molded polymer body, six-flat stainless compression cap, rubber seal and jacketed cable stub. Material controls: engineering polymer, stainless steel, sealing rubber and cable PVC. Includes industrial, highVisibility and marine presets.',
  tags: ['cable gland', 'cord grip', 'panel fitting', 'electrical'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 900,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const cableDiameter = param('cableDiameter', '6', { choices: ['4', '6', '8'], label: 'Cable diameter (mm)' });
const polymer = param('polymer', '#e06a31', { label: 'Engineering polymer' });
const stainless = param('stainless', '#b7c1c5', { label: 'Stainless steel' });
const rubber = param('rubber', '#292e30', { label: 'Sealing rubber' });
const cablePvc = param('cablePvc', '#24516b', { label: 'Cable PVC' });
presets({
  industrial: { polymer: '#68777b', stainless: '#b7c1c5', rubber: '#292e30', cablePvc: '#343a40' },
  highVisibility: { polymer: '#e06a31', stainless: '#d0d6d8', rubber: '#25292b', cablePvc: '#e3a62f' },
  marine: { polymer: '#276b77', stainless: '#aebbc0', rubber: '#23292b', cablePvc: '#343a40' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const cableRadius = Number(cableDiameter.value) / 2;
// The selected nominal cable diameter stays fixed while the housing size
// changes; only the clearance around it scales with the overall size choice.
const boreRadius = cableRadius + 1.5 * s;
const a = assembly('cable-gland');
const bore = (height: number) => cylinder(height, boreRadius, 16).translate(0, 0, -s);

let body = cylinder(22 * s, 12 * s, 16).subtract(bore(24 * s));
// Raised molded grip ribs make the polymer barrel read as a gland body.
for (const z of [6, 10, 14, 18]) {
  const rib = cylinder(1.4 * s, 12.8 * s, 16)
    .subtract(cylinder(1.8 * s, 11.5 * s, 16).translate(0, 0, -0.2 * s))
    .translate(0, 0, z * s);
  body = body.union(rib);
}
a.part('molded-barrel', body.color(polymer));
a.part('mounting-flange', cylinder(4 * s, 20 * s, 16)
  .subtract(bore(6 * s)).color(polymer));
a.part('stainless-compression-cap', cylinder(7 * s, 15.5 * s, 6)
  .subtract(bore(9 * s)).translate(0, 0, 22 * s).color(stainless));
a.part('rubber-cable-seal', cylinder(5 * s, 10.8 * s, 16)
  .subtract(cylinder(7 * s, cableRadius, 16).translate(0, 0, -s))
  .translate(0, 0, 29 * s).color(rubber));
a.part('jacketed-cable', cylinder(16 * s, cableRadius, 16)
  .translate(0, 0, 31 * s).color(cablePvc));
return a.model();
