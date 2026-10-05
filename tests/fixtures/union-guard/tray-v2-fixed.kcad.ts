// Corrected aluminium tray (counterpart of tray-v1-broken.kcad.ts).
// Fabrication rules applied:
//   - cross tubes are cut to fit BETWEEN the side rails: length = width - 2*tube,
//     placed at x = tube (butt joints, end faces touch the rails, no overlap);
//   - the first and last cross tubes sit inside the frame, touching (not
//     inside) the front and back rails;
//   - every tube sits on z = 0 and the sheet rests on top of the tubes (z = tube).
// Members touch but never share volume, so the single union() is one solid.
const width = param('width', 1080, {min:900,max:1300,description:'Overall X size, mm'});
const depth = param('depth', 1100, {min:900,max:1300,description:'Overall Y size, mm'});
const sheetT = param('sheetThickness', 3, {min:2,max:5,description:'Aluminium sheet thickness, mm'});
const tube = param('tubeOuter', 30, {min:25,max:40,description:'Square tube outside size, mm'});
const wall = param('tubeWall', 2, {min:1.5,max:3,description:'Square tube wall thickness, mm'});
const endInset = param('supportEndInset', 30, {min:30,max:100,description:'First/last cross tube inset along Y (>= tube), mm'});
const sheetLift = 0; // gap between tube tops and sheet underside; must stay 0
const inner = tube.subtract(wall.multiply(2));
function tubeX(len) {
  return box(len, tube, tube).subtract(box(len.add(2), inner, inner).translate(-1, wall, wall));
}
function tubeY(len) {
  return box(tube, len, tube).subtract(box(inner, len.add(2), inner).translate(wall, -1, wall));
}
const crossLen = width.subtract(tube.multiply(2));   // fits between the side rails
const sideLen = depth.subtract(tube.multiply(2));    // fits between front and back rails
const sheet = box(width, depth, sheetT).translate(0, 0, tube.add(sheetLift)).finish('aluminium-brushed');
const front = tubeX(width).finish('aluminium-brushed');
const back = tubeX(width).translate(0, depth.subtract(tube), 0).finish('aluminium-brushed');
const left = tubeY(sideLen).translate(0, tube, 0).finish('aluminium-brushed');
const right = tubeY(sideLen).translate(width.subtract(tube), tube, 0).finish('aluminium-brushed');
// First cross tube at y = endInset, last one ends at depth - endInset.
const pitch = depth.subtract(endInset.multiply(2)).subtract(tube).divide(4);
const s1 = tubeX(crossLen).translate(tube, endInset, 0).finish('aluminium-brushed');
const s2 = tubeX(crossLen).translate(tube, endInset.add(pitch), 0).finish('aluminium-brushed');
const s3 = tubeX(crossLen).translate(tube, endInset.add(pitch.multiply(2)), 0).finish('aluminium-brushed');
const s4 = tubeX(crossLen).translate(tube, endInset.add(pitch.multiply(3)), 0).finish('aluminium-brushed');
const s5 = tubeX(crossLen).translate(tube, endInset.add(pitch.multiply(4)), 0).finish('aluminium-brushed');
setRenderEnvironment({preset:'studio',intensity:1.1});
setCameraTarget(540,550,20);
return union(sheet,front,back,left,right,s1,s2,s3,s4,s5);
