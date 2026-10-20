const bottom = path()
  .moveTo(-10, -10)
  .lineTo(10, -10)
  .lineTo(10, 10)
  .lineTo(-10, 10)
  .close();
const top = path()
  .moveTo(-6, -6)
  .lineTo(6, -6)
  .lineTo(6, 6)
  .lineTo(-6, 6)
  .close();
return bottom.loft(top, { spacing: 10 });
