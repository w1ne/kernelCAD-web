// Turned shoulder spacer, mm. The 8.5 mm through bore clears an 8 mm bolt;
// the 30 mm flange is 3 mm thick; the body is 20 mm diameter and 25 mm long.
// Check required bore fit, bearing face finish and edge breaks with the shop.
const length = param('length', 25, { min: 8, max: 60 });
return path()
  .moveTo(4.25, 0).lineTo(15, 0).lineTo(15, 3)
  .lineTo(10, 3).lineTo(10, length).lineTo(4.25, length)
  .close().revolve();
