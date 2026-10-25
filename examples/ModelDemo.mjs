import { DomainError } from "../dist/domain/DomainError.js";
import { ShapeFactory } from "../dist/domain/ShapeFactory.js";
import { SvgDocument } from "../dist/domain/SvgDocument.js";

/** Runs model APIs directly; the CLI edit commands arrive in stage 3. */
class ModelDemo {
  #factory = new ShapeFactory();
  #document = new SvgDocument();

  run() {
    this.#document.insert(this.#factory.create("g", "scene"));
    this.#document.insert(this.#factory.create("g", "node"), "scene");
    this.#document.insert(this.#factory.create("rect", "box", ["10", "20", "100", "50", "#4a90d9"]), "node");
    this.#document.insert(this.#factory.create("text", "label", ["20", "50", "开始 Start"]), "node");
    this.#document.insert(this.#factory.create("circle", "dot", ["200", "100", "20", "red"]), "scene");
    this.#document.insert(this.#factory.create("ellipse", "oval", ["300", "100", "30", "15"]), "scene");
    this.#document.insert(this.#factory.create("line", "edge", ["110", "45", "180", "100", "black"]), "scene");
    console.log("[1] Built all six types; canvas=800x600, elements=" + this.#document.size);
    this.#show("box");
    this.#show("label");

    const snapshot = this.#document.clone();
    this.#document.move("node", 30, 10);
    this.#document.scale("node", 0.5);
    console.log("\n[2] Moved node by (30,10), then scaled positions and sizes by 0.5");
    this.#show("box");
    this.#show("label");
    console.log("Snapshot box x remains " + snapshot.getShape("box").getAttribute("x"));

    this.#document.group("marks", ["oval", "dot"]);
    console.log("\n[3] Grouped in original document order: " + this.#document.getContainer("marks").children.map(child => child.id).join(", "));
    const before = JSON.stringify(this.#document.toSvgElement());
    try {
      this.#document.addTo("node", "scene");
      throw new Error("Expected cycle rejection");
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      console.log("Expected error: " + error.message);
    }
    console.log("Document unchanged after error: " + (before === JSON.stringify(this.#document.toSvgElement())));
    this.#document.ungroup("marks");
    console.log("\n[4] Ungrouped marks; scene children: " + this.#document.getContainer("scene").children.map(child => child.id).join(", "));
    console.log("This demonstrates the domain model; SVG file I/O and CLI edits are not implemented yet.");
  }

  #show(id) {
    const shape = this.#document.getShape(id);
    console.log(`${shape.type}#${id} ${JSON.stringify(shape.attributes())}` + (shape.textContent === undefined ? "" : ` text=${JSON.stringify(shape.textContent)}`));
  }
}

new ModelDemo().run();
