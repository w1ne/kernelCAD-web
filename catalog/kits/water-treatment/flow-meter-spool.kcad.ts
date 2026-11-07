// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "flow-meter-spool",
  license: 'CC0-1.0',
  title: "Flow meter spool piece",
  description: "Straight metering spool with flange rings and a raised sensor boss. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687370", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("flow-meter-spool");
p.part("spool",c(0,0,0,780,115,12).color(color));
p.part("flange-low",c(0,0,0,40,170,12).color(color));
p.part("flange-high",c(0,0,740,40,170,12).color(color));
p.part("sensor-boss",c(0,0,390,120,50,10).color(color));
p.part("transmitter",b(0,0,510,180,130,140).color(color));

return p.model();
