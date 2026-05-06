const length = 30;
const width = 20;
const tabSize = 5;
const thickness = 5;
const filletRadius = 1;

// Rectangular plate with a tab sticking out on +x, vertically centered.
// The tab's outer face is labeled 'tab-side' and gets filleted via the label.
const tabY1 = (width - tabSize) / 2;
const tabY2 = (width + tabSize) / 2;
return path()
  .moveTo(0, 0)
  .lineTo(length, 0).label('bottom')
  .lineTo(length, tabY1)
  .lineTo(length + tabSize, tabY1)
  .lineTo(length + tabSize, tabY2).label('tab-side')
  .lineTo(length, tabY2)
  .lineTo(length, width)
  .lineTo(0, width)
  .close()
  .extrude(thickness)
  .fillet(filletRadius, { face: 'tab-side' });
