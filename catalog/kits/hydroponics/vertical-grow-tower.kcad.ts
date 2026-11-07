// SPDX-License-Identifier: CC0-1.0
// Vertical grow tower: Stacked hydroponic planting collars around a central feed column on a weighted circular base. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "vertical-grow-tower",
  license: 'CC0-1.0',
  title: "Vertical grow tower",
  description: "Stacked hydroponic planting collars around a central feed column on a weighted circular base. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("vertical-grow-tower");
p.part("base-plinth", b(0,0,0,500,500,120).color(powderCoatedSteel));
p.part("lower-collar", b(0,0,120,570,570,100).color(polymer));
p.part("tier-one", b(0,0,470,500,500,90).color(polymer));
p.part("tier-two", b(0,0,850,500,500,90).color(polymer));
p.part("tier-three", b(0,0,1230,500,500,90).color(polymer));
p.part("top-lid", b(0,0,1610,520,520,70).color(polymer));
p.part("central-feed-column", c(0,0,120,1590,68,10).color(pvc));
p.part("side-port-left", c(-270,0,520,110,35,10).color(polymer));
p.part("side-port-right", c(270,0,900,110,35,10).color(polymer));
p.part("foot-a", c(-200,-200,0,90,38,10).color(powderCoatedSteel));
p.part("foot-b", c(200,-200,0,90,38,10).color(powderCoatedSteel));
p.part("foot-c", c(0,205,0,90,38,10).color(powderCoatedSteel));

return p.model();
