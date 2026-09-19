# cnc_table_square_side (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a square side table with a centered lower shelf and compact panel legs, designed for CNC-machined wood assembly.

## Geometry and Dimensions
Approx. 620.0 mm × 620.0 mm × 560.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing storage and display (side table usage).

## Structural Features
Top panel; left leg panel; right leg panel; center stretcher; lower shelf.

## Special Requirements
Keep assembly split unchanged.

## Planned Component Quantity
5

## Component Names
- Top panel
- Left leg panel
- Right leg panel
- Center stretcher
- Lower shelf

## Adjustable Parameters
- **width**: 620.0 (520.0 ~ 760.0 mm). Determines the overall width of the table top.
- **depth**: 620.0 (520.0 ~ 760.0 mm). Determines the overall depth of the table top.
- **height**: 560.0 (500.0 ~ 640.0 mm). Determines the overall height of the table.
- **top_thickness**: 22.0 (16.0 ~ 30.0 mm). Thickness of the top panel, ensuring adequate load-bearing capacity.
- **support_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the leg panels and structural supports.
- **support_depth**: 420.0 (320.0 ~ 560.0 mm). Depth of the vertical leg panels.
- **support_span**: 360.0 (260.0 ~ 500.0 mm). Distance between the left and right leg panels.
- **corner_radius**: 14.0 (2.0 ~ 34.0 mm). Radius of the rounded corners on the top panel for safety and aesthetics.
- **tab_width**: 18.0 (100.0 ~ 158.0 mm). Width of the connection tabs (tenons) for assembly.
- **stretcher_z**: 86.0 (40.0 ~ 166.0 mm). Vertical position of the center stretcher from the ground.
- **stretcher_depth**: 60.0 (100.0 ~ 200.0 mm). Depth of the center stretcher.
- **stretcher_height**: 48.0 (40.0 ~ 128.0 mm). Height of the center stretcher.
- **shelf_z**: 146.0 (86.0 ~ 226.0 mm). Vertical position of the lower shelf from the ground.
- **shelf_depth**: 280.0 (180.0 ~ 420.0 mm). Depth of the lower shelf.
- **shelf_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the lower shelf.

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
The main horizontal surface of the table.
* **Component Purpose**: Acts as the primary load-bearing surface for placing items and serves as the top structural hub connecting the leg panels.
* **Assembly Direction**: Fixed top component, positioned at absolute $Z = height$.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted; potential micro-sliding if loose). Features through-slots (mortises) to receive the top tabs of the leg panels.

### 2. Left Leg Panel
The left vertical support entity.
* **Component Purpose**: Vertical support. Transfers the table load to the ground and provides structural slots for the stretcher and lower shelf.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top tenons for the top panel, and mortises for the stretcher and shelf.

### 3. Right Leg Panel
The right vertical support entity.
* **Component Purpose**: Vertical support. Transfers the table load to the ground and provides structural slots for the stretcher and lower shelf.
* **Assembly Direction**: Inserted upwards along the +Z axis into the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features top tenons for the top panel, and mortises for the stretcher and shelf.

### 4. Center Stretcher
The lower structural tie.
* **Component Purpose**: Horizontal structural beam connecting the lower parts of the legs to prevent lateral sway and increase overall rigidity.
* **Assembly Direction**: Horizontal insertion along the X axis between the leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features end tenons that fit into the corresponding lower slots of the leg panels.

### 5. Lower Shelf
The secondary horizontal surface.
* **Component Purpose**: Provides additional storage space and acts as a secondary structural tie between the legs.
* **Assembly Direction**: Horizontal insertion along the X axis between the leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features end tenons that fit into the corresponding middle slots of the leg panels.

---

## Component Assembly Graph (Textual)
Based on the logical mapping of the 5-component model:

* **Left Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tenons inserted into top panel's left slots.
* **Right Leg Panel -> Top Panel** | Joint: interlocking | Note: Leg top tenons inserted into top panel's right slots.
* **Center Stretcher -> Left Leg Panel** | Joint: interlocking | Note: Stretcher left tenon inserted into left leg's lower slot.
* **Center Stretcher -> Right Leg Panel** | Joint: interlocking | Note: Stretcher right tenon inserted into right leg's lower slot.
* **Lower Shelf -> Left Leg Panel** | Joint: interlocking | Note: Shelf left tenon inserted into left leg's middle slot.
* **Lower Shelf -> Right Leg Panel** | Joint: interlocking | Note: Shelf right tenon inserted into right leg's middle slot.
