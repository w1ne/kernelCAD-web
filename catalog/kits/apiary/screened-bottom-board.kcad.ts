// SPDX-License-Identifier: CC0-1.0
// Screened bottom board: Hive floor assembly with screen grid, side rails and front entrance ledge. Separate hive timber, stainless steel surfaces clarify the parts.

meta({
  name: "screened-bottom-board",
  license: 'CC0-1.0',
  title: "Screened bottom board",
  description: "Hive floor assembly with screen grid, side rails and front entrance ledge. Material controls: timber, stainless. Presets: freshApiary and weatheredYard.",
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

const p=assembly("screened-bottom-board");
p.part("floor",b(0,0,5,660,500,45).color(timber));
p.part("rail-left",b(-315,0,45,35,520,80).color(timber));
p.part("rail-right",b(315,0,45,35,520,80).color(timber));
p.part("screen-bar-a",b(-180,0,55,18,440,12).color(stainless));
p.part("screen-bar-b",b(-90,0,55,18,440,12).color(stainless));
p.part("screen-bar-c",b(0,0,55,18,440,12).color(stainless));
p.part("screen-bar-d",b(90,0,55,18,440,12).color(stainless));
p.part("screen-bar-e",b(180,0,55,18,440,12).color(stainless));
p.part("entrance-ledge",b(0,-290,0,760,100,35).color(timber));

return p.model();
