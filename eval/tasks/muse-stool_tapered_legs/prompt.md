# stool_tapered_legs (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a rounded-square stool with tapered legs and reinforced braces designed for wood-based assembly.

## Geometry and Dimensions
Approx. 330.0 mm × 330.0 mm × 452.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four tapered legs; six reinforced braces (stretchers).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
11

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
- Stretcher 05
- Stretcher 06

## Adjustable Parameters
- **seat_thickness**: 18.0 (10.0 ~ 32.0 mm). Ensures adequate structural strength for seating while accommodating the insertion depth of the leg tenons.
- **leg_height**: 434.0 (314.0 ~ 594.0 mm). Determines the seating height, strictly following ergonomic standards for single-person seating posture.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections into the seat panel.
- **seat_width**: 330.0 (240.0 ~ 420.0 mm). Defines the primary seating area width.
- **seat_depth**: 330.0 (240.0 ~ 420.0 mm). Defines the primary seating area depth.
- **leg_top_size**: 20.0 (18.0 ~ 30.0 mm). Defines the cross-section size of the leg at the top, affecting the joint strength at the seat interface.
- **leg_bottom_size**: 36.0 (28.0 ~ 48.0 mm). Defines the base footprint of the leg, ensuring anti-overturning stability.
- **tenon_size**: 8.0 (6.0 ~ 12.0 mm). Controls the thickness of the tenon for the leg-to-seat joint.
- **stretcher_z**: 154.0 (104.0 ~ 234.0 mm). Sets the vertical position of the primary perimeter stretchers for leg reinforcement.
- **stretcher_secondary_z**: 212.0 (152.0 ~ 292.0 mm). Sets the vertical position of the secondary stretchers (cross braces) to prevent interference with the primary stretchers.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Determines the vertical stiffness and load-bearing capacity of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the horizontal stiffness of the stretcher bars and the thickness of their tenons.

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
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four sockets generated via boolean cut to receive the leg tenons.

### 2~5. Four Legs (Leg 01, Leg 02, Leg 03, Leg 04)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability. Features mortises along the shaft to receive the stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon of height `tenon_height` that interference-fits into the bottom sockets of the seat panel. The sides feature mortises to connect with the stretchers.

### 6~11. Six Stretchers (Stretcher 01 to Stretcher 06)
The horizontal reinforcement entities of the stool.
* **Component Purpose**: Horizontal reinforcement. Connects the legs to prevent splaying under load and increases overall structural rigidity. Configured in a "box_x" mode (perimeter box + internal cross).
* **Assembly Direction**: Inserted horizontally between the respective legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 11-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 1.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 2.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 3.
* **Leg 04 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket 4.
* **Stretcher 01 -> Leg 01 & Leg 02** | Joint: interlocking | Note: Perimeter brace connecting adjacent legs.
* **Stretcher 02 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Perimeter brace connecting adjacent legs.
* **Stretcher 03 -> Leg 03 & Leg 04** | Joint: interlocking | Note: Perimeter brace connecting adjacent legs.
* **Stretcher 04 -> Leg 04 & Leg 01** | Joint: interlocking | Note: Perimeter brace connecting adjacent legs.
* **Stretcher 05 -> Leg 01 & Leg 03** | Joint: interlocking | Note: Diagonal cross brace connecting opposite legs.
* **Stretcher 06 -> Leg 02 & Leg 04** | Joint: interlocking | Note: Diagonal cross brace connecting opposite legs.
* **Seat Panel -> All Legs** | Joint: Support Base | Note: Acts as the core hub; all connection sockets generated via boolean cut.
