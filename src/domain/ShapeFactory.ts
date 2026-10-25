import { DomainError } from "./DomainError.js";
import type { SvgElement } from "./SvgElement.js";
import { Circle } from "./shapes/Circle.js";
import { Ellipse } from "./shapes/Ellipse.js";
import { Group } from "./shapes/Group.js";
import { Line } from "./shapes/Line.js";
import { Rect } from "./shapes/Rect.js";
import type { Shape } from "./shapes/Shape.js";
import { Text } from "./shapes/Text.js";

interface ShapeDefinition {
  readonly create: (id: string, args: readonly string[]) => Shape;
  readonly empty: (id: string) => Shape;
}

/** Named dispatch point 2 of 2. Future refactor: register ShapeProvider objects. */
export class ShapeFactory {
  private readonly creators = new Map<string, ShapeDefinition>([
    ["rect", { create: Rect.fromArguments, empty: id => new Rect(id, 0, 0, 0, 0) }],
    ["circle", { create: Circle.fromArguments, empty: id => new Circle(id, 0, 0, 0) }],
    ["ellipse", { create: Ellipse.fromArguments, empty: id => new Ellipse(id, 0, 0, 0, 0) }],
    ["line", { create: Line.fromArguments, empty: id => new Line(id, 0, 0, 0, 0) }],
    ["text", { create: Text.fromArguments, empty: id => new Text(id, 0, 0, "") }],
    ["g", { create: Group.fromArguments, empty: id => new Group(id) }],
  ]);

  create(type: string, id: string, args: readonly string[] = []): Shape {
    return this.definition(type).create(id, args);
  }

  fromElement(element: SvgElement): Shape {
    const definition = this.definition(element.name);
    const id = element.attributes.id;
    if (id === undefined) throw new DomainError(`missing id on <${element.name}>`);
    let shape = definition.empty(id);
    const geometry = shape.attributes();
    for (const [name, value] of Object.entries(element.attributes)) {
      if (name === "id") continue;
      if (name === "text") throw new DomainError("unknown attribute: text (SVG text is child content)");
      const numeric = Object.hasOwn(geometry, name) || name === "stroke-width";
      shape.setAttribute(name, numeric ? value.trim().replace(/px$/u, "") : value);
    }
    if (shape.textContent !== undefined) {
      shape.setAttribute("text", element.text ?? "");
    } else if (!/^[\t\r\n ]*$/u.test(element.text ?? "")) {
      throw new DomainError(`unsupported text content in <${element.name}>`);
    }
    if (element.children.length > 0) {
      if (!shape.isContainer) throw new DomainError(`unsupported SVG children in <${element.name}>`);
      shape = shape.asGroup().withChildren(element.children.map(child => this.fromElement(child)));
    }
    return shape;
  }

  private definition(type: string): ShapeDefinition {
    const definition = this.creators.get(type);
    if (definition === undefined) throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
}
