// SPDX-License-Identifier: CC0-1.0
// Wall-mounted CO2 sensor: Compact wall enclosure with a vented cover, mounting lugs and short cable gland. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "wall-mounted-co2-sensor",
  license: 'CC0-1.0',
  title: "Wall-mounted CO2 sensor",
  description: "Compact wall enclosure with a vented cover, mounting lugs and short cable gland. Parameters: overall scale, stainless steel, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel=param('stainlessSteel','#b2c0bf',{label:'Stainless steel'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {stainlessSteel:'#929e9c', polymer:'#b4b5aa'},
  highVisibility: {stainlessSteel:'#d6dfdc', polymer:'#f2c84b'},
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

const p = assembly("wall-mounted-co2-sensor");
p.part("backplate", b(0,0,0,260,90,340).color(polymer));
p.part("sensor-case", b(0,-20,35,230,100,265).color(polymer));
p.part("top-vent", b(0,-80,215,150,20,26).color(polymer));
p.part("middle-vent", b(0,-80,170,150,20,26).color(polymer));
p.part("bottom-vent", b(0,-80,125,150,20,26).color(polymer));
p.part("left-lug", b(-160,0,20,60,100,55).color(polymer));
p.part("right-lug", b(160,0,20,60,100,55).color(polymer));
p.part("cable-gland", c(80,-40,0,100,28,10).color(polymer));
p.part("sensor-cap", c(0,-30,300,95,74,10).color(stainlessSteel));

return p.model();
