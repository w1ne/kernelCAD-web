#!/usr/bin/env python3
"""Promote the existing music assets with material controls and named finishes."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/music"
BUNDLE = Path(__file__).resolve().parent

# (param name, material label, default hex, concert preset hex, vintage preset hex)
M = {
    "accordion": [
        ("lacquer", "Case lacquer", "#b83b47", "#25617a", "#71323d"),
        ("bellows", "Bellows fabric", "#302b34", "#302b34", "#382d2c"),
        ("ivory", "Ivory keys", "#eee2c6", "#f5ecd6", "#e5d7b6"),
        ("nickel", "Nickel buttons", "#b6c0c4", "#d0d8dc", "#a49782"),
    ],
    "acoustic-guitar": [
        ("spruce", "Spruce soundboard", "#d7a466", "#e4b873", "#ab7044"),
        ("mahogany", "Mahogany tonewood", "#71452f", "#75412e", "#522d26"),
        ("ebony", "Ebony fingerboard", "#26201d", "#211c1b", "#30231e"),
        ("steel", "Steel strings", "#bac5ca", "#d6dfe2", "#b8a58c"),
    ],
    "alto-saxophone": [
        ("brass", "Lacquered brass", "#c08a32", "#e2b346", "#a76d2d"),
        ("nickel", "Nickel keywork", "#c1c9ce", "#e0e5e7", "#9ea9ad"),
        ("ebonite", "Ebonite mouthpiece", "#292830", "#292830", "#3b2b27"),
    ],
    "banjo": [
        ("maple", "Maple neck", "#bf8a4b", "#d8a45e", "#8f5b34"),
        ("parchment", "Parchment head", "#e4d7b7", "#f1e8d1", "#d5c5a5"),
        ("nickel", "Nickel hardware", "#bcc5ca", "#d6dfe3", "#a99a83"),
        ("ebony", "Ebony fingerboard", "#29221f", "#29221f", "#382b25"),
    ],
    "bass-drum": [
        ("lacquer", "Shell lacquer", "#9e343d", "#23627a", "#6c3435"),
        ("calfskin", "Calfskin heads", "#e9dfc9", "#f5ecd8", "#d6c9ad"),
        ("steel", "Cradle steel", "#67747d", "#b7c3ca", "#625f5a"),
    ],
    "bass-guitar": [
        ("lacquer", "Body lacquer", "#315f77", "#bf463d", "#654335"),
        ("maple", "Maple neck", "#c99a61", "#d9aa6e", "#91633d"),
        ("ebony", "Ebony fingerboard", "#27221f", "#25201f", "#352720"),
        ("steel", "Steel hardware", "#b7c1c7", "#d4dde1", "#9f927f"),
    ],
    "bassoon": [
        ("maple", "Maple body", "#8c552f", "#a46938", "#603d2d"),
        ("silver", "Silver keywork", "#b9c5cb", "#dce4e7", "#9ea9ad"),
        ("ebonite", "Ebonite reed", "#27272a", "#27272a", "#382a25"),
    ],
    "bongos": [
        ("maple", "Maple shells", "#b77943", "#ce914e", "#805032"),
        ("calfskin", "Calfskin heads", "#e6d7b5", "#f4e8cf", "#d2c09a"),
        ("steel", "Steel bridge", "#68747b", "#bbc5ca", "#5c615f"),
    ],
    "cajon": [
        ("birch", "Birch cabinet", "#ba8248", "#d39a58", "#845334"),
        ("rosewood", "Rosewood striking panel", "#8a482f", "#9b5235", "#59372b"),
        ("rubber", "Rubber feet", "#292a2c", "#292a2c", "#3b3732"),
    ],
    "cello": [
        ("maple", "Maple body", "#a96c3e", "#c8894e", "#79482e"),
        ("ebony", "Ebony fingerboard", "#25201f", "#25201f", "#362823"),
        ("steel", "Steel strings", "#bbc5ca", "#d9e1e4", "#a9987e"),
        ("nickel", "Nickel endpin", "#858f94", "#c6cfd3", "#82776a"),
    ],
    "clarinet": [
        ("grenadilla", "Grenadilla wood", "#292626", "#343039", "#211d1d"),
        ("silver", "Silver keywork", "#bcc6cb", "#dce4e7", "#a19888"),
        ("ivory", "Ivory rings", "#e5d8b9", "#f1e6ca", "#cdbb97"),
    ],
    "concert-flute": [
        ("silver", "Silver tube", "#aebbc2", "#dce4e8", "#a49b8b"),
        ("nickel", "Nickel keywork", "#d0d7d9", "#f0f2ef", "#8c9493"),
    ],
    "concert-harp": [
        ("maple", "Maple frame", "#c19151", "#d5a562", "#855331"),
        ("brass", "Brass neck fittings", "#b78331", "#dfb144", "#9c6227"),
        ("steel", "Steel strings", "#bac5ca", "#e0e6e8", "#a09584"),
    ],
    "conductor-podium": [
        ("oak", "Oak platform", "#93603b", "#b57a48", "#68452f"),
        ("paint", "Enamel riser", "#334d5e", "#376d7b", "#3c3936"),
        ("rubber", "Rubber tread", "#272b2e", "#272b2e", "#393532"),
    ],
    "conga-drums": [
        ("maple", "Maple shells", "#b8753f", "#ce914d", "#825032"),
        ("calfskin", "Calfskin heads", "#e6d6b4", "#f4e8cf", "#d1bd96"),
        ("chrome", "Chrome fittings", "#818e94", "#d0d8dc", "#817668"),
    ],
    "double-bass": [
        ("maple", "Maple body", "#9a6139", "#bd7c47", "#6c432d"),
        ("ebony", "Ebony fingerboard", "#25201f", "#25201f", "#382921"),
        ("steel", "Steel strings", "#bbc5ca", "#dae2e5", "#a8977e"),
        ("nickel", "Nickel endpin", "#8d979c", "#c8d0d4", "#82776a"),
    ],
    "drum-kit": [
        ("lacquer", "Drum lacquer", "#a9323d", "#286582", "#6b3935"),
        ("calfskin", "Drumhead skin", "#e8dfcb", "#f5ecda", "#d7c9ad"),
        ("chrome", "Chrome hardware", "#86949a", "#d7e0e3", "#897d6d"),
        ("bronze", "Bronze cymbals", "#bf8d36", "#dfb148", "#98632c"),
    ],
    "electric-guitar": [
        ("polyLacquer", "Polyurethane body lacquer", "#426784", "#c64238", "#593c32"),
        ("maple", "Maple neck", "#c49861", "#ddb274", "#94653f"),
        ("ebony", "Ebony fingerboard", "#28221f", "#28221f", "#382921"),
        ("steel", "Steel hardware", "#b9c4ca", "#dbe2e5", "#a69886"),
    ],
    "french-horn": [
        ("brass", "Lacquered brass", "#c18c35", "#e3b54b", "#a86f2d"),
        ("nickel", "Nickel slides", "#bdc7cc", "#e0e6e8", "#a19a8d"),
        ("ebonite", "Ebonite mouthpiece", "#28292c", "#28292c", "#382b27"),
    ],
    "harmonica": [
        ("stainless", "Stainless covers", "#aab6bc", "#d5dfe2", "#888f8d"),
        ("brass", "Brass reed plates", "#bd8731", "#dfa940", "#9c6729"),
        ("polymer", "Polymer comb", "#282d33", "#31556a", "#392d29"),
    ],
    "maracas": [
        ("paint", "Painted gourd shells", "#d5a82e", "#dd6532", "#9b4b2e"),
        ("maple", "Maple handles", "#a86a36", "#bd8143", "#71472e"),
    ],
    "marimba": [
        ("rosewood", "Rosewood bars", "#844c30", "#a45d37", "#603b2d"),
        ("aluminum", "Aluminum resonators", "#9eabb2", "#d0d9dd", "#8b908d"),
        ("steel", "Steel frame", "#343c42", "#4c626e", "#302d2b"),
    ],
    "mechanical-metronome": [
        ("walnut", "Walnut case", "#71462f", "#8b5736", "#50362d"),
        ("brass", "Brass pendulum", "#c19137", "#e1b54b", "#a06c2e"),
        ("steel", "Steel slider", "#aeb9be", "#d5dee1", "#948779"),
    ],
    "microphone-stand": [
        ("steel", "Powder-coated steel", "#4b565d", "#385f70", "#34383a"),
        ("polymer", "Microphone polymer", "#252a2e", "#272c30", "#362a27"),
        ("silver", "Silver grille", "#b8c3c8", "#d8e0e3", "#a49b8e"),
    ],
    "music-stand": [
        ("steel", "Powder-coated steel", "#3b525f", "#b23d3d", "#33383b"),
        ("aluminum", "Aluminum tray", "#7d8d95", "#b9c6cb", "#7d7c76"),
        ("rubber", "Rubber feet", "#25292c", "#25292c", "#37322f"),
    ],
    "oboe": [
        ("grenadilla", "Grenadilla wood", "#342824", "#4d3329", "#292120"),
        ("silver", "Silver keywork", "#bbc5ca", "#dce4e7", "#a59c8e"),
        ("reed", "Cane reed", "#c99860", "#d8aa72", "#9a6b43"),
    ],
    "orchestral-cymbals": [
        ("bronze", "B20 bronze", "#c18d34", "#e1b44b", "#a66b2f"),
        ("leather", "Leather hand straps", "#57392b", "#70462e", "#392d27"),
        ("steel", "Steel bosses", "#9da9ae", "#d2dbde", "#8e887d"),
    ],
    "orchestral-triangle": [
        ("steel", "Polished steel", "#b7c2c8", "#dce4e7", "#998f81"),
        ("maple", "Maple striker", "#ae7745", "#c38a4e", "#7d5032"),
        ("rubber", "Striker grip polymer", "#292c2e", "#292c2e", "#3a302b"),
    ],
    "snare-drum": [
        ("lacquer", "Shell lacquer", "#a7383c", "#2e637d", "#6e4037"),
        ("calfskin", "Drumhead skin", "#e8dfca", "#f4ebd8", "#d7c9ae"),
        ("chrome", "Chrome hoops and stand", "#879399", "#d6dfe2", "#928778"),
    ],
    "tambourine": [
        ("maple", "Maple frame", "#ad7441", "#c58b4b", "#754b31"),
        ("brass", "Brass jingles", "#c18b32", "#e1b146", "#a26b2b"),
    ],
    "tenor-saxophone": [
        ("brass", "Lacquered brass", "#bb842e", "#dfae3f", "#a2692a"),
        ("nickel", "Nickel keywork", "#bdc7cc", "#dce4e7", "#9e988b"),
        ("ebonite", "Ebonite mouthpiece", "#29292b", "#29292b", "#3a2d29"),
    ],
    "timpani": [
        ("copper", "Copper bowl", "#a95f37", "#c27a45", "#78442f"),
        ("calfskin", "Drumhead skin", "#e6dcc5", "#f4ecd8", "#d2c4a7"),
        ("steel", "Steel legs and pedal", "#68757d", "#c3cdd1", "#6b6760"),
    ],
    "trombone": [
        ("brass", "Lacquered brass bell", "#c18b34", "#e1b144", "#a56c2b"),
        ("nickel", "Nickel slide tubes", "#bbc5ca", "#e0e6e8", "#a29a8b"),
        ("ebonite", "Ebonite mouthpiece", "#292a2d", "#292a2d", "#3b2d28"),
    ],
    "trumpet": [
        ("brass", "Lacquered brass", "#c18b34", "#e2b44a", "#a66d2c"),
        ("nickel", "Nickel valve casing", "#aeb9bf", "#d9e1e4", "#9d9486"),
        ("ebonite", "Ebonite valve buttons", "#292a2c", "#292a2c", "#392c28"),
    ],
    "tuba": [
        ("brass", "Lacquered brass", "#bd8730", "#e2b247", "#a2692b"),
        ("nickel", "Nickel valve casing", "#aeb9bf", "#d9e1e4", "#9c9487"),
        ("ebonite", "Ebonite valve buttons", "#292a2c", "#292a2c", "#3b2e29"),
    ],
    "ukulele": [
        ("koa", "Koa soundboard", "#c7894d", "#dfa562", "#86502f"),
        ("ebony", "Ebony fingerboard", "#29211e", "#29211e", "#382a22"),
        ("steel", "Steel strings", "#bcc6cb", "#dbe3e5", "#a79984"),
        ("brass", "Brass tuning hardware", "#bd8732", "#d9aa43", "#9b6328"),
    ],
    "vibraphone": [
        ("aluminum", "Aluminum bars", "#aebbc2", "#dce4e7", "#94948e"),
        ("steel", "Steel frame", "#3b464d", "#536f7c", "#353638"),
        ("resonator", "Dark resonator tubes", "#646b70", "#818b90", "#4d4d4a"),
    ],
    "viola": [
        ("maple", "Maple body", "#a66c3d", "#c1834b", "#75472e"),
        ("ebony", "Ebony fingerboard", "#25201e", "#25201e", "#362720"),
        ("steel", "Steel strings", "#bcc6cb", "#dae2e5", "#a79880"),
    ],
    "violin": [
        ("maple", "Maple body", "#b47a45", "#d09150", "#7d4d30"),
        ("ebony", "Ebony fingerboard", "#25201e", "#25201e", "#372820"),
        ("steel", "Steel strings", "#bbc5ca", "#dae2e5", "#a69780"),
    ],
    "xylophone": [
        ("rosewood", "Rosewood bars", "#945631", "#b16b39", "#633c2c"),
        ("steel", "Steel frame", "#39444a", "#526d78", "#343638"),
    ],
}

# Ordered regex rules map named physical parts to the material that should shade them.
R = {
    "accordion": [(r"bellows|fold", "bellows"), (r"keyboard|key-", "ivory"), (r"button", "nickel")],
    "acoustic-guitar": [(r"body|upper-bout", "spruce"), (r"neck|head|bridge", "mahogany"), (r"fingerboard|sound-hole", "ebony"), (r"string", "steel")],
    "alto-saxophone": [(r"key|rail|neck", "nickel"), (r"mouth", "ebonite")],
    "banjo": [(r"head-skin", "parchment"), (r"neck|head|bridge", "maple"), (r"string|rim", "nickel"), (r"fingerboard", "ebony")],
    "bass-drum": [(r"head", "calfskin"), (r"cradle", "steel")],
    "bass-guitar": [(r"body", "lacquer"), (r"neck|head", "maple"), (r"fingerboard|pickup", "ebony"), (r"steel|bridge|string", "steel")],
    "bassoon": [(r"key|rail|bocal", "silver"), (r"reed", "ebonite")],
    "bongos": [(r"head", "calfskin"), (r"bridge|base", "steel")],
    "cajon": [(r"front-panel", "rosewood"), (r"foot", "rubber")],
    "cello": [(r"neck|scroll|fingerboard", "ebony"), (r"strings", "steel"), (r"endpin", "nickel")],
    "clarinet": [(r"key", "silver"), (r"ring", "ivory")],
    "concert-flute": [(r"key", "nickel")],
    "concert-harp": [(r"string", "steel"), (r"pillar|soundboard|base", "maple"), (r"neck", "brass")],
    "conductor-podium": [(r"step", "rubber"), (r"rail", "paint")],
    "conga-drums": [(r"head", "calfskin"), (r"foot|brace", "chrome")],
    "double-bass": [(r"neck|scroll|fingerboard", "ebony"), (r"strings", "steel"), (r"endpin", "nickel")],
    "drum-kit": [(r"head", "calfskin"), (r"stand|foot|post", "chrome"), (r"cymbal", "bronze")],
    "electric-guitar": [(r"body", "polyLacquer"), (r"neck|head", "maple"), (r"fingerboard|pickup", "ebony"), (r"steel|bridge|string", "steel")],
    "french-horn": [(r"valve", "nickel"), (r"mouth", "ebonite")],
    "harmonica": [(r"reed", "brass"), (r"body", "polymer")],
    "maracas": [(r"head", "paint"), (r"handle|neck", "maple")],
    "marimba": [(r"bar", "rosewood"), (r"resonator", "aluminum"), (r"frame", "steel")],
    "mechanical-metronome": [(r"pendulum", "steel"), (r"slider", "steel"), (r"cap", "brass")],
    "microphone-stand": [(r"microphone-body", "polymer"), (r"grille", "silver")],
    "music-stand": [(r"tray", "aluminum"), (r"foot", "rubber")],
    "oboe": [(r"key", "silver"), (r"reed", "reed")],
    "orchestral-cymbals": [(r"grip", "leather"), (r"boss", "steel")],
    "orchestral-triangle": [(r"striker-grip", "rubber"), (r"striker", "maple")],
    "snare-drum": [(r"hoop|stand", "chrome"), (r"head", "calfskin")],
    "tambourine": [(r"jingle", "brass"), (r"ring", "maple")],
    "tenor-saxophone": [(r"key|rail|neck", "nickel"), (r"mouth", "ebonite")],
    "timpani": [(r"head", "calfskin"), (r"leg|pedal", "steel")],
    "trombone": [(r"slide|crossbar", "nickel"), (r"mouth", "ebonite")],
    "trumpet": [(r"valve-cap", "ebonite"), (r"valve", "nickel"), (r"mouth", "nickel")],
    "tuba": [(r"button", "ebonite"), (r"valve", "nickel")],
    "ukulele": [(r"body|upper-bout", "koa"), (r"neck|head", "koa"), (r"fingerboard|sound-hole", "ebony"), (r"string", "steel"), (r"bridge", "brass")],
    "vibraphone": [(r"bar", "aluminum"), (r"resonator", "resonator"), (r"frame|foot|crossbar|legs", "steel")],
    "viola": [(r"neck|scroll", "maple"), (r"fingerboard|f-hole", "ebony"), (r"strings", "steel")],
    "violin": [(r"neck|scroll", "maple"), (r"fingerboard|f-hole", "ebony"), (r"strings", "steel")],
    "xylophone": [(r"bar|mallet", "rosewood"), (r"frame|leg", "steel")],
}

BODY_HELPER = '''const outlineBody = (lower: number, waist: number, upper: number, length: number, depth: number) =>
  path().moveTo(0, 0)
    .lineTo(-lower * 0.43, length * 0.04).lineTo(-lower * 0.5, length * 0.17)
    .lineTo(-lower * 0.42, length * 0.29).lineTo(-waist * 0.46, length * 0.4)
    .lineTo(-waist * 0.42, length * 0.55).lineTo(-upper * 0.42, length * 0.66)
    .lineTo(-upper * 0.5, length * 0.82).lineTo(-upper * 0.4, length * 0.95)
    .lineTo(0, length).lineTo(upper * 0.4, length * 0.95)
    .lineTo(upper * 0.5, length * 0.82).lineTo(upper * 0.42, length * 0.66)
    .lineTo(waist * 0.42, length * 0.55).lineTo(waist * 0.46, length * 0.4)
    .lineTo(lower * 0.42, length * 0.29).lineTo(lower * 0.5, length * 0.17)
    .lineTo(lower * 0.43, length * 0.04).close()
    .extrude(depth).rotateX(90).translate(0, depth / 2, 0);

'''

GEOMETRY_PATCHES = {
    "acoustic-guitar": [
        ('const p = assembly("acoustic-guitar");', BODY_HELPER + 'const p = assembly("acoustic-guitar");'),
        ('p.part("body", sphere(92).scale([1.35, 0.38, 1]).translate(0, 0, 92).subtract(cylinder(100, 26, 12).rotate([1, 0, 0], 90).translate(0, 50, 80)).scale(scale).color(color));',
         'p.part("body", outlineBody(224, 150, 150, 232, 30).subtract(cylinder(32, 23, 16).rotateX(90).translate(0, 16, 112)).scale(scale).color(color));'),
        ('p.part("upper-bout", sphere(57).scale([1.0, 0.36, 0.9]).translate(0, 0, 158).scale(scale).color(color));\n', ''),
        ('p.part("neck", box(34, 22, 372, true).translate(0, 0, 340).scale(scale).color(color));',
         'p.part("neck", box(34, 22, 372, true).translate(0, 0, 340).scale(scale).color(color));\np.part("fingerboard", box(28, 5, 350, true).translate(0, -13, 340).scale(scale).color(color));'),
        ('p.part("string-set", box(2, 3, 500, true).translate(0, 0, 285).scale(scale).color(color));',
         'p.part("string-set", box(2, 3, 500, true).translate(0, -16, 285).scale(scale).color(color));'),
    ],
    "electric-guitar": [
        ('const p = assembly("electric-guitar");', BODY_HELPER + 'const p = assembly("electric-guitar");'),
        ('p.part("lower-body", sphere(82).scale([1.1, 0.38, 1]).translate(0, 0, 82).scale(scale).color(color));\n', ''),
        ('p.part("upper-body", sphere(58).scale([1.0, 0.38, 0.85]).translate(0, 0, 144).scale(scale).color(color));',
         'p.part("body", outlineBody(160, 90, 124, 190, 34).scale(scale).color(color));'),
        ('p.part("neck", box(32, 20, 380, true).translate(0, 0, 330).scale(scale).color(color));',
         'p.part("neck", box(32, 20, 380, true).translate(0, 0, 330).scale(scale).color(color));\np.part("fingerboard", box(27, 5, 350, true).translate(0, -12, 330).scale(scale).color(color));'),
        ('p.part("strings", box(2, 3, 490, true).translate(0, 0, 280).scale(scale).color(color));',
         'p.part("strings", box(2, 3, 490, true).translate(0, -15.5, 280).scale(scale).color(color));'),
    ],
    "bass-guitar": [
        ('const p = assembly("bass-guitar");', BODY_HELPER + 'const p = assembly("bass-guitar");'),
        ('p.part("body", sphere(87).scale([1.2, 0.38, 1]).translate(0, 0, 87).scale(scale).color(color));',
         'p.part("body", outlineBody(208, 140, 160, 212, 34).scale(scale).color(color));'),
        ('p.part("neck", box(38, 22, 490, true).translate(0, 0, 390).scale(scale).color(color));',
         'p.part("neck", box(38, 22, 490, true).translate(0, 0, 390).scale(scale).color(color));\np.part("fingerboard", box(32, 5, 455, true).translate(0, -14, 390).scale(scale).color(color));'),
        ('p.part("strings", box(2, 3, 610, true).translate(0, 0, 355).scale(scale).color(color));',
         'p.part("strings", box(2, 3, 610, true).translate(0, -18, 355).scale(scale).color(color));'),
    ],
    "ukulele": [
        ('const p = assembly("ukulele");', BODY_HELPER + 'const p = assembly("ukulele");'),
        ('p.part("body", sphere(68).scale([1.25, 0.38, 1]).translate(0, 0, 68).scale(scale).color(color));',
         'p.part("body", outlineBody(164, 105, 122, 164, 24).subtract(cylinder(26, 17, 14).rotateX(90).translate(0, 13, 78)).scale(scale).color(color));'),
        ('p.part("upper-bout", sphere(42).scale([1.0, 0.38, 0.85]).translate(0, 0, 116).scale(scale).color(color));\n', ''),
        ('p.part("neck", box(25, 16, 210, true).translate(0, 0, 195).scale(scale).color(color));',
         'p.part("neck", box(25, 16, 210, true).translate(0, 0, 195).scale(scale).color(color));\np.part("fingerboard", box(19, 4, 190, true).translate(0, -10, 195).scale(scale).color(color));'),
        ('p.part("sound-hole", cylinder(5, 22, 10).subtract(cylinder(7, 16, 10).translate(0, 0, -1)).translate(0, 0, 76).scale(scale).color(color));',
         'p.part("sound-hole", cylinder(5, 22, 10).subtract(cylinder(7, 16, 10).translate(0, 0, -1)).rotateX(90).translate(0, -10, 78).scale(scale).color(color));'),
        ('p.part("strings", box(2, 2, 280, true).translate(0, 0, 160).scale(scale).color(color));',
         'p.part("strings", box(2, 2, 280, true).translate(0, -13, 160).scale(scale).color(color));'),
    ],
}

PART_PATCHES = {
    "alto-saxophone": [
        ('p.part("crook", box(75, 20, 18, true).translate(-21, 0, 350).scale(scale).color(color));\np.part("neck", cylinder(82, 12, 8).rotate([1, 0, 0], 90).translate(-52, 0, 349).scale(scale).color(color));',
         'p.part("crook", path().moveTo(8, 328).lineTo(-18, 328).lineTo(-58, 350).lineTo(-58, 386).lineTo(-44, 386).lineTo(-44, 357).lineTo(-12, 342).lineTo(8, 342).close().extrude(14).rotateX(90).translate(0, 7, 0).scale(scale).color(color));\np.part("mouthpiece", box(18, 18, 34, true).rotateZ(-8).translate(-51, -8, 403).scale(scale).color(color));'),
        ('p.part("bell", sphere(58).scale([1, 1, 0.42]).translate(24, 0, 370).scale(scale).color(color));',
         'p.part("bell", path().circle(0, 0, 58, 12).loft(path().circle(0, 0, 18, 12), { spacing: 82, ruled: true }).translate(24, 0, 0).scale(scale).color(color));'),
    ],
    "banjo": [
        ('p.part("rim", cylinder(12, 82, 12).subtract(cylinder(14, 70, 12).translate(0, 0, -1)).translate(0, 0, 26).scale(scale).color(color));',
         'p.part("rim", cylinder(12, 82, 12).subtract(cylinder(14, 70, 12).translate(0, 0, -1)).translate(0, 0, 26).scale(scale).color(color));\np.part("head-skin", cylinder(3, 69, 12).translate(0, 0, 28).scale(scale).color(color));'),
        ('p.part("neck", box(28, 20, 300, true).translate(0, 0, 203).scale(scale).color(color));',
         'p.part("neck", box(28, 20, 300, true).translate(0, 0, 203).scale(scale).color(color));\np.part("fingerboard", box(22, 4, 274, true).translate(0, -12, 203).scale(scale).color(color));'),
    ],
    "bassoon": [
        ('p.part("bocal", cylinder(78, 9, 8).rotate([1, 0, 0], 90).translate(-22, 0, 499).scale(scale).color(color));',
         'p.part("bocal", cylinder(78, 9, 8).rotate([1, 0, 0], 90).translate(-22, 0, 499).scale(scale).color(color));\np.part("reed", box(8, 7, 32, true).rotateZ(-12).translate(-29, -8, 541).scale(scale).color(color));'),
    ],
    "violin": [
        ('p.part("strings", box(2, 2, 280, true).translate(0, 0, 196).scale(scale).color(color));',
         'p.part("strings", box(2, 2, 280, true).translate(0, -14, 196).scale(scale).color(color));\np.part("f-hole-left", sphere(8).scale([0.42, 0.16, 1.4]).translate(-26, -13, 112).scale(scale).color(color));\np.part("f-hole-right", sphere(8).scale([0.42, 0.16, 1.4]).translate(26, -13, 112).scale(scale).color(color));'),
    ],
    "viola": [
        ('p.part("strings", box(2, 2, 310, true).translate(0, 0, 220).scale(scale).color(color));',
         'p.part("strings", box(2, 2, 310, true).translate(0, -15, 220).scale(scale).color(color));\np.part("f-hole-left", sphere(9).scale([0.42, 0.16, 1.5]).translate(-30, -14, 124).scale(scale).color(color));\np.part("f-hole-right", sphere(9).scale([0.42, 0.16, 1.5]).translate(30, -14, 124).scale(scale).color(color));'),
    ],
    "clarinet": [
        ('p.part("mouthpiece", box(22, 20, 72, true).translate(0, 0, 537).scale(scale).color(color));',
         'p.part("mouthpiece", box(22, 20, 72, true).translate(0, 0, 537).scale(scale).color(color));\np.part("ivory-ring-low", cylinder(5, 18, 10).subtract(cylinder(7, 14, 10).translate(0, 0, -1)).translate(0, 0, 46).scale(scale).color(color));\np.part("ivory-ring-high", cylinder(5, 18, 10).subtract(cylinder(7, 14, 10).translate(0, 0, -1)).translate(0, 0, 388).scale(scale).color(color));'),
    ],
    "drum-kit": [
        ('p.part("bass-drum", cylinder(76, 87, 10).rotate([1, 0, 0], 90).translate(0, 0, 87).scale(scale).color(color));',
         'p.part("bass-drum", cylinder(76, 87, 10).rotate([1, 0, 0], 90).translate(0, 0, 87).scale(scale).color(color));\np.part("bass-head-front", cylinder(4, 81, 12).rotateX(90).translate(0, 4, 87).scale(scale).color(color));\np.part("bass-head-rear", cylinder(4, 81, 12).rotateX(-90).translate(0, -80, 87).scale(scale).color(color));'),
        ('p.part("snare", cylinder(46, 48, 10).translate(-132, 0, 74).scale(scale).color(color));',
         'p.part("snare", cylinder(46, 48, 10).translate(-132, 0, 74).scale(scale).color(color));\np.part("snare-head", cylinder(4, 43, 12).translate(-132, 0, 116).scale(scale).color(color));'),
        ('p.part("floor-tom", cylinder(68, 52, 10).translate(115, 0, 40).scale(scale).color(color));',
         'p.part("floor-tom", cylinder(68, 52, 10).translate(115, 0, 40).scale(scale).color(color));\np.part("floor-tom-head", cylinder(4, 47, 12).translate(115, 0, 104).scale(scale).color(color));'),
        ('p.part("rack-tom-right", cylinder(48, 39, 10).translate(64, 0, 164).scale(scale).color(color));',
         'p.part("rack-tom-right", cylinder(48, 39, 10).translate(64, 0, 164).scale(scale).color(color));\np.part("rack-tom-left-head", cylinder(4, 34, 12).translate(-64, 0, 208).scale(scale).color(color));\np.part("rack-tom-right-head", cylinder(4, 34, 12).translate(64, 0, 208).scale(scale).color(color));'),
    ],
    "snare-drum": [
        ('p.part("shell", cylinder(72, 76, 12).translate(0, 0, 84).scale(scale).color(color));',
         'p.part("shell", cylinder(72, 76, 12).translate(0, 0, 84).scale(scale).color(color));\np.part("head", cylinder(4, 72, 12).translate(0, 0, 152).scale(scale).color(color));'),
    ],
    "cello": [
        ('p.part("strings", box(2, 3, 516, true).translate(0, 0, 376).scale(scale).color(color));',
         'p.part("strings", box(2, 3, 516, true).translate(0, -17, 376).scale(scale).color(color));'),
    ],
    "double-bass": [
        ('p.part("strings", box(2, 3, 760, true).translate(0, 0, 515).scale(scale).color(color));',
         'p.part("strings", box(2, 3, 760, true).translate(0, -20, 515).scale(scale).color(color));'),
    ],
    "tenor-saxophone": [
        ('p.part("crook", box(88, 22, 20, true).translate(-25, 0, 417).scale(scale).color(color));\np.part("neck", cylinder(95, 14, 8).rotate([1, 0, 0], 90).translate(-60, 0, 414).scale(scale).color(color));',
         'p.part("crook", path().moveTo(9, 396).lineTo(-22, 396).lineTo(-68, 421).lineTo(-68, 460).lineTo(-53, 460).lineTo(-53, 429).lineTo(-13, 411).lineTo(9, 411).close().extrude(16).rotateX(90).translate(0, 8, 0).scale(scale).color(color));\np.part("mouthpiece", box(18, 18, 36, true).rotateZ(-8).translate(-61, -9, 478).scale(scale).color(color));'),
        ('p.part("bell", sphere(66).scale([1, 1, 0.42]).translate(30, 0, 438).scale(scale).color(color));',
         'p.part("bell", path().circle(0, 0, 66, 12).loft(path().circle(0, 0, 20, 12), { spacing: 94, ruled: true }).translate(30, 0, 0).scale(scale).color(color));'),
    ],
    "tuba": [
        ('p.part("main-bell", sphere(83).scale([1, 1, 0.5]).translate(0, 0, 203).scale(scale).color(color));',
         'p.part("main-bell", path().circle(0, 0, 24, 12).loft(path().circle(0, 0, 83, 12), { spacing: 90, ruled: true }).translate(0, 0, 155).scale(scale).color(color));'),
        ('p.part("valve-three", cylinder(55, 9, 8).translate(65, -26, 62).scale(scale).color(color));',
         'p.part("valve-three", cylinder(55, 9, 8).translate(65, -26, 62).scale(scale).color(color));\np.part("valve-button-one", cylinder(6, 9, 8).translate(15, -26, 117).scale(scale).color(color));\np.part("valve-button-two", cylinder(6, 9, 8).translate(40, -26, 117).scale(scale).color(color));\np.part("valve-button-three", cylinder(6, 9, 8).translate(65, -26, 117).scale(scale).color(color));'),
    ],
}

for _asset_id, _lengths in {
    "violin": (180, 100, 145, 220, 24, 236, 194, 22, -9.5),
    "viola": (205, 120, 160, 245, 28, 262, 208, 24, -10.5),
    "cello": (270, 160, 178, 316, 40, 448, 335, 34, -13.5),
    "double-bass": (330, 150, 220, 390, 50, 654, 490, 42, -16.5),
}.items():
    lower, waist, upper, body_length, depth, neck_z, neck_length, neck_width, face_y = _lengths
    _body_line = f'p.part("body", outlineBody({lower}, {waist}, {upper}, {body_length}, {depth}).scale(scale).color(color));'
    _fingerboard_line = f'p.part("fingerboard", box({neck_width - 4}, 5, {neck_length - 8}, true).translate(0, {face_y}, {neck_z}).scale(scale).color(color));'
    if _asset_id in ("violin", "viola"):
        _old_bouts = ('p.part("lower-bout", sphere(58).scale([1.3, 0.32, 1]).translate(0, 0, 58).scale(scale).color(color));\n'
                      'p.part("upper-bout", sphere(48).scale([1.2, 0.32, 0.92]).translate(0, 0, 139).scale(scale).color(color));')
        if _asset_id == "viola":
            _old_bouts = ('p.part("lower-bout", sphere(67).scale([1.3, 0.32, 1]).translate(0, 0, 67).scale(scale).color(color));\n'
                          'p.part("upper-bout", sphere(54).scale([1.2, 0.32, 0.92]).translate(0, 0, 157).scale(scale).color(color));')
    elif _asset_id == "cello":
        _old_bouts = ('p.part("lower-bout", sphere(118).scale([1.15, 0.34, 1]).translate(0, 0, 118).scale(scale).color(color));\n'
                      'p.part("upper-bout", sphere(80).scale([1.1, 0.34, 0.9]).translate(0, 0, 245).scale(scale).color(color));')
    else:
        _old_bouts = ('p.part("lower-bout", sphere(148).scale([1.1, 0.34, 1]).translate(0, 0, 148).scale(scale).color(color));\n'
                      'p.part("upper-bout", sphere(98).scale([1.1, 0.34, 0.9]).translate(0, 0, 300).scale(scale).color(color));')
    GEOMETRY_PATCHES[_asset_id] = [
        (f'const p = assembly("{_asset_id}");', BODY_HELPER + f'const p = assembly("{_asset_id}");'),
        (_old_bouts, _body_line),
        ('p.part("neck", ', 'p.part("neck", '),
    ]
    GEOMETRY_PATCHES[_asset_id][2] = (re.search(r'p\.part\("neck",[^\n]+', {
        "violin": 'p.part("neck", box(22, 16, 194, true).translate(0, 0, 236).scale(scale).color(color));',
        "viola": 'p.part("neck", box(24, 17, 208, true).translate(0, 0, 262).scale(scale).color(color));',
        "cello": 'p.part("neck", box(34, 22, 335, true).translate(0, 0, 448).scale(scale).color(color));',
        "double-bass": 'p.part("neck", box(42, 26, 490, true).translate(0, 0, 654).scale(scale).color(color));',
    }[_asset_id]).group(0), re.search(r'p\.part\("neck",[^\n]+', {
        "violin": 'p.part("neck", box(22, 16, 194, true).translate(0, 0, 236).scale(scale).color(color));',
        "viola": 'p.part("neck", box(24, 17, 208, true).translate(0, 0, 262).scale(scale).color(color));',
        "cello": 'p.part("neck", box(34, 22, 335, true).translate(0, 0, 448).scale(scale).color(color));',
        "double-bass": 'p.part("neck", box(42, 26, 490, true).translate(0, 0, 654).scale(scale).color(color));',
    }[_asset_id]).group(0) + "\n" + _fingerboard_line)


def main() -> None:
    changed = []
    for path in sorted(KIT.glob("*.kcad.ts")):
        asset_id = path.stem.removesuffix(".kcad")
        materials = M[asset_id]
        rules = R[asset_id]
        src = path.read_text()
        description = re.search(r'"description": "([^"]+)"', src)
        if not description:
            raise SystemExit(f"missing description: {path}")
        identity = description.group(1)
        for old, new in PART_PATCHES.get(asset_id, []):
            if old not in src:
                raise SystemExit(f"{asset_id}: expected detail source fragment was not found: {old[:80]!r}")
            src = src.replace(old, new, 1)
        for old, new in GEOMETRY_PATCHES.get(asset_id, []):
            if old == new:
                continue
            if old not in src:
                # The optional neck placeholder is replaced below with an exact source line.
                if old == 'p.part("neck", ':
                    continue
                raise SystemExit(f"{asset_id}: expected geometry source fragment was not found: {old[:80]!r}")
            src = src.replace(old, new, 1)
        # Material knobs replace the single generic part-wide color control.
        declaration = "\n".join(
            f"const {name} = param('{name}', '{default}', {{ label: '{label}' }});"
            for name, label, default, _, _ in materials
        )
        primary = materials[0][0]
        concert, vintage = materials[0][3], materials[0][4]
        declaration += (
            "\n\npresets({\n"
            f"  concert: {{ {primary}: '{concert}' }},\n"
            f"  vintage: {{ {primary}: '{vintage}' }},\n"
            "});"
        )
        src, count = re.subn(
            r"const color = param\('color', .*?\);", declaration, src, count=1
        )
        if count != 1:
            raise SystemExit(f"expected one generic color knob: {path}")

        used = {name: 0 for name, *_ in materials}
        part_count = 0
        output_lines = []
        for line in src.splitlines():
            match = re.search(r'\.part\("([^"]+)"', line)
            if match:
                part_count += 1
                part_name = match.group(1)
                material = primary
                for pattern, candidate in rules:
                    if re.search(pattern, part_name):
                        material = candidate
                        break
                if f"const {material} =" not in declaration:
                    raise SystemExit(f"{asset_id}/{part_name}: unknown material {material}")
                if ".color(color)" not in line:
                    raise SystemExit(f"{asset_id}/{part_name}: expected generic part color")
                line = line.replace(".color(color)", f".color({material})")
                used[material] += 1
            output_lines.append(line)
        if part_count == 0 or any(not count for count in used.values()):
            raise SystemExit(f"{asset_id}: missing parts or unused material controls {used}")
        src = "\n".join(output_lines) + "\n"
        # Make the visual identity and material roles apparent to readers and the asset browser.
        if not src.startswith("// Distinctive silhouette:"):
            src = f"// Distinctive silhouette: {identity}\n" + src
        knobs = ", ".join(label.lower() for _, label, *_ in materials)
        new_description = f'{identity} Material controls: {knobs}; concert and vintage presets.'
        src = src.replace(description.group(1), new_description, 1)
        path.write_text(src)
        changed.append({
            "id": asset_id,
            "parts": part_count,
            "materials": [name for name, *_ in materials],
            "materialLabels": [label for _, label, *_ in materials],
            "materialUsage": used,
            "presets": ["concert", "vintage"],
        })

    if len(changed) != 40:
        raise SystemExit(f"expected 40 music sources, changed {len(changed)}")
    BUNDLE.mkdir(parents=True, exist_ok=True)
    (BUNDLE / "material-map.json").write_text(json.dumps(changed, indent=2) + "\n")
    print(f"Promoted {len(changed)} music assets; material role map: {BUNDLE / 'material-map.json'}")


if __name__ == "__main__":
    main()
