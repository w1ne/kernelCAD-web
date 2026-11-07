// SPDX-License-Identifier: CC0-1.0
// Rack power distribution unit: Vertical rack power distribution unit with a narrow steel channel, repeated outlet sockets, a jacketed feed cable, and mounting tabs.

meta({
  name: "rack-power-distribution-unit",
  license: 'CC0-1.0',
  title: "Rack power distribution unit",
  description: "Vertical rack power distribution unit with a narrow steel channel, repeated outlet sockets, a jacketed feed cable, and mounting tabs. Knobs: overall scale; painted steel, engineering polymer, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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
const rubber = param('rubber', '#252a2d', { label: 'Rubber and elastomer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#c99b35',
    rubber: '#252a2d',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
    rubber: '#2a3033',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("rack-power-distribution-unit");
p.part("pdu-channel", b(0, 0, 0, 150, 135, 1980).color(steel));
p.part("front-strip", b(0, -78, 35, 120, 28, 1900).color(steel));
p.part("outlet-0", hy(0, -106, 100, 36, 18, 8).color(polymer));
p.part("outlet-1", hy(0, -106, 235, 36, 18, 8).color(polymer));
p.part("outlet-2", hy(0, -106, 370, 36, 18, 8).color(polymer));
p.part("outlet-3", hy(0, -106, 505, 36, 18, 8).color(polymer));
p.part("outlet-4", hy(0, -106, 640, 36, 18, 8).color(polymer));
p.part("outlet-5", hy(0, -106, 775, 36, 18, 8).color(polymer));
p.part("outlet-6", hy(0, -106, 910, 36, 18, 8).color(polymer));
p.part("outlet-7", hy(0, -106, 1045, 36, 18, 8).color(polymer));
p.part("outlet-8", hy(0, -106, 1180, 36, 18, 8).color(polymer));
p.part("outlet-9", hy(0, -106, 1315, 36, 18, 8).color(polymer));
p.part("outlet-10", hy(0, -106, 1450, 36, 18, 8).color(polymer));
p.part("outlet-11", hy(0, -106, 1585, 36, 18, 8).color(polymer));
p.part("outlet-12", hy(0, -106, 1720, 36, 18, 8).color(polymer));
p.part("mounting-tab-top", b(0, 85, 1830, 180, 40, 90).color(steel));
p.part("mounting-tab-bottom", b(0, 85, 80, 180, 40, 90).color(steel));
p.part("feed-cable", hy(0, 150, 42, 260, 18, 8).color(rubber));
p.part("cable-strain-relief", b(0, 165, 45, 60, 45, 45).color(rubber));

return p.model();
