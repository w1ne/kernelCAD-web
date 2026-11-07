// SPDX-License-Identifier: CC0-1.0
// Net pot stack: Nested-looking stack of four lightweight planting cups with rolled rims and tapered-looking steps. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "net-pot-stack",
  license: 'CC0-1.0',
  title: "Net pot stack",
  description: "Nested-looking stack of four lightweight planting cups with rolled rims and tapered-looking steps. Parameters: overall scale, powder-coated steel, polymer; weathered and highVisibility presets.",
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

const p = assembly("net-pot-stack");
p.part("base-plate", b(0,0,0,420,420,35).color(powderCoatedSteel));
p.part("lower-cup", b(0,0,35,300,300,150).color(polymer));
p.part("second-cup", b(0,0,180,270,270,150).color(polymer));
p.part("third-cup", b(0,0,325,240,240,150).color(polymer));
p.part("upper-cup", b(0,0,470,210,210,150).color(polymer));
p.part("rim-lower", b(0,0,185,350,350,32).color(polymer));
p.part("rim-middle", b(0,0,330,320,320,32).color(polymer));
p.part("rim-upper", b(0,0,475,290,290,32).color(polymer));
p.part("center-spacer", c(0,0,35,575,30,10).color(polymer));

return p.model();
