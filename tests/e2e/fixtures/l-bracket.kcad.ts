const armLength = 20;
const armWidth = 10;
const thickness = 5;

return path()
  .moveTo(0, 0)
  .lineTo(armLength, 0)
  .lineTo(armLength, armWidth)
  .lineTo(armWidth, armWidth)
  .lineTo(armWidth, armLength)
  .lineTo(0, armLength)
  .close()
  .extrude(thickness);
