# Importing CAD files with `lib.fromCAD`

`lib.fromCAD(path)` reads a CAD file by its extension and returns one B-rep shape.
Downstream features (fillet, boolean, shell, face queries) work on it the same way
they work on a `lib.fromSTEP` result.

```ts
const robot = await lib.fromCAD('./parts/robot.FCStd');
return robot.color('#a8b3bd');
```

| Extension | How it is read |
| --- | --- |
| `.step`, `.stp` | Native. Same as `lib.fromSTEP`. |
| `.brep` | Native. Same as `lib.fromBREP`. |
| `.FCStd` (FreeCAD) | Native. The document is read directly, with no FreeCAD install. |
| `.x_t`, `.x_b`, `.xt` (Parasolid) | parasolid-kit. It must be on `PATH`, or `PARASOLID_KIT` names the executable. |
| `.sldprt`, `.sldasm` (SolidWorks) | Through a converter you configure (below). |
| `.igs`, `.iges` (IGES) | Through a converter you configure. |

## FreeCAD documents (`.FCStd`)

Each body in the document is imported from its stored shape and placed with its
FreeCAD `Placement`. Bodies are combined into one compound.

- If the file has PartDesign bodies, only the bodies are imported.
- Otherwise the Part workbench results are imported. An object that another object
  links to (a cut's base, for example) is treated as an input and skipped.
- Sketches, datums and other shapeless objects are ignored.

## Parasolid (`.x_t`, `.x_b`)

`lib.fromCAD` runs [parasolid-kit](https://github.com/monozukuri-ai/parasolid-kit),
which writes STEP. kernelCAD then reads that STEP. Pass the file's coordinate
unit; the reader does not infer it. The default is millimetres.

```ts
const part = await lib.fromCAD('./parts/link.x_t', { sourceUnit: 'm' });
```

parasolid-kit accepts an exact built-in schema profile, or a Siemens catalog
you pass it. It does not substitute a nearby profile. A file whose schema key
is outside that set fails with the key named in the error.

## SolidWorks and IGES (converter)

These formats are not read by parasolid-kit. Point
`KERNELCAD_CAD_CONVERTER` at any command that writes a STEP file:

```sh
export KERNELCAD_CAD_CONVERTER='["/path/to/converter","--in","{input}","--out","{output}"]'
```

- The value is a JSON array of strings. It runs without a shell.
- `{input}` and `{output}` are replaced with absolute paths. The output is a STEP file.
- The converter has 15 minutes to run. Its stderr is included in any error.

Without a converter, SolidWorks files can be exported to STEP from SolidWorks itself.
[`solidworks-export-step.bas`](solidworks-export-step.bas) is a VBA macro that exports
a whole `.SLDASM` to one STEP AP214 file. It is untested against every SolidWorks
version, so read the messages it shows if a call fails. Then import the STEP with
`lib.fromSTEP` or `lib.fromCAD`.

## Errors

| Message | Fix |
| --- | --- |
| `unsupported file type` | Use one of the extensions above, or export STEP. |
| `... is not set` | Set `KERNELCAD_CAD_CONVERTER`, or export STEP. |
| `must be a JSON array of strings` | Quote the array in single quotes so the shell keeps the JSON. |
| `the converter failed` | Read the converter's stderr in the message. |
| `wrote no STEP file` | The command must write its output to `{output}`. |
| `not a zip archive` / `no Document.xml` | Re-save the file from FreeCAD as `.FCStd`. |

## Scope and limits

- `.FCStd` support was built against FreeCAD's documented file layout. Files that use
  features outside it may need an adjustment; report the file and its FreeCAD version.
- A SolidWorks assembly converts to one STEP file. Each part keeps the frame it had
  in its own file, so the assembly's joint placement is only as correct as the
  converter's output.
