// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Wall-mounted connector holster: mounting plate and open-front plug cradle for a parked charging connector.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "wall-mounted-connector-holster",
  license: 'CC0-1.0',
  title: "Wall-mounted connector holster",
  description: "Mounting plate and open-front plug cradle for a parked charging connector. Knobs: overall scale and engineering polymer and stainless steel color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const engineeringPolymer = param('engineeringPolymer', '#657f84', { label: 'Engineering polymer' });
const stainlessSteel = param('stainlessSteel', '#b5c0c2', { label: 'Stainless steel' });

presets({
  fleetReady: { engineeringPolymer: '#263a36', stainlessSteel: '#c2c9c8' },
  nightService: { engineeringPolymer: '#222d32', stainlessSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("wall-mounted-connector-holster");
p.part("mounting-plate", b(0, 25, 0, 280, 40, 340).color(stainlessSteel));
p.part("cradle-back", b(0, -30, 65, 210, 70, 190).color(engineeringPolymer));
p.part("cradle-left", b(-92, -95, 65, 38, 130, 190).color(engineeringPolymer));
p.part("cradle-right", b(92, -95, 65, 38, 130, 190).color(engineeringPolymer));
p.part("cradle-lip", b(0, -120, 62, 200, 32, 42).color(engineeringPolymer));
p.part("cable-hook", hy(0, -165, 38, 120, 20, 8).color(engineeringPolymer));

return p.model();
