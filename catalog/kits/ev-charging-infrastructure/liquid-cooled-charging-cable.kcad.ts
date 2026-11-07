// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Liquid-cooled charging cable: thick high-current cable segment with cooling-line collars and a reinforced connector end.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "liquid-cooled-charging-cable",
  license: 'CC0-1.0',
  title: "Liquid-cooled charging cable",
  description: "Thick high-current cable segment with cooling-line collars and a reinforced connector end. Knobs: overall scale and powder-coated metal, cable elastomer and engineering polymer color controls.",
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
const engineeringPolymer = param('engineeringPolymer', '#657f84', { label: 'Engineering polymer' });

presets({
  fleetReady: { powderCoat: '#28765f', cableElastomer: '#1a2522', engineeringPolymer: '#263a36' },
  nightService: { powderCoat: '#3f5059', cableElastomer: '#111719', engineeringPolymer: '#222d32' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("liquid-cooled-charging-cable");
p.part("main-cable", hy(0, 0, 42, 1900, 34, 8).color(cableElastomer));
p.part("coolant-line-a", hy(-48, 0, 42, 1780, 12, 8).color(cableElastomer));
p.part("coolant-line-b", hy(48, 0, 42, 1780, 12, 8).color(cableElastomer));
p.part("connector-shell", b(0, -1120, 15, 180, 270, 145).color(engineeringPolymer));
p.part("strain-guard", b(0, 970, 0, 115, 130, 100).color(powderCoat));
p.part("coolant-collar-0", hy(0, -650, 58, 34, 52, 8).color(powderCoat));
p.part("coolant-collar-1", hy(0, -325, 58, 34, 52, 8).color(powderCoat));
p.part("coolant-collar-2", hy(0, 0, 58, 34, 52, 8).color(powderCoat));
p.part("coolant-collar-3", hy(0, 325, 58, 34, 52, 8).color(powderCoat));
p.part("coolant-collar-4", hy(0, 650, 58, 34, 52, 8).color(powderCoat));

return p.model();
