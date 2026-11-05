// SPDX-License-Identifier: CC0-1.0
// Deep-water culture bed: Rectangular raft culture trough with a raised rim, flotation deck panels and a drain outlet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "deep-water-culture-bed",
  license: 'CC0-1.0',
  title: "Deep-water culture bed",
  description: "Rectangular raft culture trough with a raised rim, flotation deck panels and a drain outlet. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("deep-water-culture-bed");
p.part("trough-base", b(0,0,0,1800,1250,150).color(powderCoatedSteel));
p.part("front-wall", b(0,-590,150,1800,70,450).color(polymer));
p.part("back-wall", b(0,590,150,1800,70,450).color(polymer));
p.part("left-wall", b(-865,0,150,70,1110,450).color(polymer));
p.part("right-wall", b(865,0,150,70,1110,450).color(polymer));
p.part("raft-panel-a", b(-450,0,570,770,1070,60).color(polymer));
p.part("raft-panel-b", b(420,0,570,770,1070,60).color(polymer));
p.part("rim-front", b(0,-625,600,1850,70,65).color(polymer));
p.part("rim-back", b(0,625,600,1850,70,65).color(polymer));
p.part("drain-outlet", c(0,-680,180,230,48,10).color(pvc));

return p.model();
