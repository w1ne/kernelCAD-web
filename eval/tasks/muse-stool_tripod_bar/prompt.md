# stool_tripod_bar (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a tall tripod bar stool with two triangular stretcher levels designed for wood-based assembly.

## Geometry and Dimensions
Approx. 312.0 mm × 312.0 mm × 778.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Single-person seating at an elevated bar or counter.

## Structural Features
Seat panel; three legs; six stretchers (forming two triangular bracing levels).

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
10

## Component Names
- Seat panel
- Leg 01
- Leg 02
- Leg 03
- Stretcher 01
- Stretcher 02
- Stretcher 03
- Stretcher 04
- Stretcher 05
- Stretcher 06

## Adjustable Parameters
- **seat_thickness**: 18.0 (10.0 ~ 32.0 mm). Must be thick enough to accommodate the insertion depth of the leg tenons and support the user's weight.
- **leg_height**: 760.0 (640.0 ~ 920.0 mm). Determines the overall seating height, strictly following ergonomic standards for bar stools.
- **tenon_height**: 9.0 (6.0 ~ 13.0 mm). Determines the bite depth of the physical connections between the legs and the seat panel.
- **seat_radius**: 156.0 (120.0 ~ 201.0 mm). Defines the seating area to ensure ergonomic comfort and prevent tipping.
- **leg_top_radius**: 11.0 (8.0 ~ 16.0 mm). Ensures sufficient material at the top of the leg to support the tenon and bear the seat load.
- **leg_bottom_radius**: 14.0 (10.0 ~ 20.0 mm). Provides a wider base for the leg to ensure anti-overturning stability on the ground.
- **tenon_radius**: 5.0 (4.0 ~ 8.0 mm). Controls the thickness of the cylindrical tenon to prevent shear failure.
- **stretcher_z**: 312.0 (262.0 ~ 392.0 mm). Sets the height of the lower stretcher level, acting as a structural brace and potential footrest.
- **stretcher_secondary_z**: 644.0 (584.0 ~ 724.0 mm). Sets the height of the upper stretcher level for additional torsional rigidity.
- **stretcher_bar_width**: 14.0 (10.0 ~ 20.0 mm). Determines the horizontal stiffness of the bracing components.
- **stretcher_bar_thickness**: 10.0 (8.0 ~ 14.0 mm). Determines the vertical load-bearing capacity of the stretchers.

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
* **Component Purpose**: Acts as the main load-bearing base for seating and provides localization references and mechanical interfaces (sockets) for the three legs.
* **Assembly Direction**: Fixed base component, positioned at absolute $Z = leg\_height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features three cylindrical sockets arranged radially.

### 2~4. Legs (Leg 01, Leg 02, Leg 03)
The supporting entities of the stool.
* **Component Purpose**: Vertical support. Transfers the seat load to the ground, ensuring anti-overturning stability. Features mortises along its length to receive the stretchers.
* **Assembly Direction**: Inserted upwards along the +Z axis into the seat panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features a cylindrical tenon that interference-fits into the bottom sockets of the seat panel. The body features mortise cuts to receive stretcher tenons.

### 5~7. Lower Stretchers (Stretcher 01, Stretcher 02, Stretcher 03)
The primary horizontal bracing entities.
* **Component Purpose**: Connects the legs at the lower level (`stretcher_z`) to prevent splaying and increase the overall structural rigidity of the tripod base.
* **Assembly Direction**: Inserted horizontally between adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the legs.

### 8~10. Upper Stretchers (Stretcher 04, Stretcher 05, Stretcher 06)
The secondary horizontal bracing entities.
* **Component Purpose**: Connects the legs at the upper level (`stretcher_secondary_z`) to provide additional resistance against torsional forces and reinforce the upper leg structure.
* **Assembly Direction**: Inserted horizontally between adjacent legs.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenons that insert into the corresponding mortises on the legs.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 10-component model:

* **Leg 01 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's first radial socket.
* **Leg 02 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's second radial socket.
* **Leg 03 -> Seat Panel** | Joint: interlocking | Note: Leg top tenon inserted into seat's third radial socket.
* **Stretcher 01 -> Leg 01 & Leg 02** | Joint: interlocking | Note: Lower stretcher connecting Leg 01 and Leg 02.
* **Stretcher 02 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Lower stretcher connecting Leg 02 and Leg 03.
* **Stretcher 03 -> Leg 03 & Leg 01** | Joint: interlocking | Note: Lower stretcher connecting Leg 03 and Leg 01.
* **Stretcher 04 -> Leg 01 & Leg 02** | Joint: interlocking | Note: Upper stretcher connecting Leg 01 and Leg 02.
* **Stretcher 05 -> Leg 02 & Leg 03** | Joint: interlocking | Note: Upper stretcher connecting Leg 02 and Leg 03.
* **Stretcher 06 -> Leg 03 & Leg 01** | Joint: interlocking | Note: Upper stretcher connecting Leg 03 and Leg 01.
* **Seat Panel -> All Leg Components** | Joint: Support Base | Note: Acts as the core hub; all leg connection sockets generated via boolean cut.
