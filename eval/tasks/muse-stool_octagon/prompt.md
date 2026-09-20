# stool_octagon (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct an octagonal stool with perimeter rails and diagonal braces designed for wood-based assembly.

## Geometry and Dimensions
Approx. 352.0 mm × 352.0 mm × 464.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Octagonal seat panel; four legs; six stretchers (four perimeter rails and two diagonal braces).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
11

## Component Names
- seat_panel
- leg_01
- leg_02
- leg_03
- leg_04
- stretcher_01
- stretcher_02
- stretcher_03
- stretcher_04
- stretcher_05
- stretcher_06

## Adjustable Parameters
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Must be thick enough to accommodate the insertion depth of the leg tenons and support the user's weight without bowing.
- **leg_height**: 448.0 (328.0 ~ 608.0 mm). Strictly follows ergonomic standards for single-person seating posture.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections into the seat panel.
- **seat_polygon_radius**: 176.0 (136.0 ~ 221.0 mm). Defines the overall seating area; constrained to prevent tipping caused by an unbalanced base-to-seat ratio.
- **leg_top_size**: 22.0 (18.0 ~ 32.0 mm). Ensures sufficient material at the top of the leg to form a robust tenon.
- **leg_bottom_size**: 24.0 (20.0 ~ 36.0 mm). Provides a stable footprint and load-bearing stiffness at the base.
- **tenon_size**: 8.0 (6.0 ~ 12.0 mm). Controls the cross-sectional strength of the joint connecting the legs to the seat.
- **stretcher_z**: 162.0 (112.0 ~ 242.0 mm). Sets the height of the primary perimeter stretchers to prevent leg splay and provide structural rigidity.
- **stretcher_secondary_z**: 216.0 (156.0 ~ 296.0 mm). Sets the height of the secondary diagonal (X-brace) stretchers to avoid physical interference with the primary stretchers.
- **stretcher_bar_width**: 14.0 (10.0 ~ 20.0 mm). Ensures the stretcher has enough material to resist bending and torsion.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Provides adequate thickness for cutting tenons on the ends of the stretchers.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. seat_panel
The central hub and load-bearing surface of the stool.
* **Component Purpose**: Acts as the main seating surface and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four sockets to receive the leg tenons.

### 2~5. leg_01 to leg_04
The vertical supporting entities of the stool.
* **Component Purpose**: Transfers the seat load to the ground, ensuring anti-overturning stability. Contains mortises on the sides to receive the stretcher tenons.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon that interference-fits into the bottom sockets of the seat panel. Sides feature mortises for the stretchers.

### 6~11. stretcher_01 to stretcher_06
The horizontal and diagonal bracing entities of the stool.
* **Component Purpose**: Connects the legs together to prevent splaying, increasing the overall rigidity and structural integrity of the base. Configured in a "box_x" mode (four perimeter rails and two diagonal braces).
* **Assembly Direction**: Inserted horizontally/diagonally in the X-Y plane into the leg mortises.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 11-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **stretcher_01 -> leg_01 & leg_02** | Joint: interlocking | Note: Perimeter stretcher tenons inserted into adjacent leg mortises.
* **stretcher_02 -> leg_02 & leg_04** | Joint: interlocking | Note: Perimeter stretcher tenons inserted into adjacent leg mortises.
* **stretcher_03 -> leg_04 & leg_03** | Joint: interlocking | Note: Perimeter stretcher tenons inserted into adjacent leg mortises.
* **stretcher_04 -> leg_03 & leg_01** | Joint: interlocking | Note: Perimeter stretcher tenons inserted into adjacent leg mortises.
* **stretcher_05 -> leg_01 & leg_04** | Joint: interlocking | Note: Diagonal (X-brace) stretcher tenons inserted into opposite leg mortises.
* **stretcher_06 -> leg_02 & leg_03** | Joint: interlocking | Note: Diagonal (X-brace) stretcher tenons inserted into opposite leg mortises.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all top connection sockets generated via boolean cut.
