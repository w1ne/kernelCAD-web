// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Mobile fast-charge cart: portable charging cart with a compact power enclosure on a low chassis,
// four rubber-tyred wheels on painted hubs, a push handle, and a cable reel.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "mobile-fast-charge-cart",
  license: 'CC0-1.0',
  title: "Mobile fast-charge cart",
  description: "Portable charging cart with a compact power enclosure on a low chassis, four rubber-tyred wheels on painted hubs, a push handle, and a cable reel. Knobs: overall scale and powder-coated metal, display glass, cable elastomer, safety-colored polymer and wheel tyre rubber color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#397f90', { label: 'Powder-coated metal' });
const displayGlass = param('displayGlass', '#79cfda', { label: 'Display glass' });
const cableElastomer = param('cableElastomer', '#1b2427', { label: 'Cable elastomer' });
const safetyPolymer = param('safetyPolymer', '#f0b13c', { label: 'Safety-colored polymer' });
const tyreRubber = param('tyreRubber', '#23282b', { label: 'Wheel tyre rubber' });

presets({
  fleetReady: { powderCoat: '#28765f', displayGlass: '#46b8c4', cableElastomer: '#1a2522', safetyPolymer: '#f3bd2f', tyreRubber: '#1c2421' },
  nightService: { powderCoat: '#3f5059', displayGlass: '#11bfd0', cableElastomer: '#111719', safetyPolymer: '#ffbf24', tyreRubber: '#3a4044' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);
// Round part on a front face: its axis runs from y toward the operator (-Y).
const fy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).rotateX(90).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("mobile-fast-charge-cart");
p.part("cart-chassis", b(0, 0, 70, 820, 600, 90).color(powderCoat));
p.part("main-enclosure", b(0, 0, 160, 650, 510, 1000).color(powderCoat));
p.part("top-cap", b(0, 0, 1160, 674, 534, 22).color(powderCoat));
p.part("front-door", b(0, -258.0, 200, 624, 8, 920).color(powderCoat));
p.part("display-bezel", b(0, -267.0, 788.8000000000001, 299.0, 22, 197.20000000000002).color(displayGlass));
p.part("display-window", b(0, -280.0, 800.4, 253.5, 7, 145.0).color(displayGlass));
p.part("status-button", fy(221, -262, 565.8, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -263.0, 232.0, 377.0, 12, 12).color(powderCoat));
p.part("vent-slot-2", b(0, -263.0, 319.0, 377.0, 12, 12).color(powderCoat));
p.part("vent-slot-3", b(0, -263.0, 406.0, 377.0, 12, 12).color(powderCoat));
p.part("vent-slot-4", b(0, -263.0, 493.0, 377.0, 12, 12).color(powderCoat));
// Wheel axis is X. The tyre is a 16-gon with a vertex on the ground, so its centre is one radius up.
for (const [name, x, y] of [["left-wheel", -440, -200], ["right-wheel", 440, -200], ["rear-left-wheel", -440, 200], ["rear-right-wheel", 440, 200]] as const) {
  p.part(name, hx(x, y, 100, 60, 100, 16).color(tyreRubber));
  p.part(`${name}-hub`, hx(x + Math.sign(x) * 4, y, 100, 68, 42, 8).color(powderCoat));
}
p.part("handle-bracket-left", b(-230, 302.5, 1055, 30, 95, 30).color(powderCoat));
p.part("handle-bracket-right", b(230, 302.5, 1055, 30, 95, 30).color(powderCoat));
p.part("push-handle", hx(0, 350, 1070, 520, 30, 8).color(powderCoat));
p.part("cable-reel", hy(0, 335, 460, 160, 110, 8).color(powderCoat));
p.part("cable-tail", hy(0, 530, 440, 440, 20, 8).color(cableElastomer));

return p.model();
