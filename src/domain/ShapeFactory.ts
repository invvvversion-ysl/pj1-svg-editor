import { DomainError } from "./DomainError.js";
import { Circle } from "./shapes/Circle.js";
import { Ellipse } from "./shapes/Ellipse.js";
import { Group } from "./shapes/Group.js";
import { Line } from "./shapes/Line.js";
import { Rect } from "./shapes/Rect.js";
import type { Shape } from "./shapes/Shape.js";
import { Text } from "./shapes/Text.js";

/** Named dispatch point 2 of 2. Future refactor: register ShapeProvider objects. */
export class ShapeFactory {
  private readonly creators = new Map<string, (id: string, args: readonly string[]) => Shape>([
    ["rect", Rect.fromArguments],
    ["circle", Circle.fromArguments],
    ["ellipse", Ellipse.fromArguments],
    ["line", Line.fromArguments],
    ["text", Text.fromArguments],
    ["g", Group.fromArguments],
  ]);

  create(type: string, id: string, args: readonly string[] = []): Shape {
    const create = this.creators.get(type);
    if (create === undefined) {
      throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return create(id, args);
  }
}
