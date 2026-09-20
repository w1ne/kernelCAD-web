# cnc_table_study_shelf (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a study table with panel legs, a lower shelf, and a simple center stretcher designed for flat-pack CNC wood manufacturing.

## Geometry and Dimensions
Approx. 1360.0 mm × 660.0 mm × 742.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing work surface for studying, writing, and supporting computer equipment.

## Structural Features
Top panel; left leg panel; right leg panel; center stretcher; lower shelf.

## Special Requirements
Keep assembly split unchanged. Ensure all internal corners for mortises account for CNC tool radius offsets (dog-bones or overcuts) if machined physically.

## Planned Component Quantity
5

## Component Names
- Top panel
- Left leg panel
- Right leg panel
- Center stretcher
- Lower shelf

## Adjustable Parameters
- **width**: 1360.0 (1260.0 ~ 1500.0 mm). Overall width of the table top.
- **depth**: 660.0 (560.0 ~ 800.0 mm). Overall depth of the table top.
- **height**: 742.0 (682.0 ~ 822.0 mm). Total height of the table from the ground to the top surface.
- **top_thickness**: 22.0 (16.0 ~ 30.0 mm). Thickness of the main work surface, ensuring adequate load-bearing stiffness.
- **support_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the leg panels and structural supports.
- **support_depth**: 520.0 (420.0 ~ 660.0 mm). Depth of the leg panels, providing anti-overturning stability in the Y-Z plane.
- **support_span**: 960.0 (860.0 ~ 1100.0 mm). Distance between the left and right leg panels.
- **corner_radius**: 12.0 (0.0 ~ 32.0 mm). Radius for the rounded corners of the top panel to prevent sharp edge injuries.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Width of the tenon tabs for assembly joints.
- **stretcher_z**: 108.0 (48.0 ~ 188.0 mm). Vertical position of the center stretcher from the ground.
- **stretcher_depth**: 68.0 (100.0 ~ 208.0 mm). Depth (width) of the center stretcher.
- **stretcher_height**: 54.0 (40.0 ~ 134.0 mm). Height of the center stretcher.
- **shelf_z**: 178.0 (118.0 ~ 258.0 mm). Vertical position of the lower shelf from the ground.
- **shelf_depth**: 360.0 (260.0 ~ 500.0 mm). Depth of the lower shelf.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the lower shelf panel.

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
The primary work surface of the table.
* **Component Purpose**: Acts as the main horizontal load-bearing surface and provides localization references (mortise slots) for the leg panels.
* **Assembly Direction**: Placed downwards along the -Z axis onto the leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). The bottom face features mortise slots to receive the top tabs of the leg panels.

### 2. Left Leg Panel
The left vertical support structure.
* **Component Purpose**: Transfers the table load to the ground, ensuring stability. Provides mortise slots for the stretcher and lower shelf.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top tabs (tenons) that fit into the top panel, and mortise slots on its inner face for horizontal components.

### 3. Right Leg Panel
The right vertical support structure.
* **Component Purpose**: Transfers the table load to the ground, ensuring stability. Provides mortise slots for the stretcher and lower shelf.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top tabs (tenons) that fit into the top panel, and mortise slots on its inner face for horizontal components.

### 4. Center Stretcher
The primary horizontal structural tie.
* **Component Purpose**: Connects the left and right leg panels near the base to prevent racking and ensure lateral stability in the X-Z plane.
* **Assembly Direction**: Horizontal insertion along the X axis between the leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenon tabs that insert into the corresponding slots on the leg panels.

### 5. Lower Shelf
The secondary horizontal surface.
* **Component Purpose**: Provides additional storage space below the main table top and acts as a secondary structural tie to reinforce the leg panels.
* **Assembly Direction**: Horizontal insertion along the X axis between the leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Both ends feature tenon tabs that insert into the corresponding slots on the leg panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **Left Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tabs inserted into top panel's left slots.
* **Right Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tabs inserted into top panel's right slots.
* **Center Stretcher -> Left Leg Panel** | Joint: interlocking | Note: Stretcher left tab inserted into left leg's lower slot.
* **Center Stretcher -> Right Leg Panel** | Joint: interlocking | Note: Stretcher right tab inserted into right leg's lower slot.
* **Lower Shelf -> Left Leg Panel** | Joint: interlocking | Note: Shelf left tabs inserted into left leg's middle slots.
* **Lower Shelf -> Right Leg Panel** | Joint: interlocking | Note: Shelf right tabs inserted into right leg's middle slots.
