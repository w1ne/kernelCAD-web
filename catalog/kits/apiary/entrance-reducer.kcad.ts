// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "entrance-reducer",
  license: 'CC0-1.0',
  title: "Hive entrance reducer",
  description: "Removable entrance strip with two opening blocks and a broad center bar. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#89765a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("entrance-reducer");
p.part("strip",b(0,0,0,620,70,38).color(color));
p.part("left-block",b(-230,0,38,90,70,48).color(color));
p.part("right-block",b(230,0,38,90,70,48).color(color));
p.part("center-bar",b(0,0,38,260,70,26).color(color));
p.part("lift-tab-left",b(-300,0,38,30,95,45).color(color));
p.part("lift-tab-right",b(300,0,38,30,95,45).color(color));

return p.model();
