// Distinctive silhouette: Accordion with visible bellows ribs, button rows and a piano-key strip on its end. Material controls: case lacquer, bellows fabric, ivory keys, nickel buttons; concert and vintage presets.
meta({
  "name": "accordion",
  "license": "CC0-1.0",
  "title": "Accordion",
  "description": "Accordion with visible bellows ribs, button rows and a piano-key strip on its end.",
  "tags": [
    "accordion",
    "music",
    "instrument",
    "orchestra",
    "low poly",
    "CC0"
  ],
  "kit": "music",
  "category": "prop",
  "origin": "base",
  "compat": [
    "music",
    "orchestra",
    "stage",
    "indoor"
  ],
  "triangleBudget": 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const lacquer = param('lacquer', '#b83b47', { label: 'Case lacquer' });
const bellows = param('bellows', '#302b34', { label: 'Bellows fabric' });
const ivory = param('ivory', '#eee2c6', { label: 'Ivory keys' });
const nickel = param('nickel', '#b6c0c4', { label: 'Nickel buttons' });

presets({
  concert: { lacquer: '#25617a' },
  vintage: { lacquer: '#71323d' },
});
const p = assembly("accordion");
p.part("left-end", box(82, 76, 220, true).translate(-92, 0, 110).scale(scale).color(lacquer));
p.part("bellows", box(130, 70, 205, true).translate(0, 0, 105).scale(scale).color(bellows));
p.part("fold-01", box(6, 76, 196, true).translate(-52, 0, 105).scale(scale).color(bellows));
p.part("fold-02", box(6, 76, 196, true).translate(-36, 0, 105).scale(scale).color(bellows));
p.part("fold-03", box(6, 76, 196, true).translate(-20, 0, 105).scale(scale).color(bellows));
p.part("fold-04", box(6, 76, 196, true).translate(-4, 0, 105).scale(scale).color(bellows));
p.part("fold-05", box(6, 76, 196, true).translate(12, 0, 105).scale(scale).color(bellows));
p.part("fold-06", box(6, 76, 196, true).translate(28, 0, 105).scale(scale).color(bellows));
p.part("fold-07", box(6, 76, 196, true).translate(44, 0, 105).scale(scale).color(bellows));
p.part("right-end", box(76, 76, 220, true).translate(104, 0, 110).scale(scale).color(lacquer));
p.part("keyboard", box(30, 82, 210, true).translate(158, -2, 110).scale(scale).color(ivory));
p.part("key-one", box(9, 14, 28, true).translate(177, -39, 46).scale(scale).color(ivory));
p.part("key-two", box(9, 14, 28, true).translate(177, -39, 78).scale(scale).color(ivory));
p.part("key-three", box(9, 14, 28, true).translate(177, -39, 110).scale(scale).color(ivory));
p.part("key-four", box(9, 14, 28, true).translate(177, -39, 142).scale(scale).color(ivory));
p.part("key-five", box(9, 14, 28, true).translate(177, -39, 174).scale(scale).color(ivory));
p.part("button-row", box(14, 10, 164, true).translate(-112, -42, 110).scale(scale).color(nickel));

return p.model();
