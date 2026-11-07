// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Coiled charging cable reel: wall-mounted cable reel with side plates, a central drum, and a guided cable outlet.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "coiled-charging-cable-reel",
  license: 'CC0-1.0',
  title: "Coiled charging cable reel",
  description: "Wall-mounted cable reel with side plates, a central drum, and a guided cable outlet. Knobs: overall scale and powder-coated metal, cable elastomer and stainless steel color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#397f90', { label: 'Powder-coated metal' });
const cableElastomer = param('cableElastomer', '#1b2427', { label: 'Cable elastomer' });
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { powderCoat: '#28765f', cableElastomer: '#1a2522', stainlessSteel: '#c2c9c8' },
  nightService: { powderCoat: '#3f5059', cableElastomer: '#111719', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("coiled-charging-cable-reel");
p.part("wall-mount-plate", b(0, 60, 0, 450, 60, 600).color(stainlessSteel));
p.part("drum-axle", hy(0, 0, 320, 350, 56, 8).color(powderCoat));
p.part("spool-core", c(0, 0, 180, 280, 148, 12).color(powderCoat));
p.part("spool-left-flange", hy(0, -190, 320, 28, 260, 8).color(stainlessSteel));
p.part("spool-right-flange", hy(0, 190, 320, 28, 260, 8).color(stainlessSteel));
p.part("cable-outlet-guide", hy(0, -280, 90, 220, 35, 8).color(powderCoat));
p.part("cable-tail", hy(0, -420, 90, 500, 18, 8).color(cableElastomer));

return p.model();
