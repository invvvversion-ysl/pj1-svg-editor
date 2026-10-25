import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class DeleteCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 1, 1, "delete <id>");
    const shape = document.getShape(args.word(0));
    document.delete(shape.id);
    return [`${shape.type}#${shape.id} deleted`];
  }
}
