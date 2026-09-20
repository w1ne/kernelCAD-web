# cnc_table_workbench_wide (imported from the MUSE text-to-CAD benchmark)

Build the following design as a kernelCAD `.kcad.ts` script. Millimetres, Z-up, degrees.

If the specification calls for multiple independent components, return a
multi-part model — one solid per named component — and preserve the
component count, proportions, and assembly intent from the specification.

## Design Specification

# Design Specification

## Design Goal
Construct a wide, heavy-duty wooden workbench featuring panel legs, a center stretcher, and a lower utility shelf, designed for CNC-machined flat-pack assembly.

## Geometry and Dimensions
Approx. 1800.0 mm × 760.0 mm × 760.0 mm.

## Material
Timber

## Manufacturing Method
CNC Milling

## Connection Method (Joint Type)
interlocking

## Mechanical Condition
Load-bearing work surface and utility storage; suitable for workshop or heavy-duty multi-purpose tasks.

## Structural Features
Top panel; two leg panels (left and right); center stretcher; lower shelf; front apron; rear apron.

## Special Requirements
Keep assembly split unchanged. All tab-and-slot (mortise and tenon) features must maintain appropriate tolerances for interference fitting without requiring external hardware.

## Planned Component Quantity
7

## Component Names
- top_panel
- left_leg_panel
- right_leg_panel
- center_stretcher
- lower_shelf
- front_apron
- rear_apron

## Adjustable Parameters
- **width**: 1800.0 (1700.0 ~ 1940.0 mm). Determines the overall span of the workbench.
- **depth**: 760.0 (660.0 ~ 900.0 mm). Determines the working surface depth.
- **height**: 760.0 (700.0 ~ 840.0 mm). Ergonomic height for a standing or seated work table.
- **top_thickness**: 24.0 (18.0 ~ 32.0 mm). Ensures sufficient load-bearing capacity and stiffness for the main work surface.
- **support_thickness**: 18.0 (12.0 ~ 26.0 mm). Thickness of the vertical legs and structural panels.
- **support_depth**: 600.0 (500.0 ~ 740.0 mm). Depth of the leg panels, providing front-to-back stability.
- **support_span**: 1220.0 (1120.0 ~ 1360.0 mm). Distance between the two leg panels, defining the unsupported span of the top panel.
- **corner_radius**: 0.0 (0.0 ~ 20.0 mm). Controls the edge rounding of the top panel for safety.
- **tab_width**: 20.0 (100.0 ~ 160.0 mm). Width of the mortise and tenon joints connecting the panels.
- **stretcher_z**: 108.0 (48.0 ~ 188.0 mm). Vertical position of the center stretcher from the ground.
- **shelf_z**: 180.0 (120.0 ~ 260.0 mm). Vertical position of the lower utility shelf.
- **apron_z**: 620.0 (560.0 ~ 700.0 mm). Vertical position of the aprons supporting the top panel.

## Component Details

**Global Output Requirements**
1. The component must remain an independent geometric body.
2. The exported STEP must remain a closed solid.

**Global Modeling Steps**
1. Build the main profile of the part based on the original script.
2. Complete key features like holes, slots, lofts, or chamfers.
3. Place the part back in its original position within the sample assembly.

---

### 1. top_panel
The main horizontal work surface of the workbench.
* **Component Purpose**: Provides the primary load-bearing area for work tasks and acts as the upper locking hub for the leg panels and aprons.
* **Assembly Direction**: Pressed downwards along the -Z axis onto the leg panels and aprons.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Features rectangular mortises (slots) on its underside to receive the tenons from the legs and aprons.

### 2. left_leg_panel
The left vertical supporting entity.
* **Component Purpose**: Transfers the load from the top panel to the ground. Features cutouts (windows) to reduce weight and slots to receive the horizontal stretchers, shelves, and aprons.
* **Assembly Direction**: Vertical support, positioned on the left side of the assembly.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top edge features tenons that insert into the top panel; face features slots for horizontal components.

### 3. right_leg_panel
The right vertical supporting entity.
* **Component Purpose**: Transfers the load from the top panel to the ground. Mirrors the left leg panel in function and connectivity.
* **Assembly Direction**: Vertical support, positioned on the right side of the assembly.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Top edge features tenons that insert into the top panel; face features slots for horizontal components.

### 4. center_stretcher
The lower horizontal stabilizing beam.
* **Component Purpose**: Connects the lower portion of the leg panels to prevent lateral racking and increase overall structural stability.
* **Assembly Direction**: Inserted horizontally along the X axis between the left and right leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Ends feature tenons that lock into the lower slots of the leg panels.

### 5. lower_shelf
The horizontal utility panel.
* **Component Purpose**: Provides utility storage space beneath the main work surface and acts as an additional structural tie between the legs.
* **Assembly Direction**: Inserted horizontally along the X axis between the left and right leg panels.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Ends feature tenons that lock into the mid-lower slots of the leg panels.

### 6. front_apron
The front vertical support beam under the top panel.
* **Component Purpose**: Prevents the top panel from sagging under heavy loads and adds lateral stability to the upper frame.
* **Assembly Direction**: Inserted horizontally along the X axis between the leg panels, interfacing with the underside of the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Ends insert into the leg panels; top edge features tenons that insert into the top panel.

### 7. rear_apron
The rear vertical support beam under the top panel.
* **Component Purpose**: Mirrors the front apron, preventing top panel sag and adding lateral stability to the rear of the upper frame.
* **Assembly Direction**: Inserted horizontally along the X axis between the leg panels, interfacing with the underside of the top panel.
* **Connection & Kinematics**: interlocking (Rigid when interference-fitted). Ends insert into the leg panels; top edge features tenons that insert into the top panel.

---

## Component Assembly Graph (Textual)
* **left_leg_panel -> top_panel** | Joint: interlocking | Note: Leg top tenons inserted into the top panel's left-side slots.
* **right_leg_panel -> top_panel** | Joint: interlocking | Note: Leg top tenons inserted into the top panel's right-side slots.
* **center_stretcher -> left_leg_panel & right_leg_panel** | Joint: interlocking | Note: Stretcher ends inserted into the lower slots of both leg panels.
* **lower_shelf -> left_leg_panel & right_leg_panel** | Joint: interlocking | Note: Shelf ends inserted into the mid-level slots of both leg panels.
* **front_apron -> left_leg_panel & right_leg_panel** | Joint: interlocking | Note: Apron ends inserted into the upper-front slots of both leg panels.
* **rear_apron -> left_leg_panel & right_leg_panel** | Joint: interlocking | Note: Apron ends inserted into the upper-rear slots of both leg panels.
* **front_apron & rear_apron -> top_panel** | Joint: interlocking | Note: Apron top tenons inserted into the top panel's underside slots.
