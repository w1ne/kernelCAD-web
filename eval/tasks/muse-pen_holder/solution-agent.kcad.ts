// MUSE 'pen_holder' — cylindrical desktop pen cup, PLA, 3D printed.
// Single solid: outer cylinder minus inner cavity, leaving a uniform
// 3 mm wall and 3 mm base floor.

const H = 150;   // height_of_cylinder
const R = 50;    // radius_of_cylinder
const T = 3;     // wall and base thickness

const cup = cylinder(H, R).subtract(
  // Inner cavity: open at the top (extends past the rim), floor at z = T.
  cylinder(H - T + 1, R - T).translate(0, 0, T),
);

return cup.color('plate');
