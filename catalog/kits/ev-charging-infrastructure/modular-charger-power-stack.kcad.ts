// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Modular charger power stack: stacked converter modules with repeated front drawers, service handles, and a base frame.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "modular-charger-power-stack",
  license: 'CC0-1.0',
  title: "Modular charger power stack",
  description: "Stacked converter modules with repeated front drawers, service handles, and a base frame. Knobs: overall scale and powder-coated metal, engineering polymer and stainless steel color controls.",
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

const p=assembly("modular-charger-power-stack");
p.part("base-frame", b(0, 0, 0, 920, 660, 100).color(stainlessSteel));
p.part("power-module-1", b(0, 0, 100, 840, 600, 365).color(powderCoat));
p.part("module-front-1", b(0, -310, 135, 790, 24, 295).color(powderCoat));
p.part("module-handle-1", b(280, -340, 280, 105, 32, 35).color(engineeringPolymer));
p.part("power-module-2", b(0, 0, 505, 840, 600, 365).color(powderCoat));
p.part("module-front-2", b(0, -310, 540, 790, 24, 295).color(powderCoat));
p.part("module-handle-2", b(280, -340, 685, 105, 32, 35).color(engineeringPolymer));
p.part("power-module-3", b(0, 0, 910, 840, 600, 365).color(powderCoat));
p.part("module-front-3", b(0, -310, 945, 790, 24, 295).color(powderCoat));
p.part("module-handle-3", b(280, -340, 1090, 105, 32, 35).color(engineeringPolymer));
p.part("power-module-4", b(0, 0, 1315, 840, 600, 365).color(powderCoat));
p.part("module-front-4", b(0, -310, 1350, 790, 24, 295).color(powderCoat));
p.part("module-handle-4", b(280, -340, 1495, 105, 32, 35).color(engineeringPolymer));

return p.model();
