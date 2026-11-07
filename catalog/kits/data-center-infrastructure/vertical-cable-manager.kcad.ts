// SPDX-License-Identifier: CC0-1.0
// Vertical cable manager: Rack-side cable channel with repeated fingers, covers, and mounting rails.

meta({
  name: "vertical-cable-manager",
  license: 'CC0-1.0',
  title: "Vertical cable manager",
  description: "Rack-side cable channel with repeated fingers, covers, and mounting rails. Knobs: overall scale; painted steel, rubber and elastomer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const rubber = param('rubber', '#252a2d', { label: 'Rubber and elastomer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    rubber: '#252a2d',
  },
  highVisibility: {
    steel: '#d99b22',
    rubber: '#2a3033',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("vertical-cable-manager");
p.part("back-channel", b(0, 0, 0, 280, 160, 2050).color(steel));
p.part("mounting-left", b(-170, 0, 0, 38, 280, 2050).color(steel));
p.part("mounting-right", b(170, 0, 0, 38, 280, 2050).color(steel));
p.part("cable-finger-0", b(0, -90, 100, 430, 50, 28).color(rubber));
p.part("cable-finger-1", b(0, -90, 225, 430, 50, 28).color(rubber));
p.part("cable-finger-2", b(0, -90, 350, 430, 50, 28).color(rubber));
p.part("cable-finger-3", b(0, -90, 475, 430, 50, 28).color(rubber));
p.part("cable-finger-4", b(0, -90, 600, 430, 50, 28).color(rubber));
p.part("cable-finger-5", b(0, -90, 725, 430, 50, 28).color(rubber));
p.part("cable-finger-6", b(0, -90, 850, 430, 50, 28).color(rubber));
p.part("cable-finger-7", b(0, -90, 975, 430, 50, 28).color(rubber));
p.part("cable-finger-8", b(0, -90, 1100, 430, 50, 28).color(rubber));
p.part("cable-finger-9", b(0, -90, 1225, 430, 50, 28).color(rubber));
p.part("cable-finger-10", b(0, -90, 1350, 430, 50, 28).color(rubber));
p.part("cable-finger-11", b(0, -90, 1475, 430, 50, 28).color(rubber));
p.part("cable-finger-12", b(0, -90, 1600, 430, 50, 28).color(rubber));
p.part("cable-finger-13", b(0, -90, 1725, 430, 50, 28).color(rubber));
p.part("cable-finger-14", b(0, -90, 1850, 430, 50, 28).color(rubber));
p.part("anchor-boss", c(0, 0, 0, 42, 58, 8).color(steel));

return p.model();
