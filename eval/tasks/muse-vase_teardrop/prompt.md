# vase_teardrop (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a teardrop-shaped vase with a high shoulder and a small opening, designed primarily for holding single stems and serving as an aesthetic decorative piece.

## Geometry and Dimensions
Approx. 96.0 mm × 96.0 mm × 220.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static decorative display; freestanding on a flat surface, supporting its own weight and lightweight single flower stems.

## Structural Features
Single hollow teardrop-shaped body; flat base floor; thin-walled continuous shell; small top opening.

## Special Requirements
The model must remain a closed, watertight solid shell to function properly as a vase. The lofted surfaces must maintain continuous G1/G2 transitions to ensure smooth slicing and printing.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 220.0 (160.0 ~ 300.0 mm). Controls the overall vertical dimension of the vase, constrained by standard 3D printer build volumes.
- **wall_thickness**: 2.5 (1.5 ~ 4.5 mm). Determines the shell thickness; the lower limit ensures printability and structural integrity, while the upper limit prevents excessive material use.
- **steps**: 16 (10.0 ~ 26.0). Defines the vertical resolution and the number of lofting sections used to generate the smooth or wavy profile.
- **profile_radius**: 48.0 (10.0 ~ 64.0 mm). Controls the maximum radial bulge of the teardrop profile to define the vase's volume and center of gravity.

## Component Details

### 1. vase_body
The main and only structural entity of the model.
* **Component Purpose**: Acts as the decorative outer shell and the functional container for stems.
* **Assembly Direction**: Not applicable (Standalone base component).
* **Connection & Kinematics**: Not applicable (Single solid body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single-piece continuous design requiring no assembly.
