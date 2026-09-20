# vase_gourd_tall (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a tall gourd vase with two rounded lobes and a restrained neck for aesthetic display and floral arrangements.

## Geometry and Dimensions
Approx. 84.0 mm × 84.0 mm × 236.0 mm.

## Material
PLA

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
Not applicable
## Mechanical Condition
Freestanding desktop decor, non-load-bearing aesthetic model.

## Structural Features
Closed bottom base; thin-walled double-lobed body; open top neck.

## Special Requirements
The exported STEP must remain a closed solid shell with uniform wall thickness to ensure printability.

## Planned Component Quantity
1

## Component Names
- vase_body

## Adjustable Parameters
- **height**: 236.0 (176.0 ~ 316.0 mm). Controls the overall vertical dimension of the vase.
- **wall_thickness**: 2.6 (1.5 ~ 4.6 mm). Determines the shell thickness, balancing material usage, print time, and structural rigidity.
- **steps**: 16 (10.0 ~ 26.0). Defines the vertical resolution and the number of lofting sections used to generate the smooth or wavy profile.
- **profile_radius**: 42.0 (10.0 ~ 58.0 mm). Controls the maximum radial extent of the gourd lobes to define the volumetric capacity and footprint.

## Component Details

### 1. vase_body
The primary and sole component forming the gourd vase.
* **Component Purpose**: Acts as the decorative container, providing the external aesthetic gourd shape and internal hollow volume.
* **Assembly Direction**: Placed vertically along the +Z axis (freestanding base).
* **Connection & Kinematics**: Not applicable (Single solid body).

---

## Component Assembly Graph (Textual)
vase_body -> Ground | Joint: Support Base | Note: Standalone object; no internal assembly required.
