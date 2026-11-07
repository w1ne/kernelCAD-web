// SPDX-License-Identifier: CC0-1.0
// Low promotional island with a pallet base, stacked riser blocks and a tall branded sign panel

meta({
  name: "pallet-display",
  license: 'CC0-1.0',
  title: "Promotional pallet display",
  description: "Low promotional island with a pallet base, stacked riser blocks and a tall branded sign panel. Knobs: overall scale and timber, steel, vinyl color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#94754e', { label: 'Timber color' });
const steel = param('steel', '#66757a', { label: 'Steel color' });
const vinyl = param('vinyl', '#d9b64d', { label: 'Vinyl color' });

presets({
  cleanStore: {
    timber: '#b9915c',
    steel: '#9ca8ab',
    vinyl: '#dce9dc',
  },
  nightRestock: {
    timber: '#6e5133',
    steel: '#4a585d',
    vinyl: '#d2a536',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("pallet-display");
p.part("pallet-deck", b(0, 0, 95, 1200, 1000, 190).color(timber));
p.part("runner--440", b(-440, 0, 32, 135, 880, 64).color(timber));
p.part("runner-0", b(0, 0, 32, 135, 880, 64).color(timber));
p.part("runner-440", b(440, 0, 32, 135, 880, 64).color(timber));
p.part("display-base", b(0, 0, 390, 1000, 800, 400).color(timber));
p.part("sign-mast", b(0, 380, 1050, 55, 70, 900).color(steel));
p.part("sign-panel", b(0, 380, 1560, 760, 70, 240).color(vinyl));
p.part("mast-cap", c(0, 380, 1680, 28, 42, 8).color(steel));

return p.model();
