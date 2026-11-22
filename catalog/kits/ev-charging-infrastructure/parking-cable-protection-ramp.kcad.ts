// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Parking cable protection ramp: low-profile cable bridge with two raised covers, end slopes, and ground anchors.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "parking-cable-protection-ramp",
  license: 'CC0-1.0',
  title: "Parking cable protection ramp",
  description: "Low-profile cable bridge with two raised covers, end slopes, and ground anchors. Knobs: overall scale and powder-coated metal and stainless steel color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#397f90', { label: 'Powder-coated metal' });
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { powderCoat: '#28765f', stainlessSteel: '#c2c9c8' },
  nightService: { powderCoat: '#3f5059', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("parking-cable-protection-ramp");
p.part("ramp-base", b(0, 0, 0, 1240, 360, 68).color(stainlessSteel));
p.part("cover-left", b(-320, 0, 68, 510, 240, 82).color(powderCoat));
p.part("cover-right", b(320, 0, 68, 510, 240, 82).color(powderCoat));
p.part("center-divider", b(0, 0, 68, 65, 360, 34).color(powderCoat));
p.part("end-slope-left", b(-610, 0, 0, 110, 360, 82).color(powderCoat));
p.part("end-slope-right", b(610, 0, 0, 110, 360, 82).color(powderCoat));
p.part("anchor-left", c(-520, 0, 0, 75, 28, 8).color(stainlessSteel));
p.part("anchor-right", c(520, 0, 0, 75, 28, 8).color(stainlessSteel));

return p.model();
