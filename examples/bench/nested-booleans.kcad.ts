// Pin standing in a blind bore: the bore stops at z = 3 and the pin stands on
// its floor (top still at z = 20). With a through bore the pin floated in the
// hole, 1.46 mm from the wall (union.disconnected).
return box(30, 30, 10).subtract(cylinder(8, 5).translate(15, 15, 3)).union(box(5, 5, 17).translate(12.5, 12.5, 3));
