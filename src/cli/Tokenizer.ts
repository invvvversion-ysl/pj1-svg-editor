import { CommandError } from "../application/CommandError.js";

export class Tokenizer {
  tokenize(line: string): readonly string[] {
    if (line.trimStart().startsWith("#")) return [];
    const tokens: string[] = [];
    let current = "";
    let quoted = false;
    let started = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        quoted = !quoted;
        started = true;
      } else if (quoted && char === "\\" && (line[index + 1] === '"' || line[index + 1] === "\\")) {
        current += line[++index];
        started = true;
      } else if (!quoted && /\s/u.test(char ?? "")) {
        if (started) tokens.push(current);
        current = "";
        started = false;
      } else {
        current += char;
        started = true;
      }
    }
    if (quoted) throw new CommandError("unterminated double quote");
    if (started) tokens.push(current);
    return tokens;
  }
}
