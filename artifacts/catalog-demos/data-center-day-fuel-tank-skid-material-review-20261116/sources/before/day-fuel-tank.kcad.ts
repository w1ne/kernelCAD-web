// SPDX-License-Identifier: CC0-1.0
// Generator day tank: Compact fuel reservoir with support feet, top fill neck, and level gauge.

meta({
  name: "day-fuel-tank",
  license: 'CC0-1.0',
  title: "Generator day tank",
  description: "Compact fuel reservoir with support feet, top fill neck, and level gauge. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("day-fuel-tank");
p.part("support-skid", b(0, 0, 0, 1050, 800, 100).color(polymer));
p.part("reservoir", c(0, 0, 100, 1050, 370, 12).color(steel));
p.part("fill-neck", c(0, 0, 1150, 130, 65, 10).color(steel));
p.part("level-gauge", c(330, -250, 760, 450, 38, 8).color(steel));
p.part("access-platform", b(0, 0, 1100, 740, 560, 45).color(steel));
p.part("drain-valve", c(0, -430, 120, 140, 35, 8).color(steel));

return p.model();
