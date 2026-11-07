// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "curbside-ac-charger-post",
  license: 'CC0-1.0',
  title: "Curbside AC charger post",
  description: "Slim public AC post with a readable front panel, paired cable ports, and a broad base. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#526973", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("curbside-ac-charger-post");
p.part("ground-plate", b(0, 0, 0, 450, 320, 40).color(color));
p.part("pedestal-column", b(0, 0, 40, 165.0, 240, 1470).color(color));
p.part("main-enclosure", b(0, 0, 0, 300, 240, 520).color(color));
p.part("top-cap", b(0, 0, 520, 324, 264, 22).color(color));
p.part("front-door", b(0, -123.0, 65, 274, 8, 400).color(color));
p.part("display-bezel", b(0, -132.0, 353.6, 138.0, 22, 88.4).color(color));
p.part("display-window", b(0, -145.0, 358.79999999999995, 117.0, 7, 65.0).color(color));
p.part("status-button", c(102.00000000000001, -148.0, 249.6, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -128.0, 104.0, 174.0, 12, 12).color(color));
p.part("vent-slot-2", b(0, -128.0, 143.0, 174.0, 12, 12).color(color));
p.part("head-cap", b(0, 0, 1510, 340, 300, 45).color(color));
p.part("left-connector-cradle", hy(-201.0, -30, 300, 105, 30, 8).color(color));
p.part("right-connector-cradle", hy(201.0, -30, 300, 105, 30, 8).color(color));
p.part("cable-tail", hy(220, -170, 220, 480, 18, 8).color(color));
p.part("cable-tail-second", hy(-220, -170, 220, 450, 16, 8).color(color));

return p.model();
