// SPDX-License-Identifier: CC0-1.0
// Beekeeper veil hood: Hat brim and crown framed by a squared mesh veil and lower neck band. Separate canvas and protective fabric, woven veil mesh, leather surfaces clarify the parts.

meta({
  name: "beekeeper-veil-hood",
  license: 'CC0-1.0',
  title: "Beekeeper veil hood",
  description: "Hat brim and crown framed by a squared mesh veil and lower neck band. Material controls: fabric, mesh, leather. Presets: fieldReady and sunWorn.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fabric = param('fabric', "#c8b78f", { label: "Canvas and protective fabric" });
const mesh = param('mesh', "#4a5e55", { label: "Woven veil mesh" });
const leather = param('leather', "#805b3c", { label: "Leather" });

presets({
  fieldReady: { fabric: '#e7dfc9', mesh: '#6c8075', leather: '#a67a50' },
  sunWorn: { fabric: '#78664a', mesh: '#303d38', leather: '#503a2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("beekeeper-veil-hood");
p.part("brim",b(0,0,245,380,380,35).color(leather));
p.part("crown",b(0,0,355,230,230,170).color(fabric));
p.part("veil-front",b(0,-175,25,330,20,220).color(mesh));
p.part("veil-back",b(0,175,25,330,20,220).color(mesh));
p.part("veil-left",b(-155,0,25,20,330,220).color(mesh));
p.part("veil-right",b(155,0,25,20,330,220).color(mesh));
p.part("neck-band",b(0,0,0,350,350,30).color(fabric));

return p.model();
