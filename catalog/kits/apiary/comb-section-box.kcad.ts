// SPDX-License-Identifier: CC0-1.0
// Comb section box: Small presentation box frame with top rim, lower tray and open-look center panel. Separate hive timber, beeswax and foundation, stainless steel surfaces clarify the parts.

meta({
  name: "comb-section-box",
  license: 'CC0-1.0',
  title: "Comb section box",
  description: "Small presentation box frame with top rim, lower tray and open-look center panel. Material controls: timber, wax, stainless. Presets: brightStainless and warmHarvest.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', "#b8874a", { label: "Hive timber" });
const wax = param('wax', "#e3c978", { label: "Beeswax and foundation" });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });

presets({
  brightStainless: { timber: '#d4a462', wax: '#f1df9d', stainless: '#d9dfdc' },
  warmHarvest: { timber: '#68543d', wax: '#bc9344', stainless: '#788482' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("comb-section-box");
p.part("base",b(0,0,0,260,220,35).color(timber));
p.part("left",b(-115,0,35,30,220,240).color(timber));
p.part("right",b(115,0,35,30,220,240).color(timber));
p.part("front",b(0,-95,35,230,30,240).color(timber));
p.part("back",b(0,95,35,230,30,240).color(timber));
p.part("top-rim",b(0,0,275,270,230,35).color(stainless));
p.part("comb-panel",b(0,0,110,160,12,130).color(wax));

return p.model();
