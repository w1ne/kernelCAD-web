const armLength = param('ArmLength', 20, { unit: 'mm', min: 10, max: 50 });
const armWidth = param('ArmWidth', 10, { unit: 'mm', min: 5, max: 25 });
const thickness = param('Thickness', 5, { unit: 'mm', min: 2, max: 15 });

return path()
  .moveTo(0, 0)
  .lineTo(armLength, 0)
  .lineTo(armLength, armWidth)
  .lineTo(armWidth, armWidth)
  .lineTo(armWidth, armLength)
  .lineTo(0, armLength)
  .close()
  .extrude(thickness);
