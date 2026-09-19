# chair_2_stool (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a two-piece stool designed for wood-based assembly, featuring a lower support frame and an upper seat cap.

## Geometry and Dimensions
Approx. 490.0 mm × 400.0 mm × 400.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Lower frame; seat cap.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
2

## Component Names
- lower_frame
- seat_cap

## Adjustable Parameters
- **seat_width**: 400.0 (300.0 ~ 500.0 mm). Determines the seating depth and overall extrusion length of the stool.
- **joint_width**: 20.0 (10.0 ~ 40.0 mm). Controls the thickness of the tenon, balancing structural strength and available material.
- **joint_end_clearance**: 40.0 (15.0 ~ 90.0 mm). Defines the setback distance of the tenon from the part edges to prevent wood splitting at the ends.
- **profile_fillet_radius**: 4.0 (1.0 ~ 10.0 mm). Smooths the sharp corners of the side profiles for ergonomics, safety, and aesthetics.
- **joint_clearance**: 0.2 (0.0 ~ 1.0 mm). Provides manufacturing tolerance for the mortise and tenon fit to ensure smooth assemblability.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. lower_frame
The supporting base of the stool.
* **Component Purpose**: Acts as the main load-bearing structure, transferring the user's weight to the ground while providing a physical connection interface for the seat cap.
* **Assembly Direction**: Fixed base component, positioned at absolute ground level.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The top center features a protruding rectangular tenon.

### 2. seat_cap
The functional seating entity of the stool.
* **Component Purpose**: Provides the horizontal seating surface for human interaction and locks onto the lower frame to complete the structure.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the lower frame.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom features a dedicated slot (mortise) that receives the tenon of the lower frame.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **seat_cap -> lower_frame** | Joint: interlocking | Note: Seat cap bottom slot receives the lower frame's top tenon.
