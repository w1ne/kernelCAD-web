// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// EV parking bay sign: single-post parking sign with a rectangular face plate and a broad ground socket.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "ev-parking-bay-sign",
  license: 'CC0-1.0',
  title: "EV parking bay sign",
  description: "Single-post parking sign with a rectangular face plate and a broad ground socket. Knobs: overall scale and powder-coated metal, safety-colored polymer and stainless steel color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#397f90', { label: 'Powder-coated metal' });
const safetyPolymer = param('safetyPolymer', '#f0b13c', { label: 'Safety-colored polymer' });
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { powderCoat: '#28765f', safetyPolymer: '#f3bd2f', stainlessSteel: '#c2c9c8' },
  nightService: { powderCoat: '#3f5059', safetyPolymer: '#ffbf24', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("ev-parking-bay-sign");
p.part("ground-sleeve", b(0, 0, 0, 280, 260, 220).color(powderCoat));
p.part("sign-post", c(0, 0, 220, 2500, 48, 8).color(stainlessSteel));
p.part("sign-panel", b(0, -20, 1840, 560, 70, 560).color(powderCoat));
p.part("sign-face", b(0, -62, 1890, 516, 18, 450).color(safetyPolymer));
p.part("top-cap", b(0, 0, 2780, 140, 140, 28).color(powderCoat));

return p.model();
