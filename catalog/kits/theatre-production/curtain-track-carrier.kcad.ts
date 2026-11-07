// SPDX-License-Identifier: CC0-1.0
// Curtain track carrier: Compact trolley carriage with roller wheels, curtain hook and end-stop tab.

meta({
  name: "curtain-track-carrier",
  license: 'CC0-1.0',
  title: "Curtain track carrier",
  description: "Compact trolley carriage with roller wheels, curtain hook and end-stop tab. Knobs: overall scale; painted steel, steel hardware, rubber and isolation pads; houseShow and touring appearance presets.",
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
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });

presets({
  houseShow: {
    paintedSteel: '#313940',
    hardware: '#c5a052',
    rubber: '#222629',
  },
  touring: {
    paintedSteel: '#dda21f',
    hardware: '#e2b347',
    rubber: '#25292c',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("curtain-track-carrier");
p.part("carriage", b(0,0,95,280,100,70).color(paintedSteel));
p.part("hook-stem", b(0,-20,0,42,42,115).color(hardware));
p.part("hook-tip", b(0,-35,0,105,42,38).color(hardware));
p.part("left-cheek", b(-112,0,95,40,150,85).color(paintedSteel));
p.part("right-cheek", b(112,0,95,40,150,85).color(paintedSteel));
p.part("stop-tab", b(130,0,165,45,55,70).color(hardware));
p.part("wheel-left", c(-90,0,150,85,39,10).color(rubber));
p.part("wheel-right", c(90,0,150,85,39,10).color(rubber));
p.part("hanger-eye", c(0,0,0,68,30,10).color(hardware));



return p.model();
