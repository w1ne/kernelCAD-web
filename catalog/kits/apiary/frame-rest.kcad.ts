// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "frame-rest",
  license: 'CC0-1.0',
  title: "Hive frame rest",
  description: "Crossbar accessory with two raised ledges that hold removed hive frames. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#98784c", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("frame-rest");
p.part("beam",b(0,0,55,740,80,55).color(color));
p.part("left-ledge",b(-240,0,110,170,110,45).color(color));
p.part("right-ledge",b(240,0,110,170,110,45).color(color));
p.part("center-stop",b(0,0,110,45,100,65).color(color));
p.part("left-foot",b(-290,0,0,90,150,55).color(color));
p.part("right-foot",b(290,0,0,90,150,55).color(color));

return p.model();
