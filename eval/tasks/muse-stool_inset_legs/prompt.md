# stool_inset_legs (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a four-legged inset stool with a higher apron loop (stretchers) designed for wood-based assembly.

## Geometry and Dimensions
Approx. 320.0 mm × 320.0 mm × 436.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four legs; four stretchers (apron loop).

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
- **seat_width**: 320.0 (230.0 ~ 410.0 mm). Determines the overall width of the seating area.
- **seat_depth**: 320.0 (230.0 ~ 410.0 mm). Determines the overall depth of the seating area.
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Ensures adequate load-bearing capacity for the seat and provides sufficient depth for the leg tenons.
- **leg_height**: 420.0 (300.0 ~ 580.0 mm). Determines the seating height, strictly following ergonomic standards for single-person seating posture.
- **leg_top_size**: 28.0 (20.0 ~ 38.0 mm). Controls the thickness of the leg at the top connection point to ensure joint integrity.
- **leg_bottom_size**: 30.0 (22.0 ~ 42.0 mm). Controls the thickness of the leg at the base to ensure anti-overturning stability.
- **tenon_size**: 10.0 (7.0 ~ 14.0 mm). Determines the cross-sectional size of the tenon for the leg-to-seat joint.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the insertion bite depth of the leg tenons into the seat panel.
- **stretcher_z**: 236.0 (186.0 ~ 316.0 mm). Sets the vertical position of the stretcher loop to prevent leg splay and provide structural rigidity.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Controls the vertical stiffness of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Controls the horizontal stiffness of the stretcher bars.

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
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four rectangular sockets generated via boolean cut.

### 2~5. Four Legs (Leg 01, Leg 02, Leg 03, Leg 04)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring stability in the X-Y plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The top features a tenon of height `tenon_height` that fits into the bottom sockets of the seat panel. The sides feature mortises to receive the stretcher tenons.

### 6~9. Four Stretchers (Stretcher 01, Stretcher 02, Stretcher 03, Stretcher 04)
The horizontal bracing entities of the stool.
* **Component Purpose**: Forms an apron loop to prevent leg splay and significantly increases the overall structural rigidity of the stool frame.
* **Assembly Direction**: Inserted horizontally into the side mortises of the adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends of each stretcher feature tenons that are inserted into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **Leg 04 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **Stretcher 01 -> Leg 01 & Leg 02** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of Leg 01 and Leg 02.
* **Stretcher 02 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of Leg 02 and Leg 03.
* **Stretcher 03 -> Leg 03 & Leg 04** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of Leg 03 and Leg 04.
* **Stretcher 04 -> Leg 04 & Leg 01** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of Leg 04 and Leg 01.
* **Seat Panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all vertical connection sockets generated via boolean cut.
