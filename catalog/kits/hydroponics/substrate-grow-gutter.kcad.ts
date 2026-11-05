// SPDX-License-Identifier: CC0-1.0
// Substrate grow gutter: Long raised crop gutter with end caps, support saddles, drain pickup and parallel feed tube. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "substrate-grow-gutter",
  license: 'CC0-1.0',
  title: "Substrate grow gutter",
  description: "Long raised crop gutter with end caps, support saddles, drain pickup and parallel feed tube. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("substrate-grow-gutter");
p.part("trough", b(0,0,500,2100,340,170).color(polymer));
p.part("front-rim", b(0,-185,660,2140,35,45).color(polymer));
p.part("back-rim", b(0,185,660,2140,35,45).color(polymer));
p.part("end-cap-left", b(-1070,0,500,45,340,180).color(polymer));
p.part("end-cap-right", b(1070,0,500,45,340,180).color(polymer));
p.part("support-left", b(-760,0,0,65,430,500).color(powderCoatedSteel));
p.part("support-middle", b(0,0,0,65,430,500).color(powderCoatedSteel));
p.part("support-right", b(760,0,0,65,430,500).color(powderCoatedSteel));
p.part("feed-tube", b(0,-250,460,35,80,35).color(pvc));
p.part("drain-pickup", c(940,-155,330,165,30,10).color(pvc));

return p.model();
