// SPDX-License-Identifier: CC0-1.0
// Hive entrance reducer: Removable entrance strip with two opening blocks and a broad center bar. Separate hive timber, molded polymer, stainless steel surfaces clarify the parts.

meta({
  name: "entrance-reducer",
  license: 'CC0-1.0',
  title: "Hive entrance reducer",
  description: "Removable entrance strip with two opening blocks and a broad center bar. Material controls: timber, polymer, stainless. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });

presets({
  freshApiary: { timber: '#d4a462', polymer: '#d7e2d8', stainless: '#d9dfdc' },
  weatheredYard: { timber: '#68543d', polymer: '#3f5d54', stainless: '#788482' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("entrance-reducer");
p.part("strip",b(0,0,0,620,70,38).color(timber));
p.part("left-block",b(-230,0,38,90,70,48).color(polymer));
p.part("right-block",b(230,0,38,90,70,48).color(polymer));
p.part("center-bar",b(0,0,38,260,70,26).color(timber));
p.part("lift-tab-left",b(-300,0,38,30,95,45).color(stainless));
p.part("lift-tab-right",b(300,0,38,30,95,45).color(stainless));

return p.model();
