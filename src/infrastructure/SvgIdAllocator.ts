import { DomainError } from "../domain/DomainError.js";
import type { SvgElement } from "../domain/SvgElement.js";

export class SvgIdAllocator {
  private readonly reserved = new Set<string>();
  private readonly counters = new Map<string, number>();
  private readonly messages: string[] = [];

  constructor(elements: readonly SvgElement[]) {
    for (const element of elements) this.reserve(element);
  }

  get warnings(): readonly string[] { return [...this.messages]; }

  assign(element: SvgElement): SvgElement {
    let id = element.attributes.id;
    if (id === undefined || id.length === 0) {
      let next = this.counters.get(element.name) ?? 1;
      while (this.reserved.has(`${element.name}${next}`)) next++;
      id = `${element.name}${next}`;
      this.counters.set(element.name, next + 1);
      this.reserved.add(id);
      this.messages.push(`warning: assigned id ${id} to unnamed <${element.name}>`);
    }
    return { ...element, attributes: { ...element.attributes, id }, children: element.children.map(child => this.assign(child)) };
  }

  private reserve(element: SvgElement): void {
    const id = element.attributes.id;
    if (id !== undefined && id.length > 0) {
      if (this.reserved.has(id)) throw new DomainError(`id already exists: ${id}`);
      this.reserved.add(id);
    }
    for (const child of element.children) this.reserve(child);
  }
}
