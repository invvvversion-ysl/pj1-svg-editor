import type { Circle } from "./shapes/Circle.js";
import type { Ellipse } from "./shapes/Ellipse.js";
import type { Group } from "./shapes/Group.js";
import type { Line } from "./shapes/Line.js";
import type { Rect } from "./shapes/Rect.js";
import type { Text } from "./shapes/Text.js";

/** Typed double dispatch: operations can inspect each shape without testing tag names. */
export interface ShapeVisitor<T> {
  visitRect(shape: Rect): T;
  visitCircle(shape: Circle): T;
  visitEllipse(shape: Ellipse): T;
  visitLine(shape: Line): T;
  visitText(shape: Text): T;
  visitGroup(shape: Group): T;
}
