// SPDX-License-Identifier: CC0-1.0
// Greenhouse circulation fan: Floor-stand circulation fan with an upright circular guard, swept rotor blades, vertical mast and broad base. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "greenhouse-circulation-fan",
  license: 'CC0-1.0',
  title: "Greenhouse circulation fan",
  description: "Floor-stand circulation fan with an upright circular guard, swept rotor blades, vertical mast and broad base. Parameters: overall scale, powder-coated steel, polymer; weathered and highVisibility presets.",
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
presets({
  weathered: {powderCoatedSteel:'#69766e', polymer:'#b4b5aa'},
  highVisibility: {powderCoatedSteel:'#e87832', polymer:'#f2c84b'},
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

const sweptBlade=(angle:number,centerZ:number,faceY:number,inside:number,outside:number,width:number)=>{
  const profile=path().moveTo(inside,-width*0.45)
    .lineTo(inside+55,-width*0.55)
    .lineTo(outside,-width*0.1)
    .lineTo(outside-30,width*0.5)
    .lineTo(inside+35,width*0.6)
    .lineTo(inside,width*0.35).close();
  return profile.extrude(36).rotateZ(angle).rotateX(90).translate(0,faceY,centerZ).scale(scale);
};

const p = assembly("greenhouse-circulation-fan");
p.part("base-foot", b(0,0,0,680,420,70).color(powderCoatedSteel));
p.part("mast", b(0,0,70,65,65,1070).color(powderCoatedSteel));
p.part("motor-housing", b(0,0,1140,260,250,220).color(powderCoatedSteel));
p.part("guard-crossbar-a",b(0,-40,1320,620,34,34).color(powderCoatedSteel));
p.part("guard-crossbar-b",b(0,-40,1320,34,34,620).color(powderCoatedSteel));
p.part("fan-guard",loftCylinder(55,380,10).rotateX(90).translate(0,0,1320).scale(scale).color(powderCoatedSteel));
p.part("hub",loftCylinder(100,85,10).rotateX(90).translate(0,-25,1320).scale(scale).color(polymer));
p.part("stand-collar", c(0,0,1070,100,68,10).color(powderCoatedSteel));

p.part("blade-north",sweptBlade(0,1320,-24,82,325,98).color(polymer));
p.part("blade-southwest",sweptBlade(120,1320,-24,82,325,98).color(polymer));
p.part("blade-southeast",sweptBlade(240,1320,-24,82,325,98).color(polymer));

return p.model();
