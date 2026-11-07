// SPDX-License-Identifier: CC0-1.0
// Nutrient reservoir tank: Lidded solution reservoir with access hatch, level sight column and low drain fitting. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "nutrient-reservoir-tank",
  license: 'CC0-1.0',
  title: "Nutrient reservoir tank",
  description: "Lidded solution reservoir with access hatch, level sight column and low drain fitting. Parameters: overall scale, pvc, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pvc=param('pvc','#c7d4ca',{label:'PVC'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {pvc:'#b2bcae', polymer:'#b4b5aa'},
  highVisibility: {pvc:'#ead789', polymer:'#f2c84b'},
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

const p = assembly("nutrient-reservoir-tank");
p.part("tank-shell", b(0,0,0,1250,950,940).color(polymer));
p.part("lid", b(0,0,940,1280,980,80).color(polymer));
p.part("hatch-ring", b(-380,-270,1020,340,300,40).color(polymer));
p.part("hatch-cover", b(-380,-270,1060,270,230,38).color(polymer));
p.part("left-band", b(-635,0,150,35,920,760).color(polymer));
p.part("right-band", b(635,0,150,35,920,760).color(polymer));
p.part("sight-column", c(470,-500,180,620,35,10).color(polymer));
p.part("drain-fitting", c(0,-510,60,180,48,10).color(pvc));
p.part("vent-cap", c(450,400,1020,100,38,10).color(polymer));

return p.model();
