// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Parking wheel stop: low parking barrier with beveled ends and recessed anchor locations.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "parking-wheel-stop",
  license: 'CC0-1.0',
  title: "Parking wheel stop",
  description: "Low parking barrier with beveled ends and recessed anchor locations. Knobs: overall scale and powder-coated metal, engineering polymer and stainless steel color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#397f90', { label: 'Powder-coated metal' });
const engineeringPolymer = param('engineeringPolymer', '#657f84', { label: 'Engineering polymer' });
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { powderCoat: '#28765f', engineeringPolymer: '#263a36', stainlessSteel: '#c2c9c8' },
  nightService: { powderCoat: '#3f5059', engineeringPolymer: '#222d32', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("parking-wheel-stop");
p.part("stop-body", b(0, 0, 0, 1740, 170, 150).color(engineeringPolymer));
p.part("top-face", b(0, 0, 150, 1480, 145, 35).color(powderCoat));
p.part("anchor-0", c(-620, 0, 0, 190, 24, 8).color(stainlessSteel));
p.part("anchor-1", c(620, 0, 0, 190, 24, 8).color(stainlessSteel));
p.part("end-left", b(-820, 0, 0, 100, 180, 115).color(powderCoat));
p.part("end-right", b(820, 0, 0, 100, 180, 115).color(powderCoat));

return p.model();
