const profileSize = param('ProfileSize', 2, { unit: 'mm', min: 0.5, max: 10 });
const length = param('Length', 50, { unit: 'mm', min: 5, max: 200 });

// Square-profile pipe along a straight Z rail.
const profile = path()
  .moveTo(-profileSize / 2, -profileSize / 2)
  .lineTo(profileSize / 2, -profileSize / 2)
  .lineTo(profileSize / 2, profileSize / 2)
  .lineTo(-profileSize / 2, profileSize / 2)
  .close();

return profile.sweep([[0, 0, 0], [0, 0, length]]);
