---
title: Ten problems that slow down mechanical design, and what fixes them
summary: Late manufacturing feedback, lost design intent, unclear revisions, wrong fasteners and six more. Why each one happens, what to do about it in any CAD tool, and what kernelCAD checks for you.
date: 2026-11-01
kind: guide
status: draft
model: examples/gallery/cover-plate-pocket.kcad.ts
---

Most delays in mechanical design are not caused by hard engineering. They
come from small things found late: a corner the shop can't cut, a hole sized
from the wrong column of a table, a drawing that still shows last week's
part. Each one is cheap to fix on screen and expensive to fix in metal.

How expensive? In one case study of a handheld device, every engineering
change to an injection mould cost about $5,000. The two cover tools needed
three changes each, $30,000 in total, and the launch slipped by four weeks
([Bhargava, *Plastics Engineering*, October 2016](https://read.nxtbook.com/wiley/plasticsengineering/october2016/productdesign_eyeopeningimpact.html)).
None of those changes needed new engineering. They fixed errors that could
have been caught in CAD.

Below are ten problems we see most often. For each one: why it happens, what
helps in any CAD tool, and what kernelCAD does about it. kernelCAD keeps
every model as an editable `.kcad.ts` source file and runs checks on the
evaluated geometry, so a check can run on every change instead of once at a
design review.

## 1. Manufacturing feedback arrives too late

**Why it happens.** Manufacturability is usually checked after the model is
finished, often by the supplier when they quote it. By then a small fix
means a new revision, a new quote and a lost week.

**What helps.** Check for the process while you design, and know the two or
three rules that cause most rejections. For 3-axis milling, the biggest one
is internal corners: a round end mill cannot cut a corner sharper than its
own radius.

**In kernelCAD.** The MCP `dfm_review` tool checks a part for 3D printing
(FDM) and 3-axis CNC milling. For FDM it checks overhangs, bridges, wall
thickness, hole and pin size, and bed fit. For CNC it checks undercuts and
internal corner radii against the end mill you name.

Here is a real run. This 80 × 50 × 12 mm aluminium cover plate has a
60 × 34 × 8 mm pocket with square corners:

![Cover plate with a rectangular pocket with sharp vertical corners](design-engineer-challenges/cover-plate-sharp.png "Before: the pocket has four sharp vertical corners.")

```json
{ "code": "…", "processes": ["cnc"], "tool_diameter_mm": 6 }
```

The review fails:

```text
cnc.internal-corner-radius  fail
4 sharp internal corner(s) (radius 0) below the R3 mm tool radius
(Ø6 mm end mill); add fillets ≥ R3 mm or use a smaller tool.
```

It also reports where each corner is: four 8 mm vertical edges at
(10, 8), (70, 8), (10, 42) and (70, 42). One line fixes it. Round the
pocket's vertical edges to R4, slightly larger than the tool radius so the
cutter doesn't have to stop in the corner:

```ts
pocket = pocket.fillet(4, { parallel: [0, 0, 1] });
```

![The same cover plate with R4 rounded pocket corners](design-engineer-challenges/cover-plate-r4.png "After: R4 pocket corners clear a 6 mm end mill.")

The review now passes: "All internal corners along the approach axes are
≥ R3 mm." The full model is in
`examples/gallery/cover-plate-pocket.kcad.ts`; set `pocketCornerR = 0` to
reproduce the failure.

<!-- check: source contains pocketCornerR = 4 -->

## 2. Design intent gets lost

**Why it happens.** A dimension in a feature tree doesn't say why it has
that value. When someone else edits the part, a 40 mm hole spacing chosen
to match a mating bracket looks like any other number, and gets changed.

**What helps.** Name the values that matter, keep them in one place and
say where they come from. Derive the other values from them instead of
typing them again.

**In kernelCAD.** A `.kcad.ts` file is ordinary code, so the reason sits
next to the value. In the cover plate, `pocketCornerR = 4` carries the
comment "> R3 of a 6 mm end mill", and the pocket position is computed from
the plate and pocket sizes. Change the plate width and the pocket stays
centred.

## 3. Nobody is sure which revision is current

**Why it happens.** CAD files are binary and hard to compare. Two files
called `bracket_v3_final.step` and `bracket_v3_final2.step` tell you nothing
about what changed or why.

**What helps.** Keep one source of truth under version control, with a
message for each change. Compare revisions by their geometry, not by file
name.

**In kernelCAD.** Source files work with git, so a revision is a commit
with a text diff and a message. For the geometry, `diff_geometry` reports
how much material was added and removed, the largest surface deviation, and
whether a body moved, was resized or changed shape. With `render: true` it
draws added material in green and removed material in red. `diff_scripts`
does the same for whole assemblies: parts added, removed or changed, and
changes in interference, mates and parameters.

## 4. Fasteners and holes don't match

**Why it happens.** Clearance holes, counterbores and countersinks are sized
from tables by hand, and the screw length is chosen separately. One wrong
column and the screw doesn't fit, the head sits proud, or the screw bottoms
out.

**What helps.** Size the hole, the seat and the screw from one fastener
table, and work out the screw length from the actual grip.

**In kernelCAD.** `lib.insert` reads the holes a part already has and
matches each bore against the ISO 273 close, normal and loose clearance
sizes. It then cuts the seat the head needs: a 90° countersink for a
flat head, or a counterbore when you ask for one. For a bolted joint,
`lib.stack` picks the shortest stocked bolt that passes through the grip,
washers and nut and still shows two thread pitches past the nut: for an M5
through a 12 mm grip that is M5 × 25, because M5 × 20 is 0.3 mm short. A grip that no stocked length can reach is
refused, not rounded. The screws are modelled as simple envelope shapes, so
this checks fit, not thread strength. See
[Fasten a part from its holes with lib.insert](hole-driven-fastening.md) and
[Bolted joints from one fastener table](standard-parts-library.md).

## 5. Drawings fall out of sync with the model

**Why it happens.** The 3D model changes, but the 2D drawing is a separate
document that someone has to update. The shop builds from whichever one
they were sent.

**What helps.** Treat the drawing as an output of the model, not a second
document, and regenerate it every time the model changes.

**In kernelCAD.** Dimensions declared in the model are shown in the 3D view,
and the Drawing (PDF) download builds an A3 sheet from the model when you
click it. The MCP `export` tool produces the same drawing from a fresh run
of the script. See [Download a drawing in one click](drafting-review.md).

## 6. Assemblies only fail once they are built

**Why it happens.** Parts are checked one at a time. Whether they can be put
together, or taken apart for service, is often found out on the bench. The
same goes for fits that work at nominal size and fail at the edge of
tolerance.

**What helps.** Check assembly order and access before you release
drawings, and check what happens to a fit across its whole tolerance range,
not only at nominal.

**In kernelCAD.** The `verify` tool's `assembly-path` check tests whether
each part can slide out along a straight line. It can return a removal order
or a build sequence, and it lists the parts that block each other. Parts it
can't prove removable are marked blocked or unknown, never "impossible".
`sweep_tolerance` re-evaluates the model across a range of parameter values
and finds the value where a requirement starts to fail, for example "wall
fails below 1.840 mm". For rigid lines, `tube()` reports the minimum
clearance and a bend table for each tube. You place the corners yourself.
See [Routing bent tubes between ports](tubes-how-to.md).

## 7. Small geometry defects break later steps

**Why it happens.** Tiny faces, very short edges and parts that are almost
symmetric but not quite come from imports and repeated edits. They can't be
seen on screen, but they break meshing, simulation and CAM later.

**What helps.** Measure the model instead of looking at it, especially
after an import or a long chain of edits.

**In kernelCAD.** The `verify` tool's `geometry-quality` check lists tiny
faces and short edges with their size and location. It can also test
mirror symmetry about a plane you specify. It is an explicit check: run it
before you send a model on, for example after importing a STEP file. See
[Check tiny faces, short edges and mirror symmetry](geometry-quality.md).

## 8. Vendor parts are re-modelled by hand

**Why it happens.** Motors, bearings and connectors are drawn as rough boxes
to save time. Then the real part turns out to be bigger, or its mounting
holes are somewhere else.

**What helps.** Use the supplier's model from the start, or at least before
release. A placeholder is fine for the first layout if it is labelled as one.

**In kernelCAD.** `lib.fromSTEP(...)` brings a supplier's STEP file into
the model as a normal shape, converted to millimetres. Use `{ solid }` to
pick one body from a file that has several. The standard parts library
provides fasteners and fixture parts with catalogue dimensions.

## 9. Reviews happen in screenshots and email

**Why it happens.** Feedback on a 3D part usually arrives as a screenshot
with a red circle. The person fixing it has to work out which face was
meant, seen from which angle.

**What helps.** Comment on the model itself, so every note is attached to a
specific face, edge or measurement.

**In kernelCAD.** A Studio markup snapshot saves the camera view, the faces
and edges you picked, the measurements you took and your notes. It is sent
along with the next request to the agent. It doesn't change the model, and
face ids can change after a rebuild, so a snapshot belongs to the revision it
was made on. See [Studio markup snapshots](studio-markup-snapshot.md).

## 10. Cost is unknown until a quote comes back

**Why it happens.** Cost depends on material, process, quantity and
geometry, and the designer rarely sees a number until procurement asks for
quotes. By then the design is fixed.

**What helps.** Know which features drive cost for your process, such as
tight internal corners, deep pockets, extra setups and long print supports,
and get a number while the design can still change.

**In kernelCAD.** The manufacturability checks in section 1 catch the
features that drive cost before a quote is requested. `inspect({ of: 'bom' })`
and `export({ format: 'bom-csv' })` list every part with its quantity,
material and mass, and whether it is made or bought. The hosted service can
ask suppliers for a price on a part. When no verified supplier price
matches, as happened for the cover plate above, it says so and doesn't
guess.

## What the ten have in common

Each problem comes from information that a person checks late instead of a
tool checking it early. A model kept as source with named values can be
checked on every change: whether the shop can make it, whether the parts
fit and come apart, whether the fasteners match their holes, and whether the
drawing matches the model.

These checks don't replace an engineer's judgement or a supplier's review.
They make sure the review starts with the obvious problems already gone.

To try it, connect kernelCAD to ChatGPT or Claude from the
[connect guide](https://app.kernelcad.com/connect), or run it locally:

```bash
npx -y kernelcad mcp
```
