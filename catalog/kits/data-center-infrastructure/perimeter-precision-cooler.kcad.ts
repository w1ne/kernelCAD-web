// SPDX-License-Identifier: CC0-1.0
// Perimeter precision cooler: Perimeter cooling unit with a broad intake grille, top discharge fans, a service door, plinth, and pipe connections.

meta({
  name: "perimeter-precision-cooler",
  license: 'CC0-1.0',
  title: "Perimeter precision cooler",
  description: "Perimeter cooling unit with a broad intake grille, top discharge fans, a service door, plinth, and pipe connections. Knobs: overall scale; painted steel, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("perimeter-precision-cooler");
p.part("cooler-plinth", b(0, 0, 0, 1320, 1120, 115).color(steel));
p.part("evaporator-cabinet", b(0, 0, 115, 1220, 980, 1580).color(steel));
p.part("front-coil-panel", b(0, -510, 250, 790, 28, 1240).color(steel));
p.part("front-grille-bar-0", b(0, -534, 315, 760, 20, 34).color(steel));
p.part("front-grille-bar-1", b(0, -534, 433, 760, 20, 34).color(steel));
p.part("front-grille-bar-2", b(0, -534, 551, 760, 20, 34).color(steel));
p.part("front-grille-bar-3", b(0, -534, 669, 760, 20, 34).color(steel));
p.part("front-grille-bar-4", b(0, -534, 787, 760, 20, 34).color(steel));
p.part("front-grille-bar-5", b(0, -534, 905, 760, 20, 34).color(steel));
p.part("front-grille-bar-6", b(0, -534, 1023, 760, 20, 34).color(steel));
p.part("front-grille-bar-7", b(0, -534, 1141, 760, 20, 34).color(steel));
p.part("front-grille-bar-8", b(0, -534, 1259, 760, 20, 34).color(steel));
p.part("service-door", b(425, -510, 260, 255, 28, 1170).color(steel));
p.part("top-discharge-fan-0", c(-390, 0, 1695, 55, 160, 12).color(steel));
p.part("top-discharge-fan-1", c(0, 0, 1695, 55, 160, 12).color(steel));
p.part("top-discharge-fan-2", c(390, 0, 1695, 55, 160, 12).color(steel));
p.part("pipe-header", b(0, 540, 480, 760, 70, 70).color(steel));
p.part("coolant-pipe-stub-0", c(-250, 565, 430, 125, 48, 10).color(steel));
p.part("coolant-pipe-stub-1", c(250, 565, 430, 125, 48, 10).color(steel));
p.part("mounting-foot-front-left", b(-540, -450, 0, 120, 105, 90).color(rubber));
p.part("mounting-foot-front-right", b(540, -450, 0, 120, 105, 90).color(rubber));

return p.model();
