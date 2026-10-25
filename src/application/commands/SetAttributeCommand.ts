import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class SetAttributeCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 3, 3, "set <id> <attr> <value>");
    const shape = document.getShape(args.word(0));
    const name = args.word(1);
    const value = args.word(2);
    document.setAttribute(shape.id, name, value);
    return [`${shape.type}#${shape.id} updated: ${name}=${JSON.stringify(value)}`];
  }
}
