import { readFile } from "node:fs/promises";
import { EditorApplication } from "../dist/EditorApplication.js";
import { CommandError } from "../dist/application/CommandError.js";

class CommandDemo {
  #application = new EditorApplication();

  async run() {
    const script = await readFile(new URL("./stage3.txt", import.meta.url), "utf8");
    for (const line of script.split(/\r?\n/u)) {
      if (line.trim().length === 0 || line.trimStart().startsWith("#")) continue;
      console.log(`svg> ${line}`);
      try {
        for (const message of await this.#application.execute(line)) console.log(message);
      } catch (error) {
        if (!(error instanceof CommandError)) throw error;
        console.log(`error: ${error.message}`);
      }
    }
    const document = this.#application.documentSnapshot();
    console.log("\nFinal r1: " + JSON.stringify(document.getShape("r1").attributes()));
    console.log("Final title: " + JSON.stringify(document.getShape("title").textContent));
    console.log(`Final canvas: ${document.width}x${document.height}, ${document.size} elements`);
    console.log("Expected: r1=(21,15), size=50x25; empty title; canvas=640x480; 7 elements.");
  }
}

await new CommandDemo().run();
