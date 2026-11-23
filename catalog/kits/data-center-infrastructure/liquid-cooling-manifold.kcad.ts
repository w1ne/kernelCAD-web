// SPDX-License-Identifier: CC0-1.0
// Liquid-cooling manifold: Supply and return headers with evenly spaced branch outlets and support feet.
// Both painted-steel saddles carry the headers; each branch ball valve has a moulded polymer lever grip.

meta({
  name: "liquid-cooling-manifold",
  license: 'CC0-1.0',
  title: "Liquid-cooling manifold",
  description: "Supply and return headers on two painted-steel support saddles, with five branch drops whose ball valves carry polymer lever grips. Knobs: overall scale; painted steel, valve lever polymer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const polymer = param('polymer', '#c99b35', { label: 'Valve lever grips (engineering polymer)' });

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

const p=assembly("liquid-cooling-manifold");
p.part("support-base-left", b(-700, 0, 0, 180, 500, 740).color(steel));
p.part("support-base-right", b(700, 0, 0, 180, 500, 740).color(steel));
p.part("supply-header", hx(0, 0, 650, 1700, 85, 12).color(steel));
p.part("return-header", hx(0, 0, 350, 1700, 85, 12).color(steel));
p.part("branch-drop-0", c(-600, 0, 150, 500, 38, 8).color(steel));
p.part("branch-drop-1", c(-300, 0, 150, 500, 38, 8).color(steel));
p.part("branch-drop-2", c(0, 0, 150, 500, 38, 8).color(steel));
p.part("branch-drop-3", c(300, 0, 150, 500, 38, 8).color(steel));
p.part("branch-drop-4", c(600, 0, 150, 500, 38, 8).color(steel));
p.part("branch-valve-0", c(-600, 0, 480, 90, 52, 8).color(steel));
p.part("branch-valve-1", c(-300, 0, 480, 90, 52, 8).color(steel));
p.part("branch-valve-2", c(0, 0, 480, 90, 52, 8).color(steel));
p.part("branch-valve-3", c(300, 0, 480, 90, 52, 8).color(steel));
p.part("branch-valve-4", c(600, 0, 480, 90, 52, 8).color(steel));
p.part("valve-lever-0", b(-600, -100, 505, 26, 110, 18).color(polymer));
p.part("valve-lever-1", b(-300, -100, 505, 26, 110, 18).color(polymer));
p.part("valve-lever-2", b(0, -100, 505, 26, 110, 18).color(polymer));
p.part("valve-lever-3", b(300, -100, 505, 26, 110, 18).color(polymer));
p.part("valve-lever-4", b(600, -100, 505, 26, 110, 18).color(polymer));

return p.model();
