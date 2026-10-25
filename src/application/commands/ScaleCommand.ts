import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class ScaleCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 2, 2, "scale <id> <factor>");
    const shape = document.getShape(args.word(0));
    const factor = args.number(1, "scale factor");
    document.scale(shape.id, factor);
    return [`${shape.type}#${shape.id} scaled by ${factor}`];
  }
}
