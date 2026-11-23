// Ground-grid test well: a shallow precast chamber that lets a technician
// inspect the buried ground-grid connection. What makes it a test well rather
// than a plain concrete block is the hollow box below a raised collar, a
// fastened removable cover, side conduit entries, and a clamped copper test
// terminal on the lid. Generic low-poly visualization geometry in millimetres,
// Z up; the selectable chamber depth is a scene-design choice, not a rating.
meta({
  name: "substation-ground-grid-test-well",
  license: "CC0-1.0",
  title: "Ground grid test well",
  description: "Substation ground-grid test well with a hollow precast chamber, raised collar, bolted access lid, side conduit entries, and a clamped copper test terminal. Choose the well depth and overall scale. Material controls: concrete, stainless steel, copper; weathered and maintenance presets.",
  tags: ["grid substation", "ground grid", "test well", "inspection chamber", "electrical infrastructure", "utility yard", "low poly", "CC0", "cable and grounding"],
  kit: "grid-substation",
  category: "prop",
  origin: "base",
  compat: ["grid-substation", "utility-substation", "electrical-infrastructure"],
  triangleBudget: 1800,
});

const scale = param("scale", 1, { label: "Overall scale", min: 0.65, max: 1.35, step: 0.05 });
const wellDepth = param("wellDepth", "480", { choices: ["360", "480", "620"], label: "Chamber depth (mm)" });
const depth = Number(wellDepth.value);
const concrete = param('concrete', '#92938b', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const copper = param('copper', '#b87545', { label: 'Copper' });
presets({
  weathered: { concrete: '#88887f', stainlessSteel: '#858f90', copper: '#9f704a' },
  maintenance: { concrete: '#c5c8bc', stainlessSteel: '#eef2ef', copper: '#e99a32' },
});
const p = assembly("substation-ground-grid-test-well");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const beveledPlate = (width: number, depth: number, thickness: number, cut: number) =>
  path().moveTo(-width / 2 + cut, -depth / 2).lineTo(width / 2 - cut, -depth / 2)
    .lineTo(width / 2, -depth / 2 + cut).lineTo(width / 2, depth / 2 - cut)
    .lineTo(width / 2 - cut, depth / 2).lineTo(-width / 2 + cut, depth / 2)
    .lineTo(-width / 2, depth / 2 - cut).lineTo(-width / 2, -depth / 2 + cut)
    .close().extrude(thickness);

// Hollow precast chamber: 50 mm concrete walls and a 40 mm floor.
const chamber = beveledPlate(650, 650, depth, 45).subtract(
  box(550, 550, depth + 4, true).translate(0, 0, 42 + (depth + 4) / 2),
);
add("inspection-chamber", chamber.color(concrete));

// Side sleeves show where the buried bonding conductors enter the chamber.
const conduitZ = depth * 0.48;
for (const side of [-1, 1]) {
  add(
    `ground-conduit-${side}`,
    cylinder(250, 32, 12).rotateY(side * 90).translate(side * 290, 0, conduitZ).color(stainlessSteel),
  );
  add(
    `conduit-entry-collar-${side}`,
    cylinder(22, 48, 12).rotateY(side * 90).translate(side * 326, 0, conduitZ).color(stainlessSteel),
  );
}

// Raised concrete collar around the inspection opening.
const collarZ = depth - 8;
const collar = beveledPlate(770, 770, 68, 50)
  .translate(0, 0, collarZ)
  .subtract(box(570, 570, 72, true).translate(0, 0, collarZ + 34));
add("concrete-access-collar", collar.color(concrete));

// Four inner ledges support a removable cover without closing the chamber.
for (const side of [-1, 1]) {
  add(`lid-seat-north-south-${side}`, box(540, 42, 18, true).translate(0, side * 258, depth + 3).color(stainlessSteel));
  add(`lid-seat-east-west-${side}`, box(42, 540, 18, true).translate(side * 258, 0, depth + 3).color(stainlessSteel));
}

// Beveled removable lid, eight fasteners, and a pair of low lift grips.
const lidTop = depth + 50;
add("removable-access-lid", beveledPlate(520, 520, 45, 36).translate(0, 0, depth + 5).color(stainlessSteel));
for (const x of [-215, 215]) for (const y of [-215, 215]) {
  add(`lid-fastener-${x}-${y}`, cylinder(10, 14, 8).translate(x, y, lidTop).color(stainlessSteel));
}
for (const x of [-155, 155]) {
  add(`lid-grip-foot-${x}`, cylinder(18, 12, 8).translate(x, -115, lidTop).color(stainlessSteel));
  add(`lid-grip-stem-${x}`, cylinder(36, 7, 8).translate(x, -115, lidTop + 18).color(stainlessSteel));
}
add("lid-grip-bar", cylinder(310, 7, 8).rotateY(90).translate(-155, -115, lidTop + 48).color(stainlessSteel));

// Raised copper terminal makes the ground-grid test connection legible above
// the service cover; the cross clamp shows where a test lead can attach.
add("test-terminal-foot", cylinder(22, 72, 12).translate(0, 0, lidTop).color(copper));
add("ground-test-riser", cylinder(138, 28, 10).translate(0, 0, lidTop + 22).color(copper));
add("test-terminal-clamp", box(130, 62, 32, true).translate(0, 0, lidTop + 164).color(copper));
for (const x of [-46, 46]) {
  add(`terminal-clamp-bolt-${x}`, cylinder(18, 13, 8).translate(x, 0, lidTop + 180).color(stainlessSteel));
}
add("bonding-bar", box(230, 28, 12, true).translate(0, 158, lidTop - 3).color(copper));

// A bolted inspection plate on the front face anchors the well visually to
// the concrete body; it is a generic marker, not an electrical label.
add("inspection-nameplate", box(210, 12, 105, true).translate(0, -329, depth * 0.56).color(stainlessSteel));
for (const x of [-82, 82]) for (const z of [-35, 35]) {
  add(`nameplate-fastener-${x}-${z}`, cylinder(9, 8, 8).rotateX(-90).translate(x, -338, depth * 0.56 + z).color(copper));
}

return p.model();
