# cnc_table_dining_trestle (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a dining trestle table with two panel legs and a low center stretcher designed for wood-based CNC assembly.

## Geometry and Dimensions
Approx. 1600.0 mm × 820.0 mm × 750.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Multi-person dining and load-bearing surface.

## Structural Features
Top panel; left leg panel; right leg panel; center stretcher.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
4

## Component Names
- Top panel
- Left leg panel
- Right leg panel
- Center stretcher

## Adjustable Parameters
- **width**: 1600.0 (1500.0 ~ 1740.0 mm). Determines the overall length of the table surface.
- **depth**: 820.0 (720.0 ~ 960.0 mm). Determines the front-to-back depth of the table top.
- **height**: 750.0 (690.0 ~ 830.0 mm). Standard dining table height for ergonomic seating.
- **top_thickness**: 24.0 (18.0 ~ 32.0 mm). Ensures load-bearing stiffness for the main dining surface.
- **support_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the leg panels and stretcher, ensuring structural stability.
- **support_depth**: 620.0 (520.0 ~ 760.0 mm). Depth of the leg panels at the base to prevent tipping in the Y-axis.
- **support_span**: 1040.0 (940.0 ~ 1180.0 mm). Distance between the two leg panels, defining the seating clearance underneath.
- **corner_radius**: 18.0 (6.0 ~ 38.0 mm). Rounds the corners of the top panel for safety and aesthetics.
- **tab_width**: 20.0 (100.0 ~ 160.0 mm). Width of the tenons for assembly joints, determining the bite area of the physical connections.
- **stretcher_z**: 112.0 (52.0 ~ 192.0 mm). Vertical position of the center stretcher from the ground.
- **stretcher_depth**: 72.0 (100.0 ~ 212.0 mm). Width/depth of the stretcher beam.
- **stretcher_height**: 56.0 (40.0 ~ 136.0 mm). Height of the stretcher beam for longitudinal rigidity.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. Top Panel
The central functional surface of the table.
* **Component Purpose**: Acts as the main load-bearing dining surface and provides localization references and mechanical interfaces (mortises/slots) for the leg panels.
* **Assembly Direction**: Fixed top component, positioned horizontally at absolute $Z = height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Bottom features slots to receive the top tabs of the leg panels.

### 2. Left Leg Panel
The left supporting entity of the table.
* **Component Purpose**: Vertical support. Transfers the table load to the ground, ensuring anti-overturning stability in the Y-Z plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features tabs (tenons) that interference-fit into the bottom slots of the top panel. The inner face features a slot to receive the center stretcher.

### 3. Right Leg Panel
The right supporting entity of the table.
* **Component Purpose**: Vertical support. Transfers the table load to the ground, ensuring anti-overturning stability in the Y-Z plane.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top features tabs (tenons) that interference-fit into the bottom slots of the top panel. The inner face features a slot to receive the center stretcher.

### 4. Center Stretcher
The horizontal tie beam connecting the two legs.
* **Component Purpose**: Prevents the leg panels from splaying and adds longitudinal rigidity to the table structure.
* **Assembly Direction**: Inserted horizontally along the X axis between the left and right leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tabs (tenons) that insert into the corresponding slots on the inner faces of the leg panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 4-component model:

* **Left Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tabs inserted into top panel's left slots.
* **Right Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tabs inserted into top panel's right slots.
* **Center Stretcher -> Left Leg Panel** | Joint: interlocking | Note: Stretcher left tab inserted into left leg panel's inner slot.
* **Center Stretcher -> Right Leg Panel** | Joint: interlocking | Note: Stretcher right tab inserted into right leg panel's inner slot.
