// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// EV metering pedestal: utility metering post with a meter head, service panel, and protective plinth.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "ev-metering-pedestal",
  license: 'CC0-1.0',
  title: "EV metering pedestal",
  description: "Utility metering post with a meter head, service panel, and protective plinth. Knobs: overall scale and powder-coated metal, display glass and stainless steel color controls.",
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

const p=assembly("ev-metering-pedestal");
p.part("base-skirt", b(0, 0, 0, 460, 390, 110).color(stainlessSteel));
p.part("pedestal-body", b(0, 0, 110, 350, 290, 1040).color(stainlessSteel));
p.part("meter-head", b(0, 0, 1150, 440, 360, 500).color(powderCoat));
p.part("meter-window", b(0, -190, 1320, 270, 32, 205).color(displayGlass));
p.part("meter-dial", c(0, -214, 1430, 28, 56, 10).color(powderCoat));
p.part("service-door", b(0, -158, 350, 265, 25, 390).color(powderCoat));
p.part("cable-riser", c(0, 0, 0, 250, 48, 8).color(powderCoat));

return p.model();
