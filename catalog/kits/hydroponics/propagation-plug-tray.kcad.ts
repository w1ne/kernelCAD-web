// SPDX-License-Identifier: CC0-1.0
// Propagation plug tray: Shallow seedling insert with a broad rim, four rows of tapered plug cells and carry tabs. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "propagation-plug-tray",
  license: 'CC0-1.0',
  title: "Propagation plug tray",
  description: "Shallow seedling insert with a broad rim, four rows of tapered plug cells and carry tabs. Parameters: overall scale, polymer, grow substrate; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
const growSubstrate=param('growSubstrate','#8a6848',{label:'Grow substrate'});
presets({
  weathered: {polymer:'#b4b5aa', growSubstrate:'#75604b'},
  highVisibility: {polymer:'#f2c84b', growSubstrate:'#aa8652'},
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

const p = assembly("propagation-plug-tray");
p.part("tray-floor", b(0,0,0,760,520,45).color(polymer));
p.part("front-rim", b(0,-255,45,760,40,50).color(polymer));
p.part("back-rim", b(0,255,45,760,40,50).color(polymer));
p.part("left-rim", b(-360,0,45,40,480,50).color(polymer));
p.part("right-rim", b(360,0,45,40,480,50).color(polymer));
p.part("cell-row-front", b(0,-145,45,700,28,35).color(growSubstrate));
p.part("cell-row-mid-front", b(0,-45,45,700,28,35).color(growSubstrate));
p.part("cell-row-mid-back", b(0,55,45,700,28,35).color(growSubstrate));
p.part("cell-row-back", b(0,155,45,700,28,35).color(growSubstrate));
p.part("carry-grip-left", c(-410,0,45,100,32,10).color(polymer));
p.part("carry-grip-right", c(410,0,45,100,32,10).color(polymer));

return p.model();
