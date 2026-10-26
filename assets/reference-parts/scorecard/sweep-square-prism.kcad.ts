const profile = path()
  .moveTo(-2, -2)
  .lineTo(2, -2)
  .lineTo(2, 2)
  .lineTo(-2, 2)
  .close();
return profile.sweep([[0, 0, 0], [0, 0, 30]]);
