import { readFile } from "node:fs/promises";
import { EditorApplication } from "../dist/EditorApplication.js";

class ViewDemo {
  #application = new EditorApplication();

  async run() {
    const script = await readFile(new URL("./stage4.txt", import.meta.url), "utf8");
    for (const line of script.split(/\r?\n/u)) {
      if (line.trim().length === 0 || line.trimStart().startsWith("#")) continue;
      console.log(`\nsvg> ${line}`);
      for (const message of await this.#application.execute(line)) console.log(message);
    }
  }
}

await new ViewDemo().run();
