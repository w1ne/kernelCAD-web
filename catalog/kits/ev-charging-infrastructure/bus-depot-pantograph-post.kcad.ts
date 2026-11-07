// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Bus depot pantograph post: tall depot mast with an offset beam and a suspended charging-head support.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "bus-depot-pantograph-post",
  license: 'CC0-1.0',
  title: "Bus depot pantograph post",
  description: "Tall depot mast with an offset beam and a suspended charging-head support. Knobs: overall scale and powder-coated metal, engineering polymer and stainless steel color controls.",
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
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);

const p=assembly("bus-depot-pantograph-post");
p.part("foundation", c(0, 0, 0, 260, 190, 10).color(powderCoat));
p.part("support-mast", c(0, 0, 250, 5300, 88, 10).color(stainlessSteel));
p.part("cantilever-beam", hx(520, 0, 5050, 1360, 62, 8).color(stainlessSteel));
p.part("beam-stay", c(-80, 0, 4740, 480, 32, 8).color(stainlessSteel));
p.part("head-mount", b(1090, 0, 4790, 280, 350, 220).color(stainlessSteel));
p.part("contact-head", b(1270, 0, 4600, 740, 420, 210).color(engineeringPolymer));
p.part("contact-bar", hx(1270, -170, 4560, 680, 26, 8).color(engineeringPolymer));
p.part("hinge-pin", c(1010, 0, 4730, 210, 48, 8).color(powderCoat));

return p.model();
