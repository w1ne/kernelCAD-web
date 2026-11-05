// SPDX-License-Identifier: CC0-1.0
// Air pump cabinet: Ventilated air pump enclosure with raised intake louvres, lift feet and a service panel. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "air-pump-cabinet",
  license: 'CC0-1.0',
  title: "Air pump cabinet",
  description: "Ventilated air pump enclosure with raised intake louvres, lift feet and a service panel. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const pvc=param('pvc','#c7d4ca',{label:'PVC'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {powderCoatedSteel:'#69766e', pvc:'#b2bcae', polymer:'#b4b5aa'},
  highVisibility: {powderCoatedSteel:'#e87832', pvc:'#ead789', polymer:'#f2c84b'},
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

const p = assembly("air-pump-cabinet");
p.part("cabinet", b(0,0,80,760,620,980).color(polymer));
p.part("roof-cap", b(0,0,1060,820,680,70).color(polymer));
p.part("front-door", b(0,-320,180,620,35,720).color(polymer));
p.part("door-handle", b(270,-345,490,42,30,180).color(polymer));
p.part("louvre-a", b(0,-347,770,380,18,28).color(polymer));
p.part("louvre-b", b(0,-347,710,380,18,28).color(polymer));
p.part("louvre-c", b(0,-347,650,380,18,28).color(polymer));
p.part("left-foot", b(-300,0,0,80,580,90).color(powderCoatedSteel));
p.part("right-foot", b(300,0,0,80,580,90).color(powderCoatedSteel));
p.part("air-intake", c(-200,-365,440,150,52,10).color(polymer));
p.part("outlet-stub", c(320,140,850,250,42,10).color(pvc));

return p.model();
