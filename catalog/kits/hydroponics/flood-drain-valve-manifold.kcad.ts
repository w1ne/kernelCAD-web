// SPDX-License-Identifier: CC0-1.0
// Flood-and-drain valve manifold: Compact manifold panel with two valve bodies, branch outlets and a central riser. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "flood-drain-valve-manifold",
  license: 'CC0-1.0',
  title: "Flood-and-drain valve manifold",
  description: "Compact manifold panel with two valve bodies, branch outlets and a central riser. Parameters: overall scale, powder-coated steel, pvc; weathered and highVisibility presets.",
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

const p = assembly("flood-drain-valve-manifold");
p.part("mounting-plate", b(0,0,0,650,260,50).color(powderCoatedSteel));
p.part("header-pipe", b(0,0,450,58,760,58).color(pvc));
p.part("left-branch", b(-270,0,190,58,420,58).color(pvc));
p.part("right-branch", b(270,0,190,58,420,58).color(pvc));
p.part("valve-handle-left", b(-270,-20,470,190,70,40).color(pvc));
p.part("valve-handle-right", b(270,-20,470,190,70,40).color(pvc));
p.part("outlet-rail", b(0,0,100,700,55,55).color(pvc));
p.part("valve-body-left", c(-270,0,245,130,72,10).color(pvc));
p.part("valve-body-right", c(270,0,245,130,72,10).color(pvc));
p.part("riser", c(0,0,50,450,28,10).color(pvc));
p.part("outlet-left", c(-280,0,70,170,24,10).color(pvc));
p.part("outlet-right", c(280,0,70,170,24,10).color(pvc));

return p.model();
