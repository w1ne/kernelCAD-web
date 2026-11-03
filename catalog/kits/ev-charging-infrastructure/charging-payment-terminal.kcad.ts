// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "charging-payment-terminal",
  license: 'CC0-1.0',
  title: "Charging payment terminal",
  description: "Public payment pedestal with a raised display, keypad panel, and card reader slot. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#495d66", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("charging-payment-terminal");
p.part("terminal-base", b(0, 0, 0, 440, 420, 65).color(color));
p.part("support-column", b(0, 0, 65, 190, 180, 970).color(color));
p.part("screen-bezel", b(0, -106, 830, 300, 45, 260).color(color));
p.part("screen-window", b(0, -133, 870, 250, 12, 180).color(color));
p.part("keypad-panel", b(0, -108, 550, 250, 44, 160).color(color));
p.part("card-slot", b(130, -140, 490, 84, 20, 35).color(color));
p.part("contactless-reader", c(-120, -142, 470, 22, 35, 8).color(color));
p.part("weather-hood", b(0, -100, 1100, 370, 290, 48).color(color));

return p.model();
