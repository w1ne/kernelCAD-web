// SPDX-License-Identifier: CC0-1.0
// Manual honey extractor: Low-poly radial extractor drum with lid, center spindle, legs and hand crank. Separate stainless steel, painted enamel, rubber surfaces clarify the parts.

meta({
  name: "honey-extractor",
  license: 'CC0-1.0',
  title: "Manual honey extractor",
  description: "Low-poly radial extractor drum with lid, center spindle, legs and hand crank. Material controls: stainless, enamel, rubber. Presets: brightStainless and warmHarvest.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const enamel = param('enamel', "#647b59", { label: "Painted enamel" });
const rubber = param('rubber', "#333a3b", { label: "Rubber" });

presets({
  brightStainless: { stainless: '#d9dfdc', enamel: '#91a66b', rubber: '#485152' },
  warmHarvest: { stainless: '#788482', enamel: '#4b5f48', rubber: '#252b2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-extractor");
p.part("drum",c(0,0,250,500,250,8).color(stainless));
p.part("base-ring",c(0,0,210,45,265,8).color(stainless));
p.part("lid",c(0,0,750,45,270,8).color(stainless));
p.part("spindle",c(0,0,795,240,32,8).color(stainless));
p.part("crank-arm",box(260,35,35,true).rotateZ(28).translate(0,-90,900).scale(scale).color(stainless));
p.part("crank-grip",c(130,-90,900,100,28,8).color(rubber));
p.part("leg-0",b(-190,-190,0,45,45,250).color(enamel));
p.part("leg-1",b(190,-190,0,45,45,250).color(enamel));
p.part("leg-2",b(0,190,0,45,45,250).color(enamel));
p.part("drain-spout",b(0,-255,315,115,90,45).color(stainless));

return p.model();
