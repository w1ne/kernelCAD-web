// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Dual-port AC pedestal: twin-sided AC pedestal with two front panels and two hanging cable leads.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "dual-port-ac-pedestal",
  license: 'CC0-1.0',
  title: "Dual-port AC pedestal",
  description: "Twin-sided AC pedestal with two front panels and two hanging cable leads. Knobs: overall scale and powder-coated metal, display glass, safety-colored polymer and engineering polymer color controls.",
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
const safetyPolymer = param('safetyPolymer', '#f0b13c', { label: 'Safety-colored polymer' });
const engineeringPolymer = param('engineeringPolymer', '#657f84', { label: 'Engineering polymer' });

presets({
  fleetReady: { powderCoat: '#28765f', displayGlass: '#46b8c4', safetyPolymer: '#f3bd2f', engineeringPolymer: '#263a36' },
  nightService: { powderCoat: '#3f5059', displayGlass: '#11bfd0', safetyPolymer: '#ffbf24', engineeringPolymer: '#222d32' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("dual-port-ac-pedestal");
p.part("ground-plate", b(0, 0, 0, 570, 320, 40).color(powderCoat));
p.part("pedestal-column", b(0, 0, 40, 231.00000000000003, 240, 1620).color(powderCoat));
p.part("main-enclosure", b(0, 0, 0, 420, 240, 520).color(powderCoat));
p.part("top-cap", b(0, 0, 520, 444, 264, 22).color(powderCoat));
p.part("front-door", b(0, -123.0, 65, 394, 8, 400).color(powderCoat));
p.part("display-bezel", b(0, -132.0, 353.6, 193.20000000000002, 22, 88.4).color(displayGlass));
p.part("display-window", b(0, -145.0, 358.79999999999995, 163.8, 7, 65.0).color(displayGlass));
p.part("status-button", c(142.8, -148.0, 249.6, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -128.0, 104.0, 243.6, 12, 12).color(powderCoat));
p.part("vent-slot-2", b(0, -128.0, 143.0, 243.6, 12, 12).color(powderCoat));
p.part("head-cap", b(0, 0, 1660, 460, 300, 45).color(powderCoat));
p.part("left-connector-cradle", hy(-281.40000000000003, -30, 300, 105, 30, 8).color(engineeringPolymer));
p.part("right-connector-cradle", hy(281.40000000000003, -30, 300, 105, 30, 8).color(engineeringPolymer));
p.part("rear-control-panel", b(0, 135, 650, 327.6, 20, 410).color(powderCoat));
p.part("left-cable", hy(-280, -120, 260, 650, 16, 8).color(powderCoat));
p.part("right-cable", hy(280, -120, 260, 650, 16, 8).color(powderCoat));

return p.model();
