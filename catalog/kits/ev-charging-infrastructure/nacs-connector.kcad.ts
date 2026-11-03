// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nacs-connector",
  license: 'CC0-1.0',
  title: "NACS connector",
  description: "Compact generic NACS plug with a tapered nose, grip ribs, and flexible cable stub. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#39464b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("nacs-connector");
p.part("hand-grip", b(0, 15, 0, 94, 94, 112).color(color));
p.part("front-coupling", b(0, -79.0, 24.64, 73.32000000000001, 64, 64.96).color(color));
p.part("connector-nose", hy(0, -104.0, 56.0, 74, 26.320000000000004, 10).color(color));
p.part("strain-relief", hy(0, 93.0, 56.0, 92, 21.76, 8).color(color));
p.part("cable-stub", hy(0, 192.0, 56.0, 210, 14.28, 8).color(color));
p.part("grip-ridge-top", b(0, 12, 122, 60.160000000000004, 43.24, 15).color(color));

return p.model();
