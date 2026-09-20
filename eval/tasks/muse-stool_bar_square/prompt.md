# stool_bar_square (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a tall square bar stool with apron rails and a lower footrest loop designed for wood-based assembly.

## Geometry and Dimensions
Approx. 312.0 mm × 312.0 mm × 738.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating (bar stool).

## Structural Features
Seat panel; four legs; eight stretchers (forming an upper apron and a lower footrest loop).

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
- **seat_thickness**: 18.0 (10.0 ~ 32.0 mm). Ensures structural integrity of the seat and provides sufficient depth for the leg tenons.
- **leg_height**: 720.0 (600.0 ~ 880.0 mm). Determines the seating height, strictly following ergonomic standards for bar counters.
- **tenon_height**: 9.0 (6.0 ~ 13.0 mm). Determines the bite depth of the physical connections into the seat panel.
- **seat_width**: 312.0 (222.0 ~ 402.0 mm). Defines the seating area and overall footprint width.
- **seat_depth**: 312.0 (222.0 ~ 402.0 mm). Defines the seating area and overall footprint depth.
- **leg_top_size**: 24.0 (18.0 ~ 34.0 mm). Controls the upper cross-section of the leg to ensure a flush fit and adequate material for the top tenon.
- **leg_bottom_size**: 28.0 (20.0 ~ 40.0 mm). Controls the base footprint of the leg, providing anti-overturning stability.
- **tenon_size**: 9.0 (6.0 ~ 13.0 mm). Ensures the tenon is robust enough to handle shear forces without weakening the leg top.
- **stretcher_z**: 288.0 (238.0 ~ 368.0 mm). Sets the height of the lower stretcher loop, functioning as a footrest.
- **stretcher_secondary_z**: 620.0 (560.0 ~ 700.0 mm). Sets the height of the upper stretcher loop, functioning as an apron rail for structural rigidity.
- **stretcher_bar_width**: 16.0 (12.0 ~ 22.0 mm). Determines the vertical stiffness of the horizontal supports.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the horizontal stiffness of the horizontal supports.

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
The central hub and top surface of the stool.
* **Component Purpose**: Acts as the main load-bearing base for seating and provides localization references and mechanical interfaces (sockets) for the four legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features four square sockets to receive the leg tenons.

### 2~5. leg_01 to leg_04
The vertical supporting entities of the stool.
* **Component Purpose**: Transfers the seat load to the ground, ensuring stability. Features mortises on the sides to receive the stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a tenon of length `tenon_height` that interference-fits into the bottom sockets of the seat panel. Sides feature mortises for stretcher connections.

### 6~13. stretcher_01 to stretcher_08
The horizontal bracing entities of the stool.
* **Component Purpose**: Connects the legs to prevent splaying, providing lateral stability. Arranged in a double-cycle configuration (lower footrest and upper apron).
* **Assembly Direction**: Inserted horizontally into the side mortises of the legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding leg mortises.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 13-component model:

* **leg_01 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket.
* **leg_02 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket.
* **leg_03 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket.
* **leg_04 -> seat_panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's bottom socket.
* **stretcher_01 to stretcher_04 -> leg_01 to leg_04** | Joint: interlocking | Note: Lower cycle stretchers inserted into leg side mortises at `stretcher_z`.
* **stretcher_05 to stretcher_08 -> leg_01 to leg_04** | Joint: interlocking | Note: Upper cycle stretchers inserted into leg side mortises at `stretcher_secondary_z`.
* **seat_panel -> All Components** | Joint: Support Base | Note: Acts as the core hub; top connection sockets generated via boolean cut.
