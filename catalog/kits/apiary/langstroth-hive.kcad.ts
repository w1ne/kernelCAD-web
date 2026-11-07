// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "langstroth-hive",
  license: 'CC0-1.0',
  title: "Langstroth hive",
  description: "Stacked hive body, honey super, cover, entrance and raised stand. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b89358", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("langstroth-hive");
p.part("stand-left",b(-250,0,0,55,520,120).color(color));
p.part("stand-right",b(250,0,0,55,520,120).color(color));
p.part("bottom-board",b(0,0,120,620,520,60).color(color));
p.part("brood-box",b(0,0,180,600,500,430).color(color));
p.part("honey-super",b(0,0,610,590,490,280).color(color));
p.part("telescoping-cover",b(0,0,890,660,560,70).color(color));
p.part("entrance-strip",b(0,-255,150,440,35,55).color(color));

return p.model();
