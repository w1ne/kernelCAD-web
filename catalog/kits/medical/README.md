# Medical kit

Forty original low-poly props for clinic, hospital, first-aid and laboratory scenes. Sources are individual `.kcad.ts` programs in millimetres, with Z up and `origin: 'base'` on z = 0. Every model is authored in kernelCAD and dedicated to the public domain under CC0 1.0. The models are stylized scene assets; dimensions and forms are not clinical device specifications.

Each source has CC0 metadata, search tags, two editable color knobs and a triangle budget. The hospital bed, medical cart and specimen tube rack also expose choice knobs for side rails, shelf count and tube count. Useful presets are included for clinic and emergency palettes.

Workflow source, verification records and the inspected MP4 are in the [medical wave demo bundle](../../../artifacts/catalog-demos/medical-wave-90612/README.md).

| id | asset |
| --- | --- |
| `exam-table` | Examination table |
| `hospital-bed` | Hospital bed |
| `bedside-cabinet` | Bedside cabinet |
| `medical-cart` | Medical cart |
| `instrument-trolley` | Instrument trolley |
| `wheelchair` | Wheelchair |
| `walker-frame` | Walker frame |
| `forearm-crutches` | Forearm crutches |
| `walking-cane` | Walking cane |
| `iv-stand` | IV stand |
| `oxygen-cylinder` | Oxygen cylinder |
| `pulse-oximeter` | Pulse oximeter |
| `blood-pressure-monitor` | Blood pressure monitor |
| `stethoscope` | Stethoscope |
| `otoscope` | Otoscope |
| `digital-thermometer` | Digital thermometer |
| `reflex-hammer` | Reflex hammer |
| `tongue-depressor-pack` | Tongue depressor pack |
| `surgical-scissors` | Surgical scissors |
| `forceps` | Forceps |
| `syringe` | Syringe |
| `bandage-roll` | Bandage roll |
| `gauze-pads` | Gauze pads |
| `adhesive-bandage-box` | Adhesive bandage box |
| `first-aid-kit` | First aid kit |
| `sharps-container` | Sharps container |
| `pill-bottle` | Pill bottle |
| `pill-blister-pack` | Pill blister pack |
| `specimen-cup` | Specimen cup |
| `specimen-tube-rack` | Specimen tube rack |
| `blood-collection-tube` | Blood collection tube |
| `microscope` | Microscope |
| `centrifuge` | Laboratory centrifuge |
| `lab-incubator` | Laboratory incubator |
| `erlenmeyer-flask` | Erlenmeyer flask |
| `petri-dish` | Petri dish |
| `diagnostic-monitor` | Diagnostic monitor |
| `defibrillator` | Automated defibrillator |
| `nebulizer` | Nebulizer |
| `examination-light` | Examination light |

## Check and preview

```sh
npx tsx scripts/checkCatalogAsset.ts catalog/kits/medical/stethoscope.kcad.ts --png /tmp/stethoscope.png
npm run catalog:build
npm run catalog:previews
npm run catalog:pages -- /tmp/kernelcad-catalog-pages
```

## Licence and provenance

All `.kcad.ts` sources and exports from this kit are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is modeled from scratch in kernelCAD. No downloaded, traced, converted or decimated meshes, textures or palettes are included.
