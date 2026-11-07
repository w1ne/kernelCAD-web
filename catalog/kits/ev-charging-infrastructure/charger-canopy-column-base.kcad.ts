// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Charger canopy column base: steel column shoe with anchor plates, gussets, and a tall support post.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "charger-canopy-column-base",
  license: 'CC0-1.0',
  title: "Charger canopy column base",
  description: "Steel column shoe with anchor plates, gussets, and a tall support post. Knobs: overall scale and powder-coated metal and stainless steel color controls.",
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

const p=assembly("charger-canopy-column-base");
p.part("base-plate", b(0, 0, 0, 520, 520, 55).color(stainlessSteel));
p.part("column-shoe", b(0, 0, 55, 280, 280, 210).color(stainlessSteel));
p.part("column-post", b(0, 0, 265, 240, 240, 2400).color(stainlessSteel));
p.part("gusset-0", b(-145, 0, 60, 90, 210, 320).color(powderCoat));
p.part("gusset-1", b(145, 0, 60, 90, 210, 320).color(powderCoat));
p.part("gusset-2", b(0, -145, 60, 90, 210, 320).color(powderCoat));
p.part("gusset-3", b(0, 145, 60, 90, 210, 320).color(powderCoat));
p.part("anchor-bolt-0", c(-205, -205, 0, 80, 27, 8).color(stainlessSteel));
p.part("anchor-bolt-1", c(205, -205, 0, 80, 27, 8).color(stainlessSteel));
p.part("anchor-bolt-2", c(-205, 205, 0, 80, 27, 8).color(stainlessSteel));
p.part("anchor-bolt-3", c(205, 205, 0, 80, 27, 8).color(stainlessSteel));

return p.model();
