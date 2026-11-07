# Medical kit

Forty original low-poly props for clinic, hospital, first-aid and laboratory scenes. Sources are individual `.kcad.ts` programs in millimetres, with Z up and `origin: 'base'` on z = 0. Every model is authored in kernelCAD and dedicated to the public domain under CC0 1.0. The models are stylized scene assets; dimensions and forms are not clinical device specifications.

Each source has CC0 metadata, search tags, two to four material-named color controls and a triangle budget. Across the kit, 132 controls now name materials such as upholstery, aluminum, rubber, glass, steel, polymer, paper and gauze. Every asset keeps its `clinic` and `emergency` presets, and the hospital bed, medical cart and specimen tube rack retain their side-rail, shelf-count and tube-count choices.

The [material quality handoff](../../../artifacts/catalog-demos/medical-materials-quality-20261106/README.md) records the per-asset material map, source-driven preset renders, before/after previews, local checks and inspected MP4. The original [medical wave demo](../../../artifacts/catalog-demos/medical-wave-90612/README.md) remains as the initial creation record.

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
