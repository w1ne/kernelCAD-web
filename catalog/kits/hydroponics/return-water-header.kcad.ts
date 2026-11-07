// SPDX-License-Identifier: CC0-1.0
// Return water header: Raised collection header with four return inlets, end support saddles and a cleanout cap. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "return-water-header",
  license: 'CC0-1.0',
  title: "Return water header",
  description: "Raised collection header with four return inlets, end support saddles and a cleanout cap. Parameters: overall scale, powder-coated steel, pvc; weathered and highVisibility presets.",
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
presets({
  weathered: {powderCoatedSteel:'#69766e', pvc:'#b2bcae'},
  highVisibility: {powderCoatedSteel:'#e87832', pvc:'#ead789'},
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

const p = assembly("return-water-header");
p.part("header-pipe", b(0,0,200,1900,90,90).color(pvc));
p.part("support-left", b(-780,0,0,75,240,200).color(powderCoatedSteel));
p.part("support-center-left", b(-260,0,0,75,240,200).color(powderCoatedSteel));
p.part("support-center-right", b(260,0,0,75,240,200).color(powderCoatedSteel));
p.part("support-right", b(780,0,0,75,240,200).color(powderCoatedSteel));
p.part("inlet-left", c(-600,0,280,165,40,10).color(pvc));
p.part("inlet-mid-left", c(-200,0,280,165,40,10).color(pvc));
p.part("inlet-mid-right", c(200,0,280,165,40,10).color(pvc));
p.part("inlet-right", c(600,0,280,165,40,10).color(pvc));
p.part("cleanout", c(930,0,250,170,45,10).color(pvc));

return p.model();
