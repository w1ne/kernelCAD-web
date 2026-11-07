// SPDX-License-Identifier: CC0-1.0
// Handheld pH meter: Portable acidity meter with a recessed display, key pad, electrode holder and short cable tail. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "handheld-ph-meter",
  license: 'CC0-1.0',
  title: "Handheld pH meter",
  description: "Portable acidity meter with a recessed display, key pad, electrode holder and short cable tail. Parameters: overall scale, stainless steel, polymer, instrument glass; weathered and highVisibility presets.",
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
presets({
  weathered: {stainlessSteel:'#929e9c', polymer:'#b4b5aa', glass:'#548e98'},
  highVisibility: {stainlessSteel:'#d6dfdc', polymer:'#f2c84b', glass:'#38c5dc'},
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

const p = assembly("handheld-ph-meter");
p.part("meter-shell", b(0,0,85,260,165,430).color(polymer));
p.part("upper-cap", b(0,0,515,285,180,65).color(polymer));
p.part("display", b(0,-90,390,185,20,115).color(glass));
p.part("keypad", b(0,-92,230,190,20,95).color(polymer));
p.part("left-key", b(-55,-108,230,35,18,34).color(polymer));
p.part("right-key", b(55,-108,230,35,18,34).color(polymer));
p.part("probe-holder", b(160,0,120,85,75,100).color(stainlessSteel));
p.part("electrode", c(160,0,0,230,18,10).color(stainlessSteel));
p.part("connector", c(-70,0,570,90,34,10).color(polymer));
p.part("cable-end", c(-110,0,545,100,22,10).color(polymer));

return p.model();
