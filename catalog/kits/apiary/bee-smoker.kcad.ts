// SPDX-License-Identifier: CC0-1.0
// Bee smoker: Low-poly smoker with fire pot, perforated-look cap, spout and bellows body. Separate stainless steel, leather, hive timber surfaces clarify the parts.

meta({
  name: "bee-smoker",
  license: 'CC0-1.0',
  title: "Bee smoker",
  description: "Low-poly smoker with fire pot, perforated-look cap, spout and bellows body. Material controls: stainless, leather, timber. Presets: fieldReady and sunWorn.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const leather = param('leather', "#805b3c", { label: "Leather" });
const timber = param('timber', "#b8874a", { label: "Hive timber" });

presets({
  fieldReady: { stainless: '#d9dfdc', leather: '#a67a50', timber: '#d4a462' },
  sunWorn: { stainless: '#788482', leather: '#503a2c', timber: '#68543d' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("bee-smoker");
p.part("fire-pot",c(0,0,150,300,145,8).color(stainless));
p.part("base-ring",c(0,0,120,35,155,8).color(stainless));
p.part("cap",c(0,0,450,70,165,8).color(stainless));
p.part("spout",path().moveTo(0,0).lineTo(70,0).lineTo(34,230).lineTo(0,230).close().revolve().rotateX(90).translate(0,-130,365).scale(scale).color(stainless));
p.part("spout-tip",cylinder(14,34,8).rotateX(90).translate(0,-360,365).scale(scale).color(stainless));
p.part("bellows-back",b(150,0,170,60,210,250).color(leather));
p.part("bellows-front",b(220,0,170,35,180,210).color(leather));
p.part("handle",b(0,0,0,190,140,55).color(timber));

return p.model();
