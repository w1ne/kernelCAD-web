const profileSize = 2;
const length = 50;

// Square-profile pipe along a straight Z rail.
const profile = path()
  .moveTo(-profileSize / 2, -profileSize / 2)
  .lineTo(profileSize / 2, -profileSize / 2)
  .lineTo(profileSize / 2, profileSize / 2)
  .lineTo(-profileSize / 2, profileSize / 2)
  .close();

return profile.sweep([[0, 0, 0], [0, 0, length]]);
