// SPDX-License-Identifier: CC0-1.0
// Teaser border: Horizontal masking border with a rectangular frame, hanging cloth and top rigging sleeves.

meta({
  name: "teaser-border",
  license: 'CC0-1.0',
  title: "Teaser border",
  description: "Horizontal masking border with a rectangular frame, hanging cloth and top rigging sleeves. Knobs: overall scale; stage fabric, painted steel, steel hardware; houseShow and touring appearance presets.",
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

const p = assembly("teaser-border");
p.part("cloth", b(0,0,0,2100,65,650).color(fabric));
p.part("top-sleeve", b(0,0,650,2160,100,85).color(steel));
p.part("left-hem", b(-1025,0,0,55,80,650).color(fabric));
p.part("right-hem", b(1025,0,0,55,80,650).color(fabric));
p.part("bottom-weight", b(0,0,0,2100,70,55).color(hardware));
p.part("hang-tab-left", b(-900,0,720,70,90,80).color(hardware));
p.part("hang-tab-mid", b(0,0,720,70,90,80).color(hardware));
p.part("hang-tab-right", b(900,0,720,70,90,80).color(hardware));
p.part("grommet-left", c(-900,0,760,50,22,10).color(hardware));
p.part("grommet-right", c(900,0,760,50,22,10).color(hardware));



return p.model();
