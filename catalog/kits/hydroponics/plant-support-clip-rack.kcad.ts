// SPDX-License-Identifier: CC0-1.0
// Plant support clip rack: Compact pegboard organizer with stacked clip rails, end brackets and a freestanding foot. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "plant-support-clip-rack",
  license: 'CC0-1.0',
  title: "Plant support clip rack",
  description: "Compact pegboard organizer with stacked clip rails, end brackets and a freestanding foot. Parameters: overall scale, powder-coated steel, polymer; weathered and highVisibility presets.",
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

const p = assembly("plant-support-clip-rack");
p.part("backboard", b(0,0,0,720,80,820).color(polymer));
p.part("base-foot", b(0,-80,0,850,300,75).color(powderCoatedSteel));
p.part("top-cap", b(0,0,820,760,100,55).color(polymer));
p.part("left-bracket", b(-350,0,75,55,90,745).color(powderCoatedSteel));
p.part("right-bracket", b(350,0,75,55,90,745).color(powderCoatedSteel));
p.part("clip-rail-low", b(0,-65,210,650,50,45).color(powderCoatedSteel));
p.part("clip-rail-mid", b(0,-65,390,650,50,45).color(powderCoatedSteel));
p.part("clip-rail-high", b(0,-65,570,650,50,45).color(powderCoatedSteel));
p.part("clip-left-low", c(-240,-110,255,90,28,10).color(polymer));
p.part("clip-mid-low", c(0,-110,255,90,28,10).color(polymer));
p.part("clip-right-low", c(240,-110,255,90,28,10).color(polymer));
p.part("hanging-eye", c(0,-90,650,80,38,10).color(polymer));

return p.model();
