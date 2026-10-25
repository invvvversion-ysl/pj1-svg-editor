import { DomainError } from "../DomainError.js";
import { ShapeArguments } from "../ShapeArguments.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";
import { Shape } from "./Shape.js";

export class Group extends Shape {
  private childNodes: readonly Shape[];

  /** Own the subtree by cloning it. Structural changes create a replacement group. */
  constructor(id: string, children: readonly Shape[] = []) {
    super(id);
    const ids = new Set([id]);
    for (const node of children.flatMap(child => child.walk())) {
      if (ids.has(node.id)) throw new DomainError(`id already exists: ${node.id}`);
      ids.add(node.id);
    }
    this.childNodes = children.map(child => child.clone());
  }

  override get type(): string { return "g"; }
  override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitGroup(this); }
  override get isContainer(): boolean { return true; }
  override get children(): readonly Shape[] { return [...this.childNodes]; }
  override asGroup(): Group { return this; }

  static fromArguments(id: string, values: readonly string[]): Group {
    new ShapeArguments(values, "g <id>", 0);
    return new Group(id);
  }

  withChildren(children: readonly Shape[]): Group {
    return this.copyStyleTo(new Group(this.id, children));
  }

  override clone(): Group {
    // An existing valid tree can be copied without revalidating every subtree.
    const copy = new Group(this.id);
    copy.childNodes = this.childNodes.map(child => child.clone());
    return this.copyStyleTo(copy);
  }
}
