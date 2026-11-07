// SPDX-License-Identifier: CC0-1.0
// Lighting yoke bracket: U-shaped luminaire yoke with paired side arms, crossbar, pivot bosses and a center clamp stem.

meta({
  name: "lighting-yoke-bracket",
  license: 'CC0-1.0',
  title: "Lighting yoke bracket",
  description: "U-shaped luminaire yoke with paired side arms, crossbar, pivot bosses and a center clamp stem. Knobs: overall scale; painted steel, galvanized steel, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const paintedSteel = param('paintedSteel', '#454d54', { label: 'Painted steel' });
const galvanizedSteel = param('galvanizedSteel', '#aab5b9', { label: 'Galvanized steel' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    paintedSteel: '#313940',
    galvanizedSteel: '#c0c8ca',
    hardware: '#c5a052',
  },
  touring: {
    paintedSteel: '#dda21f',
    galvanizedSteel: '#dce2e2',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("lighting-yoke-bracket");
p.part("arm-left", b(-200,0,0,45,70,430).color(paintedSteel));
p.part("arm-right", b(200,0,0,45,70,430).color(paintedSteel));
p.part("crossbar", b(0,0,410,445,70,55).color(galvanizedSteel));
p.part("mount-plate", b(0,0,0,470,280,55).color(paintedSteel));
p.part("stiffener-left", b(-120,0,60,40,45,320).color(paintedSteel));
p.part("stiffener-right", b(120,0,60,40,45,320).color(paintedSteel));
p.part("pivot-left", c(-220,0,300,90,54,10).color(hardware));
p.part("pivot-right", c(220,0,300,90,54,10).color(hardware));
p.part("spigot", c(0,0,465,155,42,10).color(paintedSteel));



return p.model();
