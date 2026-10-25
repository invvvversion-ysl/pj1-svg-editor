import { DomainError } from "../DomainError.js";
import { NumericValue } from "../NumericValue.js";
import type { SvgElement } from "../SvgElement.js";
import type { Group } from "./Group.js";

export abstract class Shape {
  private readonly style = new Map<string, string>();

  constructor(private readonly shapeId: string) {
    if (shapeId.length === 0 || /[\s\u0000-\u001f\u007f]/u.test(shapeId)) {
      throw new DomainError(`invalid id: ${shapeId}`);
    }
  }

  get id(): string { return this.shapeId; }
  abstract get type(): string;
  get isContainer(): boolean { return false; }
  get children(): readonly Shape[] { return []; }
  get textContent(): string | undefined { return undefined; }

  asGroup(): Group {
    throw new DomainError(`not a container: ${this.id}`);
  }

  /** Returns a new list; callers cannot change the topology through this view. */
  walk(): readonly Shape[] {
    return [this, ...this.children.flatMap(child => child.walk())];
  }

  move(dx: number, dy: number): void {
    NumericValue.finite(dx, "dx");
    NumericValue.finite(dy, "dy");
    // Plan every leaf before applying any change, including overflow validation.
    const changes = this.walk().map(shape => shape.planMove(dx, dy));
    for (const apply of changes) apply();
  }

  scale(factor: number): void {
    NumericValue.positive(factor, "scale factor");
    const changes = this.walk().map(shape => shape.planScale(factor));
    for (const apply of changes) apply();
  }

  setAttribute(name: string, value: string): void {
    if (name === "fill" || name === "stroke") {
      this.style.set(name, value);
      return;
    }
    if (name === "stroke-width") {
      this.style.set(name, String(NumericValue.nonNegative(value, name)));
      return;
    }
    this.setOwnAttribute(name, value);
  }

  getAttribute(name: string): string | undefined {
    const attributes = this.attributes();
    return Object.hasOwn(attributes, name) ? attributes[name] : undefined;
  }

  attributes(): Readonly<Record<string, string>> {
    return Object.freeze({ id: this.id, ...this.ownAttributes(), ...Object.fromEntries(this.style) });
  }

  toSvgElement(): SvgElement {
    const common = {
      name: this.type,
      attributes: this.attributes(),
      children: this.children.map(child => child.toSvgElement()),
    };
    const text = this.textContent;
    return text === undefined ? common : { ...common, text };
  }

  abstract clone(): Shape;

  protected copyStyleTo<T extends Shape>(target: T): T {
    for (const [name, value] of this.style) target.setAttribute(name, value);
    return target;
  }

  protected ownAttributes(): Readonly<Record<string, string>> { return {}; }

  protected setOwnAttribute(name: string, _value: string): void {
    throw new DomainError(`unknown attribute: ${name}`);
  }

  protected planMove(_dx: number, _dy: number): () => void { return () => {}; }
  protected planScale(_factor: number): () => void { return () => {}; }
}
