export class HelpText {
  lines(): readonly string[] {
    return [
      "PJ1 Phase 1 — stage 3: editing commands and undo/redo",
      "Blank lines and lines starting with # are ignored.",
      'Use double quotes for spaces or empty values; inside quotes, \\" and \\\\ escape quotes and backslashes.',
      "Exit using terminal EOF (Windows: Ctrl+Z, then Enter).",
      "",
      "Available commands:",
      "  init [w] [h] | canvas [w h] | help",
      "  create <type> <id> [params...] [in <containerId>]",
      "  delete <id> | move <id> <dx> <dy> | scale <id> <factor>",
      "  set <id> <attr> <value> | group <newGid> <id1> <id2>...",
      "  ungroup <gid> | addto <gid> <id> | front <id> | back <id>",
      "  undo | redo",
      "Create parameters:",
      "  rect <id> <x> <y> <w> <h> [fill]",
      "  circle <id> <cx> <cy> <r> [fill]",
      "  ellipse <id> <cx> <cy> <rx> <ry> [fill]",
      "  line <id> <x1> <y1> <x2> <y2> [stroke]",
      '  text <id> <x> <y> "content"',
      "  g <id>",
      "Successful init/canvas resize clear history; undo/redo stay blocked until a successful edit.",
      "Planned: tree [id], show <id> (stage 4); read <file.svg>, save [file.svg] (stage 5).",
    ];
  }
}
