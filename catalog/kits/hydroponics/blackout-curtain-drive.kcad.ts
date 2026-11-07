// SPDX-License-Identifier: CC0-1.0
// Blackout curtain drive: Greenhouse shade-screen drive assembly with a motor block, roller shaft and end supports. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "blackout-curtain-drive",
  license: 'CC0-1.0',
  title: "Blackout curtain drive",
  description: "Greenhouse shade-screen drive assembly with a motor block, roller shaft and end supports. Parameters: overall scale, powder-coated steel, polymer, rubber; weathered and highVisibility presets.",
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

const p = assembly("blackout-curtain-drive");
p.part("mount-plate", b(0,0,0,900,300,55).color(powderCoatedSteel));
p.part("left-bracket", b(-420,0,55,65,260,550).color(powderCoatedSteel));
p.part("right-bracket", b(420,0,55,65,260,550).color(powderCoatedSteel));
p.part("motor-box", b(-270,-180,150,260,180,280).color(powderCoatedSteel));
p.part("screen-rail", b(0,0,480,850,65,65).color(powderCoatedSteel));
p.part("curtain-weight", b(0,500,0,760,60,80).color(polymer));
p.part("limit-switch-box", b(350,-130,360,140,120,115).color(polymer));
p.part("roller-tube", c(0,0,350,150,45,10).color(rubber));
p.part("drive-coupler", c(-430,0,300,140,55,10).color(polymer));
p.part("idler-cap", c(430,0,360,100,54,10).color(polymer));

return p.model();
