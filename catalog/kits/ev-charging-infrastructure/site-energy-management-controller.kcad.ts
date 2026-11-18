// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Site energy management controller: wall enclosure with a control screen, antenna pair, and cable glands.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "site-energy-management-controller",
  license: 'CC0-1.0',
  title: "Site energy management controller",
  description: "Wall enclosure with a control screen, antenna pair, and cable glands. Knobs: overall scale and powder-coated metal, display glass, safety-colored polymer and stainless steel color controls.",
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
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { powderCoat: '#28765f', displayGlass: '#46b8c4', safetyPolymer: '#f3bd2f', stainlessSteel: '#c2c9c8' },
  nightService: { powderCoat: '#3f5059', displayGlass: '#11bfd0', safetyPolymer: '#ffbf24', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("site-energy-management-controller");
p.part("mounting-plate", b(0, 45, 0, 560, 30, 780).color(stainlessSteel));
p.part("main-enclosure", b(0, 0, 0, 510, 300, 730).color(powderCoat));
p.part("top-cap", b(0, 0, 730, 534, 324, 22).color(powderCoat));
p.part("front-door", b(0, -153.0, 65, 484, 8, 610).color(powderCoat));
p.part("display-bezel", b(0, -162.0, 496.40000000000003, 234.60000000000002, 22, 124.10000000000001).color(displayGlass));
p.part("display-window", b(0, -175.0, 503.7, 198.9, 7, 91.25).color(displayGlass));
p.part("status-button", c(173.4, -178.0, 350.4, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -158.0, 146.0, 295.79999999999995, 12, 12).color(stainlessSteel));
p.part("vent-slot-2", b(0, -158.0, 200.75000000000003, 295.79999999999995, 12, 12).color(stainlessSteel));
p.part("antenna-left", c(-180, 80, 770, 330, 18, 8).color(powderCoat));
p.part("antenna-right", c(180, 80, 770, 330, 18, 8).color(powderCoat));
p.part("cable-gland-strip", b(0, -20, 20, 420, 70, 80).color(powderCoat));

return p.model();
