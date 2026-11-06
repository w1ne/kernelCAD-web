// SPDX-License-Identifier: CC0-1.0
// Motorized chain hoist: Compact overhead hoist body with a motor cover, suspension bail, chain drop and lower hook block.

meta({
  name: "motorized-chain-hoist",
  license: 'CC0-1.0',
  title: "Motorized chain hoist",
  description: "Compact overhead hoist body with a motor cover, suspension bail, chain drop and lower hook block. Knobs: overall scale; painted steel, galvanized steel, rubber and isolation pads, steel hardware; houseShow and touring appearance presets.",
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
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    paintedSteel: '#313940',
    galvanizedSteel: '#c0c8ca',
    rubber: '#222629',
    hardware: '#c5a052',
  },
  touring: {
    paintedSteel: '#dda21f',
    galvanizedSteel: '#dce2e2',
    rubber: '#25292c',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);


const hookProfile = () => path()
  .moveTo(-44, 185).lineTo(44, 185).lineTo(44, 124).lineTo(27, 124)
  .lineTo(23, 82).lineTo(9, 49).lineTo(-13, 27).lineTo(-39, 0)
  .lineTo(-63, 34).lineTo(-76, 58).lineTo(-73, 81).lineTo(-60, 96)
  .lineTo(-45, 85).lineTo(-53, 68).lineTo(-46, 52).lineTo(-31, 43)
  .lineTo(-15, 47).lineTo(-4, 61).lineTo(0, 82).lineTo(0, 124)
  .lineTo(-44, 124).close().extrude(38).rotateX(90).translate(0, 19, 0).scale(scale);

const p = assembly("motorized-chain-hoist");
p.part("hoist-case", b(0,0,850,430,360,370).color(paintedSteel));
p.part("motor-cover", b(-240,0,950,170,310,240).color(paintedSteel));
p.part("control-cover", b(210,-185,980,140,55,130).color(paintedSteel));
p.part("suspension-bail-left", b(-140,0,1220,60,70,220).color(paintedSteel));
p.part("suspension-bail-right", b(140,0,1220,60,70,220).color(paintedSteel));
p.part("bail-top", b(0,0,1420,340,70,55).color(paintedSteel));
p.part("chain", c(0,0,185,650,34,10).color(galvanizedSteel));
p.part("chain-wheel", c(0,0,1160,115,120,10).color(rubber));


p.part("hook-profile", hookProfile().color(hardware));

return p.model();
