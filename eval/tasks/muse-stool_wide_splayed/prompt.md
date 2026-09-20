# stool_wide_splayed (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a wide splayed stool featuring a rectangular seat and two levels of perimeter rails (stretchers) for enhanced structural stability.

## Geometry and Dimensions
Approx. 360.0 mm × 360.0 mm × 448.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Seat panel; four splayed legs; eight perimeter stretchers (arranged in two levels).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
13

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
- stretcher_07
- stretcher_08

## Adjustable Parameters
- **seat_thickness**: 18.0 (10.0 ~ 32.0 mm). Ensures sufficient material thickness to support seating loads and accommodate leg tenons without breaking.
- **leg_height**: 430.0 (310.0 ~ 590.0 mm). Determines the primary seating height, conforming to ergonomic standards for stools.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Controls the insertion depth of the leg tenons into the seat panel sockets.
- **seat_width**: 360.0 (270.0 ~ 450.0 mm). Defines the lateral seating area.
- **seat_depth**: 360.0 (270.0 ~ 450.0 mm). Defines the longitudinal seating area.
- **leg_top_size**: 26.0 (18.0 ~ 36.0 mm). Sets the cross-sectional size of the leg at the top to ensure adequate joint strength with the seat.
- **leg_bottom_size**: 34.0 (26.0 ~ 46.0 mm). Sets the cross-sectional size of the leg at the floor level for a stable footprint.
- **tenon_size**: 9.5 (6.5 ~ 13.5 mm). Determines the thickness of the tenon, balancing joint strength and remaining leg material.
- **stretcher_z**: 148.0 (98.0 ~ 228.0 mm). Sets the vertical position of the first (lower) level of perimeter stretchers to prevent leg splay.
- **stretcher_secondary_z**: 214.0 (154.0 ~ 294.0 mm). Sets the vertical position of the second (upper) level of perimeter stretchers for additional torsional rigidity.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Defines the vertical width of the stretcher bars for bending resistance.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Defines the horizontal thickness of the stretcher bars.

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
The central hub and primary contact surface of the stool.
* **Component Purpose**: Acts as the main load-bearing base for the user and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom face features four sockets to receive the leg tenons.

### 2~5. Four Legs (leg_01 to leg_04)
The supporting entities of the stool.
* **Component Purpose**: Vertical and splayed support. Transfers the seat load to the ground while providing mortises to receive the stretcher network.
* **Assembly Direction**: Inserted upwards along the +Z axis (with splay angles) into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). The top features a tenon inserted into the seat panel. The sides feature mortises to receive the stretcher tenons.

### 6~13. Eight Stretchers (stretcher_01 to stretcher_08)
The horizontal bracing entities of the stool.
* **Component Purpose**: Connects the legs at two different height levels to form a rigid perimeter frame, preventing the legs from splaying outward under load and increasing overall structural stiffness.
* **Assembly Direction**: Inserted horizontally/diagonally between adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends of each stretcher feature tenons that insert into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 13-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding socket.
* **stretcher_01 ~ stretcher_04 -> leg_01 ~ leg_04** | Joint: interlocking | Note: Lower level stretchers connecting adjacent legs via end tenons.
* **stretcher_05 ~ stretcher_08 -> leg_01 ~ leg_04** | Joint: interlocking | Note: Upper level stretchers connecting adjacent legs via end tenons.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; leg connection sockets generated via boolean cut.
