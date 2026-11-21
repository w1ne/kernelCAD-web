// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// High-power charge dispenser: tall high-power dispenser with a broad screen, paired cable outlets, and service plinth.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "high-power-charge-dispenser",
  license: 'CC0-1.0',
  title: "High-power charge dispenser",
  description: "Tall high-power dispenser with a broad screen, paired cable outlets, and service plinth. Knobs: overall scale and powder-coated metal, display glass, cable elastomer and safety-colored polymer color controls.",
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

presets({
  fleetReady: { powderCoat: '#28765f', displayGlass: '#46b8c4', cableElastomer: '#1a2522', safetyPolymer: '#f3bd2f' },
  nightService: { powderCoat: '#3f5059', displayGlass: '#11bfd0', cableElastomer: '#111719', safetyPolymer: '#ffbf24' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("high-power-charge-dispenser");
p.part("main-enclosure", b(0, 0, 90, 760, 500, 1920).color(powderCoat));
p.part("base-plinth", b(0, 0, 0, 815, 540, 90).color(powderCoat));
p.part("top-cap", b(0, 0, 2010, 784, 524, 22).color(powderCoat));
p.part("door-seam-1", b(-190.0, -253.0, 155, 5, 8, 1800).color(powderCoat));
p.part("door-seam-2", b(190.0, -253.0, 155, 5, 8, 1800).color(powderCoat));
p.part("display-bezel", b(0, -262.0, 1395.6000000000001, 349.6, 22, 326.40000000000003).color(displayGlass));
p.part("display-window", b(0, -275.0, 1414.8, 296.40000000000003, 7, 240.0).color(displayGlass));
p.part("status-button", c(258.40000000000003, -278.0, 1011.5999999999999, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -258.0, 474.0, 440.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-2", b(0, -258.0, 618.0, 440.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-3", b(0, -258.0, 762.0, 440.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-4", b(0, -258.0, 906.0, 440.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-5", b(0, -258.0, 1050.0, 440.79999999999995, 12, 12).color(powderCoat));
p.part("roof-visor", b(0, -75.0, 2010, 840, 580, 42).color(powderCoat));
p.part("left-connector-cradle", hy(-440.79999999999995, -320.0, 470, 130, 38, 8).color(powderCoat));
p.part("right-connector-cradle", hy(440.79999999999995, -320.0, 470, 130, 38, 8).color(powderCoat));
p.part("left-charging-cable", hy(-440.79999999999995, -520.0, 260, 650, 22, 8).color(cableElastomer));
p.part("right-charging-cable", hy(440.79999999999995, -520.0, 260, 650, 22, 8).color(cableElastomer));

return p.model();
