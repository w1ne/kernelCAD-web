# chair_2_rocker (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a two-piece rocking chair consisting of a lower rocker frame and an upper seat/backrest, designed for wood-based assembly.

## Geometry and Dimensions
Approx. 674.0 mm × 460.0 mm × 872.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating (rocking chair).

## Structural Features
Lower rocker frame; upper seat and backrest.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
2

## Component Names
- lower_frame
- upper_seat_back

## Adjustable Parameters
- **seat_width**: 460 (360.0 ~ 560.0 mm). Determines the seating width and overall extrusion depth of the chair.
- **joint_width**: 20 (10.0 ~ 40.0 mm). Controls the thickness of the connecting tenon, balancing structural strength and available material.
- **joint_end_clearance**: 40 (15.0 ~ 90.0 mm). Defines the setback of the joint from the edges of the seat to prevent wood splitting at the ends.
- **profile_fillet_radius**: 4 (1.0 ~ 10.0 mm). Smooths the sharp corners of the side profiles for ergonomics, aesthetics, and machining tool radius constraints.
- **joint_clearance**: 0.2 (0.0 ~ 1.0 mm). Provides tolerance for the mortise and tenon fit to ensure smooth assemblability without being too loose.

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
The supporting base of the rocking chair.
* **Component Purpose**: Acts as the rocking base and lower support structure, transferring the load to the ground while enabling the rocking motion.
* **Assembly Direction**: Fixed base component.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features a protruding rectangular tenon at the top center to connect with the upper seat.

### 2. upper_seat_back
The functional support entity of the chair.
* **Component Purpose**: Provides the seating surface and backrest for human-computer interaction and ergonomic support.
* **Assembly Direction**: Placed downwards along the -Z axis onto the lower frame.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features a central slot (mortise) at the bottom to receive the lower frame's tenon.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **upper_seat_back -> lower_frame** | Joint: interlocking | Note: Upper seat's bottom slot receives the lower frame's top tenon.
