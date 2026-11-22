// SPDX-License-Identifier: CC0-1.0
// Rack blanking panel: Removable rack face panel with end brackets and a small grip tab.

meta({
  name: "rack-blanking-panel",
  license: 'CC0-1.0',
  title: "Rack blanking panel",
  description: "Removable rack face panel with end brackets and a small grip tab. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("rack-blanking-panel");
p.part("chassis-shell", b(0, 0, 0, 440, 32, 90).color(steel));
p.part("front-face", b(0, -28.0, 10, 412, 24, 70).color(steel));
p.part("left-mounting-ear", b(-244.0, 0, 0, 32, 32, 90).color(steel));
p.part("right-mounting-ear", b(244.0, 0, 0, 32, 32, 90).color(steel));
p.part("slide-rail-left", hx(0, -10.88, 35, 560, 12, 8).color(steel));
p.part("slide-rail-right", hx(0, 10.88, 35, 560, 12, 8).color(steel));
p.part("drive-carrier-0", b(-184.79999999999998, -34.0, 18, 33.0, 28, 54).color(polymer));
p.part("status-control", c(167.2, -34.0, 43.199999999999996, 24, 12, 8).color(polymer));

return p.model();
