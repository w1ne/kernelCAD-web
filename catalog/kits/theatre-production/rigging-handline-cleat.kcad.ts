// SPDX-License-Identifier: CC0-1.0
// Rigging handline cleat: Wall-mounted handline cleat panel with twin rope posts, fairlead and a lower locking bar.

meta({
  name: "rigging-handline-cleat",
  license: 'CC0-1.0',
  title: "Rigging handline cleat",
  description: "Wall-mounted handline cleat panel with twin rope posts, fairlead and a lower locking bar. Knobs: overall scale; painted steel, steel hardware, galvanized steel; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const paintedSteel = param('paintedSteel', '#454d54', { label: 'Painted steel' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });
const galvanizedSteel = param('galvanizedSteel', '#aab5b9', { label: 'Galvanized steel' });

presets({
  houseShow: {
    paintedSteel: '#313940',
    hardware: '#c5a052',
    galvanizedSteel: '#c0c8ca',
  },
  touring: {
    paintedSteel: '#dda21f',
    hardware: '#e2b347',
    galvanizedSteel: '#dce2e2',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("rigging-handline-cleat");
p.part("backplate", b(0,0,0,380,90,620).color(paintedSteel));
p.part("top-cap", b(0,0,620,420,130,55).color(paintedSteel));
p.part("left-cheek", b(-170,0,80,50,140,490).color(paintedSteel));
p.part("right-cheek", b(170,0,80,50,140,490).color(paintedSteel));
p.part("locking-bar", b(0,-70,210,320,45,55).color(hardware));
p.part("rope-guide", b(0,0,540,280,80,65).color(paintedSteel));
p.part("cleat-post-left", c(-100,-30,115,285,36,10).color(hardware));
p.part("cleat-post-right", c(100,-30,115,285,36,10).color(hardware));
p.part("fairlead", c(0,-55,520,120,60,10).color(galvanizedSteel));



return p.model();
