// SPDX-License-Identifier: CC0-1.0
// Rack-mounted battery tray: Compact rack battery module with cell covers, front latch, and slide rails.

meta({
  name: "rack-mounted-battery-tray",
  license: 'CC0-1.0',
  title: "Rack-mounted battery tray",
  description: "Compact rack battery module with cell covers, front latch, and slide rails. Knobs: overall scale; painted steel, engineering polymer, copper conductors. Presets: facilityStandard and highVisibility.",
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
const copper = param('copper', '#bd7748', { label: 'Copper conductors' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#c99b35',
    copper: '#bd7748',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
    copper: '#ce8948',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("rack-mounted-battery-tray");
p.part("tray-shell", b(0, 0, 0, 430, 690, 155).color(steel));
p.part("front-cover", b(0, -355, 16, 390, 30, 120).color(steel));
p.part("cell-cover-0", b(-150, 35, 155, 75, 520, 180).color(polymer));
p.part("cell-cover-1", b(-50, 35, 155, 75, 520, 180).color(polymer));
p.part("cell-cover-2", b(50, 35, 155, 75, 520, 180).color(polymer));
p.part("cell-cover-3", b(150, 35, 155, 75, 520, 180).color(polymer));
p.part("slide-rail-left", hx(0, -250, 55, 520, 16, 8).color(steel));
p.part("slide-rail-right", hx(0, 250, 55, 520, 16, 8).color(steel));
p.part("terminal-post-positive", c(-160, -390, 135, 22, 16, 8).color(copper));
p.part("terminal-post-negative", c(160, -390, 135, 22, 16, 8).color(copper));

return p.model();
