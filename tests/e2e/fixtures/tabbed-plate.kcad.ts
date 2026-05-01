const length = param('Length', 30, { unit: 'mm', min: 10, max: 100 });
const width = param('Width', 20, { unit: 'mm', min: 10, max: 60 });
const tabSize = param('TabSize', 5, { unit: 'mm', min: 1, max: 15 });
const thickness = param('Thickness', 5, { unit: 'mm', min: 1, max: 15 });
const filletRadius = param('FilletRadius', 1, { unit: 'mm', min: 0.5, max: 3 });

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
