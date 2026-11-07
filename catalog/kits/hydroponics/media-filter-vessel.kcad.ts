// SPDX-License-Identifier: CC0-1.0
// Media filter vessel: Compact vertical filtration tank with bolted-looking top ring, service hatch and lower legs. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "media-filter-vessel",
  license: 'CC0-1.0',
  title: "Media filter vessel",
  description: "Compact vertical filtration tank with bolted-looking top ring, service hatch and lower legs. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("media-filter-vessel");
p.part("base-frame", b(0,0,0,800,800,100).color(powderCoatedSteel));
p.part("front-panel", b(0,-410,250,570,35,700).color(polymer));
p.part("side-panel", b(410,0,250,35,710,700).color(polymer));
p.part("top-ring", b(0,0,1130,850,850,75).color(polymer));
p.part("service-cover", b(-270,-390,760,160,30,180).color(polymer));
p.part("left-foot", b(-280,-260,0,90,90,280).color(powderCoatedSteel));
p.part("right-foot", b(280,-260,0,90,90,280).color(powderCoatedSteel));
p.part("vessel-shell", c(0,0,100,1180,350,10).color(polymer));
p.part("inlet-port", c(-380,-270,520,230,58,10).color(pvc));
p.part("outlet-port", c(380,-270,780,230,58,10).color(pvc));
p.part("backwash-port", c(0,390,980,175,42,10).color(polymer));

return p.model();
