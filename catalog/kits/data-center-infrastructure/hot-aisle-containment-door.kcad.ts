// SPDX-License-Identifier: CC0-1.0
// Hot-aisle containment door: Aisle-end door assembly with uprights, clear-panel frame, and pull handle.
// Each leaf is a painted-steel frame around a clear polycarbonate panel, so staff can see into the hot aisle.

meta({
  name: "hot-aisle-containment-door",
  license: 'CC0-1.0',
  title: "Hot-aisle containment door",
  description: "Aisle-end door assembly with uprights, two painted-steel door frames with clear polycarbonate panels, and pull handle. Knobs: overall scale; painted steel, clear polycarbonate glazing, engineering polymer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const glazing = param('glazing', '#9fd3dc', { label: 'Clear polycarbonate glazing' });
const polymer = param('polymer', '#c99b35', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    glazing: '#9fd3dc',
    polymer: '#c99b35',
  },
  highVisibility: {
    steel: '#d99b22',
    glazing: '#c4e8ee',
    polymer: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("hot-aisle-containment-door");
p.part("left-jamb", b(-620, 0, 0, 75, 100, 2250).color(steel));
p.part("right-jamb", b(620, 0, 0, 75, 100, 2250).color(steel));
p.part("header", b(0, 0, 2175, 1320, 100, 75).color(steel));
p.part("door-stile-left-outer", b(-525, 0, 120, 50, 35, 1920).color(steel));
p.part("door-stile-left-inner", b(-75, 0, 120, 50, 35, 1920).color(steel));
p.part("door-rail-left-bottom", b(-300, 0, 120, 400, 35, 90).color(steel));
p.part("door-rail-left-top", b(-300, 0, 1980, 400, 35, 60).color(steel));
p.part("door-glazing-left", b(-300, 0, 210, 400, 8, 1770).color(glazing));
p.part("door-stile-right-outer", b(525, 0, 120, 50, 35, 1920).color(steel));
p.part("door-stile-right-inner", b(75, 0, 120, 50, 35, 1920).color(steel));
p.part("door-rail-right-bottom", b(300, 0, 120, 400, 35, 90).color(steel));
p.part("door-rail-right-top", b(300, 0, 1980, 400, 35, 60).color(steel));
p.part("door-glazing-right", b(300, 0, 210, 400, 8, 1770).color(glazing));
p.part("pull-handle", b(0, -45, 950, 35, 60, 240).color(polymer));
p.part("hinge-top", c(-590, 0, 1750, 65, 28, 8).color(steel));

return p.model();
