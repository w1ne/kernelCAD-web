---
title: Ten problems that slow down mechanical design, and how a source-first workflow helps
summary: Late manufacturability feedback, lost design intent, revision confusion, fastener mistakes and more. What causes each one, and what kernelCAD checks instead of leaving it to review.
date: 2026-11-01
kind: guide
status: draft
---

Most delays in mechanical design are not caused by hard engineering. They
come from routine work done by hand: re-checking a hole size, re-drawing a
part after a change, hunting for the latest revision, or finding out from the
shop that a corner can't be machined. This post lists ten of the most common
problems, explains why each one happens, and shows what kernelCAD does about
it.

kernelCAD keeps every model as editable `.kcad.ts` source and runs checks on
the evaluated geometry. That choice is what makes most of the fixes below
possible: a check can run on every change, not only at a design review.

## 1. Manufacturing feedback arrives too late

**Why it happens.** Manufacturability is usually reviewed after the model is
done, often by the supplier when they quote it. A wall that is too thin or an
internal corner that is too sharp then costs a full redesign loop.

**What helps.** Run the review while you design. The MCP `dfm_review` tool
checks a model for the process you name, and the `verify` tool's
`edge-radius` check reports internal corners smaller than your tool radius.
Both point at the faces that fail, so you fix the feature, not guess at it.

## 2. Design intent gets lost

**Why it happens.** In a traditional feature tree, the reason behind a
dimension lives in the designer's head. When someone else edits the part, a
40 mm hole spacing that matched a mating bracket looks like any other number.

**What helps.** Name the parameter and write it down where the geometry is
made. In a `.kcad.ts` file the hole spacing is a named value with a comment,
and anything that depends on it reads that value. Change it once and every
dependent feature follows.

## 3. Nobody is sure which revision is current

**Why it happens.** Binary CAD files are hard to compare. Two files named
`bracket_v3_final.step` and `bracket_v3_final2.step` tell you nothing about
what changed.

**What helps.** Source files work with normal version control, so a revision
is a commit with a diff and a message. When you need to see the change in the
geometry, `diff_scripts` compares the source and `diff_geometry` shows which
faces were added, removed or moved.

## 4. Fasteners and holes don't match

**Why it happens.** Clearance holes, counterbores and countersinks are sized
from tables by hand, and the screw length is picked separately. One wrong
column in the table and the screw doesn't fit or bottoms out.

**What helps.** Let the fastener table size the joint. `lib.insert` reads the
bores a part already has, matches them to ISO 273 clearance sizes and cuts
the seat the fastener family needs. The standard parts library picks the
screw length for the stack. See
[Fasten a part from its holes with lib.insert](hole-driven-fastening.md) and
[Bolted joints from one fastener table](standard-parts-library.md).

## 5. Drawings fall out of sync with the model

**Why it happens.** The 3D model changes, but the 2D drawing is a separate
document that someone has to update. The shop builds from whichever one
they were sent.

**What helps.** Generate the drawing from the model each time. kernelCAD
shows the dimensions on the 3D view and downloads a dimensioned PDF in one
click, so the drawing always matches the current source. See
[Download a drawing in one click](drafting-review.md).

## 6. Assemblies only fail once they are built

**Why it happens.** Parts are checked one at a time. Whether they can be
assembled, or taken apart for service, is often found out on the bench.

**What helps.** Check the assembly as a whole. The `verify` tool's
`assembly-path` check tests whether each part can leave along a straight
line and proposes a disassembly order. `sweep_tolerance` shows how a fit
behaves across a tolerance range, and the tube router reports clearances and
bend tables for rigid lines. See
[Routing bent tubes between ports](tubes-how-to.md).

## 7. Small geometry defects break later steps

**Why it happens.** Tiny faces, very short edges and near-symmetric parts
that are not quite symmetric come from imports and repeated edits. They are
invisible on screen, then break meshing, simulation or CAM.

**What helps.** Measure them. The `geometry-quality` check lists tiny faces
and short edges with their locations and tests mirror symmetry against a
plane you assert. A model that fails the check is stopped before it reaches
a supplier.

## 8. Vendor parts are re-modeled by hand

**Why it happens.** Motors, bearings and connectors are drawn as rough boxes
to save time, and the real part turns out to be bigger, or its mounting holes
are in a different place.

**What helps.** Use the vendor's geometry. `lib.fromSTEP(...)` brings a
supplier's STEP file into the model, and the standard parts library supplies
fasteners and fixture components with their real dimensions. Placeholders are
fine for a first layout, as long as they are replaced before release.

## 9. Reviews happen in screenshots and email

**Why it happens.** Feedback on a 3D part is usually a screenshot with a red
circle. The person fixing it has to work out which face was meant and from
which angle.

**What helps.** Mark up the model itself. A Studio markup snapshot keeps the
camera, the notes, the picked faces and edges, and any measurements, and
sends them with the request for a change. Every saved model also has a share
link that opens in the browser. See
[Studio markup snapshots](studio-markup-snapshot.md).

## 10. Cost is unknown until a quote comes back

**Why it happens.** Cost depends on the material, the process and the
geometry, and the designer rarely sees it until procurement asks for quotes.
By then the design is fixed.

**What helps.** Check the cost while the design can still change. The hosted
kernelCAD tools can estimate the price of a part and produce a bill of
materials from the assembly, so a costly feature can be spotted and removed
early.

## The common thread

Each of these problems comes from information that is checked by a person,
late, instead of by a tool, early. A model kept as source with named
parameters can be checked on every change: its manufacturability, its fits,
its fasteners, its drawing and its geometry.

To try it, connect kernelCAD to ChatGPT or Claude from the
[connect guide](https://app.kernelcad.com/connect), or run it locally with
`npx -y kernelcad mcp`.
