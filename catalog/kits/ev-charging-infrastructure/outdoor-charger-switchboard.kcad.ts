// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Outdoor charger switchboard: site switchboard enclosure with adjacent electrical bays, instrument windows, and cable glands.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "outdoor-charger-switchboard",
  license: 'CC0-1.0',
  title: "Outdoor charger switchboard",
  description: "Site switchboard enclosure with adjacent electrical bays, instrument windows, and cable glands. Knobs: overall scale and powder-coated metal, display glass, safety-colored polymer and stainless steel color controls.",
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

const p=assembly("outdoor-charger-switchboard");
p.part("main-enclosure", b(0, 0, 90, 1680, 730, 2080).color(powderCoat));
p.part("base-plinth", b(0, 0, 0, 1735, 770, 90).color(stainlessSteel));
p.part("top-cap", b(0, 0, 2170, 1704, 754, 22).color(powderCoat));
p.part("door-seam-1", b(-560.0, -368.0, 155, 5, 8, 1960).color(powderCoat));
p.part("door-seam-2", b(0.0, -368.0, 155, 5, 8, 1960).color(powderCoat));
p.part("door-seam-3", b(560.0, -368.0, 155, 5, 8, 1960).color(powderCoat));
p.part("display-bezel", b(0, -377.0, 1504.4, 772.8000000000001, 22, 353.6).color(displayGlass));
p.part("display-window", b(0, -390.0, 1525.1999999999998, 655.2, 7, 260.0).color(displayGlass));
p.part("status-button", c(571.2, -393.0, 1088.4, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -373.0, 506.0, 974.4, 12, 12).color(stainlessSteel));
p.part("vent-slot-2", b(0, -373.0, 662.0, 974.4, 12, 12).color(stainlessSteel));
p.part("vent-slot-3", b(0, -373.0, 818.0, 974.4, 12, 12).color(stainlessSteel));
p.part("vent-slot-4", b(0, -373.0, 974.0, 974.4, 12, 12).color(stainlessSteel));
p.part("vent-slot-5", b(0, -373.0, 1130.0, 974.4, 12, 12).color(stainlessSteel));
p.part("cable-entry-skirt", b(0, 0, 30, 1377.6, 657.0, 90).color(powderCoat));
p.part("ground-terminal", c(588.0, 0, 25, 50, 28, 8).color(powderCoat));
p.part("conduit-left", c(-588.0, 0, 0, 210, 38, 8).color(powderCoat));
p.part("conduit-right", c(588.0, 0, 0, 210, 38, 8).color(powderCoat));

return p.model();
