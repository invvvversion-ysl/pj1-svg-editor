import type { DocumentPresenter } from "../application/ports/DocumentPresenter.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { ShapeFormatter } from "./ShapeFormatter.js";

export class TextDocumentPresenter implements DocumentPresenter {
  private readonly formatter = new ShapeFormatter();

  tree(document: SvgDocument, id?: string): readonly string[] {
    if (id !== undefined) {
      const shape = document.getShape(id);
      return [this.formatter.summary(shape), ...this.children(shape.children, "")];
    }
    return [`svg (${document.width}x${document.height})`, ...this.children(document.roots, "")];
  }

  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.getShape(id);
    const parentId = document.parentIdOf(id);
    const parent = parentId === undefined ? "svg" : this.formatter.label(document.getShape(parentId));
    return [
      `${this.formatter.label(shape)}  parent=${parent}`,
      ...this.formatter.details(shape).map(line => `  ${line}`),
    ];
  }

  private children(nodes: readonly Shape[], prefix: string): readonly string[] {
    return nodes.flatMap((shape, index) => {
      const last = index === nodes.length - 1;
      return [
        `${prefix}${last ? "└── " : "├── "}${this.formatter.summary(shape)}`,
        ...this.children(shape.children, `${prefix}${last ? "    " : "│   "}`),
      ];
    });
  }
}
