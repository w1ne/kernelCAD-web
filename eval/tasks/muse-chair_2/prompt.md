# chair_2 (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a two-piece minimalist chair consisting of a lower base frame and an upper seat-and-backrest frame, assembled via a central interlocking joint.

## Geometry and Dimensions
Approx. 420.0 mm × 613.0 mm × 898.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Lower base frame; upper seat and backrest frame.

## Special Requirements
Keep assembly split unchanged. Maintain the defined installation clearance for the joint to ensure proper physical assembly.

## Planned Component Quantity
2

## Component Names
- lower_frame_with_tenon
- upper_seat_back_frame

## Adjustable Parameters
- **seat_width**: 420.0 (320.0 ~ 520.0 mm). Determines the overall width of the chair and the extrusion depth of the 2D profiles, directly affecting seating area and stability.
- **joint_width**: 20.0 (10.0 ~ 40.0 mm). Controls the thickness of the connecting tenon, balancing structural shear strength and material limits.
- **joint_end_clearance**: 40.0 (15.0 ~ 90.0 mm). Defines the setback distance of the tenon from the lateral edges to prevent material breakout or splitting at the joint ends.
- **profile_fillet_radius**: 4.0 (1.0 ~ 10.0 mm). Sets the corner rounding of the profile, providing ergonomic safety and accommodating CNC tool radius compensation.
- **joint_clearance**: 0.2 (0.0 ~ 1.0 mm). Provides the necessary dimensional tolerance for the physical assembly of the mortise and tenon joint.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. lower_frame_with_tenon
The supporting base entity of the chair.
* **Component Purpose**: Acts as the main load-bearing base, transferring weight to the ground and providing the male tenon interface for the upper frame.
* **Assembly Direction**: Fixed base component, positioned as the foundational structure.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features a top-centered protruding rectangular tenon.

### 2. upper_seat_back_frame
The functional support entity of the chair.
* **Component Purpose**: Provides the seating surface and backrest for human-computer interaction, featuring a central slot to mate securely with the lower frame.
* **Assembly Direction**: Inserted downwards onto the lower frame's top tenon.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features a central mortise (slot cut) at the mating face that accommodates the lower frame's tenon with a defined clearance.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 2-component model:

* **upper_seat_back_frame -> lower_frame_with_tenon** | Joint: interlocking | Note: Upper frame's central slot fits over the lower frame's top tenon.
