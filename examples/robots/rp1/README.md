# RP1.3.4 placed from the SolidWorks assembly

`rp1-7dof.kcad.ts` places the manufacturing STEP parts with the component
transforms read from `RP1.3.4整机.SLDASM`. Each `swTransform` is a rigid pose.
Translation in that file is metres. The script converts it to millimetres, rotates
the part about its origin, then translates it.

`./parts/` is a local link to those STEP files. It is not in git.

Left out of the script:

- `YCL.M000663` does not import. OCCT rejects the STEP file.
- A few STEP files contain points hundreds of metres from the solid. They are
  omitted so the mesh does not explode. That set includes the front and rear hip
  shells `YCL.M000229` and `YCL.M000230`.
- Parts with no STEP file in the manufacturing tree are absent.

The script does not add revolute mates yet. The parts are in the assembly pose.
A render of eight link parts (feet, forearms, wrists, waist, hip sides) shows
those parts separated in that pose. It is not a closed view of the whole robot.
The large shells are the parts omitted above.
