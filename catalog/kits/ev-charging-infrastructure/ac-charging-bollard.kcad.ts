// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// AC charging bollard: short protective charging post with an inset status panel and a pair of plug holders.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "ac-charging-bollard",
  license: 'CC0-1.0',
  title: "AC charging bollard",
  description: "Short protective charging post with an inset status panel and a pair of plug holders. Knobs: overall scale and powder-coated metal, display glass, cable elastomer and safety-colored polymer color controls.",
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
const cableElastomer = param('cableElastomer', '#1b2427', { label: 'Cable elastomer' });
const safetyPolymer = param('safetyPolymer', '#f0b13c', { label: 'Safety-colored polymer' });

presets({
  fleetReady: { powderCoat: '#28765f', displayGlass: '#46b8c4', cableElastomer: '#1a2522', safetyPolymer: '#f3bd2f' },
  nightService: { powderCoat: '#3f5059', displayGlass: '#11bfd0', cableElastomer: '#111719', safetyPolymer: '#ffbf24' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("ac-charging-bollard");
p.part("ground-plate", b(0, 0, 0, 440, 320, 40).color(powderCoat));
p.part("pedestal-column", b(0, 0, 40, 159.5, 240, 840).color(powderCoat));
p.part("main-enclosure", b(0, 0, 0, 290, 240, 380).color(powderCoat));
p.part("top-cap", b(0, 0, 380, 314, 264, 22).color(powderCoat));
p.part("front-door", b(0, -123.0, 65, 264, 8, 260).color(powderCoat));
p.part("display-bezel", b(0, -132.0, 258.40000000000003, 133.4, 22, 64.60000000000001).color(displayGlass));
p.part("display-window", b(0, -145.0, 262.2, 113.10000000000001, 7, 47.5).color(displayGlass));
p.part("status-button", c(98.60000000000001, -148.0, 182.4, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -128.0, 76.0, 168.2, 12, 12).color(powderCoat));
p.part("vent-slot-2", b(0, -128.0, 104.50000000000001, 168.2, 12, 12).color(powderCoat));
p.part("head-cap", b(0, 0, 880, 330, 300, 45).color(powderCoat));
p.part("left-connector-cradle", hy(-194.3, -30, 300, 105, 30, 8).color(powderCoat));
p.part("right-connector-cradle", hy(194.3, -30, 300, 105, 30, 8).color(powderCoat));
p.part("cable-tail", hy(220, -170, 220, 480, 18, 8).color(cableElastomer));
p.part("cable-tail-second", hy(-220, -170, 220, 450, 16, 8).color(cableElastomer));

return p.model();
