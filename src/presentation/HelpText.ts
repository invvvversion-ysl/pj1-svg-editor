export class HelpText {
  lines(): readonly string[] {
    return [
      "PJ1 Phase 1 — stage 2: domain model ready",
      "Available: help",
      "Model demo: npm run demo:model (outside this REPL).",
      "Blank lines and lines starting with # are ignored.",
      "Exit using terminal EOF (Windows: Ctrl+Z, then Enter).",
      "",
      "Planned commands (not implemented yet):",
      "  init [w] [h] | read <file.svg> | save [file.svg] | canvas [w] [h]",
      "  create <type> <id> [params...] [in <containerId>]",
      "  delete <id> | move <id> <dx> <dy> | scale <id> <factor>",
      "  set <id> <attr> <value> | group <newGid> <id1> <id2>...",
      "  ungroup <gid> | addto <gid> <id> | front <id> | back <id>",
      "  tree [id] | show <id> | undo | redo",
      "Domain model built-ins: rect, circle, ellipse, line, text, g (CLI create pending).",
    ];
  }
}
