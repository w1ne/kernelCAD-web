// SPDX-License-Identifier: CC0-1.0
// Enclosed IT rack: Full-height rack cabinet with front door frame, side panels, rails, and leveling feet.

meta({
  name: "enclosed-it-rack",
  license: 'CC0-1.0',
  title: "Enclosed IT rack",
  description: "Full-height rack cabinet with front door frame, side panels, rails, and leveling feet. Knobs: overall scale; painted steel, rubber and elastomer, engineering polymer. Presets: facilityStandard and highVisibility.",
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
const polymer = param('polymer', '#c99b35', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    rubber: '#252a2d',
    polymer: '#c99b35',
  },
  highVisibility: {
    steel: '#d99b22',
    rubber: '#2a3033',
    polymer: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("enclosed-it-rack");
p.part("base-plinth", b(0, 0, 0, 760, 1100, 80).color(steel));
p.part("top-frame", b(0, 0, 2110, 760, 1100, 70).color(steel));
p.part("front-left-post", b(-357.5, -527.5, 80, 45, 45, 2030).color(steel));
p.part("front-right-post", b(357.5, -527.5, 80, 45, 45, 2030).color(steel));
p.part("rear-left-post", b(-357.5, 527.5, 80, 45, 45, 2030).color(steel));
p.part("rear-right-post", b(357.5, 527.5, 80, 45, 45, 2030).color(steel));
p.part("front-rail-left", b(-280.0, -550.0, 120, 55, 35, 1960).color(steel));
p.part("front-rail-right", b(280.0, -550.0, 120, 55, 35, 1960).color(steel));
p.part("rear-crossbar", b(0, 515.0, 1210.0, 670, 45, 65).color(steel));
p.part("leveling-foot-front-left", c(-335.0, -505.0, 0, 55, 32, 8).color(rubber));
p.part("leveling-foot-front-right", c(335.0, -505.0, 0, 55, 32, 8).color(rubber));
p.part("left-side-panel", b(-358.0, 0, 90, 28, 990, 2020).color(steel));
p.part("right-side-panel", b(358.0, 0, 90, 28, 990, 2020).color(steel));
p.part("rear-door", b(0, 525.0, 100, 665, 30, 2000).color(steel));
p.part("front-door", b(0, -525.0, 100, 665, 30, 2000).color(steel));
p.part("door-handle", b(243.20000000000002, -562.0, 924.0, 28, 25, 260).color(polymer));
p.part("door-vent-inset", b(0, -546, 510, 340, 10, 720).color(steel));
p.part("door-vent-slat-0", b(0, -553, 540, 355, 10, 18).color(steel));
p.part("door-vent-slat-1", b(0, -553, 600, 355, 10, 18).color(steel));
p.part("door-vent-slat-2", b(0, -553, 660, 355, 10, 18).color(steel));
p.part("door-vent-slat-3", b(0, -553, 720, 355, 10, 18).color(steel));
p.part("door-vent-slat-4", b(0, -553, 780, 355, 10, 18).color(steel));
p.part("door-vent-slat-5", b(0, -553, 840, 355, 10, 18).color(steel));
p.part("door-vent-slat-6", b(0, -553, 900, 355, 10, 18).color(steel));
p.part("door-vent-slat-7", b(0, -553, 960, 355, 10, 18).color(steel));
p.part("door-vent-slat-8", b(0, -553, 1020, 355, 10, 18).color(steel));
p.part("door-vent-slat-9", b(0, -553, 1080, 355, 10, 18).color(steel));
p.part("door-vent-slat-10", b(0, -553, 1140, 355, 10, 18).color(steel));

return p.model();
