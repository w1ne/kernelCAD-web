// SPDX-License-Identifier: CC0-1.0
// Overhead grow light frame: Raised horticultural lighting gantry with paired rails, cross beams and hanging light bars. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "overhead-grow-light-frame",
  license: 'CC0-1.0',
  title: "Overhead grow light frame",
  description: "Raised horticultural lighting gantry with paired rails, cross beams and hanging light bars. Parameters: overall scale, powder-coated steel, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {powderCoatedSteel:'#69766e', polymer:'#b4b5aa'},
  highVisibility: {powderCoatedSteel:'#e87832', polymer:'#f2c84b'},
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const section=(radius:number,sides:number)=>{
  let outline=path().moveTo(radius*Math.cos(Math.PI/2),radius*Math.sin(Math.PI/2));
  for(let k=1;k<sides;k++){
    const angle=Math.PI/2+(2*Math.PI*k)/sides;
    outline=outline.lineTo(radius*Math.cos(angle),radius*Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder=(height:number,radius:number,sides:number)=>{
  const levels=[0,height*0.08,height*0.92,height];
  const radii=[radius*0.9,radius,radius,radius*0.9];
  const profiles=levels.map((_,index)=>section(radii[index],sides));
  return profiles[0].loft(profiles.slice(1),{
    planes:levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  });
};
const c=(x:number,y:number,z:number,h:number,r:number,s:number)=>loftCylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("overhead-grow-light-frame");
p.part("foot-left-front", b(-900,-650,0,100,100,90).color(powderCoatedSteel));
p.part("foot-right-front", b(900,-650,0,100,100,90).color(powderCoatedSteel));
p.part("foot-left-back", b(-900,650,0,100,100,90).color(powderCoatedSteel));
p.part("foot-right-back", b(900,650,0,100,100,90).color(powderCoatedSteel));
p.part("leg-left-front", b(-900,-650,90,60,60,2400).color(powderCoatedSteel));
p.part("leg-right-front", b(900,-650,90,60,60,2400).color(powderCoatedSteel));
p.part("leg-left-back", b(-900,650,90,60,60,2400).color(powderCoatedSteel));
p.part("leg-right-back", b(900,650,90,60,60,2400).color(powderCoatedSteel));
p.part("top-beam-front", b(0,-650,2490,1850,60,60).color(powderCoatedSteel));
p.part("top-beam-back", b(0,650,2490,1850,60,60).color(powderCoatedSteel));
p.part("light-bar-a", b(0,-330,2330,1650,100,55).color(polymer));
p.part("light-bar-b", b(0,330,2330,1650,100,55).color(polymer));
p.part("hanger-left", c(-620,0,2220,120,18,10).color(powderCoatedSteel));
p.part("hanger-right", c(620,0,2220,120,18,10).color(powderCoatedSteel));

return p.model();
