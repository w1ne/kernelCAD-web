// SPDX-License-Identifier: CC0-1.0
// Beekeeper gloves: Pair of gauntlet gloves with broad cuffs and separated low-poly fingers. Separate canvas and protective fabric, leather surfaces clarify the parts.

meta({
  name: "beekeeper-gloves",
  license: 'CC0-1.0',
  title: "Beekeeper gloves",
  description: "Pair of gauntlet gloves with broad cuffs and separated low-poly fingers. Material controls: fabric, leather. Presets: fieldReady and sunWorn.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fabric = param('fabric', "#c8b78f", { label: "Canvas and protective fabric" });
const leather = param('leather', "#805b3c", { label: "Leather" });

presets({
  fieldReady: { fabric: '#e7dfc9', leather: '#a67a50' },
  sunWorn: { fabric: '#78664a', leather: '#503a2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("beekeeper-gloves");
p.part("palm-left",b(-140,0,130,150,65,150).color(leather));
p.part("palm-right",b(140,0,130,150,65,150).color(leather));
p.part("finger-left-0",b(-188,0,0,38,52,145).color(fabric));
p.part("finger-left-1",b(-156,0,0,38,52,145).color(fabric));
p.part("finger-left-2",b(-124,0,0,38,52,145).color(fabric));
p.part("finger-left-3",b(-92,0,0,38,52,145).color(fabric));
p.part("finger-right-0",b(92,0,0,38,52,145).color(fabric));
p.part("finger-right-1",b(124,0,0,38,52,145).color(fabric));
p.part("finger-right-2",b(156,0,0,38,52,145).color(fabric));
p.part("finger-right-3",b(188,0,0,38,52,145).color(fabric));
p.part("cuff-left",b(-140,0,280,210,105,65).color(fabric));
p.part("cuff-right",b(140,0,280,210,105,65).color(fabric));

return p.model();
