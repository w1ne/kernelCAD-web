// SPDX-License-Identifier: CC0-1.0
// Aeration manifold: Air distribution rail with four outlet risers, end fittings and mounting brackets. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "aeration-manifold",
  license: 'CC0-1.0',
  title: "Aeration manifold",
  description: "Air distribution rail with four outlet risers, end fittings and mounting brackets. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("aeration-manifold");
p.part("mounting-rail", b(0,0,0,1600,180,60).color(powderCoatedSteel));
p.part("header", b(0,0,360,1650,75,75).color(pvc));
p.part("support-left", b(-720,0,60,60,60,300).color(powderCoatedSteel));
p.part("support-right", b(720,0,60,60,60,300).color(powderCoatedSteel));
p.part("branch-rail", b(0,0,120,1540,42,42).color(pvc));
p.part("riser-left", c(-550,0,120,310,28,10).color(pvc));
p.part("riser-mid-left", c(-180,0,120,310,28,10).color(pvc));
p.part("riser-mid-right", c(180,0,120,310,28,10).color(pvc));
p.part("riser-right", c(550,0,120,310,28,10).color(pvc));
p.part("end-cap-left", c(-825,0,340,75,55,10).color(polymer));
p.part("end-cap-right", c(825,0,340,75,55,10).color(polymer));

return p.model();
