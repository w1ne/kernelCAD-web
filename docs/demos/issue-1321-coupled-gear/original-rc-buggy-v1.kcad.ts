// Parametric RC buggy 2WD, mechanically mated prototype; all coordinates mm (Z up).
// 4:1 external involute spur transmission. Live rear axle; two independent
// front steering actuators share the steer command. Components are envelopes.
const steerDeg=param('steerDeg',0,{min:-25,max:25,description:'Steer command, degrees'});
const motorDeg=param('motorDeg',0,{min:-720,max:720,description:'Motor shaft rotation, degrees'});
const XR=-91,XF=91,YW=95,YP=58,Z=39,ZT=68;
const MODULE=1,SMALL=12,LARGE=48,XM=XR+MODULE*(SMALL+LARGE)/2;
const RATIO=-SMALL/LARGE;
const ax=(xyz,v)=>({type:'axis',origin:{kind:'vec3',value:xyz},axis:v,jointClearanceRadius:3.65});
const fr=(xyz)=>({type:'frame',origin:{kind:'vec3',value:xyz}});
let frame=extrudeRoundedRect(232,124,10,6).translate(0,0,ZT);
for (const side of [-1,1]) {
 frame=frame.union(box(14,12,42).translate(XR-7,side*53-6,28));
 frame=frame.union(cylinder(18,7).translate(XF,side*YP,55));
}
// Motor case rests against the underside of a bridge; its output shaft runs
// through a bored, structural chassis journal at Y=24.
frame=frame.union(box(12,30,20).translate(XM-6,-49,50));
frame=frame.union(box(15,10,44).translate(XM-7.5,19,27));
frame=frame.subtract(cylinder(220,3.6).rotateX(90).translate(XR,110,Z));
frame=frame.subtract(cylinder(16,3.55).rotateX(90).translate(XM,32,Z));
for(const side of [-1,1]) frame=frame.subtract(cylinder(23,3.65).translate(XF,side*YP,53));
frame=frame.finish('anodized',{color:'#237f86'});

// Spur geometry is exact involute, not painted circles. Stagger tooth phases
// so the 48T tooth space faces the 12T tooth at the 30 mm pitch distance.
const axle=cylinder(220,3.25).rotateX(90).translate(XR,110,Z)
 .union(spurGear({module:MODULE,teeth:LARGE,faceWidth:7,bore:6,backlash:0.38})
    .rotateZ(180/LARGE).rotateX(90).translate(XR,13,Z)).finish('steel');
const drive=cylinder(52,3).rotateX(90).translate(XM,34,Z)
 .union(spurGear({module:MODULE,teeth:SMALL,faceWidth:7,bore:5.2,backlash:0.38})
    .rotateX(90).translate(XM,13,Z)).finish('steel');
// The fixed motor housing has a genuine 6.8 mm through bore for the rotor.
const housing=cylinder(38,11,64)
 .hole('top',{u:0,v:0,diameter:6.8,depth:'through'})
 .rotateX(90).translate(XM,-13,Z).finish('anodized-black');
function wheel(x,y){
 const tyre=path().moveTo(25,-12).lineTo(35,-12).lineTo(39,-10)
   .lineTo(39,10).lineTo(35,12).lineTo(25,12).close().revolve();
 const hub=cylinder(18,25.5,64).translate(0,0,-9)
   .hole('top',{u:0,v:0,diameter:7.2,depth:'through'});
 return tyre.union(hub).rotateX(90).translate(x,y,Z).finish('abs',{color:'#20282d'});
}
function frontUpright(side){
 return cylinder(31,3.3).translate(XF,side*YP,37)
  .union(cylinder(52,3.25).rotateX(side>0?-90:90).translate(XF,side*YP,Z))
  .union(box(23,6,6).translate(XF-21,side*YP-3,36))
  .finish('steel');
}
const car=assembly('RC buggy - mechanically constrained 2WD');
const base=car.part('chassis',frame,{material:'aluminum-6061'});
base.connector('rear-journal',ax([XR,53,Z],[0,1,0]));
base.connector('motor-journal',ax([XM,24,Z],[0,1,0]));
for(const side of [-1,1])base.connector('steer-'+(side>0?'left':'right'),ax([XF,side*YP,60],[0,0,1]));

