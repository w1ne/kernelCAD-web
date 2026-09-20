# laptop_stand_1 (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a modular, interlocking laptop stand designed to elevate the device at an ergonomic viewing angle while providing structural support and heat dissipation space.

## Geometry and Dimensions
Approx. 30.0 mm × 200.0 mm × 85.0 mm.

## Material
ABS

## Manufacturing Method
3D Printing

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Static load-bearing support for a laptop computer, subject to mild thermal output from the device.

## Structural Features
Main cradle body; upper support insert; lower support insert.

## Special Requirements
Keep assembly split unchanged. Maintain the 0.2 mm insert clearance to ensure proper fitment of the printed interlocking parts.

## Planned Component Quantity
3

## Component Names
- upper_support_insert
- lower_support_insert
- main_cradle_body

## Adjustable Parameters
- **support_angle_deg**: 20 (5.0 ~ 35.0). Controls the ergonomic tilt angle of the laptop support surface.
- **holder_height**: 15 (5.0 ~ 40.0 mm). Determines the height of the front retaining lip to prevent the laptop from sliding off.
- **holder_width**: 10 (4.0 ~ 30.0 mm). Sets the depth/thickness of the front retaining lip for adequate edge grip.
- **support_thickness**: 30 (10.0 ~ 60.0 mm). Controls the overall extrusion width of the stand, directly affecting its footprint and lateral stability.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. upper_support_insert
The top extension module of the stand.
* **Component Purpose**: Acts as the upper contact point for the laptop, interlocking with the main body to extend the support surface.
* **Assembly Direction**: Inserted along the section plane normal into the main cradle body.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features a lofted tenon that fits into the corresponding mortise of the main body.

### 2. lower_support_insert
The bottom extension and retaining module of the stand.
* **Component Purpose**: Provides the front retaining lip (`holder_height` and `holder_width`) to secure the lower edge of the laptop, preventing it from sliding down the angled slope.
* **Assembly Direction**: Inserted along the section plane normal into the main cradle body.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features a lofted tenon that fits into the corresponding mortise of the main body.

### 3. main_cradle_body
The central structural hub of the stand.
* **Component Purpose**: Bridges the upper and lower inserts, bearing the primary weight of the laptop and transferring the load to the resting surface.
* **Assembly Direction**: Fixed base component.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Contains boolean-cut sockets (mortises) with a 0.2 mm clearance to receive the tenons from the upper and lower inserts.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 3-component model:

* **upper_support_insert -> main_cradle_body** | Joint: interlocking | Note: Insert's lofted tenon is inserted into the upper socket of the main cradle body.
* **lower_support_insert -> main_cradle_body** | Joint: interlocking | Note: Insert's lofted tenon is inserted into the lower socket of the main cradle body.
