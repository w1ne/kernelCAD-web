// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// NACS connector: compact generic NACS plug with a tapered nose, grip ribs, and flexible cable stub.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "nacs-connector",
  license: 'CC0-1.0',
  title: "NACS connector",
  description: "Compact generic NACS plug with a tapered nose, grip ribs, and flexible cable stub. Knobs: overall scale and engineering polymer and cable elastomer color controls.",
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

const gripBody=()=>path().moveTo(-42,-24).lineTo(-34,-47).lineTo(34,-47).lineTo(42,-24).lineTo(36,43).lineTo(-36,43).close().extrude(112).translate(0,15,0).scale(scale);

const p=assembly("nacs-connector");
p.part("hand-grip", gripBody().color(engineeringPolymer));
p.part("front-coupling", b(0, -79.0, 24.64, 73.32000000000001, 64, 64.96).color(engineeringPolymer));
p.part("connector-nose", hy(0, -104.0, 56.0, 74, 26.320000000000004, 10).color(engineeringPolymer));
p.part("strain-relief", hy(0, 93.0, 56.0, 92, 21.76, 8).color(cableElastomer));
p.part("cable-stub", hy(0, 192.0, 56.0, 210, 14.28, 8).color(cableElastomer));
p.part("grip-ridge-top", b(0, 12, 122, 60.160000000000004, 43.24, 15).color(engineeringPolymer));

return p.model();
