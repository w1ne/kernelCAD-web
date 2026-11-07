// SPDX-License-Identifier: CC0-1.0
// UV treatment chamber: Horizontal-looking treatment skid with a vertical chamber body, control box and paired pipe stubs. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "uv-treatment-chamber",
  license: 'CC0-1.0',
  title: "UV treatment chamber",
  description: "Horizontal-looking treatment skid with a vertical chamber body, control box and paired pipe stubs. Parameters: overall scale, powder-coated steel, pvc, polymer, instrument glass; weathered and highVisibility presets.",
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
const glass=param('glass','#51afc1',{label:'Instrument glass'});
presets({
  weathered: {powderCoatedSteel:'#69766e', pvc:'#b2bcae', polymer:'#b4b5aa', glass:'#548e98'},
  highVisibility: {powderCoatedSteel:'#e87832', pvc:'#ead789', polymer:'#f2c84b', glass:'#38c5dc'},
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

const p = assembly("uv-treatment-chamber");
p.part("skid-base", b(0,0,0,980,420,75).color(powderCoatedSteel));
p.part("control-box", b(-320,0,460,240,220,320).color(polymer));
p.part("service-door", b(-320,-116,500,180,18,170).color(polymer));
p.part("left-support", b(-140,0,75,55,55,370).color(powderCoatedSteel));
p.part("right-support", b(250,0,75,55,55,370).color(powderCoatedSteel));
p.part("pipe-left", b(-500,0,230,250,90,90).color(pvc));
p.part("pipe-right", b(500,0,230,250,90,90).color(pvc));
p.part("treatment-canister", c(80,0,130,590,145,10).color(polymer));
p.part("lamp-cap", c(80,0,720,95,95,10).color(glass));
p.part("sample-tap", c(400,-210,360,150,24,10).color(polymer));

return p.model();
