import { DomainError } from "./DomainError.js";
import { NumericValue } from "./NumericValue.js";
import type { SvgElement } from "./SvgElement.js";
import { Group } from "./shapes/Group.js";
import type { Shape } from "./shapes/Shape.js";

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private rootNodes: readonly Shape[] = [];
  private index = new Map<string, Shape>();
  private parents = new Map<string, string | undefined>();

  constructor(width = 800, height = 600, roots: readonly Shape[] = []) {
    this.canvasWidth = NumericValue.positive(width, "canvas width");
    this.canvasHeight = NumericValue.positive(height, "canvas height");
    this.install(roots);
  }

  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get size(): number { return this.index.size; }
  get roots(): readonly Shape[] { return [...this.rootNodes]; }

  getShape(id: string): Shape {
    const shape = this.index.get(id);
    if (shape === undefined) throw new DomainError(`no such shape: ${id}`);
    return shape;
  }

  getContainer(id: string): Group {
    const shape = this.index.get(id);
    if (shape === undefined) throw new DomainError(`no such container: ${id}`);
    return shape.asGroup();
  }

  parentIdOf(id: string): string | undefined {
    this.getShape(id);
    return this.parents.get(id);
  }

  resize(width: number, height: number): void {
    const nextWidth = NumericValue.positive(width, "canvas width");
    const nextHeight = NumericValue.positive(height, "canvas height");
    this.canvasWidth = nextWidth;
    this.canvasHeight = nextHeight;
  }

  insert(shape: Shape, parentId?: string): Shape {
    if (parentId !== undefined) this.getContainer(parentId);
    this.assertAvailable(shape.walk().map(node => node.id));
    const roots = this.updateChildren(this.rootNodes, parentId, children => [...children, shape]);
    this.install(roots);
    return this.getShape(shape.id);
  }

  delete(id: string): void {
    this.getShape(id);
    this.install(this.without(this.rootNodes, new Set([id])));
  }

  move(id: string, dx: number, dy: number): void { this.getShape(id).move(dx, dy); }
  scale(id: string, factor: number): void { this.getShape(id).scale(factor); }
  setAttribute(id: string, name: string, value: string): void { this.getShape(id).setAttribute(name, value); }

  addTo(containerId: string, id: string): void {
    this.getShape(containerId).asGroup();
    const shape = this.getShape(id);
    if (shape.walk().some(node => node.id === containerId)) {
      throw new DomainError(`cannot move a container into its own descendant: ${id}`);
    }
    const stripped = this.without(this.rootNodes, new Set([id]));
    this.install(this.updateChildren(stripped, containerId, children => [...children, shape]));
  }

  group(newId: string, ids: readonly string[]): Group {
    new Group(newId); // Validate the proposed id before any tree changes.
    this.assertAvailable([newId]);
    if (ids.length < 2) throw new DomainError("group requires at least two shapes");
    const selectedIds = new Set<string>();
    const selected = ids.map(id => {
      if (selectedIds.has(id)) throw new DomainError(`duplicate shape id: ${id}`);
      selectedIds.add(id);
      return this.getShape(id);
    });
    for (const shape of selected) {
      if (shape.walk().slice(1).some(node => selectedIds.has(node.id))) {
        throw new DomainError(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }

    const ordered = this.rootNodes.flatMap(root => root.walk()).filter(node => selectedIds.has(node.id));
    const parentId = this.commonParent(selected);
    const siblings = parentId === undefined ? this.rootNodes : this.getContainer(parentId).children;
    const positions = selected.map(shape => {
      let branch = shape.id;
      while (this.parentIdOf(branch) !== parentId) {
        const parent = this.parentIdOf(branch);
        if (parent === undefined) throw new Error("common parent invariant failed");
        branch = parent;
      }
      return siblings.findIndex(node => node.id === branch);
    });
    const insertionIndex = Math.min(...positions);
    const group = new Group(newId, ordered);
    const stripped = this.without(this.rootNodes, selectedIds);
    this.install(this.updateChildren(stripped, parentId, children => [
      ...children.slice(0, insertionIndex), group, ...children.slice(insertionIndex),
    ]));
    return this.getContainer(newId);
  }

  ungroup(id: string): void {
    const group = this.getShape(id).asGroup();
    const parentId = this.parentIdOf(id);
    if (parentId === undefined) throw new DomainError(`cannot ungroup top-level container: ${id}`);
    this.install(this.updateChildren(this.rootNodes, parentId, children =>
      children.flatMap(child => child.id === id ? group.children : [child]),
    ));
  }

  front(id: string): void { this.reorder(id, true); }
  back(id: string): void { this.reorder(id, false); }

  clone(): SvgDocument {
    return new SvgDocument(this.width, this.height, this.rootNodes);
  }

  toSvgElement(): SvgElement {
    return {
      name: "svg",
      attributes: {
        xmlns: "http://www.w3.org/2000/svg",
        width: String(this.width), height: String(this.height),
        viewBox: `0 0 ${this.width} ${this.height}`,
      },
      children: this.rootNodes.map(shape => shape.toSvgElement()),
    };
  }

  private reorder(id: string, toFront: boolean): void {
    const shape = this.getShape(id);
    this.install(this.updateChildren(this.rootNodes, this.parentIdOf(id), children => {
      const rest = children.filter(child => child.id !== id);
      return toFront ? [...rest, shape] : [shape, ...rest];
    }));
  }

  private assertAvailable(ids: readonly string[]): void {
    for (const id of ids) {
      if (this.index.has(id)) throw new DomainError(`id already exists: ${id}`);
    }
  }

  private commonParent(shapes: readonly Shape[]): string | undefined {
    const chains = shapes.map(shape => {
      const chain: (string | undefined)[] = [];
      let parent = this.parentIdOf(shape.id);
      while (parent !== undefined) {
        chain.unshift(parent);
        parent = this.parentIdOf(parent);
      }
      return [undefined, ...chain];
    });
    let common: string | undefined;
    for (const [depth, candidate] of (chains[0] ?? []).entries()) {
      if (!chains.every(chain => depth < chain.length && chain[depth] === candidate)) break;
      common = candidate;
    }
    return common;
  }

  private without(nodes: readonly Shape[], ids: ReadonlySet<string>): readonly Shape[] {
    return nodes.filter(node => !ids.has(node.id)).map(node =>
      node.isContainer ? node.asGroup().withChildren(this.without(node.children, ids)) : node,
    );
  }

  private updateChildren(
    nodes: readonly Shape[],
    parentId: string | undefined,
    update: (children: readonly Shape[]) => readonly Shape[],
  ): readonly Shape[] {
    if (parentId === undefined) return update(nodes);
    return nodes.map(node => {
      if (!node.isContainer) return node;
      const children = node.id === parentId ? update(node.children) : this.updateChildren(node.children, parentId, update);
      return node.asGroup().withChildren(children);
    });
  }

  /** Build and validate a candidate tree and both indexes before committing. */
  private install(roots: readonly Shape[]): void {
    const nextRoots = roots.map(root => root.clone());
    const nextIndex = new Map<string, Shape>();
    const nextParents = new Map<string, string | undefined>();
    const visit = (shape: Shape, parentId: string | undefined): void => {
      if (nextIndex.has(shape.id)) throw new DomainError(`id already exists: ${shape.id}`);
      nextIndex.set(shape.id, shape);
      nextParents.set(shape.id, parentId);
      for (const child of shape.children) visit(child, shape.id);
    };
    for (const root of nextRoots) visit(root, undefined);
    this.rootNodes = nextRoots;
    this.index = nextIndex;
    this.parents = nextParents;
  }
}
