# stool_hex (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a hexagonal stool with four legs and a lower stretcher loop designed for wood-based assembly.

## Geometry and Dimensions
Approx. 368.0 mm × 368.0 mm × 454.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating.

## Structural Features
Hexagonal seat panel; four legs; four lower stretchers forming a reinforcing loop.

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
- **seat_thickness**: 16.0 (10.0 ~ 30.0 mm). Ensures sufficient structural strength for seating while accommodating the insertion depth of the leg tenons.
- **leg_height**: 438.0 (318.0 ~ 598.0 mm). Determines the ergonomic seating height of the stool.
- **tenon_height**: 8.0 (5.0 ~ 12.0 mm). Controls the bite depth of the physical connections between the legs and the seat panel.
- **seat_polygon_radius**: 184.0 (144.0 ~ 229.0 mm). Defines the overall size and seating area of the hexagonal seat panel.
- **leg_top_size**: 25.0 (18.0 ~ 35.0 mm). Determines the thickness of the leg at the connection point with the seat, balancing aesthetics and joint strength.
- **leg_bottom_size**: 29.0 (21.0 ~ 41.0 mm). Determines the footprint thickness of the leg to ensure ground stability and prevent tipping.
- **tenon_size**: 9.0 (6.0 ~ 13.0 mm). Defines the cross-sectional size of the joint to balance leg strength and seat integrity.
- **stretcher_z**: 166.0 (116.0 ~ 246.0 mm). Sets the vertical position of the stretcher loop for optimal structural bracing and footrest ergonomics.
- **stretcher_bar_width**: 15.0 (11.0 ~ 21.0 mm). Defines the vertical stiffness and load-bearing capacity of the stretcher bars.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Defines the horizontal stiffness of the stretcher bars to resist lateral forces.

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
* **Assembly Direction**: Fixed base component, positioned horizontally at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four square sockets to receive the leg tenons.

### 2~5. leg_01 to leg_04
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability. Provides side mortises to anchor the stretcher loop.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a square tenon that interference-fits into the bottom sockets of the seat panel. Sides feature mortises to receive the stretcher tenons.

### 6~9. stretcher_01 to stretcher_04
The lateral bracing entities of the stool.
* **Component Purpose**: Horizontal support. Connects the legs together to form a rigid lower loop, preventing leg splay under load and increasing overall structural integrity.
* **Assembly Direction**: Inserted horizontally between adjacent legs at $Z = stretcher\_z$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding side mortises of the adjacent legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 9-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding bottom socket.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding bottom socket.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding bottom socket.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's corresponding bottom socket.
* **stretcher_01 -> leg_01 & leg_02** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **stretcher_02 -> leg_02 & leg_04** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **stretcher_03 -> leg_04 & leg_03** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **stretcher_04 -> leg_03 & leg_01** | Joint: interlocking | Note: Stretcher ends inserted into side mortises of adjacent legs.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; all top connection sockets generated via boolean cut.
