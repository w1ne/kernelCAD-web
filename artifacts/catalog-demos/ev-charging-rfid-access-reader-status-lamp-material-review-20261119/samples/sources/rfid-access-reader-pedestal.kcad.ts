// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// RFID access reader pedestal: short access pedestal with a reader face, indicator cap, and bolted floor plate.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "rfid-access-reader-pedestal",
  license: 'CC0-1.0',
  title: "RFID access reader pedestal",
  description: "Short access pedestal with a reader face, indicator cap, and bolted floor plate. Knobs: overall scale and powder-coated metal, display glass and stainless steel color controls.",
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
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { powderCoat: '#28765f', displayGlass: '#46b8c4', stainlessSteel: '#c2c9c8' },
  nightService: { powderCoat: '#3f5059', displayGlass: '#11bfd0', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("rfid-access-reader-pedestal");
p.part("base-plate", b(0, 0, 0, 360, 360, 42).color(stainlessSteel));
p.part("post", b(0, 0, 42, 180, 170, 900).color(stainlessSteel));
p.part("reader-face", b(0, -105, 700, 250, 38, 220).color(powderCoat));
p.part("reader-window", b(0, -129, 740, 170, 12, 105).color(displayGlass));
p.part("status-lamp", c(0, -145, 620, 30, 26, 8).color(powderCoat));
p.part("cap", b(0, 0, 942, 230, 210, 38).color(powderCoat));

return p.model();
