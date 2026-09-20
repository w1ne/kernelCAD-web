# vase_urn_classic (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a classic urn vase with a broad shoulder and an upright neck, featuring a smooth, continuous lofted shell and a hollow interior for aesthetic display.

## Geometry and Dimensions
Approx. 92.0 mm × 92.0 mm × 226.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Static aesthetic display, freestanding on a flat surface.

## Structural Features
Continuous lofted outer shell; hollow internal cavity; flat bottom base; upright neck.

## Special Requirements
The exported STEP must remain a closed, watertight solid shell to ensure proper slicing and 3D printability.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 226.0 (166.0 ~ 306.0 mm). Determines the overall vertical extent of the vase.
- **wall_thickness**: 2.8 (1.6 ~ 4.8 mm). Ensures structural integrity and printability of the hollow shell without excessive material use.
- **steps**: 16 (10.0 ~ 26.0). Controls the vertical resolution and discretization of the lofted profile layers.
- **profile_radius**: Variable (11.0 ~ 62.0 mm). Constrains the radial bounds of the spline profile to maintain the classic urn proportion.

## Component Details

### 1. vase_body
The primary and sole continuous entity of the model.
* **Component Purpose**: Acts as the main structural and aesthetic body, providing an internal cavity defined by the offset wall thickness.
* **Assembly Direction**: Not applicable (Standalone base component).
* **Connection & Kinematics**: Not applicable (Single continuous body).

---

## Component Assembly Graph (Textual)
vase_body -> Standalone | Joint: None | Note: Single continuous body requiring no assembly.
