// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// J1772 AC connector: generic J1772 AC plug with a short tapered nose, hand grip, and rear cable stub.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "j1772-ac-connector",
  license: 'CC0-1.0',
  title: "J1772 AC connector",
  description: "Generic J1772 AC plug with a short tapered nose, hand grip, and rear cable stub. Knobs: overall scale and engineering polymer and cable elastomer color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const engineeringPolymer = param('engineeringPolymer', '#657f84', { label: 'Engineering polymer' });
const cableElastomer = param('cableElastomer', '#1b2427', { label: 'Cable elastomer' });

presets({
  fleetReady: { engineeringPolymer: '#263a36', cableElastomer: '#1a2522' },
  nightService: { engineeringPolymer: '#222d32', cableElastomer: '#111719' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("j1772-ac-connector");
p.part("hand-grip", b(0, 15, 0, 98, 92, 118).color(engineeringPolymer));
p.part("front-coupling", b(0, -78.0, 25.96, 76.44, 64, 68.44).color(engineeringPolymer));
p.part("connector-nose", hy(0, -107.0, 59.0, 82, 27.44, 10).color(engineeringPolymer));
p.part("strain-relief", hy(0, 92.0, 59.0, 92, 22.400000000000002, 8).color(cableElastomer));
p.part("cable-stub", hy(0, 191.0, 59.0, 210, 14.7, 8).color(cableElastomer));
p.part("grip-ridge-top", b(0, 12, 128, 62.72, 42.32, 15).color(engineeringPolymer));

return p.model();
