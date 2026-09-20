# stool_oval_apron (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct an oval stool with a high apron-style stretcher loop designed for wood-based assembly.

## Geometry and Dimensions
Approx. 380.0 mm × 292.0 mm × 450.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Oval seat panel; four legs; four apron-style stretchers forming a continuous loop.

## Special Requirements
Keep assembly split unchanged.

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
- **seat_thickness**: 18.0 (10.0 ~ 32.0 mm). Must be thick enough to accommodate the insertion depth of the leg tenons and support the user's weight.
- **leg_height**: 432.0 (312.0 ~ 592.0 mm). Determines the overall seating height, strictly following ergonomic standards for seating posture.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Determines the bite depth of the physical connections between the legs and the seat panel.
- **seat_radius_x**: 190.0 (150.0 ~ 240.0 mm). Controls the primary width of the oval seat to ensure adequate seating area.
- **seat_radius_y**: 146.0 (111.0 ~ 191.0 mm). Controls the depth of the oval seat.
- **leg_top_size**: 26.0 (18.0 ~ 36.0 mm). Ensures sufficient material at the top of the leg for the tenon and structural integrity.
- **leg_bottom_size**: 30.0 (22.0 ~ 42.0 mm). Provides a stable base footprint to prevent tipping.
- **tenon_size**: 9.5 (6.5 ~ 13.5 mm). Controls the cross-sectional area of the tenon for optimal shear strength.
- **stretcher_z**: 280.0 (230.0 ~ 360.0 mm). Sets the vertical position of the apron-style stretchers to maximize leg stability and prevent splaying.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Determines the vertical stiffness of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Ensures the stretchers are robust enough to resist lateral forces without protruding too much.

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
* **Component Purpose**: Acts as the main load-bearing base and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four sockets generated via boolean cut to receive the leg tenons.

### 2~5. leg_01, leg_02, leg_03, leg_04
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability. Features side mortises to receive the stretcher loop.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon that interference-fits into the bottom sockets of the seat panel. Sides feature mortises for the stretcher tenons.

### 6~9. stretcher_01, stretcher_02, stretcher_03, stretcher_04
The horizontal bracing entities of the stool.
* **Component Purpose**: Horizontal support. Forms a high apron-style loop connecting the legs to prevent splaying and increase overall structural rigidity.
* **Assembly Direction**: Inserted horizontally into the side mortises of adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding leg mortises.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's socket.
* **stretcher_01 -> leg_01 & leg_02** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **stretcher_02 -> leg_02 & leg_03** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **stretcher_03 -> leg_03 & leg_04** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **stretcher_04 -> leg_04 & leg_01** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all top connection sockets generated via boolean cut.
