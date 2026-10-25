import { ShapeFactory } from "../../domain/ShapeFactory.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { HistoryManager } from "../HistoryManager.js";
import { EditCommand } from "./EditCommand.js";

export class CreateCommand extends EditCommand {
  constructor(history: HistoryManager, private readonly factory: ShapeFactory) { super(history); }

  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 2, Infinity, "create <type> <id> [params...] [in <containerId>]");
    const hasParent = values.length >= 4 && values.at(-2) === "in";
    const parentId = hasParent ? args.word(values.length - 1) : undefined;
    const shape = this.factory.create(args.word(0), args.word(1), values.slice(2, hasParent ? -2 : undefined));
    document.insert(shape, parentId);
    return [`${shape.type}#${shape.id} created${parentId === undefined ? "" : ` in g#${parentId}`}`];
  }
}
