// SPDX-License-Identifier: CC0-1.0
// Greenhouse exhaust fan: Wall exhaust module with an open square mounting frame, four swept rotor blades, rear motor and central drive hub. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "greenhouse-exhaust-fan",
  license: 'CC0-1.0',
  title: "Greenhouse exhaust fan",
  description: "Wall exhaust module with an open square mounting frame, four swept rotor blades, rear motor and central drive hub. Parameters: overall scale, powder-coated steel, stainless steel, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const stainlessSteel=param('stainlessSteel','#b2c0bf',{label:'Stainless steel'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {powderCoatedSteel:'#69766e', stainlessSteel:'#929e9c', polymer:'#b4b5aa'},
  highVisibility: {powderCoatedSteel:'#e87832', stainlessSteel:'#d6dfdc', polymer:'#f2c84b'},
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

const sweptBlade=(angle:number,centerZ:number,faceY:number,inside:number,outside:number,width:number)=>{
  const profile=path().moveTo(inside,-width*0.45)
    .lineTo(inside+55,-width*0.55)
    .lineTo(outside,-width*0.1)
    .lineTo(outside-30,width*0.5)
    .lineTo(inside+35,width*0.6)
    .lineTo(inside,width*0.35).close();
  return profile.extrude(36).rotateZ(angle).rotateX(90).translate(0,faceY,centerZ).scale(scale);
};

const p = assembly("greenhouse-exhaust-fan");
p.part("fan-hub",loftCylinder(72,125,10).rotateX(90).translate(0,-82,525).scale(scale).color(powderCoatedSteel));
p.part("corner-boss-left",loftCylinder(90,48,10).rotateX(90).translate(-470,-145,48).scale(scale).color(polymer));
p.part("corner-boss-right",loftCylinder(90,48,10).rotateX(90).translate(470,-145,48).scale(scale).color(polymer));

p.part("motor-housing",loftCylinder(220,90,10).rotateX(-90).translate(0,60,525).scale(scale).color(powderCoatedSteel));
p.part("motor-shaft",loftCylinder(160,18,8).rotateX(-90).translate(0,-100,525).scale(scale).color(stainlessSteel));
p.part("outer-frame-top",b(0,0,990,1050,250,60).color(powderCoatedSteel));
p.part("outer-frame-bottom",b(0,0,0,1050,250,60).color(powderCoatedSteel));
p.part("outer-frame-left",b(-495,0,0,60,250,1050).color(powderCoatedSteel));
p.part("outer-frame-right",b(495,0,0,60,250,1050).color(powderCoatedSteel));
p.part("inner-frame-top",b(0,-140,890,850,35,50).color(powderCoatedSteel));
p.part("inner-frame-bottom",b(0,-140,90,850,35,50).color(powderCoatedSteel));
p.part("inner-frame-left",b(-400,-140,90,50,35,850).color(powderCoatedSteel));
p.part("inner-frame-right",b(400,-140,90,50,35,850).color(powderCoatedSteel));
p.part("blade-a",sweptBlade(45,525,-92,118,345,108).color(polymer));
p.part("blade-b",sweptBlade(135,525,-92,118,345,108).color(polymer));
p.part("blade-c",sweptBlade(225,525,-92,118,345,108).color(polymer));
p.part("blade-d",sweptBlade(315,525,-92,118,345,108).color(polymer));

return p.model();
