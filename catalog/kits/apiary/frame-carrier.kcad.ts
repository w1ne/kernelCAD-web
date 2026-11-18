// SPDX-License-Identifier: CC0-1.0
// Hive frame carrier: Portable frame rack with paired side rails, end handles and protective crossbars. Separate hive timber, stainless steel surfaces clarify the parts.

meta({
  name: "frame-carrier",
  license: 'CC0-1.0',
  title: "Hive frame carrier",
  description: "Portable frame rack with paired side rails, end handles and protective crossbars. Material controls: timber, stainless. Presets: freshApiary and weatheredYard.",
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

const p=assembly("frame-carrier");
p.part("bottom",b(0,0,0,620,430,55).color(timber));
p.part("side-left",b(-295,0,55,40,430,480).color(timber));
p.part("side-right",b(295,0,55,40,430,480).color(timber));
p.part("handle-left",b(-350,0,535,100,70,40).color(stainless));
p.part("handle-right",b(350,0,535,100,70,40).color(stainless));
p.part("cross-front",b(0,-210,490,650,35,35).color(timber));
p.part("cross-back",b(0,210,490,650,35,35).color(timber));

return p.model();
