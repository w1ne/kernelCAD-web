// SPDX-License-Identifier: CC0-1.0
// Nutrient feed manifold: Header rail with five evenly spaced outlet branches, isolation blocks and a vertical supply riser. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "nutrient-feed-manifold",
  license: 'CC0-1.0',
  title: "Nutrient feed manifold",
  description: "Header rail with five evenly spaced outlet branches, isolation blocks and a vertical supply riser. Parameters: overall scale, powder-coated steel, pvc; weathered and highVisibility presets.",
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

const p = assembly("nutrient-feed-manifold");
p.part("header", b(0,0,520,1800,70,70).color(pvc));
p.part("mount-rail", b(0,0,0,1850,65,55).color(powderCoatedSteel));
p.part("support-left", b(-800,0,55,55,55,465).color(powderCoatedSteel));
p.part("support-right", b(800,0,55,55,55,465).color(powderCoatedSteel));
p.part("valve-left", b(-570,-35,440,100,100,120).color(pvc));
p.part("valve-mid-left", b(-285,-35,440,100,100,120).color(pvc));
p.part("valve-mid", b(0,-35,440,100,100,120).color(pvc));
p.part("valve-mid-right", b(285,-35,440,100,100,120).color(pvc));
p.part("valve-right", b(570,-35,440,100,100,120).color(pvc));
p.part("branch-1", c(-570,0,100,410,24,10).color(pvc));
p.part("branch-2", c(-285,0,100,410,24,10).color(pvc));
p.part("branch-3", c(0,0,100,410,24,10).color(pvc));
p.part("branch-4", c(285,0,100,410,24,10).color(pvc));
p.part("branch-5", c(570,0,100,410,24,10).color(pvc));
p.part("supply-riser", c(-880,0,55,510,32,10).color(pvc));

return p.model();
