// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Compact DC fast charger: floor-standing DC charger with a front display, service door, and paired charging leads.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "compact-dc-fast-charger",
  license: 'CC0-1.0',
  title: "Compact DC fast charger",
  description: "Floor-standing DC charger with a front display, service door, and paired charging leads. Knobs: overall scale and powder-coated metal, display glass, cable elastomer and safety-colored polymer color controls.",
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

const plugShell=(x:number,y:number,z:number)=>path().moveTo(-42,-25).lineTo(-34,-44).lineTo(34,-44).lineTo(42,-25).lineTo(36,30).lineTo(-36,30).close().extrude(180).translate(x,y,z).scale(scale);

const p=assembly("compact-dc-fast-charger");
p.part("main-enclosure", b(0, 0, 90, 610, 460, 1620).color(powderCoat));
p.part("base-plinth", b(0, 0, 0, 665, 500, 90).color(powderCoat));
p.part("top-cap", b(0, 0, 1710, 634, 484, 22).color(powderCoat));
p.part("front-door", b(0, -233.0, 155, 584, 8, 1500).color(powderCoat));
p.part("display-bezel", b(0, -242.0, 1191.6000000000001, 280.6, 22, 275.40000000000003).color(displayGlass));
p.part("display-window", b(0, -255.0, 1207.8, 237.9, 7, 202.5).color(displayGlass));
p.part("status-button", c(207.4, -258.0, 867.6, 18, 12, 8).color(safetyPolymer));
p.part("vent-slot-1", b(0, -238.0, 414.0, 353.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-2", b(0, -238.0, 535.5, 353.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-3", b(0, -238.0, 657.0, 353.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-4", b(0, -238.0, 778.5, 353.79999999999995, 12, 12).color(powderCoat));
p.part("vent-slot-5", b(0, -238.0, 900.0, 353.79999999999995, 12, 12).color(powderCoat));
p.part("roof-visor", b(0, -69.0, 1710, 690, 540, 42).color(powderCoat));
p.part("left-connector-cradle", hy(-353.79999999999995, -300.0, 470, 130, 38, 8).color(powderCoat));
p.part("right-connector-cradle", hy(353.79999999999995, -300.0, 470, 130, 38, 8).color(powderCoat));
p.part("left-charging-cable", hy(-353.79999999999995, -500.0, 260, 650, 22, 8).color(cableElastomer));
p.part("right-charging-cable", hy(353.79999999999995, -500.0, 260, 650, 22, 8).color(cableElastomer));
p.part("left-connector-handle", plugShell(-353.79999999999995, -825, 170).color(powderCoat));
p.part("right-connector-handle", plugShell(353.79999999999995, -825, 170).color(powderCoat));
p.part("left-contact-collar", hy(-353.79999999999995, -881, 260, 34, 24, 8).color(powderCoat));
p.part("right-contact-collar", hy(353.79999999999995, -881, 260, 34, 24, 8).color(powderCoat));

return p.model();
