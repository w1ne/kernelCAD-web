// SPDX-License-Identifier: CC0-1.0
// Floor cable grommet: Raised-floor cable pass-through with split collar and protective curb.

meta({
  name: "floor-cable-grommet",
  license: 'CC0-1.0',
  title: "Floor cable grommet",
  description: "Raised-floor cable pass-through with split collar and protective curb. Knobs: overall scale; painted steel, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("floor-cable-grommet");
p.part("floor-curb", b(0, 0, 0, 440, 360, 55).color(steel));
p.part("split-collar-left", b(-72, 0, 55, 280, 80, 65).color(steel));
p.part("split-collar-right", b(72, 0, 55, 280, 80, 65).color(steel));
p.part("cable-pass-ring", c(0, 0, 55, 75, 85, 12).color(rubber));
p.part("clamp-boss", c(-150, 0, 55, 45, 24, 8).color(steel));

return p.model();
