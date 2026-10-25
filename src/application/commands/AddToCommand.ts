import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class AddToCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 2, 2, "addto <gid> <id>");
    const id = args.word(1);
    const parent = args.word(0);
    const shape = document.getShape(id);
    document.addTo(parent, id);
    return [`${shape.type}#${id} moved into g#${parent}`];
  }
}
