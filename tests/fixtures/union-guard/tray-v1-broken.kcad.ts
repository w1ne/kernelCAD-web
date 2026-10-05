// Regression fixture: aluminium tray from ChatGPT (project iKbYOv6f v1), verbatim.
// Defects: cross tubes (1070 long from x=5) run 25 mm into both side rails;
// s5 sits inside the back rail (y 1070..1100). All returned as one union() of
// members finished with the same material, so it fails union.member-overlap.
// The sheet does NOT float: tubeZ = 40 - 3 - 30 = 7 is the tubes' bottom
// offset, so tubes span z 7..37 and the sheet z 37..40 (face contact).
const width = param('width', 1080, {min:900,max:1300,description:'Overall X size, mm'});
const depth = param('depth', 1100, {min:900,max:1300,description:'Overall Y size, mm'});
const overallHeight = param('overallHeight', 40, {min:30,max:60,description:'Overall assembled height, mm'});
const sheetT = param('sheetThickness', 3, {min:2,max:5,description:'Aluminium sheet thickness, mm'});
const tube = param('tubeOuter', 30, {min:25,max:40,description:'Square tube outside size, mm'});
const wall = param('tubeWall', 2, {min:1.5,max:3,description:'Square tube wall thickness, mm'});
const crossLen = param('crossSupportLength', 1070, {min:1000,max:1080,description:'Cross support length from sketch, mm'});
const endInset = param('supportEndInset', 30, {min:15,max:100,description:'First/last support inset along Y, mm'});
const tubeZ = overallHeight.subtract(sheetT).subtract(tube);
const inner = tube.subtract(wall.multiply(2));
function tubeX(len) {
  return box(len, tube, tube).subtract(box(len.add(2), inner, inner).translate(-1, wall, wall));
}
function tubeY(len) {
  return box(tube, len, tube).subtract(box(inner, len.add(2), inner).translate(wall, -1, wall));
}
const sheet = box(width, depth, sheetT).translate(0,0,overallHeight.subtract(sheetT)).finish('aluminium-brushed');
const front = tubeX(width).translate(0,0,tubeZ).finish('aluminium-brushed');
const back = tubeX(width).translate(0,depth.subtract(tube),tubeZ).finish('aluminium-brushed');
const left = tubeY(depth.subtract(tube.multiply(2))).translate(0,tube,tubeZ).finish('aluminium-brushed');
const right = tubeY(depth.subtract(tube.multiply(2))).translate(width.subtract(tube),tube,tubeZ).finish('aluminium-brushed');
const usable = depth.subtract(endInset.multiply(2));
const spacing = usable.divide(4);
const crossX = width.subtract(crossLen).divide(2);
const s1 = tubeX(crossLen).translate(crossX,endInset,tubeZ).finish('aluminium-brushed');
const s2 = tubeX(crossLen).translate(crossX,endInset.add(spacing),tubeZ).finish('aluminium-brushed');
const s3 = tubeX(crossLen).translate(crossX,endInset.add(spacing.multiply(2)),tubeZ).finish('aluminium-brushed');
const s4 = tubeX(crossLen).translate(crossX,endInset.add(spacing.multiply(3)),tubeZ).finish('aluminium-brushed');
const s5 = tubeX(crossLen).translate(crossX,depth.subtract(endInset),tubeZ).finish('aluminium-brushed');
setRenderEnvironment({preset:'studio',intensity:1.1});
setCameraTarget(540,550,20);
return union(sheet,front,back,left,right,s1,s2,s3,s4,s5);
