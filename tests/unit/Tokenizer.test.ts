import { describe, expect, it } from "vitest";
import { CommandError } from "../../src/application/CommandError.js";
import { Tokenizer } from "../../src/cli/Tokenizer.js";

describe("Tokenizer", () => {
  const tokenizer = new Tokenizer();

  it.each([
    ["", []],
    ["   \t", []],
    [' # comment with "unclosed quote', []],
    ["help", ["help"]],
    ["  move\tr1  -1.5   2e2  ", ["move", "r1", "-1.5", "2e2"]],
    ['create text t1 10 20 "开始 Start"', ["create", "text", "t1", "10", "20", "开始 Start"]],
    ['set t1 text ""', ["set", "t1", "text", ""]],
    ['set t1 text "  keep spaces  "', ["set", "t1", "text", "  keep spaces  "]],
    ["set r1 fill #4a90d9", ["set", "r1", "fill", "#4a90d9"]],
    ['set t1 text "# literal"', ["set", "t1", "text", "# literal"]],
    ["help # not an inline comment", ["help", "#", "not", "an", "inline", "comment"]],
    [String.raw`read D:\diagrams\file.svg`, ["read", String.raw`D:\diagrams\file.svg`]],
    [String.raw`read "D:\my diagrams\file.svg"`, ["read", String.raw`D:\my diagrams\file.svg`]],
    [String.raw`set t text "say \"hello\""`, ["set", "t", "text", 'say "hello"']],
    [String.raw`set t text "one\\two"`, ["set", "t", "text", String.raw`one\two`]],
    [String.raw`set t text "literal\n"`, ["set", "t", "text", String.raw`literal\n`]],
    ['set t text "in"', ["set", "t", "text", "in"]],
    ['set t text a" b "c', ["set", "t", "text", "a b c"]],
  ] as const)("tokenizes %s", (source, tokens) => {
    expect(tokenizer.tokenize(source)).toEqual(tokens);
  });

  it.each(['"', 'set t text "unfinished', 'set t text "escaped\\"'])("rejects an unterminated quote: %s", source => {
    expect(() => tokenizer.tokenize(source)).toThrow(new CommandError("unterminated double quote"));
    expect(tokenizer.tokenize("help")).toEqual(["help"]);
  });
});
