import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class BackCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 1, 1, "back <id>");
    const shape = document.getShape(args.word(0));
    document.back(shape.id);
    return [`${shape.type}#${shape.id} sent to back`];
  }
}
