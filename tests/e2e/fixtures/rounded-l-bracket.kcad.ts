const armLength = 30;
const armWidth = 10;
const cornerRadius = 5;
const thickness = 5;

return path()
  .moveTo(0, 0)
  .lineTo(armLength, 0)
  .lineTo(armLength, armWidth)
  .tangentArc(armWidth + cornerRadius, armWidth + cornerRadius)
  .lineTo(armWidth, armLength)
  .lineTo(0, armLength)
  .close()
  .extrude(thickness);
