// SPDX-License-Identifier: CC0-1.0
// Greenhouse grow light bar: Single suspended lighting bar with end caps, support straps and a cable junction box. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "greenhouse-grow-light-bar",
  license: 'CC0-1.0',
  title: "Greenhouse grow light bar",
  description: "Single suspended lighting bar with end caps, support straps and a cable junction box. Parameters: overall scale, powder-coated steel, polymer, polycarbonate; weathered and highVisibility presets.",
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
const polycarbonate=param('polycarbonate','#8ccbd1',{label:'Polycarbonate'});
presets({
  weathered: {powderCoatedSteel:'#69766e', polymer:'#b4b5aa', polycarbonate:'#83aeb1'},
  highVisibility: {powderCoatedSteel:'#e87832', polymer:'#f2c84b', polycarbonate:'#b6edf0'},
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

const p = assembly("greenhouse-grow-light-bar");
p.part("light-diffuser", b(0,0,0,1600,160,70).color(polycarbonate));
p.part("upper-housing", b(0,0,70,1600,180,75).color(polymer));
p.part("end-cap-left", b(-800,0,35,60,205,95).color(polymer));
p.part("end-cap-right", b(800,0,35,60,205,95).color(polymer));
p.part("suspension-left", b(-630,0,145,38,38,260).color(powderCoatedSteel));
p.part("suspension-right", b(630,0,145,38,38,260).color(powderCoatedSteel));
p.part("junction-box", b(0,70,145,240,130,85).color(polymer));
p.part("cable-entry", c(0,100,230,140,18,10).color(polymer));

return p.model();
