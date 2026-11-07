// SPDX-License-Identifier: CC0-1.0
// Hive frame rest: Crossbar accessory with two raised ledges that hold removed hive frames. Separate hive timber, stainless steel surfaces clarify the parts.

meta({
  name: "frame-rest",
  license: 'CC0-1.0',
  title: "Hive frame rest",
  description: "Crossbar accessory with two raised ledges that hold removed hive frames. Material controls: timber, stainless. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });

presets({
  freshApiary: { timber: '#d4a462', stainless: '#d9dfdc' },
  weatheredYard: { timber: '#68543d', stainless: '#788482' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("frame-rest");
p.part("beam",b(0,0,55,740,80,55).color(timber));
p.part("left-ledge",b(-240,0,110,170,110,45).color(timber));
p.part("right-ledge",b(240,0,110,170,110,45).color(timber));
p.part("center-stop",b(0,0,110,45,100,65).color(stainless));
p.part("left-foot",b(-290,0,0,90,150,55).color(timber));
p.part("right-foot",b(290,0,0,90,150,55).color(timber));

return p.model();
