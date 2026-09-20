# stool_rect_compact (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a compact rectangular utility stool with low rails (stretchers) designed for wood-based assembly.

## Geometry and Dimensions
Approx. 320.0 mm × 250.0 mm × 378.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating, utility step or resting stool.

## Structural Features
Seat panel; four legs; four stretchers (low rails).

## Special Requirements
Keep assembly split unchanged. The exported STEP must remain a closed solid.

## Planned Component Quantity
9

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

## Adjustable Parameters
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Must be thick enough to accommodate the insertion depth of the leg tenons and support seating loads.
- **leg_height**: 362.0 (250.0 ~ 522.0 mm). Determines the overall seating height, strictly following ergonomic standards for a utility stool.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections into the seat panel.
- **seat_width**: 320.0 (230.0 ~ 410.0 mm). Constrains the extreme values to prevent tipping caused by unbalanced length-to-width ratios.
- **seat_depth**: 250.0 (220.0 ~ 340.0 mm). Provides adequate seating area while maintaining a compact footprint.
- **leg_top_size**: 26.0 (18.0 ~ 36.0 mm). Ensures sufficient material for the top tenon and structural connection to the seat.
- **leg_bottom_size**: 28.0 (20.0 ~ 40.0 mm). Lower limit ensures load-bearing stiffness and stability at the base.
- **tenon_size**: 9.5 (6.5 ~ 13.5 mm). Controls the thickness of the tenon to balance joint strength and prevent breaking.
- **stretcher_z**: 136.0 (86.0 ~ 216.0 mm). Sets the height of the low rails to optimize leg bracing and structural rigidity.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Ensures the stretcher rails can resist bending and buckling forces.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Provides enough material to form the stretcher tenons without weakening the rail.

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
The central hub of the stool.
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets/mortises) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four sockets to receive the leg tenons.

### 2~5. Four Legs (leg_01, leg_02, leg_03, leg_04)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability. Contains mortises along the shaft to receive stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon that interference-fits into the bottom sockets of the seat panel. The sides feature mortises to connect with the stretchers.

### 6~9. Four Stretchers (stretcher_01, stretcher_02, stretcher_03, stretcher_04)
The horizontal bracing entities of the stool.
* **Component Purpose**: Horizontal support. Connects the legs together to prevent splaying and increases the overall structural rigidity of the base.
* **Assembly Direction**: Inserted horizontally in the X-Y plane into the leg mortises.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **stretcher_01 -> leg_01 & leg_02** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg_01 and leg_02.
* **stretcher_02 -> leg_02 & leg_04** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg_02 and leg_04.
* **stretcher_03 -> leg_04 & leg_03** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg_04 and leg_03.
* **stretcher_04 -> leg_03 & leg_01** | Joint: interlocking | Note: Stretcher tenons inserted into side mortises of leg_03 and leg_01.
* **seat_panel -> All Leg Components** | Joint: Support Base | Note: Acts as the core hub; all top connection sockets generated via boolean cut.
