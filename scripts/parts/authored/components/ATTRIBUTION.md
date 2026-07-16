# Component 3D Model Attribution

The STEP files in this directory are **build inputs** used to compose authored
kernelCAD board models (via `lib.fromSTEP`). They are **not** MIT-licensed like
the rest of this repository — they are redistributed component 3D models from the
KiCad project and carry their own license.

## Source

- **Project:** KiCad Libraries — `kicad-packages3D`
- **Upstream repo:** https://gitlab.com/kicad/libraries/kicad-packages3D
- **Base raw URL:** https://gitlab.com/kicad/libraries/kicad-packages3D/-/raw/master/

## License

**CC-BY-SA-4.0 with the KiCad library exception.**

The KiCad libraries are licensed under the Creative Commons CC-BY-SA-4.0 license,
with an exception granting the right to use the library models in your own designs
and outputs without the outputs being considered derivative works. See:
https://www.kicad.org/libraries/license/

Any board model that embeds this component geometry (e.g.
`scripts/parts/authored/esp32-devkit-board.kcad.ts`) is therefore distributed as
**CC-BY-SA-4.0**, not MIT. These component files are segregated into this
directory so the licensing boundary is explicit; the remainder of the repository
remains MIT.

## Per-file mapping (local name ← upstream path under the base URL above)

| Local file              | Upstream path                                                            |
|-------------------------|--------------------------------------------------------------------------|
| `usb_micro_b.step`      | `Connector_USB.3dshapes/USB_Micro-B_Molex_47346-0001.step`               |
| `usb_c.step`            | `Connector_USB.3dshapes/USB_C_Receptacle_GCT_USB4085.step`               |
| `pinheader_1x19.step`   | `Connector_PinHeader_2.54mm.3dshapes/PinHeader_1x19_P2.54mm_Vertical.step`|
| `button_tht_6mm.step`   | `Button_Switch_THT.3dshapes/SW_PUSH_6mm.step`                            |
| `crystal_smd_3225.step` | `Crystal.3dshapes/Crystal_SMD_3225-4Pin_3.2x2.5mm.step`                  |
| `sot223.step`           | `Package_TO_SOT_SMD.3dshapes/SOT-223.step`                              |
| `led_0805.step`         | `LED_SMD.3dshapes/LED_0805_2012Metric.step`                            |
| `esp32_wroom32.step`    | `RF_Module.3dshapes/ESP32-WROOM-32.step`                                |

Units: all files are in millimetres (kernelCAD is millimetre-native; no scaling
is applied on import).
