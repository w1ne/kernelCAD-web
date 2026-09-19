# stool_box_brace (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a square stool with a clean lower box stretcher frame designed for wood-based assembly.

## Geometry and Dimensions
Approx. 326.0 mm × 326.0 mm × 444.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four legs; four stretchers forming a lower box frame.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
9

## Component Names
- Seat panel
- Leg 01
- Leg 02
- Leg 03
- Leg 04
- Stretcher 01
- Stretcher 02
- Stretcher 03
- Stretcher 04

## Adjustable Parameters
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Ensures adequate load-bearing capacity for the seat while accommodating the insertion depth of the leg tenons.
- **leg_height**: 428.0 (308.0 ~ 588.0 mm). Determines the seating height, strictly following ergonomic standards for seating posture.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections between the legs and the seat panel.
- **seat_width**: 326.0 (236.0 ~ 416.0 mm). Defines the primary seating area width.
- **seat_depth**: 326.0 (236.0 ~ 416.0 mm). Defines the primary seating area depth.
- **leg_top_size**: 24.0 (18.0 ~ 34.0 mm). Controls the thickness of the leg at the top interface to ensure joint strength.
- **leg_bottom_size**: 28.0 (20.0 ~ 40.0 mm). Controls the footprint and base stability of the stool to prevent tipping.
- **tenon_size**: 9.0 (6.0 ~ 13.0 mm). Defines the cross-sectional size of the joint for structural integrity.
- **stretcher_z**: 138.0 (88.0 ~ 218.0 mm). Sets the vertical position of the stretcher frame to optimize leg stabilization and prevent splay.
- **stretcher_bar_width**: 14.0 (10.0 ~ 20.0 mm). Determines the vertical stiffness of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the horizontal stiffness of the stretcher bars.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Seat Panel
The central hub of the stool.
* **Component Purpose**: Acts as the main load-bearing base for
