// SPDX-License-Identifier: CC0-1.0
// Masking leg: Narrow masking curtain section with a hanging cloth panel, top sleeve and weighted floor hem.

meta({
  name: "masking-leg",
  license: 'CC0-1.0',
  title: "Masking leg",
  description: "Narrow masking curtain section with a hanging cloth panel, top sleeve and weighted floor hem. Knobs: overall scale; stage fabric, painted steel, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const fabric = param('fabric', '#463849', { label: 'Stage fabric' });
const steel = param('steel', '#46515a', { label: 'Painted steel' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    fabric: '#28262d',
    steel: '#343b41',
    hardware: '#c5a052',
  },
  touring: {
    fabric: '#a14469',
    steel: '#315968',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("masking-leg");
p.part("cloth-panel", b(0,0,0,950,55,2100).color(fabric));
p.part("top-sleeve", b(0,0,2070,1000,80,80).color(steel));
p.part("weighted-hem", b(0,0,0,960,75,100).color(fabric));
p.part("side-seam-left", b(-460,0,120,32,65,1800).color(fabric));
p.part("side-seam-right", b(460,0,120,32,65,1800).color(fabric));
p.part("top-hook-left", b(-360,0,2140,42,45,65).color(hardware));
p.part("top-hook-right", b(360,0,2140,42,45,65).color(hardware));
p.part("hem-weight-left", c(-350,0,0,100,38,10).color(fabric));
p.part("hem-weight-right", c(350,0,0,100,38,10).color(fabric));



return p.model();
