// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Solar EV carport: parking shelter with tilted panel rows, long-span rafters, and paired support frames.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "solar-ev-carport",
  license: 'CC0-1.0',
  title: "Solar EV carport",
  description: "Parking shelter with tilted panel rows, long-span rafters, and paired support frames. Knobs: overall scale and photovoltaic laminate and stainless steel color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pvLaminate = param('pvLaminate', '#1c4562', { label: 'Photovoltaic laminate' });
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { pvLaminate: '#173d59', stainlessSteel: '#c2c9c8' },
  nightService: { pvLaminate: '#102d45', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);

const pvPanel=(x:number,z:number)=>box(600,1090,32,true).rotateY(-4.3).translate(x,0,z+16).scale(scale);

const p=assembly("solar-ev-carport");
p.part("post-left-front", b(-1900, -650, 0, 140, 150, 3100).color(stainlessSteel));
p.part("post-left-rear", b(-1900, 650, 0, 140, 150, 3100).color(stainlessSteel));
p.part("post-right-front", b(1900, -650, 0, 140, 150, 3100).color(stainlessSteel));
p.part("post-right-rear", b(1900, 650, 0, 140, 150, 3100).color(stainlessSteel));
p.part("front-beam", b(0, -650, 3100, 4150, 135, 140).color(stainlessSteel));
p.part("rear-beam", b(0, 650, 3500, 4150, 135, 140).color(stainlessSteel));
p.part("panel-rafter-a", hx(0, -390, 3260, 4020, 50, 8).color(stainlessSteel));
p.part("panel-rafter-b", hx(0, 50, 3380, 4020, 50, 8).color(stainlessSteel));
p.part("panel-rafter-c", hx(0, 470, 3460, 4020, 50, 8).color(stainlessSteel));
p.part("pv-panel-1", pvPanel(-1600, 3217.8947368421054).color(pvLaminate));
p.part("pv-panel-2", pvPanel(-960, 3266.7368421052633).color(pvLaminate));
p.part("pv-panel-3", pvPanel(-320, 3315.5789473684213).color(pvLaminate));
p.part("pv-panel-4", pvPanel(320, 3364.4210526315787).color(pvLaminate));
p.part("pv-panel-5", pvPanel(960, 3413.2631578947367).color(pvLaminate));
p.part("pv-panel-6", pvPanel(1600, 3462.1052631578946).color(pvLaminate));

return p.model();
