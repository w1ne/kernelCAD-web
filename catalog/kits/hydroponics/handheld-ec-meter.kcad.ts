// SPDX-License-Identifier: CC0-1.0
// Handheld EC meter: Handheld conductivity meter with a tapered-looking grip, raised display and probe lead. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "handheld-ec-meter",
  license: 'CC0-1.0',
  title: "Handheld EC meter",
  description: "Handheld conductivity meter with a tapered-looking grip, raised display and probe lead. Parameters: overall scale, stainless steel, polymer, instrument glass, safety amber; weathered and highVisibility presets.",
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
const glass=param('glass','#51afc1',{label:'Instrument glass'});
const safetyAmber=param('safetyAmber','#e4a52e',{label:'Safety amber'});
presets({
  weathered: {stainlessSteel:'#929e9c', polymer:'#b4b5aa', glass:'#548e98', safetyAmber:'#b9842f'},
  highVisibility: {stainlessSteel:'#d6dfdc', polymer:'#f2c84b', glass:'#38c5dc', safetyAmber:'#ffd139'},
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

const p = assembly("handheld-ec-meter");
p.part("meter-body", b(0,0,80,250,150,440).color(polymer));
p.part("shoulder", b(0,0,520,300,170,90).color(polymer));
p.part("display", b(0,-80,400,175,22,130).color(glass));
p.part("button-one", b(-58,-94,255,42,25,42).color(safetyAmber));
p.part("button-two", b(58,-94,255,42,25,42).color(safetyAmber));
p.part("probe-clip", b(130,0,130,90,60,100).color(stainlessSteel));
p.part("probe-stem", c(130,0,0,200,18,10).color(stainlessSteel));
p.part("probe-tip", c(130,0,0,70,27,10).color(stainlessSteel));
p.part("lanyard-eye", c(0,0,610,75,31,10).color(polymer));

return p.model();
