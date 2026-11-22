// SPDX-License-Identifier: CC0-1.0
// Floor air grille: Low floor air register with a rigid perimeter frame, closely spaced louver bars, a damper tab, and a shallow curb.

meta({
  name: "floor-air-grille",
  license: 'CC0-1.0',
  title: "Floor air grille",
  description: "Low floor air register with a rigid perimeter frame, closely spaced louver bars, a damper tab, and a shallow curb. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("floor-air-grille");
p.part("register-curb", b(0, 0, 0, 650, 650, 45).color(polymer));
p.part("grille-frame", b(0, 0, 45, 600, 600, 35).color(steel));
p.part("air-louver-0", b(-240, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-1", b(-192, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-2", b(-144, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-3", b(-96, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-4", b(-48, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-5", b(0, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-6", b(48, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-7", b(96, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-8", b(144, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-9", b(192, 0, 80, 24, 535, 20).color(steel));
p.part("air-louver-10", b(240, 0, 80, 24, 535, 20).color(steel));
p.part("damper-adjuster-tab", b(268, 0, 78, 48, 48, 32).color(steel));

return p.model();
