#!/usr/bin/env python3
"""Promote each existing medical asset from generic shell/accent controls to materials."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/medical"

# (parameter, label, default, clinic, emergency, part-name prefixes)
SPECS = {
    "adhesive-bandage-box": (
        "A paperboard first-aid carton reads through its red medical cross and the cotton dressings visible above it.",
        [
            ("paperboard", "Paperboard carton", "#f4f0e6", "#f5f2ea", "#e8e0d1", ("carton",)),
            ("cottonGauze", "Cotton gauze", "#e8ddc5", "#f4eee0", "#ded2bc", ("dressing", "pad")),
            ("medicalInk", "Printed medical ink", "#c8403a", "#2d8b84", "#c9413b", ("cross-",)),
        ],
    ),
    "bandage-roll": (
        "A rolled gauze cylinder exposes its hollow cardboard core and a loose wrapped tail.",
        [
            ("cottonGauze", "Cotton gauze", "#e8e1cf", "#f4f1e6", "#e8e1cf", ("roll",)),
            ("compressionWrap", "Compression gauze", "#cbb994", "#d9cfb7", "#cbb994", ("wrap-end",)),
            ("cardboard", "Cardboard core", "#936b43", "#a47e54", "#855d3c", ("inner-core",)),
        ],
    ),
    "bedside-cabinet": (
        "A two-drawer bedside cabinet has a wipe-clean painted body, a laminate top and metal pulls.",
        [
            ("paintedSteel", "Painted steel", "#e8ecee", "#f1f3f4", "#ebe8df", ("cabinet-body", "drawer-", "plinth")),
            ("laminate", "Laminate top", "#d3c9b7", "#d9d1c3", "#c6b9a5", ("top",)),
            ("stainlessSteel", "Stainless-steel pulls", "#aab4b7", "#b7c0c2", "#aaaeb0", ("pull-",)),
        ],
    ),
    "blood-collection-tube": (
        "A specimen tube pairs a clear polymer barrel with a color-coded stopper and a paper label band.",
        [
            ("clearPolymer", "Clear polymer", "#d7e4e4", "#cde5e2", "#d7e0e2", ("tube",)),
            ("rubberStopper", "Rubber stopper", "#855b9a", "#4b8c88", "#c8403a", ("cap",)),
            ("labelPaper", "Label paper", "#f2eee3", "#f4f1e7", "#eee7dc", ("label-band",)),
        ],
    ),
    "blood-pressure-monitor": (
        "A portable pressure monitor separates its molded case, dark display, fabric cuff and flexible tube.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#e9eef0", "#f1f3f4", "#ebe8df", ("monitor", "button-")),
            ("displayGlass", "Display glass", "#29484b", "#2b6564", "#33474b", ("screen",)),
            ("cuffFabric", "Cuff fabric", "#397c86", "#2d9893", "#c9413b", ("cuff",)),
            ("siliconeRubber", "Silicone and rubber", "#66777b", "#708486", "#665f5e", ("foot-", "tube")),
        ],
    ),
    "centrifuge": (
        "A benchtop centrifuge has a domed polycarbonate lid, a front display and rubber feet.",
        [
            ("paintedSteel", "Painted steel", "#dfe5e6", "#e9edee", "#e6e1d9", ("base", "panel", "button-")),
            ("clearPolycarbonate", "Clear polycarbonate", "#75aeb0", "#83c3bd", "#8db3b1", ("lid",)),
            ("displayGlass", "Display glass", "#24494d", "#2f7774", "#415558", ("display",)),
            ("rubber", "Rubber feet", "#384347", "#485356", "#494748", ("foot-",)),
        ],
    ),
    "defibrillator": (
        "A portable defibrillator combines a molded case with a legible screen and paired rubber electrode pads.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#e9ecec", "#f1f3f4", "#ebe8df", ("case", "handle-")),
            ("displayGlass", "Display glass", "#214b50", "#2d7772", "#384c50", ("screen",)),
            ("siliconeRubber", "Silicone electrode pads", "#c94d43", "#2d9893", "#c9413b", ("pad-", "button")),
        ],
    ),
    "diagnostic-monitor": (
        "A patient monitor is identifiable by its wide glass display, upright metal stand and tactile controls.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#4d5a62", "#edf1f2", "#e9e6de", ("base", "bezel", "control-strip")),
            ("displayGlass", "Display glass", "#21888d", "#2d9893", "#c9413b", ("screen",)),
            ("anodizedAluminum", "Anodized aluminum", "#87969a", "#a9b5b8", "#9d9d97", ("stem",)),
            ("rubber", "Rubber controls", "#30383c", "#526368", "#54504c", ("button-",)),
        ],
    ),
    "digital-thermometer": (
        "A handheld thermometer has a slim polymer body, inset readout and stainless probe tip.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#e4e9eb", "#f1f3f4", "#ebe8df", ("body", "button")),
            ("displayGlass", "Display glass", "#315d62", "#318884", "#9c4f48", ("display",)),
            ("stainlessSteel", "Stainless-steel probe", "#b7c0c2", "#c1c9cb", "#b7b9b7", ("probe",)),
            ("silicone", "Silicone end cap", "#4d9ca0", "#64aaa5", "#c9413b", ("end-cap",)),
        ],
    ),
    "erlenmeyer-flask": (
        "A laboratory flask has a broad conical body, narrow neck and visible liquid and graduation marks.",
        [
            ("borosilicateGlass", "Borosilicate glass", "#b8d6d1", "#c3dfda", "#c7d8d5", ("flask-body", "rim")),
            ("solution", "Liquid solution", "#4b8790", "#56a49b", "#cf7663", ("liquid-window",)),
            ("graduationInk", "Graduation ink", "#315357", "#43716d", "#704f4b", ("graduation-",)),
        ],
    ),
    "exam-table": (
        "An examination table reads through its padded vinyl top, steel legs and separate paper roll.",
        [
            ("vinylUpholstery", "Vinyl upholstery", "#edf0f2", "#f4f4f0", "#eee9e1", ("padded-top", "head-cushion")),
            ("powderCoatedSteel", "Powder-coated steel", "#63727a", "#78878c", "#77736d", ("underframe", "leg-")),
            ("stainlessSteel", "Stainless-steel paper bar", "#aeb8ba", "#bac3c5", "#aeb2b2", ("paper-bar",)),
        ],
    ),
    "examination-light": (
        "A mobile examination lamp has a wheeled steel base, articulated arm and glass light face.",
        [
            ("powderCoatedSteel", "Powder-coated steel", "#e5e9ea", "#eef1f2", "#e8e4dc", ("base", "base-leg-", "column", "arm", "lamp-neck")),
            ("rubber", "Rubber casters", "#3a4244", "#4d5859", "#514e4b", ("caster-",)),
            ("anodizedAluminum", "Anodized-aluminum lamp head", "#6b8f98", "#7fa0a5", "#8a8c86", ("head",)),
            ("opalGlass", "Opal glass diffuser", "#f0efe7", "#fff9e8", "#f1e5d5", ("light-face",)),
        ],
    ),
    "first-aid-kit": (
        "A handled first-aid case uses a molded shell, red medical cross and metal latches.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#e8ecee", "#f1f3f4", "#ebe8df", ("case", "lid", "handle-")),
            ("medicalInk", "Printed medical ink", "#c8403a", "#2d8b84", "#c9413b", ("cross-",)),
            ("stainlessSteel", "Stainless-steel latches", "#aab4b7", "#b7c0c2", "#a8aaa8", ("latch-",)),
        ],
    ),
    "forceps": (
        "Spring forceps have two tapered stainless arms and contrasting polymer grip pads.",
        [
            ("stainlessSteel", "Stainless steel", "#a5afb2", "#b8c1c3", "#b4aaa1", ("left-arm", "right-arm", "jaw")),
            ("medicalPolymer", "Medical-grade grip polymer", "#56646a", "#2d858d", "#c9413b", ("grip-",)),
        ],
    ),
    "forearm-crutches": (
        "A forearm crutch pairs a long aluminum shaft with a molded cuff, hand grip and rubber tip.",
        [
            ("anodizedAluminum", "Anodized aluminum", "#b8c3c8", "#c5ced1", "#b9b7b1", ("shaft-",)),
            ("medicalPolymer", "Molded cuff polymer", "#76a0a4", "#70a7a5", "#c9413b", ("cuff-",)),
            ("siliconeRubber", "Silicone and rubber", "#2d858d", "#4b9295", "#a74942", ("grip-", "tip-")),
        ],
    ),
    "gauze-pads": (
        "A layered gauze stack shows woven cotton faces, a finer center weave and folded tape edge.",
        [
            ("cottonGauze", "Cotton gauze", "#f1eee7", "#f8f5ec", "#eee9df", ("pad-",)),
            ("sterileMesh", "Sterile mesh", "#c8d0d1", "#c8dcda", "#d1d2cc", ("woven-center",)),
            ("medicalTape", "Medical tape", "#d5c9af", "#e0d3b8", "#d8c5a9", ("fold-band",)),
        ],
    ),
    "hospital-bed": (
        "A hospital bed has a padded mattress, raised polymer rails, steel support frame and casters.",
        [
            ("vinylUpholstery", "Vinyl upholstery", "#eef1f2", "#f5f4ef", "#efe9df", ("mattress",)),
            ("paintedSteel", "Painted steel", "#687880", "#7d8b90", "#78746e", ("frame", "headboard", "footboard", "support-")),
            ("medicalPolymer", "Molded rail polymer", "#4c9c9b", "#2d9893", "#c9413b", ("rail-",)),
            ("rubber", "Rubber casters", "#394245", "#4d5a5c", "#514d4a", ("caster-",)),
        ],
    ),
    "instrument-trolley": (
        "A two-level instrument trolley separates brushed trays, a tubular steel frame and rubber wheels.",
        [
            ("stainlessSteel", "Stainless steel", "#dce2e4", "#e8ecec", "#e7e2d9", ("lower-shelf", "top-tray", "upright-", "handle")),
            ("medicalPolymer", "Molded tray bumper", "#71838b", "#5a9795", "#c9413b", ("tray-lip",)),
            ("rubber", "Rubber casters", "#343c40", "#485356", "#4e4a47", ("wheel-",)),
        ],
    ),
    "iv-stand": (
        "An IV stand has a stainless telescoping pole and hooks, fluid bag and rubber-wheeled base.",
        [
            ("stainlessSteel", "Stainless steel", "#b6c0c4", "#c6ced0", "#bdbbb5", ("base-hub", "base-leg-", "pole", "hook-bar")),
            ("medicalPolymer", "Fluid-bag polymer", "#dce9e8", "#d6e9e6", "#e9e0d6", ("bag", "bag-port")),
            ("rubber", "Rubber casters", "#3d474a", "#515e60", "#554f4d", ("caster-",)),
        ],
    ),
    "lab-incubator": (
        "A laboratory incubator combines a metal cabinet, glass viewing window and sealed control door.",
        [
            ("paintedSteel", "Painted steel", "#e6eaeb", "#eef1f2", "#e9e5dc", ("cabinet", "door", "foot-")),
            ("borosilicateGlass", "Borosilicate viewing glass", "#92bfbd", "#a9cfca", "#a8c2c1", ("window", "screen")),
            ("medicalPolymer", "Control polymer", "#4c8f93", "#2d9893", "#c9413b", ("control-panel",)),
            ("silicone", "Silicone seal and grip", "#56666b", "#6f7e80", "#665d58", ("handle",)),
        ],
    ),
    "medical-cart": (
        "A medical cart has tiered steel shelves, raised polymer lips and four swivel casters.",
        [
            ("stainlessSteel", "Stainless steel", "#dce3e4", "#e8eeee", "#e6e1d9", ("shelf-", "post-")),
            ("medicalPolymer", "Polymer shelf lips", "#3c7f87", "#2d9893", "#c9413b", ("lip-",)),
            ("rubber", "Rubber casters", "#343c40", "#485356", "#514d4a", ("wheel-",)),
        ],
    ),
    "microscope": (
        "A compound microscope is defined by its angled optical tube, revolving objectives and clipped stage.",
        [
            ("paintedMetal", "Painted metal", "#56636a", "#68777d", "#736e68", ("base", "foot", "arm", "tube")),
            ("anodizedAluminum", "Anodized stage hardware", "#8bb5b4", "#93c2be", "#aeb7b5", ("stage", "stage-clip-")),
            ("opticalGlass", "Optical glass", "#253f48", "#326c70", "#54585a", ("objective-",)),
            ("rubber", "Rubber eyecup", "#303b40", "#536669", "#4f4b48", ("eyepiece",)),
        ],
    ),
    "nebulizer": (
        "A tabletop nebulizer pairs a compressor housing with a medicine cup and flexible air connector.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#e6eaeb", "#f1f3f4", "#ebe8df", ("compressor", "knob", "cup-base", "cup-cap")),
            ("clearPolycarbonate", "Clear medicine-cup polymer", "#99c5c2", "#a9d2cc", "#bfd2cd", ("medicine-cup",)),
            ("siliconeTubing", "Silicone connector", "#4e8790", "#438d89", "#bd6258", ("connector",)),
            ("rubber", "Rubber controls", "#374448", "#536166", "#5a514d", ("vent-",)),
        ],
    ),
    "otoscope": (
        "A handheld otoscope has a textured polymer handle, steel head and separate viewing lens.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#50636b", "#60757b", "#6b6862", ("handle",)),
            ("rubber", "Rubber grip band", "#c49a32", "#d2b34d", "#c9413b", ("grip-band",)),
            ("stainlessSteel", "Stainless-steel head", "#a8b2b4", "#bbc4c5", "#b2aaa0", ("head", "speculum")),
            ("opticalGlass", "Optical glass", "#253f48", "#4a7777", "#6b6661", ("lens-rim",)),
        ],
    ),
    "oxygen-cylinder": (
        "A medical oxygen cylinder has a painted steel tank, brass valve, gauge glass and protective foot ring.",
        [
            ("paintedSteel", "Painted cylinder steel", "#7c9299", "#668e94", "#e5e8e7", ("tank", "neck")),
            ("brass", "Brass valve", "#c29442", "#c7a35e", "#d0a347", ("valve", "outlet")),
            ("gaugeGlass", "Gauge glass", "#e2e9e6", "#b8d9d4", "#dfd5c7", ("gauge",)),
            ("rubber", "Rubber base ring", "#3b4548", "#4c595b", "#504a47", ("base-ring",)),
        ],
    ),
    "petri-dish": (
        "A culture dish uses a shallow clear polymer base, fitted lid and a visible agar sample.",
        [
            ("clearPolymer", "Clear dish polymer", "#e1e8e7", "#d9e9e6", "#e4e4dd", ("base", "base-rim", "lid", "lid-lip")),
            ("agar", "Agar medium", "#80b8a0", "#73b89a", "#d08a68", ("culture-agar",)),
            ("labelPaper", "Sample label paper", "#f2eee3", "#f4f1e7", "#eee3d6", ("sample-label",)),
        ],
    ),
    "pill-blister-pack": (
        "A blister pack separates its aluminum backing, molded polymer bubbles and colored tablets.",
        [
            ("aluminumFoil", "Aluminum foil", "#bfc9cd", "#cbd3d5", "#b8b6b2", ("foil-card",)),
            ("tabletCoating", "Tablet coating", "#d6b95f", "#d9c77c", "#c9413b", ("tablet-",)),
            ("blisterPolymer", "Blister polymer", "#92b4b7", "#a5c9c8", "#b8c6c4", ("edge-band",)),
        ],
    ),
    "pill-bottle": (
        "A prescription bottle has an amber polymer body, paper label and separate child-safe cap.",
        [
            ("amberPolymer", "Amber polymer", "#c28d39", "#cc9b49", "#bd8640", ("bottle", "neck")),
            ("labelPaper", "Label paper", "#eee9dd", "#f4f1e8", "#eee3d5", ("label",)),
            ("medicalPolymer", "Cap polymer", "#d8bd65", "#73a29d", "#c9413b", ("cap", "cap-rim")),
        ],
    ),
    "pulse-oximeter": (
        "A fingertip oximeter has a hinged polymer clamp, inset display and soft finger pads.",
        [
            ("medicalPolymer", "Medical-grade polymer", "#eef2f2", "#f3f5f3", "#ebe8df", ("lower-jaw", "upper-jaw")),
            ("stainlessSteel", "Stainless-steel hinge", "#9aa6a8", "#aab7b8", "#b4aca4", ("hinge",)),
            ("displayGlass", "Display glass", "#284c50", "#2c827c", "#c0473f", ("display",)),
            ("silicone", "Silicone finger pad", "#399da1", "#54aaa2", "#c9413b", ("button", "finger-pad")),
        ],
    ),
    "reflex-hammer": (
        "A reflex hammer combines a metal crosshead, slender handle and two rubber percussion tips.",
        [
            ("anodizedAluminum", "Anodized-aluminum handle", "#a7b0b3", "#b9c2c4", "#b7b0a8", ("handle",)),
            ("stainlessSteel", "Stainless-steel head", "#596a70", "#718186", "#73716d", ("head-bar", "collar")),
            ("siliconeRubber", "Silicone percussion tips", "#37494f", "#546b6d", "#c9413b", ("tip-",)),
        ],
    ),
    "sharps-container": (
        "A sharps container has a rigid puncture-resistant body, red slot lid and metal carry tab.",
        [
            ("polypropylene", "Puncture-resistant polypropylene", "#f1b944", "#f5cf62", "#e2b037", ("base", "lid")),
            ("medicalInk", "Warning marking color", "#c9433d", "#2d8b84", "#c9413b", ("shoulder", "slot")),
            ("stainlessSteel", "Stainless-steel carry tab", "#aeb8ba", "#bdc6c7", "#b4aba2", ("handle-tab",)),
        ],
    ),
    "specimen-cup": (
        "A specimen cup has a straight disposable body, threaded polymer lid and a paper identification label.",
        [
            ("polypropylene", "Polypropylene cup", "#e8eceb", "#f0f2ed", "#ebe7df", ("cup", "base-foot")),
            ("medicalPolymer", "Lid polymer", "#e6ba54", "#6fa9a1", "#c9413b", ("lid", "lid-rim")),
            ("labelPaper", "Identification label paper", "#f6f0df", "#f4f1e7", "#eee4d7", ("label",)),
        ],
    ),
    "specimen-tube-rack": (
        "A specimen rack keeps color-coded capped tubes upright in a two-level support frame.",
        [
            ("medicalPolymer", "Rack polymer", "#d7dedf", "#e4e9e8", "#e8e3db", ("base", "top-rail")),
            ("clearPolymer", "Clear tube polymer", "#b5d1d0", "#b9ddd8", "#c2d2cf", ("tube-",)),
            ("capPolymer", "Color-coded cap polymer", "#508c98", "#2d9893", "#c9413b", ("cap-",)),
        ],
    ),
    "stethoscope": (
        "A stethoscope is recognizable by its split flexible tube, paired earpieces and circular chestpiece.",
        [
            ("siliconeTubing", "Silicone tubing", "#384b56", "#425b63", "#4e5050", ("tubing",)),
            ("rubber", "Rubber earpieces", "#303b40", "#526568", "#594f4a", ("earpiece-",)),
            ("stainlessSteel", "Stainless-steel chestpiece", "#bfc8cb", "#c6d0d1", "#c2bbb2", ("chestpiece", "diaphragm")),
        ],
    ),
    "surgical-scissors": (
        "Surgical scissors use intersecting stainless blades with distinct finger loops and a pivot screw.",
        [
            ("medicalPolymer", "Grip polymer", "#99a4a8", "#839397", "#c9413b", ("finger-loop-",)),
            ("stainlessSteel", "Stainless-steel blades and pivot", "#58656a", "#758286", "#b8b0a6", ("blade-", "pivot")),
        ],
    ),
    "syringe": (
        "A syringe separates its graduated clear barrel, black plunger seal and fine stainless needle.",
        [
            ("clearPolymer", "Clear barrel polymer", "#e9edef", "#dcebea", "#e7e4dd", ("barrel", "finger-flange", "plunger-rod", "thumb-pad")),
            ("siliconeRubber", "Silicone plunger seal", "#303a3d", "#445355", "#544d49", ("plunger-seal",)),
            ("stainlessSteel", "Stainless-steel needle", "#b7c1c3", "#c2cbcd", "#bcb7b0", ("needle",)),
            ("graduationInk", "Graduation ink", "#7eacb0", "#358b87", "#c9413b", ("mark-",)),
        ],
    ),
    "tongue-depressor-pack": (
        "A wrapped tongue-depressor pack shows stacked birch sticks, a paper sleeve and printed seal.",
        [
            ("birchWood", "Birch wood", "#d9c29a", "#ddcba8", "#d3b98c", ("depressor-",)),
            ("paperSleeve", "Paper sleeve", "#f1eee4", "#f5f2e9", "#eee5d9", ("sleeve",)),
            ("medicalInk", "Printed seal ink", "#a86842", "#4d8c83", "#c9413b", ("end-band",)),
        ],
    ),
    "walker-frame": (
        "A folding walker has paired aluminum side frames, padded hand grips and rubber floor glides.",
        [
            ("anodizedAluminum", "Anodized aluminum", "#dce2e4", "#c6d0d2", "#c4c1bb", ("side-rail-", "rear-leg-", "front-leg-", "top-bar")),
            ("silicone", "Silicone hand grips", "#4a8991", "#2d9893", "#c9413b", ("grip-",)),
            ("rubber", "Rubber floor glides", "#30383c", "#4c595b", "#504a47", ("glide-",)),
        ],
    ),
    "walking-cane": (
        "A walking cane pairs a hardwood shaft with a shaped hand grip and broad rubber ferrule.",
        [
            ("hardwood", "Hardwood shaft", "#8a6748", "#957653", "#785a42", ("shaft",)),
            ("medicalPolymer", "Molded hand grip", "#2a555d", "#4b8c85", "#c9413b", ("handle-stem", "crook")),
            ("rubber", "Rubber ferrule", "#303b3e", "#4b5658", "#514c49", ("foot",)),
        ],
    ),
    "wheelchair": (
        "A manual wheelchair separates its fabric seat and back, aluminum frame, rubber wheels and polymer armrests.",
        [
            ("anodizedAluminum", "Anodized aluminum frame", "#aeb9bd", "#c2cbcd", "#bcb7b0", ("rear-support-", "foot-hanger-", "footplate-", "cross-frame")),
            ("vinylUpholstery", "Vinyl upholstery", "#e9edf0", "#f2f2ee", "#ebe5dc", ("seat", "backrest")),
            ("rubber", "Rubber tires and casters", "#30363a", "#414c4f", "#4e4946", ("rear-wheel-", "front-caster-")),
            ("medicalPolymer", "Molded armrest polymer", "#367e8c", "#2d9893", "#c9413b", ("arm-", "arm-support-")),
        ],
    ),
}

EXTRA_PARTS = {
    "petri-dish": (
        "p.part('culture-agar', c(0, 0, 12, 2, 32, 12).color(agar));\n"
        "p.part('sample-label', box(24, 2, 10, true).translate(0, -42, 7).color(labelPaper));\n"
    ),
    "pulse-oximeter": (
        "p.part('finger-pad-lower', b(0, 0, 29, 62, 30, 4).color(silicone));\n"
        "p.part('finger-pad-upper', b(0, 0, 41, 62, 30, 4).color(silicone));\n"
    ),
    "specimen-cup": "p.part('label', box(36, 3, 14, true).translate(0, -27, 32).color(labelPaper));\n",
    "syringe": "p.part('plunger-seal', c(0, 0, 153, 5, 14, 10).color(siliconeRubber));\n",
}


def preset_block(materials: list[tuple]) -> str:
    clinic = ", ".join(f"{name}: '{clinic_color}'" for name, _, _, clinic_color, _, _ in materials)
    emergency = ", ".join(f"{name}: '{emergency_color}'" for name, _, _, _, emergency_color, _ in materials)
    return (
        "presets({\n"
        f"  clinic: {{ {clinic} }},\n"
        f"  emergency: {{ {emergency} }},\n"
        "});"
    )


def apply_one(asset_id: str, spec: tuple) -> dict:
    intent, materials = spec
    source_path = KIT / f"{asset_id}.kcad.ts"
    source = source_path.read_text(encoding="utf-8")
    if "const shell = param('shell'," not in source or "const accent = param('accent'," not in source:
        raise SystemExit(f"{asset_id}: expected generic shell and accent controls")
    if re.search(r"presets\(\{\s*clinic:", source) is None:
        raise SystemExit(f"{asset_id}: expected clinic and emergency presets")

    declarations = [
        f"const {name} = param('{name}', '{default}', {{ label: '{label}' }});"
        for name, label, default, _, _, _ in materials
    ]
    source = re.sub(
        r"^const shell = param\('shell', .*?;\nconst accent = param\('accent', .*?;\n",
        "\n".join(declarations) + "\n",
        source,
        count=1,
        flags=re.M,
    )
    source = re.sub(r"presets\(\{[\s\S]*?\}\);", preset_block(materials), source, count=1)

    if asset_id == "erlenmeyer-flask":
        old_geometry = (
            "p.part('lower-body', c(0, 0, 0, 30, 42, 10).color(shell));\n"
            "p.part('shoulder', c(0, 0, 28, 44, 32, 10).color(shell));\n"
            "p.part('upper-neck', c(0, 0, 68, 45, 14, 10).color(shell));\n"
            "p.part('rim', c(0, 0, 111, 8, 17, 10).color(accent));\n"
            "p.part('liquid-band', c(0, 0, 18, 4, 28, 10).color(accent));\n"
        )
        flask_geometry = (
            "const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z);\n"
            "const levels = [0, 24, 68, 104, 110];\n"
            "const radii = [42, 42, 18, 14, 17];\n"
            "const profile = (r: number) => {\n"
            "  let shape = path().moveTo(r, 0);\n"
            "  for (let i = 1; i < 10; i++) {\n"
            "    const angle = (Math.PI * 2 * i) / 10;\n"
            "    shape = shape.lineTo(r * Math.cos(angle), r * Math.sin(angle));\n"
            "  }\n"
            "  return shape.close();\n"
            "};\n"
            "const profiles = radii.map(profile);\n"
            "const flaskBody = profiles[0].loft(profiles.slice(1), {\n"
            "  planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),\n"
            "  ruled: true,\n"
            "});\n"
            "p.part('flask-body', flaskBody.color(shell));\n"
            "p.part('rim', c(0, 0, 111, 8, 17, 10).color(accent));\n"
            "p.part('liquid-window', b(0, -39, 20, 28, 2, 4).color(accent));\n"
            "for (const [z, y] of [[36, -33.7], [48, -27.8], [60, -21.5]]) {\n"
            "  p.part('graduation-' + z, b(0, y, z, 12, 2, 2).color(graduationInk));\n"
            "}\n"
        )
        if old_geometry not in source:
            raise SystemExit("erlenmeyer-flask: original vessel geometry did not match")
        source = source.replace(old_geometry, flask_geometry, 1)

    extra_parts = EXTRA_PARTS.get(asset_id)
    if extra_parts is not None:
        marker = "return p.model();"
        if marker not in source:
            raise SystemExit(f"{asset_id}: no model return for identifying details")
        source = source.replace(marker, extra_parts + "\n" + marker, 1)

    fallback = {"shell": materials[0][0], "accent": materials[1][0]}
    prefix_targets = sorted(
        ((prefix, name) for name, _, _, _, _, prefixes in materials for prefix in prefixes),
        key=lambda item: len(item[0]),
        reverse=True,
    )
    edited_lines = []
    for line in source.splitlines(keepends=True):
        old = re.search(r"\.color\((shell|accent)\)", line)
        if old is not None:
            part = re.search(r"\.part\(\s*'([^']+)'", line)
            if part is None:
                raise SystemExit(f"{asset_id}: cannot identify colored part: {line.strip()}")
            part_name = part.group(1)
            target = next(
                (name for prefix, name in prefix_targets if part_name.startswith(prefix)),
                fallback[old.group(1)],
            )
            line = line.replace(old.group(0), f".color({target})")
        edited_lines.append(line)
    source = "".join(edited_lines)

    description = f"Material controls: {', '.join(label for _, label, *_ in materials)}."
    source, changed = re.subn(
        r'("description":\s*")([^"]*)(")',
        lambda match: f"{match.group(1)}{match.group(2).rstrip()} {description}{match.group(3)}",
        source,
        count=1,
    )
    if changed != 1:
        raise SystemExit(f"{asset_id}: description was not updated")
    first_const = source.find("\nconst ")
    if first_const < 0:
        raise SystemExit(f"{asset_id}: no source declaration after metadata")
    source = (
        source[:first_const + 1]
        + f"// {intent}\n"
        + source[first_const + 1:]
    )

    for name, *_ in materials:
        if f".color({name})" not in source:
            raise SystemExit(f"{asset_id}: unused material control {name}")
    if ".color(shell)" in source or ".color(accent)" in source:
        raise SystemExit(f"{asset_id}: generic color assignment remains")

    source_path.write_text(source, encoding="utf-8")
    return {
        "asset": asset_id,
        "source": str(source_path.relative_to(ROOT)),
        "materials": [
            {"name": name, "label": label, "default": default, "clinic": clinic, "emergency": emergency}
            for name, label, default, clinic, emergency, _ in materials
        ],
        "materialCount": len(materials),
        "intent": intent,
    }


def main() -> None:
    files = sorted(KIT.glob("*.kcad.ts"))
    if len(files) != 40 or {path.name.removesuffix(".kcad.ts") for path in files} != set(SPECS):
        raise SystemExit(f"medical kit drift: expected 40 mapped sources, found {len(files)}")
    report = {
        "kit": "medical",
        "assetCount": len(files),
        "assets": [apply_one(asset_id, SPECS[asset_id]) for asset_id in sorted(SPECS)],
    }
    (BUNDLE / "material-map.json").write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"updated {report['assetCount']} existing medical assets")
    print(f"material controls: {sum(row['materialCount'] for row in report['assets'])}")


if __name__ == "__main__":
    main()
