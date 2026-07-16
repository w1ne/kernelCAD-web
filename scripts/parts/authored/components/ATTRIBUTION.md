# Component 3D models — attribution & license

The `.step` files in this directory are real component models used as build
inputs for the authored dev-board `.kcad.ts` models (each board = our own PCB
slab + these components composed via `lib.fromSTEP`). The board `.kcad.ts` files
are original kernelCAD work (MIT); the composed/exported board STEPs are
derivative works and are catalogued as **CC-BY-SA-4.0** because they embed the
geometry below.

## Source: KiCad packages3D (CC-BY-SA-4.0 with the KiCad library exception)

Upstream: <https://gitlab.com/kicad/libraries/kicad-packages3D> (raw base
`.../-/raw/master/`). The KiCad library exception means a *design* that merely
uses these models does not inherit the copyleft; redistributing the model files
themselves (as here) carries CC-BY-SA-4.0 + attribution to the KiCad Libraries.

| local file | upstream path |
|---|---|
| `usb_c.step` | `Connector_USB.3dshapes/USB_C_Receptacle_GCT_USB4085.step` |
| `usb_micro_b.step` | `Connector_USB.3dshapes/USB_Micro-B_Molex_47346-0001.step` |
| `usb_mini_b.step` | `Connector_USB.3dshapes/USB_Mini-B_Lumberg_2486_01_Horizontal.step` |
| `barrel_jack.step` | `Connector_BarrelJack.3dshapes/BarrelJack_CUI_PJ-063AH_Horizontal.step` |
| `rj45.step` | `Connector_RJ.3dshapes/RJ45_Pulse_JK0654219NL_Horizontal.step` |
| `pinheader_1x08.step` | `Connector_PinHeader_2.54mm.3dshapes/PinHeader_1x08_P2.54mm_Vertical.step` |
| `pinheader_1x09.step` | `Connector_PinHeader_2.54mm.3dshapes/PinHeader_1x09_P2.54mm_Vertical.step` |
| `pinheader_1x19.step` | `Connector_PinHeader_2.54mm.3dshapes/PinHeader_1x19_P2.54mm_Vertical.step` |
| `pinheader_2x19.step` | `Connector_PinHeader_2.54mm.3dshapes/PinHeader_2x19_P2.54mm_Vertical.step` |
| `pinheader_2x20.step` | `Connector_PinHeader_2.54mm.3dshapes/PinHeader_2x20_P2.54mm_Vertical.step` |
| `pinsocket_1x06.step` | `Connector_PinSocket_2.54mm.3dshapes/PinSocket_1x06_P2.54mm_Vertical.step` |
| `pinsocket_1x08.step` | `Connector_PinSocket_2.54mm.3dshapes/PinSocket_1x08_P2.54mm_Vertical.step` |
| `pinsocket_1x10.step` | `Connector_PinSocket_2.54mm.3dshapes/PinSocket_1x10_P2.54mm_Vertical.step` |
| `lqfp48.step` | `Package_QFP.3dshapes/LQFP-48_7x7mm_P0.5mm.step` |
| `lqfp64.step` | `Package_QFP.3dshapes/LQFP-64_10x10mm_P0.5mm.step` |
| `lqfp144.step` | `Package_QFP.3dshapes/LQFP-144_20x20mm_P0.5mm.step` |
| `qfn32.step` | `Package_DFN_QFN.3dshapes/QFN-32-1EP_5x5mm_P0.5mm_EP3.45x3.45mm.step` |
| `qfn48.step` | `Package_DFN_QFN.3dshapes/QFN-48-1EP_7x7mm_P0.5mm_EP5.15x5.15mm.step` (nRF52840 aQFN-73 stand-in) |
| `dip28.step` | `Package_DIP.3dshapes/DIP-28_W7.62mm.step` |
| `soic8.step` | `Package_SO.3dshapes/SOIC-8_3.9x4.9mm_P1.27mm.step` |
| `sot223.step` | `Package_TO_SOT_SMD.3dshapes/SOT-223.step` |
| `esp32_wroom32.step` | `RF_Module.3dshapes/ESP32-WROOM-32.step` |
| `esp32_s3_wroom1.step` | `RF_Module.3dshapes/ESP32-S3-WROOM-1.step` |
| `crystal_smd_3225.step` | `Crystal.3dshapes/Crystal_SMD_3225-4Pin_3.2x2.5mm.step` |
| `crystal_hc49.step` | `Crystal.3dshapes/Crystal_HC49-U_Vertical.step` |
| `led_0805.step` | `LED_SMD.3dshapes/LED_0805_2012Metric.step` |
| `led_5050.step` | `LED_SMD.3dshapes/LED_RGB_5050-6.step` (WS2812-class RGB) |
| `button_tht_6mm.step` | `Button_Switch_THT.3dshapes/SW_PUSH_6mm.step` |

## Not from KiCad packages3D (hand-modeled placeholders, noted in-model)

Where no clean real STEP exists, the board model uses a simple primitive box,
clearly a stand-in (not presented as a fetched real part):
- **USB Type-B** (Arduino Uno) — KiCad has no THT Type-B receptacle; a silver box.
- **Ceramic chip antennas** (ESP32-C3 SuperMini) — small off-white box.
- **BOOT/RESET SMD tactiles** on the tiny boards (C3-SuperMini, S3-Zero) — the
  6mm THT button is too large, so small boxes stand in.
- **Coin-cell holders** (nRF52840-DK, KW41Z) — modeled cylinder/box.
