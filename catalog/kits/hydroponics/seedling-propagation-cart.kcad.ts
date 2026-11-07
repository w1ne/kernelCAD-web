// SPDX-License-Identifier: CC0-1.0
// Seedling propagation cart: Mobile propagation trolley with four shallow trays, push handle and compact caster housings. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "seedling-propagation-cart",
  license: 'CC0-1.0',
  title: "Seedling propagation cart",
  description: "Mobile propagation trolley with four shallow trays, push handle and compact caster housings. Parameters: overall scale, powder-coated steel, polymer, rubber; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
const rubber=param('rubber','#323a3d',{label:'Rubber'});
presets({
  weathered: {powderCoatedSteel:'#69766e', polymer:'#b4b5aa', rubber:'#4b504e'},
  highVisibility: {powderCoatedSteel:'#e87832', polymer:'#f2c84b', rubber:'#262d30'},
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

const p = assembly("seedling-propagation-cart");
p.part("lower-tray", b(0,0,200,920,600,55).color(polymer));
p.part("tray-two", b(0,0,610,920,600,55).color(polymer));
p.part("tray-three", b(0,0,1020,920,600,55).color(polymer));
p.part("upper-tray", b(0,0,1430,920,600,55).color(polymer));
p.part("post-left", b(-420,220,255,45,45,1430).color(powderCoatedSteel));
p.part("post-right", b(420,220,255,45,45,1430).color(powderCoatedSteel));
p.part("push-handle", b(0,220,1705,880,48,48).color(polymer));
p.part("front-stop", b(0,-275,1450,870,32,85).color(polymer));
p.part("caster-left-front", c(-390,-235,0,155,58,10).color(rubber));
p.part("caster-right-front", c(390,-235,0,155,58,10).color(rubber));
p.part("caster-left-back", c(-390,235,0,155,58,10).color(rubber));
p.part("caster-right-back", c(390,235,0,155,58,10).color(rubber));

return p.model();
