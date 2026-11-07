// SPDX-License-Identifier: CC0-1.0
// Evaporative cooling pad: Cooling wall section with a framed media panel, top water header and lower collection trough. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "evaporative-cooling-pad",
  license: 'CC0-1.0',
  title: "Evaporative cooling pad",
  description: "Cooling wall section with a framed media panel, top water header and lower collection trough. Parameters: overall scale, powder-coated steel, pvc, polymer, grow substrate; weathered and highVisibility presets.",
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
const growSubstrate=param('growSubstrate','#8a6848',{label:'Grow substrate'});
presets({
  weathered: {powderCoatedSteel:'#69766e', pvc:'#b2bcae', polymer:'#b4b5aa', growSubstrate:'#75604b'},
  highVisibility: {powderCoatedSteel:'#e87832', pvc:'#ead789', polymer:'#f2c84b', growSubstrate:'#aa8652'},
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

const p = assembly("evaporative-cooling-pad");
p.part("pad-core", b(0,0,180,1400,150,1500).color(growSubstrate));
p.part("frame-left", b(-740,0,100,70,190,1670).color(powderCoatedSteel));
p.part("frame-right", b(740,0,100,70,190,1670).color(powderCoatedSteel));
p.part("frame-top", b(0,0,1640,1500,190,70).color(powderCoatedSteel));
p.part("sump-trough", b(0,0,0,1550,240,180).color(polymer));
p.part("front-grille", b(0,-105,300,1280,30,1260).color(polymer));
p.part("side-support-left", b(-650,0,0,60,300,100).color(powderCoatedSteel));
p.part("side-support-right", b(650,0,0,60,300,100).color(powderCoatedSteel));
p.part("water-header", c(0,0,1665,65,42,10).color(pvc));
p.part("inlet-riser", c(650,0,180,1460,25,10).color(pvc));
p.part("drain-outlet", c(0,-135,40,180,30,10).color(pvc));

return p.model();
