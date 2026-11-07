// SPDX-License-Identifier: CC0-1.0
// Open-frame IT rack: Four-post equipment rack with adjustable rails, cross-bracing, and base frame.

meta({
  name: "open-frame-it-rack",
  license: 'CC0-1.0',
  title: "Open-frame IT rack",
  description: "Four-post equipment rack with adjustable rails, cross-bracing, and base frame. Knobs: overall scale; painted steel, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("open-frame-it-rack");
p.part("base-plinth", b(0, 0, 0, 720, 1000, 80).color(steel));
p.part("top-frame", b(0, 0, 2010, 720, 1000, 70).color(steel));
p.part("front-left-post", b(-337.5, -477.5, 80, 45, 45, 1930).color(steel));
p.part("front-right-post", b(337.5, -477.5, 80, 45, 45, 1930).color(steel));
p.part("rear-left-post", b(-337.5, 477.5, 80, 45, 45, 1930).color(steel));
p.part("rear-right-post", b(337.5, 477.5, 80, 45, 45, 1930).color(steel));
p.part("front-rail-left", b(-260.0, -500.0, 120, 55, 35, 1860).color(steel));
p.part("front-rail-right", b(260.0, -500.0, 120, 55, 35, 1860).color(steel));
p.part("rear-crossbar", b(0, 465.0, 1155.0, 630, 45, 65).color(steel));
p.part("leveling-foot-front-left", c(-315.0, -455.0, 0, 55, 32, 8).color(rubber));
p.part("leveling-foot-front-right", c(315.0, -455.0, 0, 55, 32, 8).color(rubber));
p.part("left-side-brace", b(-325.0, 0, 420.0, 35, 45, 1302.0).color(steel));
p.part("right-side-brace", b(325.0, 0, 420.0, 35, 45, 1302.0).color(steel));
p.part("cross-brace-a", b(0, 0, 798.0, 620, 35, 38).color(steel));
p.part("cross-brace-b", b(0, 0, 1218.0, 620, 35, 38).color(steel));
p.part("equipment-rail-0", b(0, -390.0, 150, 600, 36, 45).color(steel));
p.part("equipment-rail-1", b(0, -180.0, 190, 600, 36, 45).color(steel));
p.part("equipment-rail-2", b(0, 30.0, 150, 600, 36, 45).color(steel));
p.part("equipment-rail-3", b(0, 240.0, 190, 600, 36, 45).color(steel));
p.part("equipment-rail-4", b(0, 450.0, 150, 600, 36, 45).color(steel));

return p.model();
