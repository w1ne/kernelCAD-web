// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mobile-fast-charge-cart",
  license: 'CC0-1.0',
  title: "Mobile fast-charge cart",
  description: "Portable charging cart with a compact power enclosure, cable reel, handle, and casters. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#667570", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("mobile-fast-charge-cart");
p.part("cart-chassis", b(0, 0, 180, 820, 600, 90).color(color));
p.part("main-enclosure", b(0, 0, 0, 650, 510, 1160).color(color));
p.part("top-cap", b(0, 0, 1160, 674, 534, 22).color(color));
p.part("front-door", b(0, -258.0, 65, 624, 8, 1040).color(color));
p.part("display-bezel", b(0, -267.0, 788.8000000000001, 299.0, 22, 197.20000000000002).color(color));
p.part("display-window", b(0, -280.0, 800.4, 253.5, 7, 145.0).color(color));
p.part("status-button", c(221.00000000000003, -283.0, 556.8, 18, 12, 8).color(color));
p.part("vent-slot-1", b(0, -263.0, 232.0, 377.0, 12, 12).color(color));
p.part("vent-slot-2", b(0, -263.0, 319.0, 377.0, 12, 12).color(color));
p.part("vent-slot-3", b(0, -263.0, 406.0, 377.0, 12, 12).color(color));
p.part("vent-slot-4", b(0, -263.0, 493.0, 377.0, 12, 12).color(color));
p.part("left-wheel", c(-300, -360, 30, 95, 68, 10).color(color));
p.part("right-wheel", c(300, -360, 30, 95, 68, 10).color(color));
p.part("push-handle", hx(0, 350, 1070, 520, 30, 8).color(color));
p.part("cable-reel", hy(0, 360, 460, 160, 110, 8).color(color));
p.part("cable-tail", hy(0, 530, 440, 440, 20, 8).color(color));

return p.model();
