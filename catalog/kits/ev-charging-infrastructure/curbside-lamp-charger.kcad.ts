// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "curbside-lamp-charger",
  license: 'CC0-1.0',
  title: "Curbside lamp charger",
  description: "Short area-light mast with an integrated side-mounted charger and compact light head. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6c7773", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("curbside-lamp-charger");
p.part("mast-base", c(0, 0, 0, 360, 135, 10).color(color));
p.part("lamp-mast", c(0, 0, 330, 2680, 54, 10).color(color));
p.part("light-arm", hx(90, 0, 2980, 710, 40, 8).color(color));
p.part("light-head", b(430, 0, 2850, 260, 240, 110).color(color));
p.part("charger-box", b(-95, -95, 900, 240, 210, 580).color(color));
p.part("charger-screen", b(-95, -208, 1260, 170, 18, 130).color(color));
p.part("cable-holster", hy(25, -210, 890, 80, 26, 8).color(color));

return p.model();
