// SPDX-License-Identifier: CC0-1.0
// Storage array chassis: Rack storage chassis with drive carriers, controller bays, and paired handles.

meta({
  name: "storage-array-chassis",
  license: 'CC0-1.0',
  title: "Storage array chassis",
  description: "Rack storage chassis with drive carriers, controller bays, and paired handles. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const polymer = param('polymer', '#c99b35', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#c99b35',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("storage-array-chassis");
p.part("chassis-shell", b(0, 0, 0, 440, 760, 135).color(steel));
p.part("front-face", b(0, -392.0, 10, 412, 24, 115).color(steel));
p.part("left-mounting-ear", b(-244.0, 0, 0, 32, 760, 135).color(steel));
p.part("right-mounting-ear", b(244.0, 0, 0, 32, 760, 135).color(steel));
p.part("slide-rail-left", hx(0, -258.40000000000003, 35, 560, 12, 8).color(steel));
p.part("slide-rail-right", hx(0, 258.40000000000003, 35, 560, 12, 8).color(steel));
p.part("drive-carrier-0", b(-184.79999999999998, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("drive-carrier-1", b(-132.0, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("drive-carrier-2", b(-79.19999999999999, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("drive-carrier-3", b(-26.400000000000006, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("drive-carrier-4", b(26.400000000000006, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("drive-carrier-5", b(79.20000000000002, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("drive-carrier-6", b(131.99999999999997, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("drive-carrier-7", b(184.79999999999998, -398.0, 18, 33.0, 28, 99).color(polymer));
p.part("status-control", c(167.2, -398.0, 64.8, 24, 12, 8).color(polymer));

return p.model();
