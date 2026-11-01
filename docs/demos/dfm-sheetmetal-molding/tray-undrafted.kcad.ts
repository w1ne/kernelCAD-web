// Molded parts tray, first pass: 2 mm walls, but straight (undrafted) sides
// and a side snap window that neither mold half can release.
const outer = box(60, 40, 15);
const pocket = box(56, 36, 14).translate(2, 2, 2);
const window = box(10, 6, 4).translate(25, -1, 7);
return outer.subtract(pocket).subtract(window);
