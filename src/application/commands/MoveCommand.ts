import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class MoveCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 3, 3, "move <id> <dx> <dy>");
    const shape = document.getShape(args.word(0));
    const dx = args.number(1, "dx");
    const dy = args.number(2, "dy");
    document.move(shape.id, dx, dy);
    return [`${shape.type}#${shape.id} moved by (${dx},${dy})`];
  }
}
