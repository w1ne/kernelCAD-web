// SPDX-License-Identifier: CC0-1.0
// Cotton candy cart: the wheeled midway stand that spins candy floss to order.
// What makes it a cotton candy cart rather than any food cart: the wide
// stainless spinning bowl on the counter with its spinner head and a pink
// floss cloud inside, ringed by a clear bubble shield; a cone holder beside
// it; bagged floss hanging along the side rail; and the striped umbrella on a
// mast over the whole thing. Underneath is a rounded powder-coated cabinet
// with a sign panel and bottom shelf, two big spoked wheels at one end, legs
// at the other and a bent push handle.
// Generic visualization geometry at about real size (about 1.4 m long,
// 0.75 m wide, 2.4 m to the umbrella finial), millimetres, Z up, wheels
// toward -X, standing on z = 0.
meta({
  name: "cotton-candy-cart",
  license: "CC0-1.0",
  title: "Cotton candy cart",
  description: "Midway cotton candy cart at about real size: wide stainless spinning bowl with spinner head and floss cloud inside a clear bubble shield, cone holder, bagged floss on a side rail, striped eight-gore umbrella on a mast, rounded powder-coated cabinet with sign panel and bottom shelf, two spoked wheels, legs and a bent push handle. Material controls: powder coat, stainless steel, acrylic shield, candy floss, umbrella canvas, tyre rubber. Festival, twilight and pastel presets.",
  tags: ["cotton candy", "candy floss", "fairy floss", "concession cart", "food cart", "amusement park", "theme park", "midway", "low poly", "CC0", "food and beverage"],
  kit: "amusement-park",
  category: "prop",
  origin: "base",
  compat: ["amusement-park", "theme-park", "midway", "visitor-attraction"],
  triangleBudget: 4600,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const powderCoat = param("powderCoat", "#3f8fb0", { label: "Powder-coated cabinet" });
const stainlessSteel = param("stainlessSteel", "#c9d0d2", { label: "Stainless bowl, counter and handle" });
const acrylic = param("acrylic", "#bfe6ee", { label: "Clear acrylic bubble shield" });
const candy = param("candy", "#f08ab8", { label: "Candy floss and umbrella stripe" });
const canvas = param("canvas", "#f6f2ea", { label: "Umbrella canvas" });
const rubber = param("rubber", "#26292c", { label: "Tyre rubber" });

presets({
  festival: { powderCoat: "#d47452", stainlessSteel: "#d1d1c6", acrylic: "#79c8d2", candy: "#e25a9a" },
  twilight: { powderCoat: "#35576f", stainlessSteel: "#788b91", acrylic: "#41768b", candy: "#b77ad8", canvas: "#2c2f45" },
  pastel: { powderCoat: "#f3c8d8", candy: "#8fd0f0", canvas: "#fff7e0" },
});

const p = assembly("cotton-candy-cart");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const rr = (l: number, w: number, r: number) =>
  filletPolygon([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], r, { segments: 6 });
const plan = (pts, z0: number, h: number) => extrudePolygon(pts, h).translate(0, 0, z0);
const side = (pts, t: number, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Cabinet: rounded body, bottom shelf, overhanging stainless counter, sign panel.
add("cabinet", plan(rr(1100, 640, 120), 330, 700).color(powderCoat));
add("bottom-shelf", plan(rr(1160, 700, 130), 260, 40).color(stainlessSteel));
add("counter", plan(rr(1240, 760, 150), 1030, 40).color(stainlessSteel));
add("counter-edge", plan(rr(1250, 770, 150), 1010, 20).color(powderCoat));
for (const s of [-1, 1]) {
  add(`sign-panel-${s > 0 ? "left" : "right"}`, side(filletPolygon([[-380, 470], [380, 470], [380, 900], [-380, 900]], 60), 14, s * 327 - 7).color(candy));
  add(`sign-star-${s > 0 ? "left" : "right"}`,
    side(Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? 50 : 120;
      const a = (Math.PI * i) / 5 + Math.PI / 2;
      return [r * Math.cos(a), 685 + r * Math.sin(a)];
    }), 10, s * 337 - 5).color(canvas));
}

// Two spoked wheels at -X, legs at +X, bent push handle at -X.
for (const s of [-1, 1]) {
  const wy = s * 380;
  const wheelAt = (shape) => shape.rotateX(90).translate(-380, wy, 300);
  add(`tyre-${s > 0 ? "left" : "right"}`, wheelAt(turned([[250, -30], [290, -30], [300, 0], [290, 30], [250, 30]])).color(rubber));
  add(`rim-${s > 0 ? "left" : "right"}`, wheelAt(turned([[240, -22], [256, -22], [256, 22], [240, 22]])).color(powderCoat));
  add(`hub-${s > 0 ? "left" : "right"}`, wheelAt(turned([[0, -40], [45, -40], [45, 40], [0, 40]])).color(stainlessSteel));
  for (let i = 0; i < 6; i++) {
    add(`spoke-${s > 0 ? "l" : "r"}-${i}`, box(480, 14, 14, true).rotateZ(i * 30).rotateX(90).translate(-380, wy, 300).color(stainlessSteel));
  }
  add(`leg-${s > 0 ? "left" : "right"}`, turned([[0, 0], [28, 0], [28, 330], [0, 330]]).translate(460, s * 250, 0).color(stainlessSteel));
  add(`leg-foot-${s > 0 ? "left" : "right"}`, turned([[0, 0], [45, 0], [35, 30], [0, 30]]).translate(460, s * 250, 0).color(rubber));
}
add("axle", turned([[0, -400], [18, -400], [18, 400], [0, 400]]).rotateX(90).translate(-380, 0, 300).color(stainlessSteel));
const handle = [[-560, 900], [-700, 960], [-760, 1080]];
for (const s of [-1, 1]) {
  for (let i = 0; i < handle.length - 1; i++) {
    const [ax, az] = handle[i];
    const [bx, bz] = handle[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const tilt = (Math.atan2(bx - ax, bz - az) * 180) / Math.PI;
    add(`handle-arm-${s > 0 ? "l" : "r"}-${i}`, turned([[0, 0], [18, 0], [18, len], [0, len]]).rotateY(tilt).translate(ax, s * 260, az).color(stainlessSteel));
  }
}
add("handle-grip", turned([[0, -300], [26, -300], [26, 300], [0, 300]]).rotateX(90).translate(-760, 0, 1080).color(rubber));

// Spinning bowl, spinner head, floss cloud and the bubble shield.
const BX = 120;
add("machine-base", turned([[0, 0], [160, 0], [140, 160], [0, 160]]).translate(BX, 0, 1070).color(stainlessSteel));
add("bowl", turned([[0, 0], [230, 0], [290, 50], [315, 200], [332, 215], [324, 232], [300, 212], [278, 65], [0, 30]]).translate(BX, 0, 1180).color(stainlessSteel));
add("spinner-head", turned([[0, 0], [70, 0], [80, 60], [50, 90], [0, 90]]).translate(BX, 0, 1220).color(stainlessSteel));
add("floss-cloud", sphere(240).scale([1, 1, 0.8]).translate(BX, 0, 1560).color(candy));
add("bubble-shield", turned([[318, 0], [334, 0], [352, 120], [326, 200], [310, 200], [336, 120]]).translate(BX, 0, 1400).color(acrylic));

// Cone holder beside the bowl, and bagged floss along the side rail.
add("cone-holder", turned([[0, 0], [75, 0], [75, 150], [0, 150]]).translate(-330, 170, 1070).color(powderCoat));
for (const [dx, dy] of [[-20, -20], [25, -10], [0, 25]]) {
  add(`paper-cone-${dx}-${dy}`, turned([[0, 0], [10, 0], [26, 260], [0, 260]]).translate(-330 + dx, 170 + dy, 1100).color(canvas));
}
add("bag-rail", turned([[0, -560], [14, -560], [14, 560], [0, 560]]).rotateY(90).translate(0, -400, 1000).color(stainlessSteel));
for (let i = 0; i < 5; i++) {
  const x = -400 + i * 200;
  add(`floss-bag-${i}`, side(filletPolygon([[-70, 980], [70, 980], [85, 820], [80, 640], [-80, 640], [-85, 820]], 25), 80, -420).translate(x, 0, 0).color([candy, acrylic][i % 2]));
  add(`bag-tie-${i}`, box(40, 90, 30, true).translate(x, -420, 990).color(canvas));
}

// Striped eight-gore umbrella on a mast, with a finial.
const MX = 520;
add("mast", turned([[0, 0], [22, 0], [22, 2180], [0, 2180]]).translate(MX, 0, 300).color(stainlessSteel));
const canopyShell = turned([[0, 2380], [40, 2380], [950, 2090], [960, 2040], [930, 2060], [0, 2340]]);
for (let g = 0; g < 8; g++) {
  const a0 = (Math.PI * 2 * g) / 8;
  const a1 = (Math.PI * 2 * (g + 1)) / 8;
  const wedge = extrudePolygon([[0, 0], [1200 * Math.cos(a0), 1200 * Math.sin(a0)], [1200 * Math.cos(a1), 1200 * Math.sin(a1)]], 600).translate(0, 0, 1950);
  add(`umbrella-gore-${g}`, canopyShell.intersect(wedge).translate(MX, 0, 0).color([candy, canvas][g % 2]));
}
add("finial", sphere(40).translate(MX, 0, 2410).color(candy));

return p.model();
