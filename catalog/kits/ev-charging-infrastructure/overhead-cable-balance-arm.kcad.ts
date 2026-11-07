// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Overhead cable balance arm: support mast and balanced arm routing two charging leads above a parking bay.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "overhead-cable-balance-arm",
  license: 'CC0-1.0',
  title: "Overhead cable balance arm",
  description: "Support mast and balanced arm routing two charging leads above a parking bay. Knobs: overall scale and powder-coated metal, cable elastomer and stainless steel color controls.",
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
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("overhead-cable-balance-arm");
p.part("base-plate", b(0, 0, 0, 520, 460, 60).color(stainlessSteel));
p.part("support-mast", c(0, 0, 60, 3260, 64, 10).color(stainlessSteel));
p.part("swing-arm", hx(390, 0, 3220, 1040, 46, 8).color(stainlessSteel));
p.part("arm-pivot", c(0, 0, 3170, 240, 78, 10).color(stainlessSteel));
p.part("balance-counterweight", hx(-220, 0, 3220, 360, 75, 8).color(powderCoat));
p.part("cable-guide", b(760, 0, 3050, 210, 150, 90).color(powderCoat));
p.part("left-cable-drop", hy(690, -90, 950, 1150, 18, 8).color(cableElastomer));
p.part("right-cable-drop", hy(920, -90, 950, 1150, 18, 8).color(cableElastomer));

return p.model();
