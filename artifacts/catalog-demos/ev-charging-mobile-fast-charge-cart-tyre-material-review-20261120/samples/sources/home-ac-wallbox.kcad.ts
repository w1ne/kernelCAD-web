// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Home AC wallbox: compact wall-mounted AC charger with a status screen, cable hook, and mounting plate.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "home-ac-wallbox",
  license: 'CC0-1.0',
  title: "Home AC wallbox",
  description: "Compact wall-mounted AC charger with a status screen, cable hook, and mounting plate. Knobs: overall scale and powder-coated metal, display glass, safety-colored polymer and engineering polymer color controls.",
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

const p=assembly("home-ac-wallbox");
p.part("mounting-plate", b(0, 100, 0, 340, 28, 620).color(powderCoat));
p.part("main-enclosure", b(0, 0, 0, 310, 210, 520).color(powderCoat));
p.part("top-cap", b(0, 0, 520, 334, 234, 22).color(powderCoat));
p.part("front-door", b(0, -108.0, 65, 284, 8, 400).color(powderCoat));
p.part("display-bezel", b(0, -117.0, 353.6, 142.6, 22, 88.4).color(displayGlass));
p.part("display-window", b(0, -130.0, 358.79999999999995, 120.9, 7, 65.0).color(displayGlass));
p.part("status-button", c(105.4, -133.0, 249.6, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -113.0, 104.0, 179.79999999999998, 12, 12).color(powderCoat));
p.part("vent-slot-2", b(0, -113.0, 143.0, 179.79999999999998, 12, 12).color(powderCoat));
p.part("vent-slot-3", b(0, -113.0, 182.0, 179.79999999999998, 12, 12).color(powderCoat));
p.part("cable-hook", hy(220, 30, 155, 80, 24, 8).color(powderCoat));
p.part("side-holster", b(195, -40, 90, 42, 100, 130).color(engineeringPolymer));

return p.model();
