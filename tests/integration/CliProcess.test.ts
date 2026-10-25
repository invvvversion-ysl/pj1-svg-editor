import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SvgFileRepository } from "../../src/infrastructure/SvgFileRepository.js";
import { TestWorkspace } from "../support/TestWorkspace.js";

describe("real CLI stdin with async IO and EOF", () => {
  let workspace: TestWorkspace;
  const entry = fileURLToPath(new URL("../../dist/main.js", import.meta.url));
  beforeEach(async () => { workspace = await TestWorkspace.create(); });
  afterEach(async () => { await workspace.cleanup(); });

  it("drains every command after EOF arrives during save/read, without prompting a closed interface", async () => {
    const input = [
      "init", 'create text label 10 20 "开始 & End"', 'save "async.svg"', 'read "async.svg"',
      "show label", "move label 5 0", "save", 'read "missing.svg"', "tree", "",
    ].join("\n");
    const result = spawnSync(process.execPath, [entry], { cwd: workspace.directory, input, encoding: "utf8", timeout: 15000 });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.match(/saved to async.svg/g)).toHaveLength(2);
    expect(result.stdout).toContain("read async.svg (1 elements)");
    expect(result.stdout).toContain("text#label  parent=svg");
    expect(result.stdout).toContain("error: cannot read file: missing.svg");
    expect(result.stdout).toContain('text#label (15,20) "开始 & End"');
    expect((await new SvgFileRepository().load(workspace.file("async.svg"))).document.getShape("label").getAttribute("x")).toBe("15");
  });

  it("processes a final line without a newline after reading an unnamed external shape", async () => {
    await workspace.write("input.svg", '<svg><rect width="10" height="20"/></svg>');
    const result = spawnSync(process.execPath, [entry], {
      cwd: workspace.directory, input: 'read "input.svg"\nshow rect1', encoding: "utf8", timeout: 15000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("warning: assigned id rect1 to unnamed <rect>");
    expect(result.stdout).toContain("rect#rect1  parent=svg");
    expect(result.stdout).toContain("x=0 y=0 width=10 height=20");
  });
});
