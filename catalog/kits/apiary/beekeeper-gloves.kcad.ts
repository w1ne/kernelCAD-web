// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "beekeeper-gloves",
  license: 'CC0-1.0',
  title: "Beekeeper gloves",
  description: "Pair of gauntlet gloves with broad cuffs and separated low-poly fingers. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d8d0b8", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("beekeeper-gloves");
p.part("palm-left",b(-140,0,130,150,65,150).color(color));
p.part("palm-right",b(140,0,130,150,65,150).color(color));
p.part("finger-left-0",b(-188,0,0,38,52,145).color(color));
p.part("finger-left-1",b(-156,0,0,38,52,145).color(color));
p.part("finger-left-2",b(-124,0,0,38,52,145).color(color));
p.part("finger-left-3",b(-92,0,0,38,52,145).color(color));
p.part("finger-right-0",b(92,0,0,38,52,145).color(color));
p.part("finger-right-1",b(124,0,0,38,52,145).color(color));
p.part("finger-right-2",b(156,0,0,38,52,145).color(color));
p.part("finger-right-3",b(188,0,0,38,52,145).color(color));
p.part("cuff-left",b(-140,0,280,210,105,65).color(color));
p.part("cuff-right",b(140,0,280,210,105,65).color(color));

return p.model();
