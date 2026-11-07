// SPDX-License-Identifier: CC0-1.0
// Nutrient measuring cylinder: Bench measuring vessel with a broad foot, graduated-band ridges and a pouring lip. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "nutrient-measuring-cylinder",
  license: 'CC0-1.0',
  title: "Nutrient measuring cylinder",
  description: "Bench measuring vessel with a broad foot, graduated-band ridges and a pouring lip. Parameters: overall scale, powder-coated steel, stainless steel, polymer; weathered and highVisibility presets.",
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
const c=(x:number,y:number,z:number,h:number,r:number,s:number)=>loftCylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("nutrient-measuring-cylinder");
p.part("base-foot", b(0,0,0,290,290,50).color(powderCoatedSteel));
p.part("pouring-lip", b(85,0,600,110,80,40).color(polymer));
p.part("mark-low", b(0,-125,180,170,18,18).color(polymer));
p.part("mark-mid-low", b(0,-125,290,170,18,18).color(polymer));
p.part("mark-mid", b(0,-125,400,170,18,18).color(polymer));
p.part("mark-mid-high", b(0,-125,510,170,18,18).color(polymer));
p.part("vessel", c(0,0,50,570,100,10).color(polymer));
p.part("rim", c(0,0,620,34,122,10).color(polymer));
p.part("spout-tip", c(112,0,585,85,25,10).color(stainlessSteel));

return p.model();
