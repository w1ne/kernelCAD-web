---
title: Import a native SolidWorks part
summary: Bring a local .sldprt into KernelCAD as validated B-rep geometry with the existing STEP reader.
date: 2026-11-26
kind: guide
status: published
---

KernelCAD can import a native SolidWorks part (`.sldprt`) on a Node host. It
uses the external [`cadmpeg` command](https://github.com/cadmpeg/cadmpeg),
which translates the file to STEP. KernelCAD then imports and checks that
geometry through its usual OCCT B-rep path. Install cadmpeg 0.6.12 or newer
and make its executable available on `PATH`, or set
`KERNELCAD_CADMPEG_BIN` to the executable path.

```ts
const bracket = await lib.fromNativeCAD('parts/bracket.sldprt');
return bracket.translate(0, 0, 10);
```

Relative file paths resolve from the `.kcad.ts` source directory. If a part
contains multiple solids, `opts.solid` selects one zero-based body; omit it to
keep all imported bodies.

The same converter is available through the project-bundle command:

```bash
kernelcad import-step parts/bracket.sldprt --out ./bracket-import
```

The output contains a `.kcad.ts` project, a manifest with the original file
hash and converter version, and validated native `.brep` assets. The existing
`import_step` MCP tool also accepts an attached or downloaded `.sldprt` and
writes a starter script.

This route translates geometry. It does not recreate SolidWorks feature
history, PMI, assembly relations, or mates. Native assemblies (`.sldasm`) and
other native CAD formats are refused by this path. The file must convert to a
readable STEP B-rep with at least one valid solid; unsupported and malformed
files fail with a diagnostic, and there is no mesh fallback. Save assemblies
and other native formats as STEP AP214 or AP242. Use `kernelcad import-step`
for a STEP assembly hierarchy and `lib.fromSTEP` for a single local part.

## Measured example

The [demo bundle](../demos/native-cad-import/README.md) imports the NIST
FTC-06 SolidWorks part with cadmpeg 0.6.12 and compares it to NIST's STEP
geometry twin. Both imports produce one valid solid and their bounds agree to
under 0.01 mm per face. The measured volumes differ by 11.15 mm³ on a
3,323,557 mm³ part. This is one fixture result, not a guarantee for every
SolidWorks document.

The test fixture is a U.S. Government work in the public domain; its source and
checksums are recorded in
[`tests/fixtures/native-cad-import/README.md`](../../tests/fixtures/native-cad-import/README.md).
