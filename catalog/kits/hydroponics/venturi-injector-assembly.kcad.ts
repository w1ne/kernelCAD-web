// SPDX-License-Identifier: CC0-1.0
// Venturi injector assembly: Inline injector assembly with a central throat body, bypass pipe and adjustment knob. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "venturi-injector-assembly",
  license: 'CC0-1.0',
  title: "Venturi injector assembly",
  description: "Inline injector assembly with a central throat body, bypass pipe and adjustment knob. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("venturi-injector-assembly");
p.part("support-base", b(0,0,0,720,260,55).color(powderCoatedSteel));
p.part("left-pipe", b(-440,0,320,400,70,70).color(pvc));
p.part("right-pipe", b(440,0,320,400,70,70).color(pvc));
p.part("body-center", b(0,0,275,600,180,165).color(polymer));
p.part("bypass-bridge", b(0,0,520,120,390,48).color(polymer));
p.part("bypass-left", b(-260,0,355,130,48,170).color(polymer));
p.part("bypass-right", b(260,0,355,130,48,170).color(polymer));
p.part("injector-throat", c(0,0,305,140,82,10).color(polymer));
p.part("adjustment-knob", c(0,-250,510,105,55,10).color(polymer));
p.part("suction-port", c(0,-10,480,180,28,10).color(polymer));

return p.model();
