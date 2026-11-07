// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Dual-outlet wallbox: workplace wall charger with two cable outlets, paired status windows, and mounting rails.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "dual-outlet-wallbox",
  license: 'CC0-1.0',
  title: "Dual-outlet wallbox",
  description: "Workplace wall charger with two cable outlets, paired status windows, and mounting rails. Knobs: overall scale and powder-coated metal, display glass, safety-colored polymer and engineering polymer color controls.",
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

const p=assembly("dual-outlet-wallbox");
p.part("mounting-rail", b(0, 105, 0, 460, 30, 720).color(powderCoat));
p.part("main-enclosure", b(0, 0, 0, 420, 220, 590).color(powderCoat));
p.part("top-cap", b(0, 0, 590, 444, 244, 22).color(powderCoat));
p.part("front-door", b(0, -113.0, 65, 394, 8, 470).color(powderCoat));
p.part("display-bezel", b(0, -122.0, 401.20000000000005, 193.20000000000002, 22, 100.30000000000001).color(displayGlass));
p.part("display-window", b(0, -135.0, 407.09999999999997, 163.8, 7, 73.75).color(displayGlass));
p.part("status-button", c(142.8, -138.0, 283.2, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -118.0, 118.0, 243.6, 12, 12).color(powderCoat));
p.part("vent-slot-2", b(0, -118.0, 162.25, 243.6, 12, 12).color(powderCoat));
p.part("vent-slot-3", b(0, -118.0, 206.5, 243.6, 12, 12).color(powderCoat));
p.part("second-display-bezel", b(125, -132, 470, 100, 22, 90).color(displayGlass));
p.part("left-holster", hy(-250, -15, 95, 90, 28, 8).color(engineeringPolymer));
p.part("right-holster", hy(250, -15, 95, 90, 28, 8).color(engineeringPolymer));

return p.model();