const shaft=car.part('rear-live-axle',axle,{material:'mild-steel'});
shaft.connector('journal',ax([XR,53,Z],[0,1,0]));
for(const side of [-1,1]) shaft.connector('rear-hub-'+(side>0?'left':'right'),fr([XR,side*YW,Z]));
const input=car.part('motor-rotor',drive,{material:'mild-steel'});
input.connector('journal',ax([XM,24,Z],[0,1,0]));
const motor=car.part('motor-housing',housing,{material:'aluminum-6061'});
motor.connector('mount',fr([XM,-32,50]));
base.connector('motor-mount',fr([XM,-32,50]));
car.mate('motor-housing-fix','chassis.motor-mount','motor-housing.mount','fastened');
for(const side of [-1,1]){
 const label=side>0?'left':'right';
 const rear=car.part('rear-wheel-'+label,wheel(XR,side*YW),{material:'nylon'});
 rear.connector('hub',fr([XR,side*YW,Z]));
 car.mate('rear-wheel-'+label+'-fix','rear-live-axle.rear-hub-'+label,'rear-wheel-'+label+'.hub','fastened');
 const king=car.part('front-upright-'+label,frontUpright(side),{material:'mild-steel'});
 king.connector('pivot',ax([XF,side*YP,60],[0,0,1]));
 king.connector('spindle',ax([XF,side*YW,Z],[0,1,0]));
 const wheelPart=car.part('front-wheel-'+label,wheel(XF,side*YW),{material:'nylon'});
 wheelPart.connector('spindle',ax([XF,side*YW,Z],[0,1,0]));
 car.mate('front-wheel-'+label+'-spin','front-upright-'+label+'.spindle','front-wheel-'+label+'.spindle','revolute');
 car.mate('steer-'+label,'chassis.steer-'+label,'front-upright-'+label+'.pivot','revolute',
   {pose:steerDeg,limitsDeg:[-25,25]});
}
car.mate('rear-drive-output','chassis.rear-journal','rear-live-axle.journal','revolute',{limitsDeg:[-180,180]});
car.mate('motor-input','chassis.motor-journal','motor-rotor.journal','revolute',{pose:motorDeg,limitsDeg:[-720,720]});
car.coupleMates('rear-drive-output',{source:'motor-input',ratio:RATIO});
car.transmission('external-12-to-48-spur',{
 kind:'gear-pair',sourceMate:'motor-input',drivenMates:['rear-drive-output'],
 input:'motor-rotor',output:'rear-live-axle',path:['motor-rotor','rear-live-axle'],ratio:RATIO,
 notes:'1 mm module, 30 mm pitch centre distance, 4:1 reduction'
});
// Separate controller and battery mounting interfaces (stand-in size only).
function accessory(name,x,y,w,d,h,color){
 const pos=[x,y,74];
 const p=car.part(name,extrudeRoundedRect(w,d,3,h).translate(x,y,74).finish('abs',{color}),{material:'abs'});
 base.connector(name+'-seat',fr(pos));p.connector('seat',fr(pos));
 car.mate(name+'-fix','chassis.'+name+'-seat',name+'.seat','fastened');
}
accessory('battery-envelope',-4,0,77,37,19,'#e48a34');
accessory('ESC-envelope',-5,-42,33,27,14,'#1c2e39');
accessory('dual-steering-control-envelope',XF-35,0,26,21,23,'#31445d');
animationView({name:'steering and drivetrain motion',tracks:[
 {param:'steerDeg',keys:[{atMs:0,value:0},{atMs:1200,value:20},{atMs:2600,value:-20},{atMs:4000,value:0}]},
 {param:'motorDeg',keys:[{atMs:0,value:0},{atMs:4000,value:720}]}
],fps:18});
return car.solvedModel({});