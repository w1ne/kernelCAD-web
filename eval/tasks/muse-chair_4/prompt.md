# chair_4 (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a laminated profile chair formed by a series of parallel, vertically oriented wooden panels that create a continuous S-curve for the base, seat, and backrest.

## Geometry and Dimensions
Approx. 560.0 mm × 493.9 mm × 1015.2 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
Bonding (Glue)

## Mechanical Condition
Single-person seating.

## Structural Features
28 parallel S-curve profile panels arranged in a mirrored configuration.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
28

## Component Names
- profile_panel_01
- profile_panel_02
- profile_panel_03
- profile_panel_04
- profile_panel_05
- profile_panel_06
- profile_panel_07
- profile_panel_08
- profile_panel_09
- profile_panel_10
- profile_panel_11
- profile_panel_12
- profile_panel_13
- profile_panel_14
- profile_panel_15
- profile_panel_16
- profile_panel_17
- profile_panel_18
- profile_panel_19
- profile_panel_20
- profile_panel_21
- profile_panel_22
- profile_panel_23
- profile_panel_24
- profile_panel_25
- profile_panel_26
- profile_panel_27
- profile_panel_28

## Adjustable Parameters
- **overall_height**: 1015.2 (700.0 ~ 1300.0 mm). Controls the total height of the backrest, affecting lumbar and shoulder support.
- **panel_depth**: 20.0 (8.0 ~ 40.0 mm). Determines the thickness of each individual wooden slice, balancing structural rigidity and overall weight.
- **panel_count**: 28 (8 ~ 64). Dictates the resolution of the lamination and the density of the ribbed structure.
- **seat_width**: 560.0 (260.0 ~ 620.0 mm). Defines the total ergonomic seating width across the arrayed panels.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1~28. Profile Panels 01 to 28
The structural and ergonomic slices of the chair.
* **Component Purpose**: When arrayed together, these 2D-profiled panels form the continuous 3D surface of the chair, acting simultaneously as the floor base, the seating surface, and the backrest.
* **Assembly Direction**: Arrayed horizontally along the Y-axis, with the second half mirrored across the center plane.
* **Connection & Kinematics**: Bonding (Glue) (Fully constrained in all directions (permanent)).

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 28-component model:

* **profile_panel_01 -> profile_panel_02** | Joint: Bonding (Glue) | Note: Sequential face-to-face lamination along the Y-axis.
* **profile_panel_02 -> profile_panel_03** | Joint: Bonding (Glue) | Note: Sequential face-to-face lamination along the Y-axis.
* **profile_panel_03 -> profile_panel_04** | Joint: Bonding (Glue) | Note: Sequential face-to-face lamination along the Y-axis.
* **...** | Joint: Bonding (Glue) | Note: Pattern continues for all adjacent panels.
* **profile_panel_27 -> profile_panel_28** | Joint: Bonding (Glue) | Note: Final sequential face-to-face lamination along the Y-axis.
