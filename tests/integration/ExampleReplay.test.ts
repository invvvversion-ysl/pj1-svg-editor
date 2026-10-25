import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { EditorApplication } from "../../src/EditorApplication.js";
import { CommandError } from "../../src/application/CommandError.js";

it("replays the shipped stage-3 example with exactly its expected errors and final state", async () => {
  const app = new EditorApplication();
  const script = await readFile(new URL("../../examples/stage3.txt", import.meta.url), "utf8");
  const errors: string[] = [];
  for (const line of script.split(/\r?\n/u)) {
    try {
      await app.execute(line);
    } catch (error: unknown) {
      if (!(error instanceof CommandError)) throw error;
      errors.push(error.message);
    }
  }
  expect(errors).toEqual([
    "undo not allowed after io command",
    "cannot group a container into its own descendant: node",
    "scale factor must be positive",
    "nothing to redo",
    "undo not allowed after io command",
  ]);
  const document = app.documentSnapshot();
  expect(document.getShape("r1").attributes()).toEqual({ id: "r1", x: "21", y: "15", width: "50", height: "25", fill: "#4a90d9" });
  expect(document.getShape("title").textContent).toBe("");
  expect(document.width).toBe(640);
  expect(document.height).toBe(480);
  expect(document.size).toBe(7);
  expect(document.getContainer("scene").children.map(node => node.id)).toEqual(["node", "c1", "e1", "edge"]);
});
