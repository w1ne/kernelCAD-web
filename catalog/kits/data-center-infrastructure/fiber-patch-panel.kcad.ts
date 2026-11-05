// SPDX-License-Identifier: CC0-1.0
// Fiber patch panel: Slim fiber distribution panel with paired connector rows and mounting flanges.

meta({
  name: "fiber-patch-panel",
  license: 'CC0-1.0',
  title: "Fiber patch panel",
  description: "Slim fiber distribution panel with paired connector rows and mounting flanges. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("fiber-patch-panel");
p.part("chassis-shell", b(0, 0, 0, 440, 65, 90).color(steel));
p.part("front-face", b(0, -44.5, 10, 412, 24, 70).color(steel));
p.part("left-mounting-ear", b(-244.0, 0, 0, 32, 65, 90).color(steel));
p.part("right-mounting-ear", b(244.0, 0, 0, 32, 65, 90).color(steel));
p.part("slide-rail-left", hx(0, -22.1, 35, 560, 12, 8).color(steel));
p.part("slide-rail-right", hx(0, 22.1, 35, 560, 12, 8).color(steel));
p.part("fiber-coupler-0", hy(-184.79999999999998, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-1", hy(-151.2, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-2", hy(-117.6, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-3", hy(-84.0, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-4", hy(-50.400000000000006, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-5", hy(-16.80000000000001, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-6", hy(16.799999999999983, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-7", hy(50.39999999999998, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-8", hy(83.99999999999997, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-9", hy(117.6, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-10", hy(151.19999999999996, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("fiber-coupler-11", hy(184.79999999999993, -49.5, 50.400000000000006, 28, 10, 8).color(polymer));
p.part("status-control", c(167.2, -50.5, 43.199999999999996, 24, 12, 8).color(polymer));

return p.model();
