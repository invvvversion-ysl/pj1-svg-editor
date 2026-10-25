import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { EditorApplication } from "../dist/EditorApplication.js";
import { CommandError } from "../dist/application/CommandError.js";
import { SvgFileRepository } from "../dist/infrastructure/SvgFileRepository.js";

class SvgDemo {
  #application = new EditorApplication();

  async run() {
    await mkdir(new URL("./generated/", import.meta.url), { recursive: true });
    const script = await readFile(new URL("./stage5.txt", import.meta.url), "utf8");
    const errors = [];
    const warnings = [];
    for (const line of script.split(/\r?\n/u)) {
      if (line.trim().length === 0 || line.trimStart().startsWith("#")) continue;
      console.log(`\nsvg> ${line}`);
      try {
        for (const message of await this.#application.execute(line)) {
          console.log(message);
          if (message.startsWith("warning:")) warnings.push(message);
        }
      } catch (error) {
        if (!(error instanceof CommandError)) throw error;
        errors.push(error.message);
        console.log(`error: ${error.message}`);
      }
    }
    assert.deepEqual(errors, ["undo not allowed after io command", "undo not allowed after io command", "cannot read file: examples/input/no-such.svg"]);
    assert.deepEqual(warnings, ["warning: assigned id rect1 to unnamed <rect>"]);
    const repository = new SvgFileRepository();
    const flowchart = await repository.load("examples/generated/flowchart.svg");
    const imported = await repository.load("examples/generated/imported.svg");
    assert.equal(flowchart.document.size, 8);
    assert.equal(flowchart.document.getShape("process-label").textContent, "处理数据 v2");
    assert.equal(imported.document.size, 7);
    assert.equal(imported.document.getShape("c1").getAttribute("cx"), "55");
    assert.deepEqual(imported.warnings, []);
    console.log("\nVerified: flowchart.svg has 8 elements; imported.svg has 7, c1.cx=55; saved ids need no new warnings.");
  }
}

await new SvgDemo().run();
