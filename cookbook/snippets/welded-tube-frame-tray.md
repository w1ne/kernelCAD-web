---
id: welded-tube-frame-tray
title: Welded tube frame with a sheet on top — butt-jointed members in one union
tags: [union, tube, plate, parameter, material, manufacturing]
keywords:
  - welded square tube frame
  - aluminium tray with cross supports
  - weldment rack frame cross members between rails
  - sheet on top of tubes
  - butt joint member cut to length
  - frame members must not overlap
  - union.member-overlap
  - union.disconnected
when_to_use: >-
  A frame, rack, tray, table base or weldment built from tube / bar
  members, optionally with a sheet or deck on top. Members are cut to fit
  BETWEEN each other (butt joints) so they touch but never overlap, and the
  sheet sits on the tubes. Use one union() when the frame is one welded
  body; use assembly().part() per member when members are separate BOM
  lines.
---

Fabrication rules this snippet encodes:

- A cross member between two side rails is `width - 2 * tube` long and
  starts at `x = tube`: its end faces sit on the rails' inner faces.
- Side rails between the front and back rails are `depth - 2 * tube`.
- The first and last cross members sit inside the frame (`y >= tube`,
  `y + tube <= depth - tube`), next to the front/back rails, not inside them.
- All tubes stand on `z = 0`; the sheet underside is at `z = tube`.

`evaluate_script` gates every `union()`: `union.member-overlap` (error)
names two separately finished members that share more than 1 mm³ — a cross
tube run into a rail — and `union.disconnected` (error) names an operand
that floats, with its gap. Fix the member length or position; never hide it
by dropping the finishes.

For separate parts instead of a weldment, wrap each member in
`assembly().part(name, member)`; the same lengths apply.

```typescript
const width = param('width', 1080, {min:900,max:1300,description:'Overall X size, mm'});
const depth = param('depth', 1100, {min:900,max:1300,description:'Overall Y size, mm'});
const sheetT = param('sheetThickness', 3, {min:2,max:5,description:'Aluminium sheet thickness, mm'});
const tube = param('tubeOuter', 30, {min:25,max:40,description:'Square tube outside size, mm'});
const wall = param('tubeWall', 2, {min:1.5,max:3,description:'Square tube wall thickness, mm'});
const endInset = param('supportEndInset', 30, {min:30,max:100,description:'First/last cross tube inset along Y (>= tube), mm'});
const inner = tube.subtract(wall.multiply(2));
function tubeX(len) {
  return box(len, tube, tube).subtract(box(len.add(2), inner, inner).translate(-1, wall, wall));
}
function tubeY(len) {
  return box(tube, len, tube).subtract(box(inner, len.add(2), inner).translate(wall, -1, wall));
}
const crossLen = width.subtract(tube.multiply(2));   // fits between the side rails
const sideLen = depth.subtract(tube.multiply(2));    // fits between front and back rails
const sheet = box(width, depth, sheetT).translate(0, 0, tube).finish('aluminium-brushed');
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
return union(sheet,front,back,left,right,s1,s2,s3,s4,s5);
```
